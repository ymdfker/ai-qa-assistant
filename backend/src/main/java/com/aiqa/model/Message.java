package com.aiqa.model;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class Message {
    private Long id;
    private Long sessionId;
    private String role; // USER, ASSISTANT, SYSTEM
    private String content;
    private String thinkingMode;
    private Integer tokensUsed;
    private boolean isRolledBack;
    private LocalDateTime createdAt;
    private List<Attachment> attachments = new ArrayList<>();

    public Message() {}

    public Message(Long sessionId, String role, String content, String thinkingMode) {
        this.sessionId = sessionId;
        this.role = role;
        this.content = content;
        this.thinkingMode = thinkingMode;
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getSessionId() { return sessionId; }
    public void setSessionId(Long sessionId) { this.sessionId = sessionId; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public String getThinkingMode() { return thinkingMode; }
    public void setThinkingMode(String thinkingMode) { this.thinkingMode = thinkingMode; }
    public Integer getTokensUsed() { return tokensUsed; }
    public void setTokensUsed(Integer tokensUsed) { this.tokensUsed = tokensUsed; }
    public boolean isRolledBack() { return isRolledBack; }
    public void setRolledBack(boolean rolledBack) { isRolledBack = rolledBack; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public List<Attachment> getAttachments() { return attachments; }
    public void setAttachments(List<Attachment> attachments) { this.attachments = attachments; }
}
