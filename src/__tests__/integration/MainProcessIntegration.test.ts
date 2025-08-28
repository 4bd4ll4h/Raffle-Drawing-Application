import { jest } from '@jest/globals';

// Mock Electron modules
const mockApp = {
  whenReady: jest.fn(),
  on: jest.fn(),
  quit: jest.fn(),
  relaunch: jest.fn(),
  exit: jest.fn(),
  getVersion: jest.fn(() => '1.0.0'),
  getName: jest.fn(() => 'Raffle Drawing App'),
  requestSingleInstanceLock: jest.fn(() => true)
};

const mockBrowserWindow = jest.fn().mockImplementation(() => ({
  loadURL: jest.fn(),
  loadFile: jest.fn(),
  show: jest.fn(),
  hide: jest.fn(),
  focus: jest.fn(),
  minimize: jest.fn(),
  maximize: jest.fn(),
  unmaximize: jest.fn(),
  restore: jest.fn(),
  close: jest.fn(),
  destroy: jest.fn(),
  isMinimized: jest.fn(() => false),
  isMaximized: jest.fn(() => false),
  isDestroyed: jest.fn(() => false),
  on: jest.fn(),
  once: jest.fn(),
  webContents: {
    send: jest.fn(),
    on: jest.fn(),
    openDevTools: jest.fn()
  }
}));

const mockIpcMain = {
  handle: jest.fn(),
  on: jest.fn()
};

const mockMenu = {
  buildFromTemplate: jest.fn(),
  setApplicationMenu: jest.fn()
};

const mockTray = jest.fn().mockImplementation(() => ({
  setToolTip: jest.fn(),
  setContextMenu: jest.fn(),
  on: jest.fn(),
  destroy: jest.fn(),
  displayBalloon: jest.fn()
}));

const mockDialog = {
  showOpenDialog: jest.fn(),
  showSaveDialog: jest.fn(),
  showMessageBox: jest.fn(),
  showErrorBox: jest.fn()
};

const mockShell = {
  openPath: jest.fn()
};

const mockNotification = jest.fn().mockImplementation(() => ({
  show: jest.fn(),
  on: jest.fn()
}));

mockNotification.isSupported = jest.fn(() => true);

const mockNativeImage = {
  createFromPath: jest.fn(() => ({ isEmpty: () => false })),
  createFromDataURL: jest.fn(() => ({}))
};

// Mock the ServiceManager
const mockServiceManager = {
  getInstance: jest.fn(() => ({
    initialize: jest.fn(),
    shutdown: jest.fn(),
    isRecording: jest.fn(() => false),
    startRecording: jest.fn(),
    stopRecording: jest.fn(),
    getRecordingStatus: jest.fn(),
    getRecordingService: jest.fn(() => ({
      on: jest.fn()
    })),
    createRaffle: jest.fn(),
    updateRaffle: jest.fn(),
    deleteRaffle: jest.fn(),
    getRaffle: jest.fn(),
    getAllRaffles: jest.fn(),
    recordDrawing: jest.fn(),
    getDrawingHistory: jest.fn(),
    saveCSVFile: jest.fn(),
    loadParticipants: jest.fn(),
    validateCSVData: jest.fn(),
    saveBackgroundImage: jest.fn(),
    selectWinner: jest.fn(),
    assignRarities: jest.fn(),
    exportRaffleResultsToFile: jest.fn(),
    exportMultipleRaffles: jest.fn(),
    getExportHistory: jest.fn(),
    clearExportHistory: jest.fn(),
    reExport: jest.fn()
  }))
};

// Mock platform utils
const mockPlatformUtils = {
  ensureDirectoriesExist: jest.fn(),
  paths: {
    appData: '/mock/app-data',
    logs: '/mock/logs'
  },
  getPlatformSpecificSettings: jest.fn(() => ({})),
  validatePath: jest.fn(),
  normalizePath: jest.fn(),
  joinPath: jest.fn(),
  getAvailableSpace: jest.fn()
};

// Mock updater service
const mockUpdaterService = {
  setMainWindow: jest.fn(),
  checkForUpdates: jest.fn()
};

// Set up mocks
jest.mock('electron', () => ({
  app: mockApp,
  BrowserWindow: mockBrowserWindow,
  ipcMain: mockIpcMain,
  Menu: mockMenu,
  Tray: mockTray,
  dialog: mockDialog,
  shell: mockShell,
  Notification: mockNotification,
  nativeImage: mockNativeImage
}));

jest.mock('../../main/services/ServiceManager', () => ({
  ServiceManager: mockServiceManager
}));

jest.mock('../../main/utils/PlatformUtils', () => ({
  platformUtils: mockPlatformUtils
}));

jest.mock('../../main/services/UpdaterService', () => ({
  updaterService: mockUpdaterService
}));

describe('Main Process Integration Tests', () => {
  let RaffleDrawingApp: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Reset app ready promise
    mockApp.whenReady.mockResolvedValue(undefined);
    
    // Import the main application class
    const mainModule = await import('../../main/main');
    RaffleDrawingApp = (mainModule as any).default;
  });

  describe('Application Initialization', () => {
    it('should initialize the application correctly', async () => {
      expect(mockApp.whenReady).toHaveBeenCalled();
      expect(mockApp.on).toHaveBeenCalledWith('window-all-closed', expect.any(Function));
      expect(mockApp.on).toHaveBeenCalledWith('before-quit', expect.any(Function));
      expect(mockApp.on).toHaveBeenCalledWith('will-quit', expect.any(Function));
      expect(mockApp.on).toHaveBeenCalledWith('activate', expect.any(Function));
      expect(mockApp.on).toHaveBeenCalledWith('second-instance', expect.any(Function));
    });

    it('should ensure single instance lock', () => {
      expect(mockApp.requestSingleInstanceLock).toHaveBeenCalled();
    });

    it('should initialize platform utilities', async () => {
      // Trigger the app ready event
      const readyCallback = mockApp.whenReady.mock.calls[0][0];
      if (readyCallback) {
        await readyCallback();
      }

      expect(mockPlatformUtils.ensureDirectoriesExist).toHaveBeenCalled();
    });

    it('should initialize service manager', async () => {
      const serviceManagerInstance = mockServiceManager.getInstance();
      
      // Trigger the app ready event
      const readyCallback = mockApp.whenReady.mock.calls[0][0];
      if (readyCallback) {
        await readyCallback();
      }

      expect(serviceManagerInstance.initialize).toHaveBeenCalled();
    });
  });

  describe('Window Management', () => {
    it('should create main window on app ready', async () => {
      // Trigger the app ready event
      const readyCallback = mockApp.whenReady.mock.calls[0][0];
      if (readyCallback) {
        await readyCallback();
      }

      expect(mockBrowserWindow).toHaveBeenCalledWith(expect.objectContaining({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        webPreferences: expect.objectContaining({
          nodeIntegration: false,
          contextIsolation: true
        })
      }));
    });

    it('should set up window event handlers', async () => {
      // Trigger the app ready event
      const readyCallback = mockApp.whenReady.mock.calls[0][0];
      if (readyCallback) {
        await readyCallback();
      }

      const windowInstance = mockBrowserWindow.mock.results[0].value;
      expect(windowInstance.on).toHaveBeenCalledWith('closed', expect.any(Function));
      expect(windowInstance.on).toHaveBeenCalledWith('close', expect.any(Function));
      expect(windowInstance.once).toHaveBeenCalledWith('ready-to-show', expect.any(Function));
    });

    it('should handle window close event correctly', async () => {
      // Trigger the app ready event
      const readyCallback = mockApp.whenReady.mock.calls[0][0];
      if (readyCallback) {
        await readyCallback();
      }

      const windowInstance = mockBrowserWindow.mock.results[0].value;
      const closeHandler = windowInstance.on.mock.calls.find(
        call => call[0] === 'close'
      )?.[1];

      if (closeHandler) {
        const mockEvent = { preventDefault: jest.fn() };
        closeHandler(mockEvent);
        
        // Should prevent default and hide window instead of closing
        expect(mockEvent.preventDefault).toHaveBeenCalled();
        expect(windowInstance.hide).toHaveBeenCalled();
      }
    });
  });

  describe('Menu Creation', () => {
    it('should create application menu', async () => {
      // Trigger the app ready event
      const readyCallback = mockApp.whenReady.mock.calls[0][0];
      if (readyCallback) {
        await readyCallback();
      }

      expect(mockMenu.buildFromTemplate).toHaveBeenCalled();
      expect(mockMenu.setApplicationMenu).toHaveBeenCalled();
    });

    it('should include all required menu items', async () => {
      // Trigger the app ready event
      const readyCallback = mockApp.whenReady.mock.calls[0][0];
      if (readyCallback) {
        await readyCallback();
      }

      const menuTemplate = mockMenu.buildFromTemplate.mock.calls[0][0];
      
      // Check for main menu sections
      const menuLabels = menuTemplate.map((item: any) => item.label);
      expect(menuLabels).toContain('File');
      expect(menuLabels).toContain('Edit');
      expect(menuLabels).toContain('View');
      expect(menuLabels).toContain('Window');
      expect(menuLabels).toContain('Help');
    });
  });

  describe('System Tray', () => {
    it('should create system tray', async () => {
      // Trigger the app ready event
      const readyCallback = mockApp.whenReady.mock.calls[0][0];
      if (readyCallback) {
        await readyCallback();
      }

      expect(mockTray).toHaveBeenCalled();
    });

    it('should set up tray context menu', async () => {
      // Trigger the app ready event
      const readyCallback = mockApp.whenReady.mock.calls[0][0];
      if (readyCallback) {
        await readyCallback();
      }

      const trayInstance = mockTray.mock.results[0].value;
      expect(trayInstance.setToolTip).toHaveBeenCalledWith('Raffle Drawing Application');
      expect(trayInstance.setContextMenu).toHaveBeenCalled();
    });

    it('should handle tray click events', async () => {
      // Trigger the app ready event
      const readyCallback = mockApp.whenReady.mock.calls[0][0];
      if (readyCallback) {
        await readyCallback();
      }

      const trayInstance = mockTray.mock.results[0].value;
      expect(trayInstance.on).toHaveBeenCalledWith('click', expect.any(Function));
      expect(trayInstance.on).toHaveBeenCalledWith('double-click', expect.any(Function));
    });
  });

  describe('IPC Handlers', () => {
    it('should set up all required IPC handlers', async () => {
      // Trigger the app ready event
      const readyCallback = mockApp.whenReady.mock.calls[0][0];
      if (readyCallback) {
        await readyCallback();
      }

      // Check that IPC handlers are registered
      const ipcHandlers = mockIpcMain.handle.mock.calls.map(call => call[0]);
      
      // App info handlers
      expect(ipcHandlers).toContain('app:get-version');
      expect(ipcHandlers).toContain('app:get-platform');
      expect(ipcHandlers).toContain('app:get-platform-paths');
      expect(ipcHandlers).toContain('app:get-platform-settings');
      
      // Database handlers
      expect(ipcHandlers).toContain('db:create-raffle');
      expect(ipcHandlers).toContain('db:update-raffle');
      expect(ipcHandlers).toContain('db:delete-raffle');
      expect(ipcHandlers).toContain('db:get-raffle');
      expect(ipcHandlers).toContain('db:get-all-raffles');
      
      // File operation handlers
      expect(ipcHandlers).toContain('file:save-csv');
      expect(ipcHandlers).toContain('file:load-participants');
      expect(ipcHandlers).toContain('file:validate-csv');
      
      // Window management handlers
      expect(ipcHandlers).toContain('window:minimize');
      expect(ipcHandlers).toContain('window:maximize');
      expect(ipcHandlers).toContain('window:close');
      expect(ipcHandlers).toContain('window:hide-to-tray');
      
      // Notification handlers
      expect(ipcHandlers).toContain('notification:show');
      
      // Dialog handlers
      expect(ipcHandlers).toContain('dialog:show-open');
      expect(ipcHandlers).toContain('dialog:show-save');
      expect(ipcHandlers).toContain('dialog:show-message');
      expect(ipcHandlers).toContain('dialog:show-error');
      
      // Drag and drop handlers
      expect(ipcHandlers).toContain('drag-drop:validate-files');
      expect(ipcHandlers).toContain('drag-drop:read-file');
      
      // Lifecycle handlers
      expect(ipcHandlers).toContain('app:get-status');
      expect(ipcHandlers).toContain('app:restart');
      expect(ipcHandlers).toContain('app:quit');
    });
  });

  describe('Application Lifecycle', () => {
    it('should handle app quit correctly', async () => {
      const serviceManagerInstance = mockServiceManager.getInstance();
      
      // Trigger the app ready event first
      const readyCallback = mockApp.whenReady.mock.calls[0][0];
      if (readyCallback) {
        await readyCallback();
      }

      // Find and trigger the window-all-closed handler
      const windowAllClosedHandler = mockApp.on.mock.calls.find(
        call => call[0] === 'window-all-closed'
      )?.[1];

      if (windowAllClosedHandler) {
        await windowAllClosedHandler();
        expect(serviceManagerInstance.shutdown).toHaveBeenCalled();
      }
    });

    it('should handle before-quit event', async () => {
      // Trigger the app ready event first
      const readyCallback = mockApp.whenReady.mock.calls[0][0];
      if (readyCallback) {
        await readyCallback();
      }

      // Find and trigger the before-quit handler
      const beforeQuitHandler = mockApp.on.mock.calls.find(
        call => call[0] === 'before-quit'
      )?.[1];

      if (beforeQuitHandler) {
        const mockEvent = { preventDefault: jest.fn() };
        await beforeQuitHandler(mockEvent);
        
        // Should perform cleanup
        expect(mockEvent.preventDefault).toHaveBeenCalled();
      }
    });

    it('should handle second instance correctly', async () => {
      // Trigger the app ready event first
      const readyCallback = mockApp.whenReady.mock.calls[0][0];
      if (readyCallback) {
        await readyCallback();
      }

      // Find and trigger the second-instance handler
      const secondInstanceHandler = mockApp.on.mock.calls.find(
        call => call[0] === 'second-instance'
      )?.[1];

      if (secondInstanceHandler) {
        secondInstanceHandler();
        
        // Should focus the main window
        const windowInstance = mockBrowserWindow.mock.results[0].value;
        expect(windowInstance.focus).toHaveBeenCalled();
      }
    });
  });

  describe('Drag and Drop Support', () => {
    it('should set up drag and drop handlers', async () => {
      // Trigger the app ready event
      const readyCallback = mockApp.whenReady.mock.calls[0][0];
      if (readyCallback) {
        await readyCallback();
      }

      const windowInstance = mockBrowserWindow.mock.results[0].value;
      expect(windowInstance.webContents.on).toHaveBeenCalledWith('will-navigate', expect.any(Function));
    });

    it('should validate dropped files correctly', async () => {
      // Trigger the app ready event
      const readyCallback = mockApp.whenReady.mock.calls[0][0];
      if (readyCallback) {
        await readyCallback();
      }

      // Find the drag-drop:validate-files handler
      const validateHandler = mockIpcMain.handle.mock.calls.find(
        call => call[0] === 'drag-drop:validate-files'
      )?.[1];

      if (validateHandler) {
        const result = validateHandler(null, ['/path/to/file.csv', '/path/to/image.png', '/path/to/invalid.txt']);
        
        expect(result.success).toBe(true);
        expect(result.data.validFiles).toHaveLength(2);
        expect(result.data.invalidFiles).toHaveLength(1);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle service manager initialization errors', async () => {
      const serviceManagerInstance = mockServiceManager.getInstance();
      serviceManagerInstance.initialize.mockRejectedValue(new Error('Initialization failed'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Trigger the app ready event
      const readyCallback = mockApp.whenReady.mock.calls[0][0];
      if (readyCallback) {
        await readyCallback();
      }

      expect(consoleSpy).toHaveBeenCalledWith('Failed to initialize services:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });

    it('should handle platform utilities initialization errors', async () => {
      mockPlatformUtils.ensureDirectoriesExist.mockRejectedValue(new Error('Directory creation failed'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Trigger the app ready event
      const readyCallback = mockApp.whenReady.mock.calls[0][0];
      if (readyCallback) {
        await readyCallback();
      }

      expect(consoleSpy).toHaveBeenCalledWith('Failed to initialize services:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });
});