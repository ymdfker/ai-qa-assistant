<template>
  <div class="file-uploader">
    <div class="attachment-chips" v-if="files.length > 0">
      <div v-for="(f, i) in files" :key="i" class="chip">
        <span class="chip-icon">{{ iconFor(f) }}</span>
        <span class="chip-name">{{ f.name }}</span>
        <button class="chip-remove" @click="removeFile(i)">×</button>
      </div>
    </div>
    <button class="upload-btn" @click="triggerUpload" title="添加附件">
      📎 附件
    </button>
    <input ref="fileInput" type="file" multiple hidden @change="onFileChange" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{ 'files-changed': [files: File[]]; 'upload-click': [] }>()
const files = ref<File[]>([])
const fileInput = ref<HTMLInputElement>()

function triggerUpload() { emit('upload-click'); fileInput.value?.click() }

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files) {
    for (const file of Array.from(input.files)) {
      if (file.size > 50 * 1024 * 1024) {
        alert(`文件 ${file.name} 超过 50MB 限制`)
        continue
      }
      files.value.push(file)
    }
    emit('files-changed', files.value)
  }
  input.value = ''
  // Re-focus the textarea after file picker closes
  setTimeout(() => {
    const ta = document.querySelector('.chat-tab textarea') as HTMLTextAreaElement | null
    ta?.focus()
  }, 200)
}

function removeFile(i: number) {
  files.value.splice(i, 1)
  emit('files-changed', files.value)
}

function iconFor(f: File): string {
  const t = f.type
  if (t.startsWith('image/')) return '🖼'
  if (t.startsWith('video/')) return '🎬'
  if (t.startsWith('audio/')) return '🎤'
  return '📄'
}

defineExpose({ clearFiles: () => { files.value = []; emit('files-changed', []) } })
</script>

<style scoped>
.file-uploader { display: flex; flex-direction: column; gap: 4px; }
.attachment-chips { display: flex; flex-wrap: wrap; gap: 4px; }
.chip { display: flex; align-items: center; gap: 4px; background: var(--bg-hover); border: 1px solid var(--border-color); border-radius: 12px; padding: 2px 8px; font-size: 10px; }
.chip-icon { font-size: 12px; }
.chip-name { max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-primary); }
.chip-remove { background: transparent; border: none; color: var(--text-secondary); cursor: pointer; font-size: 12px; line-height: 1; padding: 0; }
.upload-btn { background: var(--bg-hover); border: 1px solid var(--border-color); color: var(--text-secondary); padding: 3px 10px; border-radius: var(--radius); cursor: pointer; font-size: 11px; align-self: flex-start; }
.upload-btn:hover { color: var(--text-primary); background: var(--bg-active); }
</style>
