import fs from 'node:fs/promises';
import path from 'node:path';

import { portalStatePath, watchFolderPath } from './config.js';

const settingsFilePath = path.join(portalStatePath, 'settings.json');

const defaultSettings = {
  blankSensitivity: 2,
  thumbnailSizeDefault: 'small',
  watchFolderPath
};

function normalizeSettings(input = {}) {
  const thumbnail = ['small', 'medium', 'large'].includes(input.thumbnailSizeDefault)
    ? input.thumbnailSizeDefault
    : defaultSettings.thumbnailSizeDefault;
  const sensitivity = Number(input.blankSensitivity);
  return {
    blankSensitivity: Number.isInteger(sensitivity) && sensitivity >= 0 && sensitivity <= 3
      ? sensitivity
      : defaultSettings.blankSensitivity,
    thumbnailSizeDefault: thumbnail,
    watchFolderPath: watchFolderPath
  };
}

export async function readPortalSettings() {
  try {
    const raw = await fs.readFile(settingsFilePath, 'utf8');
    return normalizeSettings({ ...defaultSettings, ...JSON.parse(raw) });
  } catch {
    return { ...defaultSettings };
  }
}

export async function writePortalSettings(settings) {
  const next = normalizeSettings({ ...await readPortalSettings(), ...settings });
  await fs.mkdir(path.dirname(settingsFilePath), { recursive: true });
  await fs.writeFile(settingsFilePath, JSON.stringify(next, null, 2), 'utf8');
  return next;
}
