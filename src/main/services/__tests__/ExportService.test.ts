import fs from 'fs/promises';
import path from 'path';
import { ExportService, ExportHistoryEntry, BulkExportOptions } from '../ExportService';
import { DatabaseService } from '../DatabaseService';
import { FileService } from '../FileService';
import { Raffle, Drawing, Participant, AnimationStyle } from '../../../types';

// Mock electron modules
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => '/mock/user/data')
  },
  dialog: {
    showSaveDialog: jest.fn(),
    showOpenDialog: jest.fn()
  }
}));

// Mock archiver
jest.mock('archiver', () => {
  const mockArchive = {
    pipe: jest.fn(),
    append: jest.fn(),
    finalize: jest.fn(),
    on: jest.fn((event, callback) => {
      if (event === 'end') {
        setTimeout(callback, 10);
      }
    })
  };
  return jest.fn(() => mockArchive);
});

describe('ExportService', () => {
  let exportService: ExportService;
  let mockDatabaseService: jest.Mocked<DatabaseService>;
  let mockFileService: jest.Mocked<FileService>;
  let tempDir: string;

  const mockRaffle: Raffle = {
    id: 'raffle-1',
    name: 'Test Raffle',
    csvFilePath: '/path/to/participants.csv',
    status: 'completed',
    animationStyle: AnimationStyle.CS2_CASE,
    createdDate: new Date('2024-01-01'),
    modifiedDate: new Date('2024-01-02'),
    customSettings: {
      colorScheme: { primary: '#000', secondary: '#fff', accent: '#f00', background: '#eee' },
      logoPosition: 'center',
      animationDuration: 5000,
      soundEnabled: true
    },
    participantCount: 3
  };

  const mockDrawings: Drawing[] = [
    {
      id: 'drawing-1',
      raffleId: 'raffle-1',
      winnerId: 'participant-1',
      winnerUsername: 'winner1',
      winnerTicketNumber: 'T001',
      drawTimestamp: new Date('2024-01-03'),
      randomOrgVerification: 'verification-data',
      drawSettings: {
        recordingEnabled: true,
        recordingQuality: '1080p',
        animationStyle: AnimationStyle.CS2_CASE
      }
    }
  ];

  const mockParticipants: Participant[] = [
    {
      id: 'participant-1',
      raffleId: 'raffle-1',
      username: 'user1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      phoneNumber: '123-456-7890',
      profileImageUrl: 'https://example.com/avatar1.jpg',
      ticketNumber: 'T001',
      importDate: new Date('2024-01-01')
    },
    {
      id: 'participant-2',
      raffleId: 'raffle-1',
      username: 'user2',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@example.com',
      profileImageUrl: 'https://example.com/avatar2.jpg',
      ticketNumber: 'T002',
      importDate: new Date('2024-01-01')
    },
    {
      id: 'participant-3',
      raffleId: 'raffle-1',
      username: 'user3',
      profileImageUrl: 'https://example.com/avatar3.jpg',
      ticketNumber: 'T003',
      importDate: new Date('2024-01-01')
    }
  ];

  beforeEach(async () => {
    // Create temp directory for tests
    tempDir = path.join(__dirname, 'temp-export-tests');
    await fs.mkdir(tempDir, { recursive: true });

    // Mock the export history file path
    const mockHistoryPath = path.join(tempDir, 'export-history.json');
    await fs.writeFile(mockHistoryPath, JSON.stringify([], null, 2));

    // Mock services
    mockDatabaseService = {
      getRaffle: jest.fn(),
      getDrawingHistory: jest.fn(),
    } as any;

    mockFileService = {
      loadParticipants: jest.fn(),
    } as any;

    // Setup default mock returns
    mockDatabaseService.getRaffle.mockResolvedValue(mockRaffle);
    mockDatabaseService.getDrawingHistory.mockResolvedValue(mockDrawings);
    mockFileService.loadParticipants.mockResolvedValue(mockParticipants);

    exportService = new ExportService(mockDatabaseService, mockFileService);
    
    // Override the export history path to use our temp file
    (exportService as any).exportHistoryPath = mockHistoryPath;
    
    await exportService.initialize();
  });

  afterEach(async () => {
    // Clean up temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('Failed to clean up temp directory:', error);
    }
  });

  describe('Individual Raffle Export', () => {
    it('should export raffle results to CSV format', async () => {
      const outputPath = path.join(tempDir, 'test-export.csv');
      
      const result = await exportService.exportRaffleResults('raffle-1', outputPath, {
        format: 'csv',
        includeMetadata: true
      });

      expect(result.success).toBe(true);
      expect(result.outputPath).toBe(outputPath);
      expect(result.filesCreated).toContain(outputPath);

      // Verify file was created and has content
      const fileExists = await fs.access(outputPath).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);

      const content = await fs.readFile(outputPath, 'utf8');
      expect(content).toContain('# Raffle Export Results');
      expect(content).toContain('Test Raffle');
      expect(content).toContain('winner1');
      expect(content).toContain('user1');
      expect(content).toContain('john@example.com');
    });

    it('should export raffle results to JSON format', async () => {
      const outputPath = path.join(tempDir, 'test-export.json');
      
      const result = await exportService.exportRaffleResults('raffle-1', outputPath, {
        format: 'json',
        includeMetadata: true
      });

      expect(result.success).toBe(true);
      expect(result.outputPath).toBe(outputPath);

      const content = await fs.readFile(outputPath, 'utf8');
      const data = JSON.parse(content);
      
      expect(data.raffle.name).toBe('Test Raffle');
      expect(data.drawings).toHaveLength(1);
      expect(data.participants).toHaveLength(3);
      expect(data.metadata).toBeDefined();
    });

    it('should handle export with custom fields', async () => {
      const outputPath = path.join(tempDir, 'test-custom-fields.csv');
      
      const result = await exportService.exportRaffleResults('raffle-1', outputPath, {
        format: 'csv',
        includeMetadata: false,
        customFields: ['firstName', 'lastName']
      });

      expect(result.success).toBe(true);
      
      const content = await fs.readFile(outputPath, 'utf8');
      expect(content).toContain('First Name,Last Name');
      expect(content).toContain('John,Doe');
      expect(content).toContain('Jane,Smith');
    });

    it('should handle raffle not found error', async () => {
      mockDatabaseService.getRaffle.mockResolvedValue(null);
      
      const result = await exportService.exportRaffleResults('nonexistent', undefined, {
        format: 'csv',
        includeMetadata: true
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('Bulk Export Operations', () => {
    const multipleRaffles: Raffle[] = [
      { ...mockRaffle, id: 'raffle-1', name: 'Raffle 1' },
      { ...mockRaffle, id: 'raffle-2', name: 'Raffle 2' },
      { ...mockRaffle, id: 'raffle-3', name: 'Raffle 3' }
    ];

    beforeEach(() => {
      mockDatabaseService.getRaffle.mockImplementation(async (id: string) => {
        return multipleRaffles.find(r => r.id === id) || null;
      });
    });

    it('should export multiple raffles as separate files', async () => {
      const options: BulkExportOptions = {
        format: 'csv',
        exportType: 'separate',
        includeDrawingHistory: true,
        includeParticipants: true,
        includeMetadata: true
      };

      // Mock dialog to return temp directory
      const { dialog } = require('electron');
      dialog.showOpenDialog.mockResolvedValue({
        canceled: false,
        filePaths: [tempDir]
      });

      const result = await exportService.exportMultipleRaffles(
        ['raffle-1', 'raffle-2', 'raffle-3'],
        options
      );

      expect(result.successful).toHaveLength(3);
      expect(result.failed).toHaveLength(0);
      expect(result.totalProcessed).toBe(3);

      // Verify files were created
      const files = await fs.readdir(tempDir);
      expect(files.filter(f => f.endsWith('.csv'))).toHaveLength(3);
    });

    it('should export multiple raffles as combined file', async () => {
      const outputPath = path.join(tempDir, 'combined-export.json');
      const options: BulkExportOptions = {
        format: 'json',
        exportType: 'combined',
        includeDrawingHistory: true,
        includeParticipants: true,
        includeMetadata: true
      };

      // Mock dialog to return output path
      const { dialog } = require('electron');
      dialog.showSaveDialog.mockResolvedValue({
        canceled: false,
        filePath: outputPath
      });

      const result = await exportService.exportMultipleRaffles(
        ['raffle-1', 'raffle-2'],
        options
      );

      expect(result.successful).toHaveLength(2);
      expect(result.outputPath).toBe(outputPath);

      const content = await fs.readFile(outputPath, 'utf8');
      const data = JSON.parse(content);
      
      expect(data.raffles).toHaveLength(2);
      expect(data.exportInfo.raffleCount).toBe(2);
    });

    it('should export multiple raffles as ZIP archive', async () => {
      const outputPath = path.join(tempDir, 'bulk-export.zip');
      const options: BulkExportOptions = {
        format: 'csv',
        exportType: 'zip',
        includeDrawingHistory: true,
        includeParticipants: true,
        includeMetadata: true
      };

      // Mock dialog to return output path
      const { dialog } = require('electron');
      dialog.showSaveDialog.mockResolvedValue({
        canceled: false,
        filePath: outputPath
      });

      const result = await exportService.exportMultipleRaffles(
        ['raffle-1', 'raffle-2'],
        options
      );

      expect(result.successful).toHaveLength(2);
      expect(result.outputPath).toBe(outputPath);
    });

    it('should handle partial failures in bulk export', async () => {
      // Make one raffle fail
      mockDatabaseService.getRaffle.mockImplementation(async (id: string) => {
        if (id === 'raffle-2') return null;
        return multipleRaffles.find(r => r.id === id) || null;
      });

      const options: BulkExportOptions = {
        format: 'csv',
        exportType: 'separate',
        includeDrawingHistory: true,
        includeParticipants: true,
        includeMetadata: true
      };

      // Mock dialog to return temp directory
      const { dialog } = require('electron');
      dialog.showOpenDialog.mockResolvedValue({
        canceled: false,
        filePaths: [tempDir]
      });

      const result = await exportService.exportMultipleRaffles(
        ['raffle-1', 'raffle-2', 'raffle-3'],
        options
      );

      expect(result.successful).toHaveLength(2);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].id).toBe('raffle-2');
      expect(result.failed[0].error).toContain('not found');
    });

    it('should handle user cancellation', async () => {
      const options: BulkExportOptions = {
        format: 'csv',
        exportType: 'separate',
        includeDrawingHistory: true,
        includeParticipants: true,
        includeMetadata: true
      };

      // Mock dialog to return cancelled
      const { dialog } = require('electron');
      dialog.showOpenDialog.mockResolvedValue({
        canceled: true,
        filePaths: []
      });

      const result = await exportService.exportMultipleRaffles(
        ['raffle-1'],
        options
      );

      expect(result.successful).toHaveLength(0);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].error).toContain('cancelled');
    });
  });

  describe('Export History Management', () => {
    it('should record export history for successful exports', async () => {
      const outputPath = path.join(tempDir, 'history-test.csv');
      
      await exportService.exportRaffleResults('raffle-1', outputPath, {
        format: 'csv',
        includeMetadata: true
      });

      const history = await exportService.getExportHistory();
      expect(history).toHaveLength(1);
      
      const entry = history[0];
      expect(entry.exportType).toBe('individual');
      expect(entry.format).toBe('csv');
      expect(entry.raffleIds).toEqual(['raffle-1']);
      expect(entry.success).toBe(true);
      expect(entry.outputPath).toBe(outputPath);
    });

    it('should record export history for failed exports', async () => {
      mockDatabaseService.getRaffle.mockResolvedValue(null);
      
      await exportService.exportRaffleResults('nonexistent', undefined, {
        format: 'csv',
        includeMetadata: true
      });

      const history = await exportService.getExportHistory();
      expect(history).toHaveLength(1);
      
      const entry = history[0];
      expect(entry.success).toBe(false);
      expect(entry.error).toBeDefined();
    });

    it('should clear export history', async () => {
      // Create some history first
      const outputPath = path.join(tempDir, 'clear-test.csv');
      await exportService.exportRaffleResults('raffle-1', outputPath, {
        format: 'csv',
        includeMetadata: true
      });

      let history = await exportService.getExportHistory();
      expect(history).toHaveLength(1);

      await exportService.clearExportHistory();
      
      history = await exportService.getExportHistory();
      expect(history).toHaveLength(0);
    });

    it('should limit history to 100 entries', async () => {
      // This test would be slow with real exports, so we'll mock the history file
      const historyPath = path.join('/mock/user/data', 'export-history.json');
      
      // Create 101 mock entries
      const mockEntries: ExportHistoryEntry[] = Array.from({ length: 101 }, (_, i) => ({
        id: `entry-${i}`,
        timestamp: new Date(),
        exportType: 'individual',
        format: 'csv',
        raffleIds: [`raffle-${i}`],
        outputPath: `/path/to/export-${i}.csv`,
        fileCount: 1,
        success: true
      }));

      // Mock fs.readFile to return the large history
      const originalReadFile = fs.readFile;
      (fs.readFile as jest.Mock) = jest.fn().mockImplementation(async (path: string, encoding: string) => {
        if (path === historyPath) {
          return JSON.stringify(mockEntries);
        }
        return originalReadFile(path, encoding);
      });

      // Mock fs.writeFile to capture what gets written
      let writtenData: string = '';
      (fs.writeFile as jest.Mock) = jest.fn().mockImplementation(async (path: string, data: string) => {
        if (path === historyPath) {
          writtenData = data;
        }
      });

      // Trigger a new export to cause history update
      const outputPath = path.join(tempDir, 'limit-test.csv');
      await exportService.exportRaffleResults('raffle-1', outputPath, {
        format: 'csv',
        includeMetadata: true
      });

      // Verify that only 100 entries were kept
      const savedHistory = JSON.parse(writtenData);
      expect(savedHistory).toHaveLength(100);
    });
  });

  describe('Re-export Functionality', () => {
    it('should re-export using previous settings', async () => {
      // First, create an export to generate history
      const outputPath = path.join(tempDir, 'original-export.csv');
      await exportService.exportRaffleResults('raffle-1', outputPath, {
        format: 'csv',
        includeMetadata: true
      });

      const history = await exportService.getExportHistory();
      const historyEntry = history[0];

      // Mock dialog for re-export
      const { dialog } = require('electron');
      dialog.showSaveDialog.mockResolvedValue({
        canceled: false,
        filePath: path.join(tempDir, 're-export.csv')
      });

      const result = await exportService.reExport(historyEntry.id);
      
      expect(result.success).toBe(true);
      expect(result.outputPath).toBeDefined();
    });

    it('should handle re-export of non-existent history entry', async () => {
      await expect(exportService.reExport('nonexistent-id')).rejects.toThrow('not found');
    });
  });

  describe('File Dialog Integration', () => {
    it('should handle save dialog cancellation', async () => {
      const { dialog } = require('electron');
      dialog.showSaveDialog.mockResolvedValue({
        canceled: true,
        filePath: undefined
      });

      const result = await exportService.exportRaffleResults('raffle-1', undefined, {
        format: 'csv',
        includeMetadata: true
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('cancelled');
    });

    it('should use provided output path when given', async () => {
      const outputPath = path.join(tempDir, 'provided-path.csv');
      
      const result = await exportService.exportRaffleResults('raffle-1', outputPath, {
        format: 'csv',
        includeMetadata: true
      });

      expect(result.success).toBe(true);
      expect(result.outputPath).toBe(outputPath);
    });
  });

  describe('Error Handling', () => {
    it('should handle file system errors gracefully', async () => {
      const invalidPath = '/invalid/path/export.csv';
      
      const result = await exportService.exportRaffleResults('raffle-1', invalidPath, {
        format: 'csv',
        includeMetadata: true
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle database service errors', async () => {
      mockDatabaseService.getRaffle.mockRejectedValue(new Error('Database connection failed'));
      
      const result = await exportService.exportRaffleResults('raffle-1', undefined, {
        format: 'csv',
        includeMetadata: true
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database connection failed');
    });

    it('should handle file service errors', async () => {
      mockFileService.loadParticipants.mockRejectedValue(new Error('Failed to load participants'));
      
      const result = await exportService.exportRaffleResults('raffle-1', path.join(tempDir, 'error-test.csv'), {
        format: 'csv',
        includeMetadata: true
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to load participants');
    });
  });

  describe('Format Validation', () => {
    it('should reject unsupported export formats', async () => {
      const result = await exportService.exportRaffleResults('raffle-1', path.join(tempDir, 'test.xml'), {
        format: 'xml' as any,
        includeMetadata: true
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported export format');
    });

    it('should reject unsupported bulk export types', async () => {
      const options: BulkExportOptions = {
        format: 'csv',
        exportType: 'invalid' as any,
        includeDrawingHistory: true,
        includeParticipants: true,
        includeMetadata: true
      };

      const result = await exportService.exportMultipleRaffles(['raffle-1'], options);

      expect(result.successful).toHaveLength(0);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].error).toContain('Unsupported export type');
    });
  });
});