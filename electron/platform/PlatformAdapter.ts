import { BrowserWindow } from 'electron';

export interface PlatformAdapter {
  registerGlobalHotkey(callback: () => void, key: string, interval: number): void;
  unregisterGlobalHotkey(): void;
  applyVibrancy(window: BrowserWindow): void;
  setupBlurBehavior(window: BrowserWindow): void;
  getTrayIconSize(): { width: number; height: number };
  getDefaultHotkey(): string;
}
