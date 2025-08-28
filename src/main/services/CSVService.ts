import { promises as fs } from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse';
import { stringify } from 'csv-stringify';
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

export class CSVService {
  private readonly maxFileSize = 50 * 1024 * 1024; // 50MB
  private readonly allowedExtensions = ['.csv'];
  private readonly encoding = 'utf8';

  /**
   * Validates and parses a CSV file
   */
  async validateAndParseCSV(
    filePath: string, 
    raffleId: string,
    options: {
      maxPreviewRows?: number;
      skipValidation?: boolean;
    } = {}
  ): Promise<CSVValidationResult> {
    const { maxPreviewRows = 10, skipValidation = false } = options;

    try {
      // Check file existence and size
      await this.validateFile(filePath);

      // Read and parse CSV
      const csvData = await this.readCSVFile(filePath);
      
      if (csvData.length === 0) {
        return {
          isValid: false,
          errors: [{
            type: 'invalid_format',
            row: 0,
            column: 'file',
            message: 'CSV file is empty',
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

      // Extract headers from first row
      const headers = Object.keys(csvData[0]);
      
      // Validate headers
      const headerErrors = validateCSVHeaders(headers);
      if (headerErrors.length > 0 && !skipValidation) {
        return {
          isValid: false,
          errors: headerErrors,
          warnings: [],
          participantCount: 0,
          preview: [],
          duplicateTickets: [],
          totalRows: csvData.length,
          validRows: 0
        };
      }

      // Validate rows and convert to participants
      const errors: ValidationError[] = [...headerErrors];
      const warnings: ValidationWarning[] = [];
      const participants: Participant[] = [];
      const duplicateTickets: string[] = [];
      const existingTickets = new Set<string>();
      let validRows = 0;

      for (let i = 0; i < csvData.length; i++) {
        const row = csvData[i] as CSVRow;
        
        if (!skipValidation) {
          const validation = validateCSVRow(row, i + 1, existingTickets);
          errors.push(...validation.errors);
          warnings.push(...validation.warnings);
        }

        // Track duplicates
        const ticketNumber = row['Ticket Number'];
        if (ticketNumber && existingTickets.has(ticketNumber)) {
          duplicateTickets.push(ticketNumber);
        } else if (ticketNumber) {
          existingTickets.add(ticketNumber);
        }

        // Convert to participant if no critical errors
        const hasErrors = errors.filter(e => e.row === i + 1 && e.severity === 'error').length === 0;
        if (hasErrors || skipValidation) {
          try {
            const participant = csvRowToParticipant(row, raffleId);
            participants.push(participant);
            validRows++;
          } catch (error) {
            errors.push({
              type: 'invalid_format',
              row: i + 1,
              column: 'row',
              message: `Failed to convert row to participant: ${error instanceof Error ? error.message : 'Unknown error'}`,
              severity: 'error'
            });
          }
        }
      }

      // Create preview (first N valid participants)
      const preview = participants.slice(0, maxPreviewRows);

      return {
        isValid: errors.filter(e => e.severity === 'error').length === 0,
        errors,
        warnings,
        participantCount: participants.length,
        preview,
        duplicateTickets: Array.from(new Set(duplicateTickets)),
        totalRows: csvData.length,
        validRows
      };

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
   * Saves CSV file to raffle directory
   */
  async saveCSVFile(raffleId: string, sourceFilePath: string): Promise<string> {
    try {
      const raffleDir = path.join(process.cwd(), 'app-data', 'raffles', raffleId);
      await fs.mkdir(raffleDir, { recursive: true });

      const targetPath = path.join(raffleDir, 'participants.csv');
      await fs.copyFile(sourceFilePath, targetPath);

      return targetPath;
    } catch (error) {
      throw new Error(`Failed to save CSV file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Loads participants from saved CSV file
   */
  async loadParticipants(csvFilePath: string, raffleId: string): Promise<Participant[]> {
    try {
      const validation = await this.validateAndParseCSV(csvFilePath, raffleId, { 
        skipValidation: true 
      });
      
      if (!validation.isValid && validation.errors.some(e => e.severity === 'error')) {
        throw new Error(`Invalid CSV file: ${validation.errors[0].message}`);
      }

      // Load all participants (not just preview)
      const csvData = await this.readCSVFile(csvFilePath);
      const participants: Participant[] = [];

      for (const row of csvData) {
        try {
          const participant = csvRowToParticipant(row as CSVRow, raffleId);
          participants.push(participant);
        } catch (error) {
          console.warn(`Skipping invalid row: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      return participants;
    } catch (error) {
      throw new Error(`Failed to load participants: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Exports participants to CSV format
   */
  async exportParticipants(
    participants: Participant[], 
    outputPath: string,
    options: {
      includeMetadata?: boolean;
      customFields?: string[];
    } = {}
  ): Promise<void> {
    const { includeMetadata = true, customFields = [] } = options;

    try {
      // Define columns to export
      const baseColumns = [
        'Username', 'First Name', 'Last Name', 'User Email ID', 
        'Phone Number', 'Ticket Number', 'User Profile'
      ];

      const metadataColumns = includeMetadata ? [
        'Product Name', 'Currency', 'Ticket Price', 'Order ID',
        'Order Status', 'Order Amount', 'Ticket Purchased Date', 'Status'
      ] : [];

      const columns = [...baseColumns, ...metadataColumns, ...customFields];

      // Convert participants to CSV rows
      const csvRows = participants.map(participant => {
        const row: Record<string, any> = {
          'Username': participant.username,
          'First Name': participant.firstName || '',
          'Last Name': participant.lastName || '',
          'User Email ID': participant.email || '',
          'Phone Number': participant.phoneNumber || '',
          'Ticket Number': participant.ticketNumber,
          'User Profile': participant.profileImageUrl
        };

        if (includeMetadata) {
          row['Product Name'] = participant.productName || '';
          row['Currency'] = participant.currency || '';
          row['Ticket Price'] = participant.ticketPrice || '';
          row['Order ID'] = participant.orderId || '';
          row['Order Status'] = participant.orderStatus || '';
          row['Order Amount'] = participant.orderAmount || '';
          row['Ticket Purchased Date'] = participant.ticketPurchasedDate || '';
          row['Status'] = participant.status || '';
        }

        return row;
      });

      // Write CSV file
      const csvString = await new Promise<string>((resolve, reject) => {
        stringify(csvRows, { 
          header: true, 
          columns: columns 
        }, (err, output) => {
          if (err) reject(err);
          else resolve(output);
        });
      });

      await fs.writeFile(outputPath, csvString, this.encoding);
    } catch (error) {
      throw new Error(`Failed to export participants: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Gets participant count from CSV file without full parsing
   */
  async getParticipantCount(csvFilePath: string): Promise<number> {
    try {
      const csvData = await this.readCSVFile(csvFilePath);
      return csvData.length;
    } catch (error) {
      throw new Error(`Failed to get participant count: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validates file before processing
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
      if (!this.allowedExtensions.includes(ext)) {
        throw new Error(`File extension '${ext}' is not allowed. Allowed extensions: ${this.allowedExtensions.join(', ')}`);
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('ENOENT')) {
        throw new Error('File not found');
      }
      throw error;
    }
  }

  /**
   * Reads and parses CSV file
   */
  private async readCSVFile(filePath: string): Promise<Record<string, any>[]> {
    return new Promise((resolve, reject) => {
      const results: Record<string, any>[] = [];
      
      fs.readFile(filePath, this.encoding)
        .then(content => {
          parse(content, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
            cast: false // Keep all values as strings initially
          })
          .on('data', (row) => {
            results.push(row);
          })
          .on('error', (error) => {
            reject(new Error(`CSV parsing error: ${error.message}`));
          })
          .on('end', () => {
            resolve(results);
          });
        })
        .catch(reject);
    });
  }

  /**
   * Deletes CSV file
   */
  async deleteCSVFile(csvFilePath: string): Promise<void> {
    try {
      await fs.unlink(csvFilePath);
    } catch (error) {
      if (error instanceof Error && error.message.includes('ENOENT')) {
        // File doesn't exist, which is fine
        return;
      }
      throw new Error(`Failed to delete CSV file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Creates a sample CSV file for testing
   */
  async createSampleCSV(outputPath: string, participantCount: number = 10): Promise<void> {
    const sampleData: Record<string, any>[] = [];
    
    for (let i = 1; i <= participantCount; i++) {
      sampleData.push({
        'Username': `user${i}`,
        'First Name': `First${i}`,
        'Last Name': `Last${i}`,
        'User Email ID': `user${i}@example.com`,
        'Phone Number': `+1234567890${i}`,
        'Product Name': 'Sample Product',
        'Currency': 'USD',
        'Ticket Price': '1.00',
        'Ticket Number': String(i),
        'Order ID': `#ORDER${i}`,
        'Order Status': 'Processing',
        'Order Amount': '1.00',
        'Ticket Purchased Date': new Date().toLocaleDateString(),
        'Status': 'Ticket Buyer',
        'Stream ID': 'N/A',
        'User Profile': `https://example.com/avatar${i}.jpg`
      });
    }

    const csvString = await new Promise<string>((resolve, reject) => {
      stringify(sampleData, { header: true }, (err, output) => {
        if (err) reject(err);
        else resolve(output);
      });
    });

    await fs.writeFile(outputPath, csvString, this.encoding);
  }
}