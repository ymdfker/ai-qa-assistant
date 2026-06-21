<template>
  <div class="thinking-toggle">
    <div class="toggle-group">
      <button v-for="level in thinkingLevels" :key="level.id" class="toggle-btn"
        :class="{ active: store.selectedThinkingLevel === level.id }"
        @click="store.selectedThinkingLevel = level.id">{{ level.label }}</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useChatStore } from '@/stores/chatStore'
import type { ThinkingLevel } from '@/types'
const store = useChatStore()
const thinkingLevels = computed<ThinkingLevel[]>(() => {
  const model = store.models.find(m => m.modelName === store.selectedModel)
  return model?.thinkingLevels || [{ id: 'default', label: '默认' }]
})
</script>

<style scoped>
.thinking-toggle { display: flex; align-items: center; gap: 6px; }
.toggle-label { font-size: 11px; color: var(--text-secondary); }
.toggle-group { display: flex; border-radius: 4px; overflow: hidden; border: 1px solid var(--border-color); }
.toggle-btn { padding: 3px 10px; font-size: 11px; background: transparent; border: none; color: var(--text-secondary); cursor: pointer; border-right: 1px solid var(--border-color); }
.toggle-btn:last-child { border-right: none; }
.toggle-btn.active { background: var(--accent-btn); color: white; }
</style>
