import { createReadStream } from 'node:fs';
import fs from 'node:fs/promises';

import { previewMimeTypes, serviceToken, watchFolderPath } from './lib/config.js';
import { readRequestBody, readToken, sendJson } from './lib/http.js';
import { listWatchFolder, resolveWatchFolderFile } from './lib/watchFolder.js';
import { createScannerBatch, readBatch, writeBatch } from './lib/batch.js';
import { listPages, renderPage } from './lib/convert.js';
import { listDocumentTypes, uploadDocument } from './lib/mayan.js';
import { portalLogin } from './lib/auth.js';

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

      // ---- mayan ----
      if (request.method === 'GET' && path === '/api/mayan/document-types') {
        const token = readToken(request);
        if (!token) { sendJson(response, 401, { error: 'Not authenticated.' }); return; }
        if (!serviceToken) { sendJson(response, 500, { error: 'MAYAN_SERVICE_TOKEN not configured.' }); return; }
        const results = await listDocumentTypes(serviceToken);
        sendJson(response, 200, { count: results.length, results });
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
