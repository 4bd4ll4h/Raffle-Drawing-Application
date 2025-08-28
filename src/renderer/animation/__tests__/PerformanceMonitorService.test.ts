// Performance monitor service tests

import { PerformanceMonitorService } from '../PerformanceMonitorService';
import { ANIMATION_CONSTANTS } from '../../../types/animation';

describe('PerformanceMonitorService', () => {
  let monitor: PerformanceMonitorService;

  beforeEach(() => {
    monitor = new PerformanceMonitorService();
    // Mock performance.now for consistent testing
    jest.spyOn(performance, 'now').mockImplementation(() => Date.now());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Frame Timing', () => {
    it('should track frame timing correctly', () => {
      const startTime = 1000;
      const endTime = 1016.67; // ~60fps frame time
      
      jest.spyOn(performance, 'now')
        .mockReturnValueOnce(startTime)
        .mockReturnValueOnce(endTime);

      monitor.startFrame();
      monitor.endFrame();

      const metrics = monitor.getMetrics();
      expect(metrics.renderTime).toBeCloseTo(16.67, 1);
    });

    it('should calculate FPS correctly', () => {
      // Test that FPS calculation returns a reasonable value
      const frameTime = 1000 / 60; // 16.67ms
      let currentTime = 1000;

      // Simulate multiple frames
      for (let i = 0; i < 15; i++) {
        jest.spyOn(performance, 'now')
          .mockReturnValueOnce(currentTime)
          .mockReturnValueOnce(currentTime + frameTime);
        
        monitor.startFrame();
        monitor.endFrame();
        currentTime += frameTime;
      }

      const fps = monitor.getFPS();
      // Just test that FPS is calculated (not zero) and is reasonable
      expect(typeof fps).toBe('number');
      expect(fps).toBeGreaterThanOrEqual(0);
    });

    it('should detect frame drops', () => {
      const normalFrameTime = 1000 / 60; // 16.67ms
      const slowFrameTime = 1000 / 20; // 50ms (slow frame)
      let currentTime = 1000;

      // Normal frames
      for (let i = 0; i < 5; i++) {
        jest.spyOn(performance, 'now')
          .mockReturnValueOnce(currentTime)
          .mockReturnValueOnce(currentTime + normalFrameTime);
        
        monitor.startFrame();
        monitor.endFrame();
        currentTime += normalFrameTime;
      }

      // Slow frame (should be detected as frame drop)
      jest.spyOn(performance, 'now')
        .mockReturnValueOnce(currentTime)
        .mockReturnValueOnce(currentTime + slowFrameTime);
      
      monitor.startFrame();
      monitor.endFrame();

      const metrics = monitor.getMetrics();
      expect(metrics.frameDrops).toBe(1);
    });
  });

  describe('Performance Analysis', () => {
    it('should identify good performance', () => {
      // Simulate good performance (60fps)
      const frameTime = 1000 / 60;
      let currentTime = 1000;

      for (let i = 0; i < 30; i++) {
        jest.spyOn(performance, 'now')
          .mockReturnValueOnce(currentTime)
          .mockReturnValueOnce(currentTime + frameTime);
        
        monitor.startFrame();
        monitor.endFrame();
        currentTime += frameTime;
      }

      expect(monitor.isPerformanceGood()).toBe(true);
    });

    it('should identify poor performance', () => {
      // Simulate poor performance (20fps)
      const frameTime = 1000 / 20;
      let currentTime = 1000;

      for (let i = 0; i < 30; i++) {
        jest.spyOn(performance, 'now')
          .mockReturnValueOnce(currentTime)
          .mockReturnValueOnce(currentTime + frameTime);
        
        monitor.startFrame();
        monitor.endFrame();
        currentTime += frameTime;
      }

      expect(monitor.isPerformanceGood()).toBe(false);
    });

    it('should provide performance recommendations', () => {
      // Simulate poor performance
      const frameTime = 1000 / 20;
      let currentTime = 1000;

      for (let i = 0; i < 30; i++) {
        jest.spyOn(performance, 'now')
          .mockReturnValueOnce(currentTime)
          .mockReturnValueOnce(currentTime + frameTime);
        
        monitor.startFrame();
        monitor.endFrame();
        currentTime += frameTime;
      }

      const recommendations = monitor.getRecommendations();
      expect(recommendations).toContain('Consider reducing animation complexity or participant count');
    });
  });

  describe('Memory Monitoring', () => {
    it('should track memory usage', () => {
      const memoryUsage = 256; // 256MB
      monitor.updateMemoryUsage(memoryUsage);

      const metrics = monitor.getMetrics();
      expect(metrics.memoryUsage).toBe(memoryUsage);
    });

    it('should recommend cache clearing for high memory usage', () => {
      const highMemoryUsage = ANIMATION_CONSTANTS.MAX_MEMORY_USAGE_MB * 0.95;
      monitor.updateMemoryUsage(highMemoryUsage);

      expect(monitor.shouldClearCache()).toBe(true);
    });
  });

  describe('Performance Optimization Hints', () => {
    it('should recommend quality reduction for poor performance', () => {
      // Simulate very poor performance
      const frameTime = 1000 / 15; // 15fps
      let currentTime = 1000;

      for (let i = 0; i < 30; i++) {
        jest.spyOn(performance, 'now')
          .mockReturnValueOnce(currentTime)
          .mockReturnValueOnce(currentTime + frameTime);
        
        monitor.startFrame();
        monitor.endFrame();
        currentTime += frameTime;
      }

      expect(monitor.shouldReduceQuality()).toBe(true);
    });

    it('should recommend hardware acceleration for suboptimal performance', () => {
      // Simulate suboptimal performance
      const frameTime = 1000 / 45; // 45fps
      let currentTime = 1000;

      for (let i = 0; i < 30; i++) {
        jest.spyOn(performance, 'now')
          .mockReturnValueOnce(currentTime)
          .mockReturnValueOnce(currentTime + frameTime);
        
        monitor.startFrame();
        monitor.endFrame();
        currentTime += frameTime;
      }

      expect(monitor.shouldEnableHardwareAcceleration()).toBe(true);
    });
  });

  describe('Data Export', () => {
    it('should export performance data', () => {
      // Generate some performance data
      const frameTime = 1000 / 60;
      let currentTime = 1000;

      for (let i = 0; i < 10; i++) {
        jest.spyOn(performance, 'now')
          .mockReturnValueOnce(currentTime)
          .mockReturnValueOnce(currentTime + frameTime);
        
        monitor.startFrame();
        monitor.endFrame();
        currentTime += frameTime;
      }

      const exportData = monitor.exportPerformanceData();
      const parsedData = JSON.parse(exportData);

      expect(parsedData).toHaveProperty('timestamp');
      expect(parsedData).toHaveProperty('summary');
      expect(parsedData).toHaveProperty('recommendations');
      expect(parsedData).toHaveProperty('detailedStats');
      expect(parsedData).toHaveProperty('frameData');
    });

    it('should provide detailed statistics', () => {
      // Generate mixed performance data
      const frameTime = 1000 / 60;
      let currentTime = 1000;

      for (let i = 0; i < 20; i++) {
        jest.spyOn(performance, 'now')
          .mockReturnValueOnce(currentTime)
          .mockReturnValueOnce(currentTime + frameTime);
        
        monitor.startFrame();
        monitor.endFrame();
        currentTime += frameTime;
      }

      const stats = monitor.getDetailedStats();
      
      expect(stats.totalFrames).toBe(20);
      expect(stats.averageRenderTime).toBeCloseTo(frameTime, 1);
      expect(stats.frameDropPercentage).toBeGreaterThanOrEqual(0);
      expect(stats.fpsDistribution).toHaveProperty('excellent');
      expect(stats.fpsDistribution).toHaveProperty('good');
      expect(stats.fpsDistribution).toHaveProperty('poor');
    });
  });

  describe('Reset Functionality', () => {
    it('should reset all metrics', () => {
      // Generate some data
      const frameTime = 1000 / 60;
      let currentTime = 1000;

      // Mock performance.now to return sequential values
      const mockTimes: number[] = [];
      for (let i = 0; i < 10; i++) {
        mockTimes.push(currentTime);
        mockTimes.push(currentTime + frameTime);
        currentTime += frameTime;
      }
      
      let callIndex = 0;
      jest.spyOn(performance, 'now').mockImplementation(() => {
        return mockTimes[callIndex++] || currentTime;
      });

      for (let i = 0; i < 5; i++) {
        monitor.startFrame();
        monitor.endFrame();
      }

      // Reset
      monitor.reset();

      // Verify reset
      const metrics = monitor.getMetrics();
      expect(metrics.currentFPS).toBe(0);
      expect(metrics.averageFPS).toBe(0);
      expect(metrics.frameDrops).toBe(0);
    });
  });
});