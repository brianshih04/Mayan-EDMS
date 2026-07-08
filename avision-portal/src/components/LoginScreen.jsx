import { useState } from 'react';
import { Languages, UserRound } from 'lucide-react';
import { demoUsers, roleAccent } from '../portalConfig.js';
import { DEMO_LOGIN } from '../lib/constants.js';

function LoginScreen({ language, onLanguageChange, onLogin, t }) {
  const [username, setUsername] = useState('scanner');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const previewUser = demoUsers.find((user) => user.username === username.trim()) || demoUsers[0];

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
            <strong>4</strong>
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

        {DEMO_LOGIN ? (
          <div className={`role-preview ${roleAccent[previewUser.role]}`}>
            <div>
              <p className="eyebrow">{previewUser.name}</p>
              <h3>{t(previewUser.role)}</h3>
            </div>
            <div className="preview-tasks">
              <span>{t(`${previewUser.role}Intro`)}</span>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}

export default LoginScreen;
