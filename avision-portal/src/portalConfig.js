export const demoUsers = [
  { username: 'scanner', password: 'avision123', role: 'operator', name: 'Scan Station 01' },
  { username: 'records', password: 'avision123', role: 'operator', name: 'Records Desk' },
  { username: 'reviewer', password: 'avision123', role: 'reviewer', name: 'Team Lead' },
  { username: 'viewer', password: 'avision123', role: 'viewer', name: 'Document User' },
  { username: 'admin', password: 'avision123', role: 'admin', name: 'System Admin' }
];

export const roleAccent = {
  operator: 'teal',
  reviewer: 'amber',
  viewer: 'slate',
  admin: 'violet'
};

export const roleNav = {
  operator: ['scanInbox', 'classify', 'ocrReview', 'metadata', 'searchDocs'],
  reviewer: ['approvals', 'searchDocs'],
  viewer: ['searchDocs'],
  admin: ['userAdmin', 'system', 'searchDocs']
};

// Sample task lines shown only on the login role-preview card (a "what does
// this role look like" hint). The live dashboard queue comes from
// /api/workbench/summary, not from here.
export const tasks = {
  operator: [
    { id: 'O-1001', label: 'Scan and QC incoming pages', status: 'ready', due: 'Now', action: 'scanInbox' },
    { id: 'O-1002', label: 'Confirm document type and OCR text', status: 'waiting', due: 'Today', action: 'ocrReview' },
    { id: 'O-1003', label: 'Complete metadata before review', status: 'saved', due: 'Today', action: 'metadata' }
  ],
  reviewer: [
    { id: 'R-3301', label: 'Approve contract archive', status: 'waiting', due: 'Today', action: 'approvals' },
    { id: 'R-3302', label: 'Reject duplicate scan', status: 'ready', due: 'Today', action: 'approvals' },
    { id: 'R-3303', label: 'Review restricted file access', status: 'waiting', due: 'Friday', action: 'approvals' }
  ],
  viewer: [
    { id: 'V-4401', label: 'Search purchase order', status: 'ready', due: 'Now', action: 'searchDocs' },
    { id: 'V-4402', label: 'Download signed PDF', status: 'approved', due: 'Today', action: 'searchDocs' }
  ],
  admin: [
    { id: 'A-5501', label: 'Create operator role policy', status: 'waiting', due: 'Today', action: 'userAdmin' },
    { id: 'A-5502', label: 'Check Mayan tunnel status', status: 'ready', due: 'Now', action: 'system' },
    { id: 'A-5503', label: 'Audit inactive users', status: 'saved', due: 'Friday', action: 'userAdmin' }
  ]
};

export const panels = {
  operator: { intro: 'operatorIntro' },
  reviewer: { intro: 'reviewerIntro' },
  viewer: { intro: 'viewerIntro' },
  admin: { intro: 'adminIntro' }
};

export const workflowContent = {
  scanInbox: {
    step: '1 / 5',
    title: '掃描批次匯入',
    primary: '建立匯入批次'
  },
  batchCheck: {
    step: '2 / 5',
    title: '批次品質檢查',
    primary: '送出給分類'
  },
  classify: {
    step: '2 / 5',
    title: '文件分類',
    primary: '儲存分類'
  },
  ocrReview: {
    step: '3 / 5',
    title: 'OCR 檢查與校正',
    primary: '確認 OCR'
  },
  metadata: {
    step: '4 / 5',
    title: 'Metadata 補齊',
    primary: '儲存並送審'
  },
  searchDocs: {
    step: '5 / 5',
    title: '文件查詢',
    primary: '搜尋文件'
  }
};
