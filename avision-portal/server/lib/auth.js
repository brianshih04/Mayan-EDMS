import { serviceToken } from './config.js';
import { getCurrentUser, getUserGroups, obtainToken } from './mayan.js';
import { resolveRole } from './roleMap.js';

export async function resolvePortalUserFromToken(userToken) {
  const mayanUser = await getCurrentUser(userToken);

  let groups = [];
  let isSuperuser = false;
  try {
    groups = await getUserGroups(serviceToken, mayanUser.id);
  } catch (error) {
    // /users/{id}/groups/ excludes superuser/staff from its lookup queryset,
    // so a 404 for a service-token caller means the target user is privileged.
    if (error.status === 404) {
      isSuperuser = true;
    } else {
      throw error;
    }
  }

  const role = resolveRole(groups, { isSuperuser });

  return {
    groups,
    role,
    user: {
      id: mayanUser.id,
      username: mayanUser.username,
      name: mayanUser.name || mayanUser.username,
      email: mayanUser.email || ''
    }
  };
}

// Authenticate against Mayan, then resolve a portal role from the user's groups.
// Credentials are validated with the user's own token; group lookup uses the
// service token (normal users lack permission to read their own groups).
// Returns { token, user, role, groups }.
export async function portalLogin({ username, password }) {
  if (!serviceToken) {
    throw new Error('Portal service token not configured (set MAYAN_SERVICE_TOKEN on the server).');
  }

  const userToken = await obtainToken({ username, password });
  const resolved = await resolvePortalUserFromToken(userToken);

  return {
    token: userToken,
    ...resolved
  };
}
