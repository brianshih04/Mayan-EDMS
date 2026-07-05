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
  UploadCloud,
  UserRound,
  UsersRound
} from 'lucide-react';
import './styles.css';

const MAYAN_URL = 'https://mayan-emds.avision-gb10.org';

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

function analyzeImageForBlankPage(image) {
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

  const whiteRatio = whitePixels / totalPixels;
  const inkRatio = inkPixels / totalPixels;
  const averageContrast = contrastTotal / totalPixels;
  const likelyBlank = whiteRatio > 0.96 && inkRatio < 0.025 && averageContrast < 7;

  return {
    averageContrast,
    inkRatio,
    likelyBlank,
    whiteRatio
  };
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
    const dict = locales[lang] || locales['zh-TW'];
    return (key) => dict[key] || locales['zh-TW'][key] || key;
  }, [lang]);
}

function App() {
  const [language, setLanguage] = useState(localStorage.getItem('portal.language') || 'zh-TW');
  const [session, setSession] = useState(() => {
    const raw = localStorage.getItem('portal.session');
    return raw ? JSON.parse(raw) : null;
  });
  const [activeNav, setActiveNav] = useState('scanInbox');
  const t = useTranslation(language);

  function changeLanguage(value) {
    setLanguage(value);
    localStorage.setItem('portal.language', value);
  }

  function login(user) {
    const { password, ...next } = user;
    localStorage.setItem('portal.session', JSON.stringify(next));
    setSession(next);
    setActiveNav(roleNav[next.role][0]);
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
  const previewUser = demoUsers.find((user) => user.username === username.trim()) || demoUsers[0];
  const previewTasks = tasks[previewUser.role].slice(0, 2);

  function submitLogin(event) {
    event.preventDefault();
    const matchedUser = demoUsers.find(
      (user) => user.username === username.trim() && user.password === password
    );

    if (!matchedUser) {
      setError(t('loginError'));
      return;
    }

    setError('');
    onLogin(matchedUser);
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
          <p className="hint">{t('demoHint')}</p>
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
          <button className="primary-login" type="submit">
            <UserRound size={18} aria-hidden="true" />
            {t('loginAs')}
          </button>
        </form>

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
  const [scannerBatch, setScannerBatch] = useState(null);
  const [scannerCreating, setScannerCreating] = useState(false);
  const [selectedScannerFile, setSelectedScannerFile] = useState(null);
  const [blankAnalysis, setBlankAnalysis] = useState(null);
  const [thumbnailAnalysis, setThumbnailAnalysis] = useState({});

  async function loadScannerFiles() {
    setScannerLoading(true);
    setScannerError('');

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
    setScannerCreating(true);
    setScannerError('');

    try {
      const response = await fetch('/api/scanner/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          createdBy: session.username,
          files: scannerFiles.map((file) => file.name)
        })
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || 'Unable to create scanner batch.');
      }

      setScannerBatch(payload.batch);
      await loadScannerFiles();
    } catch (error) {
      setScannerError(error.message);
    } finally {
      setScannerCreating(false);
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

  function updateThumbnailAnalysis(file, image) {
    setThumbnailAnalysis((current) => {
      if (current[file.name]?.width && current[file.name]?.height) return current;
      const analysis = analyzeImageForBlankPage(image);

      return {
        ...current,
        [file.name]: {
          ...analysis,
          height: image.naturalHeight,
          width: image.naturalWidth
        }
      };
    });
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

  if (activeNav === 'userAdmin') {
    return (
      <section className="work-panel admin-surface">
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
              <p className="eyebrow">Live watch folder</p>
              <h3>{watchFolder}</h3>
            </div>
            <button className="subtle-action" onClick={loadScannerFiles} type="button">
              {scannerLoading ? '讀取中' : '重新整理'}
            </button>
          </div>

          {scannerError ? <p className="scanner-error">{scannerError}</p> : null}
          {scannerBatch ? (
            <p className="scanner-success">
              已建立批次 {scannerBatch.id}，包含 {scannerBatch.files.length} 個檔案。
            </p>
          ) : null}

          <div className="scanner-review-grid">
            <div className="scanner-thumbnail-grid">
              {scannerFiles.length ? (
                scannerFiles.map((file) => {
                  const analysis = thumbnailAnalysis[file.name];
                  const imagePreview = file.previewable && file.extension !== 'PDF';
                  const thumbnailStyle = analysis?.width && analysis?.height
                    ? { aspectRatio: `${analysis.width} / ${analysis.height}` }
                    : undefined;
                  const qualityLabel = analysis
                    ? analysis.likelyBlank ? '疑似空白' : 'OK'
                    : imagePreview ? '分析中' : file.extension;
                  const thumbClasses = [
                    'scanner-thumb-card',
                    selectedScannerFile?.name === file.name ? 'active' : '',
                    analysis?.likelyBlank ? 'blank-suspect' : ''
                  ].filter(Boolean).join(' ');

                  return (
                    <button
                      className={thumbClasses}
                      key={file.name}
                      onClick={() => setSelectedScannerFile(file)}
                      title={file.name}
                      type="button"
                    >
                      <div className="scanner-thumb-media" style={thumbnailStyle}>
                        {imagePreview ? (
                          <>
                            <span
                              className="scanner-thumb-page"
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
                        <span className={analysis?.likelyBlank ? 'thumb-status warning' : 'thumb-status'}>
                          {qualityLabel}
                        </span>
                      </div>
                      <div className="scanner-thumb-meta">
                        <strong>{file.name}</strong>
                        <span>{formatBytes(file.size)} · {formatDateTime(file.modifiedAt)}</span>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="scanner-empty">
                  {scannerLoading ? '正在讀取 watch folder...' : '目前沒有可匯入的 PDF、TIFF 或影像檔。'}
                </div>
              )}
            </div>

            <div className="scanner-preview-panel">
              {selectedScannerFile?.previewable ? (
                <>
                  <div className="scanner-preview-frame">
                    {selectedScannerFile.extension === 'PDF' ? (
                      <object
                        aria-label={selectedScannerFile.name}
                        data={selectedScannerFile.previewUrl}
                        type="application/pdf"
                      />
                    ) : (
                      <img
                        alt={selectedScannerFile.name}
                        src={selectedScannerFile.previewUrl}
                        onLoad={(event) => setBlankAnalysis(analyzeImageForBlankPage(event.currentTarget))}
                      />
                    )}
                  </div>
                  <div className="scanner-quality-card">
                    <strong>{selectedScannerFile.name}</strong>
                    {selectedScannerFile.extension === 'PDF' ? (
                      <span>PDF 可預覽；空白頁偵測將在後續接 PDF 逐頁分析。</span>
                    ) : blankAnalysis ? (
                      <span className={blankAnalysis.likelyBlank ? 'quality-warning' : 'quality-ok'}>
                        {blankAnalysis.likelyBlank ? '疑似空白頁，請重點確認。' : '未偵測到明顯空白頁。'}
                        {' '}白色比例 {(blankAnalysis.whiteRatio * 100).toFixed(1)}%，墨點比例 {(blankAnalysis.inkRatio * 100).toFixed(1)}%。
                      </span>
                    ) : (
                      <span>正在分析影像...</span>
                    )}
                  </div>
                </>
              ) : (
                <div className="scanner-preview-empty">
                  選取 JPG、PNG、BMP 或 PDF 可在此預覽。TIFF 需要後續轉圖服務才能在瀏覽器直接顯示。
                </div>
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
        <button
          className="strong-action"
          disabled={scannerMode && (!scannerFiles.length || scannerCreating)}
          onClick={scannerMode ? createScannerBatch : undefined}
          type="button"
        >
          <CheckCircle2 size={18} aria-hidden="true" />
          {scannerCreating ? '建立中' : workflow.primary}
        </button>
        <button className="subtle-action" type="button">
          <FolderInput size={18} aria-hidden="true" />
          {workflow.secondary}
        </button>
      </div>
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
