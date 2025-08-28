import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StreamingCSVService } from '../../main/services/StreamingCSVService';
import { VirtualizationService } from '../../renderer/animation/VirtualizationService';
import { MemoryManagementService } from '../../renderer/services/MemoryManagementService';
import { Participant } from '../../types';
import * as fs from 'fs/promises';
import * as path from 'path';

// Mock performance.memory for testing
Object.defineProperty(performance, 'memory', {
  value: {
    usedJSHeapSize: 50 * 1024 * 1024, // 50MB
    totalJSHeapSize: 100 * 1024 * 1024, // 100MB
    jsHeapSizeLimit: 200 * 1024 * 1024, // 200MB
  },
  configurable: true
});

describe('Basic Performance Tests', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = path.join(__dirname, 'temp-basic-test');
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('Streaming CSV Service', () => {
    it('should create and validate a small CSV file', async () => {
      const csvPath = await createSmallCSV(100);
      const streamingService = new StreamingCSVService();

      const result = await streamingService.streamValidateCSV(csvPath, 'test-raffle', {
        batchSize: 50
      });

      expect(result.isValid).toBe(true);
      expect(result.participantCount).toBe(100);
      expect(result.preview.length).toBeGreaterThan(0);
    });

    it('should count participants efficiently', async () => {
      const csvPath = await createSmallCSV(500);
      const streamingService = new StreamingCSVService();

      const result = await streamingService.getParticipantCountStreaming(csvPath);

      expect(result.count).toBe(500);
      expect(result.cancelled).toBe(false);
    });
  });

  describe('Virtualization Service', () => {
    it('should initialize with participants', () => {
      const participants = generateMockParticipants(100);
      const virtualizationService = new VirtualizationService({
        viewportWidth: 1920,
        viewportHeight: 1080,
        itemWidth: 100,
        itemHeight: 100,
        bufferSize: 5,
        maxVisibleItems: 20
      });

      virtualizationService.initialize(participants);
      
      const viewport = virtualizationService.getHorizontalViewport(0);
      expect(viewport.totalItems).toBe(100);
      expect(viewport.visibleItems.length).toBeLessThanOrEqual(20);
    });

    it('should optimize for large datasets', () => {
      const participants = generateMockParticipants(1000);
      const virtualizationService = new VirtualizationService({
        viewportWidth: 1920,
        viewportHeight: 1080,
        itemWidth: 100,
        itemHeight: 100,
        bufferSize: 10,
        maxVisibleItems: 50
      });

      virtualizationService.initialize(participants);
      virtualizationService.optimizeForLargeDataset();
      
      const memoryStats = virtualizationService.getMemoryStats();
      expect(memoryStats.totalParticipants).toBe(1000);
      expect(memoryStats.visibleItems).toBeLessThanOrEqual(50);
    });
  });

  describe('Memory Management Service', () => {
    it('should get memory statistics', () => {
      const memoryService = new MemoryManagementService();
      
      const stats = memoryService.getMemoryStats();
      expect(stats).toBeDefined();
      expect(stats.timestamp).toBeGreaterThan(0);
      expect(stats.usedPercent).toBeGreaterThanOrEqual(0);
    });

    it('should provide recommendations', () => {
      const memoryService = new MemoryManagementService();
      
      const recommendations = memoryService.getRecommendations();
      expect(Array.isArray(recommendations)).toBe(true);
    });

    it('should format memory sizes', () => {
      const memoryService = new MemoryManagementService();
      
      expect(memoryService.formatMemorySize(1024)).toBe('1.0 KB');
      expect(memoryService.formatMemorySize(1024 * 1024)).toBe('1.0 MB');
      expect(memoryService.formatMemorySize(1024 * 1024 * 1024)).toBe('1.0 GB');
    });
  });

  // Helper functions
  async function createSmallCSV(participantCount: number): Promise<string> {
    const csvPath = path.join(tempDir, 'small-test.csv');
    const headers = [
      'Username', 'First Name', 'Last Name', 'User Email ID', 'Phone Number',
      'Product Name', 'Currency', 'Ticket Price', 'Ticket Number', 'Order ID',
      'Order Status', 'Order Amount', 'Ticket Purchased Date', 'Status',
      'Stream ID', 'User Profile'
    ];

    let csvContent = headers.join(',') + '\n';
    
    for (let i = 1; i <= participantCount; i++) {
      const row = [
        `user${i}`,
        `First${i}`,
        `Last${i}`,
        `user${i}@example.com`,
        `+1234567${String(i).padStart(4, '0')}`,
        'Test Product',
        'USD',
        '1.00',
        String(i),
        `ORDER${i}`,
        'Processing',
        '1.00',
        '2024-01-01',
        'Ticket Buyer',
        'N/A',
        `https://example.com/avatar${i}.jpg`
      ];
      csvContent += row.join(',') + '\n';
    }

    await fs.writeFile(csvPath, csvContent, 'utf8');
    return csvPath;
  }

  function generateMockParticipants(count: number): Participant[] {
    return Array.from({ length: count }, (_, i) => ({
      id: `participant-${i}`,
      raffleId: 'test-raffle',
      username: `user${i}`,
      firstName: `First${i}`,
      lastName: `Last${i}`,
      email: `user${i}@example.com`,
      phoneNumber: `+1234567${String(i).padStart(4, '0')}`,
      profileImageUrl: `https://example.com/avatar${i}.jpg`,
      ticketNumber: String(i),
      importDate: new Date(),
      productName: 'Test Product',
      currency: 'USD',
      ticketPrice: '1.00',
      orderId: `ORDER${i}`,
      orderStatus: 'Processing',
      orderAmount: '1.00',
      ticketPurchasedDate: '2024-01-01',
      status: 'Ticket Buyer'
    }));
  }
});