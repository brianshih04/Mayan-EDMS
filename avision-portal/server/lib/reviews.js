import fs from 'node:fs/promises';
import path from 'node:path';

import { portalStatePath } from './config.js';

const reviewFilePath = path.join(portalStatePath, 'reviews.json');

async function readAllReviews() {
  try {
    const raw = await fs.readFile(reviewFilePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function writeAllReviews(reviews) {
  await fs.mkdir(path.dirname(reviewFilePath), { recursive: true });
  await fs.writeFile(reviewFilePath, JSON.stringify(reviews, null, 2));
}

export async function listReviews() {
  return readAllReviews();
}

export async function setReview({ documentId, status, note = '', actor = '', extra = {} }) {
  const id = String(documentId || '').trim();
  if (!id) return { error: 'documentId is required.' };
  if (!['pending', 'approved', 'rejected'].includes(status)) {
    return { error: 'status must be pending, approved, or rejected.' };
  }

  const reviews = await readAllReviews();
  reviews[id] = {
    actor,
    note,
    status,
    updatedAt: new Date().toISOString(),
    ...extra
  };
  await writeAllReviews(reviews);
  return { documentId: id, review: reviews[id] };
}
