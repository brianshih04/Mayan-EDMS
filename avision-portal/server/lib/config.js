// Central configuration for the portal backend (Vite dev + preview middleware).
// Values are read once at module load from the environment with Windows defaults.

export const watchFolderPath =
  process.env.AVISION_WATCH_FOLDER || 'E:\\watch_folder';

export const portalStatePath =
  process.env.AVISION_PORTAL_STATE_DIR || 'E:\\Mayan-EDMS-Docker\\data\\portal';

// Mayan REST API base (server-side proxy target). Trailing slash trimmed.
export const mayanApiUrl = (
  process.env.MAYAN_API_URL || 'http://localhost:8080/api/v4'
).replace(/\/+$/, '');

// Privileged service token used for operations the logged-in user lacks Mayan
// permissions for (group lookup, document-type listing, document import).
// Mayan is ACL-based, so normal users see almost nothing; the portal mediates
// data access through this service account instead of granting per-user ACLs.
// Generate once: POST /api/v4/auth/token/obtain/ with an admin/superuser.
export const serviceToken = process.env.MAYAN_SERVICE_TOKEN || '';

// File extensions allowed into the scanner workflow.
export const allowedScanExtensions = new Set([
  '.pdf', '.tif', '.tiff', '.jpg', '.jpeg', '.png', '.bmp'
]);

// Extensions the browser can render directly (used for live preview + MIME).
export const previewMimeTypes = new Map([
  ['.bmp', 'image/bmp'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.pdf', 'application/pdf'],
  ['.png', 'image/png']
]);
