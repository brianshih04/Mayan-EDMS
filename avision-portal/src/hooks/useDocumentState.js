import { useEffect, useState } from 'react';
import { DEMO_LOGIN, authHeaders } from '../lib/constants.js';

// Document-workbench domain: search, preview, metadata, OCR, review. Shared
// toast setters are passed in from the orchestrator.
export function useDocumentState({ activeNav, session, t, setScannerNotice, setDocumentsError }) {
  const [documentTypeFilterId, setDocumentTypeFilterId] = useState('');
  const [documentQuery, setDocumentQuery] = useState('');
  const [mayanDocuments, setMayanDocuments] = useState([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
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
      if (['classify', 'metadata', 'ocrReview', 'approvals'].includes(activeNav)) {
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

  async function saveOcrStatus(status) {
    if (!selectedMayanDocument) return;
    setOcrSaving(true);
    setOcrError('');
    setScannerNotice('');
    try {
      const response = await fetch(`/api/mayan/documents/${selectedMayanDocument.id}`, {
        method: 'PATCH',
        headers: authHeaders(session, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          metadata: { ...recordForm.metadata, avision_ocr_status: status },
          metadataDocumentTypeId: recordForm.documentTypeId || selectedMayanDocument.documentTypeId
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || t('ocrLoadError'));
      setRecordForm((current) => ({ ...current, metadata: { ...current.metadata, avision_ocr_status: status } }));
      setScannerNotice(t('ocrSavedAll'));
    } catch (error) {
      setOcrError(error.message || t('ocrLoadError'));
    } finally {
      setOcrSaving(false);
    }
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

  return {
    documentTypeFilterId, setDocumentTypeFilterId,
    documentQuery, setDocumentQuery,
    mayanDocuments, documentsLoading,
    selectedMayanDocument, documentPreview, documentPreviewLoading, documentPreviewError,
    selectedPreviewPageId, setSelectedPreviewPageId,
    recordForm, setRecordForm,
    ocrPages, ocrVersionId, ocrLoading, ocrError, ocrSaving,
    setOcrPageContent, saveOcrStatus, saveOcrEdits,
    recordSaving, reviews, reviewNote, setReviewNote, reviewSaving,
    metadataFilters, setMetadataFilters,
    loadMayanDocuments, loadDocumentPreview, saveRecordDocument, submitReview
  };
}
