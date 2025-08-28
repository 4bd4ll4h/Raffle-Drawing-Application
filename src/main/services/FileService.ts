import fs from "fs/promises";
import path from "path";
import { app } from "electron";
import { CSVService } from './CSVService';
import {
  Participant,
  CSVValidationResult,
  ExportOptions,
} from "../../types";

export class FileService {
  private appDataPath: string;
  private rafflesPath: string;
  private recordingsPath: string;
  private csvService: CSVService;

  constructor() {
    this.appDataPath = app.getPath("userData");
    this.rafflesPath = path.join(this.appDataPath, "raffles");
    this.recordingsPath = path.join(this.appDataPath, "recordings");
    this.csvService = new CSVService();
  }

  async initialize(): Promise<void> {
    try {
      // Create necessary directories
      await fs.mkdir(this.appDataPath, { recursive: true });
      await fs.mkdir(this.rafflesPath, { recursive: true });
      await fs.mkdir(this.recordingsPath, { recursive: true });

      console.log("File service initialized successfully");
      console.log("App data path:", this.appDataPath);
      console.log("Raffles path:", this.rafflesPath);
      console.log("Recordings path:", this.recordingsPath);
    } catch (error) {
      console.error("Failed to initialize file service:", error);
      throw error;
    }
  }

  // Directory management
  async createRaffleDirectory(raffleId: string): Promise<string> {
    const rafflePath = path.join(this.rafflesPath, `raffle-${raffleId}`);

    try {
      await fs.mkdir(rafflePath, { recursive: true });
      return rafflePath;
    } catch (error) {
      console.error(
        `Failed to create raffle directory for ${raffleId}:`,
        error
      );
      throw error;
    }
  }

  async deleteRaffleDirectory(raffleId: string): Promise<void> {
    const rafflePath = path.join(this.rafflesPath, `raffle-${raffleId}`);

    try {
      await fs.rm(rafflePath, { recursive: true, force: true });
    } catch (error) {
      console.error(
        `Failed to delete raffle directory for ${raffleId}:`,
        error
      );
      throw error;
    }
  }

  getRafflePath(raffleId: string): string {
    return path.join(this.rafflesPath, `raffle-${raffleId}`);
  }

  getRecordingsPath(): string {
    return this.recordingsPath;
  }

  // ============================================================================
  // CSV FILE OPERATIONS
  // ============================================================================

  /**
   * Validate CSV file for a raffle
   */
  async validateCSVFile(csvFilePath: string, raffleId: string): Promise<CSVValidationResult> {
    return this.csvService.validateAndParseCSV(csvFilePath, raffleId);
  }

  /**
   * Save CSV file from buffer to raffle directory
   */
  async saveCSVFile(
raffleId: string, csvContent: Buffer  ): Promise<string> {
    try {
      const rafflePath = await this.createRaffleDirectory(raffleId);
      const tempFilePath = path.join(rafflePath, "temp_participants.csv");
      
      // Write buffer to temp file first
      await fs.writeFile(tempFilePath, csvContent);

      // Use CSV service to validate and save properly
      const savedPath = await this.csvService.saveCSVFile(raffleId, tempFilePath);

      // Clean up temp file
      try {
        await fs.unlink(tempFilePath);
      } catch (error) {
        console.warn("Failed to cleanup temp file:", error);
      }

      console.log(`CSV file saved for raffle ${raffleId}: ${savedPath}`);
      return savedPath;
    } catch (error) {
      console.error(`Failed to save CSV file for raffle ${raffleId}:`, error);
      throw error;
    }
  }

  /**
   * Save CSV file from file path to raffle directory
   */
  async saveCSVFileFromPath(raffleId: string, sourceFilePath: string): Promise<string> {
    return this.csvService.saveCSVFile(raffleId, sourceFilePath);
  }

  /**
   * Load participants from saved CSV file
   */
  async loadParticipants(csvFilePath: string, raffleId: string): Promise<Participant[]> {
    return this.csvService.loadParticipants(csvFilePath, raffleId);
  }

  /**
   * Export participants to CSV file
   */
  async exportParticipants(
    participants: Participant[], 
    outputPath: string,
    options: ExportOptions = {
      format: "csv",
      includeMetadata: false
    }
  ): Promise<void> {
    const csvOptions = {
      includeMetadata: options.includeMetadata ?? true,
      customFields: options.customFields ?? []
    };
    
    return this.csvService.exportParticipants(participants, outputPath, csvOptions);
  }

  /**
   * Get participant count from CSV file
   */
  async getParticipantCount(csvFilePath: string): Promise<number> {
    return this.csvService.getParticipantCount(csvFilePath);
  }

  /**
   * Delete CSV file
   */
  async deleteCSVFile(csvFilePath: string): Promise<void> {
    return this.csvService.deleteCSVFile(csvFilePath);
  }

  /**
   * Create sample CSV file for testing
   */
  async createSampleCSV(outputPath: string, participantCount: number = 10): Promise<void> {
    return this.csvService.createSampleCSV(outputPath, participantCount);
  }

  /**
   * Get CSV file path for a raffle
   */
  getCSVFilePath(raffleId: string): string {
    return path.join(this.getRafflePath(raffleId), 'participants.csv');
  }

  /**
   * Check if raffle has CSV file
   */
  async raffleHasCSV(raffleId: string): Promise<boolean> {
    const csvPath = this.getCSVFilePath(raffleId);
    return this.fileExists(csvPath);
  }

  // Background image operations
  async saveBackgroundImage(
    raffleId: string,
    imageBuffer: Buffer,
    originalFilename: string
  ): Promise<string> {
    try {
      const rafflePath = await this.createRaffleDirectory(raffleId);
      const extension = path.extname(originalFilename).toLowerCase();
      const imagePath = path.join(rafflePath, `background${extension}`);

      await fs.writeFile(imagePath, imageBuffer);

      console.log(
        `Background image saved for raffle ${raffleId}: ${imagePath}`
      );
      return imagePath;
    } catch (error) {
      console.error(
        `Failed to save background image for raffle ${raffleId}:`,
        error
      );
      throw error;
    }
  }

  async deleteBackgroundImage(imagePath: string): Promise<void> {
    try {
      await fs.unlink(imagePath);
      console.log(`Background image deleted: ${imagePath}`);
    } catch (error) {
      console.error(`Failed to delete background image ${imagePath}:`, error);
      throw error;
    }
  }

  // Recording file operations
  generateRecordingFilePath(raffleId: string, raffleName: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const sanitizedName = raffleName.replace(/[^a-zA-Z0-9-_]/g, "_");
    const filename = `${sanitizedName}_${raffleId}_${timestamp}.mp4`;
    return path.join(this.recordingsPath, filename);
  }

  async deleteRecordingFile(recordingPath: string): Promise<void> {
    try {
      await fs.unlink(recordingPath);
      console.log(`Recording file deleted: ${recordingPath}`);
    } catch (error) {
      console.error(`Failed to delete recording file ${recordingPath}:`, error);
      throw error;
    }
  }

  // Export operations
  async exportRaffleResults(
    raffleId: string,
    results: any[],
    exportPath: string
  ): Promise<void> {
    try {
      const csvContent = this.convertResultsToCSV(results);
      await fs.writeFile(exportPath, csvContent, "utf8");
      console.log(`Results exported to: ${exportPath}`);
    } catch (error) {
      console.error(`Failed to export results for raffle ${raffleId}:`, error);
      throw error;
    }
  }

  // Utility methods

  private convertResultsToCSV(results: any[]): string {
    if (results.length === 0) return "";

    const headers = Object.keys(results[0]);
    const csvRows = [headers.join(",")];

    results.forEach((result) => {
      const values = headers.map((header) => {
        const value = result[header];
        // Escape commas and quotes in CSV values
        if (
          typeof value === "string" &&
          (value.includes(",") || value.includes('"'))
        ) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value || "";
      });
      csvRows.push(values.join(","));
    });

    return csvRows.join("\n");
  }
/*
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }*/

  // File system utilities
  async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async getFileSize(filePath: string): Promise<number> {
    try {
      const stats = await fs.stat(filePath);
      return stats.size;
    } catch (error) {
      console.error(`Failed to get file size for ${filePath}:`, error);
      throw error;
    }
  }

  async getDirectorySize(dirPath: string): Promise<number> {
    try {
      const files = await fs.readdir(dirPath, { withFileTypes: true });
      let totalSize = 0;

      for (const file of files) {
        const filePath = path.join(dirPath, file.name);
        if (file.isDirectory()) {
          totalSize += await this.getDirectorySize(filePath);
        } else {
          const stats = await fs.stat(filePath);
          totalSize += stats.size;
        }
      }

      return totalSize;
    } catch (error) {
      console.error(`Failed to get directory size for ${dirPath}:`, error);
      throw error;
    }
  }

  async cleanupOldFiles(maxAgeInDays: number = 30): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - maxAgeInDays);

      // Clean up old recordings
      const recordings = await fs.readdir(this.recordingsPath);
      for (const recording of recordings) {
        const recordingPath = path.join(this.recordingsPath, recording);
        const stats = await fs.stat(recordingPath);

        if (stats.mtime < cutoffDate) {
          await fs.unlink(recordingPath);
          console.log(`Cleaned up old recording: ${recording}`);
        }
      }

      console.log("File cleanup completed");
    } catch (error) {
      console.error("Failed to cleanup old files:", error);
      throw error;
    }
  }
}
