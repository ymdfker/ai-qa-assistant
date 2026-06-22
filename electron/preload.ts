import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  showWindow: () => ipcRenderer.send('window:show'),
  hideWindow: () => ipcRenderer.send('window:hide'),
  getPosition: () => ipcRenderer.invoke('window:getPosition'),
  setPosition: (x: number, y: number) => ipcRenderer.invoke('window:setPosition', x, y),
  setPositionPreference: (pos: string) => ipcRenderer.send('window:setPositionPreference', pos),

  // DB
  dbModels: () => ipcRenderer.invoke('db:models'),
  dbAddCustomModel: (name: string, url: string) => ipcRenderer.invoke('db:addCustomModel', name, url),
  dbToggleModel: (name: string) => ipcRenderer.invoke('db:toggleModel', name),
  dbUpdateApiKey: (name: string, key: string) => ipcRenderer.invoke('db:updateApiKey', name, key),
  dbCreateSession: (title: string, modelName: string) => ipcRenderer.invoke('db:createSession', title, modelName),
  dbGetActiveSessions: (limit: number, offset: number) => ipcRenderer.invoke('db:getActiveSessions', limit, offset),
  dbGetHistorySessions: (limit: number, offset: number) => ipcRenderer.invoke('db:getHistorySessions', limit, offset),
  dbSearchSessions: (q: string) => ipcRenderer.invoke('db:searchSessions', q),
  dbGetMessages: (sid: number) => ipcRenderer.invoke('db:getMessages', sid),
  dbAddMessage: (sid: number, role: string, content: string, tm: string) => ipcRenderer.invoke('db:addMessage', sid, role, content, tm),
  dbUpdateTitle: (id: number, title: string) => ipcRenderer.invoke('db:updateTitle', id, title),
  dbDeleteSession: (id: number) => ipcRenderer.invoke('db:deleteSession', id),
  dbCloseSession: (id: number) => ipcRenderer.invoke('db:closeSession', id),
  dbReactivateSession: (id: number) => ipcRenderer.invoke('db:reactivateSession', id),
  dbRollbackMessage: (id: number) => ipcRenderer.invoke('db:rollbackMessage', id),

  // API
  apiSend: (job: any) => ipcRenderer.send('api:send', job),
  apiCancel: () => ipcRenderer.send('api:cancel'),
  apiSummarize: (job: any) => ipcRenderer.send('api:summarize', job),
  onApiSummarizeDone: (cb: (data: any) => void) => { ipcRenderer.removeAllListeners('api:summarize-done'); ipcRenderer.on('api:summarize-done', (_, d) => cb(d)); },
  onApiChunk: (cb: (data: any) => void) => { ipcRenderer.removeAllListeners('api:chunk'); ipcRenderer.on('api:chunk', (_, d) => cb(d)); },
  onApiDone: (cb: (data: any) => void) => { ipcRenderer.removeAllListeners('api:done'); ipcRenderer.on('api:done', (_, d) => cb(d)); },
  onApiError: (cb: (data: any) => void) => { ipcRenderer.removeAllListeners('api:error'); ipcRenderer.on('api:error', (_, d) => cb(d)); },

  // Events
  onNewSession: (callback: () => void) => ipcRenderer.on('new-session', callback),
  onOpenSettings: (callback: () => void) => ipcRenderer.on('open-settings', callback),
});
