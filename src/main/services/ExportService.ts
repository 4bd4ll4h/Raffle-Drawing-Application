import fs from "fs/promises";
import path from "path";
import { app, dialog } from "electron";
import archiver from "archiver";
import {
  Raffle,
  Drawing,
  Participant,
  ExportOptions,
  BulkOperationResult,
} from "../../types";
import { DatabaseService } from "./DatabaseService";
import { FileService } from "./FileService";

export interface ExportHistoryEntry {
  id: string;
  timestamp: Date;
  exportType: "individual" | "bulk";
  format: "csv" | "json" | "xlsx" | "zip";
  raffleIds: string[];
  outputPath: string;
  fileCount: number;
  success: boolean;
  error?: string;
}

export interface ExportResult {
  success: boolean;
  outputPath?: string;
  error?: string;
  filesCreated: string[];
}

export interface BulkExportOptions extends ExportOptions {
  exportType: "combined" | "separate" | "zip";
  includeDrawingHistory: boolean;
  includeParticipants: boolean;
  includeMetadata: boolean;
}

export class ExportService {
  private databaseService: DatabaseService;
  private fileService: FileService;
  private exportHistoryPath: string;

  constructor(databaseService: DatabaseService, fileService: FileService) {
    this.databaseService = databaseService;
    this.fileService = fileService;
    this.exportHistoryPath = path.join(
      app.getPath("userData"),
      "export-history.json"
    );
  }

  async initialize(): Promise<void> {
    try {
      // Ensure export history file exists
      try {
        await fs.access(this.exportHistoryPath);
      } catch {
        await fs.writeFile(this.exportHistoryPath, JSON.stringify([], null, 2));
      }
      console.log("Export service initialized successfully");
    } catch (error) {
      console.error("Failed to initialize export service:", error);
      throw error;
    }
  }

  // ============================================================================
  // INDIVIDUAL RAFFLE EXPORT
  // ============================================================================

  /**
   * Export individual raffle results to CSV format
   */
  async exportRaffleResults(
    raffleId: string,
    outputPath?: string,
    options: ExportOptions = { format: "csv", includeMetadata: true }
  ): Promise<ExportResult> {
    try {
      const raffle = await this.databaseService.getRaffle(raffleId);
      if (!raffle) {
        throw new Error(`Raffle with ID ${raffleId} not found`);
      }

      // Get drawing history for this raffle
      const drawings = await this.databaseService.getDrawingHistory(raffleId);

      // Get participants
      const participants = await this.fileService.loadParticipants(
        raffle.csvFilePath,
        raffleId
      );

      // Determine output path
      const finalOutputPath =
        outputPath ||
        (await this.selectExportLocation(
          `${raffle.name}_results.${options.format}`,
          options.format
        ));

      if (!finalOutputPath) {
        return {
          success: false,
          error: "Export cancelled by user",
          filesCreated: [],
        };
      }

      let filesCreated: string[] = [];

      switch (options.format) {
        case "csv":
          await this.exportToCSV(
            raffle,
            drawings,
            participants,
            finalOutputPath,
            options
          );
          filesCreated.push(finalOutputPath);
          break;
        case "json":
          await this.exportToJSON(
            raffle,
            drawings,
            participants,
            finalOutputPath,
            options
          );
          filesCreated.push(finalOutputPath);
          break;
        default:
          throw new Error(`Unsupported export format: ${options.format}`);
      }

      // Record export in history
      await this.recordExportHistory({
        exportType: "individual",
        format: options.format,
        raffleIds: [raffleId],
        outputPath: finalOutputPath,
        fileCount: filesCreated.length,
        success: true,
      });

      return {
        success: true,
        outputPath: finalOutputPath,
        filesCreated,
      };
    } catch (error) {
      console.error("Failed to export raffle results:", error);

      // Record failed export in history
      await this.recordExportHistory({
        exportType: "individual",
        format: options.format || "csv",
        raffleIds: [raffleId],
        outputPath: outputPath || "",
        fileCount: 0,
        success: false,
        error: (error as Error).message,
      });

      return {
        success: false,
        error: (error as Error).message,
        filesCreated: [],
      };
    }
  }

  // ============================================================================
  // BULK EXPORT OPERATIONS
  // ============================================================================

  /**
   * Export multiple raffles with various format options
   */
  async exportMultipleRaffles(
    raffleIds: string[],
    options: BulkExportOptions
  ): Promise<BulkOperationResult & { outputPath?: string }> {
    const result: BulkOperationResult & { outputPath?: string } = {
      successful: [],
      failed: [],
      totalProcessed: raffleIds.length,
    };

    try {
      // Validate raffles exist
      const raffles = await Promise.all(
        raffleIds.map((id) => this.databaseService.getRaffle(id))
      );

      const validRaffles = raffles.filter((raffle, index) => {
        if (!raffle) {
          result.failed.push({
            id: raffleIds[index],
            error: "Raffle not found",
          });
          return false;
        }
        return true;
      }) as Raffle[];

      if (validRaffles.length === 0) {
        throw new Error("No valid raffles found for export");
      }

      let outputPath: string;
      let filesCreated: string[] = [];

      switch (options.exportType) {
        case "combined":
          outputPath = await this.selectExportLocation(
            `bulk_export_${new Date().toISOString().split("T")[0]}.${options.format}`,
            options.format
          );
          if (!outputPath) {
            throw new Error("Export cancelled by user");
          }
          filesCreated = await this.exportCombined(
            validRaffles,
            outputPath,
            options
          );
          break;

        case "separate":
          const folderPath = await this.selectExportFolder();
          if (!folderPath) {
            throw new Error("Export cancelled by user");
          }
          outputPath = folderPath;
          filesCreated = await this.exportSeparate(
            validRaffles,
            folderPath,
            options
          );
          break;

        case "zip":
          outputPath = await this.selectExportLocation(
            `bulk_export_${new Date().toISOString().split("T")[0]}.zip`,
            "zip"
          );
          if (!outputPath) {
            throw new Error("Export cancelled by user");
          }
          filesCreated = await this.exportAsZip(
            validRaffles,
            outputPath,
            options
          );
          break;

        default:
          throw new Error(`Unsupported export type: ${options.exportType}`);
      }

      // Mark all valid raffles as successful
      result.successful = validRaffles.map((r) => r.id);
      result.outputPath = outputPath;

      // Record export in history
      await this.recordExportHistory({
        exportType: "bulk",
        format: options.exportType === "zip" ? "zip" : options.format,
        raffleIds: result.successful,
        outputPath,
        fileCount: filesCreated.length,
        success: true,
      });

      return result;
    } catch (error) {
      console.error("Failed to export multiple raffles:", error);

      // Mark remaining raffles as failed
      const remainingIds = raffleIds.filter(
        (id) =>
          !result.successful.includes(id) &&
          !result.failed.some((f) => f.id === id)
      );

      remainingIds.forEach((id) => {
        result.failed.push({
          id,
          error: (error as Error).message,
        });
      });

      // Record failed export in history
      await this.recordExportHistory({
        exportType: "bulk",
        format: options.format,
        raffleIds,
        outputPath: "",
        fileCount: 0,
        success: false,
        error: (error as Error).message,
      });

      return result;
    }
  }

  // ============================================================================
  // EXPORT FORMAT IMPLEMENTATIONS
  // ============================================================================

  private async exportToCSV(
    raffle: Raffle,
    drawings: Drawing[],
    participants: Participant[],
    outputPath: string,
    options: ExportOptions
  ): Promise<void> {
    const rows: string[] = [];

    // Add metadata header if requested
    if (options.includeMetadata) {
      rows.push("# Raffle Export Results");
      rows.push(`# Raffle Name: ${raffle.name}`);
      rows.push(`# Export Date: ${new Date().toISOString()}`);
      rows.push(`# Status: ${raffle.status}`);
      rows.push(`# Animation Style: ${raffle.animationStyle}`);
      rows.push(`# Total Participants: ${participants.length}`);
      rows.push(`# Total Drawings: ${drawings.length}`);
      rows.push("");
    }

    // Drawing results section
    if (drawings.length > 0) {
      rows.push("# Drawing Results");
      rows.push(
        "Drawing ID,Winner Username,Winner Ticket,Draw Date,Verification,Recording"
      );

      drawings.forEach((drawing) => {
        const row = [
          drawing.id,
          `"${drawing.winnerUsername}"`,
          drawing.winnerTicketNumber,
          drawing.drawTimestamp.toISOString(),
          drawing.randomOrgVerification || "",
          drawing.recordingFilePath || "",
        ].join(",");
        rows.push(row);
      });
      rows.push("");
    }

    // Participants section
    rows.push("# Participants");
    const headers = [
      "Username",
      "First Name",
      "Last Name",
      "Email",
      "Phone",
      "Ticket Number",
      "Profile URL",
    ];

    // Add custom fields if specified
    if (options.customFields && options.customFields.length > 0) {
      headers.push(...options.customFields);
    }

    rows.push(headers.join(","));

    participants.forEach((participant) => {
      const row = [
        `"${participant.username}"`,
        `"${participant.firstName || ""}"`,
        `"${participant.lastName || ""}"`,
        participant.email || "",
        participant.phoneNumber || "",
        participant.ticketNumber,
        participant.profileImageUrl,
      ];

      // Add custom field values
      if (options.customFields && options.customFields.length > 0) {
        options.customFields.forEach((field) => {
          const value = (participant as any)[field] || "";
          row.push(typeof value === "string" ? `"${value}"` : String(value));
        });
      }

      rows.push(row.join(","));
    });

    await fs.writeFile(outputPath, rows.join("\n"), "utf8");
  }

  private async exportToJSON(
    raffle: Raffle,
    drawings: Drawing[],
    participants: Participant[],
    outputPath: string,
    options: ExportOptions
  ): Promise<void> {
    const exportData: any = {
      raffle: {
        id: raffle.id,
        name: raffle.name,
        status: raffle.status,
        animationStyle: raffle.animationStyle,
        participantCount: raffle.participantCount,
        createdDate: raffle.createdDate,
        modifiedDate: raffle.modifiedDate,
      },
      drawings: drawings.map((drawing) => ({
        id: drawing.id,
        winnerUsername: drawing.winnerUsername,
        winnerTicketNumber: drawing.winnerTicketNumber,
        drawTimestamp: drawing.drawTimestamp,
        randomOrgVerification: drawing.randomOrgVerification,
        recordingFilePath: drawing.recordingFilePath,
      })),
      participants: participants.map((participant) => {
        const data: any = {
          username: participant.username,
          firstName: participant.firstName,
          lastName: participant.lastName,
          email: participant.email,
          phoneNumber: participant.phoneNumber,
          ticketNumber: participant.ticketNumber,
          profileImageUrl: participant.profileImageUrl,
        };

        // Add custom fields if specified
        if (options.customFields && options.customFields.length > 0) {
          options.customFields.forEach((field) => {
            data[field] = (participant as any)[field];
          });
        }

        return data;
      }),
    };

    if (options.includeMetadata) {
      exportData.metadata = {
        exportDate: new Date().toISOString(),
        exportVersion: "1.0",
        totalParticipants: participants.length,
        totalDrawings: drawings.length,
      };
    }

    await fs.writeFile(outputPath, JSON.stringify(exportData, null, 2), "utf8");
  }

  // ============================================================================
  // BULK EXPORT IMPLEMENTATIONS
  // ============================================================================

  private async exportCombined(
    raffles: Raffle[],
    outputPath: string,
    options: BulkExportOptions
  ): Promise<string[]> {
    const allData: any = {
      exportInfo: {
        exportDate: new Date().toISOString(),
        exportType: "combined",
        raffleCount: raffles.length,
      },
      raffles: [],
    };

    for (const raffle of raffles) {
      const drawings = options.includeDrawingHistory
        ? await this.databaseService.getDrawingHistory(raffle.id)
        : [];

      const participants = options.includeParticipants
        ? await this.fileService.loadParticipants(raffle.csvFilePath, raffle.id)
        : [];

      const raffleData: any = {
        id: raffle.id,
        name: raffle.name,
        status: raffle.status,
        animationStyle: raffle.animationStyle,
        participantCount: raffle.participantCount,
        createdDate: raffle.createdDate,
        modifiedDate: raffle.modifiedDate,
      };

      if (options.includeDrawingHistory) {
        raffleData.drawings = drawings;
      }

      if (options.includeParticipants) {
        raffleData.participants = participants;
      }

      allData.raffles.push(raffleData);
    }

    if (options.format === "json") {
      await fs.writeFile(outputPath, JSON.stringify(allData, null, 2), "utf8");
    } else {
      // Convert to CSV format for combined export
      await this.exportCombinedToCSV(allData, outputPath);
    }

    return [outputPath];
  }

  private async exportSeparate(
    raffles: Raffle[],
    folderPath: string,
    options: BulkExportOptions
  ): Promise<string[]> {
    const filesCreated: string[] = [];

    for (const raffle of raffles) {
      const sanitizedName = raffle.name.replace(/[^a-zA-Z0-9-_]/g, "_");
      const fileName = `${sanitizedName}_${raffle.id}.${options.format}`;
      const filePath = path.join(folderPath, fileName);

      const drawings = options.includeDrawingHistory
        ? await this.databaseService.getDrawingHistory(raffle.id)
        : [];

      const participants = options.includeParticipants
        ? await this.fileService.loadParticipants(raffle.csvFilePath, raffle.id)
        : [];

      if (options.format === "csv") {
        await this.exportToCSV(
          raffle,
          drawings,
          participants,
          filePath,
          options
        );
      } else {
        await this.exportToJSON(
          raffle,
          drawings,
          participants,
          filePath,
          options
        );
      }

      filesCreated.push(filePath);
    }

    return filesCreated;
  }

  private async exportAsZip(
    raffles: Raffle[],
    outputPath: string,
    options: BulkExportOptions
  ): Promise<string[]> {
    return new Promise(async (resolve, reject) => {
      try {
        const output = await fs.open(outputPath, "w");
        const archive = archiver("zip", { zlib: { level: 9 } });

        archive.pipe(output.createWriteStream());

        // Add each raffle as a separate file in the ZIP
        for (const raffle of raffles) {
          const drawings = options.includeDrawingHistory
            ? await this.databaseService.getDrawingHistory(raffle.id)
            : [];

          const participants = options.includeParticipants
            ? await this.fileService.loadParticipants(
                raffle.csvFilePath,
                raffle.id
              )
            : [];

          const sanitizedName = raffle.name.replace(/[^a-zA-Z0-9-_]/g, "_");
          const fileName = `${sanitizedName}_${raffle.id}.${options.format}`;

          if (options.format === "csv") {
            const csvContent = await this.generateCSVContent(
              raffle,
              drawings,
              participants,
              options
            );
            archive.append(csvContent, { name: fileName });
          } else {
            const jsonContent = await this.generateJSONContent(
              raffle,
              drawings,
              participants,
              options
            );
            archive.append(jsonContent, { name: fileName });
          }
        }

        archive.on("error", reject);
        archive.on("end", () => resolve([outputPath]));

        await archive.finalize();
      } catch (error) {
        reject(error);
      }
    });
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private async exportCombinedToCSV(
    data: any,
    outputPath: string
  ): Promise<void> {
    const rows: string[] = [];

    // Header
    rows.push("# Combined Raffle Export");
    rows.push(`# Export Date: ${data.exportInfo.exportDate}`);
    rows.push(`# Total Raffles: ${data.exportInfo.raffleCount}`);
    rows.push("");

    // For each raffle
    data.raffles.forEach((raffle: any, index: number) => {
      rows.push(`# Raffle ${index + 1}: ${raffle.name}`);
      rows.push(
        `Raffle ID,Name,Status,Animation Style,Participants,Created Date`
      );
      rows.push(
        [
          raffle.id,
          `"${raffle.name}"`,
          raffle.status,
          raffle.animationStyle,
          raffle.participantCount,
          raffle.createdDate,
        ].join(",")
      );

      if (raffle.drawings && raffle.drawings.length > 0) {
        rows.push("");
        rows.push("Drawing Results:");
        rows.push("Winner Username,Winner Ticket,Draw Date,Verification");
        raffle.drawings.forEach((drawing: any) => {
          rows.push(
            [
              `"${drawing.winnerUsername}"`,
              drawing.winnerTicketNumber,
              drawing.drawTimestamp,
              drawing.randomOrgVerification || "",
            ].join(",")
          );
        });
      }

      rows.push("");
    });

    await fs.writeFile(outputPath, rows.join("\n"), "utf8");
  }

  private async generateCSVContent(
    raffle: Raffle,
    drawings: Drawing[],
    participants: Participant[],
    options: ExportOptions
  ): Promise<string> {
    const tempPath = path.join(app.getPath("temp"), `temp_${Date.now()}.csv`);
    await this.exportToCSV(raffle, drawings, participants, tempPath, options);
    const content = await fs.readFile(tempPath, "utf8");
    await fs.unlink(tempPath);
    return content;
  }

  private async generateJSONContent(
    raffle: Raffle,
    drawings: Drawing[],
    participants: Participant[],
    options: ExportOptions
  ): Promise<string> {
    const tempPath = path.join(app.getPath("temp"), `temp_${Date.now()}.json`);
    await this.exportToJSON(raffle, drawings, participants, tempPath, options);
    const content = await fs.readFile(tempPath, "utf8");
    await fs.unlink(tempPath);
    return content;
  }

  // ============================================================================
  // FILE DIALOG METHODS
  // ============================================================================

  private async selectExportLocation(
    defaultName: string,
    format: string
  ): Promise<string | null> {
    const filters: Electron.FileFilter[] = [];

    switch (format) {
      case "csv":
        filters.push({ name: "CSV Files", extensions: ["csv"] });
        break;
      case "json":
        filters.push({ name: "JSON Files", extensions: ["json"] });
        break;
      case "zip":
        filters.push({ name: "ZIP Archives", extensions: ["zip"] });
        break;
    }

    filters.push({ name: "All Files", extensions: ["*"] });

    const result = await dialog.showSaveDialog({
      title: "Export Raffle Results",
      defaultPath: defaultName,
      filters,
    });

    return result.canceled ? null : result.filePath || null;
  }

  private async selectExportFolder(): Promise<string | null> {
    const result = await dialog.showOpenDialog({
      title: "Select Export Folder",
      properties: ["openDirectory", "createDirectory"],
    });

    return result.canceled ? null : result.filePaths[0] || null;
  }

  // ============================================================================
  // EXPORT HISTORY MANAGEMENT
  // ============================================================================

  private async recordExportHistory(
    entry: Omit<ExportHistoryEntry, "id" | "timestamp">
  ): Promise<void> {
    try {
      const history = await this.getExportHistory();
      const newEntry: ExportHistoryEntry = {
        id: this.generateId(),
        timestamp: new Date(),
        ...entry,
      };

      history.unshift(newEntry);

      // Keep only last 100 entries
      if (history.length > 100) {
        history.splice(100);
      }

      await fs.writeFile(
        this.exportHistoryPath,
        JSON.stringify(history, null, 2)
      );
    } catch (error) {
      console.error("Failed to record export history:", error);
    }
  }

  async getExportHistory(): Promise<ExportHistoryEntry[]> {
    try {
      const content = await fs.readFile(this.exportHistoryPath, "utf8");
      const history = JSON.parse(content);

      // Convert timestamp strings back to Date objects
      return history.map((entry: any) => ({
        ...entry,
        timestamp: new Date(entry.timestamp),
      }));
    } catch (error) {
      console.error("Failed to read export history:", error);
      return [];
    }
  }

  async clearExportHistory(): Promise<void> {
    try {
      await fs.writeFile(this.exportHistoryPath, JSON.stringify([], null, 2));
    } catch (error) {
      console.error("Failed to clear export history:", error);
      throw error;
    }
  }

  /**
   * Re-export using previous export settings
   */
  async reExport(
    historyEntryId: string
  ): Promise<ExportResult | BulkOperationResult> {
    try {
      const history = await this.getExportHistory();
      const entry = history.find((h) => h.id === historyEntryId);

      if (!entry) {
        throw new Error("Export history entry not found");
      }

      if (entry.exportType === "individual" && entry.raffleIds.length === 1) {
        return await this.exportRaffleResults(entry.raffleIds[0], undefined, {
          format:
            entry.format === "zip"
              ? "csv"
              : (entry.format as "csv" | "json" | "xlsx"),
          includeMetadata: true,
        });
      } else {
        return await this.exportMultipleRaffles(entry.raffleIds, {
          format:
            entry.format === "zip"
              ? "csv"
              : (entry.format as "csv" | "json" | "xlsx"),
          exportType: entry.format === "zip" ? "zip" : "separate",
          includeDrawingHistory: true,
          includeParticipants: true,
          includeMetadata: true,
        });
      }
    } catch (error) {
      console.error("Failed to re-export:", error);
      throw error;
    }
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }
}
