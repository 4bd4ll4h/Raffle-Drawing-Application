import { Transform, Readable } from 'stream';
import { promises as fs } from 'fs';
import { createReadStream } from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse';
import { 
  CSVRow, 
  CSVValidationResult, 
  ValidationError, 
  ValidationWarning, 
  Participant
} from '../../types';
import { 
  validateCSVHeaders, 
  validateCSVRow, 
  csvRowToParticipant 
} from '../../types/validation';

export interface StreamingOptions {
  batchSize?: number;
  maxMemoryUsage?: number; // in MB
  progressCallback?: (processed: number, total: number) => void;
  cancelToken?: { cancelled: boolean };
}

export interface StreamingResult<T> {
  data: T[];
  totalProcessed: number;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  cancelled: boolean;
}

export class StreamingCSVService {
  private readonly maxFileSize = 500 * 1024 * 1024; // 500MB for streaming
  private readonly defaultBatchSize = 1000;
  private readonly encoding = 'utf8';

  /**
   * Streams and validates a large CSV file in batches
   */
  async streamValidateCSV(
    filePath: string, 
    raffleId: string,
    options: StreamingOptions = {}
  ): Promise<CSVValidationResult> {
    const {
      batchSize = this.defaultBatchSize,
      maxMemoryUsage = 100, // 100MB default
      progressCallback,
      cancelToken
    } = options;

    try {
      // Check file existence and size
      await this.validateFile(filePath);

      const errors: ValidationError[] = [];
      const warnings: ValidationWarning[] = [];
      const duplicateTickets: string[] = [];
      const existingTickets = new Set<string>();
      const preview: Participant[] = [];
      
      let totalRows = 0;
      let validRows = 0;
      let headersValidated = false;
      let previewCount = 0;
      const maxPreviewRows = 10;

      // Create streaming parser
      const parser = parse({
        columns: true,
        skip_empty_lines: true,
        trim: true,
        cast: false
      });

      const fileStream = createReadStream(filePath, { encoding: this.encoding });
      let batch: CSVRow[] = [];
      let rowIndex = 0;

      return new Promise((resolve, reject) => {
        parser.on('data', (row: CSVRow) => {
          if (cancelToken?.cancelled) {
            parser.destroy();
            return;
          }

          totalRows++;
          rowIndex++;

          // Validate headers on first row
          if (!headersValidated) {
            const headers = Object.keys(row);
            const headerErrors = validateCSVHeaders(headers);
            errors.push(...headerErrors);
            headersValidated = true;
          }

          // Add to batch
          batch.push(row);

          // Process batch when it reaches the specified size
          if (batch.length >= batchSize) {
            const batchResult = this.processBatch(
              batch, 
              raffleId, 
              existingTickets, 
              rowIndex - batch.length + 1
            );
            
            errors.push(...batchResult.errors);
            warnings.push(...batchResult.warnings);
            duplicateTickets.push(...batchResult.duplicateTickets);
            validRows += batchResult.validRows;

            // Add to preview if we haven't reached the limit
            if (previewCount < maxPreviewRows) {
              const remainingPreviewSlots = maxPreviewRows - previewCount;
              const previewItems = batchResult.participants.slice(0, remainingPreviewSlots);
              preview.push(...previewItems);
              previewCount += previewItems.length;
            }

            // Clear batch to free memory
            batch = [];

            // Check memory usage
            if (this.getMemoryUsage() > maxMemoryUsage) {
              console.warn(`Memory usage exceeded ${maxMemoryUsage}MB, optimizing...`);
              this.optimizeMemory();
            }

            // Report progress
            if (progressCallback) {
              progressCallback(totalRows, -1); // -1 indicates unknown total
            }
          }
        });

        parser.on('end', () => {
          // Process remaining batch
          if (batch.length > 0 && !cancelToken?.cancelled) {
            const batchResult = this.processBatch(
              batch, 
              raffleId, 
              existingTickets, 
              rowIndex - batch.length + 1
            );
            
            errors.push(...batchResult.errors);
            warnings.push(...batchResult.warnings);
            duplicateTickets.push(...batchResult.duplicateTickets);
            validRows += batchResult.validRows;

            // Add remaining items to preview
            if (previewCount < maxPreviewRows) {
              const remainingPreviewSlots = maxPreviewRows - previewCount;
              const previewItems = batchResult.participants.slice(0, remainingPreviewSlots);
              preview.push(...previewItems);
            }
          }

          resolve({
            isValid: errors.filter(e => e.severity === 'error').length === 0,
            errors,
            warnings,
            participantCount: validRows,
            preview,
            duplicateTickets: Array.from(new Set(duplicateTickets)),
            totalRows,
            validRows
          });
        });

        parser.on('error', (error) => {
          reject(new Error(`CSV parsing error: ${error.message}`));
        });

        fileStream.pipe(parser);
      });

    } catch (error) {
      return {
        isValid: false,
        errors: [{
          type: 'invalid_format',
          row: 0,
          column: 'file',
          message: `Failed to process CSV file: ${error instanceof Error ? error.message : 'Unknown error'}`,
          severity: 'error'
        }],
        warnings: [],
        participantCount: 0,
        preview: [],
        duplicateTickets: [],
        totalRows: 0,
        validRows: 0
      };
    }
  }

  /**
   * Streams participants from a CSV file in batches
   */
  async *streamParticipants(
    csvFilePath: string, 
    raffleId: string,
    options: StreamingOptions = {}
  ): AsyncGenerator<StreamingResult<Participant>, void, unknown> {
    const {
      batchSize = this.defaultBatchSize,
      cancelToken
    } = options;

    const parser = parse({
      columns: true,
      skip_empty_lines: true,
      trim: true,
      cast: false
    });

    const fileStream = createReadStream(csvFilePath, { encoding: this.encoding });
    let batch: CSVRow[] = [];
    let totalProcessed = 0;

    try {
      for await (const row of fileStream.pipe(parser)) {
        if (cancelToken?.cancelled) {
          yield {
            data: [],
            totalProcessed,
            errors: [],
            warnings: [],
            cancelled: true
          };
          return;
        }

        batch.push(row as CSVRow);

        if (batch.length >= batchSize) {
          const result = this.processBatch(batch, raffleId, new Set(), totalProcessed + 1);
          totalProcessed += batch.length;

          yield {
            data: result.participants,
            totalProcessed,
            errors: result.errors,
            warnings: result.warnings,
            cancelled: false
          };

          batch = [];
        }
      }

      // Process remaining batch
      if (batch.length > 0) {
        const result = this.processBatch(batch, raffleId, new Set(), totalProcessed + 1);
        totalProcessed += batch.length;

        yield {
          data: result.participants,
          totalProcessed,
          errors: result.errors,
          warnings: result.warnings,
          cancelled: false
        };
      }

    } catch (error) {
      yield {
        data: [],
        totalProcessed,
        errors: [{
          type: 'invalid_format',
          row: 0,
          column: 'file',
          message: `Streaming error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          severity: 'error'
        }],
        warnings: [],
        cancelled: false
      };
    }
  }

  /**
   * Gets participant count from large CSV file efficiently
   */
  async getParticipantCountStreaming(
    csvFilePath: string,
    options: StreamingOptions = {}
  ): Promise<{ count: number; cancelled: boolean }> {
    const { cancelToken } = options;
    
    return new Promise((resolve, reject) => {
      let count = 0;
      
      const parser = parse({
        columns: true,
        skip_empty_lines: true,
        trim: true
      });

      const fileStream = createReadStream(csvFilePath, { encoding: this.encoding });

      parser.on('data', () => {
        if (cancelToken?.cancelled) {
          parser.destroy();
          resolve({ count, cancelled: true });
          return;
        }
        count++;
      });

      parser.on('end', () => {
        resolve({ count, cancelled: false });
      });

      parser.on('error', (error) => {
        reject(new Error(`Failed to count participants: ${error.message}`));
      });

      fileStream.pipe(parser);
    });
  }

  /**
   * Processes a batch of CSV rows
   */
  private processBatch(
    batch: CSVRow[], 
    raffleId: string, 
    existingTickets: Set<string>, 
    startRowIndex: number
  ): {
    participants: Participant[];
    errors: ValidationError[];
    warnings: ValidationWarning[];
    duplicateTickets: string[];
    validRows: number;
  } {
    const participants: Participant[] = [];
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const duplicateTickets: string[] = [];
    let validRows = 0;

    for (let i = 0; i < batch.length; i++) {
      const row = batch[i];
      const rowIndex = startRowIndex + i;

      // Validate row
      const validation = validateCSVRow(row, rowIndex, existingTickets);
      errors.push(...validation.errors);
      warnings.push(...validation.warnings);

      // Track duplicates
      const ticketNumber = row['Ticket Number'];
      if (ticketNumber && existingTickets.has(ticketNumber)) {
        duplicateTickets.push(ticketNumber);
      } else if (ticketNumber) {
        existingTickets.add(ticketNumber);
      }

      // Convert to participant if no critical errors
      const hasErrors = validation.errors.filter(e => e.severity === 'error').length === 0;
      if (hasErrors) {
        try {
          const participant = csvRowToParticipant(row, raffleId);
          participants.push(participant);
          validRows++;
        } catch (error) {
          errors.push({
            type: 'invalid_format',
            row: rowIndex,
            column: 'row',
            message: `Failed to convert row to participant: ${error instanceof Error ? error.message : 'Unknown error'}`,
            severity: 'error'
          });
        }
      }
    }

    return {
      participants,
      errors,
      warnings,
      duplicateTickets,
      validRows
    };
  }

  /**
   * Validates file before streaming
   */
  private async validateFile(filePath: string): Promise<void> {
    try {
      const stats = await fs.stat(filePath);
      
      if (!stats.isFile()) {
        throw new Error('Path is not a file');
      }

      if (stats.size > this.maxFileSize) {
        throw new Error(`File size (${Math.round(stats.size / 1024 / 1024)}MB) exceeds maximum allowed size (${Math.round(this.maxFileSize / 1024 / 1024)}MB)`);
      }

      const ext = path.extname(filePath).toLowerCase();
      if (ext !== '.csv') {
        throw new Error(`File extension '${ext}' is not allowed. Only .csv files are supported.`);
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('ENOENT')) {
        throw new Error('File not found');
      }
      throw error;
    }
  }

  /**
   * Gets current memory usage in MB
   */
  private getMemoryUsage(): number {
    const usage = process.memoryUsage();
    return Math.round(usage.heapUsed / 1024 / 1024);
  }

  /**
   * Optimizes memory usage
   */
  private optimizeMemory(): void {
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  }
}