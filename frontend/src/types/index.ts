export interface ThinkingLevel {
  id: string
  label: string
}

export interface ModelInfo {
  modelName: string
  displayName: string
  isPreset: boolean
  thinkingLevels: ThinkingLevel[]
}

export interface Session {
  id: number
  title: string
  modelName: string
  createdAt: string
  updatedAt: string
  isActive: boolean
  icon: string
  messages: Message[]
}

export interface Message {
  id: number
  role: 'USER' | 'ASSISTANT' | 'SYSTEM'
  content: string
  thinkingMode: string
  tokensUsed?: number
  isRolledBack: boolean
  createdAt: string
  attachments: Attachment[]
}

export interface Attachment {
  id: number
  fileName: string
  fileType: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT'
  filePath: string
  fileSize: number
  extractedText?: string
}

export interface ChatTab {
  sessionId: number
  title: string
  modelName: string
  isStreaming: boolean
}

export type WindowPosition = 'center-top' | 'center' | 'mouse-follow' | 'last-position' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
