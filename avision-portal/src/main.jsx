import React, { useEffect, useMemo, useState } from 'react';
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
  UploadCloud,
  UserRound,
  UsersRound
} from 'lucide-react';
import './styles.css';

const MAYAN_URL = 'https://mayan-emds.avision-gb10.org';
// When true, login uses the in-page demo users (offline fallback). When false
// (the default, including production), login authenticates against Mayan.
const DEMO_LOGIN = import.meta.env.VITE_DEMO_LOGIN === '1';

function authHeaders(session, extra = {}) {
  const headers = { ...extra };
  if (session?.token) headers.Authorization = `Token ${session.token}`;
  return headers;
}

const locales = {
  'zh-TW': {
    appName: 'Avision 文件入口',
    appSubtitle: '依角色簡化 Mayan-EDMS 工作流程',
    language: '語言',
    signIn: '登入',
    loginTitle: '工作入口登入',
    signOut: '登出',
    username: '使用者',
    password: '密碼',
    demoHint: '請使用帳號密碼登入，系統會依照帳號角色進入對應畫面。',
    demoPassword: '測試密碼皆為 avision123',
    loginError: '帳號或密碼不正確',
    openMayan: '開啟 Mayan 後台',
    connected: 'Mayan 已連線',
    watchFolder: 'Watch folder',
    activeQueue: '待處理',
    completedToday: '今日完成',
    alerts: '提醒',
    scanner: '掃描人員',
    classifier: '分類人員',
    reviewer: '審核主管',
    viewer: '查閱使用者',
    admin: '系統管理員',
    scanInbox: '掃描匯入',
    batchCheck: '批次檢查',
    classify: '文件分類',
    metadata: '資料欄位',
    approvals: '審核清單',
    searchDocs: '文件搜尋',
    userAdmin: '使用者與角色',
    system: '系統設定',
    dropTitle: '新增掃描批次',
    dropText: '將掃描完成的 PDF 放進 E:\\watch_folder，或由掃描軟體直接輸出到該資料夾。',
    primaryAction: '建立匯入批次',
    secondaryAction: '查看資料夾',
    searchPlaceholder: '搜尋文件、客戶、案件號或標籤',
    role: '角色',
    queue: '工作清單',
    task: '任務',
    owner: '負責人',
    status: '狀態',
    due: '期限',
    nextAction: '下一步',
    sampleUsers: '可測試帳號',
    loginAs: '登入工作入口',
    dashboard: '工作台',
    operations: '作業',
    review: '審核',
    records: '文件',
    administration: '管理',
    scannerIntro: '只保留掃描、檢查、送出三個步驟。',
    classifierIntro: '聚焦文件類型、客戶、案件號與標籤。',
    reviewerIntro: '只呈現需要決策的文件與審核紀錄。',
    viewerIntro: '提供乾淨的搜尋、預覽與下載入口。',
    adminIntro: '管理角色、同步狀態，必要時才進入 Mayan 原生後台。',
    saved: '已暫存',
    waiting: '等待中',
    ready: '可送出',
    rejected: '需重掃',
    approved: '已核准',
    roleHelp: '每個角色只看需要的操作，降低 Mayan 原生設定頁面的干擾。'
  },
  en: {
    appName: 'Avision Document Portal',
    appSubtitle: 'Role-based workflows on top of Mayan-EDMS',
    language: 'Language',
    signIn: 'Sign in',
    loginTitle: 'Workspace sign in',
    signOut: 'Sign out',
    username: 'User',
    password: 'Password',
    demoHint: 'Sign in with a username and password. The portal opens the UI assigned to that user role.',
    demoPassword: 'Demo password: avision123',
    loginError: 'Incorrect username or password',
    openMayan: 'Open Mayan Admin',
    connected: 'Mayan connected',
    watchFolder: 'Watch folder',
    activeQueue: 'Open items',
    completedToday: 'Done today',
    alerts: 'Alerts',
    scanner: 'Scanner operator',
    classifier: 'Records clerk',
    reviewer: 'Reviewer',
    viewer: 'Document user',
    admin: 'System admin',
    scanInbox: 'Scan intake',
    batchCheck: 'Batch check',
    classify: 'Classify',
    metadata: 'Metadata',
    approvals: 'Approvals',
    searchDocs: 'Document search',
    userAdmin: 'Users and roles',
    system: 'System',
    dropTitle: 'New scan batch',
    dropText: 'Place scanned PDFs in E:\\watch_folder, or configure scanner software to output there.',
    primaryAction: 'Create intake batch',
    secondaryAction: 'View folder',
    searchPlaceholder: 'Search documents, customers, case IDs, or tags',
    role: 'Role',
    queue: 'Queue',
    task: 'Task',
    owner: 'Owner',
    status: 'Status',
    due: 'Due',
    nextAction: 'Next action',
    sampleUsers: 'Demo accounts',
    loginAs: 'Sign in',
    dashboard: 'Dashboard',
    operations: 'Operations',
    review: 'Review',
    records: 'Records',
    administration: 'Administration',
    scannerIntro: 'Keeps the scan workflow to scan, inspect, submit.',
    classifierIntro: 'Focuses on document type, customer, case ID, and tags.',
    reviewerIntro: 'Shows only decisions and review history.',
    viewerIntro: 'Clean search, preview, and download access.',
    adminIntro: 'Manage roles and sync status; open Mayan only when needed.',
    saved: 'Saved',
    waiting: 'Waiting',
    ready: 'Ready',
    rejected: 'Rescan',
    approved: 'Approved',
    roleHelp: 'Each role sees only the actions they need, reducing Mayan configuration noise.'
  },
  ja: {
    appName: 'Avision 文書ポータル',
    appSubtitle: 'Mayan-EDMS を役割別に簡略化',
    language: '言語',
    signIn: 'ログイン',
    loginTitle: 'ワークスペースログイン',
    signOut: 'ログアウト',
    username: 'ユーザー',
    password: 'パスワード',
    demoHint: 'ユーザー名とパスワードでログインすると、役割に応じた画面を表示します。',
    demoPassword: 'デモパスワード: avision123',
    loginError: 'ユーザー名またはパスワードが正しくありません',
    openMayan: 'Mayan 管理画面',
    connected: 'Mayan 接続済み',
    watchFolder: 'Watch folder',
    activeQueue: '処理待ち',
    completedToday: '本日完了',
    alerts: '通知',
    scanner: 'スキャン担当',
    classifier: '分類担当',
    reviewer: '承認者',
    viewer: '閲覧ユーザー',
    admin: '管理者',
    scanInbox: 'スキャン取込',
    batchCheck: 'バッチ確認',
    classify: '分類',
    metadata: 'メタデータ',
    approvals: '承認一覧',
    searchDocs: '文書検索',
    userAdmin: 'ユーザーと役割',
    system: 'システム',
    dropTitle: '新規スキャンバッチ',
    dropText: 'スキャン済み PDF を E:\\watch_folder に保存します。',
    primaryAction: '取込バッチ作成',
    secondaryAction: 'フォルダー表示',
    searchPlaceholder: '文書、顧客、案件番号、タグを検索',
    role: '役割',
    queue: '作業一覧',
    task: 'タスク',
    owner: '担当',
    status: '状態',
    due: '期限',
    nextAction: '次の操作',
    sampleUsers: 'デモアカウント',
    loginAs: 'ログイン',
    dashboard: 'ダッシュボード',
    operations: '操作',
    review: '承認',
    records: '文書',
    administration: '管理',
    scannerIntro: 'スキャン、確認、送信のみに絞ります。',
    classifierIntro: '文書種別、顧客、案件番号、タグに集中します。',
    reviewerIntro: '判断が必要な文書だけを表示します。',
    viewerIntro: '検索、プレビュー、ダウンロードを簡潔にします。',
    adminIntro: '役割と同期状態を管理し、必要時のみ Mayan を開きます。',
    saved: '保存済み',
    waiting: '待機中',
    ready: '送信可',
    rejected: '再スキャン',
    approved: '承認済み',
    roleHelp: '役割ごとに必要な操作だけを表示し、Mayan の複雑さを隠します。'
  },
  'zh-CN': {
    appName: 'Avision 文档入口',
    appSubtitle: '基于 Mayan-EDMS 的角色化工作流',
    language: '语言',
    signIn: '登录',
    loginTitle: '工作入口登录',
    signOut: '登出',
    username: '用户',
    password: '密码',
    demoHint: '请使用账号密码登录，系统会依照账号角色进入对应画面。',
    demoPassword: '测试密码均为 avision123',
    loginError: '账号或密码不正确',
    openMayan: '打开 Mayan 后台',
    connected: 'Mayan 已连接',
    watchFolder: 'Watch folder',
    activeQueue: '待处理',
    completedToday: '今日完成',
    alerts: '提醒',
    scanner: '扫描人员',
    classifier: '分类人员',
    reviewer: '审核主管',
    viewer: '查阅用户',
    admin: '系统管理员',
    scanInbox: '扫描导入',
    batchCheck: '批次检查',
    classify: '文档分类',
    metadata: '资料字段',
    approvals: '审核清单',
    searchDocs: '文档搜索',
    userAdmin: '用户与角色',
    system: '系统设置',
    dropTitle: '新增扫描批次',
    dropText: '将扫描完成的 PDF 放入 E:\\watch_folder，或让扫描软件直接输出到该文件夹。',
    primaryAction: '建立导入批次',
    secondaryAction: '查看文件夹',
    searchPlaceholder: '搜索文档、客户、案件号或标签',
    role: '角色',
    queue: '工作清单',
    task: '任务',
    owner: '负责人',
    status: '状态',
    due: '期限',
    nextAction: '下一步',
    sampleUsers: '可测试账号',
    loginAs: '登录工作入口',
    dashboard: '工作台',
    operations: '作业',
    review: '审核',
    records: '文档',
    administration: '管理',
    scannerIntro: '只保留扫描、检查、送出三个步骤。',
    classifierIntro: '聚焦文档类型、客户、案件号与标签。',
    reviewerIntro: '只显示需要决策的文档与审核记录。',
    viewerIntro: '提供简洁的搜索、预览与下载入口。',
    adminIntro: '管理角色、同步状态，必要时才进入 Mayan 原生后台。',
    saved: '已暂存',
    waiting: '等待中',
    ready: '可送出',
    rejected: '需重扫',
    approved: '已核准',
    roleHelp: '每个角色只看需要的操作，降低 Mayan 原生设置页的干扰。'
  }
};

const demoUsers = [
  { username: 'scanner', password: 'avision123', role: 'scanner', name: 'Scan Station 01' },
  { username: 'records', password: 'avision123', role: 'classifier', name: 'Records Desk' },
  { username: 'reviewer', password: 'avision123', role: 'reviewer', name: 'Team Lead' },
  { username: 'viewer', password: 'avision123', role: 'viewer', name: 'Document User' },
  { username: 'admin', password: 'avision123', role: 'admin', name: 'System Admin' }
];

const roleAccent = {
  scanner: 'teal',
  classifier: 'blue',
  reviewer: 'amber',
  viewer: 'slate',
  admin: 'violet'
};

const roleNav = {
  scanner: ['scanInbox', 'batchCheck'],
  classifier: ['classify', 'metadata', 'searchDocs'],
  reviewer: ['approvals', 'searchDocs'],
  viewer: ['searchDocs'],
  admin: ['userAdmin', 'system', 'searchDocs']
};

const tasks = {
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

const panels = {
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

const workflowContent = {
  scanInbox: {
    step: '1 / 3',
    title: '掃描批次匯入',
    description: '確認掃描軟體輸出到 E:\\watch_folder，建立批次後送入 Mayan watch folder。',
    checklist: ['掃描解析度 300 DPI', '輸出格式 PDF 或 TIFF', '檔名包含日期與批次號', '確認沒有空白頁'],
    fields: [
      ['批次名稱', '2026-07-05-Scan-01'],
      ['來源設備', 'Avision Scanner'],
      ['目的資料夾', 'E:\\watch_folder'],
      ['掃描人員', 'Scan Station 01']
    ],
    primary: '建立匯入批次',
    secondary: '開啟 watch folder'
  },
  batchCheck: {
    step: '2 / 3',
    title: '批次品質檢查',
    description: '檢查頁數、方向、可讀性與重掃項目，確認後再交給分類人員。',
    checklist: ['頁數與紙本相符', '沒有歪斜或裁切', '條碼/印章清楚', '低對比頁面已標記'],
    fields: [
      ['批次編號', 'S-1028'],
      ['文件數量', '18'],
      ['需要重掃', '3'],
      ['送出狀態', 'Ready']
    ],
    primary: '送出給分類',
    secondary: '標記重掃'
  },
  classify: {
    step: '1 / 2',
    title: '文件分類',
    description: '依照文件內容選擇 document type，讓後續 metadata 與 OCR 規則能正確套用。',
    checklist: ['確認文件首頁', '選擇 document type', '套用保存期限', '分派到正確 cabinet'],
    fields: [
      ['Document type', 'Invoice'],
      ['Cabinet', 'Finance / Vendor'],
      ['OCR language', '繁體中文 + English'],
      ['Retention', '7 years']
    ],
    primary: '套用分類',
    secondary: '查看原始文件'
  },
  metadata: {
    step: '2 / 2',
    title: '資料欄位補齊',
    description: '補齊客戶、案件、日期與金額等欄位，讓查詢和審核能依條件篩選。',
    checklist: ['客戶名稱一致', '案件號格式正確', '日期與文件相符', '必要欄位皆完成'],
    fields: [
      ['Customer', 'Avision'],
      ['Case ID', 'AV-9341'],
      ['Document date', '2026-07-05'],
      ['Amount', 'Auto suggested']
    ],
    primary: '儲存 metadata',
    secondary: '送審'
  },
  approvals: {
    step: 'Decision',
    title: '審核與核准',
    description: '只顯示需要主管決策的文件，保留核准、退回與審核註記。',
    checklist: ['文件類型正確', 'metadata 完整', '權限符合規範', '重複文件已排除'],
    fields: [
      ['審核批次', 'R-3301'],
      ['風險等級', 'Normal'],
      ['申請人', 'Records Desk'],
      ['審核註記', 'Ready for approval']
    ],
    primary: '核准文件',
    secondary: '退回修改'
  },
  system: {
    step: 'Admin',
    title: '系統連線與同步',
    description: '確認 Mayan、Cloudflare tunnel、watch folder 與角色同步狀態。',
    checklist: ['Mayan tunnel online', 'Portal tunnel online', 'watch folder 可寫入', '角色權限已同步'],
    fields: [
      ['Mayan URL', 'mayan-emds.avision-gb10.org'],
      ['Portal URL', 'mayan-portal.avision-gb10.org'],
      ['Watch folder', 'E:\\watch_folder'],
      ['Auth mode', 'Demo credential mapping']
    ],
    primary: '重新檢查狀態',
    secondary: '開啟 Mayan 後台'
  }
};

// Scanner-specific strings, merged on top of `locales` in useTranslation.
// Kept separate so the large base locale blocks stay stable.
const scannerStrings = {
  'zh-TW': {
    scannerLiveFolder: '即時 watch folder',
    thumbSizeLabel: '縮圖大小',
    thumbSmall: '小',
    thumbMedium: '中',
    thumbLarge: '大',
    scannerRefresh: '重新整理',
    scannerLoading: '讀取中',
    scannerAnalyzing: '分析中',
    qualityBlank: '疑似空白',
    qualityOk: 'OK',
    scannerSelectAll: '全選可見',
    scannerClearSelection: '清除選取',
    scannerSelectedCount: '已選 {count}',
    scannerDeleteSelected: '刪除選取',
    scannerDeleteConfirm: '確定要刪除選取的 {count} 個檔案？這會從 watch folder 移除原始檔。',
    scannerDeleteDone: '已刪除 {count} 個檔案。',
    scannerDeleteFailed: '刪除失敗',
    scannerBlankCount: '疑似空白 {count}',
    scannerFilterBlank: '只看疑似空白',
    scannerFilterEmpty: '沒有符合過濾條件的檔案。',
    scannerBlankThreshold: '空白偵測靈敏度',
    scannerSensitivityHint: '數字越小越靈敏（標記越多）。',
    qcNormal: '正常',
    qcRescan: '重掃',
    qcIgnore: '忽略',
    scannerQcHint: '切換品質狀態',
    scannerEmpty: '目前沒有可匯入的 PDF、TIFF 或影像檔。',
    scannerLoadingFolder: '正在讀取 watch folder...',
    scannerPreviewEmpty: '選取左側檔案可在此預覽與標記品質。',
    scannerPdfPreviewHint: 'PDF 可預覽；逐頁縮圖與逐頁空白偵測將在後續版本提供。',
    scannerAnalyzingImage: '正在分析影像...',
    scannerBlankWarn: '疑似空白頁，請重點確認。',
    scannerBlankOk: '未偵測到明顯空白頁。',
    scannerWhiteRatio: '白色比例',
    scannerInkRatio: '墨點比例',
    scannerNoSelection: '請先選取要送出的檔案。',
    scannerCreating: '建立中',
    scannerSubmitSelected: '送出選取的 {count} 個檔案',
    scannerBatchCreated: '已建立批次 {id}，包含 {count} 個檔案。',
    scannerPagesSummary: '共 {count} 頁，{blank} 頁疑似空白，{rescan} 頁標記重掃。點頁面切換狀態。',
    loginHintReal: '以 Mayan 帳號密碼登入，系統會依你的群組進入對應角色。',
    scannerPickDocType: '請先選擇文件類型。',
    scannerDocType: '文件類型',
    scannerDocTypesLoading: '載入文件類型中...',
    scannerDocTypesError: '無法載入文件類型，請重新登入或檢查 Mayan 連線。',
    scannerNoDocType: '（尚無文件類型）',
    adminDocumentTypes: '文件類型',
    adminDocumentTypeName: '文件類型名稱',
    adminAddDocumentType: '新增文件類型',
    adminDocumentTypeCreated: '已新增文件類型：{label}',
    adminDocumentTypeHelp: '新增後會立即出現在 scanner 的文件類型下拉選單。',
    scannerImportToMayan: '匯入 Mayan',
    scannerDeleteAfterImport: '匯入成功後刪除原始檔',
    scannerDeleteAfterImportHint: '只刪除成功匯入 Mayan 的檔案，失敗檔案會保留。',
    scannerOriginalDeleted: '原始檔已刪除',
    scannerImportResult: '匯入結果',
    scannerImporting: '匯入中',
    scannerRetry: '重試',
    scannerImportFailed: '匯入失敗',
    import_pending: '等待中',
    import_importing: '匯入中',
    import_imported: '已匯入',
    import_failed: '失敗'
  },
  en: {
    scannerLiveFolder: 'Live watch folder',
    thumbSizeLabel: 'Thumbnail size',
    thumbSmall: 'S',
    thumbMedium: 'M',
    thumbLarge: 'L',
    scannerRefresh: 'Refresh',
    scannerLoading: 'Loading',
    scannerAnalyzing: 'Analyzing',
    qualityBlank: 'Suspected blank',
    qualityOk: 'OK',
    scannerSelectAll: 'Select visible',
    scannerClearSelection: 'Clear',
    scannerSelectedCount: '{count} selected',
    scannerDeleteSelected: 'Delete selected',
    scannerDeleteConfirm: 'Delete {count} selected file(s)? This removes the originals from the watch folder.',
    scannerDeleteDone: 'Deleted {count} file(s).',
    scannerDeleteFailed: 'Delete failed',
    scannerBlankCount: '{count} suspected blank',
    scannerFilterBlank: 'Only suspected blank',
    scannerFilterEmpty: 'No files match the filter.',
    scannerBlankThreshold: 'Blank sensitivity',
    scannerSensitivityHint: 'Lower is more sensitive (flags more).',
    qcNormal: 'OK',
    qcRescan: 'Rescan',
    qcIgnore: 'Ignore',
    scannerQcHint: 'Cycle quality state',
    scannerEmpty: 'No importable PDF, TIFF, or image files yet.',
    scannerLoadingFolder: 'Reading watch folder...',
    scannerPreviewEmpty: 'Select a file on the left to preview and mark quality.',
    scannerPdfPreviewHint: 'PDF preview available; per-page thumbnails and blank detection arrive in a later build.',
    scannerAnalyzingImage: 'Analyzing image...',
    scannerBlankWarn: 'Suspected blank page — please verify.',
    scannerBlankOk: 'No obvious blank page detected.',
    scannerWhiteRatio: 'White ratio',
    scannerInkRatio: 'Ink ratio',
    scannerNoSelection: 'Select at least one file to submit.',
    scannerCreating: 'Creating',
    scannerSubmitSelected: 'Submit {count} selected file(s)',
    scannerBatchCreated: 'Created batch {id} with {count} file(s).',
    scannerPagesSummary: '{count} pages · {blank} suspected blank · {rescan} marked rescan. Click a page to cycle its state.',
    loginHintReal: 'Sign in with your Mayan username and password; the portal opens the role assigned to your group.',
    scannerPickDocType: 'Select a document type first.',
    scannerDocType: 'Document type',
    scannerDocTypesLoading: 'Loading document types...',
    scannerDocTypesError: 'Unable to load document types. Sign in again or check the Mayan connection.',
    scannerNoDocType: '(no document types)',
    adminDocumentTypes: 'Document types',
    adminDocumentTypeName: 'Document type name',
    adminAddDocumentType: 'Add document type',
    adminDocumentTypeCreated: 'Created document type: {label}',
    adminDocumentTypeHelp: 'New types appear immediately in the scanner document-type selector.',
    scannerImportToMayan: 'Import to Mayan',
    scannerDeleteAfterImport: 'Delete originals after successful import',
    scannerDeleteAfterImportHint: 'Only successfully imported files are removed from the watch folder.',
    scannerOriginalDeleted: 'Original deleted',
    scannerImportResult: 'Import result',
    scannerImporting: 'Importing',
    scannerRetry: 'Retry',
    scannerImportFailed: 'Import failed',
    import_pending: 'Pending',
    import_importing: 'Importing',
    import_imported: 'Imported',
    import_failed: 'Failed'
  },
  ja: {
    scannerLiveFolder: 'ライブ watch folder',
    thumbSizeLabel: 'サムネイルサイズ',
    thumbSmall: '小',
    thumbMedium: '中',
    thumbLarge: '大',
    scannerRefresh: '更新',
    scannerLoading: '読み込み中',
    scannerAnalyzing: '分析中',
    qualityBlank: '空白疑い',
    qualityOk: 'OK',
    scannerSelectAll: '表示分を選択',
    scannerClearSelection: '選択解除',
    scannerSelectedCount: '{count} 件選択',
    scannerDeleteSelected: '選択を削除',
    scannerDeleteConfirm: '選択した {count} 件を削除しますか？watch folder から元ファイルを削除します。',
    scannerDeleteDone: '{count} 件を削除しました。',
    scannerDeleteFailed: '削除に失敗しました',
    scannerBlankCount: '空白疑い {count}',
    scannerFilterBlank: '空白疑いのみ',
    scannerFilterEmpty: 'フィルターに一致するファイルがありません。',
    scannerBlankThreshold: '空白検出の感度',
    scannerSensitivityHint: '数値が小さいほど高感度（多く検出）。',
    qcNormal: '正常',
    qcRescan: '再スキャン',
    qcIgnore: '無視',
    scannerQcHint: '品質状態を切替',
    scannerEmpty: '取込可能な PDF・TIFF・画像ファイルがありません。',
    scannerLoadingFolder: 'watch folder を読み込み中...',
    scannerPreviewEmpty: '左のファイルを選択してプレビュー・品質設定。',
    scannerPdfPreviewHint: 'PDF はプレビュー可能。ページごとのサムネイルと空白検出は今後の版で提供します。',
    scannerAnalyzingImage: '画像を分析中...',
    scannerBlankWarn: '空白ページの疑いがあります。ご確認ください。',
    scannerBlankOk: '明らかな空白ページは検出されませんでした。',
    scannerWhiteRatio: '白比率',
    scannerInkRatio: 'インク比率',
    scannerNoSelection: '送信するファイルを選択してください。',
    scannerCreating: '作成中',
    scannerSubmitSelected: '選択した {count} 件を送信',
    scannerBatchCreated: 'バッチ {id} を作成しました（{count} 件）。',
    scannerPagesSummary: '全 {count} ページ、空白疑い {blank}、再スキャン指定 {rescan}。ページをクリックで切替。',
    loginHintReal: 'Mayan のユーザー名とパスワードでログインします。グループに応じた役割で開きます。',
    scannerPickDocType: '文書種別を選択してください。',
    scannerDocType: '文書種別',
    scannerDocTypesLoading: '文書種別を読み込み中...',
    scannerDocTypesError: '文書種別を読み込めません。再ログインまたは Mayan 接続を確認してください。',
    scannerNoDocType: '（文書種別なし）',
    adminDocumentTypes: '文書種別',
    adminDocumentTypeName: '文書種別名',
    adminAddDocumentType: '文書種別を追加',
    adminDocumentTypeCreated: '文書種別を追加しました：{label}',
    adminDocumentTypeHelp: '追加後、scanner の文書種別リストにすぐ表示されます。',
    scannerImportToMayan: 'Mayan へ取込',
    scannerDeleteAfterImport: '取込成功後に元ファイルを削除',
    scannerDeleteAfterImportHint: 'Mayan への取込に成功したファイルのみ watch folder から削除します。',
    scannerOriginalDeleted: '元ファイル削除済み',
    scannerImportResult: '取込結果',
    scannerImporting: '取込中',
    scannerRetry: '再試行',
    scannerImportFailed: '取込失敗',
    import_pending: '待機中',
    import_importing: '取込中',
    import_imported: '取込済み',
    import_failed: '失敗'
  },
  'zh-CN': {
    scannerLiveFolder: '实时 watch folder',
    thumbSizeLabel: '缩图大小',
    thumbSmall: '小',
    thumbMedium: '中',
    thumbLarge: '大',
    scannerRefresh: '刷新',
    scannerLoading: '读取中',
    scannerAnalyzing: '分析中',
    qualityBlank: '疑似空白',
    qualityOk: 'OK',
    scannerSelectAll: '全选可见',
    scannerClearSelection: '清除选择',
    scannerSelectedCount: '已选 {count}',
    scannerDeleteSelected: '删除选择',
    scannerDeleteConfirm: '确定要删除选择的 {count} 个文件？这会从 watch folder 移除原始文件。',
    scannerDeleteDone: '已删除 {count} 个文件。',
    scannerDeleteFailed: '删除失败',
    scannerBlankCount: '疑似空白 {count}',
    scannerFilterBlank: '只看疑似空白',
    scannerFilterEmpty: '没有符合过滤条件的文件。',
    scannerBlankThreshold: '空白检测灵敏度',
    scannerSensitivityHint: '数值越小越灵敏（标记越多）。',
    qcNormal: '正常',
    qcRescan: '重扫',
    qcIgnore: '忽略',
    scannerQcHint: '切换质量状态',
    scannerEmpty: '目前没有可导入的 PDF、TIFF 或图像文件。',
    scannerLoadingFolder: '正在读取 watch folder...',
    scannerPreviewEmpty: '选择左侧文件可在此预览与标记质量。',
    scannerPdfPreviewHint: 'PDF 可预览；逐页缩图与逐页空白检测将在后续版本提供。',
    scannerAnalyzingImage: '正在分析图像...',
    scannerBlankWarn: '疑似空白页，请重点确认。',
    scannerBlankOk: '未检测到明显空白页。',
    scannerWhiteRatio: '白色比例',
    scannerInkRatio: '墨点比例',
    scannerNoSelection: '请先选择要送出的文件。',
    scannerCreating: '创建中',
    scannerSubmitSelected: '送出选择的 {count} 个文件',
    scannerBatchCreated: '已创建批次 {id}，包含 {count} 个文件。',
    scannerPagesSummary: '共 {count} 页，{blank} 页疑似空白，{rescan} 页标记重扫。点击页面切换状态。',
    loginHintReal: '以 Mayan 账号密码登录，系统会依你的群组进入对应角色。',
    scannerPickDocType: '请先选择文件类型。',
    scannerDocType: '文件类型',
    scannerDocTypesLoading: '正在载入文件类型...',
    scannerDocTypesError: '无法载入文件类型，请重新登录或检查 Mayan 连线。',
    scannerNoDocType: '（暂无文件类型）',
    adminDocumentTypes: '文件类型',
    adminDocumentTypeName: '文件类型名称',
    adminAddDocumentType: '新增文件类型',
    adminDocumentTypeCreated: '已新增文件类型：{label}',
    adminDocumentTypeHelp: '新增后会立即出现在 scanner 的文件类型下拉选单。',
    scannerImportToMayan: '导入 Mayan',
    scannerDeleteAfterImport: '导入成功后删除原始文件',
    scannerDeleteAfterImportHint: '只删除成功导入 Mayan 的文件，失败文件会保留。',
    scannerOriginalDeleted: '原始文件已删除',
    scannerImportResult: '导入结果',
    scannerImporting: '导入中',
    scannerRetry: '重试',
    scannerImportFailed: '导入失败',
    import_pending: '等待中',
    import_importing: '导入中',
    import_imported: '已导入',
    import_failed: '失败'
  }
};

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
      return stored;
    } catch {
      localStorage.removeItem('portal.session');
      return null;
    }
  });
  const [activeNav, setActiveNav] = useState('scanInbox');
  const t = useTranslation(language);

  function changeLanguage(value) {
    setLanguage(value);
    localStorage.setItem('portal.language', value);
  }

  function login(user) {
    const next = { username: user.username, role: user.role, name: user.name };
    if (user.token) next.token = user.token;
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
    <Shell
      activeNav={activeNav}
      language={language}
      onLanguageChange={changeLanguage}
      onLogout={logout}
      onNav={setActiveNav}
      session={session}
      t={t}
    />
  );
}

function LoginScreen({ language, onLanguageChange, onLogin, t }) {
  const [username, setUsername] = useState('scanner');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const previewUser = demoUsers.find((user) => user.username === username.trim()) || demoUsers[0];
  const previewTasks = tasks[previewUser.role].slice(0, 2);

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
            <strong>5</strong>
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

        <div className={`role-preview ${roleAccent[previewUser.role]}`}>
          <div>
            <p className="eyebrow">{previewUser.name}</p>
            <h3>{t(previewUser.role)}</h3>
          </div>
          <div className="preview-tasks">
            {previewTasks.map((task) => (
              <span key={task.id}>{task.id} · {task.label}</span>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function Shell({ activeNav, language, onLanguageChange, onLogout, onNav, session, t }) {
  const navItems = roleNav[session.role];
  const roleTasks = tasks[session.role];
  const rolePanel = panels[session.role];

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
            <button className="icon-text notification-button" type="button">
              <Bell size={18} aria-hidden="true" />
              {rolePanel.stats[2][1]}
            </button>
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
          <div className="stats-grid">
            {rolePanel.stats.map(([label, value]) => (
              <div className="stat-block" key={label}>
                <span>{t(label)}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        </section>

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

        <section className="content-grid">
          <PrimaryWorkArea activeNav={activeNav} session={session} t={t} />
          <QueuePanel roleTasks={roleTasks} t={t} />
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
  const [newDocumentTypeLabel, setNewDocumentTypeLabel] = useState('');
  const [documentTypeCreating, setDocumentTypeCreating] = useState(false);
  const [deleteAfterImport, setDeleteAfterImport] = useState(false);
  const [importProgress, setImportProgress] = useState({});
  const [importing, setImporting] = useState(false);

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
    let batch = null;

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

      batch = payload.batch;
      setScannerBatch(batch);
      setSelectedFiles(new Set());
      await loadScannerFiles();
    } catch (error) {
      setScannerError(error.message);
      return;
    } finally {
      setScannerCreating(false);
    }

    if (!DEMO_LOGIN && batch) {
      await importBatchToMayan(batch);
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

  // Fetch document types for scanner import and admin management.
  useEffect(() => {
    if (!(scannerMode || activeNav === 'userAdmin') || DEMO_LOGIN) return;
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

  async function deleteSelectedFiles() {
    const names = Array.from(selectedFiles);
    if (!names.length) {
      setScannerError(t('scannerNoSelection'));
      return;
    }
    const confirmed = window.confirm(fillTemplate(t('scannerDeleteConfirm'), { count: names.length }));
    if (!confirmed) return;

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

  if (activeNav === 'searchDocs') {
    return (
      <section className="work-panel">
        <div className="search-band">
          <Search size={22} aria-hidden="true" />
          <input placeholder={t('searchPlaceholder')} />
          <button type="button">{t('searchDocs')}</button>
        </div>
        <div className="result-list">
          {['INV-2026-0712.pdf', 'Contract_AV-9341.pdf', 'PO-77519.pdf'].map((name, index) => (
            <article className="result-row" key={name}>
              <Archive size={20} aria-hidden="true" />
              <div>
                <strong>{name}</strong>
                <span>{index === 0 ? 'Vendor / Finance / 2026' : 'Avision / General / Active'}</span>
              </div>
              <button type="button">{t('nextAction')}</button>
            </article>
          ))}
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
          {demoUsers.map((user) => (
            <div className="permission-row" key={user.role}>
              <ShieldCheck size={20} aria-hidden="true" />
              <div>
                <strong>{t(user.role)}</strong>
                <span>{roleNav[user.role].map((item) => t(item)).join(' / ')}</span>
              </div>
            </div>
          ))}
        </div>
        <p className="note">{t('roleHelp')}</p>
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
          <p>{workflow.description}</p>
        </div>
        <span className={`workflow-badge ${roleAccent[session.role]}`}>{t(session.role)}</span>
      </div>

      <div className="intake-box compact">
        <UploadCloud size={42} aria-hidden="true" />
        <div>
          <h3>{activeNav === 'system' ? t('connected') : t(activeNav)}</h3>
          <p>{activeNav === 'scanInbox' ? t('dropText') : workflow.description}</p>
        </div>
      </div>

      {scannerMode ? (
        <div className="scanner-live-panel">
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
                onClick={deleteSelectedFiles}
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
              ) : (
                <div className="scanner-empty">
                  {scannerLoading ? t('scannerLoadingFolder') : t('scannerEmpty')}
                </div>
              )}
            </div>

            <div className="scanner-preview-panel">
              {selectedScannerFile ? (
                <>
                  <div className="scanner-preview-frame">
                    {isMultiPage(selectedScannerFile) ? (
                      scannerPagesLoading ? (
                        <div className="scanner-empty">{t('scannerLoadingFolder')}</div>
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

      <div className="checklist-grid">
        {workflow.checklist.map((item) => (
          <div className="check-item" key={item}>
            <CheckCircle2 size={17} aria-hidden="true" />
            <span>{item}</span>
          </div>
        ))}
      </div>

      <div className="metadata-grid">
        {workflow.fields.map(([label, value]) => (
          <label key={label}>
            <span>{label}</span>
            <input defaultValue={value} />
          </label>
        ))}
      </div>

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
        <button className="subtle-action" type="button">
          <FolderInput size={18} aria-hidden="true" />
          {workflow.secondary}
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
    </section>
  );
}

function QueuePanel({ roleTasks, t }) {
  return (
    <section className="queue-panel">
      <div className="panel-heading">
        <LayoutDashboard size={20} aria-hidden="true" />
        <h2>{t('queue')}</h2>
      </div>
      <p className="queue-helper">{t('nextAction')}</p>
      <div className="task-list">
        {roleTasks.map((task) => (
          <article className="task-row" key={task.id}>
            <div className="task-main">
              <strong>{task.id}</strong>
              <span>{task.label}</span>
            </div>
            <div className={`status ${task.status}`}>{t(task.status)}</div>
            <small>{task.due}</small>
          </article>
        ))}
      </div>
    </section>
  );
}

createRoot(document.getElementById('root')).render(<App />);
