import React, { useMemo, useState } from 'react';
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
    signOut: '登出',
    username: '使用者',
    password: '密碼',
    demoHint: '目前是角色式前台原型；先用下方帳號體驗不同 UI。',
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
    sampleUsers: '測試帳號',
    loginAs: '以此角色登入',
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
    signOut: 'Sign out',
    username: 'User',
    password: 'Password',
    demoHint: 'This is the role-based portal prototype. Use the demo users below to preview each UI.',
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
    sampleUsers: 'Demo users',
    loginAs: 'Sign in as role',
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
    signOut: 'ログアウト',
    username: 'ユーザー',
    password: 'パスワード',
    demoHint: '役割別 UI のプロトタイプです。下のユーザーで画面を確認できます。',
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
    sampleUsers: 'デモユーザー',
    loginAs: 'この役割でログイン',
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
    signOut: '登出',
    username: '用户',
    password: '密码',
    demoHint: '目前是角色式前台原型；可用下方账号预览不同 UI。',
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
    sampleUsers: '测试账号',
    loginAs: '以此角色登录',
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
  { username: 'scanner', role: 'scanner', name: 'Scan Station 01' },
  { username: 'records', role: 'classifier', name: 'Records Desk' },
  { username: 'reviewer', role: 'reviewer', name: 'Team Lead' },
  { username: 'viewer', role: 'viewer', name: 'Document User' },
  { username: 'admin', role: 'admin', name: 'System Admin' }
];

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
    const next = { ...user };
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
  const [selectedRole, setSelectedRole] = useState(demoUsers[0].role);
  const selectedUser = demoUsers.find((user) => user.role === selectedRole) || demoUsers[0];

  return (
    <main className="login-page">
      <section className="login-brand">
        <img src="/avision-mark.svg" alt="Avision" className="brand-mark" />
        <div>
          <h1>{t('appName')}</h1>
          <p>{t('appSubtitle')}</p>
        </div>
      </section>

      <section className="login-panel" aria-label={t('signIn')}>
        <div className="language-row">
          <Languages size={18} aria-hidden="true" />
          <select value={language} onChange={(event) => onLanguageChange(event.target.value)}>
            <option value="zh-TW">繁體中文</option>
            <option value="en">English</option>
            <option value="ja">日本語</option>
            <option value="zh-CN">简体中文</option>
          </select>
        </div>

        <p className="hint">{t('demoHint')}</p>
        <div className="role-picker">
          {demoUsers.map((user) => (
            <button
              className={selectedRole === user.role ? 'role-tile selected' : 'role-tile'}
              key={user.role}
              onClick={() => setSelectedRole(user.role)}
              type="button"
            >
              <span>{t(user.role)}</span>
              <small>{user.username}</small>
            </button>
          ))}
        </div>

        <button className="primary-login" onClick={() => onLogin(selectedUser)} type="button">
          <UserRound size={18} aria-hidden="true" />
          {t('loginAs')}
        </button>
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
            <button className="icon-text" type="button">
              <Bell size={18} aria-hidden="true" />
              {rolePanel.stats[2][1]}
            </button>
            <button className="icon-text" onClick={onLogout} type="button">
              <LogOut size={18} aria-hidden="true" />
              {t('signOut')}
            </button>
          </div>
        </header>

        <section className="role-summary">
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

        <section className="content-grid">
          <PrimaryWorkArea activeNav={activeNav} session={session} t={t} />
          <QueuePanel roleTasks={roleTasks} t={t} />
        </section>
      </main>
    </div>
  );
}

function PrimaryWorkArea({ activeNav, session, t }) {
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

  if (activeNav === 'userAdmin' || activeNav === 'system') {
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

  return (
    <section className="work-panel">
      <div className="intake-box">
        <UploadCloud size={42} aria-hidden="true" />
        <div>
          <h2>{t('dropTitle')}</h2>
          <p>{t('dropText')}</p>
        </div>
      </div>
      <div className="action-row">
        <button className="strong-action" type="button">
          <CheckCircle2 size={18} aria-hidden="true" />
          {t('primaryAction')}
        </button>
        <button className="subtle-action" type="button">
          <FolderInput size={18} aria-hidden="true" />
          {t('secondaryAction')}
        </button>
      </div>
      <div className="metadata-grid">
        {['Document Type', 'Customer', 'Case ID', 'Retention'].map((label) => (
          <label key={label}>
            <span>{label}</span>
            <input defaultValue={session.role === 'scanner' ? '' : 'Auto suggested'} />
          </label>
        ))}
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
