"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
const macos_1 = require("./platform/macos");
const windows_1 = require("./platform/windows");
const ApiEngine_1 = require("./api/ApiEngine");
const Database_1 = require("./db/Database");
const isDev = process.env.NODE_ENV === 'development';
let tray = null;
let platform;
let keyMonitorProcess = null;
let positionPreference = 'center-top';
let lastWidth = 340, lastHeight = 800;
let activeWin = null;
function getPlatformAdapter() {
    if (process.platform === 'darwin')
        return new macos_1.MacOSAdapter();
    return new windows_1.WindowsAdapter();
}
function createTrayIcon() {
    const S = 64;
    const R = S / 2;
    const canvas = Buffer.alloc(S * S * 4);
    function px(x, y, a) {
        if (x < 0 || x >= S || y < 0 || y >= S)
            return;
        const o = S * Math.round(y) * 4 + Math.round(x) * 4;
        canvas[o] = 255;
        canvas[o + 1] = 255;
        canvas[o + 2] = 255;
        canvas[o + 3] = Math.min(255, Math.max(0, Math.round(a)));
    }
    function circ(cx, cy, r, fill) {
        for (let y = Math.floor(cy - r - 1); y <= Math.ceil(cy + r + 1); y++)
            for (let x = Math.floor(cx - r - 1); x <= Math.ceil(cx + r + 1); x++) {
                const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) - r;
                if (d < 0)
                    px(x, y, fill);
                else if (d < 1)
                    px(x, y, fill * (1 - d));
            }
    }
    // Draw curved path using bezier-ish arc
    function arc(cx, cy, r, start, end, w, alpha) {
        const steps = Math.ceil(Math.abs(end - start) * r / 2);
        for (let i = 0; i <= steps; i++) {
            const a = start + (end - start) * i / steps;
            circ(cx + r * Math.cos(a), cy + r * Math.sin(a), w, alpha);
        }
    }
    // 2 thick elliptical orbits
    const rx = R * 0.70, ry = R * 0.20;
    for (let k = 0; k < 2; k++) {
        const angle = k * Math.PI / 2;
        for (let j = 0; j <= 50; j++) {
            const a = (Math.PI * 2 * j) / 50;
            const x = R + rx * Math.cos(a) * Math.cos(angle) - ry * Math.sin(a) * Math.sin(angle);
            const y = R + rx * Math.cos(a) * Math.sin(angle) + ry * Math.sin(a) * Math.cos(angle);
            circ(x, y, 1.0, 220); // thick: use circ instead of px
        }
    }
    // 4 bold nodes
    for (let i = 0; i < 4; i++) {
        const a = (Math.PI * 2 * i) / 4 - Math.PI / 4;
        const r = R * 0.52;
        circ(R + r * Math.cos(a), R + r * Math.sin(a), R * 0.07, 255);
    }
    // Center "?" — bold
    const qtop = R - R * 0.14, qbot = R + R * 0.20;
    circ(R + R * 0.10, qtop, R * 0.11, 255);
    circ(R - R * 0.10, qtop, R * 0.11, 255);
    circ(R, qtop + R * 0.03, R * 0.11, 255);
    // Hollow center
    circ(R + R * 0.10, qtop, R * 0.05, 0);
    circ(R - R * 0.10, qtop, R * 0.05, 0);
    circ(R, qtop + R * 0.02, R * 0.05, 0);
    // Stem
    circ(R, qtop + R * 0.10, R * 0.05, 255);
    circ(R, qtop + R * 0.19, R * 0.045, 255);
    circ(R, qtop + R * 0.28, R * 0.04, 255);
    // Bottom dot
    circ(R, qbot + R * 0.08, R * 0.06, 255);
    return electron_1.nativeImage.createFromBuffer(canvas, { width: S, height: S }).resize({ width: 22, height: 22 });
}
function getCurrentPos() {
    const cursorPoint = electron_1.screen.getCursorScreenPoint();
    const display = electron_1.screen.getDisplayNearestPoint(cursorPoint);
    const { x: sx, y: sy, width: sw, height: sh } = display.workArea;
    const pad = 20, ww = lastWidth, wh = lastHeight;
    switch (positionPreference) {
        case 'center': return { x: Math.round(sx + (sw - ww) / 2), y: Math.round(sy + (sh - wh) / 2) };
        case 'mouse-follow': return { x: Math.round(cursorPoint.x - ww / 2), y: Math.round(cursorPoint.y - wh / 2) };
        case 'top-left': return { x: sx + pad, y: sy + pad };
        case 'top-right': return { x: sx + sw - ww - pad, y: sy + pad };
        case 'bottom-left': return { x: sx + pad, y: sy + sh - wh - pad };
        case 'bottom-right': return { x: sx + sw - ww - pad, y: sy + sh - wh - pad };
        default: return { x: Math.round(sx + (sw - ww) / 2), y: Math.round(sy + (sh - wh) / 3) };
    }
}
function createActiveWindow() {
    // Destroy old window if exists
    if (activeWin && !activeWin.isDestroyed()) {
        activeWin.removeAllListeners();
        activeWin.destroy();
        activeWin = null;
    }
    activeWin = new electron_1.BrowserWindow({
        width: lastWidth, height: lastHeight, frame: false, transparent: true,
        resizable: true, show: false, minWidth: 300, minHeight: 500,
        webPreferences: {
            preload: path_1.default.join(__dirname, 'preload.js'),
            contextIsolation: true, nodeIntegration: false, sandbox: false,
        },
    });
    platform.applyVibrancy(activeWin);
    if (isDev) {
        activeWin.loadURL('http://localhost:5173');
    }
    else {
        activeWin.loadFile(path_1.default.join(process.resourcesPath, 'frontend', 'index.html'));
    }
    activeWin.on('blur', () => destroyActive());
    activeWin.on('resize', () => {
        if (activeWin && !activeWin.isDestroyed()) {
            const [w, h] = activeWin.getSize();
            lastWidth = w;
            lastHeight = h;
        }
    });
    activeWin.on('closed', () => { activeWin = null; });
    return activeWin;
}
function summarizeAllPending() {
    // Check ALL sessions, not just active ones
    const sessions = Database_1.stmts.getAllSessions.all();
    console.log('[summarize] sessions:', sessions.length, sessions.map((s) => s.title));
    for (const s of sessions) {
        if (s.title !== '新对话') {
            console.log('[summarize] skip:', s.title);
            continue;
        }
        const msgs = Database_1.stmts.getMessages.all(s.id);
        console.log('[summarize] msgs for', s.id, ':', msgs.length);
        if (msgs.length < 2)
            continue;
        const allModels = Database_1.stmts.getModels.all();
        const model = allModels.find((m) => m.model_name === s.model_name);
        console.log('[summarize] model for', s.model_name, ':', !!model, model?.api_endpoint ? 'has endpoint' : 'no endpoint', model?.api_key ? 'has key' : 'no key');
        if (!model?.api_endpoint || !model?.api_key)
            continue;
        // Build summary prompt
        const convo = msgs.slice(0, 10).map((m) => `${m.role === 'USER' ? '用户' : 'AI'}: ${(m.content || '').slice(0, 100)}`).join('\n');
        const prompt = `用5-10个字总结下面这段对话的核心主题。只输出总结，不要引号。\n\n${convo}`;
        const body = JSON.stringify({ model: s.model_name, messages: [{ role: 'user', content: prompt }], stream: true, max_tokens: 64 });
        const url = new URL(model.api_endpoint);
        const transport = url.protocol === 'https:' ? require('https') : require('http');
        try {
            const req = transport.request({
                hostname: url.hostname, port: url.port || (url.protocol === 'https:' ? 443 : 80),
                path: url.pathname + url.search, method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${model.api_key}` },
                timeout: 10_000,
            }, (res) => {
                let buf = '', result = '';
                res.on('data', (c) => { buf += c.toString(); const es = buf.split(/\n\n|\r\n\r\n/); buf = es.pop() || ''; for (const e of es) {
                    const ls = e.split(/\n|\r\n/);
                    for (const l of ls) {
                        const t = l.trim();
                        if (t.startsWith('data:') && t.slice(5).trim() !== '[DONE]') {
                            try {
                                const j = JSON.parse(t.slice(5).trim());
                                result += j.choices?.[0]?.delta?.content || '';
                            }
                            catch { }
                        }
                    }
                } });
                res.on('end', () => {
                    const title = result.trim().slice(0, 30);
                    if (title)
                        Database_1.stmts.updateTitle.run(title, s.id);
                });
            });
            req.on('error', () => { });
            req.write(body);
            req.end();
        }
        catch { }
    }
}
function destroyActive() {
    if (activeWin && !activeWin.isDestroyed()) {
        summarizeAllPending();
        activeWin.removeAllListeners();
        activeWin.destroy();
    }
    activeWin = null;
}
function toggleWindow() {
    if (activeWin && !activeWin.isDestroyed() && activeWin.isVisible()) {
        destroyActive();
        return;
    }
    const w = createActiveWindow();
    w.once('ready-to-show', () => {
        if (activeWin !== w)
            return; // destroyed while loading
        const { x, y } = getCurrentPos();
        w.setPosition(x, y);
        w.show();
        w.focus();
        // Direct focus — IPC may arrive before component mounts
        setTimeout(() => {
            w.webContents.executeJavaScript(`document.querySelector('textarea')?.focus()`);
        }, 300);
    });
}
function setupTray() {
    const icon = createTrayIcon();
    tray = new electron_1.Tray(icon);
    tray.setContextMenu(electron_1.Menu.buildFromTemplate([
        { label: '新建会话', click: () => activeWin?.webContents.send('new-session') },
        { type: 'separator' },
        { label: '显示/隐藏', click: () => toggleWindow() },
        { type: 'separator' },
        { label: '退出', click: () => electron_1.app.quit() },
    ]));
    tray.setToolTip('AI Q&A Assistant');
    // Tray click: no action (only double-Option summons)
}
function setupHotkey() {
    if (process.platform === 'darwin') {
        const binPath = isDev
            ? path_1.default.join(__dirname, '../native/keymonitor')
            : path_1.default.join(process.resourcesPath, 'native', 'keymonitor');
        keyMonitorProcess = (0, child_process_1.spawn)(binPath, ['300'], { stdio: ['ignore', 'pipe', 'pipe'] });
        keyMonitorProcess.stdout?.on('data', (data) => {
            for (const line of data.toString().trim().split('\n')) {
                if (line === 'DOUBLE_PRESS')
                    toggleWindow();
            }
        });
        keyMonitorProcess.stderr?.on('data', (data) => {
            console.error('[keymonitor]', data.toString().trim());
        });
    }
    else {
        electron_1.globalShortcut.register('Alt+Shift+Space', () => toggleWindow());
    }
}
function setupIPC() {
    electron_1.ipcMain.handle('db:models', () => Database_1.stmts.getModels.all());
    electron_1.ipcMain.handle('db:addCustomModel', (_, name, url) => {
        Database_1.stmts.addCustomModel.run('custom_' + Date.now(), name, url);
        return { ok: true };
    });
    electron_1.ipcMain.handle('db:toggleModel', (_, name) => { Database_1.stmts.toggleModel.run(name); return { ok: true }; });
    electron_1.ipcMain.handle('db:updateApiKey', (_, name, key) => { Database_1.stmts.updateApiKey.run(key, name); return { ok: true }; });
    electron_1.ipcMain.handle('db:createSession', (_, title, modelName) => {
        const r = Database_1.stmts.createSession.run(title, modelName);
        return Database_1.stmts.getSession.get(r.lastInsertRowid);
    });
    electron_1.ipcMain.handle('db:getActiveSessions', (_, limit, offset) => Database_1.stmts.getActiveSessions.all(limit, offset));
    electron_1.ipcMain.handle('db:getHistorySessions', (_, limit, offset) => Database_1.stmts.getHistorySessions.all(limit, offset));
    electron_1.ipcMain.handle('db:searchSessions', (_, q) => {
        const kw = `%${q}%`;
        return Database_1.stmts.searchSessions.all(kw, kw);
    });
    electron_1.ipcMain.handle('db:getMessages', (_, sid) => Database_1.stmts.getMessages.all(sid));
    electron_1.ipcMain.handle('db:addMessage', (_, sid, role, content, tm) => {
        const r = Database_1.stmts.addMessage.run(sid, role, content, tm);
        Database_1.stmts.touchSession.run(sid);
        return { id: r.lastInsertRowid };
    });
    electron_1.ipcMain.handle('db:updateTitle', (_, id, title) => { Database_1.stmts.updateTitle.run(title, id); });
    electron_1.ipcMain.handle('db:deleteSession', (_, id) => { Database_1.stmts.deleteSession.run(id); });
    electron_1.ipcMain.handle('db:closeSession', (_, id) => { Database_1.stmts.closeSession.run(id); });
    electron_1.ipcMain.handle('db:reactivateSession', (_, id) => { Database_1.stmts.reactivateSession.run(id); });
    electron_1.ipcMain.handle('db:rollbackMessage', (_, id) => { Database_1.stmts.rollbackMessage.run(id); });
    electron_1.ipcMain.on('window:setPositionPreference', (_, pos) => { positionPreference = pos; });
}
// Keep process alive even with zero windows
electron_1.app.on('window-all-closed', () => { });
electron_1.app.on('before-quit', () => {
    summarizeAllPending();
    destroyActive();
    keyMonitorProcess?.kill();
    electron_1.globalShortcut.unregisterAll();
});
electron_1.app.whenReady().then(() => {
    platform = getPlatformAdapter();
    electron_1.app.dock?.hide();
    setupTray();
    setupHotkey();
    setupIPC();
    (0, ApiEngine_1.setupApiIPC)();
});
