import { useEffect, useState } from 'react';
import { DEMO_LOGIN, authHeaders } from '../lib/constants.js';
import { fillTemplate } from '../lib/utils.js';

// Admin domain state + handlers (user creation, document-type creation,
// system status, portal settings). Shared toast/doctype setters and the
// scanner-pref mutators are passed in from the orchestrator.
export function useAdminState({
  activeNav, session, t,
  setScannerNotice, setDocumentsError,
  changeThumbnailSize, changeSensitivity,
  setDocumentTypesError, setSelectedDocumentTypeId, loadDocumentTypes
}) {
  const [systemStatus, setSystemStatus] = useState(null);
  const [systemStatusLoading, setSystemStatusLoading] = useState(false);
  const [portalSettings, setPortalSettings] = useState({ blankSensitivity: 2, thumbnailSizeDefault: 'small' });
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [adminUser, setAdminUser] = useState({ username: '', password: '', role: 'operator' });
  const [adminUserCreating, setAdminUserCreating] = useState(false);
  const [newDocumentTypeLabel, setNewDocumentTypeLabel] = useState('');
  const [documentTypeCreating, setDocumentTypeCreating] = useState(false);

  async function loadSystemStatus() {
    if (!session?.token || session.role !== 'admin') return;
    setSystemStatusLoading(true);
    setDocumentsError('');
    try {
      const response = await fetch('/api/system/status', { headers: authHeaders(session) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || t('documentsLoadError'));
      setSystemStatus(payload);
    } catch (error) {
      setDocumentsError(error.message || t('documentsLoadError'));
    } finally {
      setSystemStatusLoading(false);
    }
  }

  async function loadPortalSettings() {
    if (!session?.token) return;
    try {
      const response = await fetch('/api/system/settings', { headers: authHeaders(session) });
      const payload = await response.json().catch(() => ({}));
      if (response.ok) {
        setPortalSettings(payload.settings || {});
        if (payload.settings?.thumbnailSizeDefault) changeThumbnailSize(payload.settings.thumbnailSizeDefault);
        if (Number.isInteger(payload.settings?.blankSensitivity)) changeSensitivity(payload.settings.blankSensitivity);
      }
    } catch {
      /* Settings are optional; keep local defaults. */
    }
  }

  useEffect(() => {
    if (activeNav === 'system' && !DEMO_LOGIN) {
      loadSystemStatus();
      loadPortalSettings();
    }
  }, [activeNav, session?.token]);

  async function savePortalSettings() {
    setSettingsSaving(true);
    setDocumentsError('');
    try {
      const response = await fetch('/api/system/settings', {
        method: 'PATCH',
        headers: authHeaders(session, { 'Content-Type': 'application/json' }),
        body: JSON.stringify(portalSettings)
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || t('documentsLoadError'));
      setPortalSettings(payload.settings || portalSettings);
      setScannerNotice(t('settingsSaved'));
    } catch (error) {
      setDocumentsError(error.message || t('documentsLoadError'));
    } finally {
      setSettingsSaving(false);
    }
  }

  async function createAdminUser(event) {
    event.preventDefault();
    setAdminUserCreating(true);
    setDocumentsError('');
    setScannerNotice('');
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: authHeaders(session, { 'Content-Type': 'application/json' }),
        body: JSON.stringify(adminUser)
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || t('documentsLoadError'));
      setScannerNotice(fillTemplate(t('adminCreateUserDone'), { username: payload.result?.username || adminUser.username }));
      setAdminUser({ username: '', password: '', role: 'viewer' });
    } catch (error) {
      setDocumentsError(error.message || t('documentsLoadError'));
    } finally {
      setAdminUserCreating(false);
    }
  }

  async function createAdminDocumentType(event) {
    event.preventDefault();
    const label = newDocumentTypeLabel.trim();
    if (!label) {
      setDocumentTypesError(t('adminDocumentTypeName'));
      return;
    }

    setDocumentTypeCreating(true);
    setDocumentTypesError('');
    setScannerNotice('');

    try {
      const response = await fetch('/api/mayan/document-types', {
        method: 'POST',
        headers: authHeaders(session, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({ label })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || t('scannerDocTypesError'));
      const created = payload.result;
      setNewDocumentTypeLabel('');
      setScannerNotice(fillTemplate(t('adminDocumentTypeCreated'), { label: created.label || label }));
      await loadDocumentTypes({ silent: true });
      setSelectedDocumentTypeId(String(created.id || ''));
    } catch (error) {
      setDocumentTypesError(error.message || t('scannerDocTypesError'));
    } finally {
      setDocumentTypeCreating(false);
    }
  }

  return {
    systemStatus, systemStatusLoading, portalSettings, setPortalSettings, settingsSaving,
    adminUser, setAdminUser, adminUserCreating,
    newDocumentTypeLabel, setNewDocumentTypeLabel, documentTypeCreating,
    loadSystemStatus, savePortalSettings, createAdminUser, createAdminDocumentType
  };
}
