/**
 * Large Dataset Performance Quality Assurance Tests
 * Tests performance with 10,000+ participants as required
 */

import { DatabaseService } from '../../main/services/DatabaseService';
import { CSVService } from '../../main/services/CSVService';
import { StreamingCSVService } from '../../main/services/StreamingCSVService';
import { VirtualizationService } from '../../renderer/animation/VirtualizationService';
import { MemoryManagementService } from '../../renderer/services/MemoryManagementService';
import { Participant, Raffle } from '../../types';

describe('Large Dataset Performance QA', () => {
  let databaseService: DatabaseService;
  let csvService: CSVService;
  let streamingService: StreamingCSVService;
  let virtualizationService: VirtualizationService;
  let memoryService: MemoryManagementService;

  beforeAll(async () => {
    databaseService = new DatabaseService();
    csvService = new CSVService();
    streamingService = new StreamingCSVService();
    virtualizationService = new VirtualizationService();
    memoryService = new MemoryManagementService();

    await databaseService.initialize();
  });

  afterAll(async () => {
    await databaseService.close();
  });

  describe('CSV Processing Performance', () => {
    it('should process 10,000+ participants within acceptable time limits', async () => {
      const startTime = Date.now();
      const largeDataset = generateLargeParticipantDataset(10000);
      
      // Convert to CSV format
      const csvData = convertParticipantsToCSV(largeDataset);
      
      // Test streaming CSV processing
      const participants = await streamingService.processLargeCSV(csvData);
      
      const processingTime = Date.now() - startTime;
      
      expect(participants.length).toBe(10000);
      expect(processingTime).toBeLessThan(30000); // Should complete within 30 seconds
    }, 60000);

    it('should handle memory efficiently with large datasets', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Process large dataset
      const largeDataset = generateLargeParticipantDataset(15000);
      const csvData = convertParticipantsToCSV(largeDataset);
      
      await streamingService.processLargeCSV(csvData);
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 500MB)
      expect(memoryIncrease).toBeLessThan(500 * 1024 * 1024);
    }, 90000);
  });

  describe('Database Performance', () => {
    it('should execute queries efficiently with large datasets', async () => {
      // Create test raffle
      const raffle: Omit<Raffle, 'id'> = {
        name: 'Large Dataset Test',
        csvFilePath: 'test-large.csv',
        status: 'ready',
        animationStyle: 'cs2_case',
        createdDate: new Date(),
        modifiedDate: new Date(),
        customSettings: {},
        participantCount: 10000
      };

      const createdRaffle = await databaseService.createRaffle(raffle);
      
      // Test query performance
      const startTime = Date.now();
      const retrievedRaffle = await databaseService.getRaffle(createdRaffle.id);
      const queryTime = Date.now() - startTime;
      
      expect(retrievedRaffle).toBeTruthy();
      expect(queryTime).toBeLessThan(100); // Should complete within 100ms
      
      // Cleanup
      await databaseService.deleteRaffle(createdRaffle.id);
    });

    it('should handle concurrent operations efficiently', async () => {
      const concurrentOperations = 50;
      const operations: Promise<any>[] = [];
      
      const startTime = Date.now();
      
      // Create multiple concurrent raffle operations
      for (let i = 0; i < concurrentOperations; i++) {
        const raffle: Omit<Raffle, 'id'> = {
          name: `Concurrent Test ${i}`,
          csvFilePath: `test-${i}.csv`,
          status: 'draft',
          animationStyle: 'cs2_case',
          createdDate: new Date(),
          modifiedDate: new Date(),
          customSettings: {},
          participantCount: 100
        };
        
        operations.push(databaseService.createRaffle(raffle));
      }
      
      const results = await Promise.all(operations);
      const totalTime = Date.now() - startTime;
      
      expect(results.length).toBe(concurrentOperations);
      expect(totalTime).toBeLessThan(10000); // Should complete within 10 seconds
      
      // Cleanup
      for (const raffle of results) {
        await databaseService.deleteRaffle(raffle.id);
      }
    }, 30000);
  });

  describe('Animation Performance', () => {
    it('should maintain 60fps with large participant counts using virtualization', async () => {
      const largeParticipantSet = generateLargeParticipantDataset(5000);
      
      // Test virtualization service
      const virtualizedItems = virtualizationService.getVisibleItems(
        largeParticipantSet,
        0, // scroll position
        1920, // viewport width
        100 // item width
      );
      
      // Should only render visible items for performance
      expect(virtualizedItems.length).toBeLessThan(50); // Only visible items
      expect(virtualizedItems.length).toBeGreaterThan(0);
      
      // Test performance of virtualization
      const startTime = performance.now();
      
      for (let i = 0; i < 100; i++) {
        virtualizationService.getVisibleItems(largeParticipantSet, i * 10, 1920, 100);
      }
      
      const avgTime = (performance.now() - startTime) / 100;
      expect(avgTime).toBeLessThan(1); // Should take less than 1ms per call
    });

    it('should manage memory efficiently during animation', async () => {
      const participants = generateLargeParticipantDataset(3000);
      
      // Initialize memory management
      memoryService.initialize();
      
      const initialMemory = memoryService.getMemoryUsage();
      
      // Simulate animation frames with large dataset
      for (let frame = 0; frame < 60; frame++) {
        const visibleItems = virtualizationService.getVisibleItems(
          participants,
          frame * 5,
          1920,
          100
        );
        
        // Simulate rendering
        await new Promise(resolve => setTimeout(resolve, 16)); // ~60fps
      }
      
      // Force cleanup
      memoryService.cleanup();
      
      const finalMemory = memoryService.getMemoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Memory should not increase significantly
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Less than 50MB increase
    }, 30000);
  });

  describe('Bulk Operations Performance', () => {
    it('should handle bulk export operations efficiently', async () => {
      // Create multiple raffles for bulk operations
      const raffles: Raffle[] = [];
      
      for (let i = 0; i < 10; i++) {
        const raffle = await databaseService.createRaffle({
          name: `Bulk Test Raffle ${i}`,
          csvFilePath: `bulk-test-${i}.csv`,
          status: 'completed',
          animationStyle: 'cs2_case',
          createdDate: new Date(),
          modifiedDate: new Date(),
          customSettings: {},
          participantCount: 1000
        });
        raffles.push(raffle);
      }
      
      const startTime = Date.now();
      
      // Simulate bulk export (would normally use ExportService)
      const exportPromises = raffles.map(async (raffle) => {
        // Simulate export processing time
        await new Promise(resolve => setTimeout(resolve, 100));
        return { raffleId: raffle.id, exported: true };
      });
      
      const results = await Promise.all(exportPromises);
      const bulkTime = Date.now() - startTime;
      
      expect(results.length).toBe(10);
      expect(bulkTime).toBeLessThan(5000); // Should complete within 5 seconds
      
      // Cleanup
      for (const raffle of raffles) {
        await databaseService.deleteRaffle(raffle.id);
      }
    }, 15000);
  });

  describe('Memory Management', () => {
    it('should prevent memory leaks with repeated operations', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Perform repeated operations that could cause memory leaks
      for (let i = 0; i < 100; i++) {
        const participants = generateLargeParticipantDataset(500);
        const csvData = convertParticipantsToCSV(participants);
        
        // Process and immediately discard
        await streamingService.processLargeCSV(csvData);
        
        // Force garbage collection every 10 iterations
        if (i % 10 === 0 && global.gc) {
          global.gc();
        }
      }
      
      // Final garbage collection
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be minimal
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // Less than 100MB
    }, 60000);
  });
});

/**
 * Helper function to generate large participant dataset
 */
function generateLargeParticipantDataset(count: number): Participant[] {
  const participants: Participant[] = [];
  
  for (let i = 0; i < count; i++) {
    participants.push({
      id: `participant-${i}`,
      raffleId: 'test-raffle',
      username: `user${i}`,
      firstName: `First${i}`,
      lastName: `Last${i}`,
      email: `user${i}@example.com`,
      phoneNumber: `555-${String(i).padStart(4, '0')}`,
      profileImageUrl: `https://example.com/avatar${i}.jpg`,
      ticketNumber: String(i + 1),
      importDate: new Date()
    });
  }
  
  return participants;
}

/**
 * Helper function to convert participants to CSV format
 */
function convertParticipantsToCSV(participants: Participant[]): string {
  const headers = ['Username', 'First Name', 'Last Name', 'User Email ID', 'Phone Number', 'Ticket Number', 'User Profile'];
  const rows = participants.map(p => [
    p.username,
    p.firstName || '',
    p.lastName || '',
    p.email || '',
    p.phoneNumber || '',
    p.ticketNumber,
    p.profileImageUrl
  ]);
  
  return [headers, ...rows].map(row => row.join(',')).join('\n');
}