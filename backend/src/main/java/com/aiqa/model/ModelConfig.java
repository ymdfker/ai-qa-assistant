package com.aiqa.model;

public class ModelConfig {
    private Long id;
    private String modelName;
    private String displayName;
    private String webUrl;
    private boolean isEnabled = true;
    private String thinkingLevels = "[]";
    private String fileSupport = "[]";
    private boolean isPreset = true;
    private String enginePreference = "scraper";

    public ModelConfig() {}

    public ModelConfig(String modelName, String displayName, String webUrl,
                       String thinkingLevels, String fileSupport) {
        this.modelName = modelName;
        this.displayName = displayName;
        this.webUrl = webUrl;
        this.thinkingLevels = thinkingLevels;
        this.fileSupport = fileSupport;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getModelName() { return modelName; }
    public void setModelName(String modelName) { this.modelName = modelName; }
    public String getDisplayName() { return displayName; }
    public void setDisplayName(String displayName) { this.displayName = displayName; }
    public String getWebUrl() { return webUrl; }
    public void setWebUrl(String webUrl) { this.webUrl = webUrl; }
    public boolean isEnabled() { return isEnabled; }
    public void setEnabled(boolean enabled) { isEnabled = enabled; }
    public String getThinkingLevels() { return thinkingLevels; }
    public void setThinkingLevels(String thinkingLevels) { this.thinkingLevels = thinkingLevels; }
    public String getFileSupport() { return fileSupport; }
    public void setFileSupport(String fileSupport) { this.fileSupport = fileSupport; }
    public boolean isPreset() { return isPreset; }
    public void setPreset(boolean preset) { isPreset = preset; }
    public String getEnginePreference() { return enginePreference; }
    public void setEnginePreference(String enginePreference) { this.enginePreference = enginePreference; }
}
