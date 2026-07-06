import fs from 'node:fs/promises';

import { mayanApiUrl, serviceToken, watchFolderPath } from './config.js';
import { listBatches } from './batch.js';
import { listDocumentTypes } from './mayan.js';
import { listWatchFolder } from './watchFolder.js';

async function checkMayan() {
  if (!serviceToken) {
    return { ok: false, message: 'MAYAN_SERVICE_TOKEN not configured.' };
  }
  try {
    const types = await listDocumentTypes(serviceToken);
    return { ok: true, message: `${types.length} document type(s) available.` };
  } catch (error) {
    return { ok: false, message: error.message || 'Mayan API check failed.' };
  }
}

async function checkPortal() {
  return { ok: true, message: 'Portal API is responding.' };
}

async function checkWatchFolder() {
  try {
    await fs.access(watchFolderPath);
    const files = await listWatchFolder();
    return { ok: true, message: `${files.length} importable file(s).`, path: watchFolderPath };
  } catch (error) {
    return { ok: false, message: error.message || 'Watch folder is not accessible.', path: watchFolderPath };
  }
}

async function checkCloudflare() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const response = await fetch('https://mayan-portal.avision-gb10.org/api/scanner/watch-folder', {
      signal: controller.signal
    });
    clearTimeout(timeout);
    return {
      ok: response.ok,
      message: response.ok ? 'Cloudflare portal route is reachable.' : `Cloudflare route returned HTTP ${response.status}.`
    };
  } catch (error) {
    return { ok: false, message: error.name === 'AbortError' ? 'Cloudflare route timed out.' : error.message };
  }
}

export async function getSystemStatus() {
  const [portal, mayan, watchFolder, cloudflare, batches] = await Promise.all([
    checkPortal(),
    checkMayan(),
    checkWatchFolder(),
    checkCloudflare(),
    listBatches({ limit: 10 })
  ]);

  return {
    checkedAt: new Date().toISOString(),
    endpoints: {
      mayanApiUrl,
      portalUrl: 'https://mayan-portal.avision-gb10.org'
    },
    checks: { portal, mayan, watchFolder, cloudflare },
    queue: batches
  };
}
