import fs from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';

import { portalStatePath } from './config.js';

// IMPORTANT: mupdf-wasm is not async-safe across page loads — once a document
// is open, all loadPage/render calls must run synchronously in the same tick.
// Source-file reading happens async BEFORE openDocument; cache I/O is sync.

let mupdfPromise = null;
function getMupdf() {
  if (!mupdfPromise) mupdfPromise = import('mupdf').then((module) => module.default);
  return mupdfPromise;
}

const MAGIC_BY_EXT = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  tif: 'image/tiff',
  tiff: 'image/tiff',
  bmp: 'image/bmp',
  pdf: 'application/pdf'
};

function magicFor(filePath) {
  const ext = path.extname(filePath).slice(1).toLowerCase();
  return MAGIC_BY_EXT[ext] || ext;
}

const thumbnailsDir = path.join(portalStatePath, 'thumbnails');
const MAX_PAGES_PER_DOC = 500; // guard against pathological documents

function cacheKey(filePath, stat, page, maxWidth) {
  const hash = createHash('sha1');
  hash.update(`${path.basename(filePath)}|${Math.floor(stat.mtimeMs)}|${stat.size}|${page}|${maxWidth}`);
  return hash.digest('hex');
}

// Compute blank-page metrics directly from a mupdf pixmap's pixel buffer.
// Same heuristic as the browser-side analyzeImageForBlankPage.
function computeMetrics(pixmap) {
  const pixels = pixmap.getPixels();
  const components = pixmap.getNumberOfComponents();
  let white = 0;
  let ink = 0;
  let contrastTotal = 0;
  const total = pixmap.getWidth() * pixmap.getHeight();

  for (let i = 0; i < pixels.length; i += components) {
    const red = pixels[i];
    const green = pixels[i + 1];
    const blue = pixels[i + 2];
    const brightness = (red + green + blue) / 3;
    const contrast = Math.max(red, green, blue) - Math.min(red, green, blue);

    if (brightness > 245 && contrast < 10) white += 1;
    if (brightness < 235 || contrast > 18) ink += 1;
    contrastTotal += contrast;
  }

  return {
    averageContrast: contrastTotal / total,
    inkRatio: ink / total,
    whiteRatio: white / total
  };
}

// Open a document, run a SYNCHRONOUS callback against it, then destroy it.
async function withDocument(filePath, fn) {
  const mupdf = await getMupdf();
  const data = await fs.promises.readFile(filePath);
  const doc = mupdf.Document.openDocument(data, magicFor(filePath));
  try {
    return fn(doc, mupdf);
  } finally {
    doc.destroy?.();
  }
}

// Render one page within an already-open document, with on-disk caching.
// Synchronous (see file-level note).
function renderInto(doc, mupdf, filePath, stat, pageNumber, maxWidth) {
  const key = cacheKey(filePath, stat, pageNumber, maxWidth);
  const pngPath = path.join(thumbnailsDir, `${key}.png`);
  const sidecarPath = path.join(thumbnailsDir, `${key}.json`);

  try {
    const png = fs.readFileSync(pngPath);
    const sidecar = JSON.parse(fs.readFileSync(sidecarPath, 'utf8'));
    return { png: Buffer.from(png), ...sidecar, cached: true };
  } catch {
    // cache miss — render below
  }

  const page = doc.loadPage(pageNumber);
  try {
    const bounds = page.getBounds();
    const scale = maxWidth / Math.max(1, bounds[2] - bounds[0]);
    const pixmap = page.toPixmap(
      mupdf.Matrix.scale(scale, scale),
      mupdf.ColorSpace.DeviceRGB,
      false,
      true
    );
    try {
      const result = {
        png: Buffer.from(pixmap.asPNG()),
        width: pixmap.getWidth(),
        height: pixmap.getHeight(),
        metrics: computeMetrics(pixmap),
        page: pageNumber,
        cached: false
      };
      try {
        fs.writeFileSync(pngPath, result.png);
        fs.writeFileSync(sidecarPath, JSON.stringify({
          width: result.width,
          height: result.height,
          metrics: result.metrics,
          page: pageNumber
        }));
      } catch {
        // cache write failure is non-fatal
      }
      return result;
    } finally {
      pixmap.destroy();
    }
  } finally {
    page.destroy();
  }
}

export async function getPageCount(filePath) {
  return withDocument(filePath, (doc) => doc.countPages());
}

// Render a single page to PNG + metrics (opens its own document).
// stat is the fs.Stat of the source file, used for cache invalidation.
export async function renderPage(filePath, stat, pageNumber, options = {}) {
  const maxWidth = options.maxWidth || 400;
  fs.mkdirSync(thumbnailsDir, { recursive: true });
  return withDocument(filePath, (doc, mupdf) =>
    renderInto(doc, mupdf, filePath, stat, pageNumber, maxWidth)
  );
}

// List every page (capped at MAX_PAGES_PER_DOC) with metrics + thumbnail URL.
// Opens the document once and renders all pages synchronously.
export async function listPages(filePath, stat, encodedName, options = {}) {
  const maxWidth = options.maxWidth || 400;
  fs.mkdirSync(thumbnailsDir, { recursive: true });

  return withDocument(filePath, (doc, mupdf) => {
    const count = doc.countPages();
    const total = Math.min(count, MAX_PAGES_PER_DOC);
    const pages = [];

    for (let index = 0; index < total; index += 1) {
      const rendered = renderInto(doc, mupdf, filePath, stat, index, maxWidth);
      pages.push({
        page: index + 1,
        width: rendered.width,
        height: rendered.height,
        metrics: rendered.metrics,
        thumbnailUrl: `/api/scanner/files/${encodedName}/pages/${index + 1}/thumbnail`
      });
    }

    return { count, rendered: total, pages };
  });
}

export { MAX_PAGES_PER_DOC };
