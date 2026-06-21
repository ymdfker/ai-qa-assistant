"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WindowsAdapter = void 0;
class WindowsAdapter {
    registerGlobalHotkey(_cb, _key, _interval) { }
    unregisterGlobalHotkey() { }
    applyVibrancy(window) {
        window.setBackgroundColor('rgba(0,0,0,0)');
    }
    setupBlurBehavior(window) {
        window.on('blur', () => window.hide());
    }
    getTrayIconSize() {
        return { width: 16, height: 16 };
    }
    getDefaultHotkey() {
        return 'Alt';
    }
}
exports.WindowsAdapter = WindowsAdapter;
