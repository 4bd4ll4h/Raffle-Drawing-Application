/**
 * Cross-Platform Compatibility Quality Assurance Tests
 * Tests compatibility on Windows, macOS, and Linux as required by task 20
 */

import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { PlatformUtils } from '../../main/utils/PlatformUtils';
import { UpdaterService } from '../../main/services/UpdaterService';

describe('Cross-Platform Compatibility QA', () => {
  let platformUtils: PlatformUtils;
  let updaterService: UpdaterService;

  beforeAll(() => {
    platformUtils = new PlatformUtils();
    updaterService = new UpdaterService();
  });

  describe('Platform Detection and Handling', () => {
    it('should correctly identify the current platform', () => {
      const platform = platformUtils.getCurrentPlatform();
      const expectedPlatforms = ['windows', 'macos', 'linux'];
      
      expect(expectedPlatforms).toContain(platform);
      expect(platform).toBe(platformUtils.getCurrentPlatform()); // Consistent results
    });

    it('should provide platform-specific configurations', () => {
      const config = platformUtils.getPlatformConfig();
      
      expect(config).toHaveProperty('fileExtensions');
      expect(config).toHaveProperty('pathSeparator');
      expect(config).toHaveProperty('executableExtension');
      expect(config).toHaveProperty('defaultPaths');

      // Validate platform-specific values
      const platform = os.platform();
      if (platform === 'win32') {
        expect(config.pathSeparator).toBe('\\');
        expect(config.executableExtension).toBe('.exe');
      } else {
        expect(config.pathSeparator).toBe('/');
        expect(config.executableExtension).toBe('');
      }
    });

    it('should handle platform-specific file paths correctly', () => {
      const testPaths = [
        'app-data/raffles/test.csv',
        'recordings/video.mp4',
        'exports/results.csv'
      ];

      testPaths.forEach(testPath => {
        const normalizedPath = platformUtils.normalizePath(testPath);
        const expectedSeparator = os.platform() === 'win32' ? '\\' : '/';
        
        expect(normalizedPath).toContain(expectedSeparator);
        expect(path.isAbsolute(normalizedPath) || path.normalize(normalizedPath)).toBe(normalizedPath);
      });
    });
  });

  describe('File System Compatibility', () => {
    it('should handle different file system case sensitivity', async () => {
      const testFileName = 'TestFile.csv';
      const testFilePath = path.join(os.tmpdir(), testFileName);
      
      // Create test file
      await fs.promises.writeFile(testFilePath, 'test content');
      
      try {
        // Test case sensitivity behavior
        const lowerCasePath = path.join(os.tmpdir(), 'testfile.csv');
        
        if (os.platform() === 'win32' || os.platform() === 'darwin') {
          // Windows and macOS are case-insensitive by default
          const exists = fs.existsSync(lowerCasePath);
          expect(exists).toBe(true);
        } else {
          // Linux is case-sensitive
          const exists = fs.existsSync(lowerCasePath);
          expect(exists).toBe(false);
        }
      } finally {
        // Cleanup
        if (fs.existsSync(testFilePath)) {
          await fs.promises.unlink(testFilePath);
        }
      }
    });

    it('should handle platform-specific file permissions', async () => {
      const testFilePath = path.join(os.tmpdir(), 'permission-test.txt');
      
      await fs.promises.writeFile(testFilePath, 'test content');
      
      try {
        if (os.platform() !== 'win32') {
          // Unix-like systems support chmod
          await fs.promises.chmod(testFilePath, 0o644);
          const stats = await fs.promises.stat(testFilePath);
          expect(stats.mode & 0o777).toBe(0o644);
        } else {
          // Windows has different permission model
          const stats = await fs.promises.stat(testFilePath);
          expect(stats).toHaveProperty('mode');
        }
      } finally {
        await fs.promises.unlink(testFilePath);
      }
    });

    it('should handle long file paths appropriately', async () => {
      // Test long path handling (Windows has 260 character limit by default)
      const longFileName = 'a'.repeat(200) + '.csv';
      const longPath = path.join(os.tmpdir(), longFileName);
      
      try {
        await fs.promises.writeFile(longPath, 'test');
        
        const exists = fs.existsSync(longPath);
        expect(exists).toBe(true);
        
        await fs.promises.unlink(longPath);
      } catch (error: any) {
        if (os.platform() === 'win32' && error.code === 'ENAMETOOLONG') {
          // Expected on Windows with long paths
          expect(error.code).toBe('ENAMETOOLONG');
        } else {
          throw error;
        }
      }
    });
  });

  describe('System Integration', () => {
    it('should integrate with native file dialogs', () => {
      const dialogOptions = platformUtils.getFileDialogOptions('csv');
      
      expect(dialogOptions).toHaveProperty('filters');
      expect(dialogOptions.filters).toContainEqual({
        name: 'CSV Files',
        extensions: ['csv']
      });

      // Platform-specific dialog properties
      if (os.platform() === 'darwin') {
        expect(dialogOptions).toHaveProperty('message');
      }
    });

    it('should handle system notifications correctly', async () => {
      const notificationOptions = {
        title: 'Test Notification',
        body: 'This is a test notification',
        icon: 'app-icon.png'
      };

      // Test notification creation (mock)
      const canShowNotifications = platformUtils.canShowNotifications();
      expect(typeof canShowNotifications).toBe('boolean');

      if (canShowNotifications) {
        const notification = platformUtils.createNotification(notificationOptions);
        expect(notification).toBeDefined();
      }
    });

    it('should handle drag and drop appropriately', () => {
      const dragDropConfig = platformUtils.getDragDropConfig();
      
      expect(dragDropConfig).toHaveProperty('supportedTypes');
      expect(dragDropConfig.supportedTypes).toContain('text/csv');
      expect(dragDropConfig.supportedTypes).toContain('image/jpeg');
      expect(dragDropConfig.supportedTypes).toContain('image/png');
    });
  });

  describe('Application Lifecycle', () => {
    it('should handle application startup correctly on all platforms', () => {
      const startupConfig = platformUtils.getStartupConfig();
      
      expect(startupConfig).toHaveProperty('windowOptions');
      expect(startupConfig).toHaveProperty('menuTemplate');
      
      // Platform-specific window options
      if (os.platform() === 'darwin') {
        expect(startupConfig.windowOptions).toHaveProperty('titleBarStyle');
      }
      
      if (os.platform() === 'win32') {
        expect(startupConfig.windowOptions).toHaveProperty('icon');
      }
    });

    it('should handle application updates correctly', async () => {
      const updateConfig = updaterService.getUpdateConfig();
      
      expect(updateConfig).toHaveProperty('updateUrl');
      expect(updateConfig).toHaveProperty('platform');
      
      // Platform-specific update handling
      const platform = os.platform();
      if (platform === 'win32') {
        expect(updateConfig.platform).toBe('win32');
        expect(updateConfig).toHaveProperty('installerType');
      } else if (platform === 'darwin') {
        expect(updateConfig.platform).toBe('darwin');
        expect(updateConfig).toHaveProperty('dmgOptions');
      } else {
        expect(updateConfig.platform).toBe('linux');
        expect(updateConfig).toHaveProperty('debOptions');
      }
    });

    it('should handle application termination gracefully', async () => {
      const terminationHandlers = platformUtils.getTerminationHandlers();
      
      expect(terminationHandlers).toHaveProperty('beforeQuit');
      expect(terminationHandlers).toHaveProperty('windowAllClosed');
      
      // Test graceful shutdown
      const shutdownPromise = platformUtils.gracefulShutdown();
      expect(shutdownPromise).toBeInstanceOf(Promise);
      
      await shutdownPromise; // Should complete without errors
    });
  });

  describe('Performance Characteristics', () => {
    it('should maintain consistent performance across platforms', async () => {
      const performanceTests = [
        () => platformUtils.normalizePath('test/path/file.csv'),
        () => platformUtils.getCurrentPlatform(),
        () => platformUtils.getPlatformConfig(),
        () => platformUtils.getFileDialogOptions('csv')
      ];

      const results = [];
      
      for (const test of performanceTests) {
        const startTime = performance.now();
        test();
        const endTime = performance.now();
        results.push(endTime - startTime);
      }

      // All operations should be fast (< 10ms)
      results.forEach(time => {
        expect(time).toBeLessThan(10);
      });
    });

    it('should handle memory usage consistently', () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Perform platform operations
      for (let i = 0; i < 1000; i++) {
        platformUtils.normalizePath(`test/path/file${i}.csv`);
        platformUtils.getCurrentPlatform();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be minimal
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // Less than 10MB
    });
  });

  describe('Error Handling Across Platforms', () => {
    it('should provide consistent error messages', async () => {
      const testErrors = [
        'File not found',
        'Permission denied',
        'Disk space full',
        'Network timeout'
      ];

      testErrors.forEach(errorType => {
        const errorMessage = platformUtils.getLocalizedErrorMessage(errorType);
        
        expect(errorMessage).toBeDefined();
        expect(errorMessage.length).toBeGreaterThan(0);
        expect(errorMessage).not.toContain('undefined');
      });
    });

    it('should handle platform-specific error codes', () => {
      const platformErrors = {
        'win32': ['ENOENT', 'EACCES', 'ENOSPC'],
        'darwin': ['ENOENT', 'EACCES', 'ENOSPC'],
        'linux': ['ENOENT', 'EACCES', 'ENOSPC', 'EMFILE']
      };

      const currentPlatform = os.platform() as keyof typeof platformErrors;
      const expectedErrors = platformErrors[currentPlatform] || platformErrors['linux'];

      expectedErrors.forEach(errorCode => {
        const handled = platformUtils.canHandleErrorCode(errorCode);
        expect(handled).toBe(true);
      });
    });
  });

  describe('Localization and Internationalization', () => {
    it('should handle different locale formats', () => {
      const testLocales = ['en-US', 'en-GB', 'fr-FR', 'de-DE', 'ja-JP'];
      
      testLocales.forEach(locale => {
        const dateFormat = platformUtils.getDateFormat(locale);
        const numberFormat = platformUtils.getNumberFormat(locale);
        
        expect(dateFormat).toBeDefined();
        expect(numberFormat).toBeDefined();
      });
    });

    it('should handle different character encodings', async () => {
      const testStrings = [
        'Hello World',
        'Héllo Wörld',
        'こんにちは世界',
        '🎉🎊🎈'
      ];

      const testFilePath = path.join(os.tmpdir(), 'encoding-test.txt');
      
      for (const testString of testStrings) {
        await fs.promises.writeFile(testFilePath, testString, 'utf8');
        const readString = await fs.promises.readFile(testFilePath, 'utf8');
        
        expect(readString).toBe(testString);
      }

      // Cleanup
      await fs.promises.unlink(testFilePath);
    });
  });

  describe('Hardware Integration', () => {
    it('should detect available hardware features', () => {
      const hardwareInfo = platformUtils.getHardwareInfo();
      
      expect(hardwareInfo).toHaveProperty('cpuCount');
      expect(hardwareInfo).toHaveProperty('totalMemory');
      expect(hardwareInfo).toHaveProperty('platform');
      expect(hardwareInfo).toHaveProperty('arch');
      
      expect(hardwareInfo.cpuCount).toBeGreaterThan(0);
      expect(hardwareInfo.totalMemory).toBeGreaterThan(0);
    });

    it('should handle different screen configurations', () => {
      const screenInfo = platformUtils.getScreenInfo();
      
      expect(screenInfo).toHaveProperty('displays');
      expect(Array.isArray(screenInfo.displays)).toBe(true);
      expect(screenInfo.displays.length).toBeGreaterThan(0);
      
      screenInfo.displays.forEach(display => {
        expect(display).toHaveProperty('width');
        expect(display).toHaveProperty('height');
        expect(display).toHaveProperty('scaleFactor');
      });
    });
  });
});

/**
 * Platform-specific test helpers
 */
function runPlatformSpecificTest(testName: string, tests: Record<string, () => void | Promise<void>>) {
  const platform = os.platform();
  const platformKey = platform === 'win32' ? 'windows' : 
                     platform === 'darwin' ? 'macos' : 'linux';
  
  if (tests[platformKey]) {
    it(`${testName} (${platformKey})`, tests[platformKey]);
  } else if (tests.default) {
    it(`${testName} (default)`, tests.default);
  }
}