import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { useTranslation } from './hooks/useTranslation.js';
import { DEMO_LOGIN, SESSION_TTL_MS } from './lib/constants.js';
import { normalizeRole } from './lib/utils.js';
import { roleNav } from './portalConfig.js';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import LoginScreen from './components/LoginScreen.jsx';
import Shell from './components/Shell.jsx';

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
      if (!DEMO_LOGIN && stored?.expiresAt && Date.now() > stored.expiresAt) {
        localStorage.removeItem('portal.session');
        return null;
      }
      return { ...stored, role: normalizeRole(stored.role) };
    } catch {
      localStorage.removeItem('portal.session');
      return null;
    }
  });
  const [activeNav, setActiveNav] = useState('scanInbox');
  const t = useTranslation(language);

  useEffect(() => {
    if (!session || DEMO_LOGIN) return undefined;
    const delay = Math.max(0, (session.expiresAt || 0) - Date.now());
    const timer = window.setTimeout(() => logout(), delay);
    return () => window.clearTimeout(timer);
  }, [session?.expiresAt]);

  function changeLanguage(value) {
    setLanguage(value);
    localStorage.setItem('portal.language', value);
  }

  function login(user) {
    const next = { username: user.username, role: normalizeRole(user.role), name: user.name };
    if (user.token) next.token = user.token;
    if (!DEMO_LOGIN) next.expiresAt = Date.now() + SESSION_TTL_MS;
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
    <ErrorBoundary>
      <Shell
        activeNav={activeNav}
        language={language}
        onLanguageChange={changeLanguage}
        onLogout={logout}
        onNav={setActiveNav}
        session={session}
        t={t}
      />
    </ErrorBoundary>
  );
}


createRoot(document.getElementById('root')).render(<App />);
