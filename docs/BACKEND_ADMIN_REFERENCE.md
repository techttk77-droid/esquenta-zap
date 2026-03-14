# 📋 Documentação Técnica — Backend Admin
## Esquenta Zap — Referência para implementação na API (Railway)

---

## 1. Alterações no Banco de Dados (Prisma)

### 1.1. Novos campos no model `User`

```prisma
model User {
  id         String   @id @default(uuid())
  username   String   @unique
  password   String
  role       String   @default("user")      // "admin" ou "user"
  enabled    Boolean  @default(true)         // false = login bloqueado
  modules    String   @default("numbers,groups,scheduler,media,logs,settings")
  machineId  String?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  // relações existentes...
  numbers    Number[]
  groups     Group[]
  tasks      Task[]
  media      Media[]
}
```

**Observações:**
- `role`: `"admin"` ou `"user"`. O primeiro usuário criado via register deve ser `admin` automaticamente.
- `enabled`: se `false`, o login deve retornar 403.
- `modules`: string com módulos separados por vírgula (ex: `"numbers,groups,media"`). No código, converter com `split(',')` e `join(',')`.

### 1.2. Migração

```bash
npx prisma migrate dev --name add_admin_fields
```

---

## 2. Middleware de Admin

Criar um middleware `adminMiddleware` que verifica se `req.user.role === 'admin'`:

```js
// middleware/admin.js
const db = require('../services/database');

async function adminMiddleware(req, res, next) {
  try {
    const user = await db.getUserById(req.user.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Acesso restrito a administradores' });
    }
    next();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

module.exports = { adminMiddleware };
```

---

## 3. Alterar Login — Validar `enabled` e retornar `role` + `modules`

No `POST /api/auth/login`, adicionar:

```js
// Após verificar senha...
if (!user.enabled) {
  return res.status(403).json({ error: 'Conta desativada. Contate o administrador.' });
}

// No response, incluir role e modules:
res.json({
  token,
  user: {
    id: user.id,
    username: user.username,
    role: user.role,                              // ← NOVO
    modules: user.modules.split(','),             // ← NOVO (array)
  },
  machineChanged,
});
```

---

## 4. Alterar GET /api/auth/me — Retornar `role` + `modules`

```js
router.get('/me', authMiddleware, async (req, res) => {
  const user = await db.getUserById(req.user.userId);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

  res.json({
    id: user.id,
    username: user.username,
    role: user.role,                              // ← NOVO
    modules: user.modules.split(','),             // ← NOVO
  });
});
```

---

## 5. Alterar POST /api/auth/register — Primeiro usuário = admin

```js
router.post('/register', async (req, res) => {
  // ... validações existentes ...

  const hash = await bcrypt.hash(password, 10);
  const userCount = await db.getUserCount();

  const user = await db.createUser({
    username,
    password: hash,
    role: userCount === 0 ? 'admin' : 'user',    // ← primeiro = admin
    modules: 'numbers,groups,scheduler,media,logs,settings',
  });

  // ... resto do código ...
});
```

---

## 6. Novos Endpoints — CRUD Admin

### Arquivo: `routes/admin.js`

```js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../services/database');
const { authMiddleware } = require('../middleware/auth');
const { adminMiddleware } = require('../middleware/admin');

// Todos os endpoints exigem auth + admin
router.use(authMiddleware);
router.use(adminMiddleware);
```

---

### 6.1. GET /api/admin/users — Listar todos os usuários

**Request:**
```
GET /api/admin/users
Authorization: Bearer <token>
```

**Response (200):**
```json
[
  {
    "id": "uuid-1",
    "username": "admin",
    "role": "admin",
    "enabled": true,
    "modules": ["numbers", "groups", "scheduler", "media", "logs", "settings"],
    "createdAt": "2026-03-14T..."
  },
  {
    "id": "uuid-2",
    "username": "operador1",
    "role": "user",
    "enabled": true,
    "modules": ["numbers", "groups"],
    "createdAt": "2026-03-14T..."
  }
]
```

**Implementação:**
```js
router.get('/users', async (req, res) => {
  try {
    const users = await db.getAllUsers();
    const result = users.map(u => ({
      id: u.id,
      username: u.username,
      role: u.role,
      enabled: u.enabled,
      modules: u.modules ? u.modules.split(',') : [],
      createdAt: u.createdAt,
    }));
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
```

---

### 6.2. POST /api/admin/users — Criar usuário

**Request:**
```
POST /api/admin/users
Authorization: Bearer <token>
Content-Type: application/json

{
  "username": "operador1",
  "password": "senha123",
  "role": "user",
  "enabled": true,
  "modules": ["numbers", "groups", "media"]
}
```

**Response (201):**
```json
{
  "id": "uuid-novo",
  "username": "operador1",
  "role": "user",
  "enabled": true,
  "modules": ["numbers", "groups", "media"]
}
```

**Erros:**
| Status | Condição |
|--------|----------|
| 400 | username ou password ausente |
| 409 | username já existe |

**Implementação:**
```js
router.post('/users', async (req, res) => {
  const { username, password, role, enabled, modules } = req.body;

  if (!username || !password)
    return res.status(400).json({ error: 'username e password são obrigatórios' });
  if (password.length < 6)
    return res.status(400).json({ error: 'password deve ter ao menos 6 caracteres' });

  try {
    const existing = await db.getUserByUsername(username);
    if (existing) return res.status(409).json({ error: 'Usuário já existe' });

    const hash = await bcrypt.hash(password, 10);
    const user = await db.createUser({
      username,
      password: hash,
      role: role || 'user',
      enabled: enabled !== false,
      modules: Array.isArray(modules) ? modules.join(',') : 'numbers,groups,scheduler,media,logs,settings',
    });

    res.status(201).json({
      id: user.id,
      username: user.username,
      role: user.role,
      enabled: user.enabled,
      modules: user.modules.split(','),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
```

---

### 6.3. PUT /api/admin/users/:id — Atualizar usuário

**Request:**
```
PUT /api/admin/users/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "role": "user",
  "enabled": false,
  "modules": ["numbers"],
  "password": "nova_senha"   // opcional — se ausente, mantém a atual
}
```

**Response (200):**
```json
{
  "id": "uuid-2",
  "username": "operador1",
  "role": "user",
  "enabled": false,
  "modules": ["numbers"]
}
```

**Implementação:**
```js
router.put('/users/:id', async (req, res) => {
  const { id } = req.params;
  const { role, enabled, modules, password } = req.body;

  try {
    const user = await db.getUserById(id);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

    const updateData = {};
    if (role !== undefined) updateData.role = role;
    if (enabled !== undefined) updateData.enabled = enabled;
    if (modules !== undefined) updateData.modules = Array.isArray(modules) ? modules.join(',') : modules;
    if (password) updateData.password = await bcrypt.hash(password, 10);

    const updated = await db.updateUser(id, updateData);

    res.json({
      id: updated.id,
      username: updated.username,
      role: updated.role,
      enabled: updated.enabled,
      modules: updated.modules ? updated.modules.split(',') : [],
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
```

---

### 6.4. DELETE /api/admin/users/:id — Excluir usuário

**Request:**
```
DELETE /api/admin/users/:id
Authorization: Bearer <token>
```

**Response (200):**
```json
{ "success": true }
```

**Regra:** não permitir que o admin exclua a si mesmo.

**Implementação:**
```js
router.delete('/users/:id', async (req, res) => {
  const { id } = req.params;

  if (id === req.user.userId) {
    return res.status(400).json({ error: 'Não é possível excluir o próprio usuário' });
  }

  try {
    await db.deleteUser(id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
```

---

## 7. Funções de banco necessárias (`services/database.js`)

Funções que precisam existir (ou serem criadas):

```js
// Já existentes (confirmar):
getUserById(id)
getUserByUsername(username)
getUserCount()
createUser({ username, password, role?, modules?, enabled? })
updateUserMachineId(id, machineId)

// NOVAS — precisam ser criadas:
getAllUsers()                    // SELECT * FROM User ORDER BY createdAt
updateUser(id, data)            // UPDATE User SET ...data WHERE id = id
deleteUser(id)                  // DELETE FROM User WHERE id = id
```

### Exemplos com Prisma:

```js
async getAllUsers() {
  return prisma.user.findMany({ orderBy: { createdAt: 'asc' } });
}

async updateUser(id, data) {
  return prisma.user.update({ where: { id }, data });
}

async deleteUser(id) {
  // Opcional: deletar dados relacionados (numbers, tasks, etc.) ou usar onDelete: Cascade
  return prisma.user.delete({ where: { id } });
}
```

---

## 8. Registrar rota no app principal

No arquivo principal (`server.js` ou `app.js`):

```js
const adminRoutes = require('./routes/admin');
app.use('/api/admin', adminRoutes);
```

---

## 9. Resumo — O que o frontend espera

| Endpoint | Método | Body | Resposta |
|----------|--------|------|----------|
| `POST /api/auth/login` | POST | `{ username, password, machineId }` | `{ token, user: { id, username, role, modules[] }, machineChanged }` |
| `GET /api/auth/me` | GET | — | `{ id, username, role, modules[] }` |
| `GET /api/admin/users` | GET | — | `User[]` com `{ id, username, role, enabled, modules[], createdAt }` |
| `POST /api/admin/users` | POST | `{ username, password, role, enabled, modules[] }` | `User` criado |
| `PUT /api/admin/users/:id` | PUT | `{ role?, enabled?, modules[]?, password? }` | `User` atualizado |
| `DELETE /api/admin/users/:id` | DELETE | — | `{ success: true }` |

### Formato do campo `modules`:
- **No banco:** string separada por vírgula → `"numbers,groups,media"`
- **Na API (JSON):** array → `["numbers", "groups", "media"]`
- **Conversão:** `modules.split(',')` (leitura) / `modules.join(',')` (escrita)

### Valores possíveis de modules:
`numbers`, `groups`, `scheduler`, `media`, `logs`, `settings`

### Valores possíveis de role:
`admin`, `user`

---

## 10. Checklist de implementação

- [ ] Adicionar campos `role`, `enabled`, `modules` ao model User (Prisma)
- [ ] Rodar `npx prisma migrate dev --name add_admin_fields`
- [ ] Criar `middleware/admin.js`
- [ ] Alterar `POST /api/auth/login` — verificar `enabled`, retornar `role` + `modules`
- [ ] Alterar `GET /api/auth/me` — retornar `role` + `modules`
- [ ] Alterar `POST /api/auth/register` — primeiro user = admin
- [ ] Criar funções `getAllUsers()`, `updateUser()`, `deleteUser()` no database.js
- [ ] Criar `routes/admin.js` com os 4 endpoints CRUD
- [ ] Registrar `app.use('/api/admin', adminRoutes)` no server.js
- [ ] Deploy no Railway
