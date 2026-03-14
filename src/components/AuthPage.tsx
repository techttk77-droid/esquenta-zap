import React, { useState } from 'react';
import { login, register } from '../api';
import styles from './AuthPage.module.css';

interface AuthPageProps {
  onAuth: (token: string, user: any) => void;
}

export default function AuthPage({ onAuth }: AuthPageProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 6000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'register') {
        await register(username, password, name || undefined);
        // Após registro, faz login automático
        const res = await login(username, password);
        onAuth(res.token, res.user);
      } else {
        const res = await login(username, password);
        if (res.machineChanged) {
          showToast(
            '⚠️ Login detectado em nova máquina. Todas as sessões WhatsApp anteriores foram desconectadas por segurança.'
          );
        }
        onAuth(res.token, res.user);
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Erro ao autenticar. Tente novamente.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      {toast && <div className={styles.toast}>{toast}</div>}

      <div className={styles.card}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>🔥</span>
          <span className={styles.logoText}>Esquenta Zap</span>
          <span className={styles.brand}>$70L7N T7CN</span>
        </div>

        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${mode === 'login' ? styles.tabActive : ''}`}
            onClick={() => { setMode('login'); setError(''); }}
          >
            Entrar
          </button>
          <button
            className={`${styles.tab} ${mode === 'register' ? styles.tabActive : ''}`}
            onClick={() => { setMode('register'); setError(''); }}
          >
            Criar conta
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div className={styles.field}>
              <label>Nome (opcional)</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome"
              />
            </div>
          )}

          <div className={styles.field}>
            <label>Usuário</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="seu_usuario"
              required
              minLength={3}
            />
          </div>

          <div className={styles.field}>
            <label>Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading
              ? 'Aguarde...'
              : mode === 'login'
              ? 'Entrar'
              : 'Criar conta'}
          </button>
        </form>
      </div>
    </div>
  );
}
