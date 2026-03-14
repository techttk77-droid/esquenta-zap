import React, { useEffect, useState } from 'react';
import { WNumber } from '../App';
import * as api from '../api';
import styles from './SchedulerPanel.module.css';
import { Plus, Trash2, Play, Pause } from 'lucide-react';

interface Task {
  id: string;
  name: string;
  type: string;
  cronExpression: string;
  enabled: number;
  config: Record<string, any>;
  last_run: string | null;
}

interface Group {
  id: string;
  name: string;
}

interface Props {
  numbers: WNumber[];
}

const TASK_TYPES: Record<string, string> = {
  warm_group: '💬 Conversa em Grupo',
  warm_pair: '👥 Conversa em Par',
  send_audio: '🎵 Enviar Áudio',
  send_sticker: '🎭 Enviar Figurinha',
  send_reaction: '❤️ Enviar Reação',
};

const CRON_PRESETS = [
  { label: 'A cada 15 min', value: '*/15 * * * *' },
  { label: 'A cada 20 min', value: '*/20 * * * *' },
  { label: 'A cada 30 min', value: '*/30 * * * *' },
  { label: 'A cada 1 hora', value: '0 * * * *' },
  { label: 'A cada 2 horas', value: '0 */2 * * *' },
  { label: 'A cada 4 horas', value: '0 */4 * * *' },
  { label: '3x por dia', value: '0 8,13,18 * * *' },
  { label: '1x por dia (9h)', value: '0 9 * * *' },
];

export default function SchedulerPanel({ numbers }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    type: 'warm_group',
    cronExpression: '*/30 * * * *',
    enabled: 1,
    config: {
      group_id: '',
      from_id: '',
      to_id: '',
      messages_per_cycle: 3,
      messages: 2,
    },
  });
  const [triggering, setTriggering] = useState<string | null>(null);

  const needsGroup = ['warm_group', 'send_audio', 'send_sticker', 'send_reaction'].includes(form.type);
  const needsPair = form.type === 'warm_pair';

  useEffect(() => {
    api.getTasks().then(setTasks).catch(() => {});
    api.getGroups().then(setGroups).catch(() => {});
  }, []);

  const handleCreate = async () => {
    if (!form.name.trim()) {
      alert('Informe um nome para a tarefa.');
      return;
    }
    if (needsGroup && !form.config.group_id) {
      alert('Selecione um grupo para esta tarefa.');
      return;
    }
    if (needsPair && (!form.config.from_id || !form.config.to_id)) {
      alert('Selecione o número remetente e o destinatário.');
      return;
    }
    try {
      const task = await api.createTask({ ...form, config: form.config });
      setTasks((prev) => [...prev, task]);
      setShowForm(false);
    } catch (e: any) {
      const msg = e.response?.data?.message || e.response?.data?.error || e.message || 'Erro desconhecido';
      alert(`Erro ao criar tarefa: ${msg}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Remover tarefa?')) return;
    try {
      await api.deleteTask(id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch (e: any) {
      alert('Erro ao remover: ' + (e.response?.data?.message || e.message));
    }
  };

  const handleToggle = async (task: Task) => {
    try {
      const updated = await api.updateTask(task.id, { ...task, enabled: task.enabled ? 0 : 1 });
      setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
    } catch (e: any) {
      alert('Erro ao atualizar tarefa: ' + (e.response?.data?.message || e.message));
    }
  };

  const handleTrigger = async (id: string) => {
    setTriggering(id);
    try {
      await api.triggerTask(id);
      alert('Tarefa executada!');
    } catch (e: any) {
      alert('Erro: ' + e.message);
    } finally {
      setTriggering(null);
    }
  };

  const needsGroupRender = ['warm_group', 'send_audio', 'send_sticker', 'send_reaction'].includes(form.type);
  const needsPairRender = form.type === 'warm_pair';

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Agendamentos</h1>
          <p className={styles.subtitle}>
            Configure tarefas automáticas de aquecimento pra ficar on sempre.
          </p>
        </div>
        <button className={styles.btnPrimary} onClick={() => setShowForm(true)}>
          <Plus size={15} />
          Nova Tarefa
        </button>
      </div>

      {showForm && (
        <div className={styles.addForm}>
          <h3>Nova Tarefa Agendada</h3>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Nome da Tarefa</label>
              <input
                className={styles.input}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: Aquecimento Grupo 1"
              />
            </div>
            <div className={styles.formGroup}>
              <label>Tipo</label>
              <select
                className={styles.select}
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                {Object.entries(TASK_TYPES).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Frequência (Cron)</label>
              <select
                className={styles.select}
                value={form.cronExpression}
                onChange={(e) => setForm({ ...form, cronExpression: e.target.value })}
              >
                {CRON_PRESETS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label} — {p.value}</option>
                ))}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>Expressão Cron personalizada</label>
              <input
                className={styles.input}
                value={form.cronExpression}
                onChange={(e) => setForm({ ...form, cronExpression: e.target.value })}
              />
            </div>
          </div>

          {needsGroupRender && (
            <div className={styles.formGroup}>
              <label>Grupo</label>
              <select
                className={styles.select}
                value={form.config.group_id}
                onChange={(e) =>
                  setForm({ ...form, config: { ...form.config, group_id: e.target.value } })
                }
              >
                <option value="">Selecione um grupo...</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
          )}

          {form.type === 'warm_group' && (
            <div className={styles.formGroup}>
              <label>Mensagens por ciclo</label>
              <input
                type="number"
                className={styles.input}
                min={1}
                max={10}
                value={form.config.messages_per_cycle}
                onChange={(e) =>
                  setForm({
                    ...form,
                    config: { ...form.config, messages_per_cycle: parseInt(e.target.value) },
                  })
                }
              />
            </div>
          )}

          {needsPairRender && (
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Número Remetente</label>
                <select
                  className={styles.select}
                  value={form.config.from_id}
                  onChange={(e) =>
                    setForm({ ...form, config: { ...form.config, from_id: e.target.value } })
                  }
                >
                  <option value="">Selecione...</option>
                  {numbers.map((n) => (
                    <option key={n.id} value={n.id}>{n.name || n.phone || n.id}</option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Número Destinatário</label>
                <select
                  className={styles.select}
                  value={form.config.to_id}
                  onChange={(e) =>
                    setForm({ ...form, config: { ...form.config, to_id: e.target.value } })
                  }
                >
                  <option value="">Selecione...</option>
                  {numbers.map((n) => (
                    <option key={n.id} value={n.id}>{n.name || n.phone || n.id}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className={styles.formActions}>
            <button className={styles.btnSecondary} onClick={() => setShowForm(false)}>
              Cancelar
            </button>
            <button className={styles.btnPrimary} onClick={handleCreate}>
              Criar Tarefa
            </button>
          </div>
        </div>
      )}

      {tasks.length === 0 ? (
        <div className={styles.empty}>
          <span>⏰</span>
          <p>Nenhum agendamento configurado.</p>
          <p>Crie tarefas para automatizar as conversas de aquecimento.</p>
        </div>
      ) : (
        <div className={styles.taskList}>
          {tasks.map((task) => (
            <div key={task.id} className={`${styles.taskCard} ${!task.enabled ? styles.taskDisabled : ''}`}>
              <div className={styles.taskLeft}>
                <div className={styles.taskType}>{TASK_TYPES[task.type] || task.type}</div>
                <div className={styles.taskName}>{task.name}</div>
                <div className={styles.taskCron}>🕐 {task.cronExpression}</div>
                {task.last_run && (
                  <div className={styles.taskLastRun}>
                    Última execução: {new Date(task.last_run).toLocaleString('pt-BR')}
                  </div>
                )}
              </div>
              <div className={styles.taskActions}>
                <button
                  className={styles.btnTrigger}
                  onClick={() => handleTrigger(task.id)}
                  disabled={triggering === task.id}
                  title="Executar agora"
                >
                  <Play size={13} />
                  {triggering === task.id ? 'Executando...' : 'Executar'}
                </button>
                <button
                  className={task.enabled ? styles.btnPause : styles.btnEnable}
                  onClick={() => handleToggle(task)}
                  title={task.enabled ? 'Pausar' : 'Ativar'}
                >
                  {task.enabled ? <Pause size={13} /> : <Play size={13} />}
                  {task.enabled ? 'Pausar' : 'Ativar'}
                </button>
                <button
                  className={styles.btnDelete}
                  onClick={() => handleDelete(task.id)}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
