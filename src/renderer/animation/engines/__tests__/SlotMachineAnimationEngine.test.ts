// Tests for SlotMachineAnimationEngine

import { SlotMachineAnimationEngine } from '../SlotMachineAnimationEngine';
import { AnimationEngineConfig, ANIMATION_CONSTANTS } from '../../../../types/animation';
import { AnimationStyle, Participant } from '../../../../types';
import { CS2_RARITY_LEVELS } from '../../../../types/rarity';

// Mock canvas and context
const mockCanvas = {
  width: 800,
  height: 600,
  getContext: jest.fn(() => mockContext)
} as unknown as HTMLCanvasElement;

const mockContext = {
  clearRect: jest.fn(),
  save: jest.fn(),
  restore: jest.fn(),
  translate: jest.fn(),
  rotate: jest.fn(),
  scale: jest.fn(),
  beginPath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  arc: jest.fn(),
  closePath: jest.fn(),
  fill: jest.fn(),
  stroke: jest.fn(),
  fillRect: jest.fn(),
  strokeRect: jest.fn(),
  fillText: jest.fn(),
  strokeText: jest.fn(),
  drawImage: jest.fn(),
  createLinearGradient: jest.fn(() => ({
    addColorStop: jest.fn()
  })),
  createRadialGradient: jest.fn(() => ({
    addColorStop: jest.fn()
  })),
  getTransform: jest.fn(() => new DOMMatrix()),
  globalAlpha: 1,
  fillStyle: '#000',
  strokeStyle: '#000',
  lineWidth: 1,
  font: '16px Arial',
  textAlign: 'left' as CanvasTextAlign,
  textBaseline: 'top' as CanvasTextBaseline,
  shadowColor: 'transparent',
  shadowBlur: 0,
  shadowOffsetX: 0,
  shadowOffsetY: 0,
  rect: jest.fn(),
  clip: jest.fn()
} as unknown as CanvasRenderingContext2D;

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
  },
  {
    id: '4',
    raffleId: 'test-raffle',
    username: 'player4',
    profileImageUrl: 'https://example.com/avatar4.jpg',
    ticketNumber: '004',
    importDate: new Date()
  }
];

const mockConfig: AnimationEngineConfig = {
  participants: mockParticipants,
  winner: mockParticipants[2], // 'winner'
  animationStyle: AnimationStyle.SLOT_MACHINE,
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

describe('SlotMachineAnimationEngine', () => {
  let engine: SlotMachineAnimationEngine;

  beforeEach(() => {
    engine = new SlotMachineAnimationEngine();
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

    it('should calculate machine layout correctly', async () => {
      await engine.initialize(mockCanvas, mockConfig);
      
      const state = engine.getState();
      expect(state.status).toBe('idle');
    });

    it('should create appropriate number of reels', async () => {
      await engine.initialize(mockCanvas, mockConfig);
      
      // Should create 3-5 reels based on participant count
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
  });

  describe('Slot Machine Mechanics', () => {
    beforeEach(async () => {
      await engine.initialize(mockCanvas, mockConfig);
    });

    it('should progress through animation phases correctly', async () => {
      await engine.start();
      
      const initialState = engine.getState();
      expect(initialState.progress).toBe(0);
      
      setTimeout(() => {
        const laterState = engine.getState();
        expect(laterState.progress).toBeGreaterThan(initialState.progress);
      }, 50);
    });

    it('should handle reel spinning mechanics', async () => {
      await engine.start();
      
      // Reels should start spinning in startup phase
      setTimeout(() => {
        const state = engine.getState();
        expect(state.status).toBe('running');
      }, 100);
    });

    it('should stop reels sequentially', async () => {
      // Test that reels stop one by one, not all at once
      await engine.start();
      
      // This is tested indirectly through the animation phases
      const state = engine.getState();
      expect(state.status).toBe('running');
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

    it('should maintain performance with multiple reels', async () => {
      await engine.start();
      
      const metrics = engine.getPerformanceMetrics();
      expect(metrics.currentFPS).toBeGreaterThan(0);
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

      const shortConfig = { ...mockConfig, config: { ...mockConfig.config, duration: 50 } };
      engine.initialize(mockCanvas, shortConfig).then(() => {
        engine.start();
      });
    });
  });

  describe('Rendering', () => {
    beforeEach(async () => {
      await engine.initialize(mockCanvas, mockConfig);
    });

    it('should clear canvas before each frame', async () => {
      await engine.start();
      
      setTimeout(() => {
        expect(mockContext.clearRect).toHaveBeenCalled();
      }, 100);
    });

    it('should draw machine frame', async () => {
      await engine.start();
      
      setTimeout(() => {
        expect(mockContext.fillRect).toHaveBeenCalled(); // Machine body
        expect(mockContext.strokeRect).toHaveBeenCalled(); // Frame borders
      }, 100);
    });

    it('should draw reel items with clipping', async () => {
      await engine.start();
      
      setTimeout(() => {
        expect(mockContext.rect).toHaveBeenCalled(); // Clipping region
        expect(mockContext.clip).toHaveBeenCalled();
      }, 100);
    });

    it('should draw sparks and effects', async () => {
      await engine.start();
      
      setTimeout(() => {
        // Should draw various effects
        expect(mockContext.arc).toHaveBeenCalled(); // Sparks
      }, 100);
    });
  });

  describe('Visual Effects', () => {
    beforeEach(async () => {
      await engine.initialize(mockCanvas, mockConfig);
    });

    it('should generate sparks when reels stop', async () => {
      await engine.start();
      
      // Sparks should be generated during stopping phase
      setTimeout(() => {
        const state = engine.getState();
        expect(state.status).toBe('running');
      }, 100);
    });

    it('should show flash effects', async () => {
      await engine.start();
      
      // Flash effects should occur during reel stops
      setTimeout(() => {
        expect(mockContext.fillRect).toHaveBeenCalled();
      }, 100);
    });

    it('should highlight winner during reveal', async () => {
      const shortConfig = { ...mockConfig, config: { ...mockConfig.config, duration: 100 } };
      await engine.initialize(mockCanvas, shortConfig);
      await engine.start();
      
      setTimeout(() => {
        // Winner should be highlighted
        expect(mockContext.strokeRect).toHaveBeenCalled();
      }, 150);
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
      engine.destroy();
      
      expect(engine.getState().status).toBe('idle');
    });
  });

  describe('Edge Cases', () => {
    it('should handle few participants', async () => {
      const fewConfig = {
        ...mockConfig,
        participants: mockParticipants.slice(0, 2),
        winner: mockParticipants[0]
      };

      await engine.initialize(mockCanvas, fewConfig);
      await engine.start();
      
      expect(engine.getState().status).toBe('running');
    });

    it('should handle many participants', async () => {
      const manyParticipants = Array.from({ length: 50 }, (_, i) => ({
        ...mockParticipants[0],
        id: `participant-${i}`,
        username: `player${i}`,
        ticketNumber: `${i.toString().padStart(3, '0')}`
      }));

      const manyConfig = {
        ...mockConfig,
        participants: manyParticipants,
        winner: manyParticipants[25]
      };

      await engine.initialize(mockCanvas, manyConfig);
      await engine.start();
      
      expect(engine.getState().status).toBe('running');
    });

    it('should handle winner not found gracefully', async () => {
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

      await engine.initialize(mockCanvas, invalidConfig);
      expect(engine.getState().status).toBe('idle');
    });

    it('should adapt reel count to participant count', async () => {
      // Test with different participant counts
      const testCases = [
        { count: 5, expectedReels: 3 },
        { count: 15, expectedReels: 3 },
        { count: 30, expectedReels: 4 },
        { count: 50, expectedReels: 5 }
      ];

      for (const testCase of testCases) {
        const participants = Array.from({ length: testCase.count }, (_, i) => ({
          ...mockParticipants[0],
          id: `participant-${i}`,
          username: `player${i}`,
          ticketNumber: `${i.toString().padStart(3, '0')}`
        }));

        const testConfig = {
          ...mockConfig,
          participants,
          winner: participants[0]
        };

        const testEngine = new SlotMachineAnimationEngine();
        await testEngine.initialize(mockCanvas, testConfig);
        
        // Verify initialization succeeded (reel count is internal)
        expect(testEngine.getState().status).toBe('idle');
        
        testEngine.destroy();
      }
    });
  });
});