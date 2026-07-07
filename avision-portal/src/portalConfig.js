export const demoUsers = [
  { username: 'scanner', password: 'avision123', role: 'scanner', name: 'Scan Station 01' },
  { username: 'records', password: 'avision123', role: 'classifier', name: 'Records Desk' },
  { username: 'reviewer', password: 'avision123', role: 'reviewer', name: 'Team Lead' },
  { username: 'viewer', password: 'avision123', role: 'viewer', name: 'Document User' },
  { username: 'admin', password: 'avision123', role: 'admin', name: 'System Admin' }
];

export const roleAccent = {
  scanner: 'teal',
  classifier: 'blue',
  reviewer: 'amber',
  viewer: 'slate',
  admin: 'violet'
};

export const roleNav = {
  scanner: ['scanInbox', 'batchCheck'],
  classifier: ['classify', 'metadata', 'searchDocs'],
  reviewer: ['approvals', 'searchDocs'],
  viewer: ['searchDocs'],
  admin: ['userAdmin', 'system', 'searchDocs']
};

export const tasks = {
  scanner: [
    { id: 'S-1028', label: 'Vendor invoices batch', status: 'ready', due: '10:30', action: 'batchCheck' },
    { id: 'S-1029', label: 'HR onboarding files', status: 'waiting', due: '11:00', action: 'scanInbox' },
    { id: 'S-1030', label: 'Rescan low contrast pages', status: 'rejected', due: '14:00', action: 'scanInbox' }
  ],
  classifier: [
    { id: 'C-2214', label: 'Assign document type', status: 'waiting', due: 'Today', action: 'classify' },
    { id: 'C-2215', label: 'Fill customer metadata', status: 'saved', due: 'Today', action: 'metadata' },
    { id: 'C-2216', label: 'Add project tags', status: 'ready', due: 'Tomorrow', action: 'metadata' }
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
    { id: 'A-5501', label: 'Create scanner role policy', status: 'waiting', due: 'Today', action: 'userAdmin' },
    { id: 'A-5502', label: 'Check Mayan tunnel status', status: 'ready', due: 'Now', action: 'system' },
    { id: 'A-5503', label: 'Audit inactive users', status: 'saved', due: 'Friday', action: 'userAdmin' }
  ]
};

export const panels = {
  scanner: {
    intro: 'scannerIntro',
    stats: [
      ['activeQueue', '18'],
      ['completedToday', '42'],
      ['alerts', '3']
    ]
  },
  classifier: {
    intro: 'classifierIntro',
    stats: [
      ['activeQueue', '27'],
      ['completedToday', '16'],
      ['alerts', '2']
    ]
  },
  reviewer: {
    intro: 'reviewerIntro',
    stats: [
      ['activeQueue', '8'],
      ['completedToday', '11'],
      ['alerts', '1']
    ]
  },
  viewer: {
    intro: 'viewerIntro',
    stats: [
      ['activeQueue', '2'],
      ['completedToday', '9'],
      ['alerts', '0']
    ]
  },
  admin: {
    intro: 'adminIntro',
    stats: [
      ['activeQueue', '6'],
      ['completedToday', '5'],
      ['alerts', '4']
    ]
  }
};

export const workflowContent = {
  scanInbox: {
    step: '1 / 3',
    title: '掃描批次匯入',
    primary: '建立匯入批次'
  },
  batchCheck: {
    step: '2 / 3',
    title: '批次品質檢查',
    primary: '送出給分類'
  }
};
