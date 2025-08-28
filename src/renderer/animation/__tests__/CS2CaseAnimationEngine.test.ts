// CS2 Case Opening animation engine tests

import { CS2CaseAnimationEngine } from '../engines/CS2CaseAnimationEngine';
import { AnimationEngineConfig, AnimationState, EasingFunctions } from '../../../types/animation';
import { AnimationStyle, Participant, CS2_RARITY_LEVELS } from '../../../types';

// Mock canvas and context
const mockContext = {
  clearRect: jest.fn(),
  drawImage: jest.fn(),
  fillRect: jest.fn(),
  strokeRect: jest.fn(),
  fillText: jest.fn(),
  strokeText: jest.fn(),
  measureText: jest.fn(() => ({ width: 100 })),
  save: jest.fn(),
  restore: jest.fn(),
  translate: jest.fn(),
  rotate: jest.fn(),
  scale: jest.fn(),
  beginPath: jest.fn(),
  closePath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  quadraticCurveTo: jest.fn(),
  arc: jest.fn(),
  fill: jest.fn(),
  stroke: jest.fn(),
  getTransform: jest.fn(() => new DOMMatrix()),
  createLinearGradient: jest.fn(() => ({
    addColorStop: jest.fn()
  })),
  createRadialGradient: jest.fn(() => ({
    addColorStop: jest.fn()
  })),
  globalAlpha: 1,
  fillStyle: '#000',
  strokeStyle: '#000',
  lineWidth: 1,
  font: '16px Arial',
  textAlign: 'left',
  textBaseline: 'top',
  shadowColor: 'transparent',
  shadowBlur: 0,
  shadowOffsetX: 0,
  shadowOffsetY: 0,
  imageSmoothingEnabled: true,
  imageSmoothingQuality: 'high',
  globalCompositeOperation: 'source-over',
  textRenderingOptimization: 'speed',
  lineCap: 'round',
  lineJoin: 'round',
  miterLimit: 10
};

const mockCanvas = {
  getContext: jest.fn(() => mockContext),
  width: 800,
  height: 600,
  clientWidth: 800,
  clientHeight: 600,
  style: {}
} as unknown as HTMLCanvasElement;

// Mock performance.now
const mockPerformanceNow = jest.fn();
Object.defineProperty(global.performance, 'now', {
  value: mockPerformanceNow,
  writable: true
});

// Mock requestAnimationFrame
const mockRequestAnimationFrame = jest.fn();
Object.defineProperty(global, 'requestAnimationFrame', {
  value: mockRequestAnimationFrame,
  writable: true
});

// Mock cancelAnimationFrame
const mockCancelAnimationFrame = jest.fn();
Object.defineProperty(global, 'cancelAnimationFrame', {
  value: mockCancelAnimationFrame,
  writable: true
});

// Mock devicePixelRatio
Object.defineProperty(window, 'devicePixelRatio', {
  value: 2,
  writable: true
});

// Mock Image constructor
const mockImage = {
  complete: true,
  naturalWidth: 100,
  naturalHeight: 100,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
};

global.Image = jest.fn(() => mockImage) as any;

describe('CS2CaseAnimationEngine', () => {
  let engine: CS2CaseAnimationEngine;
  let mockParticipants: Participant[];
  let mockWinner: Participant;
  let mockConfig: AnimationEngineConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPerformanceNow.mockReturnValue(0);
    
    // Create mock participants
    mockParticipants = [
      {
        id: '1',
        raffleId: 'raffle1',
        username: 'player1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        profileImageUrl: 'https://example.com/avatar1.jpg',
        ticketNumber: 'T001',
        importDate: new Date()
      },
      {
        id: '2',
        raffleId: 'raffle1',
        username: 'player2',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        profileImageUrl: 'https://example.com/avatar2.jpg',
        ticketNumber: 'T002',
        importDate: new Date()
      },
      {
        id: '3',
        raffleId: 'raffle1',
        username: 'player3',
        firstName: 'Bob',
        lastName: 'Johnson',
        email: 'bob@example.com',
        profileImageUrl: 'https://example.com/avatar3.jpg',
        ticketNumber: 'T003',
        importDate: new Date()
      }
    ];

    mockWinner = mockParticipants[1]; // Jane Smith wins

    mockConfig = {
      participants: mockParticipants,
      winner: mockWinner,
      animationStyle: AnimationStyle.CS2_CASE,
      backgroundImage: 'https://example.com/background.jpg',
      config: {
        duration: 5000,
        easing: EasingFunctions.easeOutCubic,
        scrollSpeed: 1.0,
        rarityColors: CS2_RARITY_LEVELS,
        showRarityEffects: true,
        targetFPS: 60,
        enableHardwareAcceleration: true,
        particleCount: 100
      },
      recordingEnabled: false
    };

    engine = new CS2CaseAnimationEngine();
  });

  describe('Initialization', () => {
    it('should initialize successfully with valid config', async () => {
      await engine.initialize(mockCanvas, mockConfig);
      
      const state = engine.getState();
      expect(state.status).toBe('idle');
      expect(state.totalFrames).toBeGreaterThan(0);
      expect(state.remainingTime).toBe(5000);
    });

    it('should throw error if canvas is not provided', async () => {
      await expect(engine.initialize(null as any, mockConfig))
        .rejects.toThrow('Animation not properly initialized');
    });

    it('should throw error if config is not provided', async () => {
      await expect(engine.initialize(mockCanvas, null as any))
        .rejects.toThrow('Animation not properly initialized');
    });

    it('should throw error if winner is not found in participants', async () => {
      const invalidConfig = {
        ...mockConfig,
        winner: {
          ...mockWinner,
          id: 'nonexistent'
        }
      };

      await expect(engine.initialize(mockCanvas, invalidConfig))
        .rejects.toThrow('Winner not found in participants list');
    });

    it('should setup canvas with correct pixel ratio', async () => {
      await engine.initialize(mockCanvas, mockConfig);
      
      expect(mockCanvas.width).toBe(800 * 2); // width * pixelRatio
      expect(mockCanvas.height).toBe(600 * 2); // height * pixelRatio
      expect(mockContext.scale).toHaveBeenCalledWith(2, 2);
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
      expect(mockRequestAnimationFrame).toHaveBeenCalled();
    });

    it('should not start if already running', async () => {
      await engine.start();
      const firstCallCount = mockRequestAnimationFrame.mock.calls.length;
      
      await engine.start(); // Try to start again
      
      expect(mockRequestAnimationFrame.mock.calls.length).toBe(firstCallCount);
    });

    it('should pause animation correctly', async () => {
      await engine.start();
      engine.pause();
      
      const state = engine.getState();
      expect(state.status).toBe('paused');
      expect(mockCancelAnimationFrame).toHaveBeenCalled();
    });

    it('should resume animation correctly', async () => {
      await engine.start();
      engine.pause();
      engine.resume();
      
      const state = engine.getState();
      expect(state.status).toBe('running');
    });

    it('should stop animation correctly', async () => {
      await engine.start();
      engine.stop();
      
      const state = engine.getState();
      expect(state.status).toBe('idle');
      expect(state.progress).toBe(0);
      expect(mockCancelAnimationFrame).toHaveBeenCalled();
    });

    it('should destroy animation correctly', async () => {
      await engine.start();
      engine.destroy();
      
      const state = engine.getState();
      expect(state.status).toBe('idle');
      expect(mockCancelAnimationFrame).toHaveBeenCalled();
    });
  });

  describe('Animation Phases', () => {
    beforeEach(async () => {
      await engine.initialize(mockCanvas, mockConfig);
    });

    it('should progress through animation phases correctly', () => {
      // Test acceleration phase (0-15%)
      const accelerationProgress = 0.1;
      engine['updateAnimationPhase'](accelerationProgress);
      expect(engine['animationPhase']).toBe('acceleration');

      // Test cruising phase (15-65%)
      const cruisingProgress = 0.4;
      engine['updateAnimationPhase'](cruisingProgress);
      expect(engine['animationPhase']).toBe('cruising');

      // Test deceleration phase (65-90%)
      const decelerationProgress = 0.8;
      engine['updateAnimationPhase'](decelerationProgress);
      expect(engine['animationPhase']).toBe('deceleration');

      // Test reveal phase (90-100%)
      const revealProgress = 0.95;
      engine['updateAnimationPhase'](revealProgress);
      expect(engine['animationPhase']).toBe('reveal');
    });

    it('should calculate scroll position with proper easing for each phase', () => {
      // Test acceleration phase easing
      engine['animationPhase'] = 'acceleration';
      engine['finalScrollPosition'] = 1000;
      engine['calculateScrollPosition'](0.1);
      expect(engine['scrollOffset']).toBeGreaterThan(0);
      expect(engine['scrollOffset']).toBeLessThan(100); // Should be slow at start

      // Test cruising phase easing
      engine['animationPhase'] = 'cruising';
      engine['calculateScrollPosition'](0.4);
      expect(engine['scrollOffset']).toBeGreaterThan(100);
      expect(engine['scrollOffset']).toBeLessThan(700);

      // Test deceleration phase easing
      engine['animationPhase'] = 'deceleration';
      engine['calculateScrollPosition'](0.8);
      expect(engine['scrollOffset']).toBeGreaterThan(600);
      expect(engine['scrollOffset']).toBeLessThan(950);

      // Test reveal phase easing
      engine['animationPhase'] = 'reveal';
      engine['calculateScrollPosition'](0.95);
      expect(engine['scrollOffset']).toBeGreaterThan(900);
    });
  });

  describe('Visual Effects', () => {
    beforeEach(async () => {
      await engine.initialize(mockCanvas, mockConfig);
    });

    it('should generate particle effects during reveal phase', () => {
      engine['animationPhase'] = 'reveal';
      engine['particleEffects'] = [];
      
      engine['generateRevealParticles']();
      
      expect(engine['particleEffects'].length).toBeGreaterThan(0);
      expect(engine['particleEffects'][0]).toHaveProperty('x');
      expect(engine['particleEffects'][0]).toHaveProperty('y');
      expect(engine['particleEffects'][0]).toHaveProperty('vx');
      expect(engine['particleEffects'][0]).toHaveProperty('vy');
      expect(engine['particleEffects'][0]).toHaveProperty('life');
      expect(engine['particleEffects'][0]).toHaveProperty('color');
    });

    it('should update particle effects over time', () => {
      const initialParticle = {
        x: 100,
        y: 100,
        vx: 0.1,
        vy: 0.1,
        life: 1000,
        maxLife: 1000,
        color: '#ffd700',
        size: 3
      };
      
      engine['particleEffects'] = [initialParticle];
      engine['updateParticleEffects'](16.67); // ~60fps delta
      
      expect(engine['particleEffects'][0].x).toBeGreaterThan(100);
      expect(engine['particleEffects'][0].y).toBeGreaterThan(100);
      expect(engine['particleEffects'][0].life).toBeLessThan(1000);
    });

    it('should remove expired particles', () => {
      const expiredParticle = {
        x: 100,
        y: 100,
        vx: 0.1,
        vy: 0.1,
        life: -100, // Expired
        maxLife: 1000,
        color: '#ffd700',
        size: 3
      };
      
      engine['particleEffects'] = [expiredParticle];
      engine['updateParticleEffects'](16.67);
      
      expect(engine['particleEffects'].length).toBe(0);
    });

    it('should trigger screen shake during reveal', () => {
      engine['triggerScreenShake'](10, 500);
      
      expect(engine['screenShake'].intensity).toBe(10);
      expect(engine['screenShake'].duration).toBe(500);
      expect(engine['screenShake'].elapsed).toBe(0);
    });

    it('should update screen shake over time', () => {
      engine['triggerScreenShake'](10, 500);
      engine['updateScreenShake'](250); // Half duration
      
      expect(engine['screenShake'].intensity).toBeLessThan(10);
      expect(engine['screenShake'].elapsed).toBe(250);
    });

    it('should stop screen shake when duration expires', () => {
      engine['triggerScreenShake'](10, 500);
      engine['updateScreenShake'](600); // Exceed duration
      
      expect(engine['screenShake'].intensity).toBe(0);
      expect(engine['screenShake'].duration).toBe(0);
      expect(engine['screenShake'].elapsed).toBe(0);
    });
  });

  describe('Rendering', () => {
    beforeEach(async () => {
      await engine.initialize(mockCanvas, mockConfig);
    });

    it('should render frame without errors', () => {
      expect(() => {
        engine['renderFrame'](0.5, 16.67, 2500);
      }).not.toThrow();
    });

    it('should clear canvas at start of frame', () => {
      engine['renderFrame'](0.5, 16.67, 2500);
      expect(mockContext.clearRect).toHaveBeenCalled();
    });

    it('should draw background if provided', () => {
      // Mock image cache to return a background image
      const mockBgImage = { complete: true, naturalWidth: 800, naturalHeight: 600 };
      engine['imageCache'].set(mockConfig.backgroundImage!, mockBgImage as HTMLImageElement);
      
      engine['renderFrame'](0.5, 16.67, 2500);
      expect(mockContext.drawImage).toHaveBeenCalledWith(mockBgImage, 0, 0, 800, 600);
    });

    it('should draw selection indicator', () => {
      engine['renderFrame'](0.5, 16.67, 2500);
      
      // Should draw vertical line and arrow
      expect(mockContext.fillRect).toHaveBeenCalled();
      expect(mockContext.beginPath).toHaveBeenCalled();
      expect(mockContext.fill).toHaveBeenCalled();
    });

    it('should apply motion blur during fast phases', () => {
      engine['animationPhase'] = 'acceleration';
      const blurIntensity = engine['getMotionBlurIntensity'](0.1);
      expect(blurIntensity).toBe(0.3);

      engine['animationPhase'] = 'cruising';
      const cruisingBlur = engine['getMotionBlurIntensity'](0.4);
      expect(cruisingBlur).toBe(0.3);

      engine['animationPhase'] = 'reveal';
      const revealBlur = engine['getMotionBlurIntensity'](0.95);
      expect(revealBlur).toBe(0);
    });
  });

  describe('Performance', () => {
    beforeEach(async () => {
      await engine.initialize(mockCanvas, mockConfig);
    });

    it('should maintain target FPS', () => {
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

    it('should only render visible items for performance', () => {
      // Set up display items that are off-screen
      engine['displayItems'] = [
        {
          participant: mockParticipants[0],
          rarity: 'consumer',
          position: { x: -200, y: 100 }, // Off-screen left
          size: { width: 120, height: 160 },
          scale: 1,
          alpha: 1,
          velocity: { x: 0, y: 0 },
          rotation: 0
        },
        {
          participant: mockParticipants[1],
          rarity: 'covert',
          position: { x: 400, y: 100 }, // On-screen
          size: { width: 120, height: 160 },
          scale: 1,
          alpha: 1,
          velocity: { x: 0, y: 0 },
          rotation: 0
        },
        {
          participant: mockParticipants[2],
          rarity: 'milspec',
          position: { x: 1000, y: 100 }, // Off-screen right
          size: { width: 120, height: 160 },
          scale: 1,
          alpha: 1,
          velocity: { x: 0, y: 0 },
          rotation: 0
        }
      ];

      engine['scrollOffset'] = 0;
      
      const drawRectCallsBefore = mockContext.fillRect.mock.calls.length;
      engine['drawItems'](0.5);
      const drawRectCallsAfter = mockContext.fillRect.mock.calls.length;
      
      // Should only draw visible items (less calls than total items)
      expect(drawRectCallsAfter - drawRectCallsBefore).toBeLessThan(engine['displayItems'].length * 2);
    });
  });

  describe('Rarity System Integration', () => {
    beforeEach(async () => {
      await engine.initialize(mockCanvas, mockConfig);
    });

    it('should assign rarities to all display items', () => {
      expect(engine['displayItems'].length).toBeGreaterThan(0);
      engine['displayItems'].forEach(item => {
        expect(item.rarity).toBeDefined();
        expect(typeof item.rarity).toBe('string');
        expect(CS2_RARITY_LEVELS[item.rarity]).toBeDefined();
      });
    });

    it('should draw rarity overlays for items', () => {
      engine['drawItems'](0.5);
      
      // Should call gradient creation for rarity overlays
      expect(mockContext.createLinearGradient).toHaveBeenCalled();
    });

    it('should enhance rarity effects during reveal phase', () => {
      engine['animationPhase'] = 'reveal';
      const mockItem = engine['displayItems'][0];
      
      engine['drawEnhancedRarityOverlay'](100, 100, mockItem.rarity, true, 0.95);
      
      // Should create gradient and apply enhanced effects
      expect(mockContext.createLinearGradient).toHaveBeenCalled();
      expect(mockContext.fillRect).toHaveBeenCalled();
      expect(mockContext.strokeRect).toHaveBeenCalled();
    });
  });

  describe('Winner Reveal', () => {
    beforeEach(async () => {
      await engine.initialize(mockCanvas, mockConfig);
    });

    it('should find and position winner correctly', () => {
      expect(engine['winnerIndex']).toBeGreaterThanOrEqual(0);
      expect(engine['winnerIndex']).toBeLessThan(engine['displayItems'].length);
      
      const winnerItem = engine['displayItems'][engine['winnerIndex']];
      expect(winnerItem.participant.id).toBe(mockWinner.id);
    });

    it('should calculate final scroll position to center winner', () => {
      expect(engine['finalScrollPosition']).toBeGreaterThan(0);
      
      // Final position should center the winner
      const canvasWidth = mockCanvas.width / 2; // Account for pixel ratio
      const centerX = canvasWidth / 2;
      const winnerItem = engine['displayItems'][engine['winnerIndex']];
      const expectedPosition = winnerItem.position.x + engine['itemWidth'] / 2 - centerX;
      
      expect(Math.abs(engine['finalScrollPosition'] - expectedPosition)).toBeLessThan(1);
    });

    it('should draw winner reveal effects', () => {
      engine['animationPhase'] = 'reveal';
      
      engine['drawWinnerReveal'](0.95);
      
      // Should draw glow effects and winner text
      expect(mockContext.strokeRect).toHaveBeenCalled();
      expect(mockContext.fillText).toHaveBeenCalledWith(
        'WINNER!',
        expect.any(Number),
        expect.any(Number),
        expect.objectContaining({
          color: '#ffd700',
          fontSize: 28,
          fontWeight: 'bold'
        })
      );
    });

    it('should generate winner particle burst', () => {
      const initialParticleCount = engine['particleEffects'].length;
      
      engine['generateWinnerParticleBurst'](400, 300);
      
      expect(engine['particleEffects'].length).toBeGreaterThan(initialParticleCount);
      
      // Check that particles have proper properties
      const newParticles = engine['particleEffects'].slice(initialParticleCount);
      newParticles.forEach(particle => {
        expect(particle.x).toBe(400);
        expect(particle.y).toBe(300);
        expect(particle.vx).toBeDefined();
        expect(particle.vy).toBeDefined();
        expect(particle.color).toMatch(/^#[0-9a-f]{6}$/i);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle missing canvas gracefully', async () => {
      const engine = new CS2CaseAnimationEngine();
      
      // Should not throw when canvas is null
      expect(() => {
        engine['renderFrame'](0.5, 16.67, 2500);
      }).not.toThrow();
    });

    it('should handle missing config gracefully', async () => {
      const engine = new CS2CaseAnimationEngine();
      await engine.initialize(mockCanvas, mockConfig);
      
      // Manually set config to null to test error handling
      engine['config'] = null;
      
      expect(() => {
        engine['renderFrame'](0.5, 16.67, 2500);
      }).not.toThrow();
    });

    it('should handle missing images gracefully', () => {
      // Mock image cache to return null for missing images
      engine['imageCache'].get = jest.fn().mockReturnValue(null);
      
      expect(() => {
        engine['drawItems'](0.5);
      }).not.toThrow();
    });

    it('should handle invalid rarity gracefully', () => {
      const mockItem = {
        participant: mockParticipants[0],
        rarity: 'invalid_rarity',
        position: { x: 100, y: 100 },
        size: { width: 120, height: 160 },
        scale: 1,
        alpha: 1,
        velocity: { x: 0, y: 0 },
        rotation: 0
      };
      
      expect(() => {
        engine['drawEnhancedRarityOverlay'](100, 100, mockItem.rarity, false, 0.5);
      }).not.toThrow();
    });
  });

  describe('Timing and Consistency', () => {
    beforeEach(async () => {
      await engine.initialize(mockCanvas, mockConfig);
    });

    it('should maintain consistent timing across phases', () => {
      const phases = [
        { progress: 0.1, expected: 'acceleration' },
        { progress: 0.4, expected: 'cruising' },
        { progress: 0.8, expected: 'deceleration' },
        { progress: 0.95, expected: 'reveal' }
      ];

      phases.forEach(({ progress, expected }) => {
        engine['updateAnimationPhase'](progress);
        expect(engine['animationPhase']).toBe(expected);
      });
    });

    it('should provide smooth easing transitions', () => {
      engine['finalScrollPosition'] = 1000;
      
      const progressPoints = [0, 0.25, 0.5, 0.75, 1.0];
      const scrollPositions: number[] = [];
      
      progressPoints.forEach(progress => {
        engine['updateAnimationPhase'](progress);
        engine['calculateScrollPosition'](progress);
        scrollPositions.push(engine['scrollOffset']);
      });
      
      // Verify smooth progression (no sudden jumps)
      for (let i = 1; i < scrollPositions.length; i++) {
        expect(scrollPositions[i]).toBeGreaterThanOrEqual(scrollPositions[i - 1]);
      }
      
      // Should reach final position
      expect(scrollPositions[scrollPositions.length - 1]).toBeCloseTo(1000, 1);
    });

    it('should handle edge cases in progress calculation', () => {
      engine['finalScrollPosition'] = 1000;
      
      // Test boundary conditions
      engine['calculateScrollPosition'](0);
      expect(engine['scrollOffset']).toBe(0);
      
      engine['calculateScrollPosition'](1);
      expect(engine['scrollOffset']).toBeCloseTo(1000, 1);
      
      // Test values slightly outside normal range
      engine['calculateScrollPosition'](-0.1);
      expect(engine['scrollOffset']).toBeGreaterThanOrEqual(0);
      
      engine['calculateScrollPosition'](1.1);
      expect(engine['scrollOffset']).toBeLessThanOrEqual(1000);
    });
  });
});