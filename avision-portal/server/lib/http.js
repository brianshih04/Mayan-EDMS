// Small HTTP helpers shared by all route handlers.

export function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(payload));
}

export async function readRequestBody(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

// Extract the bearer/-token value from an `Authorization: Token <t>` header.
export function readToken(request) {
  const header = request.headers?.authorization || '';
  const match = header.match(/^Token\s+(.+)$/i);
  return match ? match[1].trim() : null;
}
