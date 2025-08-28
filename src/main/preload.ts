import { contextBridge, ipcRenderer } from 'electron';
import { RecordingOptions, RecordingStatus, RecordingProgress } from '../types/recording';
import { ExportOptions } from '../types';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // App info
  getVersion: () => ipcRenderer.invoke('app:get-version'),
  getPlatform: () => ipcRenderer.invoke('app:get-platform'),
  getPlatformPaths: () => ipcRenderer.invoke('app:get-platform-paths'),
  getPlatformSettings: () => ipcRenderer.invoke('app:get-platform-settings'),

  // Updater API
  checkForUpdates: () => ipcRenderer.invoke('updater:check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('updater:download-update'),
  quitAndInstall: () => ipcRenderer.invoke('updater:quit-and-install'),

  // Updater event listeners
  onUpdaterChecking: (callback: () => void) => {
    ipcRenderer.on('updater-checking', () => callback());
  },
  onUpdaterUpdateAvailable: (callback: (info: any) => void) => {
    ipcRenderer.on('updater-update-available', (_, info) => callback(info));
  },
  onUpdaterUpdateNotAvailable: (callback: (info: any) => void) => {
    ipcRenderer.on('updater-update-not-available', (_, info) => callback(info));
  },
  onUpdaterDownloadProgress: (callback: (progress: any) => void) => {
    ipcRenderer.on('updater-download-progress', (_, progress) => callback(progress));
  },
  onUpdaterUpdateDownloaded: (callback: (info: any) => void) => {
    ipcRenderer.on('updater-update-downloaded', (_, info) => callback(info));
  },
  onUpdaterError: (callback: (error: string) => void) => {
    ipcRenderer.on('updater-error', (_, error) => callback(error));
  },
  removeUpdaterListeners: () => {
    ipcRenderer.removeAllListeners('updater-checking');
    ipcRenderer.removeAllListeners('updater-update-available');
    ipcRenderer.removeAllListeners('updater-update-not-available');
    ipcRenderer.removeAllListeners('updater-download-progress');
    ipcRenderer.removeAllListeners('updater-update-downloaded');
    ipcRenderer.removeAllListeners('updater-error');
  },

  // Path utilities API
  validatePath: (filePath: string) => ipcRenderer.invoke('path:validate', filePath),
  normalizePath: (filePath: string) => ipcRenderer.invoke('path:normalize', filePath),
  joinPath: (...segments: string[]) => ipcRenderer.invoke('path:join', ...segments),
  getAvailableSpace: (dirPath: string) => ipcRenderer.invoke('path:get-available-space', dirPath),

  // Recording API
  startRecording: (options: RecordingOptions) => ipcRenderer.invoke('recording:start', options),
  stopRecording: () => ipcRenderer.invoke('recording:stop'),
  getRecordingStatus: () => ipcRenderer.invoke('recording:status'),
  isRecording: () => ipcRenderer.invoke('recording:is-recording'),

  // Recording event listeners
  onRecordingStatus: (callback: (status: RecordingStatus) => void) => {
    ipcRenderer.on('recording:status-update', (event, status) => callback(status));
  },
  onRecordingProgress: (callback: (progress: RecordingProgress) => void) => {
    ipcRenderer.on('recording:progress-update', (event, progress) => callback(progress));
  },
  onRecordingFinished: (callback: (filePath: string) => void) => {
    ipcRenderer.on('recording:finished', (event, filePath) => callback(filePath));
  },
  onRecordingError: (callback: (error: string) => void) => {
    ipcRenderer.on('recording:error', (event, error) => callback(error));
  },

  // Remove listeners
  removeRecordingListeners: () => {
    ipcRenderer.removeAllListeners('recording:status-update');
    ipcRenderer.removeAllListeners('recording:progress-update');
    ipcRenderer.removeAllListeners('recording:finished');
    ipcRenderer.removeAllListeners('recording:error');
  },

  // Export API
  exportRaffleResults: (raffleId: string, outputPath?: string, options?: ExportOptions) => 
    ipcRenderer.invoke('export:raffle-results', raffleId, outputPath, options),
  exportMultipleRaffles: (raffleIds: string[], options: any) => 
    ipcRenderer.invoke('export:multiple-raffles', raffleIds, options),
  getExportHistory: () => ipcRenderer.invoke('export:get-history'),
  clearExportHistory: () => ipcRenderer.invoke('export:clear-history'),
  reExport: (historyEntryId: string) => ipcRenderer.invoke('export:re-export', historyEntryId),

  // Streaming CSV API
  streamValidateCSV: (filePath: string, raffleId: string, options?: any) => 
    ipcRenderer.invoke('streaming-csv:validate', filePath, raffleId, options),
  getParticipantCountStreaming: (filePath: string, options?: any) => 
    ipcRenderer.invoke('streaming-csv:count', filePath, options),

  // Bulk operations API
  submitBulkTask: (task: any) => ipcRenderer.invoke('bulk:submit-task', task),
  cancelBulkTask: (taskId: string) => ipcRenderer.invoke('bulk:cancel-task', taskId),
  getBulkTaskStatus: (taskId: string) => ipcRenderer.invoke('bulk:get-task-status', taskId),
  
  // Bulk operation event listeners
  onBulkProgress: (callback: (progress: any) => void) => {
    ipcRenderer.on('bulk:progress', (_, progress) => callback(progress));
  },
  onBulkResult: (callback: (result: any) => void) => {
    ipcRenderer.on('bulk:result', (_, result) => callback(result));
  },
  onBulkError: (callback: (error: any) => void) => {
    ipcRenderer.on('bulk:error', (_, error) => callback(error));
  },
  removeBulkListeners: () => {
    ipcRenderer.removeAllListeners('bulk:progress');
    ipcRenderer.removeAllListeners('bulk:result');
    ipcRenderer.removeAllListeners('bulk:error');
  },

  // Database API
  createRaffle: (raffle: any) => ipcRenderer.invoke('db:create-raffle', raffle),
  updateRaffle: (id: string, updates: any) => ipcRenderer.invoke('db:update-raffle', id, updates),
  deleteRaffle: (id: string) => ipcRenderer.invoke('db:delete-raffle', id),
  getRaffle: (id: string) => ipcRenderer.invoke('db:get-raffle', id),
  getAllRaffles: () => ipcRenderer.invoke('db:get-all-raffles'),
  recordDrawing: (drawing: any) => ipcRenderer.invoke('db:record-drawing', drawing),
  getDrawingHistory: () => ipcRenderer.invoke('db:get-drawing-history'),

  // File operations API
  saveCSVFile: (raffleId: string, csvData: string) => ipcRenderer.invoke('file:save-csv', raffleId, csvData),
  loadParticipants: (csvFilePath: string) => ipcRenderer.invoke('file:load-participants', csvFilePath),
  validateCSVData: (csvData: string) => ipcRenderer.invoke('file:validate-csv', csvData),
  saveBackgroundImage: (raffleId: string, imageBuffer: Buffer, fileName: string) => 
    ipcRenderer.invoke('file:save-background-image', raffleId, imageBuffer, fileName),

  // Random service API
  selectWinner: (participants: any[]) => ipcRenderer.invoke('random:select-winner', participants),
  assignRarities: (participants: any[]) => ipcRenderer.invoke('random:assign-rarities', participants),

  // Notification API
  showNotification: (options: { title: string; body: string; icon?: string }) => 
    ipcRenderer.invoke('notification:show', options),

  // Window management API
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  hideToTray: () => ipcRenderer.invoke('window:hide-to-tray'),

  // Dialog API
  showOpenDialog: (options: any) => ipcRenderer.invoke('dialog:show-open', options),
  showSaveDialog: (options: any) => ipcRenderer.invoke('dialog:show-save', options),
  showMessageDialog: (options: any) => ipcRenderer.invoke('dialog:show-message', options),
  showErrorDialog: (title: string, content: string) => ipcRenderer.invoke('dialog:show-error', title, content),

  // Drag and drop API
  validateDroppedFiles: (filePaths: string[]) => ipcRenderer.invoke('drag-drop:validate-files', filePaths),
  readDroppedFile: (filePath: string) => ipcRenderer.invoke('drag-drop:read-file', filePath),

  // Lifecycle management API
  getAppStatus: () => ipcRenderer.invoke('app:get-status'),
  restartApp: () => ipcRenderer.invoke('app:restart'),
  quitApp: () => ipcRenderer.invoke('app:quit'),

  // Menu event listeners
  onMenuNewRaffle: (callback: () => void) => {
    ipcRenderer.on('menu:new-raffle', () => callback());
  },
  onMenuImportCSV: (callback: (filePath: string) => void) => {
    ipcRenderer.on('menu:import-csv', (_, filePath) => callback(filePath));
  },
  onMenuExportResults: (callback: () => void) => {
    ipcRenderer.on('menu:export-results', () => callback());
  },
  removeMenuListeners: () => {
    ipcRenderer.removeAllListeners('menu:new-raffle');
    ipcRenderer.removeAllListeners('menu:import-csv');
    ipcRenderer.removeAllListeners('menu:export-results');
  }
});

// Type definitions for the exposed API
declare global {
  interface Window {
    electronAPI: {
      getVersion: () => Promise<string>;
      getPlatform: () => Promise<string>;
      getPlatformPaths: () => Promise<any>;
      getPlatformSettings: () => Promise<any>;

      checkForUpdates: () => Promise<{ success: boolean; error?: string }>;
      downloadUpdate: () => Promise<{ success: boolean; error?: string }>;
      quitAndInstall: () => Promise<{ success: boolean; error?: string }>;
      
      onUpdaterChecking: (callback: () => void) => void;
      onUpdaterUpdateAvailable: (callback: (info: any) => void) => void;
      onUpdaterUpdateNotAvailable: (callback: (info: any) => void) => void;
      onUpdaterDownloadProgress: (callback: (progress: any) => void) => void;
      onUpdaterUpdateDownloaded: (callback: (info: any) => void) => void;
      onUpdaterError: (callback: (error: string) => void) => void;
      removeUpdaterListeners: () => void;

      validatePath: (filePath: string) => Promise<{ isValid: boolean; error?: string }>;
      normalizePath: (filePath: string) => Promise<string>;
      joinPath: (...segments: string[]) => Promise<string>;
      getAvailableSpace: (dirPath: string) => Promise<{ success: boolean; space?: number; error?: string }>;
      
      startRecording: (options: RecordingOptions) => Promise<{ success: boolean; error?: string }>;
      stopRecording: () => Promise<{ success: boolean; filePath?: string; error?: string }>;
      getRecordingStatus: () => Promise<{ success: boolean; status?: RecordingStatus; error?: string }>;
      isRecording: () => Promise<{ success: boolean; isRecording?: boolean; error?: string }>;
      
      onRecordingStatus: (callback: (status: RecordingStatus) => void) => void;
      onRecordingProgress: (callback: (progress: RecordingProgress) => void) => void;
      onRecordingFinished: (callback: (filePath: string) => void) => void;
      onRecordingError: (callback: (error: string) => void) => void;
      removeRecordingListeners: () => void;

      exportRaffleResults: (raffleId: string, outputPath?: string, options?: ExportOptions) => Promise<any>;
      exportMultipleRaffles: (raffleIds: string[], options: any) => Promise<any>;
      getExportHistory: () => Promise<any[]>;
      clearExportHistory: () => Promise<void>;
      reExport: (historyEntryId: string) => Promise<any>;

      streamValidateCSV: (filePath: string, raffleId: string, options?: any) => Promise<any>;
      getParticipantCountStreaming: (filePath: string, options?: any) => Promise<any>;

      submitBulkTask: (task: any) => Promise<string>;
      cancelBulkTask: (taskId: string) => Promise<boolean>;
      getBulkTaskStatus: (taskId: string) => Promise<string>;
      
      onBulkProgress: (callback: (progress: any) => void) => void;
      onBulkResult: (callback: (result: any) => void) => void;
      onBulkError: (callback: (error: any) => void) => void;
      removeBulkListeners: () => void;

      // Database API
      createRaffle: (raffle: any) => Promise<{ success: boolean; data?: any; error?: string }>;
      updateRaffle: (id: string, updates: any) => Promise<{ success: boolean; data?: any; error?: string }>;
      deleteRaffle: (id: string) => Promise<{ success: boolean; error?: string }>;
      getRaffle: (id: string) => Promise<{ success: boolean; data?: any; error?: string }>;
      getAllRaffles: () => Promise<{ success: boolean; data?: any[]; error?: string }>;
      recordDrawing: (drawing: any) => Promise<{ success: boolean; data?: any; error?: string }>;
      getDrawingHistory: () => Promise<{ success: boolean; data?: any[]; error?: string }>;

      // File operations API
      saveCSVFile: (raffleId: string, csvData: string) => Promise<{ success: boolean; data?: string; error?: string }>;
      loadParticipants: (csvFilePath: string) => Promise<{ success: boolean; data?: any[]; error?: string }>;
      validateCSVData: (csvData: string) => Promise<{ success: boolean; data?: any; error?: string }>;
      saveBackgroundImage: (raffleId: string, imageBuffer: Buffer, fileName: string) => Promise<{ success: boolean; data?: string; error?: string }>;

      // Random service API
      selectWinner: (participants: any[]) => Promise<{ success: boolean; data?: any; error?: string }>;
      assignRarities: (participants: any[]) => Promise<{ success: boolean; data?: any[]; error?: string }>;

      // Notification API
      showNotification: (options: { title: string; body: string; icon?: string }) => Promise<{ success: boolean; error?: string }>;

      // Window management API
      minimizeWindow: () => Promise<{ success: boolean; error?: string }>;
      maximizeWindow: () => Promise<{ success: boolean; error?: string }>;
      closeWindow: () => Promise<{ success: boolean; error?: string }>;
      hideToTray: () => Promise<{ success: boolean; error?: string }>;

      // Dialog API
      showOpenDialog: (options: any) => Promise<{ success: boolean; data?: any; error?: string }>;
      showSaveDialog: (options: any) => Promise<{ success: boolean; data?: any; error?: string }>;
      showMessageDialog: (options: any) => Promise<{ success: boolean; data?: any; error?: string }>;
      showErrorDialog: (title: string, content: string) => Promise<{ success: boolean; error?: string }>;

      // Drag and drop API
      validateDroppedFiles: (filePaths: string[]) => Promise<{ success: boolean; data?: any; error?: string }>;
      readDroppedFile: (filePath: string) => Promise<{ success: boolean; data?: any; error?: string }>;

      // Lifecycle management API
      getAppStatus: () => Promise<{ success: boolean; data?: any; error?: string }>;
      restartApp: () => Promise<{ success: boolean; error?: string }>;
      quitApp: () => Promise<{ success: boolean; error?: string }>;

      // Menu event listeners
      onMenuNewRaffle: (callback: () => void) => void;
      onMenuImportCSV: (callback: (filePath: string) => void) => void;
      onMenuExportResults: (callback: () => void) => void;
      removeMenuListeners: () => void;
    };
  }
}