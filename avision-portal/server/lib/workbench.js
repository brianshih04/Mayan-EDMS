import { listWatchFolder } from './watchFolder.js';
import { listBatches } from './batch.js';
import { listReviews } from './reviews.js';
import { listDocuments } from './mayan.js';

// Role-aware dashboard summary computed purely from existing stores
// (watch folder, batch manifests, reviews.json, Mayan documents). No new
// persisted state. Each data source is guarded so a Mayan hiccup degrades to
// zeros instead of failing the whole dashboard.
async function safe(thunk, fallback) {
  try {
    return await thunk();
  } catch {
    return fallback;
  }
}

function isToday(iso, start) {
  try {
    return new Date(iso) >= start;
  } catch {
    return false;
  }
}

// Returns { stats: {activeQueue, completedToday, alerts} | null, tasks: [{labelKey, count, status, action}], alertsTarget }.
// stats/tasks are null/empty for roles without a workflow queue (viewer, admin).
export async function getWorkbenchSummary(serviceToken, role) {
  if (role !== 'operator' && role !== 'reviewer') {
    return { stats: null, tasks: [], alertsTarget: null };
  }

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const today = (iso) => isToday(iso, start);

  const [files, batches, reviewMap, docsResult] = await Promise.all([
    safe(() => listWatchFolder(), []),
    safe(() => listBatches({ limit: 100 }), []),
    safe(() => listReviews(), {}),
    safe(() => listDocuments(serviceToken, { pageSize: 100 }), { results: [] })
  ]);

  const docs = (docsResult && docsResult.results) || [];
  const counts = { unsubmitted: 0, returned: 0, pending: 0, approved: 0 };
  for (const doc of docs) {
    const status = reviewMap[String(doc.id)]?.status;
    if (status === 'pending') counts.pending += 1;
    else if (status === 'approved') counts.approved += 1;
    else if (status === 'rejected') counts.returned += 1;
    else counts.unsubmitted += 1;
  }

  const reviewList = Object.values(reviewMap || {});
  const failedImports = (batches || []).filter((batch) => Number(batch.failedFiles) > 0).length;
  const batchesToday = (batches || []).filter((batch) => today(batch.createdAt)).length;
  const handedOffToday = reviewList.filter((r) => r?.status === 'pending' && today(r?.updatedAt)).length;
  const decidedToday = reviewList.filter(
    (r) => (r?.status === 'approved' || r?.status === 'rejected') && today(r?.updatedAt)
  ).length;

  if (role === 'operator') {
    const stats = {
      activeQueue: files.length + counts.unsubmitted + counts.returned,
      completedToday: batchesToday + handedOffToday,
      alerts: failedImports + counts.returned
    };
    const tasks = [];
    if (files.length) tasks.push({ labelKey: 'taskScanPending', count: files.length, status: 'ready', action: 'scanInbox' });
    if (counts.unsubmitted) tasks.push({ labelKey: 'taskClassifyPending', count: counts.unsubmitted, status: 'waiting', action: 'classify' });
    if (counts.returned) tasks.push({ labelKey: 'taskReturned', count: counts.returned, status: 'rejected', action: 'metadata' });
    if (failedImports) tasks.push({ labelKey: 'taskImportFailed', count: failedImports, status: 'rejected', action: 'scanInbox' });
    return { stats, tasks, alertsTarget: counts.returned > 0 ? 'metadata' : 'scanInbox' };
  }

  // reviewer
  const stats = {
    activeQueue: counts.pending,
    completedToday: decidedToday,
    alerts: 0
  };
  const tasks = counts.pending
    ? [{ labelKey: 'taskReviewPending', count: counts.pending, status: 'waiting', action: 'approvals' }]
    : [];
  return { stats, tasks, alertsTarget: 'approvals' };
}
