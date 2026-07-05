import fs from 'node:fs/promises';
import path from 'node:path';

import {
  allowedScanExtensions,
  previewMimeTypes,
  watchFolderPath
} from './config.js';

// List importable files in the watch folder, newest first.
export async function listWatchFolder() {
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
          previewable: previewMimeTypes.has(path.extname(entry.name).toLowerCase()),
          previewUrl: `/api/scanner/files/${encodeURIComponent(entry.name)}`,
          size: stat.size,
          modifiedAt: stat.mtime.toISOString()
        };
      })
  );

  files.sort((a, b) => new Date(b.modifiedAt) - new Date(a.modifiedAt));
  return files;
}

// Resolve a client-supplied file name to an absolute watch-folder path.
// Returns { error } for anything that escapes the folder or is disallowed.
export function resolveWatchFolderFile(fileName) {
  const decodedName = decodeURIComponent(fileName || '');
  const parsed = path.parse(decodedName);
  const extension = path.extname(decodedName).toLowerCase();

  if (parsed.base !== decodedName || decodedName.includes('/') || decodedName.includes('\\')) {
    return { error: 'Invalid file name.' };
  }

  if (!allowedScanExtensions.has(extension)) {
    return { error: 'Unsupported file type.' };
  }

  return {
    extension,
    fullPath: path.join(watchFolderPath, decodedName)
  };
}
