const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
  platform: process.platform,
  version: process.versions.electron,
  isElectron: true,
  saveAsPdf: (options) => ipcRenderer.invoke("save-as-pdf", options),
  printPage: () => ipcRenderer.invoke("print-page"),
});
