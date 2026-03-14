import React, { useState, useEffect, useCallback } from 'react';
import { UserPlus } from 'lucide-react';
import { getAdminUsers, createAdminUser, updateAdminUser, deleteAdminUser } from '../api';
import styles from './AdminPanel.module.css';

// Módulos disponíveis no sistema
const ALL_MODULES = [
  { key: 'numbers', label: 'Números' },
  { key: 'groups', label: 'Grupos' },
  { key: 'scheduler', label: 'Agendamentos' },
  { key: 'media', label: 'Mídia' },
  { key: 'logs', label: 'Logs' },
  { key: 'settings', label: 'Configurações' },
] as const;

interface User {
  id: string;
  username: string;
  role: 'admin' | 'user';
  enabled: boolean;
  modules: string[];
  createdAt?: string;
}

interface ModalState {
  open: boolean;
  mode: 'create' | 'edit';
  user?: User;
}

export default function AdminPanel() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<ModalState>({ open: false, mode: 'create' });

  // Form fields
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState<'admin' | 'user'>('user');
  const [formEnabled, setFormEnabled] = useState(true);
  const [formModules, setFormModules] = useState<string[]>(ALL_MODULES.map((m) => m.key));
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      const data = await getAdminUsers();
      setUsers(data);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const openCreate = () => {
    setFormUsername('');
    setFormPassword('');
    setFormRole('user');
    setFormEnabled(true);
    setFormModules(ALL_MODULES.map((m) => m.key));
    setFormError('');
    setModal({ open: true, mode: 'create' });
  };

  const openEdit = (user: User) => {
    setFormUsername(user.username);
    setFormPassword('');
    setFormRole(user.role);
    setFormEnabled(user.enabled);
    setFormModules(user.modules || ALL_MODULES.map((m) => m.key));
    setFormError('');
    setModal({ open: true, mode: 'edit', user });
  };

  const toggleModule = (key: string) => {
    setFormModules((prev) =>
      prev.includes(key) ? prev.filter((m) => m !== key) : [...prev, key]
    );
  };

  const handleSave = async () => {
    setFormError('');
    setSaving(true);

    try {
      if (modal.mode === 'create') {
        if (!formUsername || !formPassword) {
          setFormError('Usuário e senha são obrigatórios');
          setSaving(false);
          return;
        }
        await createAdminUser({
          username: formUsername,
          password: formPassword,
          role: formRole,
          enabled: formEnabled,
          modules: formModules,
        });
      } else if (modal.user) {
        const payload: any = {
          role: formRole,
          enabled: formEnabled,
          modules: formModules,
        };
        if (formPassword) payload.password = formPassword;
        await updateAdminUser(modal.user.id, payload);
      }

      setModal({ open: false, mode: 'create' });
      await fetchUsers();
    } catch (e: any) {
      setFormError(e.response?.data?.error || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleEnabled = async (user: User) => {
    try {
      await updateAdminUser(user.id, { enabled: !user.enabled });
      await fetchUsers();
    } catch {}
  };

  const handleDelete = async (user: User) => {
    if (!confirm(`Tem certeza que deseja excluir "${user.username}"?`)) return;
    try {
      await deleteAdminUser(user.id);
      await fetchUsers();
    } catch {}
  };

  if (loading) {
    return <div className={styles.empty}>Carregando usuários...</div>;
  }

  return (
    <div>
      <div className={styles.header}>
        <h2>👤 Administração de Usuários</h2>
        <button className={styles.createBtn} onClick={openCreate}>
          <UserPlus size={16} /> Novo Usuário
        </button>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {users.length === 0 ? (
        <div className={styles.empty}>Nenhum usuário cadastrado.</div>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Usuário</th>
              <th>Perfil</th>
              <th>Status</th>
              <th>Módulos</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.username}</td>
                <td>
                  <span className={u.role === 'admin' ? styles.badgeAdmin : styles.badgeUser}>
                    {u.role === 'admin' ? 'Admin' : 'Usuário'}
                  </span>
                </td>
                <td>
                  <span className={u.enabled ? styles.statusActive : styles.statusDisabled}>
                    {u.enabled ? 'Ativo' : 'Desativado'}
                  </span>
                </td>
                <td>
                  {(u.modules || []).length === ALL_MODULES.length
                    ? 'Todos'
                    : (u.modules || [])
                        .map((m) => ALL_MODULES.find((a) => a.key === m)?.label || m)
                        .join(', ') || 'Nenhum'}
                </td>
                <td>
                  <div className={styles.actions}>
                    <button className={styles.actionBtn} onClick={() => openEdit(u)}>
                      Editar
                    </button>
                    <button
                      className={styles.actionBtn}
                      onClick={() => handleToggleEnabled(u)}
                    >
                      {u.enabled ? 'Desativar' : 'Ativar'}
                    </button>
                    <button
                      className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                      onClick={() => handleDelete(u)}
                    >
                      Excluir
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Modal Criar / Editar */}
      {modal.open && (
        <div className={styles.overlay} onClick={() => setModal({ open: false, mode: 'create' })}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3>{modal.mode === 'create' ? 'Novo Usuário' : `Editar: ${modal.user?.username}`}</h3>

            <div className={styles.form}>
              {modal.mode === 'create' && (
                <div className={styles.field}>
                  <label>Usuário</label>
                  <input
                    type="text"
                    value={formUsername}
                    onChange={(e) => setFormUsername(e.target.value)}
                    placeholder="nome_de_usuario"
                  />
                </div>
              )}

              <div className={styles.field}>
                <label>{modal.mode === 'create' ? 'Senha' : 'Nova senha (deixe vazio para manter)'}</label>
                <input
                  type="password"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>

              <div className={styles.field}>
                <label>Perfil</label>
                <select value={formRole} onChange={(e) => setFormRole(e.target.value as any)}>
                  <option value="user">Usuário</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              <div className={styles.field}>
                <label>Status</label>
                <select
                  value={formEnabled ? 'true' : 'false'}
                  onChange={(e) => setFormEnabled(e.target.value === 'true')}
                >
                  <option value="true">Ativo</option>
                  <option value="false">Desativado</option>
                </select>
              </div>

              <div className={styles.field}>
                <label>Módulos permitidos</label>
                <div className={styles.modulesGrid}>
                  {ALL_MODULES.map((m) => (
                    <label key={m.key} className={styles.moduleCheck}>
                      <input
                        type="checkbox"
                        checked={formModules.includes(m.key)}
                        onChange={() => toggleModule(m.key)}
                      />
                      <span>{m.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {formError && <div className={styles.error}>{formError}</div>}

              <div className={styles.modalActions}>
                <button
                  className={styles.cancelBtn}
                  onClick={() => setModal({ open: false, mode: 'create' })}
                >
                  Cancelar
                </button>
                <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
