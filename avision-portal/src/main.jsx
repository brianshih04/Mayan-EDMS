import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { createRoot } from 'react-dom/client';
import {
  Archive,
  Bell,
  CheckCircle2,
  ClipboardCheck,
  FileSearch,
  FolderInput,
  Globe2,
  Languages,
  LayoutDashboard,
  LogOut,
  ScanLine,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  UserRound,
  UsersRound
} from 'lucide-react';
import './styles.css';
import { locales, scannerStrings } from './locales.js';
import { demoUsers, panels, roleAccent, roleNav, workflowContent } from './portalConfig.js';

const MAYAN_URL = 'https://mayan-emds.avision-gb10.org';
// When true, login uses the in-page demo users (offline fallback). When false
// (the default, including production), login authenticates against Mayan.
const DEMO_LOGIN = import.meta.env.VITE_DEMO_LOGIN === '1';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const RECORD_METADATA_FIELDS = [
  ['avision_customer', 'Customer'],
  ['avision_case_id', 'Case ID'],
  ['avision_document_date', 'Document date'],
  ['avision_amount', 'Amount'],
  ['avision_tags', 'Tags']
];

function authHeaders(session, extra = {}) {
  const headers = { ...extra };
  if (session?.token) headers.Authorization = `Token ${session.token}`;
  return headers;
}

// Scanner-specific strings, merged on top of `locales` in useTranslation.
// Kept separate so the large base locale blocks stay stable.

const scannerThumbnailSizes = {
  small: 72,
  medium: 96,
  large: 132
};

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat('zh-TW', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
}

// Blank-page detection thresholds. Index = sensitivity level (0..3).
// Higher level = stricter = fewer pages flagged blank (fewer false positives).
// Level 2 is the default. Tuned looser than the original 0.96/0.025/7 baseline
// to reduce misflagging on real documents with light backgrounds.
const BLANK_SENSITIVITY_PRESETS = [
  { whiteRatio: 0.96, inkRatio: 0.025, contrast: 8 },   // 0 sensitive
  { whiteRatio: 0.975, inkRatio: 0.018, contrast: 6 },  // 1
  { whiteRatio: 0.985, inkRatio: 0.012, contrast: 5 },  // 2 default
  { whiteRatio: 0.995, inkRatio: 0.006, contrast: 3 }   // 3 strict
];
const DEFAULT_BLANK_THRESHOLD = BLANK_SENSITIVITY_PRESETS[2];

function evaluateBlank(metrics, threshold = DEFAULT_BLANK_THRESHOLD) {
  if (!metrics) return false;
  return (
    metrics.whiteRatio > threshold.whiteRatio &&
    metrics.inkRatio < threshold.inkRatio &&
    metrics.averageContrast < threshold.contrast
  );
}

function analyzeImageForBlankPage(image, threshold = DEFAULT_BLANK_THRESHOLD) {
  const canvas = document.createElement('canvas');
  const size = 180;
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d', { willReadFrequently: true });

  context.drawImage(image, 0, 0, size, size);
  const { data } = context.getImageData(0, 0, size, size);
  let whitePixels = 0;
  let inkPixels = 0;
  let contrastTotal = 0;
  const totalPixels = size * size;

  for (let index = 0; index < data.length; index += 4) {
    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];
    const brightness = (red + green + blue) / 3;
    const contrast = Math.max(red, green, blue) - Math.min(red, green, blue);

    if (brightness > 245 && contrast < 10) whitePixels += 1;
    if (brightness < 235 || contrast > 18) inkPixels += 1;
    contrastTotal += contrast;
  }

  const metrics = {
    averageContrast: contrastTotal / totalPixels,
    inkRatio: inkPixels / totalPixels,
    whiteRatio: whitePixels / totalPixels
  };

  return { ...metrics, likelyBlank: evaluateBlank(metrics, threshold) };
}

// ---- small shared helpers ----
const capitalize = (value) => value.charAt(0).toUpperCase() + value.slice(1);
const fillTemplate = (template, vars) => Object.keys(vars).reduce(
  (acc, key) => acc.replace(new RegExp(`\\{${key}\\}`, 'g'), vars[key]),
  template
);
const normalizeRole = (role) => (role === 'scanner' || role === 'classifier' ? 'operator' : role);
const qcKey = (file) => file.name;

function loadQcStates() {
  try {
    return JSON.parse(localStorage.getItem('portal.scannerQc') || '{}');
  } catch {
    return {};
  }
}
function persistQcStates(map) {
  localStorage.setItem('portal.scannerQc', JSON.stringify(map));
}

// Files whose preview/QC must be page-based (server-rendered via mupdf).
const isMultiPage = (file) => {
  const ext = file?.extension?.toUpperCase();
  return ext === 'PDF' || ext === 'TIF' || ext === 'TIFF';
};
const pageQcKey = (file, page) => `${file.name}#${page}`;
function loadPageQcStates() {
  try {
    return JSON.parse(localStorage.getItem('portal.scannerPageQc') || '{}');
  } catch {
    return {};
  }
}
function persistPageQcStates(map) {
  localStorage.setItem('portal.scannerPageQc', JSON.stringify(map));
}

const navIcons = {
  scanInbox: ScanLine,
  batchCheck: ClipboardCheck,
  classify: FolderInput,
  ocrReview: ClipboardCheck,
  metadata: SlidersHorizontal,
  approvals: CheckCircle2,
  searchDocs: FileSearch,
  userAdmin: UsersRound,
  system: Settings
};

function useTranslation(lang) {
  return useMemo(() => {
    const base = locales[lang] || locales['zh-TW'];
    const dict = { ...base, ...(scannerStrings[lang] || {}) };
    const fallback = { ...locales['zh-TW'], ...scannerStrings['zh-TW'] };
    return (key) => dict[key] || fallback[key] || key;
  }, [lang]);
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <main className="login-shell">
          <section className="login-card">
            <p className="eyebrow">Portal error</p>
            <h1>畫面發生錯誤</h1>
            <p>{this.state.error.message}</p>
            <button className="primary-login" onClick={() => window.location.reload()} type="button">
              Reload
            </button>
          </section>
        </main>
      );
    }
    return this.props.children;
  }
}

// Accessible modal built on a React portal. Focuses the first focusable element
// (put the non-destructive action first in DOM order), traps Tab/Shift+Tab,
// closes on Escape and backdrop click, locks body scroll while open, and restores
// focus on close. Restore target is the element that was focused when the modal
// opened (captured below) — `triggerRef`/`fallbackFocusRef` are fallbacks, since
// the trigger may be disabled by the time we close (e.g. the delete button is
// disabled while deletion runs and after the selection is cleared), and disabled
// controls can't receive focus.
function Modal({ open, onClose, titleId, descId, triggerRef, fallbackFocusRef, children }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const previouslyFocused = document.activeElement;
    const dialog = dialogRef.current;
    if (dialog) {
      const focusable = dialog.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      (focusable || dialog).focus?.();
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
      const primary = previouslyFocused || triggerRef?.current;
      if (primary && !primary.disabled && document.contains(primary)) {
        primary.focus?.();
        return;
      }
      const fallback = fallbackFocusRef?.current;
      if (fallback && document.contains(fallback)) {
        fallback.focus?.();
      }
    };
  }, [open, triggerRef, fallbackFocusRef]);

  if (!open) return null;

  function handleKeyDown(event) {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== 'Tab') return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const nodes = Array.from(
      dialog.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    ).filter((el) => !el.disabled);
    if (!nodes.length) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    const active = document.activeElement;
    if (event.shiftKey) {
      if (active === first || !dialog.contains(active)) {
        event.preventDefault();
        last.focus();
      }
    } else if (active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div
        aria-describedby={descId}
        aria-labelledby={titleId}
        aria-modal="true"
        className="modal-dialog"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={handleKeyDown}
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}

function App() {
  const [language, setLanguage] = useState(localStorage.getItem('portal.language') || 'zh-TW');
  const [session, setSession] = useState(() => {
    const raw = localStorage.getItem('portal.session');
    if (!raw) return null;
    try {
      const stored = JSON.parse(raw);
      if (!DEMO_LOGIN && !stored?.token) {
        localStorage.removeItem('portal.session');
        return null;
      }
      if (!DEMO_LOGIN && stored?.expiresAt && Date.now() > stored.expiresAt) {
        localStorage.removeItem('portal.session');
        return null;
      }
      return { ...stored, role: normalizeRole(stored.role) };
    } catch {
      localStorage.removeItem('portal.session');
      return null;
    }
  });
  const [activeNav, setActiveNav] = useState('scanInbox');
  const t = useTranslation(language);

  useEffect(() => {
    if (!session || DEMO_LOGIN) return undefined;
    const delay = Math.max(0, (session.expiresAt || 0) - Date.now());
    const timer = window.setTimeout(() => logout(), delay);
    return () => window.clearTimeout(timer);
  }, [session?.expiresAt]);

  function changeLanguage(value) {
    setLanguage(value);
    localStorage.setItem('portal.language', value);
  }

  function login(user) {
    const next = { username: user.username, role: normalizeRole(user.role), name: user.name };
    if (user.token) next.token = user.token;
    if (!DEMO_LOGIN) next.expiresAt = Date.now() + SESSION_TTL_MS;
    localStorage.setItem('portal.session', JSON.stringify(next));
    setSession(next);
    setActiveNav(roleNav[next.role]?.[0] || 'scanInbox');
  }

  function logout() {
    localStorage.removeItem('portal.session');
    setSession(null);
  }

  if (!session) {
    return (
      <LoginScreen
        language={language}
        onLanguageChange={changeLanguage}
        onLogin={login}
        t={t}
      />
    );
  }

  return (
    <ErrorBoundary>
      <Shell
        activeNav={activeNav}
        language={language}
        onLanguageChange={changeLanguage}
        onLogout={logout}
        onNav={setActiveNav}
        session={session}
        t={t}
      />
    </ErrorBoundary>
  );
}

function LoginScreen({ language, onLanguageChange, onLogin, t }) {
  const [username, setUsername] = useState('scanner');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const previewUser = demoUsers.find((user) => user.username === username.trim()) || demoUsers[0];

  async function submitLogin(event) {
    event.preventDefault();
    setError('');

    if (DEMO_LOGIN) {
      const matchedUser = demoUsers.find(
        (user) => user.username === username.trim() && user.password === password
      );
      if (!matchedUser) { setError(t('loginError')); return; }
      onLogin({ username: matchedUser.username, role: matchedUser.role, name: matchedUser.name });
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || t('loginError'));
      onLogin({
        username: payload.user?.username || username.trim(),
        role: payload.role,
        name: payload.user?.name || payload.user?.username || username.trim(),
        token: payload.token
      });
    } catch (fetchError) {
      setError(fetchError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-brand">
        <div className="hero-content">
          <img src="/avision-mark.svg" alt="Avision" className="brand-mark" />
          <div>
            <p className="hero-kicker">Avision EDMS</p>
            <h1>{t('appName')}</h1>
            <p>{t('appSubtitle')}</p>
          </div>
        </div>
        <div className="hero-metrics" aria-label="System status">
          <div>
            <strong>24/7</strong>
            <span>{t('connected')}</span>
          </div>
          <div>
            <strong>4</strong>
            <span>{t('language')}</span>
          </div>
          <div>
            <strong>4</strong>
            <span>{t('role')}</span>
          </div>
        </div>
      </section>

      <section className="login-panel" aria-label={t('signIn')}>
        <div className="login-panel-header">
          <div>
            <p className="eyebrow">{t('signIn')}</p>
            <h2>{t('loginTitle')}</h2>
          </div>
          <div className="language-row">
            <Languages size={18} aria-hidden="true" />
            <select value={language} onChange={(event) => onLanguageChange(event.target.value)}>
              <option value="zh-TW">繁體中文</option>
              <option value="en">English</option>
              <option value="ja">日本語</option>
              <option value="zh-CN">简体中文</option>
            </select>
          </div>
        </div>

        <form className="login-form" onSubmit={submitLogin}>
          <p className="hint">{DEMO_LOGIN ? t('demoHint') : t('loginHintReal')}</p>
          <label>
            <span>{t('username')}</span>
            <input
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          </label>
          <label>
            <span>{t('password')}</span>
            <input
              autoComplete="current-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {error ? <p className="login-error">{error}</p> : null}
          <button className="primary-login" type="submit" disabled={submitting}>
            <UserRound size={18} aria-hidden="true" />
            {submitting ? t('scannerLoading') : t('loginAs')}
          </button>
        </form>

        {DEMO_LOGIN ? (
        <div className="account-list">
          <p className="hint">{t('demoPassword')}</p>
          <div className="account-grid">
            {demoUsers.map((user) => (
              <button
                className={username === user.username ? `account-chip active ${roleAccent[user.role]}` : `account-chip ${roleAccent[user.role]}`}
                key={user.username}
                onClick={() => {
                  setUsername(user.username);
                  setError('');
                }}
                type="button"
              >
                <span>{user.username}</span>
                <small>{t(user.role)}</small>
              </button>
            ))}
          </div>
        </div>
        ) : null}

        {DEMO_LOGIN ? (
          <div className={`role-preview ${roleAccent[previewUser.role]}`}>
            <div>
              <p className="eyebrow">{previewUser.name}</p>
              <h3>{t(previewUser.role)}</h3>
            </div>
            <div className="preview-tasks">
              <span>{t(`${previewUser.role}Intro`)}</span>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}

function Shell({ activeNav, language, onLanguageChange, onLogout, onNav, session, t }) {
  const navItems = roleNav[session.role];
  const rolePanel = panels[session.role];
  const [workbench, setWorkbench] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch('/api/workbench/summary', { headers: authHeaders(session) });
        const payload = await response.json().catch(() => ({}));
        if (!cancelled && response.ok) setWorkbench(payload);
      } catch {
        /* dashboard summary is an enhancement; leave null (no fake numbers) */
      }
    })();
    return () => { cancelled = true; };
  }, [session?.token]);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-row">
          <img src="/avision-mark.svg" alt="Avision" className="sidebar-mark" />
          <div>
            <strong>{t('appName')}</strong>
            <span>{t(session.role)}</span>
          </div>
        </div>

        <div className={`user-card ${roleAccent[session.role]}`}>
          <div className="avatar" aria-hidden="true">{session.name.slice(0, 1)}</div>
          <div>
            <strong>{session.name}</strong>
            <span>{t(session.role)}</span>
          </div>
        </div>

        <nav className="nav-list" aria-label="Primary">
          {navItems.map((item) => {
            const Icon = navIcons[item];
            return (
              <button
                className={activeNav === item ? 'nav-button active' : 'nav-button'}
                key={item}
                onClick={() => onNav(item)}
                type="button"
              >
                <Icon size={19} aria-hidden="true" />
                <span>{t(item)}</span>
              </button>
            );
          })}
        </nav>

        <a className="mayan-link" href={MAYAN_URL} target="_blank" rel="noreferrer">
          <Globe2 size={18} aria-hidden="true" />
          <span>{t('openMayan')}</span>
        </a>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">{t('connected')}</p>
            <h1>{t(activeNav)}</h1>
          </div>
          <div className="top-actions">
            <select value={language} onChange={(event) => onLanguageChange(event.target.value)} aria-label={t('language')}>
              <option value="zh-TW">繁中</option>
              <option value="en">EN</option>
              <option value="ja">日本語</option>
              <option value="zh-CN">简中</option>
            </select>
            {workbench?.stats && workbench.stats.alerts > 0 ? (
              <button
                aria-label={t('alerts')}
                className="icon-text notification-button"
                onClick={() => workbench.alertsTarget && onNav(workbench.alertsTarget)}
                type="button"
              >
                <Bell size={18} aria-hidden="true" />
                {workbench.stats.alerts}
              </button>
            ) : null}
            <button className="icon-text" onClick={onLogout} type="button">
              <LogOut size={18} aria-hidden="true" />
              {t('signOut')}
            </button>
          </div>
        </header>

        <section className={`role-summary ${roleAccent[session.role]}`}>
          <div className="summary-copy">
            <p className="eyebrow">{session.name}</p>
            <h2>{t(session.role)}</h2>
            <p>{t(rolePanel.intro)}</p>
          </div>
          {workbench?.stats ? (
            <div className="stats-grid">
              {[
                ['activeQueue', workbench.stats.activeQueue],
                ['completedToday', workbench.stats.completedToday],
                ['alerts', workbench.stats.alerts]
              ].map(([label, value]) => (
                <div className="stat-block" key={label}>
                  <span>{t(label)}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          ) : null}
        </section>

        {session.role === 'operator' ? (
          <section className="operator-flow" aria-label={t('operatorFlow')}>
            {['scanInbox', 'classify', 'ocrReview', 'metadata', 'searchDocs'].map((item, index) => {
              const Icon = navIcons[item];
              return (
                <button
                  aria-current={activeNav === item ? 'step' : undefined}
                  className={activeNav === item ? 'operator-step active' : 'operator-step'}
                  key={item}
                  onClick={() => onNav(item)}
                  type="button"
                >
                  <span className="operator-step-index">{index + 1}</span>
                  <Icon size={18} aria-hidden="true" />
                  <span>{t(item)}</span>
                </button>
              );
            })}
          </section>
        ) : null}

        {session.role !== 'operator' ? (
          <section className="quick-actions" aria-label={t('nextAction')}>
            {navItems.map((item) => {
              const Icon = navIcons[item];
              return (
                <button
                  className={activeNav === item ? 'quick-card active' : 'quick-card'}
                  key={item}
                  onClick={() => onNav(item)}
                  type="button"
                >
                  <Icon size={22} aria-hidden="true" />
                  <span>{t(item)}</span>
                </button>
              );
            })}
          </section>
        ) : null}

        <section className={workbench?.tasks?.length ? 'content-grid' : 'content-grid single'}>
          <PrimaryWorkArea activeNav={activeNav} session={session} t={t} />
          <QueuePanel onNav={onNav} t={t} tasks={workbench?.tasks || []} />
        </section>
      </main>
    </div>
  );
}

function PrimaryWorkArea({ activeNav, session, t }) {
  const scannerMode = activeNav === 'scanInbox' || activeNav === 'batchCheck';
  const [scannerFiles, setScannerFiles] = useState([]);
  const [watchFolder, setWatchFolder] = useState('E:\\watch_folder');
  const [scannerLoading, setScannerLoading] = useState(false);
  const [scannerError, setScannerError] = useState('');
  const [scannerNotice, setScannerNotice] = useState('');
  const [scannerBatch, setScannerBatch] = useState(null);
  const [scannerCreating, setScannerCreating] = useState(false);
  const [scannerDeleting, setScannerDeleting] = useState(false);
  const [selectedScannerFile, setSelectedScannerFile] = useState(null);
  const [blankAnalysis, setBlankAnalysis] = useState(null);
  const [thumbnailAnalysis, setThumbnailAnalysis] = useState({});
  const [thumbnailSize, setThumbnailSize] = useState(
    localStorage.getItem('portal.scannerThumbnailSize') || 'small'
  );
  const [selectedFiles, setSelectedFiles] = useState(() => new Set());
  const [qcStates, setQcStates] = useState(() => loadQcStates());
  const [onlyBlank, setOnlyBlank] = useState(false);
  const [sensitivity, setSensitivity] = useState(
    () => Number(localStorage.getItem('portal.scannerBlankSensitivity')) || 2
  );
  const blankThreshold = BLANK_SENSITIVITY_PRESETS[sensitivity] || DEFAULT_BLANK_THRESHOLD;

  // Per-page state for the currently-selected multi-page file (PDF/TIFF).
  const [scannerPages, setScannerPages] = useState([]);
  const [scannerPagesLoading, setScannerPagesLoading] = useState(false);
  const [scannerPagesError, setScannerPagesError] = useState('');
  const [pageQcStates, setPageQcStates] = useState(() => loadPageQcStates());

  // Mayan import state.
  const [documentTypes, setDocumentTypes] = useState([]);
  const [documentTypesLoading, setDocumentTypesLoading] = useState(false);
  const [documentTypesError, setDocumentTypesError] = useState('');
  const [selectedDocumentTypeId, setSelectedDocumentTypeId] = useState('');
  const [documentTypeFilterId, setDocumentTypeFilterId] = useState('');
  const [newDocumentTypeLabel, setNewDocumentTypeLabel] = useState('');
  const [documentTypeCreating, setDocumentTypeCreating] = useState(false);
  const [deleteAfterImport, setDeleteAfterImport] = useState(false);
  const [importProgress, setImportProgress] = useState({});
  const [importing, setImporting] = useState(false);
  const [documentQuery, setDocumentQuery] = useState('');
  const [mayanDocuments, setMayanDocuments] = useState([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentsError, setDocumentsError] = useState('');
  const [selectedMayanDocument, setSelectedMayanDocument] = useState(null);
  const [documentPreview, setDocumentPreview] = useState(null);
  const [documentPreviewLoading, setDocumentPreviewLoading] = useState(false);
  const [documentPreviewError, setDocumentPreviewError] = useState('');
  const [selectedPreviewPageId, setSelectedPreviewPageId] = useState('');
  const [recordForm, setRecordForm] = useState({ label: '', description: '', documentTypeId: '', metadata: {} });
  const [ocrPages, setOcrPages] = useState([]);
  const [ocrVersionId, setOcrVersionId] = useState(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState('');
  const [ocrSaving, setOcrSaving] = useState(false);
  const [recordSaving, setRecordSaving] = useState(false);
  const [reviews, setReviews] = useState({});
  const [reviewNote, setReviewNote] = useState('');
  const [reviewSaving, setReviewSaving] = useState(false);
  const [metadataFilters, setMetadataFilters] = useState({});
  const [systemStatus, setSystemStatus] = useState(null);
  const [systemStatusLoading, setSystemStatusLoading] = useState(false);
  const [portalSettings, setPortalSettings] = useState({ blankSensitivity: 2, thumbnailSizeDefault: 'small' });
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [adminUser, setAdminUser] = useState({ username: '', password: '', role: 'operator' });
  const [adminUserCreating, setAdminUserCreating] = useState(false);
  const deleteBtnRef = useRef(null);
  const livePanelRef = useRef(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  async function loadScannerFiles() {
    setScannerLoading(true);
    setScannerError('');
    setScannerNotice('');

    try {
      const response = await fetch('/api/scanner/watch-folder');
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || 'Unable to read watch folder.');
      }

      setWatchFolder(payload.watchFolder);
      setScannerFiles(payload.files);
      setThumbnailAnalysis((current) => {
        const next = {};
        payload.files.forEach((file) => {
          if (current[file.name]) next[file.name] = current[file.name];
        });
        return next;
      });
      setSelectedScannerFile((current) => {
        if (payload.files.some((file) => file.name === current?.name)) return current;
        return payload.files[0] || null;
      });
    } catch (error) {
      setScannerError(error.message);
    } finally {
      setScannerLoading(false);
    }
  }

  async function createScannerBatch() {
    const targets = scannerFiles.filter((file) => selectedFiles.has(file.name));
    setScannerNotice('');

    if (!targets.length) {
      setScannerError(t('scannerNoSelection'));
      return;
    }
    if (!DEMO_LOGIN && !selectedDocumentTypeId) {
      setScannerError(t('scannerPickDocType'));
      return;
    }

    setScannerCreating(true);
    setScannerError('');
    let createdBatch;

    try {
      const response = await fetch('/api/scanner/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          createdBy: session.username,
          files: targets.map((file) => ({
            name: file.name,
            qcState: qcStates[qcKey(file)] || 'normal',
            pages: isMultiPage(file)
              ? Object.entries(pageQcStates)
                  .filter(([key]) => key.startsWith(`${file.name}#`))
                  .map(([key, qcState]) => ({ page: Number(key.split('#')[1]), qcState }))
              : undefined
          }))
        })
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || 'Unable to create scanner batch.');
      }

      const batch = payload.batch;
      createdBatch = batch;
      setScannerBatch(batch);
      setSelectedFiles(new Set());
      await loadScannerFiles();
    } catch (error) {
      setScannerError(error.message);
      return;
    } finally {
      setScannerCreating(false);
    }

    if (!DEMO_LOGIN && createdBatch) {
      await importBatchToMayan(createdBatch);
    }
  }

  useEffect(() => {
    if (scannerMode) {
      loadScannerFiles();
    }
  }, [scannerMode]);

  async function loadMayanDocuments(query = documentQuery) {
    if (!session?.token) {
      setMayanDocuments([]);
      setDocumentsError(t('documentsLoadError'));
      return;
    }
    setDocumentsLoading(true);
    setDocumentsError('');
    try {
      const params = new URLSearchParams({ page_size: '50' });
      if (query.trim()) params.set('q', query.trim());
      if (documentTypeFilterId) params.set('document_type_id', documentTypeFilterId);
      Object.entries(metadataFilters).forEach(([name, value]) => {
        if (String(value || '').trim()) params.set(name, String(value).trim());
      });
      const response = await fetch(`/api/mayan/documents?${params.toString()}`, {
        headers: authHeaders(session)
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || t('documentsLoadError'));
      setMayanDocuments(payload.results || []);
      setSelectedMayanDocument((current) => {
        if (!current) return null;
        return (payload.results || []).some((document) => document.id === current.id) ? current : null;
      });
    } catch (error) {
      setMayanDocuments([]);
      setDocumentsError(error.message || t('documentsLoadError'));
    } finally {
      setDocumentsLoading(false);
    }
  }

  async function loadDocumentPreview(document) {
    setSelectedMayanDocument(document);
    setRecordForm({
      label: document.label || '',
      description: document.description || '',
      documentTypeId: document.documentTypeId ? String(document.documentTypeId) : '',
      metadata: {}
    });
    setOcrPages([]);
    setOcrVersionId(null);
    setOcrError('');
    setReviewNote(reviews[String(document.id)]?.note || '');
    setDocumentPreviewLoading(true);
    setDocumentPreviewError('');
    setDocumentPreview(null);
    setSelectedPreviewPageId('');

    try {
      const response = await fetch(`/api/mayan/documents/${document.id}/pages`, {
        headers: authHeaders(session)
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || t('documentsLoadError'));
      setDocumentPreview(payload);
      setSelectedPreviewPageId(payload.pages?.[0] ? String(payload.pages[0].id) : '');
      if (activeNav === 'classify' || activeNav === 'metadata' || activeNav === 'ocrReview') {
        const metadataResponse = await fetch(`/api/mayan/documents/${document.id}/metadata`, {
          headers: authHeaders(session)
        });
        const metadataPayload = await metadataResponse.json().catch(() => ({}));
        if (metadataResponse.ok) {
          setRecordForm((current) => ({ ...current, metadata: metadataPayload.values || {} }));
        }
      }
      if (activeNav === 'ocrReview' || activeNav === 'approvals') {
        loadDocumentOcr(document.id);
      }
    } catch (error) {
      setDocumentPreviewError(error.message || t('documentsLoadError'));
    } finally {
      setDocumentPreviewLoading(false);
    }
  }

  async function loadDocumentOcr(documentId) {
    setOcrLoading(true);
    setOcrError('');
    try {
      const response = await fetch(`/api/mayan/documents/${documentId}/ocr`, {
        headers: authHeaders(session)
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || t('ocrLoadError'));
      setOcrVersionId(payload.versionId);
      setOcrPages((payload.pages || []).map((page) => ({ ...page, dirty: false })));
    } catch (error) {
      setOcrPages([]);
      setOcrVersionId(null);
      setOcrError(error.message || t('ocrLoadError'));
    } finally {
      setOcrLoading(false);
    }
  }

  function setOcrPageContent(pageId, content) {
    setOcrPages((current) => current.map((page) => (
      page.pageId === pageId ? { ...page, content, dirty: true } : page
    )));
  }

  async function saveOcrEdits() {
    if (!selectedMayanDocument || !ocrVersionId) return;
    const dirtyPages = ocrPages.filter((page) => page.dirty);
    if (!dirtyPages.length) {
      setScannerNotice(t('ocrNoChanges'));
      return;
    }
    setOcrSaving(true);
    setOcrError('');
    setScannerNotice('');
    const documentId = selectedMayanDocument.id;
    const results = await Promise.allSettled(dirtyPages.map((page) =>
      fetch(`/api/mayan/documents/${documentId}/versions/${ocrVersionId}/pages/${page.pageId}/ocr`, {
        method: 'PATCH',
        headers: authHeaders(session, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({ content: page.content })
      })
    ));
    let errorMessage = '';
    for (const result of results) {
      if (result.status !== 'fulfilled') {
        errorMessage = result.reason?.message || t('ocrLoadError');
        break;
      }
      if (!result.value.ok) {
        const payload = await result.value.json().catch(() => ({}));
        errorMessage = payload.error || t('ocrLoadError');
        break;
      }
    }
    if (errorMessage) {
      setOcrError(errorMessage);
    } else {
      setOcrPages((current) => current.map((page) => ({ ...page, dirty: false })));
      setScannerNotice(t('ocrSavedAll'));
    }
    setOcrSaving(false);
  }

  function ocrEditor() {
    const anyDirty = ocrPages.some((page) => page.dirty);
    return (
      <div aria-busy={ocrLoading || ocrSaving} className="ocr-editor wide">
        <div className="ocr-status-row">
          <span className="ocr-editor-label">{t('ocrText')}</span>
          <span className={`review-chip ${anyDirty ? 'review-pending' : 'review-approved'}`}>
            {anyDirty ? t('ocrNeedsCheck') : t('ocrSaved')}
          </span>
          {ocrPages.length ? (
            <span className="chip">{fillTemplate(t('ocrPageCount'), { count: ocrPages.length })}</span>
          ) : null}
        </div>
        {ocrLoading ? (
          <div className="ocr-page-list" aria-label={t('ocrText')}>
            {Array.from({ length: 2 }).map((_, index) => (
              <div className="ocr-page-item" key={index}>
                <div className="scanner-skeleton scanner-skeleton-line narrow" />
                <div className="scanner-skeleton ocr-page-skeleton" />
              </div>
            ))}
          </div>
        ) : ocrError ? (
          <p className="scanner-error" role="status">{ocrError}</p>
        ) : ocrPages.length ? (
          <>
            <div className="ocr-page-list">
              {ocrPages.map((page) => (
                <label key={page.pageId} className="ocr-page-item">
                  <span className="ocr-page-head">
                    {fillTemplate(t('ocrPage'), { n: page.pageNumber })}
                    {page.dirty ? <span aria-hidden="true" className="ocr-dirty">•</span> : null}
                  </span>
                  <textarea
                    className="ocr-page-textarea"
                    onChange={(event) => setOcrPageContent(page.pageId, event.target.value)}
                    value={page.content}
                  />
                </label>
              ))}
            </div>
            <button
              className="strong-action"
              disabled={ocrSaving || !anyDirty}
              onClick={saveOcrEdits}
              type="button"
            >
              {ocrSaving ? t('ocrSaving') : t('ocrSaveAll')}
            </button>
          </>
        ) : (
          <div className="scanner-empty">{t('ocrEmpty')}</div>
        )}
      </div>
    );
  }

  useEffect(() => {
    if (['searchDocs', 'classify', 'ocrReview', 'metadata', 'approvals'].includes(activeNav) && !DEMO_LOGIN) {
      loadMayanDocuments('');
    }
  }, [activeNav, session?.token, documentTypeFilterId]);

  async function loadReviews() {
    if (!session?.token) return;
    try {
      const response = await fetch('/api/reviews', { headers: authHeaders(session) });
      const payload = await response.json().catch(() => ({}));
      if (response.ok) setReviews(payload.reviews || {});
    } catch {
      /* review status is an enhancement; document list remains usable */
    }
  }

  useEffect(() => {
    if (['classify', 'ocrReview', 'metadata', 'approvals'].includes(activeNav) && !DEMO_LOGIN) {
      loadReviews();
    }
  }, [activeNav, session?.token]);

  async function saveRecordDocument() {
    if (!selectedMayanDocument) return;
    setRecordSaving(true);
    setDocumentsError('');
    try {
      const response = await fetch(`/api/mayan/documents/${selectedMayanDocument.id}`, {
        method: 'PATCH',
        headers: authHeaders(session, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          label: recordForm.label,
          description: recordForm.description,
          metadata: recordForm.metadata,
          metadataDocumentTypeId: recordForm.documentTypeId || selectedMayanDocument.documentTypeId,
          documentTypeId: String(recordForm.documentTypeId || '') !== String(selectedMayanDocument.documentTypeId || '')
            ? recordForm.documentTypeId
            : ''
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || t('documentsLoadError'));
      setScannerNotice(t('recordsSaved'));
      await loadMayanDocuments(documentQuery);
    } catch (error) {
      setDocumentsError(error.message || t('documentsLoadError'));
    } finally {
      setRecordSaving(false);
    }
  }

  async function submitReview(status) {
    if (!selectedMayanDocument) return;
    setReviewSaving(true);
    setDocumentsError('');
    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: authHeaders(session, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          documentId: selectedMayanDocument.id,
          documentTypeId: recordForm.documentTypeId || selectedMayanDocument.documentTypeId,
          note: reviewNote,
          status
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || t('documentsLoadError'));
      setReviews((current) => ({ ...current, [selectedMayanDocument.id]: payload.review }));
      setScannerNotice(status === 'pending' ? t('recordsSentReview') : t('reviewSaved'));
      await loadReviews();
    } catch (error) {
      setDocumentsError(error.message || t('documentsLoadError'));
    } finally {
      setReviewSaving(false);
    }
  }

  useEffect(() => {
    setBlankAnalysis(null);
  }, [selectedScannerFile?.name]);

  // Fetch server-rendered pages when a multi-page file (PDF/TIFF) is selected.
  useEffect(() => {
    if (!selectedScannerFile || !isMultiPage(selectedScannerFile)) {
      setScannerPages([]);
      setScannerPagesError('');
      return;
    }
    let cancelled = false;
    setScannerPagesLoading(true);
    setScannerPagesError('');
    (async () => {
      try {
        const response = await fetch(
          `/api/scanner/files/${encodeURIComponent(selectedScannerFile.name)}/pages`
        );
        const payload = await response.json();
        if (cancelled) return;
        if (!response.ok) throw new Error(payload.error || 'Unable to load pages.');
        setScannerPages(payload.pages || []);
      } catch (error) {
        if (!cancelled) setScannerPagesError(error.message);
      } finally {
        if (!cancelled) setScannerPagesLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedScannerFile?.name]);

  function setPageQc(file, page, state) {
    setPageQcStates((current) => {
      const next = { ...current, [pageQcKey(file, page)]: state };
      persistPageQcStates(next);
      return next;
    });
  }

  function cyclePageQc(file, page) {
    const order = ['normal', 'rescan', 'ignore'];
    const current = pageQcStates[pageQcKey(file, page)] || 'normal';
    setPageQc(file, page, order[(order.indexOf(current) + 1) % order.length]);
  }

  async function loadDocumentTypes({ silent = false } = {}) {
    if (!session?.token) {
      setDocumentTypes([]);
      setSelectedDocumentTypeId('');
      setDocumentTypesError(t('scannerDocTypesError'));
      return;
    }
    if (!silent) setDocumentTypesLoading(true);
    setDocumentTypesError('');
    try {
      const response = await fetch('/api/mayan/document-types', { headers: authHeaders(session) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || t('scannerDocTypesError'));
      const types = payload.results || [];
      setDocumentTypes(types);
      setSelectedDocumentTypeId((current) => current || (types[0] ? String(types[0].id) : ''));
      setDocumentTypesError(types.length ? '' : t('scannerNoDocType'));
    } catch (error) {
      setDocumentTypes([]);
      setSelectedDocumentTypeId('');
      setDocumentTypesError(error.message || t('scannerDocTypesError'));
    } finally {
      if (!silent) setDocumentTypesLoading(false);
    }
  }

  // Fetch document types for scanner import, records, viewer filters, and admin management.
  useEffect(() => {
    if (!(scannerMode || activeNav === 'userAdmin' || activeNav === 'searchDocs' || activeNav === 'classify' || activeNav === 'metadata') || DEMO_LOGIN) return;
    let cancelled = false;
    (async () => {
      await loadDocumentTypes();
      if (cancelled) return;
    })();
    return () => { cancelled = true; };
  }, [scannerMode, activeNav, session?.token, t]);

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

  async function importOneToMayan(batch, fileName) {
    setImportProgress((current) => ({ ...current, [fileName]: { status: 'importing' } }));
    try {
      const response = await fetch('/api/mayan/import', {
        method: 'POST',
        headers: authHeaders(session, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          batchId: batch.id,
          fileName,
          documentTypeId: selectedDocumentTypeId
        })
      });
      const payload = await response.json().catch(() => ({}));
      const result = payload.result || {};
      if (!response.ok || result.importStatus === 'failed') {
        setImportProgress((current) => ({
          ...current,
          [fileName]: { status: 'failed', error: payload.error || result.importError || t('scannerImportFailed') }
        }));
      } else {
        let deletedOriginal = false;
        let deleteError = '';
        if (deleteAfterImport) {
          try {
            await deleteWatchFolderFile(fileName);
            removeFilesFromScannerState([fileName]);
            deletedOriginal = true;
          } catch (error) {
            deleteError = error.message || t('scannerDeleteFailed');
          }
        }
        setImportProgress((current) => ({
          ...current,
          [fileName]: { status: 'imported', mayanDocumentId: result.mayanDocumentId, deletedOriginal, deleteError }
        }));
      }
    } catch (error) {
      setImportProgress((current) => ({ ...current, [fileName]: { status: 'failed', error: error.message } }));
    }
  }

  async function importBatchToMayan(batch) {
    setImporting(true);
    const progress = {};
    batch.files.forEach((file) => { progress[file.name] = { status: 'pending' }; });
    setImportProgress(progress);
    for (const file of batch.files) {
      await importOneToMayan(batch, file.name);
    }
    setImporting(false);
  }

  async function retryImportFile(fileName) {
    if (!scannerBatch) return;
    await importOneToMayan(scannerBatch, fileName);
  }

  const pageSummary = useMemo(() => {
    if (!scannerPages.length) return null;
    const blank = scannerPages.filter((p) => evaluateBlank(p.metrics, blankThreshold)).length;
    const rescan = scannerPages.filter(
      (p) => (pageQcStates[pageQcKey(selectedScannerFile, p.page)] || 'normal') === 'rescan'
    ).length;
    return { count: scannerPages.length, blank, rescan };
  }, [scannerPages, pageQcStates, selectedScannerFile, blankThreshold]);

  function updateThumbnailAnalysis(file, image) {
    setThumbnailAnalysis((current) => {
      if (current[file.name]?.width && current[file.name]?.height) return current;
      const { averageContrast, inkRatio, whiteRatio } = analyzeImageForBlankPage(image, blankThreshold);

      return {
        ...current,
        [file.name]: {
          averageContrast,
          inkRatio,
          whiteRatio,
          height: image.naturalHeight,
          width: image.naturalWidth
        }
      };
    });
  }

  function changeThumbnailSize(size) {
    setThumbnailSize(size);
    localStorage.setItem('portal.scannerThumbnailSize', size);
  }

  function changeSensitivity(level) {
    const clamped = Math.max(0, Math.min(BLANK_SENSITIVITY_PRESETS.length - 1, level));
    setSensitivity(clamped);
    localStorage.setItem('portal.scannerBlankSensitivity', String(clamped));
  }

  // Re-evaluate likelyBlank from cached metrics whenever the threshold changes,
  // without re-running the canvas pass.
  const evaluated = useMemo(() => {
    const out = {};
    for (const [name, entry] of Object.entries(thumbnailAnalysis)) {
      if (entry && typeof entry.whiteRatio === 'number') {
        out[name] = { ...entry, likelyBlank: evaluateBlank(entry, blankThreshold) };
      } else {
        out[name] = entry;
      }
    }
    return out;
  }, [thumbnailAnalysis, blankThreshold]);

  const suspectedBlankCount = useMemo(
    () => scannerFiles.filter((file) => evaluated[file.name]?.likelyBlank).length,
    [scannerFiles, evaluated]
  );

  const visibleFiles = useMemo(() => {
    if (!onlyBlank) return scannerFiles;
    return scannerFiles.filter((file) => evaluated[file.name]?.likelyBlank);
  }, [scannerFiles, onlyBlank, evaluated]);

  function toggleSelected(file) {
    setSelectedFiles((current) => {
      const next = new Set(current);
      if (next.has(file.name)) next.delete(file.name);
      else next.add(file.name);
      return next;
    });
  }

  function selectAllVisible() {
    setSelectedFiles((current) => {
      const next = new Set(current);
      visibleFiles.forEach((file) => next.add(file.name));
      return next;
    });
  }

  function clearSelection() {
    setSelectedFiles(new Set());
  }

  function removeFilesFromScannerState(names) {
    const deletedSet = new Set(names);
    setScannerFiles((current) => current.filter((file) => !deletedSet.has(file.name)));
    setSelectedFiles((current) => {
      const next = new Set(current);
      names.forEach((name) => next.delete(name));
      return next;
    });
    setThumbnailAnalysis((current) => {
      const next = { ...current };
      names.forEach((name) => { delete next[name]; });
      return next;
    });
    setSelectedScannerFile((current) => deletedSet.has(current?.name) ? null : current);
    setScannerPages((current) => deletedSet.has(selectedScannerFile?.name) ? [] : current);
    if (deletedSet.has(selectedScannerFile?.name)) setBlankAnalysis(null);
  }

  async function deleteWatchFolderFile(fileName) {
    const response = await fetch(`/api/scanner/files/${encodeURIComponent(fileName)}`, { method: 'DELETE' });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || `${t('scannerDeleteFailed')}: ${fileName}`);
    return payload;
  }

  async function runDeleteSelectedFiles() {
    const names = Array.from(selectedFiles);
    if (!names.length) {
      setScannerError(t('scannerNoSelection'));
      return;
    }

    setScannerDeleting(true);
    setScannerError('');
    setScannerNotice('');

    try {
      const deleted = [];
      for (const name of names) {
        await deleteWatchFolderFile(name);
        deleted.push(name);
      }

      removeFilesFromScannerState(deleted);
      setScannerNotice(fillTemplate(t('scannerDeleteDone'), { count: deleted.length }));
    } catch (error) {
      setScannerError(error.message || t('scannerDeleteFailed'));
    } finally {
      setScannerDeleting(false);
    }
  }

  function openDeleteConfirm() {
    if (!selectedFiles.size) {
      setScannerError(t('scannerNoSelection'));
      return;
    }
    setConfirmDeleteOpen(true);
  }

  function confirmDelete() {
    setConfirmDeleteOpen(false);
    runDeleteSelectedFiles();
  }

  function cancelDelete() {
    setConfirmDeleteOpen(false);
  }

  function setQc(file, state) {
    setQcStates((current) => {
      const next = { ...current, [qcKey(file)]: state };
      persistQcStates(next);
      return next;
    });
  }

  function cycleQc(file) {
    const order = ['normal', 'rescan', 'ignore'];
    const current = qcStates[qcKey(file)] || 'normal';
    setQc(file, order[(order.indexOf(current) + 1) % order.length]);
  }

  if (['searchDocs', 'classify', 'ocrReview', 'metadata', 'approvals'].includes(activeNav)) {
    const recordsMode = activeNav === 'classify' || activeNav === 'ocrReview' || activeNav === 'metadata';
    const ocrMode = activeNav === 'ocrReview';
    const reviewerMode = activeNav === 'approvals';
    const visibleMayanDocuments = reviewerMode
      ? mayanDocuments.filter((document) => reviews[String(document.id)]?.status === 'pending')
      : mayanDocuments;
    return (
      <section className="work-panel">
        <form
          className="search-band"
          onSubmit={(event) => {
            event.preventDefault();
            loadMayanDocuments(documentQuery);
          }}
        >
          <Search size={22} aria-hidden="true" />
          <input
            onChange={(event) => setDocumentQuery(event.target.value)}
            placeholder={t('searchPlaceholder')}
            value={documentQuery}
          />
          <button disabled={documentsLoading} type="submit">
            {documentsLoading ? t('documentsLoading') : t('searchDocs')}
          </button>
        </form>
        <div className="metadata-filter-row">
          <span className="chip">{t('metadataFilters')}</span>
          <select
            onChange={(event) => setDocumentTypeFilterId(event.target.value)}
            value={documentTypeFilterId}
          >
            <option value="">{t('scannerDocType')}</option>
            {documentTypes.map((docType) => (
              <option key={docType.id} value={String(docType.id)}>{docType.label}</option>
            ))}
          </select>
          {RECORD_METADATA_FIELDS.map(([name, label]) => (
            <input
              key={name}
              onChange={(event) => setMetadataFilters((current) => ({ ...current, [name]: event.target.value }))}
              placeholder={label}
              type={name === 'avision_document_date' ? 'date' : 'text'}
              value={metadataFilters[name] || ''}
            />
          ))}
        </div>
        {documentsError ? <p className="scanner-error">{documentsError}</p> : null}
        <div className="document-workbench">
          <div className="result-list">
            {documentsLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <div className="result-skeleton" key={index}>
                  <div className="scanner-skeleton scanner-skeleton-block" />
                  <div className="result-skeleton-lines">
                    <div className="scanner-skeleton scanner-skeleton-line wide" />
                    <div className="scanner-skeleton scanner-skeleton-line narrow" />
                  </div>
                </div>
              ))
            ) : visibleMayanDocuments.length ? (
            visibleMayanDocuments.map((document) => (
                <article
                  className={selectedMayanDocument?.id === document.id ? 'result-row active' : 'result-row'}
                  key={document.id}
                >
                  <Archive size={20} aria-hidden="true" />
                  <button className="result-main" onClick={() => loadDocumentPreview(document)} type="button">
                    <strong>{document.label}</strong>
                    <span>
                      {[document.documentType, document.fileName, formatDateTime(document.datetimeCreated)]
                        .filter(Boolean)
                        .join(' / ')}
                    </span>
                    {reviews[String(document.id)] ? (
                      <span className={`review-chip review-${reviews[String(document.id)].status}`}>
                        {t('review' + capitalize(reviews[String(document.id)].status))}
                      </span>
                    ) : reviewerMode ? (
                      <span className="review-chip review-pending">{t('reviewPending')}</span>
                    ) : null}
                  </button>
                  <a className="subtle-action" href={`${MAYAN_URL}/documents/${document.id}/`} target="_blank" rel="noreferrer">
                    {t('openDocument')}
                  </a>
                </article>
              ))
          ) : (
            <div className="scanner-empty">{t('documentsEmpty')}</div>
          )}
          </div>

          <div className="document-preview-panel">
            {selectedMayanDocument ? (
              <>
                <div className="document-preview-head">
                  <div>
                    <p className="eyebrow">{t('previewDocument')}</p>
                    <h3>{selectedMayanDocument.label}</h3>
                  </div>
                  {documentPreview?.file?.id ? (
                    <a
                      className="subtle-action"
                      href={`/api/mayan/documents/${selectedMayanDocument.id}/files/${documentPreview.file.id}/download`}
                    >
                      {t('downloadOriginal')}
                    </a>
                  ) : null}
                </div>
                {documentPreviewLoading ? (
                  <div className="scanner-empty">{t('documentsLoading')}</div>
                ) : documentPreviewError ? (
                  <p className="scanner-error">{documentPreviewError}</p>
                ) : documentPreview?.pages?.length ? (
                  <>
                    <div className="document-page-stage">
                      <img
                        alt={selectedMayanDocument.label}
                        src={documentPreview.pages.find((page) => String(page.id) === selectedPreviewPageId)?.imageUrl || documentPreview.pages[0].imageUrl}
                      />
                    </div>
                    <div className="document-page-strip">
                      <span className="chip">{fillTemplate(t('pagesCount'), { count: documentPreview.pages.length })}</span>
                      {documentPreview.pages.map((page) => (
                        <button
                          className={String(page.id) === selectedPreviewPageId ? 'active' : ''}
                          key={page.id}
                          onClick={() => setSelectedPreviewPageId(String(page.id))}
                          type="button"
                        >
                          {page.pageNumber}
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="scanner-empty">{t('scannerPreviewEmpty')}</div>
                )}
                {recordsMode ? (
                  <div className="record-editor">
                    <label>
                      <span>Label</span>
                      <input
                        onChange={(event) => setRecordForm((current) => ({ ...current, label: event.target.value }))}
                        value={recordForm.label}
                      />
                    </label>
                    <label>
                      <span>{t('scannerDocType')}</span>
                      <select
                        onChange={(event) => setRecordForm((current) => ({ ...current, documentTypeId: event.target.value }))}
                        value={recordForm.documentTypeId}
                      >
                        <option value="">{t('scannerNoDocType')}</option>
                        {documentTypes.map((docType) => (
                          <option key={docType.id} value={String(docType.id)}>{docType.label}</option>
                        ))}
                      </select>
                    </label>
                    <label className="wide">
                      <span>Description</span>
                      <textarea
                        onChange={(event) => setRecordForm((current) => ({ ...current, description: event.target.value }))}
                        value={recordForm.description}
                      />
                    </label>
                    {RECORD_METADATA_FIELDS.map(([name, label]) => (
                      <label key={name}>
                        <span>{label}</span>
                        <input
                          onChange={(event) => setRecordForm((current) => ({
                            ...current,
                            metadata: { ...current.metadata, [name]: event.target.value }
                          }))}
                          type={name === 'avision_document_date' ? 'date' : 'text'}
                          value={recordForm.metadata?.[name] || ''}
                        />
                      </label>
                    ))}
                    {ocrMode ? ocrEditor() : null}
                    <button className="strong-action" disabled={recordSaving} onClick={saveRecordDocument} type="button">
                      {recordSaving ? t('scannerLoading') : t('recordsSave')}
                    </button>
                    <button className="subtle-action" disabled={reviewSaving} onClick={() => submitReview('pending')} type="button">
                      {reviewSaving ? t('scannerLoading') : t('recordsSendReview')}
                    </button>
                    {reviews[String(selectedMayanDocument.id)] ? (
                      <>
                        <span className={`review-chip review-${reviews[String(selectedMayanDocument.id)].status}`}>
                          {t('review' + capitalize(reviews[String(selectedMayanDocument.id)].status))}
                        </span>
                        <span className="note">
                          {t('reviewWorkflowState')}: {reviews[String(selectedMayanDocument.id)].workflow?.state || '-'}
                        </span>
                      </>
                    ) : null}
                    {scannerNotice ? <p className="scanner-success">{scannerNotice}</p> : null}
                  </div>
                ) : null}
                {reviewerMode ? (
                  <div className="record-editor">
                    {ocrEditor()}
                    <label className="wide">
                      <span>{t('reviewerNote')}</span>
                      <textarea onChange={(event) => setReviewNote(event.target.value)} value={reviewNote} />
                    </label>
                    <div className="review-actions">
                      <button className="strong-action" disabled={reviewSaving} onClick={() => submitReview('approved')} type="button">
                        {t('reviewerApprove')}
                      </button>
                      <button className="danger-action" disabled={reviewSaving} onClick={() => submitReview('rejected')} type="button">
                        {t('reviewerReject')}
                      </button>
                    </div>
                    {reviews[String(selectedMayanDocument.id)] ? (
                      <>
                        <span className={`review-chip review-${reviews[String(selectedMayanDocument.id)].status}`}>
                          {t('review' + capitalize(reviews[String(selectedMayanDocument.id)].status))}
                        </span>
                        <p className="note">{t('reviewHistoryHint')}</p>
                        <span className="note">
                          {t('reviewWorkflowState')}: {reviews[String(selectedMayanDocument.id)].workflow?.state || '-'}
                        </span>
                      </>
                    ) : null}
                    {scannerNotice ? <p className="scanner-success">{scannerNotice}</p> : null}
                  </div>
                ) : null}
              </>
            ) : (
              <div className="scanner-empty">{t('scannerPreviewEmpty')}</div>
            )}
          </div>
        </div>
      </section>
    );
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

  if (activeNav === 'system') {
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

  const workflow = workflowContent[activeNav] || workflowContent.scanInbox;
  const thumbnailWidth = scannerThumbnailSizes[thumbnailSize] || scannerThumbnailSizes.small;

  return (
    <section className="work-panel">
      <div className="workflow-header">
        <div>
          <p className="eyebrow">{workflow.step}</p>
          <h2>{workflow.title}</h2>
        </div>
        <span className={`workflow-badge ${roleAccent[session.role]}`}>{t(session.role)}</span>
      </div>

      {scannerMode ? (
        <div className="scanner-live-panel" ref={livePanelRef} tabIndex={-1}>
          <div className="scanner-live-header">
            <div>
              <p className="eyebrow">{t('scannerLiveFolder')}</p>
              <h3>{watchFolder}</h3>
            </div>
            <div className="scanner-live-actions">
              <div
                className="thumbnail-size-control"
                aria-label={t('thumbSizeLabel')}
                title={`${t('thumbSizeLabel')} · ${t('thumb' + capitalize(thumbnailSize))}`}
              >
                {['small', 'medium', 'large'].map((size) => (
                  <button
                    className={thumbnailSize === size ? `active ${size}` : size}
                    key={size}
                    onClick={() => changeThumbnailSize(size)}
                    type="button"
                  >
                    {t('thumb' + capitalize(size))}
                  </button>
                ))}
              </div>
              <button className="subtle-action" onClick={loadScannerFiles} type="button">
                {scannerLoading ? t('scannerLoading') : t('scannerRefresh')}
              </button>
            </div>
          </div>

          <div className="scanner-toolbar">
            <div className="scanner-toolbar-group">
              <button className="subtle-action" onClick={selectAllVisible} type="button">
                {t('scannerSelectAll')}
              </button>
              <button className="subtle-action" onClick={clearSelection} type="button">
                {t('scannerClearSelection')}
              </button>
              <button
                className="danger-action"
                disabled={!selectedFiles.size || scannerDeleting || scannerCreating || importing}
                onClick={openDeleteConfirm}
                ref={deleteBtnRef}
                type="button"
              >
                <Trash2 size={16} aria-hidden="true" />
                {scannerDeleting ? t('scannerLoading') : t('scannerDeleteSelected')}
              </button>
              <span className="chip">
                {fillTemplate(t('scannerSelectedCount'), { count: selectedFiles.size })}
              </span>
              <span className="chip warning">
                {fillTemplate(t('scannerBlankCount'), { count: suspectedBlankCount })}
              </span>
            </div>
            <div className="scanner-toolbar-group">
              <label className="scanner-toggle">
                <input
                  checked={onlyBlank}
                  onChange={(event) => setOnlyBlank(event.target.checked)}
                  type="checkbox"
                />
                {t('scannerFilterBlank')}
              </label>
              <label className="scanner-range" title={t('scannerSensitivityHint')}>
                <span>{t('scannerBlankThreshold')}</span>
                <input
                  max={BLANK_SENSITIVITY_PRESETS.length - 1}
                  min={0}
                  onChange={(event) => changeSensitivity(Number(event.target.value))}
                  type="range"
                  value={sensitivity}
                />
              </label>
            </div>
          </div>

          {scannerError ? <p className="scanner-error">{scannerError}</p> : null}
          {scannerNotice ? <p className="scanner-success">{scannerNotice}</p> : null}
          {scannerBatch ? (
            <p className="scanner-success">
              {fillTemplate(t('scannerBatchCreated'), {
                id: scannerBatch.id,
                count: scannerBatch.files.length
              })}
            </p>
          ) : null}

          {visibleFiles.length ? (
            <p className="scanner-grid-summary">
              {fillTemplate(t('scannerFileCount'), { count: scannerFiles.length })}
              {onlyBlank ? <span className="scanner-grid-filter"> · {t('scannerFilterBlank')}</span> : null}
            </p>
          ) : null}

          <div className="scanner-review-grid">
            <div
              className="scanner-mini-grid"
              style={{ gridTemplateColumns: `repeat(auto-fill, ${thumbnailWidth}px)` }}
            >
              {scannerFiles.length ? (
                visibleFiles.length ? (
                  visibleFiles.map((file) => {
                    const analysis = evaluated[file.name];
                    const imagePreview = file.previewable && file.extension !== 'PDF';
                    const thumbnailStyle = analysis?.width && analysis?.height
                      ? { aspectRatio: `${analysis.width} / ${analysis.height}` }
                      : undefined;
                    const qualityLabel = analysis
                      ? (analysis.likelyBlank ? t('qualityBlank') : t('qualityOk'))
                      : imagePreview ? t('scannerAnalyzing') : file.extension;
                    const qc = qcStates[qcKey(file)] || 'normal';
                    const cardClasses = [
                      'scanner-mini-card',
                      selectedScannerFile?.name === file.name ? 'active' : '',
                      selectedFiles.has(file.name) ? 'selected' : '',
                      analysis?.likelyBlank ? 'blank-suspect' : '',
                      qc !== 'normal' ? `qc-${qc}` : ''
                    ].filter(Boolean).join(' ');

                    return (
                      <div className={cardClasses} key={file.name} style={{ width: `${thumbnailWidth}px` }}>
                        <label className="scanner-mini-check" title={file.name}>
                          <input
                            checked={selectedFiles.has(file.name)}
                            onChange={() => toggleSelected(file)}
                            type="checkbox"
                          />
                        </label>
                        <button
                          className="scanner-mini-media"
                          onClick={() => setSelectedScannerFile(file)}
                          style={thumbnailStyle}
                          title={file.name}
                          type="button"
                        >
                          {imagePreview ? (
                            <>
                              <span
                                className="scanner-mini-page"
                                style={{ backgroundImage: `url("${file.previewUrl}")` }}
                              />
                              <img
                                alt=""
                                className="scanner-analysis-image"
                                src={file.previewUrl}
                                onLoad={(event) => updateThumbnailAnalysis(file, event.currentTarget)}
                              />
                            </>
                          ) : (
                            <div className="scanner-thumb-fallback">
                              <Archive size={26} aria-hidden="true" />
                              <span>{file.extension}</span>
                            </div>
                          )}
                          <span className={analysis?.likelyBlank ? 'mini-status warning' : 'mini-status'}>
                            {qualityLabel}
                          </span>
                        </button>
                        <button
                          aria-label={`${t('qc' + capitalize(qc))} · ${t('scannerQcHint')}`}
                          className={`qc-badge qc-${qc}`}
                          onClick={() => cycleQc(file)}
                          title={t('scannerQcHint')}
                          type="button"
                        >
                          {t('qc' + capitalize(qc))}
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <div className="scanner-empty">{t('scannerFilterEmpty')}</div>
                )
              ) : scannerLoading ? (
                Array.from({ length: 8 }).map((_, index) => (
                  <div className="scanner-skeleton scanner-skeleton-card" key={index} />
                ))
              ) : (
                <div className="scanner-empty">
                  {t('scannerEmpty')}
                  <p className="scanner-empty-hint">{t('dropText')}</p>
                </div>
              )}
            </div>

            <div className="scanner-preview-panel">
              {selectedScannerFile ? (
                <>
                  <div className="scanner-preview-frame">
                    {isMultiPage(selectedScannerFile) ? (
                      scannerPagesLoading ? (
                        <div className="scanner-skeleton-strip">
                          {Array.from({ length: 6 }).map((_, index) => (
                            <div className="scanner-skeleton scanner-skeleton-page" key={index} />
                          ))}
                        </div>
                      ) : scannerPagesError ? (
                        <div className="scanner-empty">{scannerPagesError}</div>
                      ) : scannerPages.length ? (
                        <div className="scanner-page-strip">
                          {scannerPages.map((pg) => {
                            const blank = evaluateBlank(pg.metrics, blankThreshold);
                            const qc = pageQcStates[pageQcKey(selectedScannerFile, pg.page)] || 'normal';
                            return (
                              <button
                                className={`scanner-page-card ${blank ? 'blank-suspect' : ''} ${qc !== 'normal' ? `qc-${qc}` : ''}`}
                                key={pg.page}
                                onClick={() => cyclePageQc(selectedScannerFile, pg.page)}
                                title={`${selectedScannerFile.name} · p${pg.page} · ${t('scannerQcHint')}`}
                                type="button"
                              >
                                <img alt={`${selectedScannerFile.name} p${pg.page}`} loading="lazy" src={pg.thumbnailUrl} />
                                <span className="scanner-page-num">{pg.page}</span>
                                <span className={blank ? 'mini-status warning' : 'mini-status'}>
                                  {blank ? t('qualityBlank') : t('qualityOk')}
                                </span>
                                <span className={`qc-badge qc-${qc}`}>{t('qc' + capitalize(qc))}</span>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="scanner-empty">{t('scannerPreviewEmpty')}</div>
                      )
                    ) : selectedScannerFile.previewable ? (
                      <img
                        alt={selectedScannerFile.name}
                        src={selectedScannerFile.previewUrl}
                        onLoad={(event) => setBlankAnalysis(
                          analyzeImageForBlankPage(event.currentTarget, blankThreshold)
                        )}
                      />
                    ) : (
                      <div className="scanner-preview-fallback">
                        <Archive size={40} aria-hidden="true" />
                        <span>{selectedScannerFile.extension}</span>
                      </div>
                    )}
                  </div>
                  <div className="scanner-quality-card">
                    <strong>{selectedScannerFile.name}</strong>
                    <div className="scanner-qc-row">
                      {['normal', 'rescan', 'ignore'].map((state) => (
                        <button
                          aria-pressed={(qcStates[qcKey(selectedScannerFile)] || 'normal') === state}
                          className={`qc-badge qc-${state} ${(qcStates[qcKey(selectedScannerFile)] || 'normal') === state ? 'active' : ''}`}
                          key={state}
                          onClick={() => setQc(selectedScannerFile, state)}
                          type="button"
                        >
                          {t('qc' + capitalize(state))}
                        </button>
                      ))}
                    </div>
                    {isMultiPage(selectedScannerFile) ? (
                      pageSummary ? (
                        <span>
                          {fillTemplate(t('scannerPagesSummary'), {
                            count: pageSummary.count,
                            blank: pageSummary.blank,
                            rescan: pageSummary.rescan
                          })}
                        </span>
                      ) : null
                    ) : selectedScannerFile.previewable ? (
                      blankAnalysis ? (
                        <span className={evaluateBlank(blankAnalysis, blankThreshold) ? 'quality-warning' : 'quality-ok'}>
                          {evaluateBlank(blankAnalysis, blankThreshold) ? t('scannerBlankWarn') : t('scannerBlankOk')}
                          {' '}{t('scannerWhiteRatio')} {(blankAnalysis.whiteRatio * 100).toFixed(1)}%，{t('scannerInkRatio')} {(blankAnalysis.inkRatio * 100).toFixed(1)}%。
                        </span>
                      ) : (
                        <span>{t('scannerAnalyzingImage')}</span>
                      )
                    ) : (
                      <span>{t('scannerPdfPreviewHint')}</span>
                    )}
                    <span className="scanner-file-meta">
                      {formatBytes(selectedScannerFile.size)} · {formatDateTime(selectedScannerFile.modifiedAt)}
                    </span>
                  </div>
                </>
              ) : (
                <div className="scanner-preview-empty">{t('scannerPreviewEmpty')}</div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <div className="action-row">
        {scannerMode && !DEMO_LOGIN ? (
          <>
            <label className="scanner-doctype">
              <span>{t('scannerDocType')}</span>
              <select
                disabled={importing || scannerCreating || documentTypesLoading || !documentTypes.length}
                onChange={(event) => setSelectedDocumentTypeId(event.target.value)}
                value={selectedDocumentTypeId}
              >
                {documentTypesLoading
                  ? <option value="">{t('scannerDocTypesLoading')}</option>
                  : documentTypes.length
                  ? documentTypes.map((docType) => (
                    <option key={docType.id} value={String(docType.id)}>{docType.label}</option>
                  ))
                  : <option value="">{t('scannerNoDocType')}</option>}
              </select>
              {documentTypesError ? <em>{documentTypesError}</em> : null}
            </label>
            <label className="scanner-import-option" title={t('scannerDeleteAfterImportHint')}>
              <input
                checked={deleteAfterImport}
                disabled={importing || scannerCreating}
                onChange={(event) => setDeleteAfterImport(event.target.checked)}
                type="checkbox"
              />
              <span>{t('scannerDeleteAfterImport')}</span>
            </label>
          </>
        ) : null}
        <button
          className="strong-action"
          disabled={scannerMode && (!selectedFiles.size || scannerCreating || importing)}
          onClick={scannerMode ? createScannerBatch : undefined}
          type="button"
        >
          <CheckCircle2 size={18} aria-hidden="true" />
          {scannerCreating
            ? t('scannerCreating')
            : (scannerMode
              ? (DEMO_LOGIN
                ? fillTemplate(t('scannerSubmitSelected'), { count: selectedFiles.size })
                : (importing ? t('scannerImporting') : t('scannerImportToMayan')))
              : workflow.primary)}
        </button>
      </div>

      {scannerMode && Object.keys(importProgress).length ? (
        <div className="scanner-import-panel">
          <div className="scanner-import-head">
            <strong>{t('scannerImportResult')}</strong>
            {importing ? <span className="chip">{t('scannerImporting')}</span> : null}
          </div>
          <ul className="scanner-import-list">
            {Object.entries(importProgress).map(([name, info]) => (
              <li className={`import-row import-${info.status}`} key={name}>
                <span className="import-name">{name}</span>
                {info.status === 'imported' && info.mayanDocumentId ? (
                  <a
                    className="import-link"
                    href={`${MAYAN_URL}/documents/${info.mayanDocumentId}/`}
                    rel="noreferrer"
                    target="_blank"
                  >
                    #{info.mayanDocumentId}
                  </a>
                ) : null}
                <span className={`import-status status-${info.status}`}>{t('import_' + info.status)}</span>
                {info.deletedOriginal ? <span className="import-note">{t('scannerOriginalDeleted')}</span> : null}
                {info.deleteError ? <span className="import-error">{info.deleteError}</span> : null}
                {info.status === 'failed' ? (
                  <>
                    <span className="import-error">{info.error}</span>
                    <button
                      className="subtle-action"
                      disabled={importing}
                      onClick={() => retryImportFile(name)}
                      type="button"
                    >
                      {t('scannerRetry')}
                    </button>
                  </>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <Modal
        descId="delete-desc"
        fallbackFocusRef={livePanelRef}
        onClose={cancelDelete}
        open={confirmDeleteOpen}
        titleId="delete-title"
        triggerRef={deleteBtnRef}
      >
        <h3 id="delete-title">{t('scannerDeleteTitle')}</h3>
        <p id="delete-desc">{fillTemplate(t('scannerDeleteConfirm'), { count: selectedFiles.size })}</p>
        {/* Cancel is first in DOM order so the Modal focuses it on open —
            keep it ahead of the destructive action. */}
        <div className="modal-actions">
          <button className="subtle-action" onClick={cancelDelete} type="button">
            {t('scannerCancel')}
          </button>
          <button
            className="danger-action"
            disabled={scannerDeleting}
            onClick={confirmDelete}
            type="button"
          >
            {scannerDeleting ? t('scannerLoading') : t('scannerDeleteConfirmAction')}
          </button>
        </div>
      </Modal>
    </section>
  );
}

function QueuePanel({ tasks, onNav, t }) {
  if (!tasks.length) return null;
  return (
    <section className="queue-panel">
      <div className="panel-heading">
        <LayoutDashboard size={20} aria-hidden="true" />
        <h2>{t('queue')}</h2>
      </div>
      <p className="queue-helper">{t('nextAction')}</p>
      <div className="task-list">
        {tasks.map((task) => (
          <button
            className="task-row"
            key={`${task.action}-${task.labelKey}`}
            onClick={() => onNav(task.action)}
            type="button"
          >
            <div className="task-main">
              <strong>{fillTemplate(t(task.labelKey), { count: task.count })}</strong>
            </div>
            <div className={`status ${task.status}`}>{t(task.status)}</div>
          </button>
        ))}
      </div>
    </section>
  );
}

createRoot(document.getElementById('root')).render(<App />);
