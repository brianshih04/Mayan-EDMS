import { useEffect, useState } from 'react';
import { Bell, Globe2, LogOut } from 'lucide-react';
import { panels, roleAccent, roleNav } from '../portalConfig.js';
import { authHeaders, MAYAN_URL } from '../lib/constants.js';
import { navIcons } from '../lib/nav.js';
import PrimaryWorkArea from './PrimaryWorkArea.jsx';
import QueuePanel from './QueuePanel.jsx';

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

export default Shell;
