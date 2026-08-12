export {};

declare global {
  interface ElectronAPI {
    platform: string;
    version: string;
    isElectron: boolean;
    saveAsPdf: (options?: { filename?: string }) => Promise<{
      success: boolean;
      canceled?: boolean;
      path?: string;
      error?: string;
    }>;
    printPage: () => Promise<{ success: boolean; error?: string }>;
  }

  interface Window {
    electron?: ElectronAPI;
  }
}
