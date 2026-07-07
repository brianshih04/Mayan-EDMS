// One-time Mayan bootstrap for the Avision portal.
// Verifies the portal's Mayan REST client, then creates the role groups and a
// test user per role. Run with the admin password supplied via env so it never
// has to be typed into a command argument or source file:
//
//   PowerShell:  $env:MAYAN_ADMIN_PASSWORD='...'; node avision-portal/scripts/mayan-bootstrap.mjs
//   bash:         MAYAN_ADMIN_PASSWORD='...' node avision-portal/scripts/mayan-bootstrap.mjs
//
// Optional env:
//   MAYAN_ADMIN_USER       default 'admin'
//   MAYAN_TEST_PASSWORD    default 'Avision-Portal-2026!' (must pass Mayan password rules)
//   MAYAN_API_URL          default http://localhost:8080/api/v4

import {
  addUserToGroup,
  createUser,
  ensureRoleGroups,
  getCurrentUser,
  getUserGroups,
  listDocumentTypes,
  obtainToken,
  uploadDocument
} from '../server/lib/mayan.js';
import { resolveRole, ROLE_MAP } from '../server/lib/roleMap.js';
import { watchFolderPath } from '../server/lib/config.js';
import fs from 'node:fs/promises';
import path from 'node:path';

const ADMIN_USER = process.env.MAYAN_ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.MAYAN_ADMIN_PASSWORD;
const TEST_PASSWORD = process.env.MAYAN_TEST_PASSWORD || 'Avision-Portal-2026!';

const ROLE_USERS = [
  { username: 'scanner', group: 'Scanner', firstName: 'Scan', lastName: 'Station 01' },
  { username: 'records', group: 'Records', firstName: 'Records', lastName: 'Desk' },
  { username: 'reviewer', group: 'Reviewer', firstName: 'Team', lastName: 'Lead' },
  { username: 'viewer', group: 'Viewer', firstName: 'Document', lastName: 'User' }
];

function section(title) {
  console.log(`\n=== ${title} ===`);
}

if (!ADMIN_PASSWORD) {
  console.error('ERROR: set MAYAN_ADMIN_PASSWORD in the environment before running.');
  process.exit(1);
}

try {
  section('1. admin token');
  const token = await obtainToken({ username: ADMIN_USER, password: ADMIN_PASSWORD });
  console.log('OK token acquired (length %d)', token.length);

  section('2. current user');
  const me = await getCurrentUser(token);
  console.log('id=%s username=%s is_superuser=%s', me.id, me.username, me.is_superuser);

  section('3. admin groups');
  try {
    const groups = await getUserGroups(token, me.id);
    console.log(groups.length ? groups.join(', ') : '(none)');
  } catch {
    // Expected for superuser/staff: Mayan excludes them from the lookup queryset.
    console.log('(not listable for admin — expected if admin is a superuser; role will resolve to admin)');
  }

  section('4. document types');
  const types = await listDocumentTypes(token);
  console.log('count=%d', types.length);
  types.slice(0, 10).forEach((t) => console.log('  - [%s] %s', t.id, t.label));

  section('5. ensure role groups');
  const groupNames = [...new Set(Object.keys(ROLE_MAP))];
  const ensured = await ensureRoleGroups(token, groupNames);
  console.log('created:', ensured.created.length ? ensured.created.join(', ') : '(none, already present)');
  console.log('group ids:', JSON.stringify(ensured.byName));

  section('6. create test users');
  for (const def of ROLE_USERS) {
    const groupId = ensured.byName[def.group];
    if (!groupId) {
      console.log('  SKIP %s (group %s missing)', def.username, def.group);
      continue;
    }
    try {
      const user = await createUser(token, {
        username: def.username,
        password: TEST_PASSWORD,
        email: `${def.username}@portal.local`,
        firstName: def.firstName,
        lastName: def.lastName
      });
      await addUserToGroup(token, groupId, user.id);
      console.log('  + %s -> group %s (role %s)', def.username, def.group, ROLE_MAP[def.group]);
    } catch (error) {
      console.log('  ~ %s: %s (likely already exists)', def.username, error.message);
    }
  }

  section('7. verify portal flow (admin token used as service token)');
  // Simulate portalLogin for the scanner test user.
  const scannerToken = await obtainToken({ username: 'scanner', password: TEST_PASSWORD });
  const scannerUser = await getCurrentUser(scannerToken);
  const scannerGroups = await getUserGroups(token, scannerUser.id);
  const scannerRole = resolveRole(scannerGroups);
  console.log('scanner groups: %s', JSON.stringify(scannerGroups));
  console.log('scanner -> portal role: %s', scannerRole);

  const typesForUpload = await listDocumentTypes(token);
  console.log('document types visible to service token: %d', typesForUpload.length);

  // Upload one real file from the watch folder to confirm the multipart path.
  const dirEntries = await fs.readdir(watchFolderPath, { withFileTypes: true });
  const sample = dirEntries.find((e) => e.isFile());
  if (typesForUpload.length && sample) {
    try {
      const samplePath = path.join(watchFolderPath, sample.name);
      const uploaded = await uploadDocument({
        token,
        documentTypeId: typesForUpload[0].id,
        filePath: samplePath,
        label: `portal-bootstrap-test ${sample.name}`
      });
      console.log('upload OK -> Mayan document id=%s (delete in Mayan if unwanted)', uploaded.id);
    } catch (error) {
      console.log('upload check skipped: %s', error.message);
    }
  } else {
    console.log('upload skipped (no document type or no watch-folder file)');
  }

  section('done');
  console.log('Test login for the portal:');
  console.log('  usernames: scanner | records | reviewer | viewer (admin already exists)');
  console.log('  password:  %s', TEST_PASSWORD);
  console.log('Role mapping used: %s', JSON.stringify(ROLE_MAP));
  console.log('');
  console.log('Service token (set as MAYAN_SERVICE_TOKEN when starting the portal):');
  console.log('  %s', token);
} catch (error) {
  console.error('\nFAILED:', error.message);
  if (error.data) console.error('detail:', JSON.stringify(error.data));
  process.exit(1);
}
