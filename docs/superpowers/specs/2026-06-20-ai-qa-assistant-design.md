# AI Q&A Assistant — Design Spec

**Date:** 2026-06-20
**Status:** Approved

---

## 1. Overview

A cross-platform desktop AI assistant. macOS-first, Windows-ready. Electron shell + Vue 3 UI + Spring Boot backend. Multi-model support via web scraping (no API keys needed). Free-form Q&A only.

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| Shell | Electron (system tray, global hotkey, frosted glass window) |
| UI | Vue 3 + TypeScript + Pinia + markdown-it + highlight.js |
| Backend | Spring Boot 3 + Java 21 |
| Database | H2 embedded (single file, zero install) |
| Browser Engine | Playwright (Chromium) |
| HTTP Client | OkHttp (API reverse engine) |
| File Preprocessing | Tesseract (OCR) + Whisper (speech-to-text) |
| Build | Vite (frontend), Maven (backend), electron-builder (package) |

## 3. Architecture

Four-layer architecture:

```
Electron Shell → Vue Frontend ← HTTP/WS → Spring Boot → AI Models (external)
```

### 3.1 Electron Shell (System Interaction Layer)
- BrowserWindow: frosted glass, frameless, transparent
- GlobalShortcut: double-press Option (macOS) / Alt (Windows), configurable
- Tray: black-and-white neural-network + Q icon, right-click context menu
- Window lifecycle: show/hide (never destroy), blur-to-hide, position memory
- Platform abstraction: `PlatformAdapter` interface, `MacOSAdapter` / `WindowsAdapter`

### 3.2 Vue 3 Frontend (UI Layer)
- Mixed layout: left sidebar + right tabbed chat area
- Components: Sidebar, TabBar, ChatTab, MessageBubble (Markdown), HistoryDropdown, FileUploader, SettingsPanel
- State: Pinia `chatStore`, WebSocket composable `useChat`
- IPC bridge: Electron preload script exposes `window.electronAPI`

### 3.3 Spring Boot Backend (Core Logic Layer)
- Controllers: ChatController (REST + WS), SessionController, ModelController
- Services: ChatService, SessionService, HistorySearchService, FilePreprocessService
- Engine layer: ModelAdapter interface → AbstractModelAdapter → WebScraperEngine / ApiReverseEngine
- Hybrid engine: API reverse preferred, Playwright as fallback (auto-switch on failure)

### 3.4 AI Model Targets (External)
Preset models: DeepSeek, 通义千问, 文心一言, Kimi, 豆包, ChatGPT.
User-extensible: add custom model via name + web URL.

## 4. Project Structure

```
ai-qa-assistant/
├── electron/                    # Electron shell
│   ├── main.ts                  # Main process
│   ├── preload.ts               # Preload script (IPC bridge)
│   └── platform/
│       ├── macos.ts             # macOS: NSVisualEffectView, Option hotkey
│       └── windows.ts           # Windows: Acrylic, Alt hotkey
├── frontend/                    # Vue 3 frontend
│   ├── src/
│   │   ├── App.vue
│   │   ├── components/
│   │   │   ├── Sidebar.vue
│   │   │   ├── ChatPanel.vue
│   │   │   ├── ChatTab.vue
│   │   │   ├── MessageBubble.vue
│   │   │   ├── HistoryDropdown.vue
│   │   │   ├── ModelSelector.vue
│   │   │   ├── ThinkingToggle.vue
│   │   │   ├── FileUploader.vue
│   │   │   └── SettingsPanel.vue
│   │   ├── composables/
│   │   │   ├── useChat.ts
│   │   │   ├── useSession.ts
│   │   │   └── useHotkey.ts
│   │   └── stores/
│   │       └── chatStore.ts
│   └── package.json
├── backend/                     # Spring Boot backend
│   ├── src/main/java/com/aiqa/
│   │   ├── AiQaApplication.java
│   │   ├── controller/
│   │   │   ├── ChatController.java
│   │   │   ├── SessionController.java
│   │   │   └── ModelController.java
│   │   ├── service/
│   │   │   ├── ChatService.java
│   │   │   ├── SessionService.java
│   │   │   ├── HistorySearchService.java
│   │   │   └── FilePreprocessService.java
│   │   ├── engine/
│   │   │   ├── ModelAdapter.java
│   │   │   ├── WebScraperEngine.java
│   │   │   ├── ApiReverseEngine.java
│   │   │   └── adapters/
│   │   │       ├── DeepSeekAdapter.java
│   │   │       ├── QwenAdapter.java
│   │   │       ├── KimiAdapter.java
│   │   │       └── ...
│   │   ├── model/
│   │   │   ├── Session.java
│   │   │   ├── Message.java
│   │   │   ├── ModelConfig.java
│   │   │   └── dto/
│   │   ├── repository/
│   │   └── config/
│   └── pom.xml
└── docs/
```

## 5. Data Model (H2)

```sql
Session
  id (PK), title, model_name, created_at, updated_at, is_active, icon

Message
  id (PK), session_id (FK), role (USER|ASSISTANT|SYSTEM),
  content (CLOB), thinking_mode, tokens_used, is_rolled_back, created_at

Attachment
  id (PK), message_id (FK), file_name, file_type (IMAGE|VIDEO|AUDIO),
  file_path, file_size, extracted_text (OCR/ASR result), created_at

ModelConfig
  id (PK), model_name, display_name, web_url, is_enabled,
  thinking_levels (JSON), file_support (JSON), is_preset, engine_preference

CustomModel
  id (PK), display_name, web_url, engine_type, thinking_levels (JSON),
  file_support (JSON), is_enabled, created_at
```

Full-text search: H2 built-in FT_SEARCH index on `Message.content` and `Session.title`.

## 6. Key Features

### 6.1 Visibility Control
- Double-press Option (macOS) / Alt (Windows) to toggle show/hide
- Customizable: double-press interval, alternative key combos
- Click outside window → auto-hide (Electron `blur` event)
- Hide = `win.hide()`, not `win.close()` — all state preserved

### 6.2 Window Position
Five position strategies, user-selectable in Settings:
1. `center-top` — screen center top (default)
2. `center` — dead center
3. `mouse-follow` — center of screen where mouse is
4. `last-position` — where window was last closed
5. `custom(x, y)` — auto-saved when user drags window

### 6.3 Frosted Glass
- macOS: Electron `vibrancy: 'fullscreen-ui'` + `NSVisualEffectView`
- Windows: `SetWindowCompositionAttribute(ACCENT_ENABLE_BLURBEHIND)`
- CSS: `backdrop-filter: blur(20px)` with semi-transparent background

### 6.4 Multi-Session & History
- Sidebar: active sessions list, click to open in new tab
- History button → dropdown panel, grouped by date (今天/昨天/YYYY年MM月DD日)
- Click history item → opens in new tab with full conversation context
- Delete history from dropdown
- Tab bar: multiple concurrent conversations, `<KeepAlive>` preserves state

### 6.5 Internal Search
- Search box in sidebar top
- H2 full-text search across session titles and message content
- Results shown in dropdown, click to open in new tab

### 6.6 Message Input
- Enter → send message
- Ctrl+Enter → newline
- Textarea auto-resize
- Input disabled while AI is generating (per session)

### 6.7 Stop & Rollback
- Stop button visible during generation → cancels AI response
- Generated text so far is preserved
- Rollback button beside stopped response → deletes that AI message, restores input

### 6.8 File Upload
- Image / video / audio upload buttons beside input
- Strategy: try direct upload to model web UI first
- Fallback: local OCR (image) or speech-to-text (audio/video) → send extracted text
- Video: extract audio track → speech-to-text
- File size limit: 50MB (frontend check)

### 6.9 Thinking Modes
- Detect model's native thinking levels from web UI
- Show toggle buttons matching available levels (quick, deep, etc.)
- If model has no native levels: inject "think step by step" prompt
- Thinking mode badge on each message bubble

### 6.10 Model Management
- Preset models shipped with app (DeepSeek, 千问, 文心一言, Kimi, 豆包, ChatGPT)
- Enable/disable presets in Settings
- Add custom model: name + web URL + engine type

### 6.11 Tray Icon
- Black-and-white neural network + question mark icon
- macOS menu bar (24px height), Windows system tray
- Left click: toggle window
- Right click: new session / settings / quit

## 7. Engine Design

### ModelAdapter Interface
```java
public interface ModelAdapter {
    Flux<String> send(String message, ThinkingLevel level, List<File> files);
    void cancel();
    List<ThinkingLevel> getThinkingLevels();
    Set<FileType> getSupportedFileTypes();
    boolean isAvailable();
}
```

### Hybrid Engine Strategy
1. Try ApiReverseEngine (lightweight, fast)
2. On failure: auto-switch to WebScraperEngine (Playwright, robust)
3. Both engines implement same interface
4. Per-model engine preference configurable in ModelConfig

### WebScraperEngine (Playwright)
1. Launch/reuse Chromium instance
2. Navigate to model web URL
3. Inject session cookies if saved
4. Input text into page DOM
5. Handle file upload via file input
6. Toggle thinking mode switch if present
7. Click send button
8. Watch reply area via MutationObserver
9. Stream new text chunks via callback
10. Detect completion (stop button disappears)

### ApiReverseEngine
1. Construct HTTP request mimicking web frontend AJAX
2. POST to internal chat completion endpoint
3. Parse SSE stream
4. Forward text chunks
5. Cancel = close HTTP connection

## 8. Error Handling

| Scenario | Handling |
|----------|----------|
| Web UI changed | Auto-detect DOM mismatch, fallback to other engine, notify user |
| Network lost | WS ping/pong, reconnect with exponential backoff |
| Playwright crash | Auto-restart, retry 3x, mark model unavailable on persistent failure |
| File too large (>50MB) | Frontend block with message |
| H2 DB corruption | Startup validation, auto-backup + rebuild |
| Concurrent sends | Per-session lock, disable input during generation |
| Spring Boot startup fail | Electron shows error page + retry button |
| Rate limit / captcha | Prompt user to manually login in browser, save cookies |
| Option double-press misfire | Configurable press interval (default 300ms) |
| Multi-monitor | `screen.getCursorScreenPoint()` for mouse-follow |
| Sleep/wake cycle | Re-check model availability, WS auto-reconnect |
| Unsupported thinking mode | Auto-hide toggle, show only available levels |

## 9. Cross-Platform Strategy

All platform-specific code isolated in `electron/platform/`:

```
PlatformAdapter interface:
  - registerGlobalHotkey(callback)
  - applyVibrancy(BrowserWindow)
  - setWindowBlurBehavior(BrowserWindow)
  - getTrayIconSize()

MacOSAdapter   → macOS native APIs
WindowsAdapter → Win32 native APIs
```

Vue frontend and Spring Boot backend: zero platform-specific code.
To add Windows support: implement `WindowsAdapter` + adjust build config only.

## 10. Open Questions

- Spring Boot embedded in Electron: evaluate node-java vs GraalVM native-image vs subprocess fallback during implementation
- File preprocessing (OCR/speech-to-text): evaluate library availability and bundle size
- Anti-detection for web scraping: evaluate stealth plugins and human-like interaction patterns
