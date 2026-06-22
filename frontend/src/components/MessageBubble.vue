<template>
  <div class="message" :class="message.role.toLowerCase()">
    <div class="bubble">
      <div class="bubble-header" v-if="message.thinkingMode">
        <span class="thinking-badge">{{ message.thinkingMode }}</span>
      </div>
      <div class="bubble-content" v-html="renderedContent"></div>
      <div class="bubble-attachments" v-if="message.attachments?.length">
        <div v-for="a in message.attachments" :key="a.id" class="att-item">
          <span>{{ iconForType(a.fileType) }}</span>
          <span class="att-name">{{ a.fileName }}</span>
        </div>
      </div>
      <div class="bubble-footer" v-if="message.role === 'ASSISTANT' && !message.isRolledBack">
        <button class="action-btn" @click="$emit('rollback')" title="回滚此回复">↩ 回滚</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'
import type { Message } from '@/types'

const props = defineProps<{ message: Message }>()
defineEmits(['rollback'])

const md = new MarkdownIt({
  highlight: (str: string, lang: string) => {
    if (lang && hljs.getLanguage(lang)) {
      try { return hljs.highlight(str, { language: lang }).value } catch {}
    }
    return ''
  }
})

// Block javascript: and data: URIs in links
const defaultLinkOpen = md.renderer.rules.link_open || function (tokens, idx, options, _env, self) {
  return self.renderToken(tokens, idx, options)
}
md.renderer.rules.link_open = function (tokens, idx, options, env, self) {
  const hrefIdx = tokens[idx].attrIndex('href')
  if (hrefIdx >= 0) {
    const href = tokens[idx].attrs![hrefIdx][1]
    if (!/^https?:\/\//i.test(href)) {
      tokens[idx].attrs![hrefIdx][1] = '#blocked'
    }
  }
  return defaultLinkOpen(tokens, idx, options, env, self)
}

const renderedContent = computed(() => md.render((props.message.content || '').replace(/\[附件:.*\]/, '')))
function iconForType(t: string) { return t === 'IMAGE' ? '🖼' : t === 'VIDEO' ? '🎬' : t === 'AUDIO' ? '🎤' : '📄' }
</script>

<style scoped>
.message { display: flex; gap: 10px; max-width: 85%; }
.message.user { align-self: flex-end; flex-direction: row-reverse; }
.message.assistant { align-self: flex-start; }
.message.system { align-self: center; font-size: 12px; color: var(--text-secondary); }
.bubble { padding: 6px 10px; border-radius: 8px; font-size: 11px; line-height: 1.4; }
.user .bubble { background: var(--accent-dim); border-bottom-right-radius: 4px; }
.assistant .bubble { background: rgba(255,255,255,0.06); border-bottom-left-radius: 4px; }
.bubble-header { margin-bottom: 4px; }
.thinking-badge { font-size: 10px; background: rgba(255,255,255,0.1); padding: 2px 8px; border-radius: 10px; }
.bubble-attachments { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
.att-item { display: flex; align-items: center; gap: 3px; background: rgba(255,255,255,0.08); border-radius: 6px; padding: 2px 8px; font-size: 10px; }
.att-name { max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
@media (prefers-color-scheme: light) { .att-item { background: rgba(0,0,0,0.06); } }
.bubble-content :deep(pre) { background: rgba(0,0,0,0.3); padding: 12px; border-radius: 6px; overflow-x: auto; margin: 8px 0; }
.bubble-content :deep(code) { font-family: 'SF Mono', 'Menlo', monospace; font-size: 12px; }
.bubble-footer { margin-top: 8px; display: flex; gap: 8px; }
.action-btn { font-size: 10px; background: transparent; border: none; color: var(--text-secondary); cursor: pointer; padding: 2px 6px; border-radius: 4px; }
.action-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
</style>
