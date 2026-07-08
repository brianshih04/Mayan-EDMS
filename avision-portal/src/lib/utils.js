// Small pure formatting/template helpers shared across components.

export const capitalize = (value) => value.charAt(0).toUpperCase() + value.slice(1);

export const fillTemplate = (template, vars) => Object.keys(vars).reduce(
  (acc, key) => acc.replace(new RegExp(`\\{${key}\\}`, 'g'), vars[key]),
  template
);

export const normalizeRole = (role) => (role === 'scanner' || role === 'classifier' ? 'operator' : role);

export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function formatDateTime(value) {
  return new Intl.DateTimeFormat('zh-TW', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
}
