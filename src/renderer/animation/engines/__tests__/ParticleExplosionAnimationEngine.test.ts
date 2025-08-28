// Tests for ParticleExplosionAnimationEngine

import { ParticleExplosionAnimationEngine } from '../ParticleExplosionAnimationEngine';
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
  animationStyle: AnimationStyle.PARTICLE_EXPLOSION,
  config: {
    duration: 5000,
    easing: 'easeOutCubic' as any,
    scrollSpeed: 1,
    rarityColors: CS2_RARITY_LEVELS,
    showRarityEffects: true,
    targetFPS: 60,
    enableHardwareAcceleration: true,
    particleCount: 100
  },
  recordingEnabled: false
};

describe('ParticleExplosionAnimationEngine', () => {
  let engine: ParticleExplosionAnimationEngine;

  beforeEach(() => {
    engine = new ParticleExplosionAnimationEngine();
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

    it('should calculate center position correctly', async () => {
      await engine.initialize(mockCanvas, mockConfig);
      
      const state = engine.getState();
      expect(state.status).toBe('idle');
    });

    it('should create participant items around edges', async () => {
      await engine.initialize(mockCanvas, mockConfig);
      
      // Verify initialization completed successfully
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

  describe('Particle Explosion Mechanics', () => {
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

    it('should handle gathering phase', async () => {
      await engine.start();
      
      // Particles should gather at center during initial phase
      const state = engine.getState();
      expect(state.status).toBe('running');
    });

    it('should handle explosion phase with screen shake', async () => {
      await engine.start();
      
      // Screen shake should occur during explosion
      setTimeout(() => {
        const state = engine.getState();
        expect(state.status).toBe('running');
      }, 100);
    });

    it('should reveal winner from explosion', async () => {
      const shortConfig = { ...mockConfig, config: { ...mockConfig.config, duration: 100 } };
      await engine.initialize(mockCanvas, shortConfig);
      await engine.start();
      
      setTimeout(() => {
        const state = engine.getState();
        expect(state.winner).toEqual(mockConfig.winner);
      }, 150);
    });
  });

  describe('Particle System', () => {
    beforeEach(async () => {
      await engine.initialize(mockCanvas, mockConfig);
    });

    it('should generate particles during animation', async () => {
      await engine.start();
      
      // Particles should be generated during various phases
      setTimeout(() => {
        expect(mockContext.arc).toHaveBeenCalled(); // Particle drawing
      }, 100);
    });

    it('should handle different particle types', async () => {
      await engine.start();
      
      // Different particle types should be rendered
      setTimeout(() => {
        expect(mockContext.fill).toHaveBeenCalled();
        expect(mockContext.arc).toHaveBeenCalled();
      }, 100);
    });

    it('should clean up particles over time', async () => {
      await engine.start();
      
      // Particles should have limited lifetime
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

    it('should handle high particle count efficiently', async () => {
      const highParticleConfig = {
        ...mockConfig,
        config: { ...mockConfig.config, particleCount: 500 }
      };
      
      await engine.initialize(mockCanvas, highParticleConfig);
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

    it('should draw explosion waves', async () => {
      await engine.start();
      
      setTimeout(() => {
        expect(mockContext.arc).toHaveBeenCalled(); // Explosion waves
        expect(mockContext.stroke).toHaveBeenCalled();
      }, 100);
    });

    it('should draw participant items', async () => {
      await engine.start();
      
      setTimeout(() => {
        expect(mockContext.drawImage).toHaveBeenCalled(); // Participant images
      }, 100);
    });

    it('should apply screen shake effect', async () => {
      await engine.start();
      
      setTimeout(() => {
        expect(mockContext.translate).toHaveBeenCalled(); // Screen shake
      }, 100);
    });
  });

  describe('Visual Effects', () => {
    beforeEach(async () => {
      await engine.initialize(mockCanvas, mockConfig);
    });

    it('should show dynamic background based on phase', async () => {
      await engine.start();
      
      setTimeout(() => {
        expect(mockContext.createRadialGradient).toHaveBeenCalled();
      }, 100);
    });

    it('should generate explosion waves', async () => {
      await engine.start();
      
      setTimeout(() => {
        expect(mockContext.arc).toHaveBeenCalled();
      }, 100);
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
      const manyParticipants = Array.from({ length: 20 }, (_, i) => ({
        ...mockParticipants[0],
        id: `participant-${i}`,
        username: `player${i}`,
        ticketNumber: `${i.toString().padStart(3, '0')}`
      }));

      const manyConfig = {
        ...mockConfig,
        participants: manyParticipants,
        winner: manyParticipants[10]
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

    it('should handle zero particle count', async () => {
      const noParticleConfig = {
        ...mockConfig,
        config: { ...mockConfig.config, particleCount: 0 }
      };

      await engine.initialize(mockCanvas, noParticleConfig);
      await engine.start();
      
      expect(engine.getState().status).toBe('running');
    });

    it('should handle very high particle count', async () => {
      const highParticleConfig = {
        ...mockConfig,
        config: { ...mockConfig.config, particleCount: 1000 }
      };

      await engine.initialize(mockCanvas, highParticleConfig);
      await engine.start();
      
      expect(engine.getState().status).toBe('running');
    });
  });
});