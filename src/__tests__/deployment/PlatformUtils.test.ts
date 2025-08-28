import { PlatformUtils } from '../../main/utils/PlatformUtils';
import * as path from 'path';
import * as os from 'os';

// Mock electron app
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn((name: string) => {
      switch (name) {
        case 'userData': return '/mock/userData';
        case 'documents': return '/mock/documents';
        case 'downloads': return '/mock/downloads';
        case 'temp': return '/mock/temp';
        default: return '/mock/default';
      }
    })
  }
}));

// Mock fs/promises
jest.mock('fs/promises', () => ({
  mkdir: jest.fn(),
  statfs: jest.fn()
}));

describe('PlatformUtils', () => {
  let platformUtils: PlatformUtils;

  beforeEach(() => {
    jest.clearAllMocks();
    platformUtils = PlatformUtils.getInstance();
  });

  describe('Singleton Pattern', () => {
    test('should return same instance', () => {
      const instance1 = PlatformUtils.getInstance();
      const instance2 = PlatformUtils.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Path Initialization', () => {
    test('should initialize paths correctly', () => {
      const paths = platformUtils.paths;
      
      expect(paths.userData).toBeDefined();
      expect(paths.documents).toBeDefined();
      expect(paths.downloads).toBeDefined();
      expect(paths.temp).toBeDefined();
      expect(paths.appData).toBeDefined();
      expect(paths.recordings).toBeDefined();
      expect(paths.raffles).toBeDefined();
    });

    test('should create platform-specific app data path', () => {
      const paths = platformUtils.paths;
      expect(paths.appData).toContain('RaffleDrawingApp');
    });
  });

  describe('Directory Management', () => {
    test('should ensure directories exist', async () => {
      const fs = require('fs/promises');
      fs.mkdir.mockResolvedValue(undefined);

      await expect(platformUtils.ensureDirectoriesExist()).resolves.not.toThrow();
      expect(fs.mkdir).toHaveBeenCalledTimes(3); // appData, recordings, raffles
    });

    test('should handle directory creation errors', async () => {
      const fs = require('fs/promises');
      fs.mkdir.mockRejectedValue(new Error('Permission denied'));

      await expect(platformUtils.ensureDirectoriesExist()).rejects.toThrow('Permission denied');
    });
  });
}); 
 describe('Path Operations', () => {
    test('should normalize paths correctly', () => {
      const testPath = 'some//path\\with/mixed\\separators';
      const normalized = platformUtils.normalizePath(testPath);
      expect(normalized).not.toContain('//');
      expect(normalized).not.toContain('\\\\');
    });

    test('should join paths correctly', () => {
      const joined = platformUtils.joinPath('path1', 'path2', 'file.txt');
      expect(joined).toBe(path.join('path1', 'path2', 'file.txt'));
    });

    test('should get file extension correctly', () => {
      expect(platformUtils.getFileExtension('file.txt')).toBe('.txt');
      expect(platformUtils.getFileExtension('file.CSV')).toBe('.csv');
      expect(platformUtils.getFileExtension('file')).toBe('');
    });

    test('should get file name correctly', () => {
      const filePath = '/path/to/file.txt';
      expect(platformUtils.getFileName(filePath)).toBe('file.txt');
      expect(platformUtils.getFileName(filePath, false)).toBe('file');
    });

    test('should detect absolute paths correctly', () => {
      if (process.platform === 'win32') {
        expect(platformUtils.isAbsolutePath('C:\\path\\file.txt')).toBe(true);
        expect(platformUtils.isAbsolutePath('relative\\path')).toBe(false);
      } else {
        expect(platformUtils.isAbsolutePath('/absolute/path')).toBe(true);
        expect(platformUtils.isAbsolutePath('relative/path')).toBe(false);
      }
    });
  });

  describe('Platform-Specific Settings', () => {
    test('should return correct settings for current platform', () => {
      const settings = platformUtils.getPlatformSpecificSettings();
      
      expect(settings.pathSeparator).toBeDefined();
      expect(settings.maxPathLength).toBeGreaterThan(0);
      expect(typeof settings.caseSensitive).toBe('boolean');
      expect(Array.isArray(settings.supportedVideoFormats)).toBe(true);
      expect(Array.isArray(settings.supportedImageFormats)).toBe(true);
      expect(settings.defaultVideoCodec).toBeDefined();
      expect(typeof settings.hardwareAcceleration).toBe('boolean');
    });

    test('should have different settings for different platforms', () => {
      const originalPlatform = process.platform;
      
      // Test Windows settings
      Object.defineProperty(process, 'platform', { value: 'win32' });
      const winSettings = platformUtils.getPlatformSpecificSettings();
      expect(winSettings.pathSeparator).toBe('\\');
      expect(winSettings.caseSensitive).toBe(false);
      expect(winSettings.maxPathLength).toBe(260);
      
      // Test macOS settings
      Object.defineProperty(process, 'platform', { value: 'darwin' });
      const macSettings = platformUtils.getPlatformSpecificSettings();
      expect(macSettings.pathSeparator).toBe('/');
      expect(macSettings.caseSensitive).toBe(true);
      expect(macSettings.maxPathLength).toBe(1024);
      
      // Test Linux settings
      Object.defineProperty(process, 'platform', { value: 'linux' });
      const linuxSettings = platformUtils.getPlatformSpecificSettings();
      expect(linuxSettings.pathSeparator).toBe('/');
      expect(linuxSettings.caseSensitive).toBe(true);
      expect(linuxSettings.maxPathLength).toBe(4096);
      
      // Restore original platform
      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });
  });

  describe('Path Validation', () => {
    test('should validate normal paths as valid', () => {
      const result = platformUtils.validatePath('/normal/path/file.txt');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    test('should reject paths that are too long', () => {
      const longPath = 'a'.repeat(5000);
      const result = platformUtils.validatePath(longPath);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('too long');
    });

    test('should validate Windows-specific restrictions', () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'win32' });
      
      // Test invalid characters
      const invalidResult = platformUtils.validatePath('file<name>.txt');
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.error).toContain('invalid characters');
      
      // Test reserved names
      const reservedResult = platformUtils.validatePath('CON.txt');
      expect(reservedResult.isValid).toBe(false);
      expect(reservedResult.error).toContain('reserved name');
      
      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });
  });

  describe('Utility Functions', () => {
    test('should format file sizes correctly', () => {
      expect(platformUtils.formatFileSize(1024)).toBe('1.0 KB');
      expect(platformUtils.formatFileSize(1048576)).toBe('1.0 MB');
      expect(platformUtils.formatFileSize(1073741824)).toBe('1.0 GB');
      expect(platformUtils.formatFileSize(500)).toBe('500.0 B');
    });

    test('should get raffle path correctly', () => {
      const raffleId = 'test-raffle-123';
      const rafflePath = platformUtils.getRafflePath(raffleId);
      expect(rafflePath).toContain(raffleId);
      expect(rafflePath).toContain('raffles');
    });

    test('should ensure raffle directory exists', async () => {
      const fs = require('fs/promises');
      fs.mkdir.mockResolvedValue(undefined);
      
      const raffleId = 'test-raffle-123';
      const rafflePath = await platformUtils.ensureRaffleDirectoryExists(raffleId);
      
      expect(rafflePath).toContain(raffleId);
      expect(fs.mkdir).toHaveBeenCalledWith(rafflePath, { recursive: true });
    });
  });

  describe('Default Paths', () => {
    test('should return correct default export path', () => {
      const exportPath = platformUtils.getDefaultExportPath();
      expect(exportPath).toBe(platformUtils.paths.documents);
    });

    test('should return correct default recording path', () => {
      const recordingPath = platformUtils.getDefaultRecordingPath();
      expect(recordingPath).toBe(platformUtils.paths.recordings);
    });
  });
});