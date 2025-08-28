import {
  app,
  BrowserWindow,
  ipcMain,
  Menu,
  shell,
  dialog,
  Tray,
  nativeImage,
  Notification,
} from "electron";
import * as path from "path";
import { ServiceManager } from "./services/ServiceManager";
import { RecordingOptions } from "../types/recording";
import { updaterService } from "./services/UpdaterService";
import { platformUtils } from "./utils/PlatformUtils";

class RaffleDrawingApp {
  private mainWindow: BrowserWindow | null = null;
  private serviceManager: ServiceManager;
  private tray: Tray | null = null;
  private isQuitting = false;

  constructor() {
    this.serviceManager = ServiceManager.getInstance();
    this.initializeApp();
  }

  private initializeApp(): void {
    // Handle app ready event
    app.whenReady().then(async () => {
      try {
        // Initialize platform utilities and ensure directories exist
        await platformUtils.ensureDirectoriesExist();
        console.log("Platform utilities initialized successfully");

        await this.serviceManager.initialize();
        console.log("ServiceManager initialized successfully");
      } catch (error) {
        console.error("Failed to initialize services:", error);
      }

      this.createMainWindow();
      this.createApplicationMenu();
      this.createSystemTray();

      // Initialize updater service after window is created
      if (this.mainWindow) {
        updaterService.setMainWindow(this.mainWindow);

        // Check for updates on startup (only in production)
        if (process.env.NODE_ENV !== "development") {
          setTimeout(() => {
            updaterService.checkForUpdates().catch(console.error);
          }, 5000); // Wait 5 seconds after startup
        }
      }

      // Set up recording event forwarding after ServiceManager is initialized
      this.setupRecordingEventForwarding();

      app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          this.createMainWindow();
        }
      });
    });

    // Handle app window closed events
    app.on("window-all-closed", async () => {
      if (this.isQuitting) {
        try {
          await this.serviceManager.shutdown();
          console.log("ServiceManager shutdown successfully");
        } catch (error) {
          console.error("Error during ServiceManager shutdown:", error);
        }

        if (process.platform !== "darwin") {
          app.quit();
        }
      }
    });

    // Handle before quit event
    app.on("before-quit", async (event) => {
      if (!this.isQuitting) {
        event.preventDefault();
        await this.performCleanup();
        this.isQuitting = true;
        app.quit();
      }
    });

    // Handle app will quit event
    app.on("will-quit", async (event) => {
      if (!this.isQuitting) {
        event.preventDefault();
        await this.performCleanup();
        this.isQuitting = true;
        app.quit();
      }
    });

    // Handle second instance (single instance lock)
    const gotTheLock = app.requestSingleInstanceLock();
    if (!gotTheLock) {
      app.quit();
    } else {
      app.on("second-instance", () => {
        // Someone tried to run a second instance, focus our window instead
        if (this.mainWindow) {
          if (this.mainWindow.isMinimized()) this.mainWindow.restore();
          this.mainWindow.focus();
        }
      });
    }

    // Setup IPC handlers
    this.setupIpcHandlers();
  }

  private createMainWindow(): void {
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, "preload.js"),
      },
      show: false,
      titleBarStyle: "default",
    });

    // Add error handling for loading
    this.mainWindow.webContents.on(
      "did-fail-load",
      (event, errorCode, errorDescription, validatedURL) => {
        console.error(
          "Failed to load:",
          errorCode,
          errorDescription,
          validatedURL
        );
      }
    );

    this.mainWindow.webContents.on("crashed", (event, killed) => {
      console.error("Renderer process crashed:", killed);
    });

    // Load the renderer
    if (process.env.NODE_ENV === "development") {
      console.log("Loading development URL: http://localhost:3001");
      this.mainWindow.loadURL("http://localhost:3001");
      this.mainWindow.webContents.openDevTools();
    } else {
      const rendererPath = path.join(__dirname, "../renderer/index.html");
      console.log("Loading production file:", rendererPath);
      this.mainWindow.loadFile(rendererPath);
    }

    // Show window when ready
    this.mainWindow.once("ready-to-show", () => {
      console.log("Window ready to show");
      this.mainWindow?.show();
    });

    // Set up drag and drop support
    this.setupDragAndDrop();

    // Handle window closed
    this.mainWindow.on("closed", () => {
      this.mainWindow = null;
    });

    // Handle window close event (minimize to tray instead of closing)
    this.mainWindow.on("close", (event) => {
      if (!this.isQuitting && this.tray) {
        event.preventDefault();
        this.mainWindow?.hide();

        // Show notification on first minimize
        if (process.platform === "win32") {
          this.tray.displayBalloon({
            iconType: "info",
            title: "Raffle Drawing App",
            content: "Application was minimized to tray",
          });
        }
      }
    });
  }

  private createApplicationMenu(): void {
    const template: Electron.MenuItemConstructorOptions[] = [
      {
        label: "File",
        submenu: [
          {
            label: "New Raffle",
            accelerator: "CmdOrCtrl+N",
            click: () => {
              this.mainWindow?.webContents.send("menu:new-raffle");
            },
          },
          {
            label: "Import CSV",
            accelerator: "CmdOrCtrl+I",
            click: async () => {
              const result = await dialog.showOpenDialog(this.mainWindow!, {
                properties: ["openFile"],
                filters: [
                  { name: "CSV Files", extensions: ["csv"] },
                  { name: "All Files", extensions: ["*"] },
                ],
              });

              if (!result.canceled && result.filePaths.length > 0) {
                this.mainWindow?.webContents.send(
                  "menu:import-csv",
                  result.filePaths[0]
                );
              }
            },
          },
          { type: "separator" },
          {
            label: "Export Results",
            accelerator: "CmdOrCtrl+E",
            click: () => {
              this.mainWindow?.webContents.send("menu:export-results");
            },
          },
          { type: "separator" },
          {
            label: "Quit",
            accelerator: process.platform === "darwin" ? "Cmd+Q" : "Ctrl+Q",
            click: () => {
              this.isQuitting = true;
              app.quit();
            },
          },
        ],
      },
      {
        label: "Edit",
        submenu: [
          { role: "undo" },
          { role: "redo" },
          { type: "separator" },
          { role: "cut" },
          { role: "copy" },
          { role: "paste" },
          { role: "selectAll" },
        ],
      },
      {
        label: "View",
        submenu: [
          { role: "reload" },
          { role: "forceReload" },
          { role: "toggleDevTools" },
          { type: "separator" },
          { role: "resetZoom" },
          { role: "zoomIn" },
          { role: "zoomOut" },
          { type: "separator" },
          { role: "togglefullscreen" },
        ],
      },
      {
        label: "Window",
        submenu: [
          { role: "minimize" },
          { role: "close" },
          {
            label: "Hide to Tray",
            accelerator: "CmdOrCtrl+H",
            click: () => {
              this.mainWindow?.hide();
            },
          },
        ],
      },
      {
        label: "Help",
        submenu: [
          {
            label: "About",
            click: () => {
              dialog.showMessageBox(this.mainWindow!, {
                type: "info",
                title: "About Raffle Drawing App",
                message: "Raffle Drawing Application",
                detail: `Version: ${app.getVersion()}\nA comprehensive desktop application for managing and conducting raffle drawings with CS2-style animations.`,
              });
            },
          },
          {
            label: "Check for Updates",
            click: async () => {
              try {
                await updaterService.checkForUpdates();
              } catch (error) {
                dialog.showErrorBox(
                  "Update Check Failed",
                  error instanceof Error
                    ? error.message
                    : "Unknown error occurred"
                );
              }
            },
          },
          { type: "separator" },
          {
            label: "Open Data Directory",
            click: async () => {
              const dataPath = platformUtils.paths.appData;
              await shell.openPath(dataPath);
            },
          },
          {
            label: "Open Logs Directory",
            click: async () => {
              const logsPath = platformUtils.paths.logs;
              await shell.openPath(logsPath);
            },
          },
        ],
      },
    ];

    // macOS specific menu adjustments
    if (process.platform === "darwin") {
      template.unshift({
        label: app.getName(),
        submenu: [
          { role: "about" },
          { type: "separator" },
          { role: "services" },
          { type: "separator" },
          { role: "hide" },
          { role: "hideOthers" },
          { role: "unhide" },
          { type: "separator" },
          { role: "quit" },
        ],
      });

      // Window menu
      (template[4].submenu as Electron.MenuItemConstructorOptions[]).push(
        { type: "separator" },
        { role: "front" },
        { type: "separator" },
        { role: "window" }
      );
    }

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  private createSystemTray(): void {
    // Create tray icon
    const iconPath =
      process.platform === "win32"
        ? path.join(__dirname, "../../build/tray-icon.ico")
        : path.join(__dirname, "../../build/tray-icon.png");

    // Fallback to a simple icon if file doesn't exist
    let trayIcon: Electron.NativeImage;
    try {
      trayIcon = nativeImage.createFromPath(iconPath);
      if (trayIcon.isEmpty()) {
        // Create a simple fallback icon
        trayIcon = nativeImage.createFromDataURL(
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
        );
      }
    } catch (error) {
      console.warn("Failed to load tray icon, using fallback:", error);
      trayIcon = nativeImage.createFromDataURL(
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
      );
    }

    this.tray = new Tray(trayIcon);

    const contextMenu = Menu.buildFromTemplate([
      {
        label: "Show App",
        click: () => {
          this.showMainWindow();
        },
      },
      {
        label: "New Raffle",
        click: () => {
          this.showMainWindow();
          this.mainWindow?.webContents.send("menu:new-raffle");
        },
      },
      { type: "separator" },
      {
        label: "Quit",
        click: () => {
          this.isQuitting = true;
          app.quit();
        },
      },
    ]);

    this.tray.setToolTip("Raffle Drawing Application");
    this.tray.setContextMenu(contextMenu);

    // Handle tray click
    this.tray.on("click", () => {
      this.showMainWindow();
    });

    this.tray.on("double-click", () => {
      this.showMainWindow();
    });
  }

  private showMainWindow(): void {
    if (this.mainWindow) {
      if (this.mainWindow.isMinimized()) {
        this.mainWindow.restore();
      }
      this.mainWindow.show();
      this.mainWindow.focus();
    } else {
      this.createMainWindow();
    }
  }

  private setupDragAndDrop(): void {
    if (!this.mainWindow) return;

    // Handle file drops
    this.mainWindow.webContents.on("will-navigate", (event, navigationUrl) => {
      const parsedUrl = new URL(navigationUrl);

      // Allow navigation only to the same origin or file protocol
      if (
        parsedUrl.protocol === "file:" ||
        (parsedUrl.origin === "http://localhost:3001" &&
          process.env.NODE_ENV === "development")
      ) {
        return;
      }

      event.preventDefault();
    });

    // Set up drag and drop handlers
    ipcMain.handle("drag-drop:validate-files", (_, filePaths: string[]) => {
      try {
        const validFiles: {
          path: string;
          type: "csv" | "image";
          name: string;
        }[] = [];
        const invalidFiles: string[] = [];

        for (const filePath of filePaths) {
          const ext = path.extname(filePath).toLowerCase();
          const fileName = path.basename(filePath);

          if (ext === ".csv") {
            validFiles.push({ path: filePath, type: "csv", name: fileName });
          } else if (
            [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"].includes(ext)
          ) {
            validFiles.push({ path: filePath, type: "image", name: fileName });
          } else {
            invalidFiles.push(filePath);
          }
        }

        return {
          success: true,
          data: {
            validFiles,
            invalidFiles,
            hasValidFiles: validFiles.length > 0,
            hasInvalidFiles: invalidFiles.length > 0,
          },
        };
      } catch (error) {
        console.error("Failed to validate dropped files:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    });

    ipcMain.handle("drag-drop:read-file", async (_, filePath: string) => {
      try {
        const fs = await import("fs/promises");
        const data = await fs.readFile(filePath);
        const ext = path.extname(filePath).toLowerCase();

        if (ext === ".csv") {
          return {
            success: true,
            data: {
              content: data.toString("utf-8"),
              type: "csv",
              fileName: path.basename(filePath),
            },
          };
        } else {
          return {
            success: true,
            data: {
              content: data,
              type: "image",
              fileName: path.basename(filePath),
              mimeType: this.getMimeType(ext),
            },
          };
        }
      } catch (error) {
        console.error("Failed to read dropped file:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    });
  }

  private getMimeType(extension: string): string {
    const mimeTypes: { [key: string]: string } = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".bmp": "image/bmp",
      ".webp": "image/webp",
    };
    return mimeTypes[extension] || "application/octet-stream";
  }

  private setupRecordingEventForwarding(): void {
    try {
      // Set up recording event forwarding
      const recordingService = this.serviceManager.getRecordingService();

      recordingService.on("started", (status) => {
        this.mainWindow?.webContents.send("recording:status-update", status);
      });

      recordingService.on("progress", (progress) => {
        this.mainWindow?.webContents.send("recording:progress-update", progress);
      });

      recordingService.on("finished", (filePath) => {
        this.mainWindow?.webContents.send("recording:finished", filePath);
      });

      recordingService.on("error", (error) => {
        this.mainWindow?.webContents.send("recording:error", error.message);
      });
    } catch (error) {
      console.error("Failed to setup recording event forwarding:", error);
    }
  }

  private async performCleanup(): Promise<void> {
    console.log("Performing application cleanup...");

    try {
      // Stop any ongoing recordings
      if (this.serviceManager.isRecording()) {
        console.log("Stopping ongoing recording...");
        await this.serviceManager.stopRecording();
      }

      // Cancel any bulk operations
      const bulkWorker = await import("./workers/BulkOperationWorker");
      if (bulkWorker) {
        console.log("Cancelling bulk operations...");
        // Cancel all active tasks
      }

      // Shutdown service manager
      await this.serviceManager.shutdown();
      console.log("ServiceManager shutdown completed");

      // Destroy tray
      if (this.tray) {
        this.tray.destroy();
        this.tray = null;
        console.log("System tray destroyed");
      }

      // Close main window if still open
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.destroy();
        this.mainWindow = null;
        console.log("Main window destroyed");
      }
    } catch (error) {
      console.error("Error during cleanup:", error);
    }
  }

  private setupIpcHandlers(): void {
    // App info handlers
    ipcMain.handle("app:get-version", () => {
      return app.getVersion();
    });

    ipcMain.handle("app:get-platform", () => {
      return process.platform;
    });

    ipcMain.handle("app:get-platform-paths", () => {
      return platformUtils.paths;
    });

    ipcMain.handle("app:get-platform-settings", () => {
      return platformUtils.getPlatformSpecificSettings();
    });

    // Database handlers
    ipcMain.handle("db:create-raffle", async (_, raffle) => {
      try {
        const result = await this.serviceManager.createRaffle(raffle);
        return { success: true, data: result };
      } catch (error) {
        console.error("Failed to create raffle:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    });

    ipcMain.handle("db:update-raffle", async (_, id: string, updates) => {
      try {
        const result = await this.serviceManager.updateRaffle(id, updates);
        return { success: true, data: result };
      } catch (error) {
        console.error("Failed to update raffle:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    });

    ipcMain.handle("db:delete-raffle", async (_, id: string) => {
      try {
        await this.serviceManager.deleteRaffle(id);
        return { success: true };
      } catch (error) {
        console.error("Failed to delete raffle:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    });

    ipcMain.handle("db:get-raffle", async (_, id: string) => {
      try {
        const result = await this.serviceManager.getRaffle(id);
        return { success: true, data: result };
      } catch (error) {
        console.error("Failed to get raffle:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    });

    ipcMain.handle("db:get-all-raffles", async () => {
      try {
        const result = await this.serviceManager.getAllRaffles();
        return { success: true, data: result };
      } catch (error) {
        console.error("Failed to get all raffles:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    });

    ipcMain.handle("db:record-drawing", async (_, drawing) => {
      try {
        const result = await this.serviceManager.recordDrawing(drawing);
        return { success: true, data: result };
      } catch (error) {
        console.error("Failed to record drawing:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    });

    ipcMain.handle("db:get-drawing-history", async () => {
      try {
        const result = await this.serviceManager.getDrawingHistory();
        return { success: true, data: result };
      } catch (error) {
        console.error("Failed to get drawing history:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    });

    // File operations handlers
    ipcMain.handle(
      "file:save-csv",
      async (_, raffleId: string, csvData: string) => {
        try {
          const csvBuffer = Buffer.from(csvData, "utf-8");
          const result = await this.serviceManager.saveCSVFile(
            raffleId,
            csvBuffer
          );
          return { success: true, data: result };
        } catch (error) {
          console.error("Failed to save CSV file:", error);
          return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      }
    );

    ipcMain.handle(
      "file:load-participants",
      async (_, csvFilePath: string, raffleId: string) => {
        try {
          const result = await this.serviceManager.loadParticipants(
            csvFilePath,
            raffleId
          );
          return { success: true, data: result };
        } catch (error) {
          console.error("Failed to load participants:", error);
          return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      }
    );

    ipcMain.handle(
      "file:validate-csv",
      async (_, csvData: string, raffleId: string) => {
        try {
          // Create a temporary file to validate the CSV data
          const fs = await import("fs/promises");
          const os = await import("os");
          const tempFilePath = path.join(
            os.tmpdir(),
            `temp-csv-${Date.now()}.csv`
          );

          // Write CSV data to temporary file
          await fs.writeFile(tempFilePath, csvData, "utf-8");

          // Validate using the existing method
          const result = await this.serviceManager.validateCSVFile(
            tempFilePath,
            raffleId
          );

          // Clean up temporary file
          try {
            await fs.unlink(tempFilePath);
          } catch (cleanupError) {
            console.warn("Failed to clean up temporary file:", cleanupError);
          }

          return { success: true, data: result };
        } catch (error) {
          console.error("Failed to validate CSV:", error);
          return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      }
    );

    ipcMain.handle(
      "file:save-background-image",
      async (_, raffleId: string, imageBuffer: Buffer, fileName: string) => {
        try {
          const result = await this.serviceManager.saveBackgroundImage(
            raffleId,
            imageBuffer,
            fileName
          );
          return { success: true, data: result };
        } catch (error) {
          console.error("Failed to save background image:", error);
          return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      }
    );

    // Random service handlers
    ipcMain.handle("random:select-winner", async (_, participants) => {
      try {
        const result = await this.serviceManager.selectWinner(participants);
        return { success: true, data: result };
      } catch (error) {
        console.error("Failed to select winner:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    });

    ipcMain.handle("random:assign-rarities", async (_, participants) => {
      try {
        const randomService = this.serviceManager.getRandomService();
        const result = randomService.assignRaritiesToParticipants(participants);
        return { success: true, data: result };
      } catch (error) {
        console.error("Failed to assign rarities:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    });

    // Notification handlers
    ipcMain.handle(
      "notification:show",
      (_, options: { title: string; body: string; icon?: string }) => {
        try {
          if (Notification.isSupported()) {
            const notification = new Notification({
              title: options.title,
              body: options.body,
              icon: options.icon,
            });

            notification.show();

            notification.on("click", () => {
              this.showMainWindow();
            });

            return { success: true };
          } else {
            return { success: false, error: "Notifications not supported" };
          }
        } catch (error) {
          console.error("Failed to show notification:", error);
          return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      }
    );

    // Window management handlers
    ipcMain.handle("window:minimize", () => {
      try {
        this.mainWindow?.minimize();
        return { success: true };
      } catch (error) {
        console.error("Failed to minimize window:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    });

    ipcMain.handle("window:maximize", () => {
      try {
        if (this.mainWindow?.isMaximized()) {
          this.mainWindow.unmaximize();
        } else {
          this.mainWindow?.maximize();
        }
        return { success: true };
      } catch (error) {
        console.error("Failed to toggle maximize window:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    });

    ipcMain.handle("window:close", () => {
      try {
        this.mainWindow?.close();
        return { success: true };
      } catch (error) {
        console.error("Failed to close window:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    });

    ipcMain.handle("window:hide-to-tray", () => {
      try {
        this.mainWindow?.hide();
        return { success: true };
      } catch (error) {
        console.error("Failed to hide window to tray:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    });

    // Dialog handlers
    ipcMain.handle("dialog:show-open", async (_, options) => {
      try {
        const result = await dialog.showOpenDialog(this.mainWindow!, options);
        return { success: true, data: result };
      } catch (error) {
        console.error("Failed to show open dialog:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    });

    ipcMain.handle("dialog:show-save", async (_, options) => {
      try {
        const result = await dialog.showSaveDialog(this.mainWindow!, options);
        return { success: true, data: result };
      } catch (error) {
        console.error("Failed to show save dialog:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    });

    ipcMain.handle("dialog:show-message", async (_, options) => {
      try {
        const result = await dialog.showMessageBox(this.mainWindow!, options);
        return { success: true, data: result };
      } catch (error) {
        console.error("Failed to show message dialog:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    });

    ipcMain.handle(
      "dialog:show-error",
      async (_, title: string, content: string) => {
        try {
          dialog.showErrorBox(title, content);
          return { success: true };
        } catch (error) {
          console.error("Failed to show error dialog:", error);
          return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      }
    );

    // Lifecycle management handlers
    ipcMain.handle("app:get-status", () => {
      try {
        return {
          success: true,
          data: {
            isQuitting: this.isQuitting,
            hasMainWindow: !!this.mainWindow,
            hasTray: !!this.tray,
            isRecording: this.serviceManager.isRecording(),
            uptime: process.uptime(),
          },
        };
      } catch (error) {
        console.error("Failed to get app status:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    });

    ipcMain.handle("app:restart", async () => {
      try {
        await this.performCleanup();
        app.relaunch();
        app.exit(0);
        return { success: true };
      } catch (error) {
        console.error("Failed to restart app:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    });

    ipcMain.handle("app:quit", async () => {
      try {
        this.isQuitting = true;
        await this.performCleanup();
        app.quit();
        return { success: true };
      } catch (error) {
        console.error("Failed to quit app:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    });

    // Updater handlers
    ipcMain.handle("updater:check-for-updates", async () => {
      try {
        await updaterService.checkForUpdates();
        return { success: true };
      } catch (error) {
        console.error("Failed to check for updates:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    });

    ipcMain.handle("updater:download-update", async () => {
      try {
        await updaterService.downloadUpdate();
        return { success: true };
      } catch (error) {
        console.error("Failed to download update:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    });

    ipcMain.handle("updater:quit-and-install", () => {
      try {
        updaterService.quitAndInstall();
        return { success: true };
      } catch (error) {
        console.error("Failed to quit and install:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    });

    // Path utilities handlers
    ipcMain.handle("path:validate", (event, filePath: string) => {
      return platformUtils.validatePath(filePath);
    });

    ipcMain.handle("path:normalize", (event, filePath: string) => {
      return platformUtils.normalizePath(filePath);
    });

    ipcMain.handle("path:join", (event, ...segments: string[]) => {
      return platformUtils.joinPath(...segments);
    });

    ipcMain.handle(
      "path:get-available-space",
      async (event, dirPath: string) => {
        try {
          const space = await platformUtils.getAvailableSpace(dirPath);
          return { success: true, space };
        } catch (error) {
          console.error("Failed to get available space:", error);
          return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      }
    );

    // Recording handlers
    ipcMain.handle(
      "recording:start",
      async (event, options: RecordingOptions) => {
        try {
          await this.serviceManager.startRecording(options);
          return { success: true };
        } catch (error) {
          console.error("Failed to start recording:", error);
          return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      }
    );

    ipcMain.handle("recording:stop", async () => {
      try {
        const filePath = await this.serviceManager.stopRecording();
        return { success: true, filePath };
      } catch (error) {
        console.error("Failed to stop recording:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    });

    ipcMain.handle("recording:status", () => {
      try {
        const status = this.serviceManager.getRecordingStatus();
        return { success: true, status };
      } catch (error) {
        console.error("Failed to get recording status:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    });

    ipcMain.handle("recording:is-recording", () => {
      try {
        const isRecording = this.serviceManager.isRecording();
        return { success: true, isRecording };
      } catch (error) {
        console.error("Failed to check recording status:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    });



    // Export handlers
    ipcMain.handle(
      "export:raffle-results",
      async (event, raffleId: string, outputPath?: string, options?: any) => {
        try {
          const result = await this.serviceManager.exportRaffleResultsToFile(
            raffleId,
            outputPath,
            options
          );
          return result;
        } catch (error) {
          console.error("Failed to export raffle results:", error);
          return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
            filesCreated: [],
          };
        }
      }
    );

    ipcMain.handle(
      "export:multiple-raffles",
      async (event, raffleIds: string[], options: any) => {
        try {
          const result = await this.serviceManager.exportMultipleRaffles(
            raffleIds,
            options
          );
          return result;
        } catch (error) {
          console.error("Failed to export multiple raffles:", error);
          return {
            successful: [],
            failed: raffleIds.map((id) => ({
              id,
              error: error instanceof Error ? error.message : "Unknown error",
            })),
            totalProcessed: raffleIds.length,
          };
        }
      }
    );

    ipcMain.handle("export:get-history", async () => {
      try {
        return await this.serviceManager.getExportHistory();
      } catch (error) {
        console.error("Failed to get export history:", error);
        return [];
      }
    });

    ipcMain.handle("export:clear-history", async () => {
      try {
        await this.serviceManager.clearExportHistory();
      } catch (error) {
        console.error("Failed to clear export history:", error);
        throw error;
      }
    });

    ipcMain.handle(
      "export:re-export",
      async (event, historyEntryId: string) => {
        try {
          return await this.serviceManager.reExport(historyEntryId);
        } catch (error) {
          console.error("Failed to re-export:", error);
          throw error;
        }
      }
    );

    // Streaming CSV handlers
    ipcMain.handle(
      "streaming-csv:validate",
      async (event, filePath: string, raffleId: string, options?: any) => {
        try {
          const { StreamingCSVService } = await import(
            "./services/StreamingCSVService"
          );
          const streamingService = new StreamingCSVService();
          const result = await streamingService.streamValidateCSV(
            filePath,
            raffleId,
            options
          );
          return { success: true, result };
        } catch (error) {
          console.error("Failed to validate CSV with streaming:", error);
          return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      }
    );

    ipcMain.handle(
      "streaming-csv:count",
      async (event, filePath: string, options?: any) => {
        try {
          const { StreamingCSVService } = await import(
            "./services/StreamingCSVService"
          );
          const streamingService = new StreamingCSVService();
          const result = await streamingService.getParticipantCountStreaming(
            filePath,
            options
          );
          return { success: true, result };
        } catch (error) {
          console.error("Failed to count participants with streaming:", error);
          return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      }
    );

    // Bulk operations handlers
    let bulkWorker: any = null;

    const getBulkWorker = async () => {
      if (!bulkWorker) {
        const { BulkOperationWorker } = await import(
          "./workers/BulkOperationWorker"
        );
        bulkWorker = new BulkOperationWorker();

        // Set up event forwarding
        bulkWorker.on("progress", (progress: any) => {
          this.mainWindow?.webContents.send("bulk:progress", progress);
        });

        bulkWorker.on("result", (result: any) => {
          this.mainWindow?.webContents.send("bulk:result", result);
        });

        bulkWorker.on("error", (error: any) => {
          this.mainWindow?.webContents.send("bulk:error", error);
        });
      }
      return bulkWorker;
    };

    ipcMain.handle("bulk:submit-task", async (event, task: any) => {
      try {
        const worker = await getBulkWorker();
        const taskId = await worker.submitTask(task);
        return { success: true, taskId };
      } catch (error) {
        console.error("Failed to submit bulk task:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    });

    ipcMain.handle("bulk:cancel-task", async (event, taskId: string) => {
      try {
        const worker = await getBulkWorker();
        const cancelled = await worker.cancelTask(taskId);
        return { success: true, cancelled };
      } catch (error) {
        console.error("Failed to cancel bulk task:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    });

    ipcMain.handle("bulk:get-task-status", async (event, taskId: string) => {
      try {
        const worker = await getBulkWorker();
        const status = worker.getTaskStatus(taskId);
        return { success: true, status };
      } catch (error) {
        console.error("Failed to get bulk task status:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    });
  }
}

// Initialize the application
new RaffleDrawingApp();
