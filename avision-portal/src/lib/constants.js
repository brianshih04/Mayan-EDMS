// App-wide constants and the session-token auth header helper.

export const MAYAN_URL = 'https://mayan-emds.avision-gb10.org';
// When true, login uses the in-page demo users (offline fallback). When false
// (the default, including production), login authenticates against Mayan.
export const DEMO_LOGIN = import.meta.env.VITE_DEMO_LOGIN === '1';
export const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
export const RECORD_METADATA_FIELDS = [
  ['avision_customer', 'Customer'],
  ['avision_case_id', 'Case ID'],
  ['avision_document_date', 'Document date'],
  ['avision_amount', 'Amount'],
  ['avision_tags', 'Tags']
];

export function authHeaders(session, extra = {}) {
  const headers = { ...extra };
  if (session?.token) headers.Authorization = `Token ${session.token}`;
  return headers;
}
