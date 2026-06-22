<template>
  <div class="dropdown-panel">
    <div class="dropdown-header">
      <h3>历史对话</h3>
      <button class="close-btn" @click="$emit('close')">✕</button>
    </div>
    <div class="dropdown-body" v-if="store.historySessions.length > 0">
      <template v-for="group in groupedHistory" :key="group.label">
        <div class="date-group-label">{{ group.label }}</div>
        <div v-for="session in group.sessions" :key="session.id" class="history-item" @click="openHistorySession(session)">
          <div class="history-item-info">
            <span class="history-item-title">{{ session.title }}</span>
            <span class="history-item-model">{{ session.modelName }}</span>
            <span class="history-item-time">{{ formatTime(session.updatedAt) }}</span>
          </div>
          <button class="delete-btn" @click.stop="store.deleteSession(session.id)">🗑</button>
        </div>
      </template>
    </div>
    <div v-else class="empty-hint">暂无历史对话</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useChatStore } from '@/stores/chatStore'
import type { Session } from '@/types'
defineEmits(['close'])
const store = useChatStore()

interface DateGroup { label: string; sessions: Session[] }
const groupedHistory = computed<DateGroup[]>(() => {
  const groups: Record<string, Session[]> = {}
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)
  for (const s of store.historySessions) {
    const d = new Date(s.updatedAt)
    const dateKey = new Date(d.getFullYear(), d.getMonth(), d.getDate())
    let label: string
    if (dateKey.getTime() === today.getTime()) label = '今天'
    else if (dateKey.getTime() === yesterday.getTime()) label = '昨天'
    else label = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
    if (!groups[label]) groups[label] = []
    groups[label].push(s)
  }
  return Object.entries(groups).map(([label, sessions]) => ({ label, sessions }))
})

function formatTime(dateStr: string): string {
  // SQLite stores UTC; suffix 'Z' for correct local-time parsing
  const d = new Date(dateStr.replace(' ', 'T') + 'Z')
  if (isNaN(d.getTime())) return ''
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

async function openHistorySession(session: Session) {
  await store.fetchMessages(session.id)
  store.openTab(session.id, session.title, session.modelName)
  store.showHistory = false
}
</script>

<style scoped>
.dropdown-panel { background: rgba(30,30,46,1); backdrop-filter: blur(40px) saturate(1.4); -webkit-backdrop-filter: blur(40px) saturate(1.4); border: 1px solid var(--border-color); border-radius: 8px; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.3); max-height: 320px; }
@media (prefers-color-scheme: light) { .dropdown-panel { background: rgba(255,255,255,1); } }
.dropdown-header { display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; border-bottom: 1px solid var(--border-color); flex-shrink: 0; }
.dropdown-header h3 { font-size: 13px; font-weight: 600; }
.close-btn { background: transparent; border: none; color: var(--text-secondary); font-size: 14px; cursor: pointer; }
.dropdown-body { flex: 1; overflow-y: auto; padding: 6px; }
.date-group-label { font-size: 10px; color: var(--text-secondary); padding: 6px 6px 2px; font-weight: 500; }
.history-item { display: flex; align-items: center; padding: 6px 8px; border-radius: 4px; cursor: pointer; }
.history-item:hover { background: var(--bg-hover); }
.history-item-info { flex: 1; display: flex; flex-direction: column; gap: 1px; overflow: hidden; }
.history-item-title { font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.history-item-model { font-size: 10px; color: var(--accent); }
.history-item-time { font-size: 9px; color: var(--text-secondary); }
.delete-btn { background: transparent; border: none; cursor: pointer; opacity: 0.5; font-size: 10px; }
.delete-btn:hover { opacity: 1; }
.empty-hint { color: var(--text-secondary); font-size: 11px; text-align: center; padding: 20px; }
</style>
