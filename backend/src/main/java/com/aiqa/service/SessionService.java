package com.aiqa.service;

import com.aiqa.db.DatabaseManager;
import com.aiqa.model.Message;
import com.aiqa.model.Session;
import java.util.List;
import java.util.Optional;

public class SessionService {
    private final DatabaseManager db;

    public SessionService(DatabaseManager db) { this.db = db; }

    public Session createSession(String title, String modelName) { return db.createSession(title, modelName); }
    public Optional<Session> getSession(long id) { return db.getSession(id); }
    public List<Session> getActiveSessions() { return db.getActiveSessions(); }
    public List<Session> getHistorySessions() { return db.getHistorySessions(); }
    public List<Session> searchSessions(String keyword) { return db.searchSessions(keyword); }
    public void updateTitle(long sessionId, String title) { db.updateTitle(sessionId, title); }
    public void deleteSession(long sessionId) { db.deleteSession(sessionId); }
    public void closeSession(long sessionId) { db.closeSession(sessionId); }
    public Message addMessage(long sessionId, String role, String content, String thinkingMode) { return db.addMessage(sessionId, role, content, thinkingMode); }
    public List<Message> getMessages(long sessionId) { return db.getMessages(sessionId); }
    public void rollbackMessage(long messageId) { db.rollbackMessage(messageId); }
}
