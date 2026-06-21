import { BrowserWindow } from 'electron';
import { PlatformAdapter } from './PlatformAdapter';

export class MacOSAdapter implements PlatformAdapter {
  registerGlobalHotkey(_cb: () => void, _key: string, _interval: number): void {
    // Hotkey handled directly in main.ts via globalShortcut
  }
  unregisterGlobalHotkey(): void {}
  applyVibrancy(window: BrowserWindow): void {
    window.setVibrancy('fullscreen-ui');
    window.setBackgroundColor('rgba(0,0,0,0)');
  }
  setupBlurBehavior(window: BrowserWindow): void {
  }
  getTrayIconSize(): { width: number; height: number } {
    return { width: 22, height: 22 };
  }
  getDefaultHotkey(): string {
    return 'Option';
  }
}
