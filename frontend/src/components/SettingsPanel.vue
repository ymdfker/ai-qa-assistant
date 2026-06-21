<template>
  <div class="settings-overlay" @click.self="$emit('close')">
    <div class="settings-panel">
      <div class="settings-header">
        <h2>⚙️ 设置</h2>
        <button class="close-btn" @click="$emit('close')">✕</button>
      </div>
      <div class="settings-body">
        <div class="setting-group">
          <h3>窗口呼出位置</h3>
          <select v-model="store.windowPosition" class="setting-select">
            <option value="center-top">屏幕中央偏上 (默认)</option>
            <option value="center">屏幕正中央</option>
            <option value="mouse-follow">跟随鼠标所在屏幕</option>
            <option value="last-position">上次关闭位置</option>
            <option value="top-left">屏幕左上角</option>
            <option value="top-right">屏幕右上角</option>
            <option value="bottom-left">屏幕左下角</option>
            <option value="bottom-right">屏幕右下角</option>
          </select>
        </div>
        <div class="setting-group">
          <h3>快捷键设置</h3>
          <div class="setting-row">
            <label>触发按键</label>
            <input v-model="store.hotkeyConfig.key" class="setting-input" />
          </div>
          <div class="setting-row">
            <label>双击间隔 (ms)</label>
            <input v-model.number="store.hotkeyConfig.doublePressInterval" type="number" class="setting-input" min="50" max="1000" step="50" />
          </div>
        </div>
        <div class="setting-group">
          <h3>对话设置</h3>
          <div class="setting-row">
            <label>上下文窗口（消息条数）</label>
            <input v-model.number="store.contextLength" type="number" class="setting-input" min="2" max="40" style="width:80px" />
          </div>
        </div>
        <div class="setting-group">
          <h3>模型 API Key 设置</h3>
          <p class="setting-desc">同厂商模型共享一个 Key，填写一次即可。</p>
          <div v-for="group in apiGroups" :key="group.endpoint" class="model-item">
            <div class="model-info">
              <span class="model-name">{{ group.label }}</span>
            </div>
            <div class="model-key-row">
              <input
                v-model="apiKeys[group.endpoint]"
                type="password"
                placeholder="填入 API Key"
                class="key-input"
                @blur="saveGroupKey(group)"
              />
              <button class="save-key-btn" @click="saveGroupKey(group)">保存</button>
            </div>
          </div>
        </div>
        <div class="setting-group">
          <h3>添加自定义模型</h3>
          <input v-model="customName" placeholder="模型名称" class="setting-input" />
          <input v-model="customEndpoint" placeholder="API 端点 (OpenAI 兼容)" class="setting-input" />
          <button class="add-model-btn" @click="addCustomModel">添加</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useChatStore } from '@/stores/chatStore'
defineEmits(['close'])
const store = useChatStore()
const customName = ref('')
const customEndpoint = ref('')
const apiKeys = ref<Record<string, string>>({})

interface ApiGroup { label: string; endpoint: string; modelNames: string[] }

const apiGroups = computed<ApiGroup[]>(() => {
  const map = new Map<string, ApiGroup>()
  for (const m of store.models as any[]) {
    if (!m.apiEndpoint) continue
    const label = m.apiEndpoint.includes('deepseek') ? 'DeepSeek' :
                  m.apiEndpoint.includes('dashscope') ? '通义千问' : m.displayName
    if (!map.has(m.apiEndpoint)) {
      map.set(m.apiEndpoint, { label, endpoint: m.apiEndpoint, modelNames: [] })
    }
    map.get(m.apiEndpoint)!.modelNames.push(m.modelName)
  }
  return [...map.values()]
})

store.fetchModels().then(() => {
  for (const g of apiGroups.value) {
    const firstModel = store.models.find((m: any) => m.apiEndpoint === g.endpoint && m.apiKey)
    if (firstModel) apiKeys.value[g.endpoint] = (firstModel as any).apiKey
  }
})

async function saveGroupKey(group: ApiGroup) {
  const key = apiKeys.value[group.endpoint] || ''
  for (const name of group.modelNames) {
    await window.electronAPI!.dbUpdateApiKey(name, key)
  }
}

async function addCustomModel() {
  if (!customName.value || !customEndpoint.value) return
  await store.addCustomModel(customName.value, customEndpoint.value)
  customName.value = ''; customEndpoint.value = ''
}
</script>

<style scoped>
.settings-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.25); z-index: 200; display: flex; align-items: center; justify-content: center; }
.settings-panel { position: absolute; inset: 0; background: var(--app-bg); backdrop-filter: blur(40px) saturate(1.4); -webkit-backdrop-filter: blur(40px) saturate(1.4); overflow: hidden; }
.settings-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid var(--border-color); }
.settings-header h2 { font-size: 16px; }
.close-btn { background: transparent; border: none; color: var(--text-secondary); font-size: 18px; cursor: pointer; }
.settings-body { padding: 20px; overflow-y: auto; flex: 1; }
.setting-group { margin-bottom: 24px; }
.setting-group h3 { font-size: 14px; margin-bottom: 12px; }
.setting-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.setting-row label { font-size: 12px; color: var(--text-secondary); }
.setting-select, .setting-input { width: 100%; padding: 8px 12px; background: var(--bg-hover); border: 1px solid var(--border-color); border-radius: var(--radius); color: var(--text-primary); font-size: 13px; outline: none; margin-bottom: 8px; }
.model-item { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--border-color); font-size: 13px; }
.setting-desc { font-size: 11px; color: var(--text-secondary); margin-bottom: 12px; }
.model-info { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.model-name { font-size: 13px; font-weight: 500; }
.model-key-row { display: flex; gap: 6px; margin-bottom: 8px; }
.key-input { flex: 1; padding: 6px 10px; font-size: 12px; background: var(--bg-hover); border: 1px solid var(--border-color); border-radius: 4px; color: var(--text-primary); outline: none; }
.key-input:focus { border-color: var(--accent); }
.key-input:disabled { opacity: 0.4; }
.save-key-btn { padding: 4px 10px; font-size: 11px; background: var(--accent-dim); border: 1px solid var(--accent); border-radius: 4px; color: white; cursor: pointer; }
.save-key-btn:hover { background: var(--accent); }
.model-tag { font-size: 10px; padding: 2px 8px; border-radius: 10px; background: rgba(255,255,255,0.1); }
.model-tag.preset { background: var(--accent-dim); }
.model-tag:not(.preset) { background: var(--bg-hover); }
.add-model-btn { width: 100%; padding: 8px; background: var(--accent-btn); border: none; border-radius: var(--radius); color: white; cursor: pointer; font-size: 13px; }

@media (prefers-color-scheme: light) {
  .settings-overlay { background: rgba(0,0,0,0.15); }
}
</style>
