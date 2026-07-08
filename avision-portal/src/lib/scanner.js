// Scanner helpers: thumbnail sizes, blank-page detection, and per-file/page
// QC state persisted to localStorage.

export const scannerThumbnailSizes = {
  small: 72,
  medium: 96,
  large: 132
};

// Blank-page detection thresholds. Index = sensitivity level (0..3).
// Higher level = stricter = fewer pages flagged blank (fewer false positives).
// Level 2 is the default. Tuned looser than the original 0.96/0.025/7 baseline
// to reduce misflagging on real documents with light backgrounds.
export const BLANK_SENSITIVITY_PRESETS = [
  { whiteRatio: 0.96, inkRatio: 0.025, contrast: 8 },   // 0 sensitive
  { whiteRatio: 0.975, inkRatio: 0.018, contrast: 6 },  // 1
  { whiteRatio: 0.985, inkRatio: 0.012, contrast: 5 },  // 2 default
  { whiteRatio: 0.995, inkRatio: 0.006, contrast: 3 }   // 3 strict
];
export const DEFAULT_BLANK_THRESHOLD = BLANK_SENSITIVITY_PRESETS[2];

export function evaluateBlank(metrics, threshold = DEFAULT_BLANK_THRESHOLD) {
  if (!metrics) return false;
  return (
    metrics.whiteRatio > threshold.whiteRatio &&
    metrics.inkRatio < threshold.inkRatio &&
    metrics.averageContrast < threshold.contrast
  );
}

export function analyzeImageForBlankPage(image, threshold = DEFAULT_BLANK_THRESHOLD) {
  const canvas = document.createElement('canvas');
  const size = 180;
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d', { willReadFrequently: true });

  context.drawImage(image, 0, 0, size, size);
  const { data } = context.getImageData(0, 0, size, size);
  let whitePixels = 0;
  let inkPixels = 0;
  let contrastTotal = 0;
  const totalPixels = size * size;

  for (let index = 0; index < data.length; index += 4) {
    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];
    const brightness = (red + green + blue) / 3;
    const contrast = Math.max(red, green, blue) - Math.min(red, green, blue);

    if (brightness > 245 && contrast < 10) whitePixels += 1;
    if (brightness < 235 || contrast > 18) inkPixels += 1;
    contrastTotal += contrast;
  }

  const metrics = {
    averageContrast: contrastTotal / totalPixels,
    inkRatio: inkPixels / totalPixels,
    whiteRatio: whitePixels / totalPixels
  };

  return { ...metrics, likelyBlank: evaluateBlank(metrics, threshold) };
}

export const qcKey = (file) => file.name;

export function loadQcStates() {
  try {
    return JSON.parse(localStorage.getItem('portal.scannerQc') || '{}');
  } catch {
    return {};
  }
}

export function persistQcStates(map) {
  localStorage.setItem('portal.scannerQc', JSON.stringify(map));
}

// Files whose preview/QC must be page-based (server-rendered via mupdf).
export const isMultiPage = (file) => {
  const ext = file?.extension?.toUpperCase();
  return ext === 'PDF' || ext === 'TIF' || ext === 'TIFF';
};

export const pageQcKey = (file, page) => `${file.name}#${page}`;

export function loadPageQcStates() {
  try {
    return JSON.parse(localStorage.getItem('portal.scannerPageQc') || '{}');
  } catch {
    return {};
  }
}

export function persistPageQcStates(map) {
  localStorage.setItem('portal.scannerPageQc', JSON.stringify(map));
}
