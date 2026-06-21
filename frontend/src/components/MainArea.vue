<template>
  <div class="main-area">
    <div class="tab-bar" v-if="store.activeTabs.length > 0">
      <div v-for="(tab, index) in store.activeTabs" :key="tab.sessionId" class="tab-item"
        :class="{ active: store.activeTabIndex === index }" @click="switchAndFocus(index)">
        <span class="tab-title">{{ tab.title }}</span>
        <button class="tab-close" @click.stop="store.closeTab(index)">×</button>
      </div>
    </div>
    <div class="tab-content" v-if="store.activeTab">
      <KeepAlive>
        <ChatTab :key="store.activeTab.sessionId" :session-id="store.activeTab.sessionId" />
      </KeepAlive>
    </div>
    <div class="empty-state" v-else>
      <div class="empty-icon">💬</div>
      <h2>AI Q&amp;A Assistant</h2>
      <p>点击 ＋ 新建会话，或从侧边栏打开历史对话</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useChatStore } from '@/stores/chatStore'
import ChatTab from './ChatTab.vue'
const store = useChatStore()

function switchAndFocus(index: number) {
  store.switchToTab(index)
  setTimeout(() => {
    const ta = document.querySelector('.chat-tab textarea') as HTMLTextAreaElement | null
    ta?.focus()
  }, 100)
}
</script>

<style scoped>
.main-area { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
.tab-bar { display: flex; border-bottom: 1px solid var(--border-color); background: rgba(0,0,0,0.1); overflow-x: auto; }
.tab-item { display: flex; align-items: center; gap: 6px; padding: 8px 16px; font-size: 12px; cursor: pointer; border-bottom: 2px solid transparent; white-space: nowrap; }
.tab-item:hover { background: var(--bg-hover); }
.tab-item.active { border-bottom-color: var(--accent); background: rgba(255,255,255,0.05); }
.tab-title { max-width: 120px; overflow: hidden; text-overflow: ellipsis; }
.tab-close { background: transparent; border: none; color: var(--text-secondary); cursor: pointer; font-size: 14px; }
.tab-content { flex: 1; overflow: hidden; }
.empty-state { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; color: var(--text-secondary); }
.empty-icon { font-size: 48px; }
.empty-state h2 { font-size: 20px; color: var(--text-primary); }
</style>
