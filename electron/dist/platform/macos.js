"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MacOSAdapter = void 0;
class MacOSAdapter {
    registerGlobalHotkey(_cb, _key, _interval) {
        // Hotkey handled directly in main.ts via globalShortcut
    }
    unregisterGlobalHotkey() { }
    applyVibrancy(window) {
        window.setVibrancy('fullscreen-ui');
        window.setBackgroundColor('rgba(0,0,0,0)');
    }
    setupBlurBehavior(window) {
    }
    getTrayIconSize() {
        return { width: 22, height: 22 };
    }
    getDefaultHotkey() {
        return 'Option';
    }
}
exports.MacOSAdapter = MacOSAdapter;
