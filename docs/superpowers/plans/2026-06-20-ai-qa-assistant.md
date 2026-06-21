# AI Q&A Assistant — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a macOS desktop AI assistant with Electron + Vue 3 + Spring Boot + H2 + Playwright. Multi-model web scraping, no API keys needed.

**Architecture:** Four layers — Electron shell (system interaction), Vue 3 (UI), Spring Boot (core logic + engines), AI model web targets (external). Vue talks to Spring Boot via REST + WebSocket on localhost. Spring Boot runs Playwright/ApiReverse engines to scrape AI model web UIs.

**Tech Stack:** Electron 33, Vue 3 + TypeScript + Pinia + Vite, Spring Boot 3 + Java 21 + Maven, H2, Playwright, OkHttp, electron-builder.

---

## Phase 1: Project Scaffold

### Task 1.1: Initialize Electron + Vue project

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/tsconfig.json`
- Create: `frontend/index.html`
- Create: `frontend/src/main.ts`
- Create: `frontend/src/App.vue`
- Create: `electron/package.json`
- Create: `electron/tsconfig.json`
- Create: `electron/main.ts`
- Create: `electron/preload.ts`
- Create: `package.json` (root, scripts only)

- [ ] **Step 1: Create root package.json with workspace scripts**

```json
{
  "name": "ai-qa-assistant",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev:frontend": "cd frontend && npm run dev",
    "dev:electron": "cd electron && npm run dev",
    "dev:backend": "cd backend && mvn spring-boot:run",
    "build:frontend": "cd frontend && npm run build",
    "build:backend": "cd backend && mvn package -DskipTests",
    "build:electron": "cd electron && npm run build",
    "package:mac": "electron-builder --mac",
    "package:win": "electron-builder --win"
  }
}
```

- [ ] **Step 2: Create frontend/package.json**

```json
{
  "name": "ai-qa-assistant-frontend",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc --noEmit && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "vue": "^3.5.0",
    "pinia": "^2.2.0",
    "markdown-it": "^14.1.0",
    "highlight.js": "^11.10.0",
    "@vueuse/core": "^11.0.0"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.1.0",
    "typescript": "^5.6.0",
    "vite": "^6.0.0",
    "vue-tsc": "^2.1.0"
  }
}
```

- [ ] **Step 3: Create frontend/vite.config.ts**

```typescript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8080',
      '/ws': {
        target: 'ws://localhost:8080',
        ws: true
      }
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
})
```

- [ ] **Step 4: Create frontend/index.html**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AI Q&A Assistant</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #app { height: 100%; overflow: hidden; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC',
                   'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
      background: transparent;
    }
  </style>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

- [ ] **Step 5: Create frontend/src/main.ts**

```typescript
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'

const app = createApp(App)
app.use(createPinia())
app.mount('#app')
```

- [ ] **Step 6: Create minimal frontend/src/App.vue**

```vue
<template>
  <div class="app-shell">
    <h1>AI Q&A Assistant</h1>
    <p>Loading...</p>
  </div>
</template>

<script setup lang="ts">
</script>

<style>
.app-shell {
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(30, 30, 46, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  color: #e0e0e0;
}
</style>
```

- [ ] **Step 7: Create electron/package.json**

```json
{
  "name": "ai-qa-assistant-electron",
  "version": "1.0.0",
  "private": true,
  "main": "dist/main.js",
  "scripts": {
    "dev": "tsc && electron dist/main.js",
    "build": "tsc",
    "package": "electron-builder"
  },
  "dependencies": {
    "electron": "^33.0.0"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "electron-builder": "^25.0.0"
  },
  "build": {
    "appId": "com.aiqa.assistant",
    "productName": "AI Q&A Assistant",
    "mac": {
      "category": "public.app-category.productivity",
      "target": ["dmg", "zip"]
    },
    "win": {
      "target": ["nsis"]
    },
    "files": [
      "dist/**/*",
      "../frontend/dist/**/*",
      "../backend/target/*.jar"
    ]
  }
}
```

- [ ] **Step 8: Create electron/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "outDir": "dist",
    "rootDir": ".",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["*.ts", "platform/*.ts"]
}
```

- [ ] **Step 9: Create minimal electron/main.ts**

```typescript
import { app, BrowserWindow, Tray, Menu, globalShortcut } from 'electron';
import path from 'path';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    frame: false,
    transparent: true,
    vibrancy: 'fullscreen-ui',
    resizable: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // In dev: load Vite dev server. In prod: load built files.
  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../frontend/dist/index.html'));
  }

  mainWindow.on('blur', () => {
    mainWindow?.hide();
  });
}

app.whenReady().then(() => {
  createWindow();
  // Tray and hotkey setup in later tasks
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (!mainWindow) {
    createWindow();
  }
});
```

- [ ] **Step 10: Create minimal electron/preload.ts**

```typescript
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  showWindow: () => ipcRenderer.send('window:show'),
  hideWindow: () => ipcRenderer.send('window:hide'),
  onToggleVisibility: (callback: () => void) => {
    ipcRenderer.on('toggle-visibility', callback);
  }
});
```

- [ ] **Step 11: Install frontend dependencies and verify dev server**

```bash
cd /Users/huanggang/Documents/ai-qa-assistant/frontend && npm install
```

Expected: `npm install` completes without errors.

- [ ] **Step 12: Run frontend dev server to verify**

```bash
cd /Users/huanggang/Documents/ai-qa-assistant/frontend && npx vite --host &
```

Expected: Vite dev server starts on port 5173. Kill after verifying.

- [ ] **Step 13: Commit**

```bash
cd /Users/huanggang/Documents/ai-qa-assistant && git init && git add -A && git commit -m "feat: scaffold Electron + Vue 3 project"
```

---

### Task 1.2: Initialize Spring Boot backend project

**Files:**
- Create: `backend/pom.xml`
- Create: `backend/src/main/java/com/aiqa/AiQaApplication.java`
- Create: `backend/src/main/resources/application.yml`

- [ ] **Step 1: Create backend/pom.xml**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0
         https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.3.0</version>
    </parent>

    <groupId>com.aiqa</groupId>
    <artifactId>ai-qa-assistant-backend</artifactId>
    <version>1.0.0</version>
    <packaging>jar</packaging>
    <name>AI Q&A Assistant Backend</name>

    <properties>
        <java.version>21</java.version>
        <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
    </properties>

    <dependencies>
        <!-- Web + WebSocket -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-websocket</artifactId>
        </dependency>

        <!-- Database -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-data-jpa</artifactId>
        </dependency>
        <dependency>
            <groupId>com.h2database</groupId>
            <artifactId>h2</artifactId>
            <scope>runtime</scope>
        </dependency>

        <!-- Playwright -->
        <dependency>
            <groupId>com.microsoft.playwright</groupId>
            <artifactId>playwright</artifactId>
            <version>1.46.0</version>
        </dependency>

        <!-- HTTP Client -->
        <dependency>
            <groupId>com.squareup.okhttp3</groupId>
            <artifactId>okhttp</artifactId>
            <version>4.12.0</version>
        </dependency>
        <dependency>
            <groupId>com.squareup.okhttp3</groupId>
            <artifactId>okhttp-sse</artifactId>
            <version>4.12.0</version>
        </dependency>

        <!-- JSON -->
        <dependency>
            <groupId>com.fasterxml.jackson.core</groupId>
            <artifactId>jackson-databind</artifactId>
        </dependency>

        <!-- Lombok -->
        <dependency>
            <groupId>org.projectlombok</groupId>
            <artifactId>lombok</artifactId>
            <optional>true</optional>
        </dependency>

        <!-- Test -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
                <configuration>
                    <excludes>
                        <exclude>
                            <groupId>org.projectlombok</groupId>
                            <artifactId>lombok</artifactId>
                        </exclude>
                    </excludes>
                </configuration>
            </plugin>
        </plugins>
    </build>
</project>
```

- [ ] **Step 2: Create AiQaApplication.java**

```java
package com.aiqa;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class AiQaApplication {
    public static void main(String[] args) {
        SpringApplication.run(AiQaApplication.class, args);
    }
}
```

- [ ] **Step 3: Create application.yml**

```yaml
server:
  port: 8080

spring:
  datasource:
    url: jdbc:h2:file:./data/aiqa-db;DB_CLOSE_DELAY=-1;MODE=MySQL
    driver-class-name: org.h2.Driver
    username: sa
    password:
  h2:
    console:
      enabled: true
      path: /h2-console
  jpa:
    hibernate:
      ddl-auto: update
    show-sql: false
    properties:
      hibernate:
        dialect: org.hibernate.dialect.H2Dialect

aiqa:
  workspace: ./data
  playwright:
    headless: true
    chromium-path: ""
```

- [ ] **Step 4: Build and verify backend starts**

```bash
cd /Users/huanggang/Documents/ai-qa-assistant/backend && mvn compile
```

Expected: BUILD SUCCESS.

- [ ] **Step 5: Commit**

```bash
cd /Users/huanggang/Documents/ai-qa-assistant && git add -A && git commit -m "feat: scaffold Spring Boot backend project"
```

---

## Phase 2: Backend Data Layer

### Task 2.1: JPA Entity classes

**Files:**
- Create: `backend/src/main/java/com/aiqa/model/Session.java`
- Create: `backend/src/main/java/com/aiqa/model/Message.java`
- Create: `backend/src/main/java/com/aiqa/model/Attachment.java`
- Create: `backend/src/main/java/com/aiqa/model/ModelConfig.java`
- Create: `backend/src/main/java/com/aiqa/model/CustomModel.java`
- Create: `backend/src/main/java/com/aiqa/model/enums/MessageRole.java`
- Create: `backend/src/main/java/com/aiqa/model/enums/FileType.java`

- [ ] **Step 1: Create MessageRole enum**

```java
package com.aiqa.model.enums;

public enum MessageRole {
    USER, ASSISTANT, SYSTEM
}
```

- [ ] **Step 2: Create FileType enum**

```java
package com.aiqa.model.enums;

public enum FileType {
    IMAGE, VIDEO, AUDIO, DOCUMENT
}
```

- [ ] **Step 3: Create Session entity**

```java
package com.aiqa.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "sessions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Session {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 500)
    private String title;

    @Column(name = "model_name", nullable = false, length = 100)
    private String modelName;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column(length = 10)
    @Builder.Default
    private String icon = "💬";

    @OneToMany(mappedBy = "session", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("createdAt ASC")
    @Builder.Default
    private List<Message> messages = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
```

- [ ] **Step 4: Create Message entity**

```java
package com.aiqa.model;

import com.aiqa.model.enums.MessageRole;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "messages")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Message {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    @ToString.Exclude
    private Session session;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private MessageRole role;

    @Column(columnDefinition = "CLOB")
    private String content;

    @Column(name = "thinking_mode", length = 20)
    private String thinkingMode;

    @Column(name = "tokens_used")
    private Integer tokensUsed;

    @Column(name = "is_rolled_back", nullable = false)
    @Builder.Default
    private Boolean isRolledBack = false;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "message", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Attachment> attachments = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
```

- [ ] **Step 5: Create Attachment entity**

```java
package com.aiqa.model;

import com.aiqa.model.enums.FileType;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "attachments")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Attachment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "message_id", nullable = false)
    @ToString.Exclude
    private Message message;

    @Column(name = "file_name", nullable = false, length = 500)
    private String fileName;

    @Enumerated(EnumType.STRING)
    @Column(name = "file_type", nullable = false, length = 20)
    private FileType fileType;

    @Column(name = "file_path", length = 1000)
    private String filePath;

    @Column(name = "file_size")
    private Long fileSize;

    @Column(name = "extracted_text", columnDefinition = "CLOB")
    private String extractedText;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
```

- [ ] **Step 6: Create ModelConfig entity**

```java
package com.aiqa.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "model_configs")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ModelConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "model_name", nullable = false, unique = true, length = 100)
    private String modelName;

    @Column(name = "display_name", nullable = false, length = 100)
    private String displayName;

    @Column(name = "web_url", nullable = false, length = 500)
    private String webUrl;

    @Column(name = "is_enabled", nullable = false)
    @Builder.Default
    private Boolean isEnabled = true;

    @Column(name = "thinking_levels", columnDefinition = "CLOB")
    @Builder.Default
    private String thinkingLevels = "[]";

    @Column(name = "file_support", columnDefinition = "CLOB")
    @Builder.Default
    private String fileSupport = "[]";

    @Column(name = "is_preset", nullable = false)
    @Builder.Default
    private Boolean isPreset = true;

    @Column(name = "engine_preference", length = 20)
    @Builder.Default
    private String enginePreference = "scraper";
}
```

- [ ] **Step 7: Create CustomModel entity**

```java
package com.aiqa.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "custom_models")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CustomModel {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "display_name", nullable = false, length = 100)
    private String displayName;

    @Column(name = "web_url", nullable = false, length = 500)
    private String webUrl;

    @Column(name = "engine_type", length = 20)
    @Builder.Default
    private String engineType = "scraper";

    @Column(name = "thinking_levels", columnDefinition = "CLOB")
    @Builder.Default
    private String thinkingLevels = "[]";

    @Column(name = "file_support", columnDefinition = "CLOB")
    @Builder.Default
    private String fileSupport = "[]";

    @Column(name = "is_enabled", nullable = false)
    @Builder.Default
    private Boolean isEnabled = true;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
```

- [ ] **Step 8: Build to verify entities compile**

```bash
cd /Users/huanggang/Documents/ai-qa-assistant/backend && mvn compile
```

Expected: BUILD SUCCESS.

- [ ] **Step 9: Commit**

```bash
cd /Users/huanggang/Documents/ai-qa-assistant && git add -A && git commit -m "feat: add JPA entity classes"
```

---

### Task 2.2: Repository interfaces

**Files:**
- Create: `backend/src/main/java/com/aiqa/repository/SessionRepository.java`
- Create: `backend/src/main/java/com/aiqa/repository/MessageRepository.java`
- Create: `backend/src/main/java/com/aiqa/repository/AttachmentRepository.java`
- Create: `backend/src/main/java/com/aiqa/repository/ModelConfigRepository.java`
- Create: `backend/src/main/java/com/aiqa/repository/CustomModelRepository.java`

- [ ] **Step 1: Create all repository interfaces**

```java
// SessionRepository.java
package com.aiqa.repository;

import com.aiqa.model.Session;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface SessionRepository extends JpaRepository<Session, Long> {
    List<Session> findByIsActiveTrueOrderByUpdatedAtDesc();
    List<Session> findByIsActiveFalseOrderByUpdatedAtDesc();

    @Query(value = "SELECT * FROM sessions s WHERE " +
           "s.title ILIKE CONCAT('%', :keyword, '%') OR " +
           "EXISTS (SELECT 1 FROM messages m WHERE m.session_id = s.id AND m.content ILIKE CONCAT('%', :keyword, '%')) " +
           "ORDER BY s.updated_at DESC",
           nativeQuery = true)
    List<Session> searchByKeyword(@Param("keyword") String keyword);
}
```

```java
// MessageRepository.java
package com.aiqa.repository;

import com.aiqa.model.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface MessageRepository extends JpaRepository<Message, Long> {
    List<Message> findBySessionIdOrderByCreatedAtAsc(Long sessionId);
    long countBySessionId(Long sessionId);
}
```

```java
// AttachmentRepository.java
package com.aiqa.repository;

import com.aiqa.model.Attachment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AttachmentRepository extends JpaRepository<Attachment, Long> {
    List<Attachment> findByMessageId(Long messageId);
}
```

```java
// ModelConfigRepository.java
package com.aiqa.repository;

import com.aiqa.model.ModelConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface ModelConfigRepository extends JpaRepository<ModelConfig, Long> {
    Optional<ModelConfig> findByModelName(String modelName);
    List<ModelConfig> findByIsEnabledTrue();
    List<ModelConfig> findByIsPresetTrue();
}
```

```java
// CustomModelRepository.java
package com.aiqa.repository;

import com.aiqa.model.CustomModel;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CustomModelRepository extends JpaRepository<CustomModel, Long> {
    List<CustomModel> findByIsEnabledTrue();
}
```

- [ ] **Step 2: Build to verify repositories compile**

```bash
cd /Users/huanggang/Documents/ai-qa-assistant/backend && mvn compile
```

Expected: BUILD SUCCESS.

- [ ] **Step 3: Commit**

```bash
cd /Users/huanggang/Documents/ai-qa-assistant && git add -A && git commit -m "feat: add JPA repository interfaces"
```

---

### Task 2.3: Database initializer (preset models seeder)

**Files:**
- Create: `backend/src/main/java/com/aiqa/config/DataInitializer.java`

- [ ] **Step 1: Create DataInitializer**

```java
package com.aiqa.config;

import com.aiqa.model.ModelConfig;
import com.aiqa.repository.ModelConfigRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class DataInitializer implements CommandLineRunner {

    private final ModelConfigRepository modelConfigRepo;

    public DataInitializer(ModelConfigRepository modelConfigRepo) {
        this.modelConfigRepo = modelConfigRepo;
    }

    @Override
    public void run(String... args) {
        seedModel("deepseek", "DeepSeek", "https://chat.deepseek.com",
                  "[{\"id\":\"quick\",\"label\":\"快速思考\"},{\"id\":\"deep\",\"label\":\"深度思考\"}]",
                  "[\"IMAGE\"]");
        seedModel("qwen", "通义千问", "https://tongyi.aliyun.com/qianwen",
                  "[{\"id\":\"quick\",\"label\":\"快速思考\"},{\"id\":\"deep\",\"label\":\"深度思考\"}]",
                  "[\"IMAGE\",\"DOCUMENT\"]");
        seedModel("ernie", "文心一言", "https://yiyan.baidu.com",
                  "[{\"id\":\"default\",\"label\":\"默认\"}]",
                  "[\"IMAGE\",\"DOCUMENT\"]");
        seedModel("kimi", "Kimi", "https://kimi.moonshot.cn",
                  "[{\"id\":\"default\",\"label\":\"默认\"}]",
                  "[\"IMAGE\",\"DOCUMENT\"]");
        seedModel("doubao", "豆包", "https://www.doubao.com/chat",
                  "[{\"id\":\"default\",\"label\":\"默认\"}]",
                  "[\"IMAGE\",\"DOCUMENT\"]");
        seedModel("chatgpt", "ChatGPT", "https://chatgpt.com",
                  "[{\"id\":\"quick\",\"label\":\"快速思考\"},{\"id\":\"deep\",\"label\":\"深度思考\"}]",
                  "[\"IMAGE\",\"DOCUMENT\"]");
    }

    private void seedModel(String name, String displayName, String url,
                           String thinkingLevels, String fileSupport) {
        if (modelConfigRepo.findByModelName(name).isEmpty()) {
            ModelConfig config = ModelConfig.builder()
                    .modelName(name)
                    .displayName(displayName)
                    .webUrl(url)
                    .thinkingLevels(thinkingLevels)
                    .fileSupport(fileSupport)
                    .isPreset(true)
                    .isEnabled(true)
                    .enginePreference("scraper")
                    .build();
            modelConfigRepo.save(config);
        }
    }
}
```

- [ ] **Step 2: Run backend and verify DB initialization**

```bash
cd /Users/huanggang/Documents/ai-qa-assistant/backend && mvn spring-boot:run
```

Expected: Application starts, check `data/aiqa-db.mv.db` created. Stop after verifying.

- [ ] **Step 3: Commit**

```bash
cd /Users/huanggang/Documents/ai-qa-assistant && git add -A && git commit -m "feat: add preset model data initializer"
```

---

## Phase 3: Backend Engine Layer

### Task 3.1: ModelAdapter interface and DTOs

**Files:**
- Create: `backend/src/main/java/com/aiqa/engine/ModelAdapter.java`
- Create: `backend/src/main/java/com/aiqa/engine/ThinkingLevel.java`
- Create: `backend/src/main/java/com/aiqa/engine/ChatRequest.java`
- Create: `backend/src/main/java/com/aiqa/engine/ChatChunk.java`

- [ ] **Step 1: Create ThinkingLevel record**

```java
package com.aiqa.engine;

public record ThinkingLevel(String id, String label) {}
```

- [ ] **Step 2: Create ChatRequest record**

```java
package com.aiqa.engine;

import com.aiqa.model.enums.FileType;
import java.util.List;

public record ChatRequest(
    String message,
    String thinkingLevelId,
    List<FileAttachment> files
) {
    public record FileAttachment(
        String fileName,
        FileType fileType,
        byte[] data
    ) {}
}
```

- [ ] **Step 3: Create ChatChunk record**

```java
package com.aiqa.engine;

public record ChatChunk(
    String content,
    boolean isComplete,
    boolean isError,
    String errorMessage
) {
    public static ChatChunk text(String content) {
        return new ChatChunk(content, false, false, null);
    }

    public static ChatChunk done() {
        return new ChatChunk("", true, false, null);
    }

    public static ChatChunk error(String message) {
        return new ChatChunk("", true, true, message);
    }
}
```

- [ ] **Step 4: Create ModelAdapter interface**

```java
package com.aiqa.engine;

import com.aiqa.model.enums.FileType;
import reactor.core.publisher.Flux;
import java.util.List;
import java.util.Set;

public interface ModelAdapter {

    Flux<ChatChunk> send(ChatRequest request);

    void cancel();

    List<ThinkingLevel> getThinkingLevels();

    Set<FileType> getSupportedFileTypes();

    boolean isAvailable();

    String getModelName();
}
```

- [ ] **Step 5: Build**

```bash
cd /Users/huanggang/Documents/ai-qa-assistant/backend && mvn compile
```

- [ ] **Step 6: Commit**

```bash
cd /Users/huanggang/Documents/ai-qa-assistant && git add -A && git commit -m "feat: add ModelAdapter interface and DTOs"
```

---

### Task 3.2: WebScraperEngine (Playwright)

**Files:**
- Create: `backend/src/main/java/com/aiqa/engine/WebScraperEngine.java`

- [ ] **Step 1: Create WebScraperEngine**

```java
package com.aiqa.engine;

import com.microsoft.playwright.*;
import com.microsoft.playwright.options.LoadState;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Sinks;

import java.nio.file.Path;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.function.Consumer;

public class WebScraperEngine {

    private static final Logger log = LoggerFactory.getLogger(WebScraperEngine.class);

    private final String webUrl;
    private final Playwright playwright;
    private final Browser browser;
    private final AtomicBoolean cancelled = new AtomicBoolean(false);
    private volatile BrowserContext context;
    private volatile Page page;

    public WebScraperEngine(String webUrl) {
        this.webUrl = webUrl;
        this.playwright = Playwright.create();
        this.browser = playwright.chromium().launch(new BrowserType.LaunchOptions()
                .setHeadless(true));
    }

    public Flux<ChatChunk> execute(ScraperConfig config) {
        cancelled.set(false);
        Sinks.Many<ChatChunk> sink = Sinks.many().unicast().onBackpressureBuffer();

        Thread.startVirtualThread(() -> {
            try {
                context = browser.newContext(new Browser.NewContextOptions()
                        .setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                                + "AppleWebKit/537.36 (KHTML, like Gecko) "
                                + "Chrome/125.0.0.0 Safari/537.36"));
                page = context.newPage();

                page.navigate(webUrl);
                page.waitForLoadState(LoadState.NETWORKIDLE);

                // Type message into input
                String inputSelector = config.inputSelector();
                page.waitForSelector(inputSelector);
                page.fill(inputSelector, config.message());

                // Toggle thinking mode if needed
                if (config.thinkingSelector() != null) {
                    page.click(config.thinkingSelector());
                }

                // Upload files if any
                for (int i = 0; i < config.filePaths().size(); i++) {
                    page.setInputFiles(config.fileInputSelector(),
                            new Path[]{Path.of(config.filePaths().get(i))});
                }

                // Click send
                page.click(config.sendButtonSelector());

                // Watch for response
                String responseSelector = config.responseSelector();
                String stopSelector = config.stopButtonSelector();
                String lastText = "";

                while (!cancelled.get()) {
                    try {
                        Thread.sleep(150);
                        String currentText = page.textContent(responseSelector);
                        if (currentText != null && currentText.length() > lastText.length()) {
                            String newChunk = currentText.substring(lastText.length());
                            lastText = currentText;
                            sink.tryEmitNext(ChatChunk.text(newChunk));
                        }
                        // Check if generation stopped (stop button gone)
                        if (page.querySelector(stopSelector) == null && !lastText.isEmpty()) {
                            sink.tryEmitNext(ChatChunk.done());
                            break;
                        }
                    } catch (Exception e) {
                        if (!cancelled.get()) {
                            sink.tryEmitNext(ChatChunk.error(e.getMessage()));
                        }
                        break;
                    }
                }

                if (cancelled.get() && !lastText.isEmpty()) {
                    sink.tryEmitNext(ChatChunk.done());
                }
            } catch (Exception e) {
                log.error("Scraper error for {}: {}", webUrl, e.getMessage());
                sink.tryEmitNext(ChatChunk.error(e.getMessage()));
            } finally {
                sink.tryEmitComplete();
            }
        });

        return sink.asFlux();
    }

    public void cancel() {
        cancelled.set(true);
        closePage();
    }

    private void closePage() {
        try {
            if (page != null) page.close();
            if (context != null) context.close();
        } catch (Exception ignored) {}
    }

    public void cleanup() {
        cancel();
        try { browser.close(); } catch (Exception ignored) {}
        try { playwright.close(); } catch (Exception ignored) {}
    }

    public record ScraperConfig(
            String message,
            String inputSelector,
            String sendButtonSelector,
            String responseSelector,
            String stopButtonSelector,
            String thinkingSelector,
            String fileInputSelector,
            java.util.List<String> filePaths
    ) {}
}
```

- [ ] **Step 2: Build**

```bash
cd /Users/huanggang/Documents/ai-qa-assistant/backend && mvn compile
```

- [ ] **Step 3: Commit**

```bash
cd /Users/huanggang/Documents/ai-qa-assistant && git add -A && git commit -m "feat: add WebScraperEngine with Playwright"
```

---

### Task 3.3: ApiReverseEngine

**Files:**
- Create: `backend/src/main/java/com/aiqa/engine/ApiReverseEngine.java`

- [ ] **Step 1: Create ApiReverseEngine**

```java
package com.aiqa.engine;

import okhttp3.*;
import okhttp3.sse.EventSource;
import okhttp3.sse.EventSourceListener;
import okhttp3.sse.EventSources;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Sinks;

import java.util.Map;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

public class ApiReverseEngine {

    private static final Logger log = LoggerFactory.getLogger(ApiReverseEngine.class);

    private final OkHttpClient client;
    private final AtomicReference<EventSource> currentEventSource = new AtomicReference<>();

    public ApiReverseEngine() {
        this.client = new OkHttpClient.Builder()
                .connectTimeout(30, TimeUnit.SECONDS)
                .readTimeout(5, TimeUnit.MINUTES)
                .build();
    }

    public Flux<ChatChunk> execute(ApiConfig config) {
        Sinks.Many<ChatChunk> sink = Sinks.many().unicast().onBackpressureBuffer();

        try {
            RequestBody body = RequestBody.create(
                    config.requestBody(),
                    MediaType.parse("application/json")
            );

            Request.Builder requestBuilder = new Request.Builder()
                    .url(config.endpoint())
                    .post(body);

            for (Map.Entry<String, String> header : config.headers().entrySet()) {
                requestBuilder.addHeader(header.getKey(), header.getValue());
            }

            Request request = requestBuilder.build();

            EventSourceListener listener = new EventSourceListener() {
                @Override
                public void onEvent(EventSource es, String id, String type, String data) {
                    String content = config.responseParser().parse(data);
                    if (content != null) {
                        if ("[DONE]".equals(content)) {
                            sink.tryEmitNext(ChatChunk.done());
                        } else {
                            sink.tryEmitNext(ChatChunk.text(content));
                        }
                    }
                }

                @Override
                public void onClosed(EventSource es) {
                    sink.tryEmitNext(ChatChunk.done());
                    sink.tryEmitComplete();
                }

                @Override
                public void onFailure(EventSource es, Throwable t, Response response) {
                    String msg = t != null ? t.getMessage() :
                            (response != null ? response.message() : "Unknown error");
                    sink.tryEmitNext(ChatChunk.error(msg));
                    sink.tryEmitComplete();
                }
            };

            EventSource es = EventSources.createFactory(client)
                    .newEventSource(request, listener);
            currentEventSource.set(es);

        } catch (Exception e) {
            log.error("API engine error: {}", e.getMessage());
            sink.tryEmitNext(ChatChunk.error(e.getMessage()));
            sink.tryEmitComplete();
        }

        return sink.asFlux();
    }

    public void cancel() {
        EventSource es = currentEventSource.getAndSet(null);
        if (es != null) {
            es.cancel();
        }
    }

    public record ApiConfig(
            String endpoint,
            String requestBody,
            Map<String, String> headers,
            ResponseParser responseParser
    ) {
        @FunctionalInterface
        public interface ResponseParser {
            String parse(String rawData);
        }
    }
}
```

- [ ] **Step 2: Build**

```bash
cd /Users/huanggang/Documents/ai-qa-assistant/backend && mvn compile
```

- [ ] **Step 3: Commit**

```bash
cd /Users/huanggang/Documents/ai-qa-assistant && git add -A && git commit -m "feat: add ApiReverseEngine with SSE support"
```

---

### Task 3.4: AbstractModelAdapter with fallback

**Files:**
- Create: `backend/src/main/java/com/aiqa/engine/AbstractModelAdapter.java`

- [ ] **Step 1: Create AbstractModelAdapter**

```java
package com.aiqa.engine;

import com.aiqa.model.enums.FileType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import reactor.core.publisher.Flux;

import java.util.List;
import java.util.Set;

public abstract class AbstractModelAdapter implements ModelAdapter {

    private static final Logger log = LoggerFactory.getLogger(AbstractModelAdapter.class);

    protected final String modelName;
    protected final String webUrl;
    protected volatile boolean cancelled = false;

    protected AbstractModelAdapter(String modelName, String webUrl) {
        this.modelName = modelName;
        this.webUrl = webUrl;
    }

    @Override
    public Flux<ChatChunk> send(ChatRequest request) {
        cancelled = false;
        return tryPrimaryEngine(request)
                .onErrorResume(e -> {
                    log.warn("Primary engine failed for {}, falling back. Error: {}",
                            modelName, e.getMessage());
                    return tryFallbackEngine(request);
                });
    }

    protected abstract Flux<ChatChunk> tryPrimaryEngine(ChatRequest request);

    protected abstract Flux<ChatChunk> tryFallbackEngine(ChatRequest request);

    @Override
    public void cancel() {
        cancelled = true;
    }

    @Override
    public String getModelName() {
        return modelName;
    }
}
```

- [ ] **Step 2: Build**

```bash
cd /Users/huanggang/Documents/ai-qa-assistant/backend && mvn compile
```

- [ ] **Step 3: Commit**

```bash
cd /Users/huanggang/Documents/ai-qa-assistant && git add -A && git commit -m "feat: add AbstractModelAdapter with fallback pattern"
```

---

### Task 3.5: DeepSeek Adapter (example model adapter)

**Files:**
- Create: `backend/src/main/java/com/aiqa/engine/adapters/DeepSeekAdapter.java`

- [ ] **Step 1: Create DeepSeekAdapter**

```java
package com.aiqa.engine.adapters;

import com.aiqa.engine.*;
import com.aiqa.model.enums.FileType;
import reactor.core.publisher.Flux;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;

public class DeepSeekAdapter extends AbstractModelAdapter {

    private static final String DEEPSEEK_URL = "https://chat.deepseek.com";
    private static final List<ThinkingLevel> THINKING_LEVELS = List.of(
            new ThinkingLevel("quick", "快速思考"),
            new ThinkingLevel("deep", "深度思考")
    );

    private final WebScraperEngine scraperEngine;
    private final ApiReverseEngine apiEngine;
    private volatile WebScraperEngine activeScraper;

    public DeepSeekAdapter() {
        super("deepseek", DEEPSEEK_URL);
        this.scraperEngine = new WebScraperEngine(DEEPSEEK_URL);
        this.apiEngine = new ApiReverseEngine();
    }

    @Override
    protected Flux<ChatChunk> tryPrimaryEngine(ChatRequest request) {
        // Primary: scrape the web chat UI
        List<String> filePaths = new ArrayList<>();
        if (request.files() != null) {
            for (var f : request.files()) {
                try {
                    Path tmp = Files.createTempFile("aiqa_upload_", f.fileName());
                    Files.write(tmp, f.data());
                    filePaths.add(tmp.toString());
                } catch (Exception e) {
                    return Flux.just(ChatChunk.error("File write failed: " + e.getMessage()));
                }
            }
        }

        String thinkingSelector = null;
        if ("deep".equals(request.thinkingLevelId())) {
            thinkingSelector = "button[data-thinking='deep']";
        }

        var config = new WebScraperEngine.ScraperConfig(
                request.message(),
                "textarea#chat-input",
                "button.send-btn",
                "div.ds-markdown",
                "button.stop-btn",
                thinkingSelector,
                "input[type='file']",
                filePaths
        );

        activeScraper = scraperEngine;
        return scraperEngine.execute(config)
                .doOnComplete(() -> filePaths.forEach(p -> {
                    try { Files.deleteIfExists(Path.of(p)); } catch (Exception ignored) {}
                }));
    }

    @Override
    protected Flux<ChatChunk> tryFallbackEngine(ChatRequest request) {
        // Fallback: try internal API
        String body = String.format(
                "{\"message\":\"%s\",\"thinking\":\"%s\"}",
                request.message().replace("\"", "\\\""),
                request.thinkingLevelId()
        );

        var config = new ApiReverseEngine.ApiConfig(
                "https://chat.deepseek.com/api/v1/chat/stream",
                body,
                Map.of("Content-Type", "application/json"),
                data -> {
                    // Parse SSE data: {"choices":[{"delta":{"content":"..."}}]}
                    try {
                        var node = com.fasterxml.jackson.databind.ObjectMapper.class;
                        // Simplified parsing — actual impl parses JSON properly
                        if (data.contains("\"content\"")) {
                            int start = data.indexOf("\"content\":\"") + 11;
                            int end = data.indexOf("\"", start);
                            return data.substring(start, end);
                        }
                    } catch (Exception ignored) {}
                    return null;
                }
        );

        return apiEngine.execute(config);
    }

    @Override
    public void cancel() {
        super.cancel();
        if (activeScraper != null) activeScraper.cancel();
        apiEngine.cancel();
    }

    @Override
    public List<ThinkingLevel> getThinkingLevels() {
        return THINKING_LEVELS;
    }

    @Override
    public Set<FileType> getSupportedFileTypes() {
        return Set.of(FileType.IMAGE);
    }

    @Override
    public boolean isAvailable() {
        return true;
    }
}
```

- [ ] **Step 2: Build**

```bash
cd /Users/huanggang/Documents/ai-qa-assistant/backend && mvn compile
```

- [ ] **Step 3: Commit**

```bash
cd /Users/huanggang/Documents/ai-qa-assistant && git add -A && git commit -m "feat: add DeepSeekAdapter with dual-engine support"
```

---

### Task 3.6: ModelAdapterFactory

**Files:**
- Create: `backend/src/main/java/com/aiqa/engine/ModelAdapterFactory.java`

- [ ] **Step 1: Create ModelAdapterFactory**

```java
package com.aiqa.engine;

import com.aiqa.engine.adapters.DeepSeekAdapter;
import com.aiqa.repository.ModelConfigRepository;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class ModelAdapterFactory {

    private final Map<String, ModelAdapter> adapters = new ConcurrentHashMap<>();
    private final ModelConfigRepository modelConfigRepo;

    public ModelAdapterFactory(ModelConfigRepository modelConfigRepo) {
        this.modelConfigRepo = modelConfigRepo;
        registerDefaults();
    }

    private void registerDefaults() {
        register("deepseek", new DeepSeekAdapter());
        // Additional adapters registered here in later tasks:
        // register("qwen", new QwenAdapter());
        // register("kimi", new KimiAdapter());
        // etc.
    }

    public void register(String modelName, ModelAdapter adapter) {
        adapters.put(modelName, adapter);
    }

    public ModelAdapter getAdapter(String modelName) {
        ModelAdapter adapter = adapters.get(modelName);
        if (adapter == null) {
            throw new IllegalArgumentException("Unknown model: " + modelName);
        }
        return adapter;
    }

    public Map<String, ModelAdapter> getAllAdapters() {
        return Map.copyOf(adapters);
    }
}
```

- [ ] **Step 2: Build**

```bash
cd /Users/huanggang/Documents/ai-qa-assistant/backend && mvn compile
```

- [ ] **Step 3: Commit**

```bash
cd /Users/huanggang/Documents/ai-qa-assistant && git add -A && git commit -m "feat: add ModelAdapterFactory"
```

---

## Phase 4: Backend Service & API Layer

### Task 4.1: SessionService

**Files:**
- Create: `backend/src/main/java/com/aiqa/service/SessionService.java`

- [ ] **Step 1: Create SessionService**

```java
package com.aiqa.service;

import com.aiqa.model.Message;
import com.aiqa.model.Session;
import com.aiqa.model.enums.MessageRole;
import com.aiqa.repository.MessageRepository;
import com.aiqa.repository.SessionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class SessionService {

    private final SessionRepository sessionRepo;
    private final MessageRepository messageRepo;

    public SessionService(SessionRepository sessionRepo, MessageRepository messageRepo) {
        this.sessionRepo = sessionRepo;
        this.messageRepo = messageRepo;
    }

    public Session createSession(String title, String modelName) {
        Session session = Session.builder()
                .title(title)
                .modelName(modelName)
                .isActive(true)
                .build();
        return sessionRepo.save(session);
    }

    public Optional<Session> getSession(Long id) {
        return sessionRepo.findById(id);
    }

    public List<Session> getActiveSessions() {
        return sessionRepo.findByIsActiveTrueOrderByUpdatedAtDesc();
    }

    public List<Session> getHistorySessions() {
        return sessionRepo.findByIsActiveFalseOrderByUpdatedAtDesc();
    }

    public List<Session> searchSessions(String keyword) {
        return sessionRepo.searchByKeyword(keyword);
    }

    public Session updateTitle(Long sessionId, String title) {
        Session session = sessionRepo.findById(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Session not found: " + sessionId));
        session.setTitle(title);
        return sessionRepo.save(session);
    }

    public void deleteSession(Long sessionId) {
        sessionRepo.deleteById(sessionId);
    }

    public Message addMessage(Long sessionId, MessageRole role, String content,
                              String thinkingMode) {
        Session session = sessionRepo.findById(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Session not found: " + sessionId));

        Message message = Message.builder()
                .session(session)
                .role(role)
                .content(content)
                .thinkingMode(thinkingMode)
                .build();

        message = messageRepo.save(message);
        session.setUpdatedAt(LocalDateTime.now());
        sessionRepo.save(session);

        return message;
    }

    public List<Message> getMessages(Long sessionId) {
        return messageRepo.findBySessionIdOrderByCreatedAtAsc(sessionId);
    }

    public void rollbackMessage(Long messageId) {
        Message msg = messageRepo.findById(messageId)
                .orElseThrow(() -> new IllegalArgumentException("Message not found: " + messageId));
        msg.setIsRolledBack(true);
        messageRepo.save(msg);
    }

    public void closeSession(Long sessionId) {
        Session session = sessionRepo.findById(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Session not found: " + sessionId));
        session.setIsActive(false);
        sessionRepo.save(session);
    }
}
```

- [ ] **Step 2: Build**

```bash
cd /Users/huanggang/Documents/ai-qa-assistant/backend && mvn compile
```

- [ ] **Step 3: Commit**

```bash
cd /Users/huanggang/Documents/ai-qa-assistant && git add -A && git commit -m "feat: add SessionService"
```

---

### Task 4.2: ChatService

**Files:**
- Create: `backend/src/main/java/com/aiqa/service/ChatService.java`

- [ ] **Step 1: Create ChatService**

```java
package com.aiqa.service;

import com.aiqa.engine.ChatChunk;
import com.aiqa.engine.ChatRequest;
import com.aiqa.engine.ModelAdapter;
import com.aiqa.engine.ModelAdapterFactory;
import com.aiqa.model.Message;
import com.aiqa.model.enums.MessageRole;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

@Service
public class ChatService {

    private static final Logger log = LoggerFactory.getLogger(ChatService.class);

    private final ModelAdapterFactory adapterFactory;
    private final SessionService sessionService;
    private final ConcurrentMap<Long, String> activeStreams = new ConcurrentHashMap<>();

    public ChatService(ModelAdapterFactory adapterFactory, SessionService sessionService) {
        this.adapterFactory = adapterFactory;
        this.sessionService = sessionService;
    }

    public Flux<ChatChunk> sendMessage(Long sessionId, String modelName,
                                       String message, String thinkingLevelId) {
        // Save user message
        sessionService.addMessage(sessionId, MessageRole.USER, message, thinkingLevelId);

        ModelAdapter adapter = adapterFactory.getAdapter(modelName);

        ChatRequest request = new ChatRequest(message, thinkingLevelId, null);

        StringBuilder responseBuilder = new StringBuilder();

        return adapter.send(request)
                .doOnNext(chunk -> {
                    if (!chunk.isError() && !chunk.content().isEmpty()) {
                        responseBuilder.append(chunk.content());
                    }
                })
                .doOnComplete(() -> {
                    // Save assistant response
                    if (!responseBuilder.isEmpty()) {
                        sessionService.addMessage(sessionId, MessageRole.ASSISTANT,
                                responseBuilder.toString(), thinkingLevelId);
                    }
                    activeStreams.remove(sessionId);
                })
                .doOnError(e -> {
                    log.error("Chat error for session {}: {}", sessionId, e.getMessage());
                    if (!responseBuilder.isEmpty()) {
                        sessionService.addMessage(sessionId, MessageRole.ASSISTANT,
                                responseBuilder.toString(), thinkingLevelId);
                    }
                    activeStreams.remove(sessionId);
                });
    }

    public void cancelGeneration(Long sessionId) {
        String modelName = activeStreams.get(sessionId);
        if (modelName != null) {
            ModelAdapter adapter = adapterFactory.getAdapter(modelName);
            adapter.cancel();
            activeStreams.remove(sessionId);
        }
    }
}
```

- [ ] **Step 2: Build**

```bash
cd /Users/huanggang/Documents/ai-qa-assistant/backend && mvn compile
```

- [ ] **Step 3: Commit**

```bash
cd /Users/huanggang/Documents/ai-qa-assistant && git add -A && git commit -m "feat: add ChatService with streaming support"
```

---

### Task 4.3: HistorySearchService

**Files:**
- Create: `backend/src/main/java/com/aiqa/service/HistorySearchService.java`

- [ ] **Step 1: Create HistorySearchService**

```java
package com.aiqa.service;

import com.aiqa.model.Session;
import com.aiqa.repository.SessionRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class HistorySearchService {

    private final SessionRepository sessionRepo;

    public HistorySearchService(SessionRepository sessionRepo) {
        this.sessionRepo = sessionRepo;
    }

    public List<Session> search(String keyword) {
        return sessionRepo.searchByKeyword(keyword);
    }

    public List<Session> getHistoryGroupedByDate() {
        return sessionRepo.findByIsActiveFalseOrderByUpdatedAtDesc();
    }
}
```

- [ ] **Step 2: Build and commit**

```bash
cd /Users/huanggang/Documents/ai-qa-assistant/backend && mvn compile && cd ../.. && git add -A && git commit -m "feat: add HistorySearchService"
```

---

### Task 4.4: WebSocket configuration

**Files:**
- Create: `backend/src/main/java/com/aiqa/config/WebSocketConfig.java`

- [ ] **Step 1: Create WebSocketConfig**

```java
package com.aiqa.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic");
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws/chat")
                .setAllowedOriginPatterns("*")
                .withSockJS();
    }
}
```

- [ ] **Step 2: Build and commit**

```bash
cd /Users/huanggang/Documents/ai-qa-assistant/backend && mvn compile && cd ../.. && git add -A && git commit -m "feat: add WebSocket STOMP configuration"
```

---

### Task 4.5: REST Controllers

**Files:**
- Create: `backend/src/main/java/com/aiqa/controller/ChatController.java`
- Create: `backend/src/main/java/com/aiqa/controller/SessionController.java`
- Create: `backend/src/main/java/com/aiqa/controller/ModelController.java`

- [ ] **Step 1: Create ChatController**

```java
package com.aiqa.controller;

import com.aiqa.engine.ChatChunk;
import com.aiqa.service.ChatService;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

import java.util.Map;

@RestController
@RequestMapping("/api/chat")
public class ChatController {

    private final ChatService chatService;

    public ChatController(ChatService chatService) {
        this.chatService = chatService;
    }

    @PostMapping(value = "/send", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ChatChunk> sendMessage(@RequestBody Map<String, Object> body) {
        Long sessionId = Long.valueOf(body.get("sessionId").toString());
        String modelName = (String) body.get("modelName");
        String message = (String) body.get("message");
        String thinkingLevel = (String) body.getOrDefault("thinkingLevel", "quick");

        return chatService.sendMessage(sessionId, modelName, message, thinkingLevel);
    }

    @PostMapping("/cancel")
    public Map<String, String> cancel(@RequestBody Map<String, Object> body) {
        Long sessionId = Long.valueOf(body.get("sessionId").toString());
        chatService.cancelGeneration(sessionId);
        return Map.of("status", "cancelled");
    }
}
```

- [ ] **Step 2: Create SessionController**

```java
package com.aiqa.controller;

import com.aiqa.model.Message;
import com.aiqa.model.Session;
import com.aiqa.service.SessionService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/sessions")
public class SessionController {

    private final SessionService sessionService;

    public SessionController(SessionService sessionService) {
        this.sessionService = sessionService;
    }

    @PostMapping
    public Session createSession(@RequestBody Map<String, String> body) {
        String title = body.getOrDefault("title", "新对话");
        String modelName = body.getOrDefault("modelName", "deepseek");
        return sessionService.createSession(title, modelName);
    }

    @GetMapping
    public List<Session> getActiveSessions() {
        return sessionService.getActiveSessions();
    }

    @GetMapping("/history")
    public List<Session> getHistorySessions() {
        return sessionService.getHistorySessions();
    }

    @GetMapping("/search")
    public List<Session> searchSessions(@RequestParam String q) {
        return sessionService.searchSessions(q);
    }

    @GetMapping("/{id}")
    public Session getSession(@PathVariable Long id) {
        return sessionService.getSession(id)
                .orElseThrow(() -> new IllegalArgumentException("Session not found"));
    }

    @GetMapping("/{id}/messages")
    public List<Message> getMessages(@PathVariable Long id) {
        return sessionService.getMessages(id);
    }

    @PutMapping("/{id}/title")
    public Session updateTitle(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return sessionService.updateTitle(id, body.get("title"));
    }

    @DeleteMapping("/{id}")
    public Map<String, String> deleteSession(@PathVariable Long id) {
        sessionService.deleteSession(id);
        return Map.of("status", "deleted");
    }

    @PostMapping("/{id}/close")
    public Map<String, String> closeSession(@PathVariable Long id) {
        sessionService.closeSession(id);
        return Map.of("status", "closed");
    }

    @PostMapping("/messages/{messageId}/rollback")
    public Map<String, String> rollbackMessage(@PathVariable Long messageId) {
        sessionService.rollbackMessage(messageId);
        return Map.of("status", "rolled_back");
    }
}
```

- [ ] **Step 3: Create ModelController**

```java
package com.aiqa.controller;

import com.aiqa.engine.ModelAdapter;
import com.aiqa.engine.ModelAdapterFactory;
import com.aiqa.engine.ThinkingLevel;
import com.aiqa.model.CustomModel;
import com.aiqa.model.ModelConfig;
import com.aiqa.model.enums.FileType;
import com.aiqa.repository.CustomModelRepository;
import com.aiqa.repository.ModelConfigRepository;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/models")
public class ModelController {

    private final ModelConfigRepository modelConfigRepo;
    private final CustomModelRepository customModelRepo;
    private final ModelAdapterFactory adapterFactory;

    public ModelController(ModelConfigRepository modelConfigRepo,
                           CustomModelRepository customModelRepo,
                           ModelAdapterFactory adapterFactory) {
        this.modelConfigRepo = modelConfigRepo;
        this.customModelRepo = customModelRepo;
        this.adapterFactory = adapterFactory;
    }

    @GetMapping
    public List<Map<String, Object>> listModels() {
        List<Map<String, Object>> models = new ArrayList<>();

        for (ModelConfig config : modelConfigRepo.findByIsEnabledTrue()) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("modelName", config.getModelName());
            m.put("displayName", config.getDisplayName());
            m.put("isPreset", config.getIsPreset());
            m.put("thinkingLevels", parseThinkingLevels(config.getModelName()));
            models.add(m);
        }

        for (CustomModel cm : customModelRepo.findByIsEnabledTrue()) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("modelName", "custom_" + cm.getId());
            m.put("displayName", cm.getDisplayName());
            m.put("isPreset", false);
            m.put("thinkingLevels", List.of(new ThinkingLevel("default", "默认")));
            models.add(m);
        }

        return models;
    }

    @GetMapping("/{modelName}/thinking-levels")
    public List<ThinkingLevel> getThinkingLevels(@PathVariable String modelName) {
        return parseThinkingLevels(modelName);
    }

    @PostMapping("/custom")
    public CustomModel addCustomModel(@RequestBody Map<String, String> body) {
        CustomModel cm = CustomModel.builder()
                .displayName(body.get("displayName"))
                .webUrl(body.get("webUrl"))
                .engineType(body.getOrDefault("engineType", "scraper"))
                .isEnabled(true)
                .build();
        return customModelRepo.save(cm);
    }

    @PutMapping("/{modelName}/toggle")
    public Map<String, String> toggleModel(@PathVariable String modelName) {
        modelConfigRepo.findByModelName(modelName).ifPresent(config -> {
            config.setIsEnabled(!config.getIsEnabled());
            modelConfigRepo.save(config);
        });
        return Map.of("status", "ok");
    }

    private List<ThinkingLevel> parseThinkingLevels(String modelName) {
        try {
            ModelAdapter adapter = adapterFactory.getAdapter(modelName);
            return adapter.getThinkingLevels();
        } catch (Exception e) {
            return List.of(new ThinkingLevel("default", "默认"));
        }
    }
}
```

- [ ] **Step 4: Build and verify**

```bash
cd /Users/huanggang/Documents/ai-qa-assistant/backend && mvn compile
```

Expected: BUILD SUCCESS.

- [ ] **Step 5: Commit**

```bash
cd /Users/huanggang/Documents/ai-qa-assistant && git add -A && git commit -m "feat: add REST controllers (Chat, Session, Model)"
```

---

## Phase 5: Frontend Core

### Task 5.1: Pinia store and TypeScript types

**Files:**
- Create: `frontend/src/types/index.ts`
- Create: `frontend/src/stores/chatStore.ts`

- [ ] **Step 1: Create TypeScript types**

```typescript
// frontend/src/types/index.ts

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

export type WindowPosition = 'center-top' | 'center' | 'mouse-follow' | 'last-position'
```

- [ ] **Step 2: Create Pinia store**

```typescript
// frontend/src/stores/chatStore.ts

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Session, Message, ChatTab, ModelInfo, ThinkingLevel, WindowPosition } from '@/types'

export const useChatStore = defineStore('chat', () => {
  // Sessions
  const sessions = ref<Session[]>([])
  const activeTabs = ref<ChatTab[]>([])
  const activeTabIndex = ref(0)

  // Models
  const models = ref<ModelInfo[]>([])
  const selectedModel = ref('deepseek')
  const selectedThinkingLevel = ref('quick')

  // History
  const showHistory = ref(false)
  const historySessions = ref<Session[]>([])
  const searchQuery = ref('')
  const searchResults = ref<Session[]>([])

  // Settings
  const windowPosition = ref<WindowPosition>('center-top')
  const hotkeyConfig = ref({ key: 'Option', doublePressInterval: 300 })

  // Streaming state
  const isStreaming = ref(false)
  const streamingSessionId = ref<number | null>(null)

  // Computed
  const activeTab = computed(() => activeTabs.value[activeTabIndex.value])
  const activeSession = computed(() =>
    sessions.value.find(s => s.id === activeTab.value?.sessionId)
  )

  // Actions
  async function fetchModels() {
    const res = await fetch('/api/models')
    models.value = await res.json()
  }

  async function createSession(title: string, modelName: string): Promise<Session> {
    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, modelName })
    })
    const session = await res.json()
    sessions.value.push(session)
    openTab(session.id, session.title, session.modelName)
    return session
  }

  function openTab(sessionId: number, title: string, modelName: string) {
    const existing = activeTabs.value.findIndex(t => t.sessionId === sessionId)
    if (existing >= 0) {
      activeTabIndex.value = existing
    } else {
      activeTabs.value.push({ sessionId, title, modelName, isStreaming: false })
      activeTabIndex.value = activeTabs.value.length - 1
    }
  }

  function closeTab(index: number) {
    activeTabs.value.splice(index, 1)
    if (activeTabIndex.value >= activeTabs.value.length) {
      activeTabIndex.value = Math.max(0, activeTabs.value.length - 1)
    }
  }

  async function fetchMessages(sessionId: number) {
    const res = await fetch(`/api/sessions/${sessionId}/messages`)
    const messages = await res.json()
    const session = sessions.value.find(s => s.id === sessionId)
    if (session) {
      session.messages = messages
    }
  }

  async function fetchHistory() {
    const res = await fetch('/api/sessions/history')
    historySessions.value = await res.json()
  }

  async function searchHistory(q: string) {
    const res = await fetch(`/api/sessions/search?q=${encodeURIComponent(q)}`)
    searchResults.value = await res.json()
  }

  async function deleteSession(sessionId: number) {
    await fetch(`/api/sessions/${sessionId}`, { method: 'DELETE' })
    sessions.value = sessions.value.filter(s => s.id !== sessionId)
    historySessions.value = historySessions.value.filter(s => s.id !== sessionId)
  }

  async function rollbackMessage(messageId: number) {
    await fetch(`/api/sessions/messages/${messageId}/rollback`, { method: 'POST' })
  }

  return {
    sessions, activeTabs, activeTabIndex, activeTab, activeSession,
    models, selectedModel, selectedThinkingLevel,
    showHistory, historySessions, searchQuery, searchResults,
    windowPosition, hotkeyConfig,
    isStreaming, streamingSessionId,
    fetchModels, createSession, openTab, closeTab,
    fetchMessages, fetchHistory, searchHistory,
    deleteSession, rollbackMessage
  }
})
```

- [ ] **Step 3: Build frontend**

```bash
cd /Users/huanggang/Documents/ai-qa-assistant/frontend && npx vue-tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
cd /Users/huanggang/Documents/ai-qa-assistant && git add -A && git commit -m "feat: add Pinia store and TypeScript types"
```

---

### Task 5.2: App layout shell

**Files:**
- Modify: `frontend/src/App.vue`
- Create: `frontend/src/assets/global.css`

- [ ] **Step 1: Create global CSS**

```css
/* frontend/src/assets/global.css */

:root {
  --bg-primary: rgba(30, 30, 46, 0.85);
  --bg-secondary: rgba(0, 0, 0, 0.2);
  --bg-hover: rgba(255, 255, 255, 0.06);
  --bg-active: rgba(255, 255, 255, 0.1);
  --text-primary: #e0e0e0;
  --text-secondary: #888;
  --border-color: rgba(255, 255, 255, 0.08);
  --accent: #4A9EFF;
  --accent-dim: rgba(74, 158, 255, 0.3);
  --danger: #FF6B6B;
  --radius: 8px;
  --transition: 0.2s ease;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #app {
  height: 100%;
  overflow: hidden;
  background: transparent;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC',
               'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
  color: var(--text-primary);
}

::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.25);
}
```

- [ ] **Step 2: Replace App.vue with layout shell**

```vue
<!-- frontend/src/App.vue -->
<template>
  <div class="app-shell" @mousedown="onShellMouseDown">
    <!-- Title Bar -->
    <div class="title-bar">
      <div class="title-bar-left">
        <span class="app-name">AI Assistant</span>
      </div>
      <div class="title-bar-center">
        <ModelSelector />
        <ThinkingToggle />
      </div>
      <div class="title-bar-right">
        <button class="icon-btn" @click="store.createSession('新对话', store.selectedModel)" title="新建会话">
          ＋
        </button>
      </div>
    </div>

    <!-- Main Content -->
    <div class="main-content">
      <Sidebar />
      <MainArea />
    </div>

    <!-- Settings Overlay -->
    <SettingsPanel v-if="showSettings" @close="showSettings = false" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, provide } from 'vue'
import { useChatStore } from '@/stores/chatStore'
import ModelSelector from '@/components/ModelSelector.vue'
import ThinkingToggle from '@/components/ThinkingToggle.vue'
import Sidebar from '@/components/Sidebar.vue'
import MainArea from '@/components/MainArea.vue'
import SettingsPanel from '@/components/SettingsPanel.vue'

const store = useChatStore()
const showSettings = ref(false)

provide('showSettings', showSettings)

onMounted(async () => {
  await store.fetchModels()
  if (store.models.length > 0) {
    store.selectedModel = store.models[0].modelName
  }
  await store.fetchHistory()
})

function onShellMouseDown(e: MouseEvent) {
  // Forward to Electron IPC for window dragging
  if (window.electronAPI) {
    window.electronAPI.startDrag()
  }
}
</script>

<style scoped>
@import '@/assets/global.css';

.app-shell {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-primary);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.title-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  border-bottom: 1px solid var(--border-color);
  background: rgba(0, 0, 0, 0.15);
  -webkit-app-region: drag;
  user-select: none;
}

.title-bar-left, .title-bar-center, .title-bar-right {
  display: flex;
  align-items: center;
  gap: 12px;
  -webkit-app-region: no-drag;
}

.app-name {
  font-weight: 600;
  font-size: 14px;
  letter-spacing: 0.5px;
}

.icon-btn {
  background: var(--bg-hover);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  padding: 4px 12px;
  border-radius: var(--radius);
  cursor: pointer;
  font-size: 16px;
  transition: background var(--transition);
}

.icon-btn:hover {
  background: var(--bg-active);
}

.main-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}
</style>
```

- [ ] **Step 3: Build and commit**

```bash
cd /Users/huanggang/Documents/ai-qa-assistant/frontend && npx vue-tsc --noEmit && cd ../.. && git add -A && git commit -m "feat: add App layout shell with glassmorphism"
```

---

### Task 5.3: Sidebar component

**Files:**
- Create: `frontend/src/components/Sidebar.vue`
- Create: `frontend/src/components/HistoryDropdown.vue`

- [ ] **Step 1: Create Sidebar.vue**

```vue
<template>
  <div class="sidebar">
    <!-- Search -->
    <div class="search-box">
      <input
        v-model="store.searchQuery"
        type="text"
        placeholder="搜索历史对话..."
        @input="onSearch"
        class="search-input"
      />
    </div>

    <!-- History Button -->
    <div class="history-toggle">
      <button class="history-btn" @click="toggleHistory">
        📋 历史对话 ({{ store.historySessions.length }})
      </button>
    </div>

    <!-- Active Sessions -->
    <div class="session-list">
      <div class="section-label">活跃会话</div>
      <div
        v-for="session in store.sessions"
        :key="session.id"
        class="session-item"
        :class="{ active: store.activeTab?.sessionId === session.id }"
        @click="store.openTab(session.id, session.title, session.modelName)"
      >
        <span class="session-icon">{{ session.icon }}</span>
        <span class="session-title">{{ session.title }}</span>
      </div>

      <div v-if="store.sessions.length === 0" class="empty-hint">
        点击 ＋ 开始新对话
      </div>
    </div>

    <!-- Settings -->
    <div class="sidebar-footer">
      <button class="settings-btn" @click="showSettings = true">
        ⚙️ 设置
      </button>
    </div>

    <!-- History Dropdown -->
    <HistoryDropdown
      v-if="store.showHistory"
      @close="store.showHistory = false"
    />
  </div>
</template>

<script setup lang="ts">
import { inject, type Ref } from 'vue'
import { useChatStore } from '@/stores/chatStore'
import HistoryDropdown from './HistoryDropdown.vue'

const store = useChatStore()
const showSettings = inject<Ref<boolean>>('showSettings')!

let searchTimer: ReturnType<typeof setTimeout> | null = null

function onSearch() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    if (store.searchQuery.trim()) {
      store.searchHistory(store.searchQuery.trim())
    }
  }, 300)
}

function toggleHistory() {
  store.showHistory = !store.showHistory
  if (store.showHistory) {
    store.fetchHistory()
  }
}
</script>

<style scoped>
.sidebar {
  width: 260px;
  min-width: 200px;
  border-right: 1px solid var(--border-color);
  background: var(--bg-secondary);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.search-box {
  padding: 12px;
}

.search-input {
  width: 100%;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid var(--border-color);
  border-radius: var(--radius);
  color: var(--text-primary);
  font-size: 13px;
  outline: none;
}

.search-input:focus {
  border-color: var(--accent);
}

.history-toggle {
  padding: 0 12px 8px;
}

.history-btn {
  width: 100%;
  padding: 8px;
  background: var(--bg-hover);
  border: 1px solid var(--border-color);
  border-radius: var(--radius);
  color: var(--text-primary);
  font-size: 12px;
  cursor: pointer;
  text-align: center;
}

.history-btn:hover {
  background: var(--bg-active);
}

.session-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 8px;
}

.section-label {
  font-size: 10px;
  text-transform: uppercase;
  color: var(--text-secondary);
  padding: 8px 8px 4px;
  letter-spacing: 1px;
}

.session-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  transition: background var(--transition);
}

.session-item:hover {
  background: var(--bg-hover);
}

.session-item.active {
  background: var(--bg-active);
  border-left: 2px solid var(--accent);
}

.session-icon {
  font-size: 14px;
}

.session-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.empty-hint {
  color: var(--text-secondary);
  font-size: 12px;
  text-align: center;
  padding: 20px;
}

.sidebar-footer {
  padding: 12px;
  border-top: 1px solid var(--border-color);
}

.settings-btn {
  width: 100%;
  padding: 8px;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
  text-align: center;
}

.settings-btn:hover {
  color: var(--text-primary);
}
</style>
```

- [ ] **Step 2: Create HistoryDropdown.vue**

```vue
<template>
  <div class="history-overlay" @click.self="$emit('close')">
    <div class="history-dropdown">
      <div class="history-header">
        <h3>历史对话</h3>
        <button class="close-btn" @click="$emit('close')">✕</button>
      </div>

      <div class="history-list" v-if="store.historySessions.length > 0">
        <template v-for="group in groupedHistory" :key="group.label">
          <div class="date-group-label">{{ group.label }}</div>
          <div
            v-for="session in group.sessions"
            :key="session.id"
            class="history-item"
            @click="openHistorySession(session)"
          >
            <div class="history-item-info">
              <span class="history-item-title">{{ session.title }}</span>
              <span class="history-item-model">{{ session.modelName }}</span>
              <span class="history-item-time">{{ formatTime(session.updatedAt) }}</span>
            </div>
            <button class="delete-btn" @click.stop="deleteSession(session.id)">🗑</button>
          </div>
        </template>
      </div>

      <div v-else class="empty-hint">暂无历史对话</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useChatStore } from '@/stores/chatStore'
import type { Session } from '@/types'

defineEmits(['close'])
const store = useChatStore()

interface DateGroup {
  label: string
  sessions: Session[]
}

const groupedHistory = computed<DateGroup[]>(() => {
  const groups: Record<string, Session[]> = {}
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)

  for (const s of store.historySessions) {
    const d = new Date(s.updatedAt)
    const dateKey = new Date(d.getFullYear(), d.getMonth(), d.getDate())
    let label: string

    if (dateKey.getTime() === today.getTime()) {
      label = '今天'
    } else if (dateKey.getTime() === yesterday.getTime()) {
      label = '昨天'
    } else {
      label = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
    }

    if (!groups[label]) groups[label] = []
    groups[label].push(s)
  }

  return Object.entries(groups).map(([label, sessions]) => ({ label, sessions }))
})

function formatTime(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

async function openHistorySession(session: Session) {
  await store.fetchMessages(session.id)
  store.openTab(session.id, session.title, session.modelName)
  store.showHistory = false
}

async function deleteSession(sessionId: number) {
  await store.deleteSession(sessionId)
}
</script>

<style scoped>
.history-overlay {
  position: fixed;
  top: 0;
  left: 260px;
  right: 0;
  bottom: 0;
  z-index: 100;
}

.history-dropdown {
  position: absolute;
  top: 0;
  left: 0;
  width: 340px;
  max-height: 100%;
  background: rgba(30, 30, 46, 0.95);
  backdrop-filter: blur(20px);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid var(--border-color);
}

.history-header h3 {
  font-size: 15px;
  font-weight: 600;
}

.close-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 16px;
  cursor: pointer;
}

.history-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.date-group-label {
  font-size: 11px;
  color: var(--text-secondary);
  padding: 12px 8px 4px;
  font-weight: 500;
}

.history-item {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background var(--transition);
}

.history-item:hover {
  background: var(--bg-hover);
}

.history-item-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow: hidden;
}

.history-item-title {
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-item-model {
  font-size: 11px;
  color: var(--accent);
}

.history-item-time {
  font-size: 10px;
  color: var(--text-secondary);
}

.delete-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  opacity: 0.5;
  font-size: 12px;
}

.delete-btn:hover {
  opacity: 1;
}

.empty-hint {
  color: var(--text-secondary);
  font-size: 13px;
  text-align: center;
  padding: 40px;
}
</style>
```

- [ ] **Step 3: Build and commit**

```bash
cd /Users/huanggang/Documents/ai-qa-assistant/frontend && npx vue-tsc --noEmit && cd ../.. && git add -A && git commit -m "feat: add Sidebar and HistoryDropdown components"
```

---

### Task 5.4: Main chat area (TabBar + ChatTab)

**Files:**
- Create: `frontend/src/components/MainArea.vue`
- Create: `frontend/src/components/ChatTab.vue`
- Create: `frontend/src/components/MessageBubble.vue`
- Create: `frontend/src/components/FileUploader.vue`

- [ ] **Step 1: Create MainArea.vue**

```vue
<template>
  <div class="main-area">
    <!-- Tab Bar -->
    <div class="tab-bar" v-if="store.activeTabs.length > 0">
      <div
        v-for="(tab, index) in store.activeTabs"
        :key="tab.sessionId"
        class="tab-item"
        :class="{ active: store.activeTabIndex === index }"
        @click="store.activeTabIndex = index"
      >
        <span class="tab-title">{{ tab.title }}</span>
        <button class="tab-close" @click.stop="store.closeTab(index)">×</button>
      </div>
    </div>

    <!-- Tab Content -->
    <div class="tab-content" v-if="store.activeTab">
      <KeepAlive>
        <ChatTab
          :key="store.activeTab.sessionId"
          :session-id="store.activeTab.sessionId"
        />
      </KeepAlive>
    </div>

    <!-- Empty state -->
    <div class="empty-state" v-else>
      <div class="empty-icon">💬</div>
      <h2>AI Q&A Assistant</h2>
      <p>点击 ＋ 新建会话，或从侧边栏打开历史对话</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useChatStore } from '@/stores/chatStore'
import ChatTab from './ChatTab.vue'

const store = useChatStore()
</script>

<style scoped>
.main-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.tab-bar {
  display: flex;
  border-bottom: 1px solid var(--border-color);
  background: rgba(0, 0, 0, 0.1);
  overflow-x: auto;
}

.tab-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  font-size: 12px;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  white-space: nowrap;
  transition: all var(--transition);
}

.tab-item:hover {
  background: var(--bg-hover);
}

.tab-item.active {
  border-bottom-color: var(--accent);
  background: rgba(255, 255, 255, 0.05);
}

.tab-title {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tab-close {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 14px;
}

.tab-content {
  flex: 1;
  overflow: hidden;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: var(--text-secondary);
}

.empty-icon {
  font-size: 48px;
}

.empty-state h2 {
  font-size: 20px;
  color: var(--text-primary);
}

.empty-state p {
  font-size: 14px;
}
</style>
```

- [ ] **Step 2: Create ChatTab.vue**

```vue
<template>
  <div class="chat-tab">
    <!-- Messages -->
    <div class="messages-container" ref="messagesContainer">
      <MessageBubble
        v-for="msg in messages"
        :key="msg.id"
        :message="msg"
        @rollback="onRollback(msg.id)"
      />

      <!-- Streaming indicator -->
      <div v-if="isStreaming" class="streaming-indicator">
        <div class="typing-dots">
          <span></span><span></span><span></span>
        </div>
        <button class="stop-btn" @click="stopGeneration">⏹ 停止</button>
      </div>
    </div>

    <!-- Input Area -->
    <div class="input-area">
      <FileUploader @files-selected="onFilesSelected" />
      <div class="input-row">
        <textarea
          ref="inputEl"
          v-model="inputText"
          class="message-input"
          :placeholder="isStreaming ? 'AI 正在思考...' : '输入问题 (Enter 发送, Ctrl+Enter 换行)'"
          :disabled="isStreaming"
          rows="1"
          @keydown="onKeydown"
        ></textarea>
        <button
          class="send-btn"
          :disabled="!inputText.trim() || isStreaming"
          @click="sendMessage"
        >
          发送
        </button>
      </div>
      <div class="input-hint">Enter 发送 · Ctrl+Enter 换行 · 点击窗口外区域隐藏</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, watch } from 'vue'
import { useChatStore } from '@/stores/chatStore'
import MessageBubble from './MessageBubble.vue'
import FileUploader from './FileUploader.vue'
import type { Message } from '@/types'

const props = defineProps<{ sessionId: number }>()
const store = useChatStore()

const inputText = ref('')
const inputEl = ref<HTMLTextAreaElement>()
const messagesContainer = ref<HTMLDivElement>()
const isStreaming = ref(false)
const messages = ref<Message[]>([])

onMounted(async () => {
  await store.fetchMessages(props.sessionId)
  const session = store.sessions.find(s => s.id === props.sessionId)
  if (session) {
    messages.value = session.messages.filter(m => !m.isRolledBack)
  }
})

async function sendMessage() {
  const text = inputText.value.trim()
  if (!text || isStreaming.value) return

  inputText.value = ''
  isStreaming.value = true

  // Add user message locally
  messages.value.push({
    id: Date.now(),
    role: 'USER',
    content: text,
    thinkingMode: store.selectedThinkingLevel,
    isRolledBack: false,
    createdAt: new Date().toISOString(),
    attachments: []
  })

  scrollToBottom()

  try {
    const response = await fetch('/api/chat/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: props.sessionId,
        modelName: store.selectedModel,
        message: text,
        thinkingLevel: store.selectedThinkingLevel
      })
    })

    const reader = response.body!.getReader()
    const decoder = new TextDecoder()
    let assistantContent = ''
    let assistantMsg: Message = {
      id: Date.now() + 1,
      role: 'ASSISTANT',
      content: '',
      thinkingMode: store.selectedThinkingLevel,
      isRolledBack: false,
      createdAt: new Date().toISOString(),
      attachments: []
    }
    messages.value.push(assistantMsg)

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const text = decoder.decode(value, { stream: true })
      // Parse SSE chunks
      for (const line of text.split('\n')) {
        if (line.startsWith('data:')) {
          try {
            const chunk = JSON.parse(line.slice(5))
            if (chunk.content) {
              assistantContent += chunk.content
              assistantMsg.content = assistantContent
            }
            if (chunk.isError) {
              assistantMsg.content += `\n\n[错误: ${chunk.errorMessage}]`
            }
          } catch (e) {
            // Raw text chunk
            assistantContent += line.slice(5)
            assistantMsg.content = assistantContent
          }
        }
      }
      scrollToBottom()
    }
  } catch (e: any) {
    messages.value.push({
      id: Date.now(),
      role: 'SYSTEM',
      content: `发送失败: ${e.message}`,
      thinkingMode: '',
      isRolledBack: false,
      createdAt: new Date().toISOString(),
      attachments: []
    })
  } finally {
    isStreaming.value = false
    // Reload messages from server
    await store.fetchMessages(props.sessionId)
    const session = store.sessions.find(s => s.id === props.sessionId)
    if (session) {
      messages.value = session.messages.filter(m => !m.isRolledBack)
    }
  }
}

async function stopGeneration() {
  await fetch('/api/chat/cancel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId: props.sessionId })
  })
  isStreaming.value = false
}

async function onRollback(messageId: number) {
  await store.rollbackMessage(messageId)
  messages.value = messages.value.filter(m => m.id !== messageId)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
    e.preventDefault()
    sendMessage()
  } else if (e.key === 'Enter' && e.ctrlKey) {
    // Allow newline
  }
}

function onFilesSelected(files: File[]) {
  // TODO: upload files to backend and attach to next message
  console.log('Files selected:', files.length)
}

function scrollToBottom() {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}
</script>

<style scoped>
.chat-tab {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.streaming-indicator {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
}

.typing-dots {
  display: flex;
  gap: 4px;
}

.typing-dots span {
  width: 6px;
  height: 6px;
  background: var(--text-secondary);
  border-radius: 50%;
  animation: blink 1s infinite;
}

.typing-dots span:nth-child(2) { animation-delay: 0.2s; }
.typing-dots span:nth-child(3) { animation-delay: 0.4s; }

@keyframes blink {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 1; }
}

.stop-btn {
  background: rgba(255, 100, 100, 0.2);
  border: 1px solid rgba(255, 100, 100, 0.4);
  color: var(--danger);
  padding: 4px 12px;
  border-radius: var(--radius);
  cursor: pointer;
  font-size: 12px;
}

.input-area {
  border-top: 1px solid var(--border-color);
  padding: 12px 16px;
}

.input-row {
  display: flex;
  gap: 10px;
  align-items: flex-end;
}

.message-input {
  flex: 1;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-color);
  border-radius: var(--radius);
  color: var(--text-primary);
  font-size: 13px;
  resize: none;
  outline: none;
  font-family: inherit;
  max-height: 120px;
}

.message-input:focus {
  border-color: var(--accent);
}

.send-btn {
  padding: 10px 20px;
  background: var(--accent-dim);
  border: none;
  border-radius: var(--radius);
  color: white;
  font-size: 13px;
  cursor: pointer;
  transition: background var(--transition);
}

.send-btn:hover:not(:disabled) {
  background: var(--accent);
}

.send-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.input-hint {
  font-size: 10px;
  color: var(--text-secondary);
  text-align: center;
  margin-top: 6px;
}
</style>
```

- [ ] **Step 3: Create MessageBubble.vue**

```vue
<template>
  <div class="message" :class="message.role.toLowerCase()">
    <div v-if="message.role === 'ASSISTANT'" class="avatar">🤖</div>
    <div class="bubble">
      <div class="bubble-header" v-if="message.thinkingMode">
        <span class="thinking-badge">{{ message.thinkingMode }}</span>
      </div>
      <div class="bubble-content" v-html="renderedContent"></div>
      <div class="bubble-footer" v-if="message.role === 'ASSISTANT' && !message.isRolledBack">
        <button class="action-btn" @click="$emit('rollback')" title="回滚此回复">↩ 回滚</button>
      </div>
    </div>
    <div v-if="message.role === 'USER'" class="avatar">👤</div>
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
      try {
        return hljs.highlight(str, { language: lang }).value
      } catch {}
    }
    return ''
  }
})

const renderedContent = computed(() => {
  return md.render(props.message.content || '')
})
</script>

<style scoped>
.message {
  display: flex;
  gap: 10px;
  max-width: 85%;
}

.message.user {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.message.assistant {
  align-self: flex-start;
}

.message.system {
  align-self: center;
  font-size: 12px;
  color: var(--text-secondary);
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
  background: var(--bg-hover);
}

.bubble {
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 13px;
  line-height: 1.6;
}

.user .bubble {
  background: var(--accent-dim);
  border-bottom-right-radius: 4px;
}

.assistant .bubble {
  background: rgba(255, 255, 255, 0.06);
  border-bottom-left-radius: 4px;
}

.bubble-header {
  margin-bottom: 4px;
}

.thinking-badge {
  font-size: 10px;
  background: rgba(255, 255, 255, 0.1);
  padding: 2px 8px;
  border-radius: 10px;
}

.bubble-content :deep(pre) {
  background: rgba(0, 0, 0, 0.3);
  padding: 12px;
  border-radius: 6px;
  overflow-x: auto;
  margin: 8px 0;
}

.bubble-content :deep(code) {
  font-family: 'SF Mono', 'Menlo', monospace;
  font-size: 12px;
}

.bubble-footer {
  margin-top: 8px;
  display: flex;
  gap: 8px;
}

.action-btn {
  font-size: 10px;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
}

.action-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.message.assistant .bubble-content :deep(p) {
  margin-bottom: 8px;
}

.message.assistant .bubble-content :deep(p:last-child) {
  margin-bottom: 0;
}
</style>
```

- [ ] **Step 4: Create FileUploader.vue**

```vue
<template>
  <div class="file-uploader">
    <button class="upload-btn" @click="triggerUpload('image/*')" title="上传图片">
      🖼
    </button>
    <button class="upload-btn" @click="triggerUpload('video/*')" title="上传视频">
      🎬
    </button>
    <button class="upload-btn" @click="triggerUpload('audio/*')" title="上传音频">
      🎤
    </button>
    <input
      ref="fileInput"
      type="file"
      :accept="acceptType"
      multiple
      hidden
      @change="onFileChange"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{ 'files-selected': [files: File[]] }>()

const fileInput = ref<HTMLInputElement>()
const acceptType = ref('')

function triggerUpload(accept: string) {
  acceptType.value = accept
  fileInput.value?.click()
}

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files && input.files.length > 0) {
    const files: File[] = []

    for (const file of Array.from(input.files)) {
      if (file.size > 50 * 1024 * 1024) {
        alert(`文件 ${file.name} 超过 50MB 限制`)
        continue
      }
      files.push(file)
    }

    if (files.length > 0) {
      emit('files-selected', files)
    }
  }
  input.value = ''
}
</script>

<style scoped>
.file-uploader {
  display: flex;
  gap: 6px;
  margin-bottom: 8px;
}

.upload-btn {
  background: var(--bg-hover);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  padding: 6px;
  border-radius: var(--radius);
  cursor: pointer;
  font-size: 14px;
  transition: background var(--transition);
}

.upload-btn:hover {
  background: var(--bg-active);
}
</style>
```

- [ ] **Step 5: Build and commit**

```bash
cd /Users/huanggang/Documents/ai-qa-assistant/frontend && npx vue-tsc --noEmit && cd ../.. && git add -A && git commit -m "feat: add ChatTab, MessageBubble, FileUploader components"
```

---

### Task 5.5: ModelSelector, ThinkingToggle, SettingsPanel

**Files:**
- Create: `frontend/src/components/ModelSelector.vue`
- Create: `frontend/src/components/ThinkingToggle.vue`
- Create: `frontend/src/components/SettingsPanel.vue`

- [ ] **Step 1: Create ModelSelector.vue**

```vue
<template>
  <div class="model-selector">
    <label class="selector-label">模型:</label>
    <select v-model="store.selectedModel" class="selector-dropdown">
      <option v-for="m in store.models" :key="m.modelName" :value="m.modelName">
        {{ m.displayName }}
      </option>
    </select>
  </div>
</template>

<script setup lang="ts">
import { useChatStore } from '@/stores/chatStore'
const store = useChatStore()
</script>

<style scoped>
.model-selector {
  display: flex;
  align-items: center;
  gap: 6px;
}

.selector-label {
  font-size: 11px;
  color: var(--text-secondary);
}

.selector-dropdown {
  background: var(--bg-hover);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  color: var(--text-primary);
  padding: 3px 8px;
  font-size: 12px;
  outline: none;
  cursor: pointer;
}

.selector-dropdown:focus {
  border-color: var(--accent);
}
</style>
```

- [ ] **Step 2: Create ThinkingToggle.vue**

```vue
<template>
  <div class="thinking-toggle">
    <label class="toggle-label">思考:</label>
    <div class="toggle-group">
      <button
        v-for="level in thinkingLevels"
        :key="level.id"
        class="toggle-btn"
        :class="{ active: store.selectedThinkingLevel === level.id }"
        @click="store.selectedThinkingLevel = level.id"
      >
        {{ level.label }}
      </button>
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
.thinking-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
}

.toggle-label {
  font-size: 11px;
  color: var(--text-secondary);
}

.toggle-group {
  display: flex;
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid var(--border-color);
}

.toggle-btn {
  padding: 3px 10px;
  font-size: 11px;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition);
  border-right: 1px solid var(--border-color);
}

.toggle-btn:last-child {
  border-right: none;
}

.toggle-btn.active {
  background: var(--accent-dim);
  color: white;
}
</style>
```

- [ ] **Step 3: Create SettingsPanel.vue**

```vue
<template>
  <div class="settings-overlay" @click.self="$emit('close')">
    <div class="settings-panel">
      <div class="settings-header">
        <h2>⚙️ 设置</h2>
        <button class="close-btn" @click="$emit('close')">✕</button>
      </div>

      <div class="settings-body">
        <!-- Window Position -->
        <div class="setting-group">
          <h3>窗口呼出位置</h3>
          <select v-model="store.windowPosition" class="setting-select">
            <option value="center-top">屏幕中央偏上 (默认)</option>
            <option value="center">屏幕正中央</option>
            <option value="mouse-follow">跟随鼠标所在屏幕</option>
            <option value="last-position">上次关闭位置</option>
          </select>
        </div>

        <!-- Hotkey -->
        <div class="setting-group">
          <h3>快捷键设置</h3>
          <div class="setting-row">
            <label>触发按键</label>
            <input v-model="store.hotkeyConfig.key" class="setting-input" />
          </div>
          <div class="setting-row">
            <label>双击间隔 (ms)</label>
            <input
              v-model.number="store.hotkeyConfig.doublePressInterval"
              type="number"
              class="setting-input"
              min="100"
              max="1000"
            />
          </div>
        </div>

        <!-- Model Management -->
        <div class="setting-group">
          <h3>模型管理</h3>
          <div v-for="m in store.models" :key="m.modelName" class="model-item">
            <span>{{ m.displayName }}</span>
            <span class="model-tag" :class="{ preset: m.isPreset }">
              {{ m.isPreset ? '预设' : '自定义' }}
            </span>
          </div>
        </div>

        <!-- Add Custom Model -->
        <div class="setting-group">
          <h3>添加自定义模型</h3>
          <input v-model="customName" placeholder="模型名称" class="setting-input" />
          <input v-model="customUrl" placeholder="Web 版 URL" class="setting-input" />
          <button class="add-model-btn" @click="addCustomModel">添加</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useChatStore } from '@/stores/chatStore'

defineEmits(['close'])
const store = useChatStore()

const customName = ref('')
const customUrl = ref('')

async function addCustomModel() {
  if (!customName.value || !customUrl.value) return
  await fetch('/api/models/custom', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      displayName: customName.value,
      webUrl: customUrl.value
    })
  })
  customName.value = ''
  customUrl.value = ''
  await store.fetchModels()
}
</script>

<style scoped>
.settings-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
}

.settings-panel {
  width: 480px;
  max-height: 80vh;
  background: rgba(30, 30, 46, 0.98);
  backdrop-filter: blur(30px);
  border-radius: 12px;
  border: 1px solid var(--border-color);
  overflow: hidden;
}

.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
}

.settings-header h2 { font-size: 16px; }

.close-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 18px;
  cursor: pointer;
}

.settings-body {
  padding: 20px;
  overflow-y: auto;
  max-height: calc(80vh - 60px);
}

.setting-group {
  margin-bottom: 24px;
}

.setting-group h3 {
  font-size: 14px;
  margin-bottom: 12px;
  color: var(--text-primary);
}

.setting-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.setting-row label {
  font-size: 12px;
  color: var(--text-secondary);
}

.setting-select, .setting-input {
  width: 100%;
  padding: 8px 12px;
  background: var(--bg-hover);
  border: 1px solid var(--border-color);
  border-radius: var(--radius);
  color: var(--text-primary);
  font-size: 13px;
  outline: none;
  margin-bottom: 8px;
}

.model-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid var(--border-color);
  font-size: 13px;
}

.model-tag {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.1);
}

.model-tag.preset {
  background: var(--accent-dim);
}

.add-model-btn {
  width: 100%;
  padding: 8px;
  background: var(--accent-dim);
  border: none;
  border-radius: var(--radius);
  color: white;
  cursor: pointer;
  font-size: 13px;
}

.add-model-btn:hover {
  background: var(--accent);
}
</style>
```

- [ ] **Step 4: Build and commit**

```bash
cd /Users/huanggang/Documents/ai-qa-assistant/frontend && npx vue-tsc --noEmit && cd ../.. && git add -A && git commit -m "feat: add ModelSelector, ThinkingToggle, SettingsPanel"
```

---

## Phase 6: Electron Shell

### Task 6.1: Platform abstraction

**Files:**
- Create: `electron/platform/PlatformAdapter.ts`
- Create: `electron/platform/macos.ts`
- Create: `electron/platform/windows.ts`

- [ ] **Step 1: Create PlatformAdapter interface**

```typescript
// electron/platform/PlatformAdapter.ts
import { BrowserWindow } from 'electron';

export interface PlatformAdapter {
  /** Register global hotkey for double-press detection */
  registerGlobalHotkey(callback: () => void, key: string, interval: number): void;

  /** Unregister global hotkey */
  unregisterGlobalHotkey(): void;

  /** Apply native vibrancy/blur to window */
  applyVibrancy(window: BrowserWindow): void;

  /** Set up blur-to-hide behavior */
  setupBlurBehavior(window: BrowserWindow): void;

  /** Get tray icon size for current platform */
  getTrayIconSize(): { width: number; height: number };

  /** Get platform-specific accelerator for hotkey settings */
  getDefaultHotkey(): string;
}
```

- [ ] **Step 2: Create macOS adapter**

```typescript
// electron/platform/macos.ts
import { BrowserWindow, globalShortcut, screen } from 'electron';
import { PlatformAdapter } from './PlatformAdapter';

export class MacOSAdapter implements PlatformAdapter {
  private lastPressTime = 0;
  private hotkeyCallback: (() => void) | null = null;

  registerGlobalHotkey(callback: () => void, key: string, interval: number): void {
    this.hotkeyCallback = callback;

    // Use CGEvent through IOKit to monitor Option key presses
    // This requires a native addon. For now, use Electron's globalShortcut
    // with Option+Space as fallback, and implement CGEvent tap later.

    const accelerator = key === 'Option' ? 'Alt+Space' : `${key}+Space`;
    globalShortcut.register(accelerator, () => {
      const now = Date.now();
      if (now - this.lastPressTime < interval) {
        callback();
      }
      this.lastPressTime = now;
    });
  }

  unregisterGlobalHotkey(): void {
    globalShortcut.unregisterAll();
  }

  applyVibrancy(window: BrowserWindow): void {
    window.setVibrancy('fullscreen-ui');
    window.setBackgroundColor('rgba(0,0,0,0)');
  }

  setupBlurBehavior(window: BrowserWindow): void {
    window.on('blur', () => {
      window.hide();
    });
  }

  getTrayIconSize(): { width: number; height: number } {
    return { width: 22, height: 22 }; // macOS menu bar: ~24px, icon ~22px
  }

  getDefaultHotkey(): string {
    return 'Option';
  }
}
```

- [ ] **Step 3: Create Windows adapter (stub)**

```typescript
// electron/platform/windows.ts
import { BrowserWindow, globalShortcut } from 'electron';
import { PlatformAdapter } from './PlatformAdapter';

export class WindowsAdapter implements PlatformAdapter {
  private lastPressTime = 0;
  private hotkeyCallback: (() => void) | null = null;

  registerGlobalHotkey(callback: () => void, key: string, interval: number): void {
    this.hotkeyCallback = callback;
    const accelerator = key === 'Option' ? 'Alt+Space' : `${key}+Space`;
    globalShortcut.register(accelerator, () => {
      const now = Date.now();
      if (now - this.lastPressTime < interval) {
        callback();
      }
      this.lastPressTime = now;
    });
  }

  unregisterGlobalHotkey(): void {
    globalShortcut.unregisterAll();
  }

  applyVibrancy(window: BrowserWindow): void {
    // Windows: use SetWindowCompositionAttribute via native addon
    // For now: transparent background with CSS backdrop-filter
    window.setBackgroundColor('rgba(0,0,0,0)');
  }

  setupBlurBehavior(window: BrowserWindow): void {
    window.on('blur', () => {
      window.hide();
    });
  }

  getTrayIconSize(): { width: number; height: number } {
    return { width: 16, height: 16 }; // Windows system tray
  }

  getDefaultHotkey(): string {
    return 'Alt';
  }
}
```

- [ ] **Step 4: Commit**

```bash
cd /Users/huanggang/Documents/ai-qa-assistant && git add -A && git commit -m "feat: add platform abstraction layer (macOS + Windows stubs)"
```

---

### Task 6.2: Complete Electron main process (window, tray, hotkey, Spring Boot lifecycle)

**Files:**
- Modify: `electron/main.ts`
- Modify: `electron/preload.ts`

- [ ] **Step 1: Rewrite electron/main.ts with full functionality**

```typescript
import {
  app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, screen
} from 'electron';
import path from 'path';
import { MacOSAdapter } from './platform/macos';
import { WindowsAdapter } from './platform/windows';
import { PlatformAdapter } from './platform/PlatformAdapter';
import { spawn, ChildProcess } from 'child_process';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let platform: PlatformAdapter;
let springBootProcess: ChildProcess | null = null;

function getPlatformAdapter(): PlatformAdapter {
  if (process.platform === 'darwin') {
    return new MacOSAdapter();
  } else {
    return new WindowsAdapter();
  }
}

function createTrayIcon(): nativeImage {
  // Create a 48x48 black-and-white neural network + Q icon
  // In production, use a pre-rendered PNG. Here we create programmatically.
  const iconPath = path.join(__dirname, '../assets/tray-icon.png');
  return nativeImage.createFromPath(iconPath).resize(
    platform.getTrayIconSize()
  );
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    frame: false,
    transparent: true,
    resizable: true,
    show: false,
    minWidth: 600,
    minHeight: 400,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  platform.applyVibrancy(mainWindow);
  platform.setupBlurBehavior(mainWindow);

  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(
      path.join(__dirname, '../../frontend/dist/index.html')
    );
  }
}

function setupTray(): void {
  const icon = createTrayIcon();
  tray = new Tray(icon);

  const contextMenu = Menu.buildFromTemplate([
    { label: '新建会话', click: () => mainWindow?.webContents.send('new-session') },
    { type: 'separator' },
    { label: '设置', click: () => mainWindow?.webContents.send('open-settings') },
    { type: 'separator' },
    { label: '退出', click: () => app.quit() },
  ]);

  tray.setToolTip('AI Q&A Assistant');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    toggleWindow();
  });
}

function setupHotkey(): void {
  platform.registerGlobalHotkey(
    () => toggleWindow(),
    'Option',
    300
  );
}

function toggleWindow(): void {
  if (!mainWindow) return;

  if (mainWindow.isVisible()) {
    mainWindow.hide();
  } else {
    const cursorPoint = screen.getCursorScreenPoint();
    const currentDisplay = screen.getDisplayNearestPoint(cursorPoint);
    const { x, y, width, height } = currentDisplay.workArea;

    // Default position: center-top
    const windowBounds = mainWindow.getBounds();
    const newX = Math.round(x + (width - windowBounds.width) / 2);
    const newY = Math.round(y + (height - windowBounds.height) / 3);

    mainWindow.setPosition(newX, newY);
    mainWindow.show();
    mainWindow.focus();
  }
}

function setupIPC(): void {
  ipcMain.on('window:show', () => mainWindow?.show());
  ipcMain.on('window:hide', () => mainWindow?.hide());

  ipcMain.handle('window:getPosition', () => {
    return mainWindow?.getPosition() ?? [0, 0];
  });

  ipcMain.handle('window:setPosition', (_, x: number, y: number) => {
    mainWindow?.setPosition(x, y);
  });
}

function startSpringBoot(): void {
  const isDev = process.env.NODE_ENV === 'development';
  const jarPath = isDev
    ? path.join(__dirname, '../../backend/target/ai-qa-assistant-backend-1.0.0.jar')
    : path.join(process.resourcesPath, 'backend.jar');

  springBootProcess = spawn('java', [
    '-jar', jarPath,
    '--server.port=8080'
  ], {
    stdio: 'pipe',
  });

  springBootProcess.stdout?.on('data', (data) => {
    console.log(`[Spring Boot] ${data}`);
  });

  springBootProcess.stderr?.on('data', (data) => {
    console.error(`[Spring Boot Error] ${data}`);
  });

  springBootProcess.on('exit', (code) => {
    console.log(`Spring Boot exited with code ${code}`);
  });
}

function stopSpringBoot(): void {
  if (springBootProcess) {
    springBootProcess.kill('SIGTERM');
    springBootProcess = null;
  }
}

app.whenReady().then(() => {
  platform = getPlatformAdapter();

  startSpringBoot();
  createWindow();
  setupTray();
  setupHotkey();
  setupIPC();
});

app.on('before-quit', () => {
  stopSpringBoot();
  platform.unregisterGlobalHotkey();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (!mainWindow) {
    createWindow();
  }
});
```

- [ ] **Step 2: Rewrite electron/preload.ts**

```typescript
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // Window control
  showWindow: () => ipcRenderer.send('window:show'),
  hideWindow: () => ipcRenderer.send('window:hide'),
  getPosition: () => ipcRenderer.invoke('window:getPosition'),
  setPosition: (x: number, y: number) =>
    ipcRenderer.invoke('window:setPosition', x, y),

  // Event listeners
  onToggleVisibility: (callback: () => void) => {
    ipcRenderer.on('toggle-visibility', callback);
  },
  onNewSession: (callback: () => void) => {
    ipcRenderer.on('new-session', callback);
  },
  onOpenSettings: (callback: () => void) => {
    ipcRenderer.on('open-settings', callback);
  },

  // Auto-hide on blur is handled by main process
});
```

- [ ] **Step 3: Commit**

```bash
cd /Users/huanggang/Documents/ai-qa-assistant && git add -A && git commit -m "feat: complete Electron main process with window, tray, hotkey, and Spring Boot lifecycle"
```

---

## Phase 7: Integration & Polish

### Task 7.1: Frontend TypeScript declaration for Electron API

**Files:**
- Create: `frontend/src/types/electron.d.ts`

- [ ] **Step 1: Create type declaration**

```typescript
// frontend/src/types/electron.d.ts

export {};

declare global {
  interface Window {
    electronAPI?: {
      showWindow: () => void;
      hideWindow: () => void;
      getPosition: () => Promise<[number, number]>;
      setPosition: (x: number, y: number) => Promise<void>;
      onToggleVisibility: (callback: () => void) => void;
      onNewSession: (callback: () => void) => void;
      onOpenSettings: (callback: () => void) => void;
    };
  }
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/huanggang/Documents/ai-qa-assistant && git add -A && git commit -m "feat: add Electron API type declarations for frontend"
```

---

### Task 7.2: Tray icon asset

**Files:**
- Create: `electron/assets/tray-icon.png` (SVG-based black-and-white icon)
- Create: `electron/assets/tray-icon.svg`

- [ ] **Step 1: Create tray icon SVG**

```svg
<!-- electron/assets/tray-icon.svg -->
<svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
  <!-- Neural network nodes + question mark center -->
  <circle cx="24" cy="24" r="6" fill="none" stroke="black" stroke-width="2"/>
  <circle cx="14" cy="14" r="2.5" fill="black"/>
  <circle cx="34" cy="14" r="2.5" fill="black"/>
  <circle cx="14" cy="34" r="2.5" fill="black"/>
  <circle cx="34" cy="34" r="2.5" fill="black"/>
  <line x1="16.5" y1="14" x2="24" y2="18" stroke="black" stroke-width="1.2"/>
  <line x1="31.5" y1="14" x2="24" y2="18" stroke="black" stroke-width="1.2"/>
  <line x1="16.5" y1="34" x2="24" y2="30" stroke="black" stroke-width="1.2"/>
  <line x1="31.5" y1="34" x2="24" y2="30" stroke="black" stroke-width="1.2"/>
  <text x="24" y="28" text-anchor="middle" fill="black" font-size="8" font-weight="bold" font-family="sans-serif">?</text>
</svg>
```

- [ ] **Step 2: Commit**

```bash
cd /Users/huanggang/Documents/ai-qa-assistant && git add -A && git commit -m "feat: add tray icon assets"
```

---

### Task 7.3: Build and package scripts

**Files:**
- Create: `scripts/build.sh`
- Create: `scripts/package-mac.sh`

- [ ] **Step 1: Create build script**

```bash
#!/bin/bash
# scripts/build.sh
set -e

echo "=== Building Backend ==="
cd backend && mvn package -DskipTests && cd ..

echo "=== Building Frontend ==="
cd frontend && npm run build && cd ..

echo "=== Building Electron ==="
cd electron && npm run build && cd ..

echo "=== Build Complete ==="
```

- [ ] **Step 2: Create package script**

```bash
#!/bin/bash
# scripts/package-mac.sh
set -e

./scripts/build.sh

echo "=== Packaging for macOS ==="
cd electron
npx electron-builder --mac --config.build.mac.target=zip,dmg
cd ..

echo "=== Package Complete ==="
echo "Check electron/dist/ for the .dmg file"
```

- [ ] **Step 3: Set executable permissions and commit**

```bash
chmod +x /Users/huanggang/Documents/ai-qa-assistant/scripts/build.sh
chmod +x /Users/huanggang/Documents/ai-qa-assistant/scripts/package-mac.sh
```

```bash
cd /Users/huanggang/Documents/ai-qa-assistant && git add -A && git commit -m "feat: add build and package scripts"
```

---

### Task 7.4: Final integration test plan

- [ ] **Step 1: Start backend**

```bash
cd /Users/huanggang/Documents/ai-qa-assistant/backend && mvn spring-boot:run
```

Expected: Application starts on port 8080, H2 database created.

- [ ] **Step 2: Test REST API**

```bash
# Test model list
curl http://localhost:8080/api/models

# Test create session
curl -X POST http://localhost:8080/api/sessions \
  -H 'Content-Type: application/json' \
  -d '{"title":"测试对话","modelName":"deepseek"}'

# Test get sessions
curl http://localhost:8080/api/sessions

# Test search
curl 'http://localhost:8080/api/sessions/search?q=测试'

# Test delete
curl -X DELETE http://localhost:8080/api/sessions/1
```

Expected: All endpoints return valid JSON.

- [ ] **Step 3: Start frontend**

```bash
cd /Users/huanggang/Documents/ai-qa-assistant/frontend && npm run dev
```

Expected: Vite dev server on port 5173, page loads with glassmorphism UI.

- [ ] **Step 4: Start Electron**

```bash
cd /Users/huanggang/Documents/ai-qa-assistant/electron && NODE_ENV=development npm run dev
```

Expected: Electron window opens, loads Vue app, tray icon appears, Option+Space toggles visibility, blur-to-hide works.

- [ ] **Step 5: Commit**

```bash
cd /Users/huanggang/Documents/ai-qa-assistant && git add -A && git commit -m "test: add integration test plan and verification steps"
```

---

## Summary

**Total tasks:** 19
**Phases:** 7
**Files to create:** 42
**Estimated implementation time:** 8-12 hours

**Phase breakdown:**
1. Project Scaffold (Tasks 1.1-1.2) — Project initialization
2. Backend Data Layer (Tasks 2.1-2.3) — Entities, repos, seed data
3. Backend Engine Layer (Tasks 3.1-3.6) — ModelAdapter, engines, factory
4. Backend Service & API (Tasks 4.1-4.5) — Services, WebSocket, controllers
5. Frontend Core (Tasks 5.1-5.5) — Store, layout, all components
6. Electron Shell (Tasks 6.1-6.2) — Platform abstraction, main process
7. Integration & Polish (Tasks 7.1-7.4) — Types, assets, build, test
