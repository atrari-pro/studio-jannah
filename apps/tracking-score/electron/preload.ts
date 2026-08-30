const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  startScan: (url: string) => ipcRenderer.invoke('start-scan', url),
  getScanState: () => ipcRenderer.invoke('get-scan-state'),
  finishScan: () => ipcRenderer.invoke('finish-scan'),
  markConsentAccepted: () => ipcRenderer.invoke('mark-consent-accepted'),
  markConsentRefused: () => ipcRenderer.invoke('mark-consent-refused'),
});
