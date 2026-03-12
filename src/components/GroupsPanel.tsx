import React, { useEffect, useState } from 'react';
import { WNumber } from '../App';
import * as api from '../api';
import styles from './GroupsPanel.module.css';
import { Plus, Trash2, UserMinus, UserPlus } from 'lucide-react';

interface GroupMember {
  groupId: string;
  numberId: string;
  number: WNumber;
}

interface Group {
  id: string;
  name: string;
  members: GroupMember[];
  createdAt: string;
}

interface Props {
  numbers: WNumber[];
}

export default function GroupsPanel({ numbers }: Props) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [addingMember, setAddingMember] = useState<{ groupId: string; numberId: string } | null>(null);

  useEffect(() => {
    api.getGroups().then(setGroups).catch(() => {});
  }, []);

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    const group = await api.createGroup(newGroupName);
    setGroups((prev) => [...prev, { ...group, members: [] }]);
    setNewGroupName('');
    setShowForm(false);
  };

  const handleDeleteGroup = async (id: string) => {
    if (!window.confirm('Remover este grupo?')) return;
    await api.deleteGroup(id);
    setGroups((prev) => prev.filter((g) => g.id !== id));
  };

  const handleAddMember = async (groupId: string, numberId: string) => {
    if (!numberId) return;
    const updated = await api.addMember(groupId, numberId);
    setGroups((prev) => prev.map((g) => (g.id === groupId ? updated : g)));
    setAddingMember(null);
  };

  const handleRemoveMember = async (groupId: string, numberId: string) => {
    const updated = await api.removeMember(groupId, numberId);
    setGroups((prev) => prev.map((g) => (g.id === groupId ? updated : g)));
  };

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Grupos de Aquecimento</h1>
          <p className={styles.subtitle}>
            Organize números em grupos para conversas automatizadas entre si
          </p>
        </div>
        <button className={styles.btnPrimary} onClick={() => setShowForm(true)}>
          <Plus size={15} />
          Novo Grupo
        </button>
      </div>

      {showForm && (
        <div className={styles.addForm}>
          <input
            className={styles.input}
            placeholder="Nome do grupo"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateGroup()}
          />
          <div className={styles.formActions}>
            <button className={styles.btnSecondary} onClick={() => setShowForm(false)}>
              Cancelar
            </button>
            <button className={styles.btnPrimary} onClick={handleCreateGroup}>
              Criar
            </button>
          </div>
        </div>
      )}

      {groups.length === 0 ? (
        <div className={styles.empty}>
          <span>👥</span>
          <p>Nenhum grupo criado.</p>
          <p>Crie grupos para organizar os números em conversas automáticas.</p>
        </div>
      ) : (
        <div className={styles.groupList}>
          {groups.map((group) => {
            const availableToAdd = numbers.filter(
              (n) => !group.members.some((m) => m.numberId === n.id)
            );

            return (
              <div key={group.id} className={styles.groupCard}>
                <div className={styles.groupHeader}>
                  <div>
                    <div className={styles.groupName}>{group.name}</div>
                    <div className={styles.groupMeta}>
                      {group.members.length} membro(s)
                    </div>
                  </div>
                  <div className={styles.groupActions}>
                    {availableToAdd.length > 0 && (
                      <button
                        className={styles.btnAdd}
                        onClick={() =>
                          setAddingMember({ groupId: group.id, numberId: '' })
                        }
                      >
                        <UserPlus size={13} />
                        Adicionar
                      </button>
                    )}
                    <button
                      className={styles.btnDelete}
                      onClick={() => handleDeleteGroup(group.id)}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Add member selector */}
                {addingMember?.groupId === group.id && (
                  <div className={styles.addMemberRow}>
                    <select
                      className={styles.select}
                      value={addingMember.numberId}
                      onChange={(e) =>
                        setAddingMember({ ...addingMember, numberId: e.target.value })
                      }
                    >
                      <option value="">Selecione um número...</option>
                      {availableToAdd.map((n) => (
                        <option key={n.id} value={n.id}>
                          {n.name || n.phone || n.id}
                        </option>
                      ))}
                    </select>
                    <button
                      className={styles.btnPrimary}
                      onClick={() => handleAddMember(group.id, addingMember.numberId)}
                    >
                      Confirmar
                    </button>
                    <button
                      className={styles.btnSecondary}
                      onClick={() => setAddingMember(null)}
                    >
                      Cancelar
                    </button>
                  </div>
                )}

                {/* Members list */}
                <div className={styles.membersList}>
                  {group.members.length === 0 ? (
                    <p className={styles.noMembers}>Nenhum membro. Adicione números ao grupo.</p>
                  ) : (
                    group.members.map((m) => (
                      <div key={m.numberId} className={styles.memberItem}>
                        <div className={styles.memberInfo}>
                          <span className={styles.memberAvatar}>
                            {(m.number?.name || 'N')[0].toUpperCase()}
                          </span>
                          <div>
                            <div className={styles.memberName}>{m.number?.name || 'Sem nome'}</div>
                            <div className={styles.memberPhone}>{m.number?.phone || '—'}</div>
                          </div>
                        </div>
                        <button
                          className={styles.btnRemoveMember}
                          onClick={() => handleRemoveMember(group.id, m.numberId)}
                          title="Remover do grupo"
                        >
                          <UserMinus size={13} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
