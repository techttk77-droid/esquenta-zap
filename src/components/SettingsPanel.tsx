import React, { useEffect, useState } from 'react';
import * as api from '../api';
import styles from './SettingsPanel.module.css';
import { Save, Info } from 'lucide-react';

interface Props {
  numbersCount: number;
}

export default function SettingsPanel({ numbersCount }: Props) {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.getSettings().then(setSettings).catch(() => {});
  }, []);

  const handleSave = async () => {
    await api.updateSettings({ ...settings, default_engine: 'baileys' });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const set = (key: string, value: string) =>
    setSettings((prev) => ({ ...prev, [key]: value }));

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>Configurações</h1>
        <p className={styles.subtitle}>Ajuste o comportamento do sistema de aquecimento</p>
      </div>

      {/* Engine recommendation */}
      <div className={styles.infoBanner}>
        <Info size={16} />
        <div>
          <strong>Engine ativa:</strong> todos os {numbersCount} número(s) usam <strong style={{ color: '#a78bfa' }}>Baileys</strong>.
          Este painel mantém somente a configuração suportada atualmente.
        </div>
      </div>

      <div className={styles.sections}>
        {/* Delay */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>⏱️ Delay entre mensagens</h3>
          <p className={styles.sectionDesc}>
            Simula comportamento humano. Um valor aleatório entre mínimo e máximo é usado.
          </p>
          <div className={styles.row}>
            <div className={styles.field}>
              <label>Delay mínimo (ms)</label>
              <input
                type="number"
                className={styles.input}
                value={settings.min_delay_ms || '5000'}
                onChange={(e) => set('min_delay_ms', e.target.value)}
                min={1000}
              />
              <span className={styles.hint}>{((parseInt(settings.min_delay_ms) || 5000) / 1000).toFixed(1)}s</span>
            </div>
            <div className={styles.field}>
              <label>Delay máximo (ms)</label>
              <input
                type="number"
                className={styles.input}
                value={settings.max_delay_ms || '15000'}
                onChange={(e) => set('max_delay_ms', e.target.value)}
                min={2000}
              />
              <span className={styles.hint}>{((parseInt(settings.max_delay_ms) || 15000) / 1000).toFixed(1)}s</span>
            </div>
          </div>
        </div>

        {/* Behavior */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>🤖 Comportamento</h3>
          <div className={styles.row}>
            <div className={styles.field}>
              <label>Limite diário de mensagens por número</label>
              <input
                type="number"
                className={styles.input}
                value={settings.daily_msg_limit || '50'}
                onChange={(e) => set('daily_msg_limit', e.target.value)}
                min={1}
              />
              <span className={styles.hint}>Recomendado: 20–80 msg/dia em aquecimento</span>
            </div>
            <div className={styles.field}>
              <label>Simulação de digitação</label>
              <select
                className={styles.select}
                value={settings.typing_simulation || '1'}
                onChange={(e) => set('typing_simulation', e.target.value)}
              >
                <option value="1">✅ Ativada (mais humano)</option>
                <option value="0">❌ Desativada (mais rápido)</option>
              </select>
              <span className={styles.hint}>Exibe "digitando..." antes de enviar</span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.saveRow}>
        <button className={styles.btnSave} onClick={handleSave}>
          <Save size={15} />
          {saved ? '✅ Salvo!' : 'Salvar Configurações'}
        </button>
      </div>

      {/* Tips */}
      <div className={styles.tipsBox}>
        <h3>💡 Dicas para não ser banido</h3>
        <ul>
          <li>Use delays de pelo menos 5–15 segundos entre mensagens</li>
          <li>Não envie mais de 30–50 mensagens/dia por número novo</li>
          <li>Comece com poucos números e vá aumentando gradualmente</li>
          <li>Misture textos, áudios, figurinhas e reações para parecer humano</li>
          <li>Prefira horários comerciais (8h–22h)</li>
          <li>Salve os contatos no celular antes de iniciar conversas</li>
          <li>Baileys é o único engine mantido neste painel</li>
        </ul>
      </div>
    </div>
  );
}
