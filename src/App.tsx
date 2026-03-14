import React, { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { Smartphone, Users, Clock, Settings, BarChart2, Music, Wifi, WifiOff } from 'lucide-react';
import NumbersPanel from './components/NumbersPanel';
import GroupsPanel from './components/GroupsPanel';
import SchedulerPanel from './components/SchedulerPanel';
import SettingsPanel from './components/SettingsPanel';
import MediaPanel from './components/MediaPanel';
import LogsPanel from './components/LogsPanel';
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

type Tab = 'numbers' | 'groups' | 'scheduler' | 'media' | 'logs' | 'settings';

// Socket.IO client automatically appends /socket.io to the URL
const SOCKET_URL = 'https://api-esquenta-zap-production.up.railway.app';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('numbers');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [numbers, setNumbers] = useState<WNumber[]>([]);
  const [qrMap, setQrMap] = useState<Record<string, string>>({});
  const [logs, setLogs] = useState<ConversationLog[]>([]); 

  // Socket.IO setup
  useEffect(() => {
    const s = io(SOCKET_URL, {
      // Polling primeiro garante compatibilidade com proxies Railway/Nginx;
      // depois faz upgrade automático para WebSocket se possível.
      transports: ['polling', 'websocket'],
      upgrade: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: Infinity,
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
  }, []);

  const refreshNumbers = useCallback(() => {
    fetch('https://api-esquenta-zap-production.up.railway.app/api/numbers')
      .then((r) => r.json())
      .then((data) => setNumbers(data))
      .catch(() => {});
  }, []);

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'numbers', label: 'Números', icon: <Smartphone size={18} /> },
    { key: 'groups', label: 'Grupos', icon: <Users size={18} /> },
    { key: 'scheduler', label: 'Agendamentos', icon: <Clock size={18} /> },
    { key: 'media', label: 'Mídia', icon: <Music size={18} /> },
    { key: 'logs', label: 'Logs', icon: <BarChart2 size={18} /> },
    { key: 'settings', label: 'Configurações', icon: <Settings size={18} /> },
  ];

  return (
    <div className={styles.app}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>🔥</span>
          <span className={styles.logoText}>Esquenta Zap</span>
        </div>

        <nav className={styles.nav}>
          {tabs.map((t) => (
            <button
              key={t.key}
              className={`${styles.navItem} ${activeTab === t.key ? styles.navItemActive : ''}`}
              onClick={() => setActiveTab(t.key)}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          {connected ? (
            <span className={styles.connIndicatorOn}>
              <Wifi size={14} /> Serviço online
            </span>
          ) : (
            <span className={styles.connIndicatorOff}>
              <WifiOff size={14} /> Serviço offline
            </span>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className={styles.main}>
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
        </div>
      </main>
    </div>
  );
}
