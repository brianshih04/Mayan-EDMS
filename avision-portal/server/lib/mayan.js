import fs from 'node:fs/promises';

import { mayanApiUrl } from './config.js';

// Thin Mayan REST (v4) client. All calls go server-side so the browser stays
// same-origin with the portal and Mayan's CSRF/CORS config is not a concern.
// Token auth uses DRF's `Authorization: Token <key>` header.

async function mayanRequest(token, path, options = {}, attempt = 0) {
  const headers = { Accept: 'application/json', ...(options.headers || {}) };
  if (token) headers.Authorization = `Token ${token}`;
  const response = await fetch(`${mayanApiUrl}${path}`, { ...options, headers });

  // Mayan throttles the REST API; back off and retry on 429.
  if (response.status === 429 && attempt < 3) {
    const retryAfter = Number(response.headers.get('retry-after'));
    const delayMs = Number.isFinite(retryAfter) && retryAfter > 0
      ? retryAfter * 1000
      : 1500 * (attempt + 1);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return mayanRequest(token, path, options, attempt + 1);
  }
  return response;
}

async function parseJson(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function buildError(status, data, fallback) {
  const message =
    data?.detail ||
    (Array.isArray(data?.non_field_errors) ? data.non_field_errors.join(' ') : null) ||
    (Array.isArray(data?.file) ? data.file.join(' ') : null) ||
    (Array.isArray(data?.document_type_id) ? data.document_type_id.join(' ') : null) ||
    fallback;
  const error = new Error(message);
  error.status = status;
  error.data = data;
  return error;
}

// POST /auth/token/obtain/ -> { token }
export async function obtainToken({ username, password }) {
  const response = await fetch(`${mayanApiUrl}/auth/token/obtain/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { /* non-JSON body */ }

  if (!response.ok) {
    throw buildError(response.status, data, `Mayan authentication failed (HTTP ${response.status}).`);
  }
  if (!data?.token) {
    const snippet = (text || '').replace(/\s+/g, ' ').slice(0, 200);
    throw new Error(`Mayan did not return a token. HTTP ${response.status}. Body: ${snippet}`);
  }
  return data.token;
}

// GET /users/current/ -> user object
export async function getCurrentUser(token) {
  const response = await mayanRequest(token, '/users/current/');
  const data = await parseJson(response);
  if (!response.ok) {
    throw buildError(response.status, data, 'Unable to load Mayan user.');
  }
  return data;
}

// GET /users/{id}/groups/ -> [group names]
export async function getUserGroups(token, userId) {
  const response = await mayanRequest(token, `/users/${userId}/groups/`);
  const data = await parseJson(response);
  if (!response.ok) {
    throw buildError(response.status, data, 'Unable to load Mayan groups.');
  }
  const results = data?.results || data || [];
  return results.map((group) => group.name).filter(Boolean);
}

// GET /document_types/ -> [{ id, label }]
export async function listDocumentTypes(token) {
  const response = await mayanRequest(token, '/document_types/?page_size=200&_ordering=label');
  const data = await parseJson(response);
  if (!response.ok) {
    throw buildError(response.status, data, 'Unable to load document types.');
  }
  const results = data?.results || [];
  return results
    .filter((entry) => entry && (entry.id || entry.pk) != null)
    .map((entry) => ({
      id: entry.id ?? entry.pk,
      label: entry.label || `#${entry.id ?? entry.pk}`
    }));
}

// POST /document_types/ -> { id, label }
export async function createDocumentType(token, { label }) {
  const response = await mayanRequest(token, '/document_types/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ label })
  });
  const data = await parseJson(response);
  if (!response.ok) {
    throw buildError(response.status, data, 'Unable to create document type.');
  }
  return {
    id: data?.id ?? data?.pk,
    label: data?.label || label
  };
}

// GET /documents/ -> recent documents, optionally filtered by query locally.
export async function listDocuments(token, { query = '', pageSize = 50 } = {}) {
  const size = Math.max(1, Math.min(Number(pageSize) || 50, 200));
  const response = await mayanRequest(token, `/documents/?page_size=${size}&_ordering=-datetime_created`);
  const data = await parseJson(response);
  if (!response.ok) {
    throw buildError(response.status, data, 'Unable to load documents.');
  }

  const needle = String(query || '').trim().toLowerCase();
  const results = (data?.results || []).map((entry) => ({
    id: entry.id ?? entry.pk,
    label: entry.label || `#${entry.id ?? entry.pk}`,
    description: entry.description || '',
    documentType: entry.document_type?.label || '',
    datetimeCreated: entry.datetime_created || '',
    fileName: entry.file_latest?.filename || '',
    url: entry.url
  }));

  const filtered = needle
    ? results.filter((entry) => (
      entry.label.toLowerCase().includes(needle) ||
      entry.description.toLowerCase().includes(needle) ||
      entry.documentType.toLowerCase().includes(needle) ||
      entry.fileName.toLowerCase().includes(needle)
    ))
    : results;

  return { count: data?.count ?? filtered.length, results: filtered };
}

export async function listDocumentPages(token, documentId) {
  const filesResponse = await mayanRequest(token, `/documents/${documentId}/files/?page_size=1&_ordering=-timestamp`);
  const filesData = await parseJson(filesResponse);
  if (!filesResponse.ok) {
    throw buildError(filesResponse.status, filesData, 'Unable to load document files.');
  }
  const file = (filesData?.results || [])[0];
  if (!file?.id) return { file: null, pages: [] };

  const pagesResponse = await mayanRequest(token, `/documents/${documentId}/files/${file.id}/pages/?page_size=200`);
  const pagesData = await parseJson(pagesResponse);
  if (!pagesResponse.ok) {
    throw buildError(pagesResponse.status, pagesData, 'Unable to load document pages.');
  }

  return {
    file: {
      id: file.id,
      filename: file.filename || '',
      mimetype: file.mimetype || '',
      size: file.size || 0
    },
    pages: (pagesData?.results || []).map((page) => ({
      id: page.id ?? page.pk,
      pageNumber: page.page_number,
      imageUrl: `/api/mayan/documents/${documentId}/files/${file.id}/pages/${page.id ?? page.pk}/image`
    }))
  };
}

export async function getMayanBinary(token, path) {
  const response = await mayanRequest(token, path);
  if (!response.ok) {
    const data = await parseJson(response);
    throw buildError(response.status, data, 'Unable to load binary content.');
  }
  return response;
}

// POST /documents/upload/ (multipart) -> { id, url, label }
export async function uploadDocument({ token, documentTypeId, filePath, label, description, language }) {
  const buffer = await fs.readFile(filePath);
  const fileName = (label || filePath.split(/[\\/]/).pop());

  const form = new FormData();
  form.append('document_type_id', String(documentTypeId));
  form.append('file', new Blob([buffer]), fileName);
  if (label) form.append('label', label);
  if (description) form.append('description', description);
  if (language) form.append('language', language);

  const response = await mayanRequest(token, '/documents/upload/', { method: 'POST', body: form });
  const data = await parseJson(response);
  if (!response.ok) {
    throw buildError(response.status, data, 'Mayan document upload failed.');
  }
  return {
    id: data?.id ?? data?.pk,
    url: data?.url,
    label: data?.label
  };
}

// GET /groups/ -> [{ id, name }]
export async function listGroups(token) {
  const response = await mayanRequest(token, '/groups/?page_size=200');
  const data = await parseJson(response);
  if (!response.ok) {
    throw buildError(response.status, data, 'Unable to load Mayan groups list.');
  }
  return (data?.results || []).map((group) => ({ id: group.id ?? group.pk, name: group.name }));
}

// POST /users/ -> { id, username }
export async function createUser(token, { username, password, email = '', firstName = '', lastName = '' }) {
  const response = await mayanRequest(token, '/users/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username,
      password,
      email,
      first_name: firstName,
      last_name: lastName
    })
  });
  const data = await parseJson(response);
  if (!response.ok) {
    throw buildError(response.status, data, 'Mayan user creation failed.');
  }
  return { id: data?.id ?? data?.pk, username: data?.username };
}

// POST /groups/{id}/users/add/ { user: <pk> }
export async function addUserToGroup(token, groupId, userId) {
  const response = await mayanRequest(token, `/groups/${groupId}/users/add/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user: userId })
  });
  const data = await parseJson(response);
  if (!response.ok) {
    throw buildError(response.status, data, 'Unable to add user to group.');
  }
  return true;
}

// Ensure the expected role groups exist (idempotent).
// Returns { created: [names], byName: { name: id } }.
export async function ensureRoleGroups(token, groupNames) {
  const groups = await listGroups(token);
  const byName = new Map(groups.map((g) => [g.name, g.id]));
  const created = [];

  for (const name of groupNames) {
    if (byName.has(name)) continue;
    const response = await mayanRequest(token, '/groups/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    const data = await parseJson(response);
    if (response.ok) {
      const id = data?.id ?? data?.pk;
      byName.set(name, id);
      created.push(name);
    }
  }
  return { created, byName: Object.fromEntries(byName) };
}
