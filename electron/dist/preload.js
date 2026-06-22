"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    showWindow: () => electron_1.ipcRenderer.send('window:show'),
    hideWindow: () => electron_1.ipcRenderer.send('window:hide'),
    getPosition: () => electron_1.ipcRenderer.invoke('window:getPosition'),
    setPosition: (x, y) => electron_1.ipcRenderer.invoke('window:setPosition', x, y),
    setPositionPreference: (pos) => electron_1.ipcRenderer.send('window:setPositionPreference', pos),
    // DB
    dbModels: () => electron_1.ipcRenderer.invoke('db:models'),
    dbAddCustomModel: (name, url) => electron_1.ipcRenderer.invoke('db:addCustomModel', name, url),
    dbToggleModel: (name) => electron_1.ipcRenderer.invoke('db:toggleModel', name),
    dbUpdateApiKey: (name, key) => electron_1.ipcRenderer.invoke('db:updateApiKey', name, key),
    dbCreateSession: (title, modelName) => electron_1.ipcRenderer.invoke('db:createSession', title, modelName),
    dbGetActiveSessions: (limit, offset) => electron_1.ipcRenderer.invoke('db:getActiveSessions', limit, offset),
    dbGetHistorySessions: (limit, offset) => electron_1.ipcRenderer.invoke('db:getHistorySessions', limit, offset),
    dbCountHistorySessions: () => electron_1.ipcRenderer.invoke('db:countHistorySessions'),
    dbSearchSessions: (q) => electron_1.ipcRenderer.invoke('db:searchSessions', q),
    dbGetMessages: (sid) => electron_1.ipcRenderer.invoke('db:getMessages', sid),
    dbAddMessage: (sid, role, content, tm) => electron_1.ipcRenderer.invoke('db:addMessage', sid, role, content, tm),
    dbUpdateTitle: (id, title) => electron_1.ipcRenderer.invoke('db:updateTitle', id, title),
    dbDeleteSession: (id) => electron_1.ipcRenderer.invoke('db:deleteSession', id),
    dbCloseSession: (id) => electron_1.ipcRenderer.invoke('db:closeSession', id),
    dbReactivateSession: (id) => electron_1.ipcRenderer.invoke('db:reactivateSession', id),
    dbRollbackMessage: (id) => electron_1.ipcRenderer.invoke('db:rollbackMessage', id),
    dbSessionHasMessages: (id) => electron_1.ipcRenderer.invoke('db:sessionHasMessages', id),
    // API
    apiSend: (job) => electron_1.ipcRenderer.send('api:send', job),
    apiCancel: () => electron_1.ipcRenderer.send('api:cancel'),
    apiSummarize: (job) => electron_1.ipcRenderer.send('api:summarize', job),
    onApiSummarizeDone: (cb) => { electron_1.ipcRenderer.removeAllListeners('api:summarize-done'); electron_1.ipcRenderer.on('api:summarize-done', (_, d) => cb(d)); },
    onApiChunk: (cb) => { electron_1.ipcRenderer.removeAllListeners('api:chunk'); electron_1.ipcRenderer.on('api:chunk', (_, d) => cb(d)); },
    onApiDone: (cb) => { electron_1.ipcRenderer.removeAllListeners('api:done'); electron_1.ipcRenderer.on('api:done', (_, d) => cb(d)); },
    onApiError: (cb) => { electron_1.ipcRenderer.removeAllListeners('api:error'); electron_1.ipcRenderer.on('api:error', (_, d) => cb(d)); },
    // Events
    onNewSession: (callback) => electron_1.ipcRenderer.on('new-session', callback),
    onOpenSettings: (callback) => electron_1.ipcRenderer.on('open-settings', callback),
});
