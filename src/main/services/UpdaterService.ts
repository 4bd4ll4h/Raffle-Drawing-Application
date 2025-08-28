import { autoUpdater } from "electron-updater";
import { BrowserWindow, dialog } from "electron";
import { EventEmitter } from "events";
import type { UpdateInfo, ProgressInfo } from "builder-util-runtime";

export class UpdaterService extends EventEmitter {
  private mainWindow: BrowserWindow | null = null;
  private updateAvailable = false;
  private updateDownloaded = false;

  constructor() {
    super();
    this.setupAutoUpdater();
  }

  public setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window;
  }

  private setupAutoUpdater(): void {
    // Configure auto-updater
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;

    // Set update server URL (customize based on your deployment)
    if (process.env.NODE_ENV === "development") {
      // For development, you might want to use a local update server
      autoUpdater.updateConfigPath = "dev-app-update.yml";
    }

    // Event handlers
    autoUpdater.on("checking-for-update", () => {
      this.emit("checking-for-update");
      this.sendToRenderer("updater-checking");
    });

    autoUpdater.on("update-available", (info: UpdateInfo) => {
      this.updateAvailable = true;
      this.emit("update-available", info);
      this.sendToRenderer("updater-update-available", info);
      this.showUpdateAvailableDialog(info);
    });

    autoUpdater.on("update-not-available", (info: UpdateInfo) => {
      this.emit("update-not-available", info);
      this.sendToRenderer("updater-update-not-available", info);
    });

    autoUpdater.on("error", (error: Error) => {
      this.emit("error", error);
      this.sendToRenderer("updater-error", error.message);
      this.showErrorDialog(error);
    });

    autoUpdater.on("download-progress", (progress: ProgressInfo) => {
      this.emit("download-progress", progress);
      this.sendToRenderer("updater-download-progress", progress);
    });

    autoUpdater.on("update-downloaded", (info: UpdateInfo) => {
      this.updateDownloaded = true;
      this.emit("update-downloaded", info);
      this.sendToRenderer("updater-update-downloaded", info);
      this.showUpdateDownloadedDialog(info);
    });
  }

  public async checkForUpdates(): Promise<void> {
    try {
      await autoUpdater.checkForUpdatesAndNotify();
    } catch (error) {
      console.error("Error checking for updates:", error);
      this.emit("error", error);
    }
  }

  public async downloadUpdate(): Promise<void> {
    if (!this.updateAvailable) {
      throw new Error("No update available to download");
    }

    try {
      await autoUpdater.downloadUpdate();
    } catch (error) {
      console.error("Error downloading update:", error);
      this.emit("error", error);
    }
  }

  public quitAndInstall(): void {
    if (!this.updateDownloaded) {
      throw new Error("No update downloaded to install");
    }

    autoUpdater.quitAndInstall();
  }

  private sendToRenderer(channel: string, data?: any): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data);
    }
  }

  private async showUpdateAvailableDialog(info: UpdateInfo): Promise<void> {
    if (!this.mainWindow) return;

    // Handle different types of release notes
    let releaseNotesText = "";
    if (typeof info.releaseNotes === "string") {
      releaseNotesText = info.releaseNotes;
    } else if (Array.isArray(info.releaseNotes)) {
      releaseNotesText = info.releaseNotes
        .map((note) => `${note.version}: ${note.note || ""}`)
        .join("\n");
    } else {
      releaseNotesText = "No release notes available.";
    }

    const result = await dialog.showMessageBox(this.mainWindow, {
      type: "info",
      title: "Update Available",
      message: `A new version (${info.version}) is available!`,
      detail: `Release Notes:\n${releaseNotesText}\n\nWould you like to download it now?`,
      buttons: ["Download Now", "Download Later", "Skip This Version"],
      defaultId: 0,
      cancelId: 1,
    });

    switch (result.response) {
      case 0: // Download Now
        await this.downloadUpdate();
        break;
      case 1: // Download Later
        // User will be prompted again next time
        break;
      case 2: // Skip This Version
        // TODO: Implement version skipping logic
        break;
    }
  }

  private async showUpdateDownloadedDialog(info: UpdateInfo): Promise<void> {
    if (!this.mainWindow) return;

    const result = await dialog.showMessageBox(this.mainWindow, {
      type: "info",
      title: "Update Ready",
      message: `Update to version ${info.version} has been downloaded.`,
      detail:
        "The update will be installed when you restart the application. Would you like to restart now?",
      buttons: ["Restart Now", "Restart Later"],
      defaultId: 0,
      cancelId: 1,
    });

    if (result.response === 0) {
      this.quitAndInstall();
    }
  }

  private async showErrorDialog(error: Error): Promise<void> {
    if (!this.mainWindow) return;

    await dialog.showMessageBox(this.mainWindow, {
      type: "error",
      title: "Update Error",
      message: "An error occurred while checking for updates.",
      detail: error.message,
      buttons: ["OK"],
    });
  }

  // Platform-specific update configurations
  public getUpdateConfiguration(): any {
    const platform = process.platform;

    switch (platform) {
      case "win32":
        return {
          provider: "github",
          owner: "your-github-username",
          repo: "raffle-drawing-app",
          private: false,
          releaseType: "release",
        };

      case "darwin":
        return {
          provider: "github",
          owner: "your-github-username",
          repo: "raffle-drawing-app",
          private: false,
          releaseType: "release",
        };

      case "linux":
        return {
          provider: "github",
          owner: "your-github-username",
          repo: "raffle-drawing-app",
          private: false,
          releaseType: "release",
        };

      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }
}

export const updaterService = new UpdaterService();
