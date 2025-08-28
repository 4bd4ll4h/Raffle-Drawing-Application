import { FileService } from '../FileService';
import { CSVValidationResult, Participant } from '../../../types';
import fs from 'fs/promises';
import path from 'path';
import { app } from 'electron';

// Mock electron app
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => '/tmp/test-app-data')
  }
}));

describe('FileService', () => {
  let fileService: FileService;
  let testAppDataPath: string;
  let testRafflesPath: string;
  let testRecordingsPath: string;

  beforeEach(async () => {
    testAppDataPath = `/tmp/test-app-data-${Date.now()}`;
    testRafflesPath = path.join(testAppDataPath, 'raffles');
    testRecordingsPath = path.join(testAppDataPath, 'recordings');

    (app.getPath as jest.Mock).mockReturnValue(testAppDataPath);
    
    fileService = new FileService();
    await fileService.initialize();
  });

  afterEach(async () => {
    // Clean up test directories
    try {
      await fs.rm(testAppDataPath, { recursive: true, force: true });
    } catch {
      // Directory might not exist, ignore errors
    }
  });

  describe('initialization', () => {
    it('should create necessary directories', async () => {
      const appDataExists = await fileService.fileExists(testAppDataPath);
      const rafflesExists = await fileService.fileExists(testRafflesPath);
      const recordingsExists = await fileService.fileExists(testRecordingsPath);

      expect(appDataExists).toBe(true);
      expect(rafflesExists).toBe(true);
      expect(recordingsExists).toBe(true);
    });
  });

  describe('directory management', () => {
    it('should create raffle directory', async () => {
      const raffleId = 'test-raffle-123';
      const rafflePath = await fileService.createRaffleDirectory(raffleId);
      
      expect(rafflePath).toBe(path.join(testRafflesPath, `raffle-${raffleId}`));
      
      const exists = await fileService.fileExists(rafflePath);
      expect(exists).toBe(true);
    });

    it('should delete raffle directory', async () => {
      const raffleId = 'test-raffle-456';
      const rafflePath = await fileService.createRaffleDirectory(raffleId);
      
      // Verify directory exists
      let exists = await fileService.fileExists(rafflePath);
      expect(exists).toBe(true);
      
      await fileService.deleteRaffleDirectory(raffleId);
      
      // Verify directory is deleted
      exists = await fileService.fileExists(rafflePath);
      expect(exists).toBe(false);
    });

    it('should get correct raffle path', () => {
      const raffleId = 'test-raffle-789';
      const expectedPath = path.join(testRafflesPath, `raffle-${raffleId}`);
      const actualPath = fileService.getRafflePath(raffleId);
      
      expect(actualPath).toBe(expectedPath);
    });

    it('should get recordings path', () => {
      const recordingsPath = fileService.getRecordingsPath();
      expect(recordingsPath).toBe(testRecordingsPath);
    });
  });

  describe('CSV file operations', () => {
    const validCSVContent = `Username,First Name,Last Name,User Email ID,Phone Number,Ticket Number,User Profile
testuser1,John,Doe,john@example.com,123-456-7890,T001,https://example.com/profile1.jpg
testuser2,Jane,Smith,jane@example.com,098-765-4321,T002,https://example.com/profile2.jpg`;

    const invalidCSVContent = `Username,Ticket Number
testuser1,T001
testuser2,T001`; // Missing required column and duplicate ticket

    it('should save CSV file successfully', async () => {
      const raffleId = 'test-raffle-csv';
      const csvBuffer = Buffer.from(validCSVContent, 'utf8');
      
      const csvPath = await fileService.saveCSVFile(raffleId, csvBuffer, 'participants.csv');
      
      expect(csvPath).toBe(path.join(testRafflesPath, `raffle-${raffleId}`, 'participants.csv'));
      
      const exists = await fileService.fileExists(csvPath);
      expect(exists).toBe(true);
      
      const content = await fs.readFile(csvPath, 'utf8');
      expect(content).toBe(validCSVContent);
    });

    it('should load participants from CSV file', async () => {
      const raffleId = 'test-raffle-load';
      const csvBuffer = Buffer.from(validCSVContent, 'utf8');
      const csvPath = await fileService.saveCSVFile(raffleId, csvBuffer, 'participants.csv');
      
      const participants = await fileService.loadParticipants(csvPath, raffleId);
      
      expect(participants).toHaveLength(2);
      expect(participants[0].username).toBe('testuser1');
      expect(participants[0].firstName).toBe('John');
      expect(participants[0].lastName).toBe('Doe');
      expect(participants[0].email).toBe('john@example.com');
      expect(participants[0].ticketNumber).toBe('T001');
      expect(participants[1].username).toBe('testuser2');
      expect(participants[1].ticketNumber).toBe('T002');
    });

    it('should validate CSV file successfully', async () => {
      const raffleId = 'test-raffle-validate';
      const csvBuffer = Buffer.from(validCSVContent, 'utf8');
      const csvPath = await fileService.saveCSVFile(raffleId, csvBuffer, 'participants.csv');
      
      const result = await fileService.validateCSVFile(csvPath, raffleId);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.participantCount).toBe(2);
      expect(result.preview).toHaveLength(2);
    });

    it('should detect CSV validation errors', async () => {
      const raffleId = 'test-raffle-invalid';
      const csvBuffer = Buffer.from(invalidCSVContent, 'utf8');
      const csvPath = await fileService.saveCSVFile(raffleId, csvBuffer, 'participants.csv');
      
      const result = await fileService.validateCSVFile(csvPath, raffleId);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      
      // Should detect missing User Profile column
      const missingColumnError = result.errors.find(e => e.type === 'missing_column');
      expect(missingColumnError).toBeDefined();
      
      // Should detect duplicate ticket numbers
      const duplicateError = result.errors.find(e => e.type === 'duplicate_ticket');
      expect(duplicateError).toBeDefined();
    });

    it('should delete CSV file', async () => {
      const raffleId = 'test-raffle-delete';
      const csvBuffer = Buffer.from(validCSVContent, 'utf8');
      const csvPath = await fileService.saveCSVFile(raffleId, csvBuffer, 'participants.csv');
      
      // Verify file exists
      let exists = await fileService.fileExists(csvPath);
      expect(exists).toBe(true);
      
      await fileService.deleteCSVFile(csvPath);
      
      // Verify file is deleted
      exists = await fileService.fileExists(csvPath);
      expect(exists).toBe(false);
    });
  });

  describe('background image operations', () => {
    it('should save background image', async () => {
      const raffleId = 'test-raffle-bg';
      const imageBuffer = Buffer.from('fake-image-data');
      const originalFilename = 'background.jpg';
      
      const imagePath = await fileService.saveBackgroundImage(raffleId, imageBuffer, originalFilename);
      
      expect(imagePath).toBe(path.join(testRafflesPath, `raffle-${raffleId}`, 'background.jpg'));
      
      const exists = await fileService.fileExists(imagePath);
      expect(exists).toBe(true);
      
      const content = await fs.readFile(imagePath);
      expect(content).toEqual(imageBuffer);
    });

    it('should delete background image', async () => {
      const raffleId = 'test-raffle-bg-delete';
      const imageBuffer = Buffer.from('fake-image-data');
      const imagePath = await fileService.saveBackgroundImage(raffleId, imageBuffer, 'background.png');
      
      // Verify file exists
      let exists = await fileService.fileExists(imagePath);
      expect(exists).toBe(true);
      
      await fileService.deleteBackgroundImage(imagePath);
      
      // Verify file is deleted
      exists = await fileService.fileExists(imagePath);
      expect(exists).toBe(false);
    });
  });

  describe('recording file operations', () => {
    it('should generate recording file path', () => {
      const raffleId = 'test-raffle-123';
      const raffleName = 'My Test Raffle!';
      
      const recordingPath = fileService.generateRecordingFilePath(raffleId, raffleName);
      
      expect(recordingPath).toContain(testRecordingsPath);
      expect(recordingPath).toContain('My_Test_Raffle_');
      expect(recordingPath).toContain(raffleId);
      expect(recordingPath.endsWith('.mp4')).toBe(true);
    });

    it('should delete recording file', async () => {
      const recordingPath = path.join(testRecordingsPath, 'test-recording.mp4');
      
      // Create a test recording file
      await fs.writeFile(recordingPath, 'fake-video-data');
      
      // Verify file exists
      let exists = await fileService.fileExists(recordingPath);
      expect(exists).toBe(true);
      
      await fileService.deleteRecordingFile(recordingPath);
      
      // Verify file is deleted
      exists = await fileService.fileExists(recordingPath);
      expect(exists).toBe(false);
    });
  });

  describe('export operations', () => {
    it('should export raffle results to CSV', async () => {
      const raffleId = 'test-raffle-export';
      const results = [
        { winner: 'testuser1', ticket: 'T001', timestamp: '2023-01-01T00:00:00Z' },
        { winner: 'testuser2', ticket: 'T002', timestamp: '2023-01-02T00:00:00Z' }
      ];
      const exportPath = path.join(testAppDataPath, 'export-test.csv');
      
      await fileService.exportRaffleResults(raffleId, results, exportPath);
      
      const exists = await fileService.fileExists(exportPath);
      expect(exists).toBe(true);
      
      const content = await fs.readFile(exportPath, 'utf8');
      expect(content).toContain('winner,ticket,timestamp');
      expect(content).toContain('testuser1,T001');
      expect(content).toContain('testuser2,T002');
    });
  });

  describe('utility methods', () => {
    it('should check if file exists', async () => {
      const testFilePath = path.join(testAppDataPath, 'test-file.txt');
      
      // File doesn't exist initially
      let exists = await fileService.fileExists(testFilePath);
      expect(exists).toBe(false);
      
      // Create file
      await fs.writeFile(testFilePath, 'test content');
      
      // File should exist now
      exists = await fileService.fileExists(testFilePath);
      expect(exists).toBe(true);
    });

    it('should get file size', async () => {
      const testFilePath = path.join(testAppDataPath, 'size-test.txt');
      const testContent = 'This is a test file for size calculation';
      
      await fs.writeFile(testFilePath, testContent);
      
      const size = await fileService.getFileSize(testFilePath);
      expect(size).toBe(Buffer.byteLength(testContent, 'utf8'));
    });

    it('should get directory size', async () => {
      const testDirPath = path.join(testAppDataPath, 'size-test-dir');
      await fs.mkdir(testDirPath, { recursive: true });
      
      // Create some test files
      await fs.writeFile(path.join(testDirPath, 'file1.txt'), 'content1');
      await fs.writeFile(path.join(testDirPath, 'file2.txt'), 'content2');
      
      const size = await fileService.getDirectorySize(testDirPath);
      expect(size).toBeGreaterThan(0);
      expect(size).toBe(Buffer.byteLength('content1content2', 'utf8'));
    });

    it('should cleanup old files', async () => {
      // Create an old recording file
      const oldRecordingPath = path.join(testRecordingsPath, 'old-recording.mp4');
      await fs.writeFile(oldRecordingPath, 'old video data');
      
      // Modify the file's timestamp to make it old
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 35); // 35 days ago
      await fs.utimes(oldRecordingPath, oldDate, oldDate);
      
      // Create a recent recording file
      const recentRecordingPath = path.join(testRecordingsPath, 'recent-recording.mp4');
      await fs.writeFile(recentRecordingPath, 'recent video data');
      
      await fileService.cleanupOldFiles(30); // Clean files older than 30 days
      
      // Old file should be deleted
      const oldExists = await fileService.fileExists(oldRecordingPath);
      expect(oldExists).toBe(false);
      
      // Recent file should still exist
      const recentExists = await fileService.fileExists(recentRecordingPath);
      expect(recentExists).toBe(true);
    });
  });

  describe('CSV validation edge cases', () => {
    it('should handle empty CSV file', async () => {
      const raffleId = 'test-empty-csv';
      const csvBuffer = Buffer.from('', 'utf8');
      const csvPath = await fileService.saveCSVFile(raffleId, csvBuffer, 'empty.csv');
      
      const result = await fileService.validateCSVFile(csvPath, raffleId);
      
      expect(result.isValid).toBe(false);
      expect(result.participantCount).toBe(0);
    });

    it('should handle CSV with only headers', async () => {
      const raffleId = 'test-headers-only';
      const csvContent = 'Username,First Name,Last Name,User Email ID,Phone Number,Ticket Number,User Profile';
      const csvBuffer = Buffer.from(csvContent, 'utf8');
      const csvPath = await fileService.saveCSVFile(raffleId, csvBuffer, 'headers-only.csv');
      
      const result = await fileService.validateCSVFile(csvPath, raffleId);
      
      expect(result.isValid).toBe(false);
      expect(result.participantCount).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toBe('CSV file is empty');
    });

    it('should handle invalid email formats', async () => {
      const raffleId = 'test-invalid-email';
      const csvContent = `Username,First Name,Last Name,User Email ID,Phone Number,Ticket Number,User Profile
testuser1,John,Doe,invalid-email,123-456-7890,T001,https://example.com/profile1.jpg`;
      const csvBuffer = Buffer.from(csvContent, 'utf8');
      const csvPath = await fileService.saveCSVFile(raffleId, csvBuffer, 'invalid-email.csv');
      
      const result = await fileService.validateCSVFile(csvPath, raffleId);
      
      expect(result.isValid).toBe(false); // Should be invalid due to email format error
      expect(result.errors.length).toBeGreaterThan(0);
      
      const emailError = result.errors.find(e => e.column === 'User Email ID');
      expect(emailError).toBeDefined();
    });

    it('should handle invalid URL formats', async () => {
      const raffleId = 'test-invalid-url';
      const csvContent = `Username,First Name,Last Name,User Email ID,Phone Number,Ticket Number,User Profile
testuser1,John,Doe,john@example.com,123-456-7890,T001,not-a-valid-url`;
      const csvBuffer = Buffer.from(csvContent, 'utf8');
      const csvPath = await fileService.saveCSVFile(raffleId, csvBuffer, 'invalid-url.csv');
      
      const result = await fileService.validateCSVFile(csvPath, raffleId);
      
      expect(result.isValid).toBe(false); // Should be invalid due to URL format error
      expect(result.errors.length).toBeGreaterThan(0);
      
      const urlError = result.errors.find(e => e.column === 'User Profile');
      expect(urlError).toBeDefined();
    });
  });
});