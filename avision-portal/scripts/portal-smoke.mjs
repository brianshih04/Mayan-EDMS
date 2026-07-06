import { listBatches } from '../server/lib/batch.js';
import { serviceToken } from '../server/lib/config.js';
import { listDocumentTypes, listDocuments, listReviewWorkflowStatuses } from '../server/lib/mayan.js';
import { readPortalSettings } from '../server/lib/portalSettings.js';

if (!serviceToken) {
  throw new Error('MAYAN_SERVICE_TOKEN is not configured.');
}

const [documentTypes, documents, reviews, settings, batches] = await Promise.all([
  listDocumentTypes(serviceToken),
  listDocuments(serviceToken, { pageSize: 5 }),
  listReviewWorkflowStatuses(serviceToken, { pageSize: 5 }),
  readPortalSettings(),
  listBatches({ limit: 5 })
]);

console.log(JSON.stringify({
  batches: batches.length,
  documentTypes: documentTypes.length,
  documents: documents.results.length,
  reviewStatuses: Object.keys(reviews).length,
  settings
}, null, 2));
