import { DatabaseService } from "./DatabaseService";
import { FileService } from "./FileService";
import { RandomService } from "./RandomService";
import { RecordingService } from "./RecordingService";
import { ExportService } from "./ExportService";
import { DatabaseError } from "../errors/DatabaseError";

export class ServiceManager {
  private static instance: ServiceManager;
  private databaseService: DatabaseService;
  private fileService: FileService;
  private randomService: RandomService;
  private recordingService: RecordingService;
  private exportService: ExportService;
  private initialized: boolean = false;

  private constructor() {
    this.databaseService = new DatabaseService();
    this.fileService = new FileService();
    this.randomService = new RandomService();
    this.recordingService = new RecordingService();
    this.exportService = new ExportService(this.databaseService, this.fileService);
  }

  public static getInstance(): ServiceManager {
    if (!ServiceManager.instance) {
      ServiceManager.instance = new ServiceManager();
    }
    return ServiceManager.instance;
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log("ServiceManager already initialized");
      return;
    }

    try {
      console.log("Initializing ServiceManager...");

      // Initialize file service first (creates directories)
      await this.fileService.initialize();
      console.log("FileService initialized successfully");

      // Initialize database service
      await this.databaseService.initialize();
      console.log("DatabaseService initialized successfully");

      // Run database migrations
      await this.databaseService.runMigrations();
      console.log("Database migrations completed");

      // Initialize export service
      await this.exportService.initialize();
      console.log("ExportService initialized successfully");

      this.initialized = true;
      console.log("ServiceManager initialization completed");
    } catch (error) {
      console.error("Failed to initialize ServiceManager:", error);
      throw new DatabaseError(
        "connection",
        "initialize",
        `ServiceManager initialization failed: ${(error as any).message}`,
        false
      );
    }
  }

  async shutdown(): Promise<void> {
    if (!this.initialized) {
      console.log("ServiceManager not initialized, nothing to shutdown");
      return;
    }

    try {
      console.log("Shutting down ServiceManager...");

      // Close database connection
      await this.databaseService.close();
      console.log("DatabaseService closed");

      this.initialized = false;
      console.log("ServiceManager shutdown completed");
    } catch (error) {
      console.error("Error during ServiceManager shutdown:", error);
      throw error;
    }
  }

  getDatabaseService(): DatabaseService {
    if (!this.initialized) {
      throw new Error(
        "ServiceManager not initialized. Call initialize() first."
      );
    }
    return this.databaseService;
  }

  getFileService(): FileService {
    if (!this.initialized) {
      throw new Error(
        "ServiceManager not initialized. Call initialize() first."
      );
    }
    return this.fileService;
  }

  getRandomService(): RandomService {
    if (!this.initialized) {
      throw new Error(
        "ServiceManager not initialized. Call initialize() first."
      );
    }
    return this.randomService;
  }

  getRecordingService(): RecordingService {
    if (!this.initialized) {
      throw new Error(
        "ServiceManager not initialized. Call initialize() first."
      );
    }
    return this.recordingService;
  }

  getExportService(): ExportService {
    if (!this.initialized) {
      throw new Error(
        "ServiceManager not initialized. Call initialize() first."
      );
    }
    return this.exportService;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  // Convenience methods that delegate to the appropriate service
  async createRaffle(raffle: Parameters<DatabaseService["createRaffle"]>[0]) {
    return this.databaseService.createRaffle(raffle);
  }

  async updateRaffle(
    id: string,
    updates: Parameters<DatabaseService["updateRaffle"]>[1]
  ) {
    return this.databaseService.updateRaffle(id, updates);
  }

  async deleteRaffle(id: string) {
    // Delete from database first
    await this.databaseService.deleteRaffle(id);

    // Then clean up files
    try {
      await this.fileService.deleteRaffleDirectory(id);
    } catch (error) {
      console.warn(`Failed to delete raffle directory for ${id}:`, error);
      // Don't throw here as the database deletion was successful
    }
  }

  async getRaffle(id: string) {
    return this.databaseService.getRaffle(id);
  }

  async getAllRaffles() {
    return this.databaseService.getAllRaffles();
  }

  async recordDrawing(
    drawing: Parameters<DatabaseService["recordDrawing"]>[0]
  ) {
    return this.databaseService.recordDrawing(drawing);
  }

  async getDrawingHistory(raffleId?: string) {
    return this.databaseService.getDrawingHistory(raffleId);
  }

  async saveCSVFile(
    raffleId: string,
    csvContent: Buffer,
  ) {
    return this.fileService.saveCSVFile(raffleId, csvContent);
  }

  async loadParticipants(csvFilePath: string, raffleId: string) {
    return this.fileService.loadParticipants(csvFilePath, raffleId);
  }

  async validateCSVFile(csvFilePath: string, raffleId: string) {
    return this.fileService.validateCSVFile(csvFilePath, raffleId);
  }

  async saveBackgroundImage(
    raffleId: string,
    imageBuffer: Buffer,
    originalFilename: string
  ) {
    return this.fileService.saveBackgroundImage(
      raffleId,
      imageBuffer,
      originalFilename
    );
  }

  generateRecordingFilePath(raffleId: string, raffleName: string) {
    return this.fileService.generateRecordingFilePath(raffleId, raffleName);
  }

  async exportRaffleResults(
    raffleId: string,
    results: any[],
    exportPath: string
  ) {
    return this.fileService.exportRaffleResults(raffleId, results, exportPath);
  }

  async setSetting(key: string, value: string, category?: string) {
    return this.databaseService.setSetting(key, value, category);
  }

  async getSetting(key: string) {
    return this.databaseService.getSetting(key);
  }

  async getSettingsByCategory(category: string) {
    return this.databaseService.getSettingsByCategory(category);
  }

  // Random service convenience methods
  async selectWinner(participants: Parameters<RandomService["selectWinner"]>[0]) {
    return this.randomService.selectWinner(participants);
  }

  async verifyRandomOrgSignature(verificationData: string) {
    return this.randomService.verifyRandomOrgSignature(verificationData);
  }

  async getAPIQuota() {
    return this.randomService.getAPIQuota();
  }

  async testRandomConnection() {
    return this.randomService.testConnection();
  }

  // Recording service convenience methods
  async startRecording(options: Parameters<RecordingService["startRecording"]>[0]) {
    return this.recordingService.startRecording(options);
  }

  async stopRecording() {
    return this.recordingService.stopRecording();
  }

  isRecording() {
    return this.recordingService.isRecording();
  }

  getRecordingStatus() {
    return this.recordingService.getStatus();
  }

  generateRaffleRecordingPath(raffleName: string, options: Parameters<RecordingService["generateRaffleRecordingPath"]>[1]) {
    return this.recordingService.generateRaffleRecordingPath(raffleName, options);
  }

  // Export service convenience methods
  async exportRaffleResultsToFile(
    raffleId: string,
    outputPath?: string,
    options?: Parameters<ExportService["exportRaffleResults"]>[2]
  ) {
    return this.exportService.exportRaffleResults(raffleId, outputPath, options);
  }

  async exportMultipleRaffles(
    raffleIds: string[],
    options: Parameters<ExportService["exportMultipleRaffles"]>[1]
  ) {
    return this.exportService.exportMultipleRaffles(raffleIds, options);
  }

  async getExportHistory() {
    return this.exportService.getExportHistory();
  }

  async clearExportHistory() {
    return this.exportService.clearExportHistory();
  }

  async reExport(historyEntryId: string) {
    return this.exportService.reExport(historyEntryId);
  }

  // Health check method
  async healthCheck(): Promise<{
    database: boolean;
    fileSystem: boolean;
    overall: boolean;
  }> {
    const health = {
      database: false,
      fileSystem: false,
      overall: false,
    };

    try {
      // Test database connection
      await this.databaseService.getSetting("health_check");
      health.database = true;
    } catch (error) {
      console.error("Database health check failed:", error);
    }

    try {
      // Test file system access
      const recordingsPath = this.fileService.getRecordingsPath();
      await this.fileService.fileExists(recordingsPath);
      health.fileSystem = true;
    } catch (error) {
      console.error("File system health check failed:", error);
    }

    health.overall = health.database && health.fileSystem;
    return health;
  }
}
