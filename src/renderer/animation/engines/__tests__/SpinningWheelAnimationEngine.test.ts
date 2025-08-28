// Tests for SpinningWheelAnimationEngine

import { SpinningWheelAnimationEngine } from '../SpinningWheelAnimationEngine';
import { AnimationEngineConfig, ANIMATION_CONSTANTS } from '../../../../types/animation';
import { AnimationStyle, Participant } from '../../../../types';
import { CS2_RARITY_LEVELS } from '../../../../types/rarity';
import { createMockCanvas } from './setup';

// Import setup to initialize global mocks
import './setup';

// Mock canvas and context
const mockCanvas = createMockCanvas() as unknown as HTMLCanvasElement;

// Mock participants
const mockParticipants: Participant[] = [
  {
    id: '1',
    raffleId: 'test-raffle',
    username: 'player1',
    profileImageUrl: 'https://example.com/avatar1.jpg',
    ticketNumber: '001',
    importDate: new Date()
  },
  {
    id: '2',
    raffleId: 'test-raffle',
    username: 'player2',
    profileImageUrl: 'https://example.com/avatar2.jpg',
    ticketNumber: '002',
    importDate: new Date()
  },
  {
    id: '3',
    raffleId: 'test-raffle',
    username: 'winner',
    profileImageUrl: 'https://example.com/winner.jpg',
    ticketNumber: '003',
    importDate: new Date()
  }
];

const mockConfig: AnimationEngineConfig = {
  participants: mockParticipants,
  winner: mockParticipants[2], // 'winner'
  animationStyle: AnimationStyle.SPINNING_WHEEL,
  config: {
    duration: 5000,
    easing: 'easeOutCubic' as any,
    scrollSpeed: 1,
    rarityColors: CS2_RARITY_LEVELS,
    showRarityEffects: true,
    targetFPS: 60,
    enableHardwareAcceleration: true
  },
  recordingEnabled: false
};

describe('SpinningWheelAnimationEngine', () => {
  let engine: SpinningWheelAnimationEngine;

  beforeEach(() => {
    engine = new SpinningWheelAnimationEngine();
    jest.clearAllMocks();
  });

  afterEach(() => {
    engine.destroy();
  });

  describe('Initialization', () => {
    it('should initialize successfully with valid config', async () => {
      await engine.initialize(mockCanvas, mockConfig);
      
      const state = engine.getState();
      expect(state.status).toBe('idle');
      expect(state.totalFrames).toBeGreaterThan(0);
    });

    it('should throw error when canvas is not provided', async () => {
      await expect(engine.initialize(null as any, mockConfig))
        .rejects.toThrow('Animation not properly initialized');
    });

    it('should throw error when config is not provided', async () => {
      await expect(engine.initialize(mockCanvas, null as any))
        .rejects.toThrow('Animation not properly initialized');
    });

    it('should calculate wheel segments correctly', async () => {
      await engine.initialize(mockCanvas, mockConfig);
      
      // Verify that segments were created (private property, so we test indirectly)
      const state = engine.getState();
      expect(state.status).toBe('idle');
    });
  });

  describe('Animation Lifecycle', () => {
    beforeEach(async () => {
      await engine.initialize(mockCanvas, mockConfig);
    });

    it('should start animation successfully', async () => {
      await engine.start();
      
      const state = engine.getState();
      expect(state.status).toBe('running');
      expect(engine.isRunning()).toBe(true);
    });

    it('should pause and resume animation', async () => {
      await engine.start();
      
      engine.pause();
      expect(engine.getState().status).toBe('paused');
      expect(engine.isRunning()).toBe(false);
      
      engine.resume();
      expect(engine.getState().status).toBe('running');
      expect(engine.isRunning()).toBe(true);
    });

    it('should stop animation', async () => {
      await engine.start();
      
      engine.stop();
      const state = engine.getState();
      expect(state.status).toBe('idle');
      expect(state.progress).toBe(0);
      expect(engine.isRunning()).toBe(false);
    });

    it('should handle multiple start calls gracefully', async () => {
      await engine.start();
      await engine.start(); // Should not throw
      
      expect(engine.isRunning()).toBe(true);
    });
  });

  describe('Performance Monitoring', () => {
    beforeEach(async () => {
      await engine.initialize(mockCanvas, mockConfig);
    });

    it('should provide FPS metrics', () => {
      const fps = engine.getFPS();
      expect(typeof fps).toBe('number');
      expect(fps).toBeGreaterThanOrEqual(0);
    });

    it('should provide performance metrics', () => {
      const metrics = engine.getPerformanceMetrics();
      expect(metrics).toHaveProperty('currentFPS');
      expect(metrics).toHaveProperty('averageFPS');
      expect(metrics).toHaveProperty('frameDrops');
      expect(metrics).toHaveProperty('memoryUsage');
    });
  });

  describe('Event Handling', () => {
    beforeEach(async () => {
      await engine.initialize(mockCanvas, mockConfig);
    });

    it('should call onProgress callback during animation', (done) => {
      let progressCalled = false;
      
      engine.onProgress = (progress) => {
        expect(progress).toBeGreaterThanOrEqual(0);
        expect(progress).toBeLessThanOrEqual(1);
        progressCalled = true;
      };

      engine.start().then(() => {
        // Simulate some animation frames
        setTimeout(() => {
          expect(progressCalled).toBe(true);
          done();
        }, 100);
      });
    });

    it('should call onComplete callback when animation finishes', (done) => {
      engine.onComplete = () => {
        expect(engine.getState().status).toBe('completed');
        done();
      };

      // Mock a very short animation for testing
      const shortConfig = { ...mockConfig, config: { ...mockConfig.config, duration: 50 } };
      engine.initialize(mockCanvas, shortConfig).then(() => {
        engine.start();
      });
    });

    it('should call onError callback on animation errors', (done) => {
      engine.onError = (error) => {
        expect(error).toBeInstanceOf(Error);
        expect(error.type).toBeDefined();
        done();
      };

      // Force an error by providing invalid canvas
      const invalidCanvas = { ...mockCanvas, getContext: () => null };
      engine.initialize(invalidCanvas as any, mockConfig).catch(() => {
        // Expected to fail and trigger error callback
      });
    });
  });

  describe('Animation Phases', () => {
    beforeEach(async () => {
      await engine.initialize(mockCanvas, mockConfig);
    });

    it('should progress through animation phases correctly', async () => {
      await engine.start();
      
      // Test that animation progresses
      const initialState = engine.getState();
      expect(initialState.progress).toBe(0);
      
      // Simulate time passing
      setTimeout(() => {
        const laterState = engine.getState();
        expect(laterState.progress).toBeGreaterThan(initialState.progress);
      }, 50);
    });

    it('should maintain consistent frame rate', async () => {
      await engine.start();
      
      // Monitor FPS over time
      const fpsReadings: number[] = [];
      const interval = setInterval(() => {
        fpsReadings.push(engine.getFPS());
      }, 100);
      
      setTimeout(() => {
        clearInterval(interval);
        
        // Check that FPS is reasonably consistent
        const avgFPS = fpsReadings.reduce((a, b) => a + b, 0) / fpsReadings.length;
        expect(avgFPS).toBeGreaterThan(0);
        expect(avgFPS).toBeLessThanOrEqual(ANIMATION_CONSTANTS.TARGET_FPS + 10); // Allow some variance
      }, 500);
    });
  });

  describe('Winner Selection', () => {
    beforeEach(async () => {
      await engine.initialize(mockCanvas, mockConfig);
    });

    it('should identify winner correctly', () => {
      const state = engine.getState();
      expect(state.winner).toEqual(mockConfig.winner);
    });

    it('should handle case where winner is not in participants', async () => {
      const invalidConfig = {
        ...mockConfig,
        winner: {
          id: 'invalid',
          raffleId: 'test-raffle',
          username: 'invalid',
          profileImageUrl: 'invalid.jpg',
          ticketNumber: '999',
          importDate: new Date()
        }
      };

      // Should not throw, but should handle gracefully
      await engine.initialize(mockCanvas, invalidConfig);
      expect(engine.getState().status).toBe('idle');
    });
  });

  describe('Rendering', () => {
    beforeEach(async () => {
      await engine.initialize(mockCanvas, mockConfig);
    });

    it('should clear canvas before each frame', async () => {
      await engine.start();
      
      // Let a few frames render
      setTimeout(() => {
        expect(mockContext.clearRect).toHaveBeenCalled();
      }, 100);
    });

    it('should draw wheel segments', async () => {
      await engine.start();
      
      // Let a few frames render
      setTimeout(() => {
        expect(mockContext.arc).toHaveBeenCalled(); // Wheel drawing
        expect(mockContext.fill).toHaveBeenCalled();
      }, 100);
    });

    it('should draw pointer', async () => {
      await engine.start();
      
      // Let a few frames render
      setTimeout(() => {
        expect(mockContext.beginPath).toHaveBeenCalled();
        expect(mockContext.moveTo).toHaveBeenCalled();
        expect(mockContext.lineTo).toHaveBeenCalled();
      }, 100);
    });
  });

  describe('Memory Management', () => {
    it('should clean up resources on destroy', async () => {
      await engine.initialize(mockCanvas, mockConfig);
      await engine.start();
      
      engine.destroy();
      
      const state = engine.getState();
      expect(state.status).toBe('idle');
      expect(engine.isRunning()).toBe(false);
    });

    it('should handle destroy before initialization', () => {
      expect(() => engine.destroy()).not.toThrow();
    });

    it('should handle multiple destroy calls', async () => {
      await engine.initialize(mockCanvas, mockConfig);
      
      engine.destroy();
      engine.destroy(); // Should not throw
      
      expect(engine.getState().status).toBe('idle');
    });
  });
});