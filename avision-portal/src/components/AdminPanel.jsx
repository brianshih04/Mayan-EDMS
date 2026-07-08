import {
  Archive,
  CheckCircle2,
  ClipboardCheck,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  UsersRound
} from 'lucide-react';
import { roleNav } from '../portalConfig.js';
import { capitalize } from '../lib/utils.js';

function AdminPanel({
  activeNav, t, vm,
  documentTypes, documentTypesLoading, documentTypesError,
  scannerNotice, documentsError
}) {
  const {
    systemStatus, systemStatusLoading, portalSettings, setPortalSettings, settingsSaving,
    adminUser, setAdminUser, adminUserCreating,
    newDocumentTypeLabel, setNewDocumentTypeLabel, documentTypeCreating,
    loadSystemStatus, savePortalSettings, createAdminUser, createAdminDocumentType
  } = vm;

  if (activeNav === 'userAdmin') {
    return (
      <section className="work-panel admin-surface">
        <form className="admin-user-form" onSubmit={createAdminUser}>
          <div className="panel-heading">
            <UsersRound size={20} aria-hidden="true" />
            <h2>{t('adminCreateUser')}</h2>
          </div>
          <label>
            <span>{t('adminUsername')}</span>
            <input
              onChange={(event) => setAdminUser((current) => ({ ...current, username: event.target.value }))}
              value={adminUser.username}
            />
          </label>
          <label>
            <span>{t('adminPassword')}</span>
            <input
              onChange={(event) => setAdminUser((current) => ({ ...current, password: event.target.value }))}
              type="password"
              value={adminUser.password}
            />
          </label>
          <label>
            <span>{t('adminRole')}</span>
            <select
              onChange={(event) => setAdminUser((current) => ({ ...current, role: event.target.value }))}
              value={adminUser.role}
            >
              {['operator', 'reviewer', 'viewer', 'admin'].map((role) => (
                <option key={role} value={role}>{t(role)}</option>
              ))}
            </select>
          </label>
          <button className="strong-action" disabled={adminUserCreating || !adminUser.username || !adminUser.password} type="submit">
            {adminUserCreating ? t('scannerLoading') : t('adminCreateUser')}
          </button>
        </form>
        <div className="admin-document-types">
          <div className="panel-heading">
            <Archive size={20} aria-hidden="true" />
            <h2>{t('adminDocumentTypes')}</h2>
          </div>
          <p className="note">{t('adminDocumentTypeHelp')}</p>
          <form className="admin-doctype-form" onSubmit={createAdminDocumentType}>
            <label>
              <span>{t('adminDocumentTypeName')}</span>
              <input
                disabled={documentTypeCreating}
                onChange={(event) => setNewDocumentTypeLabel(event.target.value)}
                placeholder={t('adminDocumentTypeName')}
                value={newDocumentTypeLabel}
              />
            </label>
            <button className="strong-action" disabled={documentTypeCreating || !newDocumentTypeLabel.trim()} type="submit">
              <CheckCircle2 size={18} aria-hidden="true" />
              {documentTypeCreating ? t('scannerLoading') : t('adminAddDocumentType')}
            </button>
          </form>
          {documentTypesError ? <p className="scanner-error">{documentTypesError}</p> : null}
          {scannerNotice ? <p className="scanner-success">{scannerNotice}</p> : null}
          <div className="doctype-list">
            {documentTypesLoading ? (
              <span className="chip">{t('scannerDocTypesLoading')}</span>
            ) : documentTypes.length ? (
              documentTypes.map((docType) => (
                <span className="chip" key={docType.id}>{docType.label}</span>
              ))
            ) : (
              <span className="chip">{t('scannerNoDocType')}</span>
            )}
          </div>
        </div>
        <div className="permission-map">
          {['operator', 'reviewer', 'viewer', 'admin'].map((role) => (
            <div className="permission-row" key={role}>
              <ShieldCheck size={20} aria-hidden="true" />
              <div>
                <strong>{t(role)}</strong>
                <span>{roleNav[role].map((item) => t(item)).join(' / ')}</span>
              </div>
            </div>
          ))}
        </div>
        <p className="note">{t('roleHelp')}</p>
      </section>
    );
  }

  const checks = systemStatus?.checks || {};
  return (
    <section className="work-panel admin-surface">
      <div className="panel-heading">
        <Settings size={20} aria-hidden="true" />
        <h2>{t('adminSystemStatus')}</h2>
        <button className="subtle-action" disabled={systemStatusLoading} onClick={loadSystemStatus} type="button">
          {systemStatusLoading ? t('scannerLoading') : t('scannerRefresh')}
        </button>
      </div>
      {documentsError ? <p className="scanner-error">{documentsError}</p> : null}
      <div className="status-grid">
        {Object.entries(checks).map(([name, check]) => (
          <div className="status-card" key={name}>
            <strong>{name}</strong>
            <span className={`review-chip ${check.ok ? 'review-approved' : 'review-rejected'}`}>
              {check.ok ? t('statusOk') : t('statusFail')}
            </span>
            <p>{check.message}</p>
          </div>
        ))}
      </div>

      <div className="admin-document-types">
        <div className="panel-heading">
          <SlidersHorizontal size={20} aria-hidden="true" />
          <h2>{t('adminPortalSettings')}</h2>
        </div>
        <div className="record-editor">
          <label>
            <span>{t('settingThumbnailDefault')}</span>
            <select
              onChange={(event) => setPortalSettings((current) => ({ ...current, thumbnailSizeDefault: event.target.value }))}
              value={portalSettings.thumbnailSizeDefault || 'small'}
            >
              {['small', 'medium', 'large'].map((size) => (
                <option key={size} value={size}>{t(`thumb${capitalize(size)}`)}</option>
              ))}
            </select>
          </label>
          <label>
            <span>{t('settingBlankDefault')}</span>
            <input
              max="3"
              min="0"
              onChange={(event) => setPortalSettings((current) => ({ ...current, blankSensitivity: Number(event.target.value) }))}
              type="number"
              value={portalSettings.blankSensitivity ?? 2}
            />
          </label>
          <button className="strong-action" disabled={settingsSaving} onClick={savePortalSettings} type="button">
            {settingsSaving ? t('scannerLoading') : t('recordsSave')}
          </button>
        </div>
        {scannerNotice ? <p className="scanner-success">{scannerNotice}</p> : null}
      </div>

      <div className="admin-document-types">
        <div className="panel-heading">
          <ClipboardCheck size={20} aria-hidden="true" />
          <h2>{t('adminBatchQueue')}</h2>
        </div>
        <div className="queue-list compact-list">
          {(systemStatus?.queue || []).length ? (
            systemStatus.queue.map((batch) => (
              <div className="permission-row" key={batch.id}>
                <Archive size={20} aria-hidden="true" />
                <div>
                  <strong>
                    {batch.id}
                    <span className={`batch-status batch-${batch.status}`}>{t('import_' + batch.status)}</span>
                  </strong>
                  <span>
                    {batch.importedFiles}/{batch.totalFiles} imported{batch.failedFiles ? ` · ${batch.failedFiles} failed` : ''}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="scanner-empty">{t('batchQueueEmpty')}</div>
          )}
        </div>
      </div>
    </section>
  );
}

export default AdminPanel;
