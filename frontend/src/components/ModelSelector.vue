<template>
  <div class="model-selector">
    <select :value="store.selectedModel" @change="store.setModel(($event.target as HTMLSelectElement).value)" class="selector-dropdown">
      <option v-for="m in store.models" :key="m.modelName" :value="m.modelName">{{ m.displayName }}</option>
    </select>
  </div>
</template>

<script setup lang="ts">
import { useChatStore } from '@/stores/chatStore'
const store = useChatStore()
</script>

<style scoped>
.model-selector { display: flex; align-items: center; gap: 8px; }
.selector-label { font-size: 11px; color: var(--text-secondary); min-width: 28px; }
.selector-dropdown { background: var(--bg-hover); border: 1px solid var(--border-color); border-radius: 4px; color: var(--text-primary); padding: 4px 8px; font-size: 11px; outline: none; cursor: pointer; }
.selector-dropdown:focus { border-color: var(--accent); }
</style>
