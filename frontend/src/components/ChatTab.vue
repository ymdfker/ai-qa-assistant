<template>
  <div class="chat-tab">
    <div class="messages-container" ref="messagesContainer">
      <MessageBubble v-for="msg in messages" :key="msg.id" :message="msg" @rollback="onRollback(msg.id)" />
      <div v-if="isStreaming" class="streaming-indicator">
        <div class="typing-dots"><span></span><span></span><span></span></div>
        <button class="stop-btn" @click="stopGeneration">⏹ 停止</button>
      </div>
    </div>
    <div class="input-area">
      <FileUploader ref="fileUploader" @files-changed="onFilesChanged" />
      <div class="input-row">
        <textarea ref="inputEl" v-model="inputText" class="message-input"
          placeholder="输入问题 (Enter 发送, Ctrl+Enter 换行)"
          @keydown="onKeydown"></textarea>
        <button class="send-btn" :disabled="!inputText.trim() && attachedFiles.length === 0" @click="sendMessage">发送</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { useChatStore } from '@/stores/chatStore'
import MessageBubble from './MessageBubble.vue'
import FileUploader from './FileUploader.vue'
import type { Message } from '@/types'

const props = defineProps<{ sessionId: number }>()
const store = useChatStore()
const inputText = ref('')
const inputEl = ref<HTMLTextAreaElement>()
const messages = ref<Message[]>([])
const messagesContainer = ref<HTMLDivElement>()
const fileUploader = ref<InstanceType<typeof FileUploader>>()
const attachedFiles = ref<File[]>([])
const isStreaming = ref(false)

onMounted(async () => {
  await store.fetchMessages(props.sessionId)
  let session = store.sessions.find(s => s.id === props.sessionId)
  if (!session) session = store.historySessions.find((s: any) => s.id === props.sessionId) as any
  if (session) {
    messages.value = (session.messages || []).filter((m: any) => !m.isRolledBack)
  }
})


async function sendMessage() {
  const text = inputText.value.trim()
  if ((!text && attachedFiles.value.length === 0) || isStreaming.value) return
  const api = window.electronAPI!
  const currentFiles = [...attachedFiles.value]
  inputText.value = ''
  attachedFiles.value = []
  fileUploader.value?.clearFiles()
  isStreaming.value = true
  nextTick(() => { inputEl.value?.focus() })

  // Build attachments list for display
  const atts = currentFiles.map(f => ({
    id: Date.now() + Math.random(),
    fileName: f.name, fileType: f.type.startsWith('image/') ? 'IMAGE' : f.type.startsWith('video/') ? 'VIDEO' : f.type.startsWith('audio/') ? 'AUDIO' : 'DOCUMENT',
    filePath: '', fileSize: f.size,
  }))
  // Include file names in message content for the AI
  const fileHint = atts.length > 0 ? '\n\n[用户上传了文件: ' + atts.map(a => a.fileName).join(', ') + '。如果你无法直接查看该文件，请告知用户。]' : ''

  // Save user message
  messages.value.push({ id: Date.now(), role: 'USER', content: text + fileHint, thinkingMode: store.selectedThinkingLevel, isRolledBack: false, createdAt: new Date().toISOString(), attachments: atts as any })
  scrollToBottom()
  api.dbAddMessage(props.sessionId, 'USER', text + fileHint, store.selectedThinkingLevel).catch(() => {})

  // Stream via API IPC
  let assistantContent = ''
  const msgIndex = messages.value.length // will be the index after push
  messages.value.push({ id: Date.now() + 1, role: 'ASSISTANT', content: '', thinkingMode: store.selectedThinkingLevel, isRolledBack: false, createdAt: new Date().toISOString(), attachments: [] })

  // Inject current time + precise location into first message as context
  const now = new Date()
  const timeStr = now.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false })
  let locationStr = '未知'
  try {
    const locRes = await fetch('https://ipapi.co/json/')
    if (locRes.ok) {
      const loc = await locRes.json()
      locationStr = [loc.city, loc.region, loc.country_name].filter(Boolean).join('，')
    }
  } catch {}
  const sysCtx = `[系统上下文: 当前时间 ${timeStr}，用户位置 ${locationStr}。模型不具备联网搜索能力，请基于自身知识回答。]`

  const history = messages.value.slice(-store.contextLength).map(m => ({
    role: m.role === 'USER' ? 'user' : 'assistant',
    content: m.role === 'SYSTEM' ? '' : m.content
  })).filter(m => m.content)
  if (history.length <= 1) {
    history.unshift({ role: 'system', content: sysCtx })
  }
  history.push({ role: 'user', content: text })

  api.apiSend({ modelName: store.selectedModel, sessionId: props.sessionId, messages: history })

  let finished = false
  function finish() {
    if (finished) return; finished = true; isStreaming.value = false
    if (assistantContent) api.dbAddMessage(props.sessionId, 'ASSISTANT', assistantContent, store.selectedThinkingLevel).catch(() => {})
  }

  api.onApiChunk((data: any) => {
    if (data.sessionId !== props.sessionId) return
    assistantContent += data.content
    messages.value[msgIndex].content = assistantContent  // update via reactive array
    scrollToBottom()
  })
  api.onApiDone((data: any) => {
    if (data.sessionId !== props.sessionId) return
    finish()
  })
  api.onApiError((data: any) => {
    if (data.sessionId !== props.sessionId) return
    messages.value[msgIndex].content += data.content ? '' : `\n\n[错误: ${data.error}]`
    finish()
  })
}

function stopGeneration() { window.electronAPI!.apiCancel(); isStreaming.value = false }
async function onRollback(id: number) { await store.rollbackMessage(id); messages.value = messages.value.filter(m => m.id !== id) }
function onKeydown(e: KeyboardEvent) { if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) { e.preventDefault(); sendMessage() } }
function onFilesChanged(files: File[]) { attachedFiles.value = files }
function scrollToBottom() {
  nextTick(() => {
    const el = messagesContainer.value
    if (!el) return
    // Only auto-scroll if user is near bottom (within 100px)
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100
    if (isNearBottom) el.scrollTop = el.scrollHeight
  })
}
</script>

<style scoped>
.chat-tab { display: flex; flex-direction: column; height: 100%; }
.messages-container { flex: 1; overflow-y: auto; padding: 12px 16px; display: flex; flex-direction: column; gap: 10px; }
.streaming-indicator { display: flex; align-items: center; gap: 8px; padding: 6px; }
.typing-dots { display: flex; gap: 3px; }
.typing-dots span { width: 5px; height: 5px; background: var(--text-secondary); border-radius: 50%; animation: blink 1s infinite; }
.typing-dots span:nth-child(2) { animation-delay: 0.2s; }
.typing-dots span:nth-child(3) { animation-delay: 0.4s; }
@keyframes blink { 0%,100% { opacity: 0.3; } 50% { opacity: 1; } }
.stop-btn { background: rgba(255,100,100,0.2); border: 1px solid rgba(255,100,100,0.4); color: var(--danger); padding: 3px 10px; border-radius: var(--radius); cursor: pointer; font-size: 11px; }
.input-area { border-top: 1px solid var(--border-color); padding: 8px 12px; }
.input-row { display: flex; gap: 10px; align-items: flex-end; }
.message-input { flex: 1; padding: 6px 10px; background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); border-radius: var(--radius); color: var(--text-primary); font-size: 11px; resize: none; outline: none; font-family: inherit; line-height: 1.4; field-sizing: content; max-height: 180px; }
.message-input:focus { border-color: var(--accent); }
.send-btn { padding: 8px 16px; background: var(--accent-btn); border: none; border-radius: var(--radius); color: white; font-size: 11px; cursor: pointer; }
.send-btn:hover:not(:disabled) { background: var(--accent); }
.send-btn:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
