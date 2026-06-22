import { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, screen, globalShortcut } from 'electron';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';
import { MacOSAdapter } from './platform/macos';
import { WindowsAdapter } from './platform/windows';
import { PlatformAdapter } from './platform/PlatformAdapter';
import { setupApiIPC } from './api/ApiEngine';
import { stmts } from './db/Database';

const isDev = process.env.NODE_ENV === 'development';
let tray: Tray | null = null;
let platform: PlatformAdapter;
let keyMonitorProcess: ChildProcess | null = null;
let positionPreference = 'center-top';
let lastWidth = 340, lastHeight = 800;
let activeWin: BrowserWindow | null = null;

function getPlatformAdapter(): PlatformAdapter {
  if (process.platform === 'darwin') return new MacOSAdapter();
  return new WindowsAdapter();
}

function createTrayIcon() {
  const S = 64; const R = S/2;
  const canvas = Buffer.alloc(S * S * 4);
  function px(x: number, y: number, a: number) {
    if (x < 0 || x >= S || y < 0 || y >= S) return;
    const o = S * Math.round(y) * 4 + Math.round(x) * 4;
    canvas[o]=255; canvas[o+1]=255; canvas[o+2]=255;
    canvas[o+3]=Math.min(255, Math.max(0, Math.round(a)));
  }
  function circ(cx: number, cy: number, r: number, fill: number) {
    for (let y = Math.floor(cy-r-1); y <= Math.ceil(cy+r+1); y++)
      for (let x = Math.floor(cx-r-1); x <= Math.ceil(cx+r+1); x++) {
        const d = Math.sqrt((x-cx)**2 + (y-cy)**2) - r;
        if (d < 0) px(x, y, fill);
        else if (d < 1) px(x, y, fill * (1-d));
      }
  }
  // Draw curved path using bezier-ish arc
  function arc(cx: number, cy: number, r: number, start: number, end: number, w: number, alpha: number) {
    const steps = Math.ceil(Math.abs(end-start) * r / 2);
    for (let i = 0; i <= steps; i++) {
      const a = start + (end-start) * i / steps;
      circ(cx + r*Math.cos(a), cy + r*Math.sin(a), w, alpha);
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
    const a = (Math.PI * 2 * i) / 4 - Math.PI/4;
    const r = R * 0.52;
    circ(R + r*Math.cos(a), R + r*Math.sin(a), R*0.07, 255);
  }

  // Center "?" — bold
  const qtop = R - R*0.14, qbot = R + R*0.20;
  circ(R+R*0.10, qtop, R*0.11, 255);
  circ(R-R*0.10, qtop, R*0.11, 255);
  circ(R, qtop+R*0.03, R*0.11, 255);
  // Hollow center
  circ(R+R*0.10, qtop, R*0.05, 0);
  circ(R-R*0.10, qtop, R*0.05, 0);
  circ(R, qtop+R*0.02, R*0.05, 0);
  // Stem
  circ(R, qtop+R*0.10, R*0.05, 255);
  circ(R, qtop+R*0.19, R*0.045, 255);
  circ(R, qtop+R*0.28, R*0.04, 255);
  // Bottom dot
  circ(R, qbot+R*0.08, R*0.06, 255);

  return nativeImage.createFromBuffer(canvas, { width: S, height: S }).resize({ width: 22, height: 22 });
}

function getCurrentPos(): {x: number, y: number} {
  const cursorPoint = screen.getCursorScreenPoint();
  const display = screen.getDisplayNearestPoint(cursorPoint);
  const { x: sx, y: sy, width: sw, height: sh } = display.workArea;
  const pad = 20, ww = lastWidth, wh = lastHeight;
  switch (positionPreference) {
    case 'center': return { x: Math.round(sx + (sw-ww)/2), y: Math.round(sy + (sh-wh)/2) };
    case 'mouse-follow': return { x: Math.round(cursorPoint.x - ww/2), y: Math.round(cursorPoint.y - wh/2) };
    case 'top-left': return { x: sx+pad, y: sy+pad };
    case 'top-right': return { x: sx+sw-ww-pad, y: sy+pad };
    case 'bottom-left': return { x: sx+pad, y: sy+sh-wh-pad };
    case 'bottom-right': return { x: sx+sw-ww-pad, y: sy+sh-wh-pad };
    default: return { x: Math.round(sx + (sw-ww)/2), y: Math.round(sy + (sh-wh)/3) };
  }
}

function createActiveWindow(): BrowserWindow {
  // Destroy old window if exists
  if (activeWin && !activeWin.isDestroyed()) {
    activeWin.removeAllListeners();
    activeWin.destroy();
    activeWin = null;
  }

  activeWin = new BrowserWindow({
    width: lastWidth, height: lastHeight, frame: false, transparent: true,
    resizable: true, show: false, minWidth: 300, minHeight: 500,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false, sandbox: false,
    },
  });

  platform.applyVibrancy(activeWin);

  if (isDev) {
    activeWin.loadURL('http://localhost:5173');
  } else {
    activeWin.loadFile(path.join(process.resourcesPath, 'frontend', 'index.html'));
  }

  activeWin.on('blur', () => destroyActive());
  activeWin.on('resize', () => {
    if (activeWin && !activeWin.isDestroyed()) {
      const [w, h] = activeWin.getSize();
      lastWidth = w; lastHeight = h;
    }
  });
  activeWin.on('closed', () => { activeWin = null; });

  return activeWin;
}

function summarizeAllPending() {
  // Only check active sessions — typically just a handful
  const sessions = stmts.getActiveSessions.all(100, 0) as any[];
  console.log('[summarize] sessions:', sessions.length, sessions.map((s: any) => s.title));
  for (const s of sessions) {
    if (s.title !== '新对话') { console.log('[summarize] skip:', s.title); continue; }
    const msgs = stmts.getMessages.all(s.id) as any[];
    console.log('[summarize] msgs for', s.id, ':', msgs.length);
    if (msgs.length < 2) continue;
    const allModels = stmts.getModels.all() as any[];
    const model = allModels.find((m: any) => m.model_name === s.model_name);
    console.log('[summarize] model for', s.model_name, ':', !!model, model?.api_endpoint ? 'has endpoint' : 'no endpoint', model?.api_key ? 'has key' : 'no key');
    if (!model?.api_endpoint || !model?.api_key) continue;
    // Build summary prompt
    const convo = msgs.slice(0, 10).map((m: any) =>
      `${m.role === 'USER' ? '用户' : 'AI'}: ${(m.content || '').slice(0, 100)}`
    ).join('\n');
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
      }, (res: any) => {
        let buf = '', result = '';
        res.on('data', (c: Buffer) => { buf += c.toString(); const es = buf.split(/\n\n|\r\n\r\n/); buf = es.pop() || ''; for (const e of es) { const ls = e.split(/\n|\r\n/); for (const l of ls) { const t = l.trim(); if (t.startsWith('data:') && t.slice(5).trim() !== '[DONE]') { try { const j = JSON.parse(t.slice(5).trim()); result += j.choices?.[0]?.delta?.content || ''; } catch {} } } } });
        res.on('end', () => {
          const title = result.trim().slice(0, 30);
          if (title) stmts.updateTitle.run(title, s.id);
        });
      });
      req.on('error', () => {});
      req.write(body); req.end();
    } catch {}
  }
}

function destroyActive() {
  if (activeWin && !activeWin.isDestroyed()) {
    try { activeWin.webContents.send('toggle-visibility') } catch {}
    summarizeAllPending();
    activeWin.removeAllListeners();
    activeWin.destroy();
  }
  activeWin = null;
}

function toggleWindow(): void {
  if (activeWin && !activeWin.isDestroyed() && activeWin.isVisible()) {
    destroyActive();
    return;
  }
  const w = createActiveWindow();
  w.once('ready-to-show', () => {
    if (activeWin !== w) return; // destroyed while loading
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

function setupTray(): void {
  const icon = createTrayIcon();
  tray = new Tray(icon);
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: '新建会话', click: () => {
      if (!activeWin || activeWin.isDestroyed()) toggleWindow();
      setTimeout(() => activeWin?.webContents.send('new-session'), 500);
    }},
    { type: 'separator' },
    { label: '显示/隐藏', click: () => toggleWindow() },
    { type: 'separator' },
    { label: '退出', click: () => app.quit() },
  ]));
  tray.setToolTip('AI Q&A Assistant');
  // Tray click: no action (only double-Option summons)
}

function setupHotkey(): void {
  if (process.platform === 'darwin') {
    const binPath = isDev
      ? path.join(__dirname, '../native/keymonitor')
      : path.join(process.resourcesPath, 'native', 'keymonitor');
    keyMonitorProcess = spawn(binPath, ['300'], { stdio: ['ignore', 'pipe', 'pipe'] });
    keyMonitorProcess.stdout?.on('data', (data: Buffer) => {
      for (const line of data.toString().trim().split('\n')) {
        if (line === 'DOUBLE_PRESS') toggleWindow();
      }
    });
    keyMonitorProcess.stderr?.on('data', (data: Buffer) => {
      console.error('[keymonitor]', data.toString().trim());
    });
  } else {
    globalShortcut.register('Alt+Shift+Space', () => toggleWindow());
  }
}

function setupIPC(): void {
  ipcMain.handle('db:models', () => stmts.getModels.all());
  ipcMain.handle('db:addCustomModel', (_, name: string, url: string) => {
    stmts.addCustomModel.run('custom_'+Date.now(), name, url); return { ok: true };
  });
  ipcMain.handle('db:toggleModel', (_, name: string) => { stmts.toggleModel.run(name); return { ok: true }; });
  ipcMain.handle('db:updateApiKey', (_, name: string, key: string) => { stmts.updateApiKey.run(key, name); return { ok: true }; });
  ipcMain.handle('db:createSession', (_, title: string, modelName: string) => {
    const r = stmts.createSession.run(title, modelName); return stmts.getSession.get(r.lastInsertRowid);
  });
  ipcMain.handle('db:getActiveSessions', (_, limit: number, offset: number) => stmts.getActiveSessions.all(limit, offset));
  ipcMain.handle('db:getHistorySessions', (_, limit: number, offset: number) => stmts.getHistorySessions.all(limit, offset));
  ipcMain.handle('db:countHistorySessions', () => (stmts.countHistory.get() as any)?.cnt || 0);
  ipcMain.handle('db:searchSessions', (_, q: string) => {
    const kw = `%${q}%`; return stmts.searchSessions.all(kw, kw);
  });
  ipcMain.handle('db:getMessages', (_, sid: number) => stmts.getMessages.all(sid));
  ipcMain.handle('db:addMessage', (_, sid: number, role: string, content: string, tm: string) => {
    const r = stmts.addMessage.run(sid, role, content, tm); stmts.touchSession.run(sid); return { id: r.lastInsertRowid };
  });
  ipcMain.handle('db:updateTitle', (_, id: number, title: string) => { stmts.updateTitle.run(title, id); });
  ipcMain.handle('db:deleteSession', (_, id: number) => { stmts.deleteSession.run(id); });
  ipcMain.handle('db:closeSession', (_, id: number) => { stmts.closeSession.run(id); });
  ipcMain.handle('db:reactivateSession', (_, id: number) => { stmts.reactivateSession.run(id); });
  ipcMain.handle('db:rollbackMessage', (_, id: number) => { stmts.rollbackMessage.run(id); });

  ipcMain.on('window:setPositionPreference', (_, pos: string) => { positionPreference = pos; });
}

// Keep process alive even with zero windows
app.on('window-all-closed', () => {});
app.on('before-quit', () => {
  summarizeAllPending();
  destroyActive();
  keyMonitorProcess?.kill();
  globalShortcut.unregisterAll();
});

app.whenReady().then(() => {
  platform = getPlatformAdapter();
  app.dock?.hide();
  setupTray();
  setupHotkey();
  setupIPC();
  setupApiIPC();
});
