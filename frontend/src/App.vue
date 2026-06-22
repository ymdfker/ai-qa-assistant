<template>
  <div class="app-shell">
    <div class="title-bar" v-show="!showSettings">
      <div class="title-bar-left">
        <button class="icon-btn" @click="store.sidebarOpen = !store.sidebarOpen" title="侧边栏">☰</button>
      </div>
      <div class="title-bar-center">
        <ModelSelector />
      </div>
      <div class="title-bar-right">
        <button class="icon-btn" @click="createNewSession" title="新建会话">＋</button>
      </div>
    </div>
    <div class="main-content">
      <Sidebar v-if="store.sidebarOpen && !showSettings" @click.stop />
      <MainArea v-show="!store.sidebarOpen && !showSettings" />
    </div>
    <SettingsPanel v-if="showSettings" @close="showSettings = false" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, provide } from 'vue'
import { useChatStore } from '@/stores/chatStore'
import ModelSelector from '@/components/ModelSelector.vue'
import Sidebar from '@/components/Sidebar.vue'
import MainArea from '@/components/MainArea.vue'
import SettingsPanel from '@/components/SettingsPanel.vue'

const store = useChatStore()
const showSettings = ref(false)
provide('showSettings', showSettings)

async function createNewSession() {
  const model = store.selectedModel || store.models[0]?.modelName || 'deepseek'
  await store.createSession('新对话', model)
}

window.electronAPI?.onNewSession(() => { createNewSession() })

onMounted(async () => {
  try {
    await store.fetchModels()
    if (store.models.length > 0) store.selectedModel = store.models[0].modelName
  } catch { store.selectedModel = 'deepseek' }

  try { await store.fetchActiveSessions() } catch {}
  try { await store.fetchHistory() } catch {}

  if (store.sessions.length > 0) {
    // Open all active sessions as tabs
    for (const s of store.sessions) {
      store.openTab(s.id, s.title, s.modelName)
    }
    // Restore previously active tab, or fallback to first active
    const savedId = Number(localStorage.getItem('aiqa:activeTabId')) || 0
    const targetId = savedId && store.activeTabs.find(t => t.sessionId === savedId) ? savedId : store.sessions[0].id
    const idx = store.activeTabs.findIndex(t => t.sessionId === targetId)
    if (idx >= 0) store.switchToTab(idx)
  } else {
    await store.createSession('新对话', store.selectedModel || 'deepseek')
  }
})
</script>

<style>
@import '@/assets/global.css';
.app-shell { height: 100vh; display: flex; flex-direction: column; background: var(--app-bg); backdrop-filter: blur(40px) saturate(1.4); -webkit-backdrop-filter: blur(40px) saturate(1.4); border-radius: 10px; overflow: hidden; border: 1px solid var(--border-color); text-shadow: 0 1px 2px rgba(0,0,0,0.4); }

@media (prefers-color-scheme: light) {
  .app-shell { text-shadow: none; backdrop-filter: blur(50px) saturate(1.6); -webkit-backdrop-filter: blur(50px) saturate(1.6); }
}
.title-bar { display: flex; align-items: center; justify-content: space-between; padding: 10px 24px; border-bottom: 1px solid var(--border-color); background: rgba(0,0,0,0.08); -webkit-app-region: drag; user-select: none; min-height: 56px; white-space: nowrap; }
.title-bar-left, .title-bar-right { display: flex; align-items: center; gap: 20px; -webkit-app-region: no-drag; flex-shrink: 0; }
.title-bar-center { display: flex; flex-direction: column; align-items: center; gap: 2px; -webkit-app-region: no-drag; flex-shrink: 0; font-size: 11px; }
.app-name { font-weight: 600; font-size: 12px; }
.icon-btn { background: var(--bg-hover); border: 1px solid var(--border-color); color: var(--text-primary); padding: 5px 10px; border-radius: 6px; cursor: pointer; font-size: 14px; line-height: 1; }
.icon-btn:hover { background: var(--bg-active); }
.main-content { flex: 1; display: flex; overflow: hidden; position: relative; }
</style>
