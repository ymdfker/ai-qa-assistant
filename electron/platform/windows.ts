import { BrowserWindow } from 'electron';
import { PlatformAdapter } from './PlatformAdapter';

export class WindowsAdapter implements PlatformAdapter {
  registerGlobalHotkey(_cb: () => void, _key: string, _interval: number): void {}
  unregisterGlobalHotkey(): void {}
  applyVibrancy(window: BrowserWindow): void {
    window.setBackgroundColor('rgba(0,0,0,0)');
  }
  setupBlurBehavior(window: BrowserWindow): void {
    window.on('blur', () => window.hide());
  }
  getTrayIconSize(): { width: number; height: number } {
    return { width: 16, height: 16 };
  }
  getDefaultHotkey(): string {
    return 'Alt';
  }
}
