import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { Session, Message, ChatTab, ModelInfo, WindowPosition } from '@/types'

const api = () => window.electronAPI!

export const useChatStore = defineStore('chat', () => {
  const sessions = ref<Session[]>([])
  const activeTabs = ref<ChatTab[]>([])
  const activeTabIndex = ref(0)
  const models = ref<ModelInfo[]>([])
  const selectedModel = ref('deepseek')
  const selectedThinkingLevel = ref('quick')
  const sidebarOpen = ref(false)
  const showHistory = ref(false)
  const historySessions = ref<Session[]>([])
  const searchQuery = ref('')
  const searchResults = ref<Session[]>([])
  const searchOpen = ref(false)
  const windowPosition = ref<WindowPosition>(
    (localStorage.getItem('aiqa:windowPosition') as WindowPosition) || 'center-top'
  )
  const contextLength = ref(12) // context window in messages
  const hotkeyConfig = ref({
    key: localStorage.getItem('aiqa:hotkey') || 'Option',
    doublePressInterval: Number(localStorage.getItem('aiqa:hotkeyInterval')) || 300
  })
  const isStreaming = ref(false)

  const activeTab = computed(() => activeTabs.value[activeTabIndex.value])
  const activeSession = computed(() => sessions.value.find(s => s.id === activeTab.value?.sessionId))

  function switchToTab(index: number) {
    activeTabIndex.value = index
    const tab = activeTabs.value[index]
    if (tab) selectedModel.value = tab.modelName
    sidebarOpen.value = false // auto-collapse sidebar
    setTimeout(() => {
      const ta = document.querySelector('.chat-tab textarea') as HTMLTextAreaElement | null
      ta?.focus()
    }, 100)
  }
  function setModel(modelName: string) {
    selectedModel.value = modelName
    const tab = activeTabs.value[activeTabIndex.value]
    if (tab) tab.modelName = modelName
  }

  watch(windowPosition, (pos) => {
    localStorage.setItem('aiqa:windowPosition', pos)
    try { api().setPositionPreference(pos) } catch {}
  })
  watch(activeTab, (tab) => {
    if (tab) localStorage.setItem('aiqa:activeTabId', String(tab.sessionId))
  })
  watch(hotkeyConfig, (cfg) => {
    localStorage.setItem('aiqa:hotkey', cfg.key)
    localStorage.setItem('aiqa:hotkeyInterval', String(cfg.doublePressInterval))
  }, { deep: true })


  async function fetchModels() {
    try {
      const rows = await api().dbModels()
      models.value = rows.map((r: any) => ({
        modelName: r.model_name,
        displayName: r.display_name,
        isPreset: !!r.is_preset,
        apiEndpoint: r.api_endpoint || '',
        apiKey: r.api_key || '',
        thinkingLevels: JSON.parse(r.thinking_levels || '[]'),
      }))
    } catch (e) { console.error('fetchModels:', e) }
  }

  async function createSession(title: string, modelName: string): Promise<Session> {
    const s = await api().dbCreateSession(title, modelName)
    const session: Session = { id: s.id, title: s.title, modelName: s.model_name, createdAt: s.created_at, updatedAt: s.updated_at, isActive: !!s.is_active, icon: s.icon || '💬', messages: [] }
    sessions.value.unshift(session)
    openTab(session.id, session.title, session.modelName)
    return session
  }

  function openTab(sessionId: number, title: string, modelName: string) {
    const existing = activeTabs.value.findIndex(t => t.sessionId === sessionId)
    if (existing >= 0) {
      switchToTab(existing)
    } else {
      activeTabs.value.push({ sessionId, title, modelName, isStreaming: false })
      switchToTab(activeTabs.value.length - 1)
    }
  }

  function closeTab(index: number) {
    const tab = activeTabs.value[index]
    if (!tab) return
    if (tab.title === '新对话') summarizeTitle(tab.sessionId)
    // Delete empty sessions, archive only if has messages
    const s = sessions.value.find(s => s.id === tab.sessionId)
    if (!s) return
    sessions.value = sessions.value.filter(s => s.id !== tab.sessionId)
    s.isActive = false
    historySessions.value.unshift(s)
    historyTotal.value++
    api().dbCloseSession(tab.sessionId).catch(() => {})
    activeTabs.value.splice(index, 1)
    if (activeTabIndex.value >= activeTabs.value.length) switchToTab(Math.max(0, activeTabs.value.length - 1))
  }

  async function fetchMessages(sessionId: number) {
    try {
      const rows = await api().dbGetMessages(sessionId)
      const msgs = rows.map((r: any) => ({
        id: r.id, role: r.role, content: r.content || '', thinkingMode: r.thinking_mode || '',
        isRolledBack: !!r.is_rolled_back, createdAt: r.created_at, attachments: [],
      }))
      const s = sessions.value.find(s => s.id === sessionId)
      if (s) s.messages = msgs
    } catch (e) { console.error('fetchMessages:', e) }
  }

  const sessionOffset = ref(0)
  const historyOffset = ref(0)
  const hasMoreSessions = ref(true)
  const hasMoreHistory = ref(true)
  const historyTotal = ref(0)
  const PAGE = 20

  async function loadMoreSessions() {
    if (!hasMoreSessions.value) return
    try {
      const rows = await api().dbGetActiveSessions(PAGE, sessionOffset.value)
      const mapped = rows.map((r: any) => ({
        id: r.id, title: r.title, modelName: r.model_name, createdAt: r.created_at,
        updatedAt: r.updated_at, isActive: true, icon: r.icon || '💬', messages: [],
      }))
      if (rows.length < PAGE) hasMoreSessions.value = false
      sessionOffset.value += rows.length
      sessions.value = [...sessions.value, ...mapped]
    } catch (e) { console.error(e) }
  }

  async function fetchActiveSessions() {
    sessionOffset.value = 0; hasMoreSessions.value = true; sessions.value = []
    await loadMoreSessions()
  }

  let historyCountLoaded = false
  async function loadHistoryCount() {
    if (historyCountLoaded) return
    try { historyTotal.value = await api().dbCountHistorySessions() } catch (e) { console.error(e) }
    historyCountLoaded = true
  }

  async function loadMoreHistory() {
    if (!hasMoreHistory.value) return
    try {
      const rows = await api().dbGetHistorySessions(PAGE, historyOffset.value)
      const mapped = rows.map((r: any) => ({
        id: r.id, title: r.title, modelName: r.model_name, createdAt: r.created_at,
        updatedAt: r.updated_at, isActive: false, icon: r.icon || '💬', messages: [],
      }))
      if (rows.length < PAGE) hasMoreHistory.value = false
      historyOffset.value += rows.length
      historySessions.value = [...historySessions.value, ...mapped]
    } catch (e) { console.error(e) }
  }

  async function fetchHistory() {
    historyOffset.value = 0; hasMoreHistory.value = true; historySessions.value = []
    historyCountLoaded = false
    await Promise.all([loadMoreHistory(), loadHistoryCount()])
  }

  async function searchHistory(q: string) {
    try {
      // Search both active and history sessions
      const rows = await api().dbSearchSessions(q)
      searchResults.value = rows.map((r: any) => ({
        id: r.id, title: r.title, modelName: r.model_name, createdAt: r.created_at,
        updatedAt: r.updated_at, isActive: !!r.is_active, icon: r.icon || '💬', messages: [],
      }))
    } catch (e) { console.error(e) }
  }

  async function deleteSession(sessionId: number) {
    if (!confirm('确定要删除这个会话吗？此操作不可撤销。')) return
    await api().dbDeleteSession(sessionId)
    const wasHistory = historySessions.value.find(s => s.id === sessionId)
    sessions.value = sessions.value.filter(s => s.id !== sessionId)
    historySessions.value = historySessions.value.filter(s => s.id !== sessionId)
    if (wasHistory) historyTotal.value = Math.max(0, historyTotal.value - 1)
    const idx = activeTabs.value.findIndex(t => t.sessionId === sessionId)
    if (idx >= 0) closeTab(idx)
  }

  async function rollbackMessage(messageId: number) {
    await api().dbRollbackMessage(messageId)
  }

  async function addCustomModel(name: string, endpoint: string) {
    await api().dbAddCustomModel(name, endpoint)
    await fetchModels()
  }

  function updateSessionTitle(sessionId: number, title: string) {
    const s = sessions.value.find(s => s.id === sessionId)
    if (s) s.title = title
    const h = historySessions.value.find(s => s.id === sessionId)
    if (h) h.title = title
    const t = activeTabs.value.find(t => t.sessionId === sessionId)
    if (t) t.title = title
    api().dbUpdateTitle(sessionId, title).catch(() => {})
  }

  async function summarizeTitle(sessionId: number) {
    try {
      const rows = await api().dbGetMessages(sessionId)
      const msgs = rows as any[]
      if (msgs.length < 2) return
      const convo = msgs.slice(0, 10).map((m: any) =>
        `${m.role === 'USER' ? '用户' : 'AI'}: ${m.content.slice(0, 100)}`
      ).join('\n')
      const prompt = `用5-10个字总结下面这段对话的核心主题。只输出总结，不要引号。\n\n${convo}`
      const model = sessions.value.find(s => s.id === sessionId)?.modelName || 'deepseek'
      // Register callback BEFORE sending request (prevents race)
      api().onApiSummarizeDone((d: any) => {
        if (d.sessionId === sessionId && d.title) {
          updateSessionTitle(sessionId, d.title)
        }
      })
      api().apiSummarize({ modelName: model, sessionId, messages: [{ role: 'user', content: prompt }] })
    } catch (e) { console.error('summarizeTitle:', e) }
  }

  return {
    sessions, activeTabs, activeTabIndex, activeTab, activeSession,
    models, selectedModel, selectedThinkingLevel,
    sidebarOpen, showHistory, historySessions, historyTotal, searchQuery, searchResults, searchOpen,
    contextLength, windowPosition, hotkeyConfig, isStreaming,
    fetchModels, createSession, openTab, closeTab, switchToTab, setModel,
    fetchMessages, fetchActiveSessions, fetchHistory, loadMoreSessions, loadMoreHistory, searchHistory,
    deleteSession, rollbackMessage, addCustomModel, updateSessionTitle,
  }
})
