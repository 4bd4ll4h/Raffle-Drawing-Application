// Simple CS2 Case Opening animation engine tests

import { CS2CaseAnimationEngine } from '../engines/CS2CaseAnimationEngine';
import { AnimationEngineConfig, EasingFunctions } from '../../../types/animation';
import { AnimationStyle, Participant, CS2_RARITY_LEVELS } from '../../../types';

// Mock canvas and context
const mockContext = {
  clearRect: jest.fn(),
  drawImage: jest.fn(),
  fillRect: jest.fn(),
  strokeRect: jest.fn(),
  fillText: jest.fn(),
  save: jest.fn(),
  restore: jest.fn(),
  translate: jest.fn(),
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

describe('CS2CaseAnimationEngine - Simple Tests', () => {
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

  describe('Basic Functionality', () => {
    it('should create engine instance', () => {
      expect(engine).toBeInstanceOf(CS2CaseAnimationEngine);
    });

    it('should initialize successfully with valid config', async () => {
      await engine.initialize(mockCanvas, mockConfig);
      
      const state = engine.getState();
      expect(state.status).toBe('idle');
      expect(state.totalFrames).toBeGreaterThan(0);
    });

    it('should handle animation phases correctly', () => {
      // Test phase transitions
      engine['updateAnimationPhase'](0.1);
      expect(engine['animationPhase']).toBe('acceleration');

      engine['updateAnimationPhase'](0.4);
      expect(engine['animationPhase']).toBe('cruising');

      engine['updateAnimationPhase'](0.8);
      expect(engine['animationPhase']).toBe('deceleration');

      engine['updateAnimationPhase'](0.95);
      expect(engine['animationPhase']).toBe('reveal');
    });

    it('should calculate scroll position with easing', async () => {
      await engine.initialize(mockCanvas, mockConfig);
      
      engine['finalScrollPosition'] = 1000;
      engine['calculateScrollPosition'](0.5);
      
      expect(engine['scrollOffset']).toBeGreaterThan(0);
      expect(engine['scrollOffset']).toBeLessThan(1000);
    });

    it('should render frame without errors', async () => {
      await engine.initialize(mockCanvas, mockConfig);
      
      expect(() => {
        engine['renderFrame'](0.5, 16.67, 2500);
      }).not.toThrow();
    });

    it('should handle particle effects', async () => {
      await engine.initialize(mockCanvas, mockConfig);
      
      engine['animationPhase'] = 'reveal';
      engine['generateRevealParticles']();
      
      expect(engine['particleEffects'].length).toBeGreaterThan(0);
    });

    it('should handle screen shake', async () => {
      await engine.initialize(mockCanvas, mockConfig);
      
      engine['triggerScreenShake'](10, 500);
      
      expect(engine['screenShake'].intensity).toBe(10);
      expect(engine['screenShake'].duration).toBe(500);
    });

    it('should assign rarities to display items', async () => {
      await engine.initialize(mockCanvas, mockConfig);
      
      expect(engine['displayItems'].length).toBeGreaterThan(0);
      engine['displayItems'].forEach(item => {
        expect(item.rarity).toBeDefined();
        expect(typeof item.rarity).toBe('string');
      });
    });

    it('should find winner in display items', async () => {
      await engine.initialize(mockCanvas, mockConfig);
      
      expect(engine['winnerIndex']).toBeGreaterThanOrEqual(0);
      expect(engine['winnerIndex']).toBeLessThan(engine['displayItems'].length);
      
      const winnerItem = engine['displayItems'][engine['winnerIndex']];
      expect(winnerItem.participant.id).toBe(mockWinner.id);
    });
  });
});