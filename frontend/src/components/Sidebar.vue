<template>
  <div class="sidebar" @click.stop="onSidebarClick">
    <div class="search-box" ref="searchBoxRef" @click.stop>
      <input v-model="store.searchQuery" type="text" placeholder="搜索会话..." @input="onSearch" @focus="store.searchOpen = true" class="search-input" />
      <div class="search-results" v-if="store.searchOpen && store.searchQuery.trim() && store.searchResults.length > 0">
        <div v-for="r in store.searchResults" :key="r.id" class="search-item" @click="openSearchResult(r)">
          <span class="search-item-title">{{ r.title }}</span>
          <span class="search-item-badge" :class="{ active: r.isActive }">{{ r.isActive ? '活跃' : '历史' }}</span>
        </div>
      </div>
      <div class="search-results" v-else-if="store.searchOpen && store.searchQuery.trim() && store.searchResults.length === 0">
        <div class="search-empty">无匹配结果</div>
      </div>
    </div>
    <div class="history-toggle" ref="historyRef">
      <button class="history-btn" @click="toggleHistory">📋 历史对话 ({{ store.historySessions.length }})</button>
      <HistoryDropdown v-if="store.showHistory" @close="store.showHistory = false" />
    </div>
    <div class="session-list" @scroll="onSessionScroll" ref="sessionListRef">
      <div class="section-label">活跃会话</div>
      <div v-for="session in visibleSessions" :key="session.id" class="session-item"
        :class="{ active: store.activeTab?.sessionId === session.id }"
        @click="store.openTab(session.id, session.title, session.modelName)">
        <span class="session-icon">{{ session.icon }}</span>
        <span class="session-title">{{ session.title }}</span>
        <button class="session-delete" @click.stop="store.deleteSession(session.id)" title="删除">🗑</button>
      </div>
      <div v-if="store.sessions.length === 0" class="empty-hint">点击 ＋ 开始新对话</div>
    </div>
    <div class="sidebar-footer">
      <button class="settings-btn" @click="showSettings = true">⚙️ 设置</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { inject, type Ref, ref, onMounted, onUnmounted, computed } from 'vue'
import { useChatStore } from '@/stores/chatStore'
import HistoryDropdown from './HistoryDropdown.vue'
const store = useChatStore()
const showSettings = inject<Ref<boolean>>('showSettings')!
const searchBoxRef = ref<HTMLElement>()
const historyRef = ref<HTMLElement>()
const sessionListRef = ref<HTMLElement>()

// Pagination: show 20 sessions at a time, load more on scroll
const visibleSessions = computed(() => store.sessions)
function onSessionScroll() {
  const el = sessionListRef.value; if (!el) return
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) {
    store.loadMoreSessions()
  }
}

let timer: ReturnType<typeof setTimeout> | null = null
function onSearch() {
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => { if (store.searchQuery.trim()) store.searchHistory(store.searchQuery.trim()) }, 300)
}
function toggleHistory() { store.showHistory = !store.showHistory; if (store.showHistory) store.fetchHistory() }

onMounted(() => document.addEventListener('click', onDocClick))
onUnmounted(() => document.removeEventListener('click', onDocClick))
function onDocClick() { store.searchOpen = false; store.showHistory = false }
function onSidebarClick(e: MouseEvent) {
  const t = e.target as HTMLElement
  if (searchBoxRef.value && !searchBoxRef.value.contains(t)) store.searchOpen = false
  if (historyRef.value && !historyRef.value.contains(t)) store.showHistory = false
}

async function openSearchResult(session: any) {
  store.searchOpen = false
  await store.fetchMessages(session.id)
  store.openTab(session.id, session.title, session.modelName)
  store.searchQuery = ''
}
</script>

<style scoped>
.sidebar { position: absolute; top: 0; left: 0; bottom: 0; width: 220px; border-right: 1px solid var(--border-color); background: var(--bg-secondary); backdrop-filter: blur(60px) saturate(2); -webkit-backdrop-filter: blur(60px) saturate(2); display: flex; flex-direction: column; overflow: visible; z-index: 10; }
.search-box { padding: 12px; position: relative; }
.search-input { width: 100%; padding: 8px 12px; background: rgba(255,255,255,0.06); border: 1px solid var(--border-color); border-radius: var(--radius); color: var(--text-primary); font-size: 13px; outline: none; }
.search-input:focus { border-color: var(--accent); }
.search-results { position: absolute; top: 44px; left: 12px; right: 12px; max-height: 260px; overflow-y: auto; background: rgba(30,30,46,1); backdrop-filter: blur(40px) saturate(1.4); -webkit-backdrop-filter: blur(40px) saturate(1.4); border: 1px solid var(--border-color); border-radius: 8px; z-index: 50; box-shadow: 0 4px 16px rgba(0,0,0,0.3); }
@media (prefers-color-scheme: light) { .search-results { background: rgba(255,255,255,1); } }
.search-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; cursor: pointer; border-bottom: 1px solid rgba(255,255,255,0.04); }
.search-item:hover { background: var(--bg-hover); }
.search-item:last-child { border-bottom: none; }
.search-item-title { font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
.search-item-badge { font-size: 10px; padding: 2px 6px; border-radius: 8px; margin-left: 8px; }
.search-item-badge.active { background: rgba(74,158,255,0.3); color: var(--accent); }
.search-item-badge:not(.active) { background: rgba(255,255,255,0.08); color: var(--text-secondary); }
.search-empty { padding: 16px; text-align: center; color: var(--text-secondary); font-size: 13px; }
.history-toggle { padding: 0 12px 8px; position: relative; }
.history-toggle :deep(.dropdown-panel) { position: absolute; top: 100%; left: 12px; right: 12px; z-index: 100; }
.history-btn { width: 100%; padding: 8px; background: var(--bg-hover); border: 1px solid var(--border-color); border-radius: var(--radius); color: var(--text-primary); font-size: 12px; cursor: pointer; text-align: center; }
.history-btn:hover { background: var(--bg-active); }
.session-list { flex: 1; overflow-y: auto; padding: 0 8px; }
.section-label { font-size: 10px; text-transform: uppercase; color: var(--text-secondary); padding: 8px 8px 4px; letter-spacing: 1px; }
.session-item { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: 6px; cursor: pointer; font-size: 13px; position: relative; }
.session-item:hover { background: var(--bg-hover); }
.session-item.active { background: var(--bg-active); border-left: 2px solid var(--accent); }
.session-icon { font-size: 14px; }
.session-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
.session-delete { background: transparent; border: none; cursor: pointer; opacity: 0; font-size: 12px; transition: opacity 0.2s; }
.session-item:hover .session-delete { opacity: 0.6; }
.session-delete:hover { opacity: 1 !important; }
.empty-hint { color: var(--text-secondary); font-size: 12px; text-align: center; padding: 20px; }
.sidebar-footer { padding: 12px; border-top: 1px solid var(--border-color); }
.settings-btn { width: 100%; padding: 8px; background: transparent; border: none; color: var(--text-secondary); font-size: 12px; cursor: pointer; text-align: center; }
.settings-btn:hover { color: var(--text-primary); }
</style>
