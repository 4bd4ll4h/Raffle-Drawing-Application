import { ServiceManager } from '../ServiceManager';
import { app } from 'electron';
import fs from 'fs/promises';
import path from 'path';

// Mock electron app
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => '/tmp/test-service-manager')
  }
}));

describe('ServiceManager', () => {
  let serviceManager: ServiceManager;
  let testAppDataPath: string;

  beforeEach(async () => {
    testAppDataPath = `/tmp/test-service-manager-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    (app.getPath as jest.Mock).mockReturnValue(testAppDataPath);
    
    // Reset the singleton instance for each test
    (ServiceManager as any).instance = undefined;
    serviceManager = ServiceManager.getInstance();
  });

  afterEach(async () => {
    if (serviceManager.isInitialized()) {
      await serviceManager.shutdown();
    }
    
    // Clean up test directories
    try {
      await fs.rm(testAppDataPath, { recursive: true, force: true });
    } catch {
      // Directory might not exist, ignore errors
    }
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = ServiceManager.getInstance();
      const instance2 = ServiceManager.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      await expect(serviceManager.initialize()).resolves.not.toThrow();
      expect(serviceManager.isInitialized()).toBe(true);
    });

    it('should not initialize twice', async () => {
      await serviceManager.initialize();
      
      // Second initialization should not throw
      await expect(serviceManager.initialize()).resolves.not.toThrow();
      expect(serviceManager.isInitialized()).toBe(true);
    });

    it('should throw error when accessing services before initialization', () => {
      expect(() => serviceManager.getDatabaseService()).toThrow('ServiceManager not initialized');
      expect(() => serviceManager.getFileService()).toThrow('ServiceManager not initialized');
    });
  });

  describe('service access', () => {
    beforeEach(async () => {
      await serviceManager.initialize();
    });

    it('should provide access to database service', () => {
      const dbService = serviceManager.getDatabaseService();
      expect(dbService).toBeDefined();
    });

    it('should provide access to file service', () => {
      const fileService = serviceManager.getFileService();
      expect(fileService).toBeDefined();
    });
  });

  describe('convenience methods', () => {
    beforeEach(async () => {
      await serviceManager.initialize();
    });

    it('should create and retrieve raffle', async () => {
      const raffleData = {
        name: 'Test Raffle',
        csvFilePath: '/test/participants.csv',
        status: 'draft' as const,
        animationStyle: 'cs2_case' as const,
        createdDate: new Date(),
        modifiedDate: new Date(),
        customSettings: {},
        participantCount: 10
      };

      const created = await serviceManager.createRaffle(raffleData);
      expect(created).toBeDefined();
      expect(created.id).toBeDefined();

      const retrieved = await serviceManager.getRaffle(created.id);
      expect(retrieved).toBeDefined();
      expect(retrieved!.name).toBe(raffleData.name);
    });

    it('should update raffle', async () => {
      const raffleData = {
        name: 'Test Raffle',
        csvFilePath: '/test/participants.csv',
        status: 'draft' as const,
        animationStyle: 'cs2_case' as const,
        createdDate: new Date(),
        modifiedDate: new Date(),
        customSettings: {},
        participantCount: 10
      };

      const created = await serviceManager.createRaffle(raffleData);
      const updated = await serviceManager.updateRaffle(created.id, { name: 'Updated Raffle' });
      
      expect(updated.name).toBe('Updated Raffle');
    });

    it('should delete raffle and cleanup files', async () => {
      const raffleData = {
        name: 'Test Raffle',
        csvFilePath: '/test/participants.csv',
        status: 'draft' as const,
        animationStyle: 'cs2_case' as const,
        createdDate: new Date(),
        modifiedDate: new Date(),
        customSettings: {},
        participantCount: 10
      };

      const created = await serviceManager.createRaffle(raffleData);
      
      // Create raffle directory to test cleanup
      const fileService = serviceManager.getFileService();
      await fileService.createRaffleDirectory(created.id);
      
      await serviceManager.deleteRaffle(created.id);
      
      const retrieved = await serviceManager.getRaffle(created.id);
      expect(retrieved).toBeNull();
    });

    it('should get all raffles', async () => {
      const raffle1Data = {
        name: 'Raffle 1',
        csvFilePath: '/test/participants1.csv',
        status: 'draft' as const,
        animationStyle: 'cs2_case' as const,
        createdDate: new Date(),
        modifiedDate: new Date(),
        customSettings: {},
        participantCount: 5
      };

      const raffle2Data = {
        name: 'Raffle 2',
        csvFilePath: '/test/participants2.csv',
        status: 'ready' as const,
        animationStyle: 'spinning_wheel' as const,
        createdDate: new Date(),
        modifiedDate: new Date(),
        customSettings: {},
        participantCount: 15
      };

      await serviceManager.createRaffle(raffle1Data);
      await serviceManager.createRaffle(raffle2Data);

      const allRaffles = await serviceManager.getAllRaffles();
      expect(allRaffles).toHaveLength(2);
    });

    it('should record and retrieve drawing history', async () => {
      const raffleData = {
        name: 'Test Raffle',
        csvFilePath: '/test/participants.csv',
        status: 'completed' as const,
        animationStyle: 'cs2_case' as const,
        createdDate: new Date(),
        modifiedDate: new Date(),
        customSettings: {},
        participantCount: 10
      };

      const raffle = await serviceManager.createRaffle(raffleData);

      const drawingData = {
        raffleId: raffle.id,
        winnerUsername: 'testuser',
        winnerTicketNumber: 'T001',
        drawTimestamp: new Date(),
        drawSettings: {
          recordingEnabled: false,
          recordingQuality: '1080p' as const,
          animationStyle: 'cs2_case' as const
        }
      };

      const drawing = await serviceManager.recordDrawing(drawingData);
      expect(drawing).toBeDefined();

      const history = await serviceManager.getDrawingHistory(raffle.id);
      expect(history).toHaveLength(1);
      expect(history[0].winnerUsername).toBe('testuser');
    });

    it('should handle CSV operations', async () => {
      const raffleId = 'test-raffle-csv';
      const csvContent = Buffer.from('Username,Ticket Number\ntestuser,T001'); // Missing User Profile column
      
      const csvPath = await serviceManager.saveCSVFile(raffleId, csvContent, 'participants.csv');
      expect(csvPath).toBeDefined();

      const validation = await serviceManager.validateCSVFile(csvPath);
      // Should be invalid because it's missing required columns: First Name, Last Name, User Email ID, Phone Number
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);

      // Test with valid CSV
      const validCsvContent = Buffer.from('Username,First Name,Last Name,User Email ID,Phone Number,Ticket Number,User Profile\ntestuser,John,Doe,john@example.com,123-456-7890,T001,https://example.com/profile.jpg');
      const validCsvPath = await serviceManager.saveCSVFile(raffleId, validCsvContent, 'valid-participants.csv');
      
      const validValidation = await serviceManager.validateCSVFile(validCsvPath);
      expect(validValidation.isValid).toBe(true);

      const participants = await serviceManager.loadParticipants(validCsvPath);
      expect(participants).toHaveLength(1);
      expect(participants[0].username).toBe('testuser');
    });

    it('should handle background image operations', async () => {
      const raffleId = 'test-raffle-bg';
      const imageBuffer = Buffer.from('fake-image-data');
      
      const imagePath = await serviceManager.saveBackgroundImage(raffleId, imageBuffer, 'background.jpg');
      expect(imagePath).toBeDefined();
      expect(imagePath).toContain('background.jpg');
    });

    it('should generate recording file paths', () => {
      const raffleId = 'test-raffle-123';
      const raffleName = 'My Test Raffle';
      
      const recordingPath = serviceManager.generateRecordingFilePath(raffleId, raffleName);
      expect(recordingPath).toContain('My_Test_Raffle');
      expect(recordingPath).toContain(raffleId);
      expect(recordingPath.endsWith('.mp4')).toBe(true);
    });

    it('should handle settings operations', async () => {
      await serviceManager.setSetting('test_key', 'test_value', 'test_category');
      
      const value = await serviceManager.getSetting('test_key');
      expect(value).toBe('test_value');

      const categorySettings = await serviceManager.getSettingsByCategory('test_category');
      expect(categorySettings['test_key']).toBe('test_value');
    });

    it('should export raffle results', async () => {
      const raffleId = 'test-export';
      const results = [
        { winner: 'user1', ticket: 'T001' },
        { winner: 'user2', ticket: 'T002' }
      ];
      const exportPath = path.join(testAppDataPath, 'export-test.csv');
      
      // Ensure the directory exists
      await fs.mkdir(path.dirname(exportPath), { recursive: true });
      
      await serviceManager.exportRaffleResults(raffleId, results, exportPath);
      
      const fileService = serviceManager.getFileService();
      const exists = await fileService.fileExists(exportPath);
      expect(exists).toBe(true);
    });
  });

  describe('health check', () => {
    beforeEach(async () => {
      await serviceManager.initialize();
    });

    it('should perform health check successfully', async () => {
      const health = await serviceManager.healthCheck();
      
      expect(health.database).toBe(true);
      expect(health.fileSystem).toBe(true);
      expect(health.overall).toBe(true);
    });
  });

  describe('shutdown', () => {
    it('should shutdown successfully', async () => {
      await serviceManager.initialize();
      expect(serviceManager.isInitialized()).toBe(true);
      
      await serviceManager.shutdown();
      expect(serviceManager.isInitialized()).toBe(false);
    });

    it('should handle shutdown when not initialized', async () => {
      expect(serviceManager.isInitialized()).toBe(false);
      
      await expect(serviceManager.shutdown()).resolves.not.toThrow();
    });
  });
});