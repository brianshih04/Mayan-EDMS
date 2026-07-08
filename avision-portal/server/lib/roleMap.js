// Map Mayan group names to portal roles.
// Portal role keys must match roleNav/roleAccent/tasks/panels:
// operator | reviewer | viewer | admin
//
// Edit this table to match the group names configured in your Mayan instance.
// First matching group wins; Mayan superusers always map to admin.
export const ROLE_MAP = {
  Admin: 'admin',
  Operator: 'operator',
  Scanner: 'operator',
  Records: 'operator',
  Reviewer: 'reviewer',
  Viewer: 'viewer'
};

export const FALLBACK_ROLE = 'viewer';

export function resolveRole(groups, options = {}) {
  if (options.isSuperuser) return 'admin';
  for (const name of groups) {
    if (Object.prototype.hasOwnProperty.call(ROLE_MAP, name)) {
      return ROLE_MAP[name];
    }
  }
  return FALLBACK_ROLE;
}
