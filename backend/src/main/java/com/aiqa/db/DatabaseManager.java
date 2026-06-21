package com.aiqa.db;

import com.aiqa.model.*;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import org.jdbi.v3.core.Jdbi;
import org.jdbi.v3.core.mapper.reflect.BeanMapper;

import javax.sql.DataSource;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

public class DatabaseManager {

    private final Jdbi jdbi;
    private final ObjectMapper json = new ObjectMapper();

    public DatabaseManager() {
        // DB path: prefer env var, fallback to ./data
        String dbDir = System.getenv("AIQA_DATA_DIR");
        if (dbDir == null || dbDir.isEmpty()) dbDir = "./data";
        java.io.File dir = new java.io.File(dbDir);
        if (!dir.exists()) dir.mkdirs();
        String dbPath = dbDir + "/aiqa-db";

        HikariConfig config = new HikariConfig();
        config.setJdbcUrl("jdbc:h2:file:" + dbPath + ";MODE=MySQL;DB_CLOSE_DELAY=-1;FILE_LOCK=SOCKET");
        config.setUsername("sa");
        config.setPassword("");
        config.setMaximumPoolSize(5);

        DataSource ds = new HikariDataSource(config);
        this.jdbi = Jdbi.create(ds);
        jdbi.registerRowMapper(BeanMapper.factory(Session.class));
        jdbi.registerRowMapper(BeanMapper.factory(Message.class));
        jdbi.registerRowMapper(BeanMapper.factory(Attachment.class));
        jdbi.registerRowMapper(BeanMapper.factory(ModelConfig.class));
        initTables();
        seedPresetModels();
    }

    private void initTables() {
        jdbi.useHandle(h -> {
            h.execute("""
                CREATE TABLE IF NOT EXISTS model_configs (
                    id BIGINT AUTO_INCREMENT PRIMARY KEY,
                    model_name VARCHAR(100) NOT NULL UNIQUE,
                    display_name VARCHAR(100) NOT NULL,
                    web_url VARCHAR(500) NOT NULL,
                    is_enabled BOOLEAN DEFAULT TRUE,
                    thinking_levels CLOB DEFAULT '[]',
                    file_support CLOB DEFAULT '[]',
                    is_preset BOOLEAN DEFAULT TRUE,
                    engine_preference VARCHAR(20) DEFAULT 'scraper'
                )
            """);
            h.execute("""
                CREATE TABLE IF NOT EXISTS sessions (
                    id BIGINT AUTO_INCREMENT PRIMARY KEY,
                    title VARCHAR(500) NOT NULL,
                    model_name VARCHAR(100) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    is_active BOOLEAN DEFAULT TRUE,
                    icon VARCHAR(10) DEFAULT '💬'
                )
            """);
            h.execute("""
                CREATE TABLE IF NOT EXISTS messages (
                    id BIGINT AUTO_INCREMENT PRIMARY KEY,
                    session_id BIGINT NOT NULL,
                    role VARCHAR(10) NOT NULL,
                    content CLOB,
                    thinking_mode VARCHAR(20),
                    tokens_used INT,
                    is_rolled_back BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
                )
            """);
            h.execute("""
                CREATE TABLE IF NOT EXISTS attachments (
                    id BIGINT AUTO_INCREMENT PRIMARY KEY,
                    message_id BIGINT NOT NULL,
                    file_name VARCHAR(500) NOT NULL,
                    file_type VARCHAR(20) NOT NULL,
                    file_path VARCHAR(1000),
                    file_size BIGINT,
                    extracted_text CLOB,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
                )
            """);
        });
    }

    private void seedPresetModels() {
        String[][] presets = {
            {"deepseek", "DeepSeek", "https://chat.deepseek.com",
             "[{\"id\":\"quick\",\"label\":\"快速思考\"},{\"id\":\"deep\",\"label\":\"深度思考\"}]",
             "[\"IMAGE\"]"},
            {"qwen", "通义千问", "https://tongyi.aliyun.com/qianwen",
             "[{\"id\":\"quick\",\"label\":\"快速思考\"},{\"id\":\"deep\",\"label\":\"深度思考\"}]",
             "[\"IMAGE\",\"DOCUMENT\"]"},
            {"ernie", "文心一言", "https://yiyan.baidu.com",
             "[{\"id\":\"default\",\"label\":\"默认\"}]",
             "[\"IMAGE\",\"DOCUMENT\"]"},
            {"kimi", "Kimi", "https://kimi.moonshot.cn",
             "[{\"id\":\"default\",\"label\":\"默认\"}]",
             "[\"IMAGE\",\"DOCUMENT\"]"},
            {"doubao", "豆包", "https://www.doubao.com/chat",
             "[{\"id\":\"default\",\"label\":\"默认\"}]",
             "[\"IMAGE\",\"DOCUMENT\"]"},
            {"chatgpt", "ChatGPT", "https://chatgpt.com",
             "[{\"id\":\"quick\",\"label\":\"快速思考\"},{\"id\":\"deep\",\"label\":\"深度思考\"}]",
             "[\"IMAGE\",\"DOCUMENT\"]"},
        };

        jdbi.useHandle(h -> {
            for (String[] p : presets) {
                int count = h.createQuery("SELECT COUNT(*) FROM model_configs WHERE model_name = :name")
                        .bind("name", p[0]).mapTo(Integer.class).one();
                if (count == 0) {
                    h.createUpdate("INSERT INTO model_configs (model_name,display_name,web_url,thinking_levels,file_support,is_preset,is_enabled,engine_preference) VALUES (?,?,?,?,?,TRUE,TRUE,'scraper')")
                            .bind(0, p[0]).bind(1, p[1]).bind(2, p[2]).bind(3, p[3]).bind(4, p[4]).execute();
                }
            }
        });
    }

    // === Session ===
    public Session createSession(String title, String modelName) {
        long id = jdbi.withHandle(h ->
            h.createUpdate("INSERT INTO sessions (title, model_name, created_at, updated_at, is_active, icon) VALUES (:title, :model, NOW(), NOW(), TRUE, '💬')")
                .bind("title", title).bind("model", modelName)
                .executeAndReturnGeneratedKeys("id").mapTo(Long.class).one()
        );
        return getSession(id).orElseThrow();
    }

    public Optional<Session> getSession(long id) {
        return jdbi.withHandle(h ->
            h.createQuery("SELECT * FROM sessions WHERE id = :id")
                .bind("id", id).mapTo(Session.class).findOne()
        );
    }

    public List<Session> getActiveSessions() {
        return jdbi.withHandle(h ->
            h.createQuery("SELECT * FROM sessions WHERE is_active = TRUE ORDER BY updated_at DESC")
                .mapTo(Session.class).list()
        );
    }

    public List<Session> getHistorySessions() {
        return jdbi.withHandle(h ->
            h.createQuery("SELECT * FROM sessions WHERE is_active = FALSE ORDER BY updated_at DESC")
                .mapTo(Session.class).list()
        );
    }

    public List<Session> searchSessions(String keyword) {
        return jdbi.withHandle(h ->
            h.createQuery("SELECT DISTINCT s.* FROM sessions s LEFT JOIN messages m ON m.session_id = s.id WHERE LOWER(s.title) LIKE :kw OR LOWER(m.content) LIKE :kw ORDER BY s.updated_at DESC")
                .bind("kw", "%" + keyword.toLowerCase() + "%").mapTo(Session.class).list()
        );
    }

    public void updateTitle(long sessionId, String title) {
        jdbi.useHandle(h ->
            h.createUpdate("UPDATE sessions SET title = :title, updated_at = NOW() WHERE id = :id")
                .bind("title", title).bind("id", sessionId).execute()
        );
    }

    public void deleteSession(long sessionId) {
        jdbi.useHandle(h ->
            h.createUpdate("DELETE FROM sessions WHERE id = :id").bind("id", sessionId).execute()
        );
    }

    public void closeSession(long sessionId) {
        jdbi.useHandle(h ->
            h.createUpdate("UPDATE sessions SET is_active = FALSE, updated_at = NOW() WHERE id = :id")
                .bind("id", sessionId).execute()
        );
    }

    // === Message ===
    public Message addMessage(long sessionId, String role, String content, String thinkingMode) {
        long id = jdbi.withHandle(h ->
            h.createUpdate("INSERT INTO messages (session_id, role, content, thinking_mode, created_at) VALUES (:sid, :role, :content, :tm, NOW())")
                .bind("sid", sessionId).bind("role", role).bind("content", content).bind("tm", thinkingMode)
                .executeAndReturnGeneratedKeys("id").mapTo(Long.class).one()
        );
        jdbi.useHandle(h ->
            h.createUpdate("UPDATE sessions SET updated_at = NOW() WHERE id = :sid")
                .bind("sid", sessionId).execute()
        );
        return jdbi.withHandle(h ->
            h.createQuery("SELECT * FROM messages WHERE id = :id").bind("id", id).mapTo(Message.class).one()
        );
    }

    public List<Message> getMessages(long sessionId) {
        return jdbi.withHandle(h ->
            h.createQuery("SELECT * FROM messages WHERE session_id = :sid ORDER BY created_at ASC")
                .bind("sid", sessionId).mapTo(Message.class).list()
        );
    }

    public void rollbackMessage(long messageId) {
        jdbi.useHandle(h ->
            h.createUpdate("UPDATE messages SET is_rolled_back = TRUE WHERE id = :id")
                .bind("id", messageId).execute()
        );
    }

    // === ModelConfig ===
    public List<ModelConfig> getEnabledModels() {
        return jdbi.withHandle(h ->
            h.createQuery("SELECT * FROM model_configs WHERE is_enabled = TRUE").mapTo(ModelConfig.class).list()
        );
    }

    public Optional<ModelConfig> getModelConfig(String modelName) {
        return jdbi.withHandle(h ->
            h.createQuery("SELECT * FROM model_configs WHERE model_name = :name")
                .bind("name", modelName).mapTo(ModelConfig.class).findOne()
        );
    }

    public ModelConfig addCustomModel(String displayName, String webUrl) {
        long id = jdbi.withHandle(h ->
            h.createUpdate("INSERT INTO model_configs (model_name,display_name,web_url,is_preset,engine_preference) VALUES (:name,:dname,:url,FALSE,'scraper')")
                .bind("name", "custom_" + System.currentTimeMillis())
                .bind("dname", displayName).bind("url", webUrl)
                .executeAndReturnGeneratedKeys("id").mapTo(Long.class).one()
        );
        return jdbi.withHandle(h ->
            h.createQuery("SELECT * FROM model_configs WHERE id = :id").bind("id", id).mapTo(ModelConfig.class).one()
        );
    }

    public void toggleModel(String modelName) {
        jdbi.useHandle(h ->
            h.createUpdate("UPDATE model_configs SET is_enabled = NOT is_enabled WHERE model_name = :name")
                .bind("name", modelName).execute()
        );
    }
}
