import { UpdaterService } from '../../main/services/UpdaterService';
import { EventEmitter } from 'events';

// Mock electron-updater
jest.mock('electron-updater', () => ({
  autoUpdater: {
    autoDownload: false,
    autoInstallOnAppQuit: true,
    updateConfigPath: '',
    on: jest.fn(),
    checkForUpdatesAndNotify: jest.fn(),
    downloadUpdate: jest.fn(),
    quitAndInstall: jest.fn()
  }
}));

// Mock electron
jest.mock('electron', () => ({
  BrowserWindow: jest.fn(),
  dialog: {
    showMessageBox: jest.fn()
  }
}));

describe('UpdaterService', () => {
  let updaterService: UpdaterService;
  let mockWindow: any;

  beforeEach(() => {
    jest.clearAllMocks();
    updaterService = new UpdaterService();
    mockWindow = {
      isDestroyed: jest.fn().mockReturnValue(false),
      webContents: {
        send: jest.fn()
      }
    };
  });

  describe('Initialization', () => {
    test('should initialize with correct default settings', () => {
      expect(updaterService).toBeInstanceOf(EventEmitter);
    });

    test('should set main window correctly', () => {
      expect(() => {
        updaterService.setMainWindow(mockWindow);
      }).not.toThrow();
    });
  });

  describe('Update Configuration', () => {
    test('should return correct configuration for Windows', () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', {
        value: 'win32'
      });

      const config = updaterService.getUpdateConfiguration();
      
      expect(config.provider).toBe('github');
      expect(config.owner).toBeDefined();
      expect(config.repo).toBeDefined();
      expect(config.private).toBe(false);
      expect(config.releaseType).toBe('release');

      Object.defineProperty(process, 'platform', {
        value: originalPlatform
      });
    });

    test('should return correct configuration for macOS', () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', {
        value: 'darwin'
      });

      const config = updaterService.getUpdateConfiguration();
      
      expect(config.provider).toBe('github');
      expect(config.owner).toBeDefined();
      expect(config.repo).toBeDefined();

      Object.defineProperty(process, 'platform', {
        value: originalPlatform
      });
    });

    test('should return correct configuration for Linux', () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', {
        value: 'linux'
      });

      const config = updaterService.getUpdateConfiguration();
      
      expect(config.provider).toBe('github');
      expect(config.owner).toBeDefined();
      expect(config.repo).toBeDefined();

      Object.defineProperty(process, 'platform', {
        value: originalPlatform
      });
    });

    test('should throw error for unsupported platform', () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', {
        value: 'unsupported'
      });

      expect(() => {
        updaterService.getUpdateConfiguration();
      }).toThrow('Unsupported platform: unsupported');

      Object.defineProperty(process, 'platform', {
        value: originalPlatform
      });
    });
  });

  describe('Update Methods', () => {
    test('should check for updates', async () => {
      const { autoUpdater } = require('electron-updater');
      autoUpdater.checkForUpdatesAndNotify.mockResolvedValue(undefined);

      await expect(updaterService.checkForUpdates()).resolves.not.toThrow();
      expect(autoUpdater.checkForUpdatesAndNotify).toHaveBeenCalled();
    });

    test('should handle check for updates error', async () => {
      const { autoUpdater } = require('electron-updater');
      const error = new Error('Network error');
      autoUpdater.checkForUpdatesAndNotify.mockRejectedValue(error);

      await updaterService.checkForUpdates();
      // Should not throw, but should emit error event
    });

    test('should download update when available', async () => {
      const { autoUpdater } = require('electron-updater');
      autoUpdater.downloadUpdate.mockResolvedValue(undefined);

      // Set update as available
      (updaterService as any).updateAvailable = true;

      await expect(updaterService.downloadUpdate()).resolves.not.toThrow();
      expect(autoUpdater.downloadUpdate).toHaveBeenCalled();
    });

    test('should throw error when trying to download without available update', async () => {
      (updaterService as any).updateAvailable = false;

      await expect(updaterService.downloadUpdate()).rejects.toThrow('No update available to download');
    });

    test('should quit and install when update is downloaded', () => {
      const { autoUpdater } = require('electron-updater');
      
      // Set update as downloaded
      (updaterService as any).updateDownloaded = true;

      expect(() => {
        updaterService.quitAndInstall();
      }).not.toThrow();
      
      expect(autoUpdater.quitAndInstall).toHaveBeenCalled();
    });

    test('should throw error when trying to install without downloaded update', () => {
      (updaterService as any).updateDownloaded = false;

      expect(() => {
        updaterService.quitAndInstall();
      }).toThrow('No update downloaded to install');
    });
  });

  describe('Event Handling', () => {
    test('should emit events correctly', (done) => {
      const testData = { version: '1.0.1', releaseNotes: 'Test update' };
      
      updaterService.on('update-available', (info) => {
        expect(info).toEqual(testData);
        done();
      });

      updaterService.emit('update-available', testData);
    });

    test('should send messages to renderer when window is available', () => {
      updaterService.setMainWindow(mockWindow);
      
      // Simulate sending message to renderer
      (updaterService as any).sendToRenderer('test-channel', { test: 'data' });
      
      expect(mockWindow.webContents.send).toHaveBeenCalledWith('test-channel', { test: 'data' });
    });

    test('should not send messages when window is destroyed', () => {
      mockWindow.isDestroyed.mockReturnValue(true);
      updaterService.setMainWindow(mockWindow);
      
      (updaterService as any).sendToRenderer('test-channel', { test: 'data' });
      
      expect(mockWindow.webContents.send).not.toHaveBeenCalled();
    });
  });

  describe('Dialog Handling', () => {
    test('should show update available dialog', async () => {
      const { dialog } = require('electron');
      dialog.showMessageBox.mockResolvedValue({ response: 0 }); // Download Now
      
      updaterService.setMainWindow(mockWindow);
      (updaterService as any).updateAvailable = true;
      
      const updateInfo = {
        version: '1.0.1',
        releaseNotes: 'Test update',
        releaseDate: new Date().toISOString(),
        downloadSize: 1024000
      };

      await (updaterService as any).showUpdateAvailableDialog(updateInfo);
      
      expect(dialog.showMessageBox).toHaveBeenCalledWith(
        mockWindow,
        expect.objectContaining({
          type: 'info',
          title: 'Update Available',
          message: `A new version (${updateInfo.version}) is available!`
        })
      );
    });

    test('should show error dialog', async () => {
      const { dialog } = require('electron');
      dialog.showMessageBox.mockResolvedValue({ response: 0 });
      
      updaterService.setMainWindow(mockWindow);
      
      const error = new Error('Test error');
      await (updaterService as any).showErrorDialog(error);
      
      expect(dialog.showMessageBox).toHaveBeenCalledWith(
        mockWindow,
        expect.objectContaining({
          type: 'error',
          title: 'Update Error',
          message: 'An error occurred while checking for updates.',
          detail: error.message
        })
      );
    });
  });
});