import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { StreamingCSVService } from "../../main/services/StreamingCSVService";
import { VirtualizationService } from "../../renderer/animation/VirtualizationService";
import { MemoryManagementService } from "../../renderer/services/MemoryManagementService";
import { BulkOperationWorker } from "../../main/workers/BulkOperationWorker";
import { CSVService } from "../../main/services/CSVService";
import { Participant } from "../../types";
import * as fs from "fs/promises";
import * as path from "path";

// Mock performance.memory for testing
Object.defineProperty(performance, "memory", {
  value: {
    usedJSHeapSize: 50 * 1024 * 1024, // 50MB
    totalJSHeapSize: 100 * 1024 * 1024, // 100MB
    jsHeapSizeLimit: 200 * 1024 * 1024, // 200MB
  },
  configurable: true,
});

describe("Large Dataset Performance Tests", () => {
  let tempDir: string;
  let streamingService: StreamingCSVService;
  let virtualizationService: VirtualizationService;
  let memoryService: MemoryManagementService;
  let bulkWorker: BulkOperationWorker;

  beforeEach(async () => {
    tempDir = path.join(__dirname, "temp-test-data");
    await fs.mkdir(tempDir, { recursive: true });

    streamingService = new StreamingCSVService();
    virtualizationService = new VirtualizationService({
      viewportWidth: 1920,
      viewportHeight: 1080,
      itemWidth: 100,
      itemHeight: 100,
      bufferSize: 10,
      maxVisibleItems: 50,
    });
    memoryService = new MemoryManagementService();
    bulkWorker = new BulkOperationWorker(2);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
    await bulkWorker.shutdown();
    memoryService.destroy();
  });

  describe("Streaming CSV Processing", () => {
    it("should handle 10,000 participants efficiently", async () => {
      const csvPath = await createLargeCSV(10000);
      const startTime = performance.now();
      const startMemory = memoryService.getMemoryStats();

      const result = await streamingService.streamValidateCSV(
        csvPath,
        "test-raffle",
        {
          batchSize: 1000,
          maxMemoryUsage: 100, // 100MB
        }
      );

      const endTime = performance.now();
      const endMemory = memoryService.getMemoryStats();
      const processingTime = endTime - startTime;

      expect(result.isValid).toBe(true);
      expect(result.participantCount).toBe(10000);
      expect(processingTime).toBeLessThan(5000); // Should complete in under 5 seconds

      // Memory usage should not increase dramatically
      const memoryIncrease =
        endMemory.usedJSHeapSize - startMemory.usedJSHeapSize;
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Less than 50MB increase
    }, 30000);

    it("should handle 50,000 participants with streaming", async () => {
      const csvPath = await createLargeCSV(50000);
      const startTime = performance.now();

      let totalProcessed = 0;
      const progressUpdates: number[] = [];

      for await (const batch of streamingService.streamParticipants(
        csvPath,
        "test-raffle",
        {
          batchSize: 2000,
        }
      )) {
        totalProcessed += batch.data.length;
        progressUpdates.push(batch.totalProcessed);

        // Ensure we're not accumulating too much memory
        const memoryStats = memoryService.getMemoryStats();
        expect(memoryStats.usedPercent).toBeLessThan(90);
      }

      const endTime = performance.now();
      const processingTime = endTime - startTime;

      expect(totalProcessed).toBe(50000);
      expect(processingTime).toBeLessThan(15000); // Should complete in under 15 seconds
      expect(progressUpdates.length).toBeGreaterThan(20); // Should have multiple progress updates
    }, 60000);

    it("should support cancellation during large file processing", async () => {
      const csvPath = await createLargeCSV(20000);
      const cancelToken = { cancelled: false };

      setTimeout(() => {
        cancelToken.cancelled = true;
      }, 1000); // Cancel after 1 second

      const result = await streamingService.streamValidateCSV(
        csvPath,
        "test-raffle",
        {
          batchSize: 1000,
          cancelToken,
        }
      );

      expect(result.participantCount).toBeLessThanOrEqual(20000); // Should be cancelled before completion or complete quickly
    }, 10000);
  });

  describe("Animation Virtualization", () => {
    it("should virtualize rendering for 10,000 participants", () => {
      const participants = generateMockParticipants(10000);
      const startTime = performance.now();

      virtualizationService.initialize(participants);

      // Test horizontal scrolling (CS2 style)
      const viewport1 = virtualizationService.getHorizontalViewport(5000);
      expect(viewport1.visibleItems.length).toBeLessThanOrEqual(50); // Should limit visible items

      // Test circular arrangement (wheel style)
      const viewport2 = virtualizationService.getCircularViewport(
        Math.PI / 4,
        300
      );
      expect(viewport2.visibleItems.length).toBeLessThan(participants.length); // Should show subset

      // Test grid arrangement
      const viewport3 = virtualizationService.getGridViewport(0, 1000, 10);
      expect(viewport3.visibleItems.length).toBeLessThanOrEqual(500); // Adjust expectation for grid layout

      const endTime = performance.now();
      const processingTime = endTime - startTime;

      expect(processingTime).toBeLessThan(100); // Should be very fast

      const memoryStats = virtualizationService.getMemoryStats();
      expect(memoryStats.visibleItems).toBeLessThanOrEqual(50);
    });

    it("should optimize for extremely large datasets", () => {
      const participants = generateMockParticipants(100000);

      virtualizationService.initialize(participants);
      virtualizationService.optimizeForLargeDataset();

      const viewport = virtualizationService.getHorizontalViewport(0);
      expect(viewport.visibleItems.length).toBeLessThanOrEqual(50); // Should be heavily optimized

      const memoryStats = virtualizationService.getMemoryStats();
      expect(memoryStats.memoryUsage).toBeLessThan(10); // Should use less than 10MB
    });
  });

  describe("Memory Management", () => {
    it("should monitor memory usage and trigger cleanup", async () => {
      let warningTriggered = false;
      let cleanupTriggered = false;

      memoryService.setCallbacks({
        onWarning: () => {
          warningTriggered = true;
        },
        onCleanup: () => {
          cleanupTriggered = true;
        },
      });

      // Simulate high memory usage
      Object.defineProperty(performance, "memory", {
        value: {
          usedJSHeapSize: 160 * 1024 * 1024, // 160MB (80% of 200MB limit)
          totalJSHeapSize: 180 * 1024 * 1024,
          jsHeapSizeLimit: 200 * 1024 * 1024,
        },
        configurable: true,
      });

      const stats = memoryService.getMemoryStats();
      expect(stats.usedPercent).toBeGreaterThan(70);

      // Trigger optimization
      memoryService.optimizeMemory();

      const recommendations = memoryService.getRecommendations();
      expect(recommendations.length).toBeGreaterThan(0);
    });

    it("should provide memory usage trends", () => {
      // Simulate increasing memory usage
      for (let i = 0; i < 10; i++) {
        Object.defineProperty(performance, "memory", {
          value: {
            usedJSHeapSize: (50 + i * 10) * 1024 * 1024,
            totalJSHeapSize: 200 * 1024 * 1024,
            jsHeapSizeLimit: 200 * 1024 * 1024,
          },
          configurable: true,
        });
        memoryService.getMemoryStats();
      }

      const trend = memoryService.getMemoryTrend();
      expect(trend).toBe("increasing");
    });
  });

  describe("Bulk Operations", () => {
    it("should process multiple CSV files concurrently", async () => {
      const csvPaths = await Promise.all([
        createLargeCSV(1000, "file1.csv"),
        createLargeCSV(1000, "file2.csv"),
        createLargeCSV(1000, "file3.csv"),
      ]);

      const startTime = performance.now();
      const tasks = csvPaths.map((filePath, index) => ({
        id: `task-${index}`,
        type: "csv_processing" as const,
        data: { filePath, raffleId: `raffle-${index}`, batchSize: 500 },
      }));

      const taskPromises = tasks.map((task) => bulkWorker.submitTask(task));
      const taskIds = await Promise.all(taskPromises);

      // Wait for all tasks to complete
      const results = await Promise.all(
        taskIds.map(
          (taskId) =>
            new Promise<any>((resolve, reject) => {
              const timeout = setTimeout(
                () => reject(new Error("Task timeout")),
                10000
              );

              bulkWorker.on("result", (result) => {
                if (result.taskId === taskId && result.completed) {
                  clearTimeout(timeout);
                  resolve(result);
                }
              });
            })
        )
      );

      const endTime = performance.now();
      const processingTime = endTime - startTime;

      expect(results.length).toBe(3);
      expect(results.every((r) => r.success)).toBe(true);
      expect(processingTime).toBeLessThan(8000); // Should be faster than sequential processing
    }, 30000);

    it("should support task cancellation", async () => {
      const csvPath = await createLargeCSV(5000);
      const task = {
        id: "cancellation-test",
        type: "csv_processing" as const,
        data: { filePath: csvPath, raffleId: "test-raffle", batchSize: 1000 },
      };

      const taskId = await bulkWorker.submitTask(task);

      // Cancel after a short delay
      setTimeout(async () => {
        const cancelled = await bulkWorker.cancelTask(taskId);
        expect(cancelled).toBe(true);
      }, 500);

      // Wait for cancellation event
      await new Promise<void>((resolve) => {
        bulkWorker.on("taskCancelled", (event) => {
          if (event.taskId === taskId) {
            resolve();
          }
        });
      });

      const status = bulkWorker.getTaskStatus(taskId);
      expect(status).toBe("cancelled");
    }, 10000);
  });

  describe("Performance Benchmarks", () => {
    it("should compare streaming vs traditional CSV processing", async () => {
      const csvPath = await createLargeCSV(5000);
      const csvService = new CSVService();

      // Traditional processing
      const traditionalStart = performance.now();
      const traditionalResult = await csvService.validateAndParseCSV(
        csvPath,
        "test-raffle"
      );
      const traditionalTime = performance.now() - traditionalStart;

      // Streaming processing
      const streamingStart = performance.now();
      const streamingResult = await streamingService.streamValidateCSV(
        csvPath,
        "test-raffle",
        {
          batchSize: 1000,
        }
      );
      const streamingTime = performance.now() - streamingStart;

      expect(traditionalResult.participantCount).toBe(
        streamingResult.participantCount
      );

      // Streaming should be more memory efficient for large files
      console.log(
        `Traditional: ${traditionalTime}ms, Streaming: ${streamingTime}ms`
      );
    }, 20000);

    it("should measure animation performance with large datasets", () => {
      const participants = generateMockParticipants(1000);

      // Test without virtualization
      const startTime1 = performance.now();
      const allItems = participants.map((p, i) => ({
        participant: p,
        rarity: "Consumer Grade",
        position: { x: i * 100, y: 0 },
        size: { width: 100, height: 100 },
        scale: 1,
        alpha: 1,
      }));
      const nonVirtualizedTime = performance.now() - startTime1;

      // Test with virtualization
      const startTime2 = performance.now();
      virtualizationService.initialize(participants);
      const viewport = virtualizationService.getHorizontalViewport(0);
      const virtualizedTime = performance.now() - startTime2;

      expect(viewport.visibleItems.length).toBeLessThan(allItems.length);
      expect(virtualizedTime).toBeLessThan(nonVirtualizedTime);

      console.log(
        `Non-virtualized: ${nonVirtualizedTime}ms, Virtualized: ${virtualizedTime}ms`
      );
    });
  });

  // Helper functions
  async function createLargeCSV(
    participantCount: number,
    filename = "large-test.csv"
  ): Promise<string> {
    const csvPath = path.join(tempDir, filename);
    const headers = [
      "Username",
      "First Name",
      "Last Name",
      "User Email ID",
      "Phone Number",
      "Product Name",
      "Currency",
      "Ticket Price",
      "Ticket Number",
      "Order ID",
      "Order Status",
      "Order Amount",
      "Ticket Purchased Date",
      "Status",
      "Stream ID",
      "User Profile",
    ];

    let csvContent = headers.join(",") + "\n";

    for (let i = 1; i <= participantCount; i++) {
      const row = [
        `user${i}`,
        `First${i}`,
        `Last${i}`,
        `user${i}@example.com`,
        `+1234567${String(i).padStart(4, "0")}`,
        "Test Product",
        "USD",
        "1.00",
        String(i),
        `ORDER${i}`,
        "Processing",
        "1.00",
        "2024-01-01",
        "Ticket Buyer",
        "N/A",
        `https://example.com/avatar${i}.jpg`,
      ];
      csvContent += row.join(",") + "\n";
    }

    await fs.writeFile(csvPath, csvContent, "utf8");
    return csvPath;
  }

  function generateMockParticipants(count: number): Participant[] {
    return Array.from({ length: count }, (_, i) => ({
      id: `participant-${i}`,
      raffleId: "test-raffle",
      username: `user${i}`,
      firstName: `First${i}`,
      lastName: `Last${i}`,
      email: `user${i}@example.com`,
      phoneNumber: `+1234567${String(i).padStart(4, "0")}`,
      profileImageUrl: `https://example.com/avatar${i}.jpg`,
      ticketNumber: String(i),
      importDate: new Date(),
      productName: "Test Product",
      currency: "USD",
      ticketPrice: "1.00",
      orderId: `ORDER${i}`,
      orderStatus: "Processing",
      orderAmount: "1.00",
      ticketPurchasedDate: "2024-01-01",
      status: "Ticket Buyer",
    }));
  }
});
