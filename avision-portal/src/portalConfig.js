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
