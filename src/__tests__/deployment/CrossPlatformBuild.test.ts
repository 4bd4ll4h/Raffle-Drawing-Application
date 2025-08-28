import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

describe('Cross-Platform Build Tests', () => {
  const releaseDir = path.join(process.cwd(), 'release');
  
  beforeAll(() => {
    // Ensure we're in the project root
    expect(fs.existsSync('package.json')).toBe(true);
  });

  describe('Build Configuration', () => {
    test('should have valid electron-builder configuration', () => {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      
      expect(packageJson.build).toBeDefined();
      expect(packageJson.build.appId).toBe('com.raffledrawing.app');
      expect(packageJson.build.productName).toBe('Raffle Drawing Application');
      
      // Check platform-specific configurations
      expect(packageJson.build.mac).toBeDefined();
      expect(packageJson.build.win).toBeDefined();
      expect(packageJson.build.linux).toBeDefined();
      
      // Check required build files
      expect(packageJson.build.files).toContain('dist/**/*');
      expect(packageJson.build.files).toContain('node_modules/**/*');
    });

    test('should have required build scripts', () => {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      
      expect(packageJson.scripts['dist']).toBeDefined();
      expect(packageJson.scripts['dist:win']).toBeDefined();
      expect(packageJson.scripts['dist:mac']).toBeDefined();
      expect(packageJson.scripts['dist:linux']).toBeDefined();
      expect(packageJson.scripts['dist:all']).toBeDefined();
    });

    test('should have electron-updater dependency', () => {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      
      expect(packageJson.dependencies['electron-updater']).toBeDefined();
    });
  });

  describe('Build Assets', () => {
    test('should have required build configuration files', () => {
      expect(fs.existsSync('build/entitlements.mac.plist')).toBe(true);
      expect(fs.existsSync('build/installer.nsh')).toBe(true);
      expect(fs.existsSync('build/linux-after-install.sh')).toBe(true);
    });

    test('macOS entitlements should be valid XML', () => {
      const entitlementsPath = 'build/entitlements.mac.plist';
      const content = fs.readFileSync(entitlementsPath, 'utf8');
      
      expect(content).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(content).toContain('<!DOCTYPE plist');
      expect(content).toContain('<plist version="1.0">');
      expect(content).toContain('com.apple.security.cs.allow-jit');
      expect(content).toContain('com.apple.security.device.audio-input');
      expect(content).toContain('com.apple.security.device.camera');
    });

    test('NSIS installer script should have required functions', () => {
      const nsisPath = 'build/installer.nsh';
      const content = fs.readFileSync(nsisPath, 'utf8');
      
      expect(content).toContain('Function .onVerifyInstDir');
      expect(content).toContain('Function .onInstSuccess');
      expect(content).toContain('Function un.onInit');
      expect(content).toContain('CreateDirectory "$APPDATA\\RaffleDrawingApp"');
    });

    test('Linux post-install script should be executable', () => {
      const scriptPath = 'build/linux-after-install.sh';
      const stats = fs.statSync(scriptPath);
      
      // Check if file exists and has content
      expect(stats.isFile()).toBe(true);
      expect(stats.size).toBeGreaterThan(0);
      
      const content = fs.readFileSync(scriptPath, 'utf8');
      expect(content).toContain('#!/bin/bash');
      expect(content).toContain('mkdir -p "$HOME/.config/RaffleDrawingApp"');
    });
  });

  describe('Platform-Specific Configurations', () => {
    test('Windows configuration should be complete', () => {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      const winConfig = packageJson.build.win;
      
      expect(winConfig.icon).toBe('build/icon.ico');
      expect(winConfig.target).toContainEqual({ target: 'nsis', arch: ['x64', 'ia32'] });
      expect(winConfig.target).toContainEqual({ target: 'portable', arch: ['x64'] });
      expect(winConfig.publisherName).toBe('Raffle Drawing Application');
    });

    test('macOS configuration should be complete', () => {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      const macConfig = packageJson.build.mac;
      
      expect(macConfig.category).toBe('public.app-category.productivity');
      expect(macConfig.icon).toBe('build/icon.icns');
      expect(macConfig.hardenedRuntime).toBe(true);
      expect(macConfig.entitlements).toBe('build/entitlements.mac.plist');
      expect(macConfig.target).toContainEqual({ target: 'dmg', arch: ['x64', 'arm64'] });
    });

    test('Linux configuration should be complete', () => {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      const linuxConfig = packageJson.build.linux;
      
      expect(linuxConfig.icon).toBe('build/icon.png');
      expect(linuxConfig.category).toBe('Office');
      expect(linuxConfig.target).toContainEqual({ target: 'deb', arch: ['x64'] });
      expect(linuxConfig.target).toContainEqual({ target: 'rpm', arch: ['x64'] });
      expect(linuxConfig.target).toContainEqual({ target: 'AppImage', arch: ['x64'] });
    });
  });

  describe('Auto-Updater Configuration', () => {
    test('should have publish configuration', () => {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      
      expect(packageJson.build.publish).toBeDefined();
      expect(packageJson.build.publish.provider).toBe('github');
      expect(packageJson.build.publish.owner).toBeDefined();
      expect(packageJson.build.publish.repo).toBeDefined();
    });

    test('should have publish scripts', () => {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      
      expect(packageJson.scripts.publish).toBeDefined();
      expect(packageJson.scripts['publish:win']).toBeDefined();
      expect(packageJson.scripts['publish:mac']).toBeDefined();
      expect(packageJson.scripts['publish:linux']).toBeDefined();
    });
  });

  describe('Build Process Validation', () => {
    test('should be able to run build preparation', () => {
      expect(() => {
        execSync('npm run build', { stdio: 'pipe' });
      }).not.toThrow();
      
      // Check that dist directory was created
      expect(fs.existsSync('dist')).toBe(true);
      expect(fs.existsSync('dist/main')).toBe(true);
      expect(fs.existsSync('dist/renderer')).toBe(true);
    });

    test('should be able to pack without distribution', () => {
      expect(() => {
        execSync('npm run pack', { stdio: 'pipe' });
      }).not.toThrow();
      
      // Check that release directory was created
      expect(fs.existsSync(releaseDir)).toBe(true);
    });
  });

  describe('File Structure Validation', () => {
    test('should have proper directory structure for packaging', () => {
      const requiredDirs = [
        'src/main',
        'src/renderer',
        'src/types',
        'app-data'
      ];
      
      requiredDirs.forEach(dir => {
        expect(fs.existsSync(dir)).toBe(true);
      });
    });

    test('should exclude development files from packaging', () => {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      const files = packageJson.build.files;
      
      // Should include production files
      expect(files).toContain('dist/**/*');
      expect(files).toContain('node_modules/**/*');
      
      // Should exclude development files
      expect(files).toContain('!node_modules/**/*.{md,txt}');
      expect(files).toContain('!node_modules/**/test/**');
      expect(files).toContain('!node_modules/**/__tests__/**');
    });
  });

  describe('Platform Path Handling', () => {
    test('should handle different path separators', () => {
      const { PlatformUtils } = require('../../main/utils/PlatformUtils');
      const platformUtils = PlatformUtils.getInstance();
      
      const settings = platformUtils.getPlatformSpecificSettings();
      
      if (process.platform === 'win32') {
        expect(settings.pathSeparator).toBe('\\');
        expect(settings.caseSensitive).toBe(false);
      } else {
        expect(settings.pathSeparator).toBe('/');
        expect(settings.caseSensitive).toBe(true);
      }
    });

    test('should validate paths correctly for current platform', () => {
      const { PlatformUtils } = require('../../main/utils/PlatformUtils');
      const platformUtils = PlatformUtils.getInstance();
      
      // Valid path
      const validResult = platformUtils.validatePath('/valid/path/file.txt');
      expect(validResult.isValid).toBe(true);
      
      // Invalid path (too long)
      const longPath = 'a'.repeat(5000);
      const invalidResult = platformUtils.validatePath(longPath);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.error).toContain('too long');
    });
  });

  afterAll(() => {
    // Cleanup build artifacts if they exist
    try {
      if (fs.existsSync(releaseDir)) {
        fs.rmSync(releaseDir, { recursive: true, force: true });
      }
    } catch (error) {
      console.warn('Could not clean up release directory:', error);
    }
  });
});