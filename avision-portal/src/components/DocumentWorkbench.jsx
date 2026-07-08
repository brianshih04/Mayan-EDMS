import { useEffect, useState } from 'react';
import { Archive, Search } from 'lucide-react';
import { RECORD_METADATA_FIELDS, authHeaders } from '../lib/constants.js';
import { capitalize, fillTemplate, formatDateTime } from '../lib/utils.js';

function AuthenticatedImage({ alt, className = '', session, src }) {
  const [objectUrl, setObjectUrl] = useState('');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!src || !session?.token) {
      setObjectUrl('');
      setFailed(false);
      return undefined;
    }

    let cancelled = false;
    let nextObjectUrl = '';
    setFailed(false);
    setObjectUrl('');

    (async () => {
      try {
        const response = await fetch(src, { headers: authHeaders(session) });
        if (!response.ok) throw new Error('Image request failed.');
        const blob = await response.blob();
        if (cancelled) return;
        nextObjectUrl = URL.createObjectURL(blob);
        setObjectUrl(nextObjectUrl);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      if (nextObjectUrl) URL.revokeObjectURL(nextObjectUrl);
    };
  }, [src, session?.token]);

  if (failed) return <div className="scanner-empty">{alt}</div>;
  if (!objectUrl) return <div className="scanner-empty" aria-label={alt} />;
  return <img alt={alt} className={className} src={objectUrl} />;
}

function DocumentWorkbench({ activeNav, t, vm, documentTypes, session, scannerNotice, documentsError }) {
  const {
    documentTypeFilterId, setDocumentTypeFilterId,
    documentQuery, setDocumentQuery,
    mayanDocuments, documentsLoading,
    selectedMayanDocument, documentPreview, documentPreviewLoading, documentPreviewError,
    selectedPreviewPageId, setSelectedPreviewPageId,
    recordForm, setRecordForm,
    ocrPages, ocrLoading, ocrError, ocrSaving,
    setOcrPageContent, saveOcrStatus, saveOcrEdits,
    recordSaving, reviews, reviewNote, setReviewNote, reviewSaving,
    metadataFilters, setMetadataFilters,
    loadMayanDocuments, loadDocumentPreview, saveRecordDocument, submitReview
  } = vm;

  const recordsMode = activeNav === 'classify' || activeNav === 'ocrReview' || activeNav === 'metadata';
  const ocrMode = activeNav === 'ocrReview';
  const reviewerMode = activeNav === 'approvals';
  const ocrStatus = recordForm.metadata?.avision_ocr_status || '';
  const ocrReadyForReview = ocrStatus === 'confirmed' || ocrStatus === 'not_needed';
  const visibleMayanDocuments = reviewerMode
    ? mayanDocuments.filter((document) => reviews[String(document.id)]?.status === 'pending')
    : mayanDocuments;

  async function downloadAuthorizedFile(url, fileName) {
    const response = await fetch(url, { headers: authHeaders(session) });
    if (!response.ok) {
      const payload = response.headers.get('content-type')?.includes('application/json')
        ? await response.json().catch(() => ({}))
        : {};
      throw new Error(payload?.error || t('documentsLoadError'));
    }
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = fileName || selectedMayanDocument?.label || 'document';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
  }

  function ocrEditor() {
    const anyDirty = ocrPages.some((page) => page.dirty);
    const status = recordForm.metadata?.avision_ocr_status || '';
    const chipClass = status === 'confirmed' ? 'review-approved'
      : status === 'not_needed' ? 'review-not-needed'
      : 'review-pending';
    const statusLabel = status === 'confirmed' ? t('ocrStatusConfirmed')
      : status === 'not_needed' ? t('ocrStatusNotNeeded')
      : t('ocrStatusNeedsReview');
    const canConfirm = ocrPages.length > 0 && !anyDirty;
    return (
      <div aria-busy={ocrLoading || ocrSaving} className="ocr-editor wide">
        <div className="ocr-status-row">
          <span className="ocr-editor-label">{t('ocrText')}</span>
          <span className={`review-chip ${chipClass}`}>
            {statusLabel}
          </span>
          {ocrPages.length ? (
            <span className="chip">{fillTemplate(t('ocrPageCount'), { count: ocrPages.length })}</span>
          ) : null}
        </div>
        {!ocrLoading && !ocrError ? (
          <div className="ocr-status-actions">
            <button
              className="strong-action"
              disabled={ocrSaving || !canConfirm || status === 'confirmed'}
              onClick={() => saveOcrStatus('confirmed')}
              type="button"
            >
              {t('ocrMarkConfirmed')}
            </button>
            <button
              className="subtle-action"
              disabled={ocrSaving || status === 'not_needed'}
              onClick={() => saveOcrStatus('not_needed')}
              type="button"
            >
              {t('ocrMarkNotNeeded')}
            </button>
          </div>
        ) : null}
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
                <button className="subtle-action" onClick={() => loadDocumentPreview(document)} type="button">
                  {t('openDocument')}
                </button>
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
                  <button
                    className="subtle-action"
                    onClick={() => downloadAuthorizedFile(
                      `/api/mayan/documents/${selectedMayanDocument.id}/files/${documentPreview.file.id}/download`,
                      documentPreview.file.filename || selectedMayanDocument.label
                    )}
                    type="button"
                  >
                    {t('downloadOriginal')}
                  </button>
                ) : null}
              </div>
              {documentPreviewLoading ? (
                <div className="scanner-empty">{t('documentsLoading')}</div>
              ) : documentPreviewError ? (
                <p className="scanner-error">{documentPreviewError}</p>
              ) : documentPreview?.pages?.length ? (
                <>
                  <div className="document-page-stage">
                    <AuthenticatedImage
                      alt={selectedMayanDocument.label}
                      session={session}
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
                  <button className="subtle-action" disabled={reviewSaving || !ocrReadyForReview} onClick={() => submitReview('pending')} type="button">
                    {reviewSaving ? t('scannerLoading') : t('recordsSendReview')}
                  </button>
                  {!ocrReadyForReview ? (
                    <p className="note">{t('ocrConfirmBeforeReview')}</p>
                  ) : null}
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

export default DocumentWorkbench;
