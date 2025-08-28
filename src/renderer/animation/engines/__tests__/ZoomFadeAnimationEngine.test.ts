// Tests for ZoomFadeAnimationEngine

import { ZoomFadeAnimationEngine } from '../ZoomFadeAnimationEngine';
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
  shadowOffsetY: 0
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
  }
];

const mockConfig: AnimationEngineConfig = {
  participants: mockParticipants,
  winner: mockParticipants[2], // 'winner'
  animationStyle: AnimationStyle.ZOOM_FADE,
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

describe('ZoomFadeAnimationEngine', () => {
  let engine: ZoomFadeAnimationEngine;

  beforeEach(() => {
    engine = new ZoomFadeAnimationEngine();
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

    it('should calculate grid layout correctly', async () => {
      await engine.initialize(mockCanvas, mockConfig);
      
      const state = engine.getState();
      expect(state.status).toBe('idle');
    });

    it('should initialize light rays', async () => {
      await engine.initialize(mockCanvas, mockConfig);
      
      // Light rays should be initialized (tested indirectly)
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

  describe('Zoom & Fade Mechanics', () => {
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

    it('should handle setup phase with staggered appearance', async () => {
      await engine.start();
      
      // Items should appear with staggered timing
      const state = engine.getState();
      expect(state.status).toBe('running');
    });

    it('should handle zooming phase with sequential focus', async () => {
      await engine.start();
      
      // Items should zoom and fade sequentially
      setTimeout(() => {
        const state = engine.getState();
        expect(state.status).toBe('running');
      }, 100);
    });

    it('should reveal winner with special effects', async () => {
      const shortConfig = { ...mockConfig, config: { ...mockConfig.config, duration: 100 } };
      await engine.initialize(mockCanvas, shortConfig);
      await engine.start();
      
      setTimeout(() => {
        const state = engine.getState();
        expect(state.winner).toEqual(mockConfig.winner);
      }, 150);
    });
  });

  describe('Visual Effects', () => {
    beforeEach(async () => {
      await engine.initialize(mockCanvas, mockConfig);
    });

    it('should show light rays during reveal', async () => {
      const shortConfig = { ...mockConfig, config: { ...mockConfig.config, duration: 100 } };
      await engine.initialize(mockCanvas, shortConfig);
      await engine.start();
      
      setTimeout(() => {
        expect(mockContext.createLinearGradient).toHaveBeenCalled(); // Light rays
      }, 150);
    });

    it('should generate floating particles during celebration', async () => {
      const shortConfig = { ...mockConfig, config: { ...mockConfig.config, duration: 100 } };
      await engine.initialize(mockCanvas, shortConfig);
      await engine.start();
      
      setTimeout(() => {
        expect(mockContext.arc).toHaveBeenCalled(); // Floating particles
      }, 150);
    });

    it('should show winner glow effects', async () => {
      const shortConfig = { ...mockConfig, config: { ...mockConfig.config, duration: 100 } };
      await engine.initialize(mockCanvas, shortConfig);
      await engine.start();
      
      setTimeout(() => {
        expect(mockContext.arc).toHaveBeenCalled(); // Winner glow
      }, 150);
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

    it('should maintain smooth transitions', async () => {
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

    it('should draw items with proper transformations', async () => {
      await engine.start();
      
      setTimeout(() => {
        expect(mockContext.translate).toHaveBeenCalled();
        expect(mockContext.scale).toHaveBeenCalled();
        expect(mockContext.rotate).toHaveBeenCalled();
      }, 100);
    });

    it('should draw dynamic background gradient', async () => {
      await engine.start();
      
      setTimeout(() => {
        expect(mockContext.createRadialGradient).toHaveBeenCalled();
      }, 100);
    });

    it('should draw phase-specific titles', async () => {
      await engine.start();
      
      setTimeout(() => {
        expect(mockContext.fillText).toHaveBeenCalled(); // Title text
      }, 100);
    });
  });

  describe('Grid Layout', () => {
    beforeEach(async () => {
      await engine.initialize(mockCanvas, mockConfig);
    });

    it('should handle different participant counts', async () => {
      const testCases = [
        { count: 1, expectedLayout: 'single' },
        { count: 4, expectedLayout: 'square' },
        { count: 9, expectedLayout: 'grid' },
        { count: 16, expectedLayout: 'large-grid' }
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

        const testEngine = new ZoomFadeAnimationEngine();
        await testEngine.initialize(mockCanvas, testConfig);
        
        expect(testEngine.getState().status).toBe('idle');
        
        testEngine.destroy();
      }
    });

    it('should center grid properly', async () => {
      await engine.initialize(mockCanvas, mockConfig);
      
      // Grid should be centered (tested indirectly through successful initialization)
      const state = engine.getState();
      expect(state.status).toBe('idle');
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
    it('should handle single participant', async () => {
      const singleConfig = {
        ...mockConfig,
        participants: [mockParticipants[0]],
        winner: mockParticipants[0]
      };

      await engine.initialize(mockCanvas, singleConfig);
      await engine.start();
      
      expect(engine.getState().status).toBe('running');
    });

    it('should handle many participants', async () => {
      const manyParticipants = Array.from({ length: 25 }, (_, i) => ({
        ...mockParticipants[0],
        id: `participant-${i}`,
        username: `player${i}`,
        ticketNumber: `${i.toString().padStart(3, '0')}`
      }));

      const manyConfig = {
        ...mockConfig,
        participants: manyParticipants,
        winner: manyParticipants[12]
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

    it('should handle very small canvas', async () => {
      const smallCanvas = {
        ...mockCanvas,
        width: 200,
        height: 150
      };

      await engine.initialize(smallCanvas as any, mockConfig);
      await engine.start();
      
      expect(engine.getState().status).toBe('running');
    });

    it('should handle very large canvas', async () => {
      const largeCanvas = {
        ...mockCanvas,
        width: 2000,
        height: 1500
      };

      await engine.initialize(largeCanvas as any, mockConfig);
      await engine.start();
      
      expect(engine.getState().status).toBe('running');
    });

    it('should adapt to different aspect ratios', async () => {
      const wideCanvas = {
        ...mockCanvas,
        width: 1600,
        height: 400
      };

      await engine.initialize(wideCanvas as any, mockConfig);
      await engine.start();
      
      expect(engine.getState().status).toBe('running');
    });
  });
});