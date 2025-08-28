import { DatabaseService } from '../DatabaseService';
import { DatabaseError } from '../../errors/DatabaseError';
import { Raffle, Drawing } from '../../../types';
import fs from 'fs/promises';
import path from 'path';
import { app } from 'electron';

// Mock electron app
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => '/tmp/test-app-data')
  }
}));

describe('DatabaseService', () => {
  let dbService: DatabaseService;
  let testDbPath: string;

  beforeEach(async () => {
    // Create a unique test database path
    testDbPath = path.join('/tmp', `test-db-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.db`);
    
    // Mock the database path
    (app.getPath as jest.Mock).mockReturnValue(path.dirname(testDbPath));
    
    dbService = new DatabaseService();
    await dbService.initialize();
    
    // Clear all tables to ensure clean state
    await dbService.clearAllData();
  });

  afterEach(async () => {
    await dbService.close();
    
    // Clean up test database file
    try {
      await fs.unlink(testDbPath);
      await fs.unlink(`${testDbPath}-wal`);
      await fs.unlink(`${testDbPath}-shm`);
    } catch {
      // Files might not exist, ignore errors
    }
  });

  describe('initialization', () => {
    it('should initialize database successfully', async () => {
      const newDbService = new DatabaseService();
      await expect(newDbService.initialize()).resolves.not.toThrow();
      await newDbService.close();
    });

    it('should create all required tables', async () => {
      // Database should be initialized in beforeEach
      // Test by trying to insert data
      const testRaffle: Omit<Raffle, 'id'> = {
        name: 'Test Raffle',
        csvFilePath: '/test/path.csv',
        status: 'draft',
        animationStyle: 'cs2_case',
        createdDate: new Date(),
        modifiedDate: new Date(),
        customSettings: {},
        participantCount: 0
      };

      await expect(dbService.createRaffle(testRaffle)).resolves.toBeDefined();
    });
  });

  describe('raffle operations', () => {
    const mockRaffle: Omit<Raffle, 'id'> = {
      name: 'Test Raffle',
      backgroundImagePath: '/test/bg.jpg',
      csvFilePath: '/test/participants.csv',
      status: 'draft',
      animationStyle: 'cs2_case',
      createdDate: new Date(),
      modifiedDate: new Date(),
      customSettings: {
        colorScheme: {
          primary: '#ff0000',
          secondary: '#00ff00',
          accent: '#0000ff',
          background: '#ffffff'
        },
        logoPosition: 'top-left',
        animationDuration: 5000,
        soundEnabled: true
      },
      participantCount: 100
    };

    it('should create a raffle successfully', async () => {
      const result = await dbService.createRaffle(mockRaffle);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.name).toBe(mockRaffle.name);
      expect(result.status).toBe(mockRaffle.status);
      expect(result.animationStyle).toBe(mockRaffle.animationStyle);
      expect(result.participantCount).toBe(mockRaffle.participantCount);
    });

    it('should retrieve a raffle by id', async () => {
      const created = await dbService.createRaffle(mockRaffle);
      const retrieved = await dbService.getRaffle(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe(created.id);
      expect(retrieved!.name).toBe(mockRaffle.name);
    });

    it('should return null for non-existent raffle', async () => {
      const result = await dbService.getRaffle('non-existent-id');
      expect(result).toBeNull();
    });

    it('should update a raffle successfully', async () => {
      const created = await dbService.createRaffle(mockRaffle);
      const updates = {
        name: 'Updated Raffle Name',
        status: 'ready' as const,
        participantCount: 200
      };

      const updated = await dbService.updateRaffle(created.id, updates);

      expect(updated.name).toBe(updates.name);
      expect(updated.status).toBe(updates.status);
      expect(updated.participantCount).toBe(updates.participantCount);
      expect(updated.modifiedDate.getTime()).toBeGreaterThanOrEqual(created.modifiedDate.getTime());
    });

    it('should throw error when updating non-existent raffle', async () => {
      await expect(
        dbService.updateRaffle('non-existent-id', { name: 'Updated' })
      ).rejects.toThrow('Raffle with id non-existent-id not found');
    });

    it('should delete a raffle successfully', async () => {
      const created = await dbService.createRaffle(mockRaffle);
      
      await expect(dbService.deleteRaffle(created.id)).resolves.not.toThrow();
      
      const retrieved = await dbService.getRaffle(created.id);
      expect(retrieved).toBeNull();
    });

    it('should throw error when deleting non-existent raffle', async () => {
      await expect(
        dbService.deleteRaffle('non-existent-id')
      ).rejects.toThrow('Raffle with id non-existent-id not found');
    });

    it('should get all raffles', async () => {
      const raffle1 = await dbService.createRaffle({ ...mockRaffle, name: 'Raffle 1' });
      const raffle2 = await dbService.createRaffle({ ...mockRaffle, name: 'Raffle 2' });

      const allRaffles = await dbService.getAllRaffles();

      expect(allRaffles).toHaveLength(2);
      expect(allRaffles.map(r => r.id)).toContain(raffle1.id);
      expect(allRaffles.map(r => r.id)).toContain(raffle2.id);
    });
  });

  describe('drawing operations', () => {
    let testRaffleId: string;

    beforeEach(async () => {
      const raffle = await dbService.createRaffle({
        name: 'Test Raffle',
        csvFilePath: '/test/participants.csv',
        status: 'ready',
        animationStyle: 'cs2_case',
        createdDate: new Date(),
        modifiedDate: new Date(),
        customSettings: {},
        participantCount: 10
      });
      testRaffleId = raffle.id;
    });

    const mockDrawing: Omit<Drawing, 'id'> = {
      raffleId: '',
      winnerUsername: 'testuser',
      winnerTicketNumber: 'T001',
      drawTimestamp: new Date(),
      randomOrgVerification: 'verification-data',
      recordingFilePath: '/recordings/test.mp4',
      drawSettings: {
        recordingEnabled: true,
        recordingQuality: '1080p',
        animationStyle: 'cs2_case'
      }
    };

    it('should record a drawing successfully', async () => {
      const drawingData = { ...mockDrawing, raffleId: testRaffleId };
      const result = await dbService.recordDrawing(drawingData);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.raffleId).toBe(testRaffleId);
      expect(result.winnerUsername).toBe(mockDrawing.winnerUsername);
      expect(result.winnerTicketNumber).toBe(mockDrawing.winnerTicketNumber);
    });

    it('should get drawing history for all raffles', async () => {
      const drawing1 = { ...mockDrawing, raffleId: testRaffleId, winnerUsername: 'user1' };
      const drawing2 = { ...mockDrawing, raffleId: testRaffleId, winnerUsername: 'user2' };

      await dbService.recordDrawing(drawing1);
      await dbService.recordDrawing(drawing2);

      const history = await dbService.getDrawingHistory();

      expect(history).toHaveLength(2);
      expect(history.map(d => d.winnerUsername)).toContain('user1');
      expect(history.map(d => d.winnerUsername)).toContain('user2');
    });

    it('should get drawing history for specific raffle', async () => {
      const drawing1 = { ...mockDrawing, raffleId: testRaffleId, winnerUsername: 'user1' };
      
      // Create another raffle and drawing
      const raffle2 = await dbService.createRaffle({
        name: 'Test Raffle 2',
        csvFilePath: '/test/participants2.csv',
        status: 'ready',
        animationStyle: 'spinning_wheel',
        createdDate: new Date(),
        modifiedDate: new Date(),
        customSettings: {},
        participantCount: 5
      });
      const drawing2 = { ...mockDrawing, raffleId: raffle2.id, winnerUsername: 'user2' };

      await dbService.recordDrawing(drawing1);
      await dbService.recordDrawing(drawing2);

      const history = await dbService.getDrawingHistory(testRaffleId);

      expect(history).toHaveLength(1);
      expect(history[0].winnerUsername).toBe('user1');
      expect(history[0].raffleId).toBe(testRaffleId);
    });
  });

  describe('settings operations', () => {
    it('should set and get a setting', async () => {
      await dbService.setSetting('test_key', 'test_value', 'test_category');
      
      const value = await dbService.getSetting('test_key');
      expect(value).toBe('test_value');
    });

    it('should return null for non-existent setting', async () => {
      const value = await dbService.getSetting('non_existent_key');
      expect(value).toBeNull();
    });

    it('should update existing setting', async () => {
      await dbService.setSetting('test_key', 'initial_value');
      await dbService.setSetting('test_key', 'updated_value');
      
      const value = await dbService.getSetting('test_key');
      expect(value).toBe('updated_value');
    });

    it('should get settings by category', async () => {
      await dbService.setSetting('key1', 'value1', 'category1');
      await dbService.setSetting('key2', 'value2', 'category1');
      await dbService.setSetting('key3', 'value3', 'category2');

      const category1Settings = await dbService.getSettingsByCategory('category1');
      
      expect(Object.keys(category1Settings)).toHaveLength(2);
      expect(category1Settings['key1']).toBe('value1');
      expect(category1Settings['key2']).toBe('value2');
      expect(category1Settings['key3']).toBeUndefined();
    });
  });

  describe('migration system', () => {
    it('should run migrations successfully', async () => {
      await expect(dbService.runMigrations()).resolves.not.toThrow();
    });

    it('should set schema version after migrations', async () => {
      await dbService.runMigrations();
      
      const version = await dbService.getSetting('schema_version');
      expect(version).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should throw DatabaseError for invalid operations', async () => {
      await dbService.close();
      
      await expect(
        dbService.createRaffle({
          name: 'Test',
          csvFilePath: '/test.csv',
          status: 'draft',
          animationStyle: 'cs2_case',
          createdDate: new Date(),
          modifiedDate: new Date(),
          customSettings: {},
          participantCount: 0
        })
      ).rejects.toThrow('Database not initialized');
    });
  });

  describe('utility methods', () => {
    it('should generate unique IDs', async () => {
      const raffle1 = await dbService.createRaffle({
        name: 'Raffle 1',
        csvFilePath: '/test1.csv',
        status: 'draft',
        animationStyle: 'cs2_case',
        createdDate: new Date(),
        modifiedDate: new Date(),
        customSettings: {},
        participantCount: 0
      });

      const raffle2 = await dbService.createRaffle({
        name: 'Raffle 2',
        csvFilePath: '/test2.csv',
        status: 'draft',
        animationStyle: 'cs2_case',
        createdDate: new Date(),
        modifiedDate: new Date(),
        customSettings: {},
        participantCount: 0
      });

      expect(raffle1.id).not.toBe(raffle2.id);
      expect(raffle1.id).toBeDefined();
      expect(raffle2.id).toBeDefined();
    });
  });
});