export {};
declare global {
  interface Window {
    electronAPI?: {
      showWindow: () => void;
      hideWindow: () => void;
      getPosition: () => Promise<[number, number]>;
      setPosition: (x: number, y: number) => Promise<void>;
      setPositionPreference: (pos: string) => void;
      // DB
      dbModels: () => Promise<any[]>;
      dbAddCustomModel: (name: string, endpoint: string) => Promise<any>;
      dbToggleModel: (name: string) => Promise<any>;
      dbUpdateApiKey: (name: string, key: string) => Promise<any>;
      dbCreateSession: (title: string, modelName: string) => Promise<any>;
      dbGetActiveSessions: () => Promise<any[]>;
      dbGetHistorySessions: () => Promise<any[]>;
      dbSearchSessions: (q: string) => Promise<any[]>;
      dbGetMessages: (sid: number) => Promise<any[]>;
      dbAddMessage: (sid: number, role: string, content: string, tm: string) => Promise<any>;
      dbUpdateTitle: (id: number, title: string) => Promise<any>;
      dbDeleteSession: (id: number) => Promise<any>;
      dbCloseSession: (id: number) => Promise<any>;
      dbRollbackMessage: (id: number) => Promise<any>;
      // API
      apiSend: (job: any) => void;
      apiCancel: () => void;
      onApiChunk: (cb: (data: any) => void) => void;
      onApiDone: (cb: (data: any) => void) => void;
      onApiError: (cb: (data: any) => void) => void;
      // Events
      onToggleVisibility: (callback: () => void) => void;
      onNewSession: (callback: () => void) => void;
      onOpenSettings: (callback: () => void) => void;
    };
  }
}
