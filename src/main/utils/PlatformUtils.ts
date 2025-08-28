import { app } from 'electron';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs/promises';

export interface PlatformPaths {
  userData: string;
  documents: string;
  downloads: string;
  temp: string;
  appData: string;
  recordings: string;
  raffles: string;
  logs: string;
}

export class PlatformUtils {
  private static _instance: PlatformUtils;
  private _paths: PlatformPaths;

  private constructor() {
    this._paths = this.initializePaths();
  }

  public static getInstance(): PlatformUtils {
    if (!PlatformUtils._instance) {
      PlatformUtils._instance = new PlatformUtils();
    }
    return PlatformUtils._instance;
  }

  private initializePaths(): PlatformPaths {
    const platform = process.platform;
    const userDataPath = app.getPath('userData');
    
    let appDataPath: string;
    
    switch (platform) {
      case 'win32':
        appDataPath = path.join(userDataPath, 'RaffleDrawingApp');
        break;
      
      case 'darwin':
        appDataPath = path.join(userDataPath, 'RaffleDrawingApp');
        break;
      
      case 'linux':
        appDataPath = path.join(os.homedir(), '.config', 'RaffleDrawingApp');
        break;
      
      default:
        appDataPath = path.join(userDataPath, 'RaffleDrawingApp');
    }

    return {
      userData: userDataPath,
      documents: app.getPath('documents'),
      downloads: app.getPath('downloads'),
      temp: app.getPath('temp'),
      appData: appDataPath,
      recordings: path.join(appDataPath, 'recordings'),
      raffles: path.join(appDataPath, 'raffles'),
      logs: app.getPath('logs')
    };
  }

  public get paths(): PlatformPaths {
    return { ...this._paths };
  }

  public async ensureDirectoriesExist(): Promise<void> {
    const directories = [
      this._paths.appData,
      this._paths.recordings,
      this._paths.raffles,
      this._paths.logs
    ];

    for (const dir of directories) {
      try {
        await fs.mkdir(dir, { recursive: true });
      } catch (error) {
        console.error(`Failed to create directory ${dir}:`, error);
        throw error;
      }
    }
  }

  public getDefaultExportPath(): string {
    return this._paths.documents;
  }

  public getDefaultRecordingPath(): string {
    return this._paths.recordings;
  }

  public getRafflePath(raffleId: string): string {
    return path.join(this._paths.raffles, raffleId);
  }

  public async ensureRaffleDirectoryExists(raffleId: string): Promise<string> {
    const rafflePath = this.getRafflePath(raffleId);
    await fs.mkdir(rafflePath, { recursive: true });
    return rafflePath;
  }

  public normalizePath(filePath: string): string {
    return path.normalize(filePath);
  }

  public joinPath(...segments: string[]): string {
    return path.join(...segments);
  }

  public getFileExtension(filePath: string): string {
    return path.extname(filePath).toLowerCase();
  }

  public getFileName(filePath: string, includeExtension = true): string {
    if (includeExtension) {
      return path.basename(filePath);
    }
    return path.basename(filePath, path.extname(filePath));
  }

  public isAbsolutePath(filePath: string): boolean {
    return path.isAbsolute(filePath);
  }

  public resolvePath(filePath: string, basePath?: string): string {
    if (this.isAbsolutePath(filePath)) {
      return filePath;
    }
    return path.resolve(basePath || this._paths.appData, filePath);
  }

  public getRelativePath(from: string, to: string): string {
    return path.relative(from, to);
  }

  // Platform-specific optimizations
  public getPlatformSpecificSettings(): any {
    const platform = process.platform;
    
    switch (platform) {
      case 'win32':
        return {
          pathSeparator: '\\',
          maxPathLength: 260,
          caseSensitive: false,
          supportedVideoFormats: ['.mp4', '.avi', '.mov', '.wmv'],
          supportedImageFormats: ['.jpg', '.jpeg', '.png', '.bmp', '.gif'],
          defaultVideoCodec: 'h264',
          hardwareAcceleration: true
        };
      
      case 'darwin':
        return {
          pathSeparator: '/',
          maxPathLength: 1024,
          caseSensitive: true,
          supportedVideoFormats: ['.mp4', '.mov', '.m4v'],
          supportedImageFormats: ['.jpg', '.jpeg', '.png', '.gif', '.heic'],
          defaultVideoCodec: 'h264',
          hardwareAcceleration: true
        };
      
      case 'linux':
        return {
          pathSeparator: '/',
          maxPathLength: 4096,
          caseSensitive: true,
          supportedVideoFormats: ['.mp4', '.avi', '.mkv', '.webm'],
          supportedImageFormats: ['.jpg', '.jpeg', '.png', '.gif', '.svg'],
          defaultVideoCodec: 'h264',
          hardwareAcceleration: false // May vary by system
        };
      
      default:
        return {
          pathSeparator: '/',
          maxPathLength: 1024,
          caseSensitive: true,
          supportedVideoFormats: ['.mp4'],
          supportedImageFormats: ['.jpg', '.jpeg', '.png'],
          defaultVideoCodec: 'h264',
          hardwareAcceleration: false
        };
    }
  }

  public validatePath(filePath: string): { isValid: boolean; error?: string } {
    const settings = this.getPlatformSpecificSettings();
    
    // Check path length
    if (filePath.length > settings.maxPathLength) {
      return {
        isValid: false,
        error: `Path too long. Maximum length is ${settings.maxPathLength} characters.`
      };
    }

    // Check for invalid characters (Windows specific)
    if (process.platform === 'win32') {
      const invalidChars = /[<>:"|?*]/;
      if (invalidChars.test(filePath)) {
        return {
          isValid: false,
          error: 'Path contains invalid characters: < > : " | ? *'
        };
      }
    }

    // Check for reserved names (Windows specific)
    if (process.platform === 'win32') {
      const reservedNames = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;
      const fileName = this.getFileName(filePath, false);
      if (reservedNames.test(fileName)) {
        return {
          isValid: false,
          error: `"${fileName}" is a reserved name and cannot be used.`
        };
      }
    }

    return { isValid: true };
  }

  public async getAvailableSpace(dirPath: string): Promise<number> {
    try {
      const stats = await fs.statfs(dirPath);
      return stats.bavail * stats.bsize;
    } catch (error) {
      console.warn('Could not get available space:', error);
      return -1; // Unknown
    }
  }

  public formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }
}

export const platformUtils = PlatformUtils.getInstance();