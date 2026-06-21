package com.aiqa;

import com.aiqa.db.DatabaseManager;
import com.aiqa.service.SessionService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import io.javalin.Javalin;

import java.util.*;

public class AiQaApplication {

    private static final ObjectMapper json = new ObjectMapper()
            .registerModule(new JavaTimeModule());

    public static void main(String[] args) {
        var db = new DatabaseManager();
        var sessionSvc = new SessionService(db);

        var app = Javalin.create(cfg -> {
            cfg.http.asyncTimeout = 300_000L;
            cfg.router.contextPath = "/api";
        });

        // CORS
        app.before(ctx -> {
            ctx.header("Access-Control-Allow-Origin", "*");
            ctx.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
            ctx.header("Access-Control-Allow-Headers", "*");
            if ("OPTIONS".equals(ctx.method())) { ctx.status(204); ctx.skipRemainingHandlers(); }
        });

        // === Models ===
        app.get("/models", ctx -> {
            var models = new ArrayList<Map<String, Object>>();
            for (var mc : db.getEnabledModels()) {
                var m = new LinkedHashMap<String, Object>();
                m.put("modelName", mc.getModelName());
                m.put("displayName", mc.getDisplayName());
                m.put("isPreset", mc.isPreset());
                m.put("webUrl", mc.getWebUrl());
                m.put("thinkingLevels", parseThinkingLevels(mc.getThinkingLevels()));
                models.add(m);
            }
            ctx.json(models);
        });

        app.post("/models/custom", ctx -> {
            var body = json.readTree(ctx.body());
            var cm = db.addCustomModel(body.get("displayName").asText(), body.get("webUrl").asText());
            ctx.json(cm);
        });

        app.put("/models/{modelName}/toggle", ctx -> {
            db.toggleModel(ctx.pathParam("modelName"));
            ctx.json(Map.of("status", "ok"));
        });

        // === Sessions ===
        app.post("/sessions", ctx -> {
            var body = json.readTree(ctx.body());
            var s = sessionSvc.createSession(
                body.has("title") ? body.get("title").asText() : "新对话",
                body.has("modelName") ? body.get("modelName").asText() : "deepseek"
            );
            ctx.json(s);
        });

        app.get("/sessions", ctx -> ctx.json(sessionSvc.getActiveSessions()));
        app.get("/sessions/history", ctx -> ctx.json(sessionSvc.getHistorySessions()));
        app.get("/sessions/search", ctx -> ctx.json(sessionSvc.searchSessions(ctx.queryParam("q"))));

        app.get("/sessions/{id}", ctx -> {
            var s = sessionSvc.getSession(Long.parseLong(ctx.pathParam("id")));
            if (s.isPresent()) ctx.json(s.get());
            else ctx.status(404).result("Not found");
        });

        app.get("/sessions/{id}/messages", ctx ->
            ctx.json(sessionSvc.getMessages(Long.parseLong(ctx.pathParam("id"))))
        );

        app.put("/sessions/{id}/title", ctx -> {
            var body = json.readTree(ctx.body());
            sessionSvc.updateTitle(Long.parseLong(ctx.pathParam("id")), body.get("title").asText());
            ctx.json(Map.of("status", "ok"));
        });

        app.delete("/sessions/{id}", ctx -> {
            sessionSvc.deleteSession(Long.parseLong(ctx.pathParam("id")));
            ctx.json(Map.of("status", "deleted"));
        });

        app.post("/sessions/{id}/close", ctx -> {
            sessionSvc.closeSession(Long.parseLong(ctx.pathParam("id")));
            ctx.json(Map.of("status", "closed"));
        });

        app.post("/sessions/messages/{messageId}/rollback", ctx -> {
            sessionSvc.rollbackMessage(Long.parseLong(ctx.pathParam("messageId")));
            ctx.json(Map.of("status", "rolled_back"));
        });

        // === Messages (save from Electron) ===
        app.post("/sessions/{id}/messages", ctx -> {
            var body = json.readTree(ctx.body());
            long sid = Long.parseLong(ctx.pathParam("id"));
            String role = body.get("role").asText();
            String content = body.has("content") ? body.get("content").asText() : "";
            String thinkingMode = body.has("thinkingMode") ? body.get("thinkingMode").asText() : "quick";
            var msg = sessionSvc.addMessage(sid, role, content, thinkingMode);
            ctx.json(msg);
        });

        Runtime.getRuntime().addShutdownHook(new Thread(() -> app.stop()));
        app.start("127.0.0.1", 0); // auto-assign port
        int port = app.port();
        // Write port so Electron can read it
        try {
            String portFile = System.getenv("AIQA_PORT_FILE");
            if (portFile != null) {
                java.nio.file.Files.writeString(java.nio.file.Path.of(portFile), String.valueOf(port));
            }
        } catch (Exception ignored) {}
        System.out.println("PORT:" + port);
        System.out.flush();
        System.out.println("AI Q&A Backend started on http://127.0.0.1:" + port);
    }

    private static List<Map<String, String>> parseThinkingLevels(String json) {
        try {
            @SuppressWarnings("unchecked")
            var list = (List<Map<String, String>>) new ObjectMapper().readValue(json, List.class);
            return list != null ? list : List.of(Map.of("id", "default", "label", "默认"));
        } catch (Exception e) {
            return List.of(Map.of("id", "default", "label", "默认"));
        }
    }
}
