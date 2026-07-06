import fs from 'node:fs/promises';
import path from 'node:path';

import { portalStatePath, watchFolderPath } from './config.js';
import { listWatchFolder } from './watchFolder.js';

export const BATCH_SCHEMA_VERSION = 2;
const batchesDir = path.join(portalStatePath, 'batches');

function newBatchId() {
  return `SCAN-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}`;
}

function normalizeQcState(value) {
  if (value === 'rescan' || value === 'ignore') return value;
  return 'normal';
}

// Normalise a client payload entry to { name, qcState, qcNote, pages }.
// Accepts either a plain name string or an object
// { name, qcState?, qcNote?, pages?: [{ page, qcState }] }.
function normalizeRequested(entry) {
  if (typeof entry === 'string') return { name: entry };
  const name = entry?.name;
  if (typeof name !== 'string' || !name) return null;

  const rawPages = Array.isArray(entry.pages) ? entry.pages : [];
  const pages = rawPages
    .map((p) => {
      const pageNumber = Number(p?.page);
      if (!Number.isInteger(pageNumber) || pageNumber < 1) return null;
      return { page: pageNumber, qcState: normalizeQcState(p?.qcState) };
    })
    .filter(Boolean);

  return {
    name,
    qcState: normalizeQcState(entry.qcState),
    qcNote: typeof entry.qcNote === 'string' ? entry.qcNote : '',
    pages
  };
}

// Create a scanner intake batch manifest (schema v2) from the selected files.
// payload: { createdBy?, files: [{ name, qcState?, qcNote? } | string, ...] }
export async function createScannerBatch(payload) {
  const requested = (Array.isArray(payload.files) ? payload.files : [])
    .map(normalizeRequested)
    .filter(Boolean);

  const safe = requested.filter((entry) => {
    const parsed = path.parse(entry.name);
    return parsed.base === entry.name && !entry.name.includes('/') && !entry.name.includes('\\');
  });

  if (!safe.length) {
    return { error: 'No files selected.' };
  }

  const availableFiles = await listWatchFolder();
  const availableByName = new Map(availableFiles.map((file) => [file.name, file]));
  const qcByName = new Map(safe.map((entry) => [entry.name, entry]));

  const batchFiles = availableFiles
    .filter((file) => qcByName.has(file.name))
    .map((file) => {
      const qc = qcByName.get(file.name);
      return {
        name: file.name,
        size: file.size,
        modifiedAt: file.modifiedAt,
        extension: file.extension,
        qcState: qc.qcState,
        qcNote: qc.qcNote,
        pages: qc.pages,
        importStatus: 'pending',
        mayanDocumentId: null,
        importError: ''
      };
    });

  if (!batchFiles.length) {
    return { error: 'Selected files are no longer in the watch folder.' };
  }

  const batchId = newBatchId();
  const batch = {
    schemaVersion: BATCH_SCHEMA_VERSION,
    id: batchId,
    createdAt: new Date().toISOString(),
    createdBy: payload.createdBy || 'scanner',
    watchFolder: watchFolderPath,
    status: 'queued',
    documentTypeId: null,
    files: batchFiles
  };

  await fs.mkdir(batchesDir, { recursive: true });
  await fs.writeFile(
    path.join(batchesDir, `${batchId}.json`),
    JSON.stringify(batch, null, 2),
    'utf8'
  );

  return { batch };
}

// Read a batch manifest by id. Returns null if missing or the id is malformed.
export async function readBatch(batchId) {
  const safeId = String(batchId || '').replace(/[^\w-]/g, '');
  if (!safeId) return null;
  try {
    const content = await fs.readFile(path.join(batchesDir, `${safeId}.json`), 'utf8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

export async function listBatches({ limit = 20 } = {}) {
  try {
    const names = await fs.readdir(batchesDir);
    const batches = [];
    for (const name of names.filter((entry) => entry.endsWith('.json'))) {
      try {
        const content = await fs.readFile(path.join(batchesDir, name), 'utf8');
        const batch = JSON.parse(content);
        const files = Array.isArray(batch.files) ? batch.files : [];
        batches.push({
          id: batch.id,
          createdAt: batch.createdAt,
          createdBy: batch.createdBy,
          documentTypeId: batch.documentTypeId,
          status: batch.status,
          totalFiles: files.length,
          importedFiles: files.filter((file) => file.importStatus === 'imported').length,
          failedFiles: files.filter((file) => file.importStatus === 'failed').length
        });
      } catch {
        // Ignore malformed batch manifests and keep the queue readable.
      }
    }
    return batches
      .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
      .slice(0, Math.max(1, Math.min(Number(limit) || 20, 100)));
  } catch {
    return [];
  }
}

// Atomically rewrite a batch manifest (used by Mayan import status writeback).
export async function writeBatch(batch) {
  await fs.mkdir(batchesDir, { recursive: true });
  await fs.writeFile(
    path.join(batchesDir, `${batch.id}.json`),
    JSON.stringify(batch, null, 2),
    'utf8'
  );
  return batch;
}
