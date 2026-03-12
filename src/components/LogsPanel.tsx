import React from 'react';
import { ConversationLog } from '../App';
import styles from './LogsPanel.module.css';

interface Props {
  logs: ConversationLog[];
}

const TYPE_ICONS: Record<string, string> = {
  text: '💬',
  audio: '🎵',
  sticker: '🎭',
  reaction: '❤️',
};

export default function LogsPanel({ logs }: Props) {
  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>Log de Conversas</h1>
        <p className={styles.subtitle}>Mensagens trocadas em tempo real ({logs.length} registros)</p>
      </div>

      {logs.length === 0 ? (
        <div className={styles.empty}>
          <span>📋</span>
          <p>Nenhuma conversa registrada ainda.</p>
          <p>As mensagens aparecem aqui em tempo real quando os agendamentos executam.</p>
        </div>
      ) : (
        <div className={styles.logList}>
          {logs.map((log, i) => (
            <div key={i} className={styles.logItem}>
              <div className={styles.logType}>{TYPE_ICONS[log.type] || '💬'}</div>
              <div className={styles.logContent}>
                <div className={styles.logRoute}>
                  <span className={styles.fromName}>{log.from}</span>
                  <span className={styles.arrow}>→</span>
                  <span className={styles.toName}>{log.to}</span>
                </div>
                <div className={styles.logMessage}>{log.message}</div>
              </div>
              <div className={styles.logTime}>
                {log.sent_at
                  ? new Date(log.sent_at).toLocaleTimeString('pt-BR')
                  : '—'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
