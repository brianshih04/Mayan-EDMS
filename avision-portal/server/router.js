import { createReadStream } from 'node:fs';
import fs from 'node:fs/promises';

import { previewMimeTypes, serviceToken, watchFolderPath } from './lib/config.js';
import { readRequestBody, readToken, sendJson } from './lib/http.js';
import { deleteWatchFolderFile, listWatchFolder, resolveWatchFolderFile } from './lib/watchFolder.js';
import { createScannerBatch, listBatches, readBatch, writeBatch } from './lib/batch.js';
import { listPages, renderPage } from './lib/convert.js';
import { getWorkbenchSummary } from './lib/workbench.js';
import {
  addUserToGroup,
  createDocumentType,
  createUser,
  changeDocumentType,
  ensureRoleGroups,
  getDocumentOcrContent,
  getMayanBinary,
  listDocumentMetadata,
  listDocumentPages,
  listDocuments,
  listDocumentTypes,
  listReviewWorkflowStatuses,
  saveAvisionDocumentMetadata,
  setReviewWorkflowStatus,
  updateDocument,
  updateDocumentVersionPageOcr,
  uploadDocument
} from './lib/mayan.js';
import { portalLogin, resolvePortalUserFromToken } from './lib/auth.js';
import { ROLE_MAP } from './lib/roleMap.js';
import { listReviews, setReview } from './lib/reviews.js';
import { readPortalSettings, writePortalSettings } from './lib/portalSettings.js';
import { getSystemStatus } from './lib/systemStatus.js';

// Aggregate a batch status from its files' import states.
function computeBatchStatus(files) {
  const states = (files || []).map((file) => file.importStatus || 'pending');
  if (states.length && states.every((state) => state === 'imported')) return 'imported';
  if (states.includes('importing') || states.includes('imported')) return 'importing';
  if (states.includes('failed')) return 'failed';
  return 'queued';
}

// Import one watch-folder file into Mayan and persist the result on the batch.
// Always resolves to a per-file result (imported | failed); never throws.
async function importOneFile(token, batch, entry, body) {
  const resolved = resolveWatchFolderFile(entry.name);
  if (resolved.error) {
    entry.importStatus = 'failed';
    entry.importError = resolved.error;
  } else {
    if (!batch.documentTypeId) batch.documentTypeId = body.documentTypeId;
    entry.importStatus = 'importing';
    entry.importError = '';
    await writeBatch(batch);
    try {
      const uploaded = await uploadDocument({
        token,
        documentTypeId: body.documentTypeId,
        filePath: resolved.fullPath,
        label: body.label || entry.name,
        description: body.description,
        language: body.language
      });
      entry.importStatus = 'imported';
      entry.mayanDocumentId = uploaded.id;
      entry.importError = '';
    } catch (error) {
      entry.importStatus = 'failed';
      entry.importError = error.message;
    }
  }

  batch.status = computeBatchStatus(batch.files);
  await writeBatch(batch);

  return {
    fileName: entry.name,
    importStatus: entry.importStatus,
    mayanDocumentId: entry.mayanDocumentId ?? null,
    importError: entry.importError || ''
  };
}

// Core middleware: dispatches /api/* requests across scanner, auth, mayan, batches.
function createApiMiddleware() {
  return async (request, response, next) => {
    if (!request.url?.startsWith('/api/')) {
      next();
      return;
    }
    const path = request.url.split('?')[0];

    try {
      // ---- auth ----
      if (request.method === 'POST' && path === '/api/auth/login') {
        const body = await readRequestBody(request);
        if (!body.username || !body.password) {
          sendJson(response, 400, { error: 'username and password are required.' });
          return;
        }
        const result = await portalLogin({ username: body.username, password: body.password });
        sendJson(response, 200, result);
        return;
      }

      // ---- workbench summary (role-aware dashboard counts) ----
      if (request.method === 'GET' && path === '/api/workbench/summary') {
        const token = readToken(request);
        if (!token) { sendJson(response, 401, { error: 'Not authenticated.' }); return; }
        if (!serviceToken) { sendJson(response, 500, { error: 'MAYAN_SERVICE_TOKEN not configured.' }); return; }
        const session = await resolvePortalUserFromToken(token);
        sendJson(response, 200, await getWorkbenchSummary(serviceToken, session.role));
        return;
      }

      // ---- admin/system ----
      if (request.method === 'GET' && path === '/api/system/status') {
        const token = readToken(request);
        if (!token) { sendJson(response, 401, { error: 'Not authenticated.' }); return; }
        if (!serviceToken) { sendJson(response, 500, { error: 'MAYAN_SERVICE_TOKEN not configured.' }); return; }
        const session = await resolvePortalUserFromToken(token);
        if (session.role !== 'admin') { sendJson(response, 403, { error: 'Admin role is required.' }); return; }
        sendJson(response, 200, await getSystemStatus());
        return;
      }

      if (request.method === 'GET' && path === '/api/system/settings') {
        const token = readToken(request);
        if (!token) { sendJson(response, 401, { error: 'Not authenticated.' }); return; }
        sendJson(response, 200, { settings: await readPortalSettings() });
        return;
      }

      if (request.method === 'PATCH' && path === '/api/system/settings') {
        const token = readToken(request);
        if (!token) { sendJson(response, 401, { error: 'Not authenticated.' }); return; }
        if (!serviceToken) { sendJson(response, 500, { error: 'MAYAN_SERVICE_TOKEN not configured.' }); return; }
        const session = await resolvePortalUserFromToken(token);
        if (session.role !== 'admin') { sendJson(response, 403, { error: 'Admin role is required.' }); return; }
        const body = await readRequestBody(request);
        sendJson(response, 200, { settings: await writePortalSettings(body) });
        return;
      }

      if (request.method === 'GET' && path === '/api/system/batches') {
        const token = readToken(request);
        if (!token) { sendJson(response, 401, { error: 'Not authenticated.' }); return; }
        if (!serviceToken) { sendJson(response, 500, { error: 'MAYAN_SERVICE_TOKEN not configured.' }); return; }
        const session = await resolvePortalUserFromToken(token);
        if (session.role !== 'admin') { sendJson(response, 403, { error: 'Admin role is required.' }); return; }
        sendJson(response, 200, { results: await listBatches({ limit: 50 }) });
        return;
      }

      if (request.method === 'POST' && path === '/api/admin/users') {
        const token = readToken(request);
        if (!token) { sendJson(response, 401, { error: 'Not authenticated.' }); return; }
        if (!serviceToken) { sendJson(response, 500, { error: 'MAYAN_SERVICE_TOKEN not configured.' }); return; }
        const session = await resolvePortalUserFromToken(token);
        if (session.role !== 'admin') { sendJson(response, 403, { error: 'Admin role is required.' }); return; }
        const body = await readRequestBody(request);
        const username = String(body.username || '').trim();
        const password = String(body.password || '');
        const role = String(body.role || '').trim();
        if (!username || !password || !['operator', 'reviewer', 'viewer', 'admin'].includes(role)) {
          sendJson(response, 400, { error: 'username, password and role are required.' });
          return;
        }
        const user = await createUser(serviceToken, {
          email: body.email,
          firstName: body.firstName,
          lastName: body.lastName,
          password,
          username
        });
        const groupNames = Object.keys(ROLE_MAP);
        const groups = await ensureRoleGroups(serviceToken, groupNames);
        const groupName = Object.entries(ROLE_MAP).find(([, mappedRole]) => mappedRole === role)?.[0];
        if (groupName && groups.byName[groupName]) {
          await addUserToGroup(serviceToken, groups.byName[groupName], user.id);
        }
        sendJson(response, 201, { result: { ...user, role } });
        return;
      }

      // ---- mayan ----
      if (request.method === 'GET' && path === '/api/mayan/document-types') {
        const token = readToken(request);
        if (!token) { sendJson(response, 401, { error: 'Not authenticated.' }); return; }
        if (!serviceToken) { sendJson(response, 500, { error: 'MAYAN_SERVICE_TOKEN not configured.' }); return; }
        const results = await listDocumentTypes(serviceToken);
        sendJson(response, 200, { count: results.length, results });
        return;
      }

      if (request.method === 'POST' && path === '/api/mayan/document-types') {
        const token = readToken(request);
        if (!token) { sendJson(response, 401, { error: 'Not authenticated.' }); return; }
        if (!serviceToken) { sendJson(response, 500, { error: 'MAYAN_SERVICE_TOKEN not configured.' }); return; }
        const session = await resolvePortalUserFromToken(token);
        if (session.role !== 'admin') {
          sendJson(response, 403, { error: 'Admin role is required.' });
          return;
        }
        const body = await readRequestBody(request);
        const label = String(body.label || '').trim();
        if (!label) { sendJson(response, 400, { error: 'label is required.' }); return; }
        const result = await createDocumentType(serviceToken, { label });
        sendJson(response, 201, { result });
        return;
      }

      if (request.method === 'GET' && path === '/api/mayan/documents') {
        const token = readToken(request);
        if (!token) { sendJson(response, 401, { error: 'Not authenticated.' }); return; }
        if (!serviceToken) { sendJson(response, 500, { error: 'MAYAN_SERVICE_TOKEN not configured.' }); return; }
        const url = new URL(request.url, 'http://localhost');
        const query = url.searchParams.get('q') || '';
        const pageSize = url.searchParams.get('page_size') || 50;
        const documentTypeId = url.searchParams.get('document_type_id') || '';
        const metadata = {};
        for (const field of ['avision_customer', 'avision_case_id', 'avision_document_date', 'avision_amount', 'avision_tags']) {
          const value = url.searchParams.get(field);
          if (value) metadata[field] = value;
        }
        const result = await listDocuments(serviceToken, { documentTypeId, metadata, query, pageSize });
        sendJson(response, 200, result);
        return;
      }

      const pagesMatch = path.match(/^\/api\/mayan\/documents\/(\d+)\/pages$/);
      if (request.method === 'GET' && pagesMatch) {
        const token = readToken(request);
        if (!token) { sendJson(response, 401, { error: 'Not authenticated.' }); return; }
        if (!serviceToken) { sendJson(response, 500, { error: 'MAYAN_SERVICE_TOKEN not configured.' }); return; }
        const result = await listDocumentPages(serviceToken, pagesMatch[1]);
        sendJson(response, 200, result);
        return;
      }

      const documentUpdateMatch = path.match(/^\/api\/mayan\/documents\/(\d+)$/);
      if (request.method === 'PATCH' && documentUpdateMatch) {
        const token = readToken(request);
        if (!token) { sendJson(response, 401, { error: 'Not authenticated.' }); return; }
        if (!serviceToken) { sendJson(response, 500, { error: 'MAYAN_SERVICE_TOKEN not configured.' }); return; }
        const body = await readRequestBody(request);
        const documentTypeId = String(body.documentTypeId || '').trim();
        if (documentTypeId) {
          const documentTypes = await listDocumentTypes(serviceToken);
          if (!documentTypes.some((entry) => String(entry.id) === documentTypeId)) {
            sendJson(response, 400, { error: `Document type ${documentTypeId} does not exist in Mayan or is not available to the service account.` });
            return;
          }
        }
        const result = await updateDocument(serviceToken, documentUpdateMatch[1], {
          label: String(body.label || '').trim(),
          description: String(body.description || '').trim()
        });
        if (documentTypeId) {
          await changeDocumentType(serviceToken, documentUpdateMatch[1], documentTypeId);
        }
        let metadata = null;
        if (body.metadata) {
          metadata = await saveAvisionDocumentMetadata(
            serviceToken,
            documentUpdateMatch[1],
            body.metadataDocumentTypeId || documentTypeId,
            body.metadata
          );
        }
        sendJson(response, 200, { result, metadata });
        return;
      }

      const documentMetadataMatch = path.match(/^\/api\/mayan\/documents\/(\d+)\/metadata$/);
      if (request.method === 'GET' && documentMetadataMatch) {
        const token = readToken(request);
        if (!token) { sendJson(response, 401, { error: 'Not authenticated.' }); return; }
        if (!serviceToken) { sendJson(response, 500, { error: 'MAYAN_SERVICE_TOKEN not configured.' }); return; }
        const result = await listDocumentMetadata(serviceToken, documentMetadataMatch[1]);
        sendJson(response, 200, result);
        return;
      }

      const documentOcrMatch = path.match(/^\/api\/mayan\/documents\/(\d+)\/ocr$/);
      if (request.method === 'GET' && documentOcrMatch) {
        const token = readToken(request);
        if (!token) { sendJson(response, 401, { error: 'Not authenticated.' }); return; }
        if (!serviceToken) { sendJson(response, 500, { error: 'MAYAN_SERVICE_TOKEN not configured.' }); return; }
        const result = await getDocumentOcrContent(serviceToken, documentOcrMatch[1]);
        sendJson(response, 200, result);
        return;
      }

      const ocrPageMatch = path.match(/^\/api\/mayan\/documents\/(\d+)\/versions\/(\d+)\/pages\/(\d+)\/ocr$/);
      if (request.method === 'PATCH' && ocrPageMatch) {
        const token = readToken(request);
        if (!token) { sendJson(response, 401, { error: 'Not authenticated.' }); return; }
        if (!serviceToken) { sendJson(response, 500, { error: 'MAYAN_SERVICE_TOKEN not configured.' }); return; }
        const body = await readRequestBody(request);
        const content = String(body.content ?? '');
        const result = await updateDocumentVersionPageOcr(
          serviceToken,
          ocrPageMatch[1],
          ocrPageMatch[2],
          ocrPageMatch[3],
          content
        );
        sendJson(response, 200, result);
        return;
      }

      const pageImageMatch = path.match(/^\/api\/mayan\/documents\/(\d+)\/files\/(\d+)\/pages\/(\d+)\/image$/);
      if (request.method === 'GET' && pageImageMatch) {
        const token = readToken(request);
        if (!token) { sendJson(response, 401, { error: 'Not authenticated.' }); return; }
        if (!serviceToken) { sendJson(response, 500, { error: 'MAYAN_SERVICE_TOKEN not configured.' }); return; }
        const mayanResponse = await getMayanBinary(
          serviceToken,
          `/documents/${pageImageMatch[1]}/files/${pageImageMatch[2]}/pages/${pageImageMatch[3]}/image/`
        );
        response.statusCode = 200;
        response.setHeader('Content-Type', mayanResponse.headers.get('content-type') || 'image/jpeg');
        response.setHeader('Cache-Control', 'private, max-age=300');
        const buffer = Buffer.from(await mayanResponse.arrayBuffer());
        response.setHeader('Content-Length', buffer.length);
        response.end(buffer);
        return;
      }

      const fileDownloadMatch = path.match(/^\/api\/mayan\/documents\/(\d+)\/files\/(\d+)\/download$/);
      if (request.method === 'GET' && fileDownloadMatch) {
        const token = readToken(request);
        if (!token) { sendJson(response, 401, { error: 'Not authenticated.' }); return; }
        if (!serviceToken) { sendJson(response, 500, { error: 'MAYAN_SERVICE_TOKEN not configured.' }); return; }
        const mayanResponse = await getMayanBinary(
          serviceToken,
          `/documents/${fileDownloadMatch[1]}/files/${fileDownloadMatch[2]}/download/`
        );
        response.statusCode = 200;
        response.setHeader('Content-Type', mayanResponse.headers.get('content-type') || 'application/octet-stream');
        const disposition = mayanResponse.headers.get('content-disposition');
        if (disposition) response.setHeader('Content-Disposition', disposition);
        const buffer = Buffer.from(await mayanResponse.arrayBuffer());
        response.setHeader('Content-Length', buffer.length);
        response.end(buffer);
        return;
      }

      if (request.method === 'POST' && path === '/api/mayan/import') {
        const token = readToken(request);
        if (!token) { sendJson(response, 401, { error: 'Not authenticated.' }); return; }
        if (!serviceToken) { sendJson(response, 500, { error: 'MAYAN_SERVICE_TOKEN not configured.' }); return; }
        const body = await readRequestBody(request);
        if (!body.batchId || !body.fileName || !body.documentTypeId) {
          sendJson(response, 400, { error: 'batchId, fileName and documentTypeId are required.' });
          return;
        }
        const batch = await readBatch(body.batchId);
        if (!batch) { sendJson(response, 404, { error: 'Batch not found.' }); return; }
        const entry = (batch.files || []).find((file) => file.name === body.fileName);
        if (!entry) { sendJson(response, 404, { error: 'File is not part of this batch.' }); return; }
        const result = await importOneFile(serviceToken, batch, entry, body);
        sendJson(response, 200, { batch: { id: batch.id, status: batch.status }, result });
        return;
      }

      if (request.method === 'GET' && path === '/api/reviews') {
        const token = readToken(request);
        if (!token) { sendJson(response, 401, { error: 'Not authenticated.' }); return; }
        const localReviews = await listReviews();
        const workflowReviews = serviceToken
          ? await listReviewWorkflowStatuses(serviceToken, { pageSize: 100 })
          : {};
        sendJson(response, 200, { reviews: { ...localReviews, ...workflowReviews } });
        return;
      }

      if (request.method === 'POST' && path === '/api/reviews') {
        const token = readToken(request);
        if (!token) { sendJson(response, 401, { error: 'Not authenticated.' }); return; }
        const body = await readRequestBody(request);
        const session = serviceToken ? await resolvePortalUserFromToken(token) : { role: '', user: {} };
        const canSubmitForReview = session.role === 'operator' && body.status === 'pending';
        if (session.role !== 'reviewer' && session.role !== 'admin' && !canSubmitForReview) {
          sendJson(response, 403, { error: 'Reviewer role is required.' });
          return;
        }
        let workflowResult = null;
        if (serviceToken) {
          workflowResult = await setReviewWorkflowStatus(serviceToken, {
            documentId: body.documentId,
            documentTypeId: body.documentTypeId,
            note: body.note,
            status: body.status
          });
        }
        const result = await setReview({
          actor: session.user?.username || '',
          documentId: body.documentId,
          extra: workflowResult?.workflow ? { workflow: workflowResult.workflow } : {},
          note: body.note,
          status: body.status
        });
        sendJson(response, result.error ? 400 : 200, result);
        return;
      }

      // ---- batches (read manifest) ----
      if (request.method === 'GET' && path.startsWith('/api/batches/')) {
        const batchId = path.replace('/api/batches/', '');
        const batch = await readBatch(batchId);
        if (!batch) { sendJson(response, 404, { error: 'Batch not found.' }); return; }
        sendJson(response, 200, { batch });
        return;
      }

      // ---- scanner ----
      if (request.method === 'GET' && path.startsWith('/api/scanner/watch-folder')) {
        const files = await listWatchFolder();
        sendJson(response, 200, { watchFolder: watchFolderPath, files });
        return;
      }

      if (request.method === 'GET' && path.startsWith('/api/scanner/files/')) {
        const remainder = path.replace('/api/scanner/files/', '');
        const segments = remainder.split('/');
        // segments[0] is the URL-encoded file name (never contains a literal '/').
        const resolved = resolveWatchFolderFile(segments[0]);

        if (resolved.error) {
          sendJson(response, 400, { error: resolved.error });
          return;
        }

        const fileStat = await fs.stat(resolved.fullPath);

        if (!fileStat.isFile()) {
          sendJson(response, 404, { error: 'File not found.' });
          return;
        }

        // Raw file stream (existing behaviour): /api/scanner/files/<name>
        if (segments.length === 1) {
          response.statusCode = 200;
          response.setHeader('Content-Type', previewMimeTypes.get(resolved.extension) || 'application/octet-stream');
          response.setHeader('Content-Length', fileStat.size);
          response.setHeader('Cache-Control', 'no-store');
          createReadStream(resolved.fullPath).pipe(response);
          return;
        }

        // Per-page routes: <name>/pages, <name>/pages/:n/thumbnail, <name>/pages/:n/image
        if (segments[1] === 'pages') {
          const encodedName = segments[0];

          if (segments.length === 2) {
            const result = await listPages(resolved.fullPath, fileStat, encodedName);
            sendJson(response, 200, { fileName: decodeURIComponent(encodedName), ...result });
            return;
          }

          if (segments.length === 4) {
            const pageNumber = Number(segments[2]);
            const kind = segments[3];
            if (!Number.isInteger(pageNumber) || pageNumber < 1 || (kind !== 'thumbnail' && kind !== 'image')) {
              sendJson(response, 400, { error: 'Invalid page route.' });
              return;
            }
            const maxWidth = kind === 'image' ? 1600 : 400;
            const rendered = await renderPage(resolved.fullPath, fileStat, pageNumber - 1, { maxWidth });
            response.statusCode = 200;
            response.setHeader('Content-Type', 'image/png');
            response.setHeader('Content-Length', rendered.png.length);
            response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
            response.end(rendered.png);
            return;
          }
        }

        sendJson(response, 404, { error: 'Scanner API route not found.' });
        return;
      }

      if (request.method === 'DELETE' && path.startsWith('/api/scanner/files/')) {
        const encodedName = path.replace('/api/scanner/files/', '');
        if (!encodedName || encodedName.includes('/')) {
          sendJson(response, 400, { error: 'Invalid file route.' });
          return;
        }
        const result = await deleteWatchFolderFile(encodedName);
        sendJson(response, result.error ? 400 : 200, result);
        return;
      }

      if (request.method === 'POST' && path.startsWith('/api/scanner/batches')) {
        const payload = await readRequestBody(request);
        const result = await createScannerBatch(payload);
        sendJson(response, result.error ? 400 : 201, result);
        return;
      }

      sendJson(response, 404, { error: 'API route not found.' });
    } catch (error) {
      sendJson(response, 500, { error: error.message });
    }
  };
}

// Vite plugin: mounts the API middleware on both the dev and preview servers.
export function createApiPlugin() {
  const middleware = createApiMiddleware();
  return {
    name: 'avision-api',
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    }
  };
}
