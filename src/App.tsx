import React, { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { Smartphone, Users, Clock, Settings, BarChart2, Music, Wifi, WifiOff, LogOut, Shield, Menu, X, User } from 'lucide-react';
import NumbersPanel from './components/NumbersPanel';
import GroupsPanel from './components/GroupsPanel';
import SchedulerPanel from './components/SchedulerPanel';
import SettingsPanel from './components/SettingsPanel';
import MediaPanel from './components/MediaPanel';
import LogsPanel from './components/LogsPanel';
import AdminPanel from './components/AdminPanel';
import AuthPage from './components/AuthPage';
import { getToken, setToken, clearToken, getMe, logout as apiLogout, setOnUnauthorized, getNumbers as fetchNumbers, getTokenExpiry } from './api';
import styles from './App.module.css';

export type Engine = 'wwjs' | 'baileys';
export type NumberStatus =
  | 'disconnected'
  | 'connecting'
  | 'qr_pending'
  | 'authenticated'
  | 'connected'
  | 'auth_failure';

export interface WNumber {
  id: string;
  name: string | null;
  phone: string | null;
  engine: Engine;
  status: NumberStatus;
  live_status?: NumberStatus;
  auto_reconnect: number;
  created_at: string;
  last_connected: string | null;
}

export interface ConversationLog {
  from: string;
  to: string;
  message: string;
  type: string;
  sent_at?: string;
}

type Tab = 'numbers' | 'groups' | 'scheduler' | 'media' | 'logs' | 'settings' | 'admin';

// Em dev: URL relativa → proxy Vite encaminha para Railway sem CORS
// Em prod (Vercel): URL absoluta direta para Railway
const SOCKET_URL = import.meta.env.DEV
  ? ''
  : 'https://api-esquenta-zap-production.up.railway.app';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('numbers');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [numbers, setNumbers] = useState<WNumber[]>([]);
  const [qrMap, setQrMap] = useState<Record<string, string>>({});
  const [logs, setLogs] = useState<ConversationLog[]>([]);

  // ─── Auth state ─────────────────────────────────────────────────────────────
  const [token, setTokenState] = useState<string | null>(getToken());
  const [user, setUser] = useState<any>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expiryStr, setExpiryStr] = useState('');
  const [expiryWarning, setExpiryWarning] = useState(false);
  const [loginToast, setLoginToast] = useState('');

  const handleLogout = useCallback(async () => {
    try { await apiLogout(); } catch {}
    clearToken();
    setTokenState(null);
    setUser(null);
    socket?.disconnect();
    setSocket(null);
    setConnected(false);
    setNumbers([]);
    setQrMap({});
    setLogs([]);
  }, [socket]);

  // Register 401 handler
  useEffect(() => {
    setOnUnauthorized(() => {
      handleLogout();
    });
  }, [handleLogout]);

  // On mount: validate existing token
  useEffect(() => {
    if (!token) {
      setAuthChecking(false);
      return;
    }
    getMe()
      .then((res) => {
        setUser(res.user || res);
      })
      .catch(() => {
        clearToken();
        setTokenState(null);
      })
      .finally(() => setAuthChecking(false));
  }, []); // only on mount

  // ─── Atualiza contador de expiração ─────────────────────────────────────────
  useEffect(() => {
    if (!token) { setExpiryStr(''); return; }
    const expiry = user?.licenseExpiry
      ? new Date(user.licenseExpiry)
      : getTokenExpiry();
    if (!expiry) { setExpiryStr(''); return; }
    const update = () => {
      const diff = expiry.getTime() - Date.now();
      if (diff <= 0) {
        setExpiryStr('Expirada');
        setExpiryWarning(true);
        return;
      }
      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setExpiryStr(`${d}d ${h}h ${m}m`);
      setExpiryWarning(diff < 2 * 24 * 60 * 60 * 1000);
    };
    update();
    const iv = setInterval(update, 60_000);
    return () => clearInterval(iv);
  }, [user, token]);

  const handleAuth = (newToken: string, userData: any) => {
    setToken(newToken);
    setTokenState(newToken);
    setUser(userData);
    // Aviso de expiração ao fazer login
    try {
      const payload = JSON.parse(atob(newToken.split('.')[1]));
      const expDate = userData.licenseExpiry
        ? new Date(userData.licenseExpiry)
        : payload.exp ? new Date(payload.exp * 1000) : null;
      if (expDate) {
        const diff = expDate.getTime() - Date.now();
        if (diff > 0 && diff < 2 * 24 * 60 * 60 * 1000) {
          const d = Math.floor(diff / (1000 * 60 * 60 * 24));
          const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          setLoginToast(
            `⚠️ Sua licença expira em ${d > 0 ? `${d} dia${d !== 1 ? 's' : ''} e ` : ''}${h} hora${h !== 1 ? 's' : ''}. Renove para continuar usando.`
          );
          setTimeout(() => setLoginToast(''), 10000);
        }
      }
    } catch {}
  };

  // ─── Socket.IO setup (only when authenticated) ─────────────────────────────
  useEffect(() => {
    if (!token) return;

    const s = io(SOCKET_URL, {
      transports: ['polling', 'websocket'],
      upgrade: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: Infinity,
      auth: { token },
    });
    setSocket(s);

    s.on('connect', () => {
      console.log('[Socket.IO] Conectado. Transport:', s.io.engine.transport.name);
      setConnected(true);
    });
    s.on('disconnect', (reason: string) => {
      console.warn('[Socket.IO] Desconectado:', reason);
      setConnected(false);
    });
    s.on('connect_error', (err: Error) => {
      console.error('[Socket.IO] Erro de conexão:', err.message);
    });

    s.on('numbers:list', (nums: WNumber[]) => setNumbers(nums));

    s.on('number:status', ({ id, status, phone }: any) => {
      console.log('[Socket.IO] number:status ->', id, status);
      setNumbers((prev) =>
        prev.map((n) =>
          n.id === id
            ? { ...n, status, live_status: status, phone: phone || n.phone }
            : n
        )
      );
    });

    s.on('number:qr', ({ id, qr }: any) => {
      console.log('[Socket.IO] number:qr recebido para:', id);
      setQrMap((prev) => ({ ...prev, [id]: qr }));
    });

    s.on('number:qr_clear', ({ id }: any) => {
      console.log('[Socket.IO] number:qr_clear para:', id);
      setQrMap((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    });

    s.on('conversation:log', (log: ConversationLog) => {
      setLogs((prev) => [{ ...log, sent_at: new Date().toISOString() }, ...prev].slice(0, 200));
    });

    return () => {
      s.disconnect();
    };
  }, [token]);

  const refreshNumbers = useCallback(() => {
    fetchNumbers()
      .then((data) => setNumbers(data))
      .catch(() => {});
  }, []);

  const allTabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'numbers', label: 'Números', icon: <Smartphone size={18} /> },
    { key: 'groups', label: 'Grupos', icon: <Users size={18} /> },
    { key: 'scheduler', label: 'Agendamentos', icon: <Clock size={18} /> },
    { key: 'media', label: 'Mídia', icon: <Music size={18} /> },
    { key: 'logs', label: 'Logs', icon: <BarChart2 size={18} /> },
    { key: 'settings', label: 'Configurações', icon: <Settings size={18} /> },
    { key: 'admin', label: 'Admin', icon: <Shield size={18} /> },
  ];

  // Filtra tabs por módulos permitidos ao usuário + admin só para admins
  const userModules: string[] = user?.modules || ['numbers', 'groups', 'scheduler', 'media', 'logs', 'settings'];
  const isAdmin = user?.role === 'admin';
  const tabs = allTabs.filter((t) => {
    if (t.key === 'admin') return isAdmin;
    return userModules.includes(t.key);
  });

  // ─── If checking auth or not authenticated, show AuthPage ────────────────
  if (authChecking) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0d1117', color: '#8b949e' }}>
        Carregando...
      </div>
    );
  }

  if (!token) {
    return <AuthPage onAuth={handleAuth} />;
  }

  return (
    <div className={styles.app}>
      {/* Toast de expiração */}
      {loginToast && <div className={styles.loginToast}>{loginToast}</div>}

      {/* Overlay mobile */}
      {sidebarOpen && <div className={styles.overlay} onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>🔥</span>
          <div className={styles.logoWrap}>
            <span className={styles.logoText}>Esquenta Zap</span>
            <span className={styles.brand}>$70L7N T7CN</span>
          </div>
          <button className={styles.closeBtn} onClick={() => setSidebarOpen(false)}>
            <X size={18} />
          </button>
        </div>

        <nav className={styles.nav}>
          {tabs.map((t) => (
            <button
              key={t.key}
              className={`${styles.navItem} ${activeTab === t.key ? styles.navItemActive : ''}`}
              onClick={() => { setActiveTab(t.key); setSidebarOpen(false); }}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          {user && (
            <div className={styles.userInfo}>
              <User size={14} />
              <span>{user.name || user.username}</span>
            </div>
          )}
          {connected ? (
            <span className={styles.connIndicatorOn}>
              <Wifi size={14} /> Serviço online
            </span>
          ) : (
            <span className={styles.connIndicatorOff}>
              <WifiOff size={14} /> Serviço offline
            </span>
          )}
          <button className={styles.logoutBtn} onClick={handleLogout}>
            <LogOut size={14} /> Sair
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className={styles.main}>
        <div className={styles.topBar}>
          <button className={styles.menuBtn} onClick={() => setSidebarOpen(true)}>
            <Menu size={20} />
          </button>
          {expiryStr && (
            <div className={`${styles.expiryInfo} ${expiryWarning ? styles.expiryWarn : ''}`}>
              {expiryWarning ? '⚠️' : '🕐'} Licença expira em {expiryStr}
            </div>
          )}
        </div>
        <div className={styles.content}>
          {activeTab === 'numbers' && (
            <NumbersPanel
              numbers={numbers}
              qrMap={qrMap}
              onRefresh={refreshNumbers}
              setNumbers={setNumbers}
            />
          )}
          {activeTab === 'groups' && <GroupsPanel numbers={numbers} />}
          {activeTab === 'scheduler' && <SchedulerPanel numbers={numbers} />}
          {activeTab === 'media' && <MediaPanel />}
          {activeTab === 'logs' && <LogsPanel logs={logs} />}
          {activeTab === 'settings' && <SettingsPanel numbersCount={numbers.length} />}
          {activeTab === 'admin' && <AdminPanel />}
        </div>
      </main>
    </div>
  );
}
