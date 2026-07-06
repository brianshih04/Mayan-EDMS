import fs from 'node:fs/promises';

import { mayanApiUrl } from './config.js';

export const avisionMetadataFields = [
  { name: 'avision_customer', label: 'Customer' },
  { name: 'avision_case_id', label: 'Case ID' },
  { name: 'avision_document_date', label: 'Document date' },
  { name: 'avision_amount', label: 'Amount' },
  { name: 'avision_tags', label: 'Tags' }
];

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
  const firstArrayMessage = (...keys) => {
    for (const key of keys) {
      const value = data?.[key];
      if (Array.isArray(value) && value.length) return value.join(' ');
    }
    return null;
  };
  const message =
    data?.detail ||
    firstArrayMessage('non_field_errors', 'file', 'document_type_id', 'workflow_template_id', 'transition_id') ||
    fallback;
  const error = new Error(message);
  error.status = status;
  error.data = data;
  return error;
}

async function mayanJson(token, path, options = {}, fallback = 'Mayan API request failed.') {
  const response = await mayanRequest(token, path, options);
  const data = await parseJson(response);
  if (!response.ok) {
    throw buildError(response.status, data, fallback);
  }
  return data;
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
    documentTypeId: entry.document_type?.id ?? entry.document_type?.pk ?? '',
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

export async function updateDocument(token, documentId, { label, description }) {
  const response = await mayanRequest(token, `/documents/${documentId}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ label, description })
  });
  const data = await parseJson(response);
  if (!response.ok) {
    throw buildError(response.status, data, 'Unable to update document.');
  }
  return {
    id: data?.id ?? data?.pk,
    label: data?.label || label,
    description: data?.description || '',
    documentType: data?.document_type?.label || '',
    datetimeCreated: data?.datetime_created || ''
  };
}

export async function changeDocumentType(token, documentId, documentTypeId) {
  const response = await mayanRequest(token, `/documents/${documentId}/type/change/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ document_type_id: Number(documentTypeId) })
  });
  const data = await parseJson(response);
  if (!response.ok) {
    throw buildError(response.status, data, 'Unable to change document type.');
  }
  return true;
}

export async function listDocumentMetadata(token, documentId) {
  const response = await mayanRequest(token, `/documents/${documentId}/metadata/?page_size=200`);
  const data = await parseJson(response);
  if (!response.ok) {
    throw buildError(response.status, data, 'Unable to load document metadata.');
  }
  const results = data?.results || [];
  return {
    entries: results.map((entry) => ({
      id: entry.id ?? entry.pk,
      label: entry.metadata_type?.label || '',
      name: entry.metadata_type?.name || '',
      metadataTypeId: entry.metadata_type?.id ?? entry.metadata_type?.pk,
      value: entry.value || ''
    })),
    values: Object.fromEntries(results.map((entry) => [entry.metadata_type?.name, entry.value || '']).filter(([name]) => name))
  };
}

async function listMetadataTypes(token) {
  const response = await mayanRequest(token, '/metadata_types/?page_size=200');
  const data = await parseJson(response);
  if (!response.ok) {
    throw buildError(response.status, data, 'Unable to load metadata types.');
  }
  return data?.results || [];
}

async function createMetadataType(token, field) {
  const response = await mayanRequest(token, '/metadata_types/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: field.name, label: field.label })
  });
  const data = await parseJson(response);
  if (!response.ok) {
    throw buildError(response.status, data, `Unable to create metadata type: ${field.label}.`);
  }
  return data;
}

async function ensureMetadataTypeRelation(token, documentTypeId, metadataTypeId) {
  const response = await mayanRequest(token, `/document_types/${documentTypeId}/metadata_types/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ metadata_type_id: Number(metadataTypeId), required: false })
  });
  const data = await parseJson(response);
  if (!response.ok && response.status !== 400) {
    throw buildError(response.status, data, 'Unable to attach metadata type to document type.');
  }
}

export async function ensureAvisionMetadataTypes(token, documentTypeId) {
  const existing = await listMetadataTypes(token);
  const byName = new Map(existing.map((entry) => [entry.name, entry]));
  const ensured = [];

  for (const field of avisionMetadataFields) {
    let metadataType = byName.get(field.name);
    if (!metadataType) {
      metadataType = await createMetadataType(token, field);
      byName.set(field.name, metadataType);
    }
    if (documentTypeId) {
      await ensureMetadataTypeRelation(token, documentTypeId, metadataType.id ?? metadataType.pk);
    }
    ensured.push({
      id: metadataType.id ?? metadataType.pk,
      label: metadataType.label || field.label,
      name: metadataType.name || field.name
    });
  }

  return ensured;
}

export async function saveAvisionDocumentMetadata(token, documentId, documentTypeId, values = {}) {
  const fields = await ensureAvisionMetadataTypes(token, documentTypeId);
  const current = await listDocumentMetadata(token, documentId);
  const currentByName = new Map(current.entries.map((entry) => [entry.name, entry]));

  for (const field of fields) {
    const value = String(values[field.name] ?? '');
    const existing = currentByName.get(field.name);
    const path = existing
      ? `/documents/${documentId}/metadata/${existing.id}/`
      : `/documents/${documentId}/metadata/`;
    const response = await mayanRequest(token, path, {
      method: existing ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(existing ? { value } : { metadata_type_id: Number(field.id), value })
    });
    const data = await parseJson(response);
    if (!response.ok) {
      throw buildError(response.status, data, `Unable to save metadata: ${field.label}.`);
    }
  }

  return listDocumentMetadata(token, documentId);
}

export async function getMayanBinary(token, path) {
  const response = await mayanRequest(token, path);
  if (!response.ok) {
    const data = await parseJson(response);
    throw buildError(response.status, data, 'Unable to load binary content.');
  }
  return response;
}

const reviewWorkflow = {
  internalName: 'avision_review',
  label: 'Avision Review',
  states: {
    draft: 'Records draft',
    pending: 'Pending review',
    approved: 'Approved',
    rejected: 'Returned'
  },
  transitions: {
    submit: 'Submit for review',
    approve: 'Approve',
    reject: 'Return for changes',
    resubmit: 'Resubmit for review'
  }
};

function resultArray(data) {
  return data?.results || data || [];
}

async function listWorkflowTemplates(token) {
  const data = await mayanJson(
    token,
    '/workflow_templates/?page_size=200&_ordering=internal_name',
    {},
    'Unable to load workflow templates.'
  );
  return resultArray(data);
}

async function createWorkflowTemplate(token) {
  return mayanJson(
    token,
    '/workflow_templates/',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auto_launch: false,
        internal_name: reviewWorkflow.internalName,
        label: reviewWorkflow.label
      })
    },
    'Unable to create Avision review workflow.'
  );
}

async function listWorkflowStates(token, workflowId) {
  const data = await mayanJson(
    token,
    `/workflow_templates/${workflowId}/states/?page_size=200`,
    {},
    'Unable to load workflow states.'
  );
  return resultArray(data);
}

async function createWorkflowState(token, workflowId, { label, initial = false, completion = false }) {
  return mayanJson(
    token,
    `/workflow_templates/${workflowId}/states/`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label, initial, completion })
    },
    `Unable to create workflow state: ${label}.`
  );
}

async function listWorkflowTransitions(token, workflowId) {
  const data = await mayanJson(
    token,
    `/workflow_templates/${workflowId}/transitions/?page_size=200`,
    {},
    'Unable to load workflow transitions.'
  );
  return resultArray(data);
}

async function createWorkflowTransition(token, workflowId, { label, originStateId, destinationStateId }) {
  return mayanJson(
    token,
    `/workflow_templates/${workflowId}/transitions/`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        label,
        origin_state_id: Number(originStateId),
        destination_state_id: Number(destinationStateId)
      })
    },
    `Unable to create workflow transition: ${label}.`
  );
}

async function attachWorkflowToDocumentType(token, workflowId, documentTypeId) {
  if (!documentTypeId) return;
  const response = await mayanRequest(token, `/workflow_templates/${workflowId}/document_types/add/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ document_type_id: Number(documentTypeId) })
  });
  const data = await parseJson(response);
  if (!response.ok && response.status !== 400) {
    throw buildError(response.status, data, 'Unable to attach review workflow to document type.');
  }
}

async function ensureReviewWorkflow(token, documentTypeId = '') {
  const templates = await listWorkflowTemplates(token);
  let workflow = templates.find((entry) => entry.internal_name === reviewWorkflow.internalName);
  if (!workflow) workflow = await createWorkflowTemplate(token);
  const workflowId = workflow.id ?? workflow.pk;

  const existingStates = await listWorkflowStates(token, workflowId);
  const statesByLabel = new Map(existingStates.map((state) => [state.label, state]));
  const ensureState = async (key, options) => {
    const label = reviewWorkflow.states[key];
    if (statesByLabel.has(label)) return statesByLabel.get(label);
    const state = await createWorkflowState(token, workflowId, { label, ...options });
    statesByLabel.set(label, state);
    return state;
  };

  const draft = await ensureState('draft', { initial: true });
  const pending = await ensureState('pending', {});
  const approved = await ensureState('approved', { completion: true });
  const rejected = await ensureState('rejected', { completion: true });

  const existingTransitions = await listWorkflowTransitions(token, workflowId);
  const transitionsByLabel = new Map(existingTransitions.map((transition) => [transition.label, transition]));
  const ensureTransition = async (key, originState, destinationState) => {
    const label = reviewWorkflow.transitions[key];
    if (transitionsByLabel.has(label)) return transitionsByLabel.get(label);
    const transition = await createWorkflowTransition(token, workflowId, {
      label,
      originStateId: originState.id ?? originState.pk,
      destinationStateId: destinationState.id ?? destinationState.pk
    });
    transitionsByLabel.set(label, transition);
    return transition;
  };

  await ensureTransition('submit', draft, pending);
  await ensureTransition('approve', pending, approved);
  await ensureTransition('reject', pending, rejected);
  await ensureTransition('resubmit', rejected, pending);
  await attachWorkflowToDocumentType(token, workflowId, documentTypeId);

  return { id: workflowId, label: workflow.label || reviewWorkflow.label, internalName: reviewWorkflow.internalName };
}

async function listWorkflowInstances(token, documentId) {
  const data = await mayanJson(
    token,
    `/documents/${documentId}/workflow_instances/?page_size=200`,
    {},
    'Unable to load document workflow instances.'
  );
  return resultArray(data);
}

async function launchReviewWorkflow(token, documentId, workflowId) {
  await mayanJson(
    token,
    `/documents/${documentId}/workflow_instances/launch/`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workflow_template_id: Number(workflowId) })
    },
    'Unable to launch review workflow for document.'
  );
}

function reviewStatusFromWorkflowInstance(instance) {
  const label = instance?.current_state?.label || '';
  if (label === reviewWorkflow.states.pending) return 'pending';
  if (label === reviewWorkflow.states.approved) return 'approved';
  if (label === reviewWorkflow.states.rejected) return 'rejected';
  return '';
}

function workflowInstanceSummary(instance) {
  if (!instance) return null;
  return {
    id: instance.id ?? instance.pk,
    state: instance.current_state?.label || '',
    workflow: instance.workflow_template?.label || reviewWorkflow.label,
    lastComment: instance.last_log_entry?.comment || '',
    updatedAt: instance.last_log_entry?.datetime || ''
  };
}

async function getReviewWorkflowInstance(token, documentId, workflowId) {
  const instances = await listWorkflowInstances(token, documentId);
  return instances.find((instance) => {
    const template = instance.workflow_template || {};
    return (template.id ?? template.pk) === workflowId || template.internal_name === reviewWorkflow.internalName;
  }) || null;
}

async function getTransitionChoices(token, documentId, workflowInstanceId) {
  const data = await mayanJson(
    token,
    `/documents/${documentId}/workflow_instances/${workflowInstanceId}/log_entries/transitions/?page_size=200`,
    {},
    'Unable to load review workflow transition choices.'
  );
  return resultArray(data);
}

async function executeWorkflowTransition(token, documentId, workflowInstanceId, transitionId, note) {
  return mayanJson(
    token,
    `/documents/${documentId}/workflow_instances/${workflowInstanceId}/log_entries/`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        comment: note || '',
        transition_id: Number(transitionId)
      })
    },
    'Unable to update review workflow status.'
  );
}

export async function setReviewWorkflowStatus(token, { documentId, documentTypeId = '', status, note = '' }) {
  if (!['pending', 'approved', 'rejected'].includes(status)) {
    return { error: 'status must be pending, approved, or rejected.' };
  }

  const workflow = await ensureReviewWorkflow(token, documentTypeId);
  let instance = await getReviewWorkflowInstance(token, documentId, workflow.id);
  if (!instance) {
    await launchReviewWorkflow(token, documentId, workflow.id);
    instance = await getReviewWorkflowInstance(token, documentId, workflow.id);
  }
  if (!instance) throw new Error('Review workflow could not be launched.');

  const targetState = {
    pending: reviewWorkflow.states.pending,
    approved: reviewWorkflow.states.approved,
    rejected: reviewWorkflow.states.rejected
  }[status];

  const transitionToState = async (stateLabel, transitionNote) => {
    const choices = await getTransitionChoices(token, documentId, instance.id ?? instance.pk);
    const transition = choices.find((choice) => choice.destination_state?.label === stateLabel);
    if (!transition) {
      throw new Error(`No Mayan workflow transition is available from "${instance.current_state?.label || 'unknown'}" to "${stateLabel}".`);
    }
    await executeWorkflowTransition(token, documentId, instance.id ?? instance.pk, transition.id ?? transition.pk, transitionNote);
    instance = await getReviewWorkflowInstance(token, documentId, workflow.id);
  };

  if (status !== 'pending' && instance.current_state?.label === reviewWorkflow.states.draft) {
    await transitionToState(reviewWorkflow.states.pending, 'Auto-submit before reviewer decision.');
  }

  if (instance.current_state?.label !== targetState) {
    await transitionToState(targetState, note);
  }

  return { status, workflow: workflowInstanceSummary(instance) };
}

export async function listReviewWorkflowStatuses(token, { pageSize = 100 } = {}) {
  const workflow = (await listWorkflowTemplates(token))
    .find((entry) => entry.internal_name === reviewWorkflow.internalName);
  if (!workflow) return {};

  const documents = await listDocuments(token, { pageSize });
  const reviews = {};
  for (const document of documents.results || []) {
    const instance = await getReviewWorkflowInstance(token, document.id, workflow.id ?? workflow.pk);
    const status = reviewStatusFromWorkflowInstance(instance);
    if (!status) continue;
    const summary = workflowInstanceSummary(instance);
    reviews[String(document.id)] = {
      actor: '',
      note: summary?.lastComment || '',
      status,
      updatedAt: summary?.updatedAt || '',
      workflow: summary
    };
  }
  return reviews;
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
