import React, { useEffect, useState } from 'react';
import { WNumber } from '../App';
import * as api from '../api';
import styles from './SchedulerPanel.module.css';
import { Plus, Trash2, Play, Pause } from 'lucide-react';

interface Task {
  id: string;
  name: string;
  type: string;
  cronExpression?: string;
  cron_expression?: string;
  enabled: boolean;
  config: Record<string, any>;
  last_run?: string | null;
  lastRun?: string | null;
}

interface Group {
  id: string;
  name: string;
}

interface MediaItem {
  id: string;
  name: string;
  type: string;
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
  send_image: '🖼️ Enviar Imagem',
  send_video: '📹 Enviar Vídeo',
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
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    type: 'warm_group',
    cronExpression: '*/30 * * * *',
    enabled: true,
    config: {
      groupId: '',
      fromId: '',
      toId: '',
      messagesPerCycle: 3,
      messages: 2,
      imageId: '',
      videoId: '',
      caption: '',
    },
  });
  const [triggering, setTriggering] = useState<string | null>(null);

  const needsGroup = ['warm_group', 'send_audio', 'send_sticker', 'send_reaction', 'send_image', 'send_video'].includes(form.type);
  const needsPair = form.type === 'warm_pair';

  useEffect(() => {
    api.getTasks().then(setTasks).catch(() => {});
    api.getGroups().then(setGroups).catch(() => {});
    api.getMedia().then(setMediaItems).catch(() => {});
  }, []);

  const handleCreate = async () => {
    if (!form.name.trim()) {
      alert('Informe um nome para a tarefa.');
      return;
    }
    if (needsGroup && !form.config.groupId) {
      alert('Selecione um grupo para esta tarefa.');
      return;
    }
    if (needsPair && (!form.config.fromId || !form.config.toId)) {
      alert('Selecione o número remetente e o destinatário.');
      return;
    }
    try {
      const task = await api.createTask({ ...form, config: form.config });
      setTasks((prev) => [...prev, task]);
      setShowForm(false);
    } catch (e: any) {
      const msg = e.response?.data?.message || e.response?.data?.error || e.message || 'Erro desconhecido';
      console.error('[CreateTask] Erro completo:', e.response?.data);
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
      const updated = await api.updateTask(task.id, { ...task, enabled: !task.enabled });
      setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
    } catch (e: any) {
      alert('Erro ao atualizar tarefa: ' + (e.response?.data?.message || e.message));
    }
  };

  const handleTrigger = async (task: Task) => {
    const needsGroupTypes = ['warm_group', 'send_audio', 'send_sticker', 'send_reaction', 'send_image', 'send_video'];
    const cfg = task.config || {};
    const gid = cfg.group_id || cfg.groupId || '';
    if (needsGroupTypes.includes(task.type) && !gid) {
      alert(
        '⚠️ Esta tarefa não tem grupo configurado (foi criada com erro anterior).\n\n' +
        'Exclua esta tarefa e crie uma nova selecionando o grupo correto.'
      );
      return;
    }
    const fid = cfg.from_id || cfg.fromId || '';
    const tid = cfg.to_id || cfg.toId || '';
    if (task.type === 'warm_pair' && (!fid || !tid)) {
      alert(
        '⚠️ Esta tarefa não tem remetente/destinatário configurado.\n\n' +
        'Exclua e crie uma nova tarefa.'
      );
      return;
    }
    setTriggering(task.id);
    try {
      await api.triggerTask(task.id);
      alert('Tarefa executada!');
    } catch (e: any) {
      const msg = e.response?.data?.message || e.response?.data?.error || e.response?.data || e.message || 'Erro desconhecido';
      console.error('[Trigger] Erro completo:', e.response?.data);
      alert(`Erro ao executar tarefa (${e.response?.status ?? '?'}): ${typeof msg === 'object' ? JSON.stringify(msg) : msg}`);
    } finally {
      setTriggering(null);
    }
  };

  const needsGroupRender = ['warm_group', 'send_audio', 'send_sticker', 'send_reaction', 'send_image', 'send_video'].includes(form.type);
  const needsPairRender = form.type === 'warm_pair';
  const images = mediaItems.filter((m) => m.type === 'image');
  const videos = mediaItems.filter((m) => m.type === 'video');

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
                value={form.config.groupId}
                onChange={(e) =>
                  setForm({ ...form, config: { ...form.config, groupId: e.target.value } })
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
                value={form.config.messagesPerCycle}
                onChange={(e) =>
                  setForm({
                    ...form,
                    config: { ...form.config, messagesPerCycle: parseInt(e.target.value) },
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
                  value={form.config.fromId}
                  onChange={(e) =>
                    setForm({ ...form, config: { ...form.config, fromId: e.target.value } })
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
                  value={form.config.toId}
                  onChange={(e) =>
                    setForm({ ...form, config: { ...form.config, toId: e.target.value } })
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

          {form.type === 'send_image' && (
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Imagem (opcional — aleatória se vazio)</label>
                <select
                  className={styles.select}
                  value={form.config.imageId}
                  onChange={(e) =>
                    setForm({ ...form, config: { ...form.config, imageId: e.target.value } })
                  }
                >
                  <option value="">Aleatória da biblioteca</option>
                  {images.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Legenda (opcional)</label>
                <input
                  className={styles.input}
                  value={form.config.caption}
                  onChange={(e) =>
                    setForm({ ...form, config: { ...form.config, caption: e.target.value } })
                  }
                  placeholder="Texto que acompanha a imagem..."
                />
              </div>
            </div>
          )}

          {form.type === 'send_video' && (
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Vídeo (opcional — aleatório se vazio)</label>
                <select
                  className={styles.select}
                  value={form.config.videoId}
                  onChange={(e) =>
                    setForm({ ...form, config: { ...form.config, videoId: e.target.value } })
                  }
                >
                  <option value="">Aleatório da biblioteca</option>
                  {videos.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Legenda (opcional)</label>
                <input
                  className={styles.input}
                  value={form.config.caption}
                  onChange={(e) =>
                    setForm({ ...form, config: { ...form.config, caption: e.target.value } })
                  }
                  placeholder="Texto que acompanha o vídeo..."
                />
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
                <div className={styles.taskCron}>🕐 {task.cronExpression || task.cron_expression}</div>
                {(task.last_run || task.lastRun) && (
                  <div className={styles.taskLastRun}>
                    Última execução: {new Date((task.last_run || task.lastRun)!).toLocaleString('pt-BR')}
                  </div>
                )}
              </div>
              <div className={styles.taskActions}>
                <button
                  className={styles.btnTrigger}
                  onClick={() => handleTrigger(task)}
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
