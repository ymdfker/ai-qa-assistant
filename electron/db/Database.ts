import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';

const DB_PATH = path.join(app.getPath('userData'), 'aiqa.db');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Init schema
db.exec(`
  CREATE TABLE IF NOT EXISTS model_configs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    model_name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    api_endpoint TEXT NOT NULL DEFAULT '',
    api_key TEXT DEFAULT '',
    web_url TEXT NOT NULL DEFAULT '',
    is_enabled INTEGER DEFAULT 1,
    thinking_levels TEXT DEFAULT '[]',
    file_support TEXT DEFAULT '[]',
    is_preset INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    model_name TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    is_active INTEGER DEFAULT 1,
    icon TEXT DEFAULT '💬'
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    content TEXT,
    thinking_mode TEXT,
    tokens_used INTEGER,
    is_rolled_back INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_path TEXT,
    file_size INTEGER,
    extracted_text TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

// Seed presets — each model variant is its own entry
const presets = [
  // DeepSeek
  ['deepseek-chat',    'DeepSeek Chat',     'https://api.deepseek.com/v1/chat/completions',
   '[{"id":"quick","label":"快速"}]', '["IMAGE"]'],
  ['deepseek-reasoner','DeepSeek Reasoner', 'https://api.deepseek.com/v1/chat/completions',
   '[{"id":"deep","label":"深度思考"}]', '[]'],
  // Qwen
  ['qwen-turbo',  'Qwen Turbo',  'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
   '[{"id":"quick","label":"快速"}]', '["IMAGE","DOCUMENT"]'],
  ['qwen-plus',   'Qwen Plus',   'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
   '[{"id":"quick","label":"快速"}]', '["IMAGE","DOCUMENT"]'],
  ['qwen-max',    'Qwen Max',    'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
   '[{"id":"deep","label":"深度思考"}]', '["IMAGE","DOCUMENT"]'],
];

const insertModel = db.prepare(
  `INSERT OR IGNORE INTO model_configs (model_name,display_name,api_endpoint,thinking_levels,file_support,is_preset,is_enabled)
   VALUES (?,?,?,?,?,1,1)`
);
for (const p of presets) insertModel.run(...p);

// Prepared statements
const stmts = {
  // Models
  getModels: db.prepare('SELECT * FROM model_configs WHERE is_enabled = 1'),
  addCustomModel: db.prepare(
    `INSERT INTO model_configs (model_name,display_name,api_endpoint,is_preset)
     VALUES (?,?,?,0)`
  ),
  toggleModel: db.prepare('UPDATE model_configs SET is_enabled = NOT is_enabled WHERE model_name = ?'),
  updateApiKey: db.prepare('UPDATE model_configs SET api_key = ? WHERE model_name = ?'),

  // Sessions
  createSession: db.prepare(
    `INSERT INTO sessions (title, model_name) VALUES (?, ?)`
  ),
  getSession: db.prepare('SELECT * FROM sessions WHERE id = ?'),
  getActiveSessions: db.prepare('SELECT * FROM sessions WHERE is_active = 1 ORDER BY updated_at DESC'),
  getHistorySessions: db.prepare('SELECT * FROM sessions WHERE is_active = 0 ORDER BY updated_at DESC'),
  getAllSessions: db.prepare('SELECT * FROM sessions ORDER BY updated_at DESC'),
  searchSessions: db.prepare(
    `SELECT DISTINCT s.* FROM sessions s
     LEFT JOIN messages m ON m.session_id = s.id
     WHERE s.title LIKE ? OR m.content LIKE ?
     ORDER BY s.updated_at DESC`
  ),
  updateTitle: db.prepare("UPDATE sessions SET title = ?, updated_at = datetime('now') WHERE id = ?"),
  deleteSession: db.prepare('DELETE FROM sessions WHERE id = ?'),
  closeSession: db.prepare("UPDATE sessions SET is_active = 0, updated_at = datetime('now') WHERE id = ?"),

  // Messages
  addMessage: db.prepare(
    `INSERT INTO messages (session_id, role, content, thinking_mode) VALUES (?, ?, ?, ?)`
  ),
  getMessages: db.prepare('SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC'),
  rollbackMessage: db.prepare('UPDATE messages SET is_rolled_back = 1 WHERE id = ?'),
  touchSession: db.prepare("UPDATE sessions SET updated_at = datetime('now') WHERE id = ?"),
};

export function getDB() { return db; }
export { stmts };
