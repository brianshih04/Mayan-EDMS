import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Archive,
  CheckCircle2,
  Trash2
} from 'lucide-react';
import { MAYAN_URL, DEMO_LOGIN, authHeaders } from '../lib/constants.js';
import { capitalize, fillTemplate, formatBytes, formatDateTime } from '../lib/utils.js';
import {
  scannerThumbnailSizes,
  BLANK_SENSITIVITY_PRESETS,
  DEFAULT_BLANK_THRESHOLD,
  evaluateBlank,
  analyzeImageForBlankPage,
  qcKey,
  pageQcKey,
  isMultiPage,
  loadQcStates,
  persistQcStates,
  loadPageQcStates,
  persistPageQcStates
} from '../lib/scanner.js';
import { roleAccent, workflowContent } from '../portalConfig.js';
import Modal from './Modal.jsx';
import AdminPanel from './AdminPanel.jsx';
import DocumentWorkbench from './DocumentWorkbench.jsx';
import { useAdminState } from '../hooks/useAdminState.js';
import { useDocumentState } from '../hooks/useDocumentState.js';

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
  const [deleteAfterImport, setDeleteAfterImport] = useState(false);
  const [importProgress, setImportProgress] = useState({});
  const [importing, setImporting] = useState(false);
  const [documentsError, setDocumentsError] = useState('');
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

  // Fetch document types for scanner import, operator/reviewer filters, and admin management.
  useEffect(() => {
    if (!(
      scannerMode ||
      activeNav === 'userAdmin' ||
      activeNav === 'searchDocs' ||
      activeNav === 'classify' ||
      activeNav === 'ocrReview' ||
      activeNav === 'metadata' ||
      activeNav === 'approvals'
    ) || DEMO_LOGIN) return;
    let cancelled = false;
    (async () => {
      await loadDocumentTypes();
      if (cancelled) return;
    })();
    return () => { cancelled = true; };
  }, [scannerMode, activeNav, session?.token, t]);

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

  const admin = useAdminState({
    activeNav, session, t,
    setScannerNotice, setDocumentsError,
    changeThumbnailSize, changeSensitivity,
    setDocumentTypesError, setSelectedDocumentTypeId, loadDocumentTypes
  });

  const doc = useDocumentState({
    activeNav, session, t,
    setScannerNotice, setDocumentsError
  });

  if (['searchDocs', 'classify', 'ocrReview', 'metadata', 'approvals'].includes(activeNav)) {
    return (
      <DocumentWorkbench
        activeNav={activeNav}
        t={t}
        vm={doc}
        documentTypes={documentTypes}
        session={session}
        scannerNotice={scannerNotice}
        documentsError={documentsError}
      />
    );
  }

  if (activeNav === 'userAdmin' || activeNav === 'system') {
    return (
      <AdminPanel
        activeNav={activeNav}
        t={t}
        vm={admin}
        documentTypes={documentTypes}
        documentTypesLoading={documentTypesLoading}
        documentTypesError={documentTypesError}
        scannerNotice={scannerNotice}
        documentsError={documentsError}
      />
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
                    href={`${MAYAN_URL}/documents/${info.mayanDocumentId}/preview/`}
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


export default PrimaryWorkArea;
