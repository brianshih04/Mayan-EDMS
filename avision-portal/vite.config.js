import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import fs from 'node:fs/promises';
import path from 'node:path';

const allowedHosts = ['mayan-portal.avision-gb10.org'];
const watchFolderPath = process.env.AVISION_WATCH_FOLDER || 'E:\\watch_folder';
const portalStatePath = process.env.AVISION_PORTAL_STATE_DIR || 'E:\\Mayan-EDMS-Docker\\data\\portal';
const allowedScanExtensions = new Set(['.pdf', '.tif', '.tiff', '.jpg', '.jpeg', '.png', '.bmp']);

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(payload));
}

async function readRequestBody(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

async function listWatchFolder() {
  const entries = await fs.readdir(watchFolderPath, { withFileTypes: true });
  const files = await Promise.all(
    entries
      .filter((entry) => entry.isFile())
      .filter((entry) => allowedScanExtensions.has(path.extname(entry.name).toLowerCase()))
      .map(async (entry) => {
        const fullPath = path.join(watchFolderPath, entry.name);
        const stat = await fs.stat(fullPath);

        return {
          name: entry.name,
          extension: path.extname(entry.name).slice(1).toUpperCase(),
          size: stat.size,
          modifiedAt: stat.mtime.toISOString()
        };
      })
  );

  files.sort((a, b) => new Date(b.modifiedAt) - new Date(a.modifiedAt));
  return files;
}

async function createScannerBatch(payload) {
  const selectedNames = Array.isArray(payload.files) ? payload.files : [];
  const safeNames = selectedNames.filter((name) => {
    const parsed = path.parse(name);
    return parsed.base === name && !name.includes('/') && !name.includes('\\');
  });

  if (!safeNames.length) {
    return { error: 'No files selected.' };
  }

  const availableFiles = await listWatchFolder();
  const availableNames = new Set(availableFiles.map((file) => file.name));
  const batchFiles = safeNames.filter((name) => availableNames.has(name));

  if (!batchFiles.length) {
    return { error: 'Selected files are no longer in the watch folder.' };
  }

  const batchId = `SCAN-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}`;
  const batch = {
    id: batchId,
    createdAt: new Date().toISOString(),
    createdBy: payload.createdBy || 'scanner',
    watchFolder: watchFolderPath,
    status: 'queued',
    files: availableFiles.filter((file) => batchFiles.includes(file.name))
  };

  await fs.mkdir(path.join(portalStatePath, 'batches'), { recursive: true });
  await fs.writeFile(
    path.join(portalStatePath, 'batches', `${batchId}.json`),
    JSON.stringify(batch, null, 2),
    'utf8'
  );

  return { batch };
}

function scannerApiPlugin() {
  const middleware = async (request, response, next) => {
    if (!request.url?.startsWith('/api/scanner/')) {
      next();
      return;
    }

    try {
      if (request.method === 'GET' && request.url.startsWith('/api/scanner/watch-folder')) {
        const files = await listWatchFolder();
        sendJson(response, 200, { watchFolder: watchFolderPath, files });
        return;
      }

      if (request.method === 'POST' && request.url.startsWith('/api/scanner/batches')) {
        const payload = await readRequestBody(request);
        const result = await createScannerBatch(payload);
        sendJson(response, result.error ? 400 : 201, result);
        return;
      }

      sendJson(response, 404, { error: 'Scanner API route not found.' });
    } catch (error) {
      sendJson(response, 500, { error: error.message });
    }
  };

  return {
    name: 'avision-scanner-api',
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    }
  };
}

export default defineConfig({
  plugins: [scannerApiPlugin(), react()],
  server: {
    host: '0.0.0.0',
    port: 5174,
    allowedHosts
  },
  preview: {
    host: '0.0.0.0',
    port: 5174,
    allowedHosts
  }
});
