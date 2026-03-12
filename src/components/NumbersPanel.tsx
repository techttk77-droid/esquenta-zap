import React, { useState } from 'react';
import { WNumber, Engine, NumberStatus } from '../App';
import * as api from '../api';
import styles from './NumbersPanel.module.css';
import { Plus, Trash2, Zap, ZapOff, RefreshCw, Send, ChevronsUpDown } from 'lucide-react';

interface Props {
  numbers: WNumber[];
  qrMap: Record<string, string>;
  onRefresh: () => void;
  setNumbers: React.Dispatch<React.SetStateAction<WNumber[]>>;
}

const STATUS_COLORS: Record<string, string> = {
  connected: '#25d366',
  connecting: '#f0a500',
  qr_pending: '#539bf5',
  authenticated: '#8957e5',
  disconnected: '#8b949e',
  auth_failure: '#f85149',
};

const STATUS_LABELS: Record<string, string> = {
  connected: 'Conectado',
  connecting: 'Conectando...',
  qr_pending: 'Aguardando QR',
  authenticated: 'Autenticado',
  disconnected: 'Desconectado',
  auth_failure: 'Falha de Auth',
};

const ENGINE_LABELS: Record<string, string> = {
  wwjs: 'whatsapp-web.js',
  baileys: 'Baileys',
};

export default function NumbersPanel({ numbers, qrMap, onRefresh, setNumbers }: Props) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEngine, setNewEngine] = useState<Engine>('wwjs');
  const [testMsg, setTestMsg] = useState<{ id: string; to: string; text: string } | null>(null);
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const setLoad = (id: string, val: boolean) =>
    setLoading((prev) => ({ ...prev, [id]: val }));

  const handleAdd = async () => {
    if (!newName.trim()) return;
    try {
      const number = await api.createNumber({ name: newName, phone: newPhone, engine: newEngine });
      setNumbers((prev) => [...prev, number]);
      setNewName('');
      setNewPhone('');
      setShowAddForm(false);
    } catch (e: any) {
      alert('Erro ao criar número: ' + e.message);
    }
  };

  const handleConnect = async (id: string) => {
    setLoad(id, true);
    try {
      console.log(`[Connect] Iniciando conexão para número: ${id}`);
      await api.connectNumber(id);
      console.log(`[Connect] Sucesso para número: ${id}`);
    } catch (e: any) {
      console.error('[Connect] Erro completo:', {
        status: e.response?.status,
        statusText: e.response?.statusText,
        data: e.response?.data,
        message: e.message,
      });
      const errorMsg: string = e.response?.data?.message || e.response?.data?.error || e.message || 'Erro desconhecido';
      const isBrowserError =
        errorMsg.toLowerCase().includes('executablepath') ||
        errorMsg.toLowerCase().includes('chromium') ||
        errorMsg.toLowerCase().includes('browser was not found');
      if (isBrowserError) {
        const switchToBaileys = window.confirm(
          `❌ Chromium não encontrado no servidor.\n\n` +
          `O engine whatsapp-web.js requer um browser instalado no servidor.\n\n` +
          `Deseja trocar automaticamente para Baileys (não precisa de browser)?`
        );
        if (switchToBaileys) {
          await handleSwitchEngineSilent(id, 'baileys');
        }
      } else {
        alert(`Erro ao conectar: ${errorMsg}`);
      }
    } finally {
      setLoad(id, false);
    }
  };

  const handleSwitchEngineSilent = async (id: string, engine: Engine) => {
    try {
      await api.switchEngine(id, engine);
      setNumbers((prev: WNumber[]) =>
        prev.map((n: WNumber) => (n.id === id ? { ...n, engine } : n))
      );
      setTimeout(() => handleConnect(id), 500);
    } catch (e: any) {
      alert('Erro ao trocar engine: ' + e.message);
    }
  };

  const handleDisconnect = async (id: string) => {
    setLoad(id, true);
    try {
      console.log(`[Disconnect] Iniciando desconexão para número: ${id}`);
      await api.disconnectNumber(id);
      console.log(`[Disconnect] Sucesso para número: ${id}`);
    } catch (e: any) {
      console.error('[Disconnect] Erro completo:', {
        status: e.response?.status,
        statusText: e.response?.statusText,
        data: e.response?.data,
        message: e.message,
      });
      const message = e.response?.data?.message || e.response?.data?.error || e.message || 'Erro desconhecido';
      alert(`Erro ao desconectar: ${message}`);
    } finally {
      setLoad(id, false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Remover este número?')) return;
    try {
      await api.deleteNumber(id);
      setNumbers((prev) => prev.filter((n) => n.id !== id));
    } catch (e: any) {
      alert('Erro: ' + e.message);
    }
  };

  const handleSwitchEngine = async (id: string, currentEngine: Engine) => {
    const next: Engine = currentEngine === 'wwjs' ? 'baileys' : 'wwjs';
    const confirm = window.confirm(
      `Trocar para ${ENGINE_LABELS[next]}?\n\nIsso irá reconectar o número.`
    );
    if (!confirm) return;
    try {
      await api.switchEngine(id, next);
      setNumbers((prev) =>
        prev.map((n) => (n.id === id ? { ...n, engine: next } : n))
      );
    } catch (e: any) {
      alert('Erro: ' + e.message);
    }
  };

  const handleSendTest = async () => {
    if (!testMsg) return;
    try {
      await api.sendText(testMsg.id, testMsg.to, testMsg.text);
      alert('Mensagem enviada!');
      setTestMsg(null);
    } catch (e: any) {
      alert('Erro: ' + (e.response?.data?.error || e.message));
    }
  };

  const connectedCount = numbers.filter(
    (n) => (n.live_status || n.status) === 'connected'
  ).length;

  return (
    <div>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Números WhatsApp</h1>
          <p className={styles.subtitle}>
            {connectedCount} de {numbers.length} conectados
          </p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.btnSecondary} onClick={onRefresh}>
            <RefreshCw size={15} />
            Atualizar
          </button>
          <button className={styles.btnPrimary} onClick={() => setShowAddForm(true)}>
            <Plus size={15} />
            Adicionar Número
          </button>
        </div>
      </div>

      {/* Engine info banner */}
      <div className={styles.infoBanner}>
        <span>
          💡 <strong>Auto-seleção de engine:</strong> até 10 números usa{' '}
          <strong>whatsapp-web.js</strong> (mais seguro). Acima de 10 recomenda{' '}
          <strong>Baileys</strong> (mais leve). Você pode trocar por número individualmente.
        </span>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className={styles.addForm}>
          <h3>Novo Número</h3>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Nome / Apelido</label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex: Número Marketing 1"
                className={styles.input}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Telefone (opcional)</label>
              <input
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="5511999999999"
                className={styles.input}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Engine</label>
              <select
                value={newEngine}
                onChange={(e) => setNewEngine(e.target.value as Engine)}
                className={styles.select}
              >
                <option value="wwjs">whatsapp-web.js (até ~10 números)</option>
                <option value="baileys">Baileys (10+ números, mais leve)</option>
              </select>
            </div>
          </div>
          <div className={styles.formActions}>
            <button className={styles.btnSecondary} onClick={() => setShowAddForm(false)}>
              Cancelar
            </button>
            <button className={styles.btnPrimary} onClick={handleAdd}>
              Criar
            </button>
          </div>
        </div>
      )}

      {/* Numbers grid */}
      {numbers.length === 0 ? (
        <div className={styles.empty}>
          <span>📱</span>
          <p>Nenhum número adicionado ainda.</p>
          <p>Clique em "Adicionar Número" para começar.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {numbers.map((num) => {
            const status = (num.live_status || num.status) as NumberStatus;
            const color = STATUS_COLORS[status] || '#8b949e';
            const isConnected = status === 'connected';
            const isConnecting = status === 'connecting' || status === 'qr_pending';

            return (
              <div key={num.id} className={styles.card}>
                {/* Status bar */}
                <div className={styles.cardStatusBar} style={{ background: color }} />

                <div className={styles.cardContent}>
                  {/* Top row */}
                  <div className={styles.cardTop}>
                    <div>
                      <div className={styles.cardName}>{num.name || 'Sem nome'}</div>
                      <div className={styles.cardPhone}>{num.phone || 'Aguardando conexão...'}</div>
                    </div>
                    <div
                      className={styles.statusBadge}
                      style={{ background: color + '22', color }}
                    >
                      <span
                        className={styles.statusDot}
                        style={{ background: color }}
                      />
                      {STATUS_LABELS[status]}
                    </div>
                  </div>

                  {/* Engine badge */}
                  <div className={styles.engineRow}>
                    <span
                      className={`${styles.engineBadge} ${
                        num.engine === 'baileys' ? styles.engineBaileys : styles.engineWwjs
                      }`}
                    >
                      {ENGINE_LABELS[num.engine]}
                    </span>
                    <button
                      className={styles.switchEngineBtn}
                      onClick={() => handleSwitchEngine(num.id, num.engine)}
                      title="Trocar engine"
                    >
                      <ChevronsUpDown size={13} />
                      Trocar
                    </button>
                  </div>

                  {/* QR Code */}
                  {qrMap[num.id] && (
                    <div className={styles.qrSection}>
                      <p className={styles.qrLabel}>📱 Escaneie com o WhatsApp:</p>
                      <img
                        src={qrMap[num.id]}
                        alt="QR Code"
                        className={styles.qrImage}
                      />
                    </div>
                  )}

                  {/* Actions */}
                  <div className={styles.cardActions}>
                    {!isConnected && !isConnecting && (
                      <button
                        className={styles.btnConnect}
                        onClick={() => handleConnect(num.id)}
                        disabled={loading[num.id]}
                      >
                        <Zap size={14} />
                        {loading[num.id] ? 'Aguarde...' : 'Conectar'}
                      </button>
                    )}
                    {(isConnected || isConnecting) && (
                      <button
                        className={styles.btnDisconnect}
                        onClick={() => handleDisconnect(num.id)}
                        disabled={loading[num.id]}
                      >
                        <ZapOff size={14} />
                        Desconectar
                      </button>
                    )}
                    {isConnected && num.phone && (
                      <button
                        className={styles.btnTest}
                        onClick={() =>
                          setTestMsg({ id: num.id, to: '', text: '' })
                        }
                      >
                        <Send size={14} />
                        Testar
                      </button>
                    )}
                    <button
                      className={styles.btnDelete}
                      onClick={() => handleDelete(num.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Test message modal */}
      {testMsg && (
        <div className={styles.modal}>
          <div className={styles.modalBox}>
            <h3>Enviar mensagem de teste</h3>
            <div className={styles.formGroup}>
              <label>Para (número com DDD)</label>
              <input
                className={styles.input}
                placeholder="5511999999999"
                value={testMsg.to}
                onChange={(e) => setTestMsg({ ...testMsg, to: e.target.value })}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Mensagem</label>
              <textarea
                className={styles.textarea}
                rows={3}
                value={testMsg.text}
                onChange={(e) => setTestMsg({ ...testMsg, text: e.target.value })}
              />
            </div>
            <div className={styles.formActions}>
              <button className={styles.btnSecondary} onClick={() => setTestMsg(null)}>
                Cancelar
              </button>
              <button className={styles.btnPrimary} onClick={handleSendTest}>
                Enviar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
