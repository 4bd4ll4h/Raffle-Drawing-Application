// Animation engine integration tests

import { AnimationEngineFactory } from '../AnimationEngineFactory';
import { AnimationStyle, Participant, CS2_RARITY_LEVELS } from '../../../types';
import { AnimationEngineConfig, EasingFunctions, ANIMATION_CONSTANTS } from '../../../types/animation';

// Mock DOM elements
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
  arc: jest.fn(),
  quadraticCurveTo: jest.fn(),
  fill: jest.fn(),
  stroke: jest.fn(),
  getTransform: jest.fn(() => new DOMMatrix()),
  createLinearGradient: jest.fn(() => ({
    addColorStop: jest.fn()
  })),
  globalAlpha: 1,
  fillStyle: '#000',
  strokeStyle: '#000',
  lineWidth: 1,
  font: '16px Arial',
  textAlign: 'left',
  textBaseline: 'top',
  shadowColor: '',
  shadowBlur: 0,
  shadowOffsetX: 0,
  shadowOffsetY: 0,
  globalCompositeOperation: 'source-over',
  imageSmoothingEnabled: true,
  imageSmoothingQuality: 'high'
};

const mockCanvas = {
  getContext: jest.fn(() => mockContext),
  width: 800,
  height: 600,
  clientWidth: 800,
  clientHeight: 600,
  style: {},
  toDataURL: jest.fn(() => 'data:image/png;base64,mock'),
  toBlob: jest.fn((callback) => callback(new Blob()))
} as unknown as HTMLCanvasElement;

// Mock Image
class MockImage {
  public src: string = '';
  public onload: (() => void) | null = null;
  public onerror: ((event: Event | string) => void) | null = null;
  public naturalWidth: number = 100;
  public naturalHeight: number = 100;
  public complete: boolean = false;

  constructor() {
    setTimeout(() => {
      this.complete = true;
      if (this.onload) {
        this.onload();
      }
    }, 10);
  }
}

(global as any).Image = MockImage;

// Mock performance and animation frame
const mockPerformanceNow = jest.fn();
Object.defineProperty(global.performance, 'now', {
  value: mockPerformanceNow
});

const mockRequestAnimationFrame = jest.fn();
global.requestAnimationFrame = mockRequestAnimationFrame;

const mockCancelAnimationFrame = jest.fn();
global.cancelAnimationFrame = mockCancelAnimationFrame;

describe('Animation Engine Integration', () => {
  let mockParticipants: Participant[];
  let mockConfig: AnimationEngineConfig;

  beforeEach(() => {
    mockParticipants = Array.from({ length: 10 }, (_, i) => ({
      id: `participant-${i}`,
      raffleId: 'test-raffle',
      username: `User${i}`,
      profileImageUrl: `https://example.com/user${i}.jpg`,
      ticketNumber: `T${String(i).padStart(3, '0')}`,
      importDate: new Date()
    }));

    mockConfig = {
      participants: mockParticipants,
      winner: mockParticipants[5], // Middle participant as winner
      animationStyle: AnimationStyle.CS2_CASE,
      config: {
        duration: 3000, // 3 seconds for faster testing
        easing: EasingFunctions.easeOutCubic,
        scrollSpeed: 1,
        rarityColors: CS2_RARITY_LEVELS,
        showRarityEffects: true,
        targetFPS: 60,
        enableHardwareAcceleration: true
      },
      recordingEnabled: false
    };

    // Reset mocks
    jest.clearAllMocks();
    mockPerformanceNow.mockReturnValue(1000);
  });

  describe('Factory', () => {
    it('should create CS2 case animation engine', () => {
      const engine = AnimationEngineFactory.createEngine(AnimationStyle.CS2_CASE);
      expect(engine).toBeDefined();
    });

    it('should throw for unsupported animation styles', () => {
      expect(() => {
        AnimationEngineFactory.createEngine(AnimationStyle.SPINNING_WHEEL);
      }).toThrow('Spinning Wheel animation not yet implemented');
    });

    it('should validate supported styles', () => {
      expect(AnimationEngineFactory.isStyleSupported(AnimationStyle.CS2_CASE)).toBe(true);
      expect(AnimationEngineFactory.isStyleSupported(AnimationStyle.SPINNING_WHEEL)).toBe(false);
    });

    it('should provide style descriptions', () => {
      const description = AnimationEngineFactory.getStyleDescription(AnimationStyle.CS2_CASE);
      expect(description).toContain('CS2 Case Opening');
      expect(description).toContain('Horizontal scrolling');
    });
  });

  describe('Config Validation', () => {
    it('should validate valid config', () => {
      expect(() => {
        AnimationEngineFactory.validateConfig(mockConfig);
      }).not.toThrow();
    });

    it('should reject config without participants', () => {
      const invalidConfig = { ...mockConfig, participants: [] };
      
      expect(() => {
        AnimationEngineFactory.validateConfig(invalidConfig);
      }).toThrow('Animation config must include participants');
    });

    it('should reject config without winner', () => {
      const invalidConfig = { ...mockConfig, winner: null as any };
      
      expect(() => {
        AnimationEngineFactory.validateConfig(invalidConfig);
      }).toThrow('Animation config must include a winner');
    });

    it('should reject config where winner is not in participants', () => {
      const outsideWinner: Participant = {
        id: 'outside-winner',
        raffleId: 'test-raffle',
        username: 'OutsideUser',
        profileImageUrl: 'https://example.com/outside.jpg',
        ticketNumber: 'T999',
        importDate: new Date()
      };

      const invalidConfig = { ...mockConfig, winner: outsideWinner };
      
      expect(() => {
        AnimationEngineFactory.validateConfig(invalidConfig);
      }).toThrow('Winner must be one of the participants');
    });

    it('should reject config with invalid duration', () => {
      const invalidConfig = {
        ...mockConfig,
        config: { ...mockConfig.config, duration: -1000 }
      };
      
      expect(() => {
        AnimationEngineFactory.validateConfig(invalidConfig);
      }).toThrow('Animation duration must be positive');
    });

    it('should reject unsupported animation style', () => {
      const invalidConfig = {
        ...mockConfig,
        animationStyle: AnimationStyle.SPINNING_WHEEL
      };
      
      expect(() => {
        AnimationEngineFactory.validateConfig(invalidConfig);
      }).toThrow('Animation style spinning_wheel is not supported');
    });
  });

  describe('Full Animation Workflow', () => {
    it('should complete full animation lifecycle', async () => {
      const engine = AnimationEngineFactory.createEngine(AnimationStyle.CS2_CASE);
      
      // Track completion
      let animationCompleted = false;
      engine.onComplete = () => {
        animationCompleted = true;
      };

      // Initialize
      await engine.initialize(mockCanvas, mockConfig);
      expect(engine.getState().status).toBe('idle');

      // Start animation
      await engine.start();
      expect(engine.getState().status).toBe('running');

      // Simulate animation frames
      const animationCallback = mockRequestAnimationFrame.mock.calls[0][0];
      
      // Simulate multiple frames to complete animation
      for (let i = 0; i < 10; i++) {
        mockPerformanceNow.mockReturnValue(1000 + (i * 300)); // 300ms per frame
        animationCallback();
        
        if (animationCompleted) break;
      }

      // Clean up
      engine.destroy();
    }, 10000); // 10 second timeout for this test

    it('should handle pause and resume correctly', async () => {
      const engine = AnimationEngineFactory.createEngine(AnimationStyle.CS2_CASE);
      
      await engine.initialize(mockCanvas, mockConfig);
      await engine.start();
      
      expect(engine.isRunning()).toBe(true);
      
      engine.pause();
      expect(engine.isRunning()).toBe(false);
      expect(engine.getState().status).toBe('paused');
      
      engine.resume();
      expect(engine.isRunning()).toBe(true);
      expect(engine.getState().status).toBe('running');
      
      engine.destroy();
    });

    it('should track progress correctly', async () => {
      const engine = AnimationEngineFactory.createEngine(AnimationStyle.CS2_CASE);
      
      const progressUpdates: number[] = [];
      engine.onProgress = (progress) => {
        progressUpdates.push(progress);
      };

      await engine.initialize(mockCanvas, mockConfig);
      await engine.start();

      // Simulate some animation frames
      const animationCallback = mockRequestAnimationFrame.mock.calls[0][0];
      
      mockPerformanceNow.mockReturnValue(1500); // 0.5 seconds
      animationCallback();
      
      mockPerformanceNow.mockReturnValue(2000); // 1 second
      animationCallback();
      
      mockPerformanceNow.mockReturnValue(2500); // 1.5 seconds
      animationCallback();

      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[0]).toBeGreaterThan(0);
      expect(progressUpdates[progressUpdates.length - 1]).toBeLessThanOrEqual(1);
      
      engine.destroy();
    });
  });

  describe('Performance Monitoring', () => {
    it('should monitor performance during animation', async () => {
      const engine = AnimationEngineFactory.createEngine(AnimationStyle.CS2_CASE);
      
      await engine.initialize(mockCanvas, mockConfig);
      await engine.start();

      // Simulate some frames
      const animationCallback = mockRequestAnimationFrame.mock.calls[0][0];
      
      for (let i = 0; i < 5; i++) {
        mockPerformanceNow.mockReturnValue(1000 + (i * 16.67)); // 60fps timing
        animationCallback();
      }

      const metrics = engine.getPerformanceMetrics();
      expect(metrics).toHaveProperty('currentFPS');
      expect(metrics).toHaveProperty('averageFPS');
      expect(metrics).toHaveProperty('frameDrops');
      expect(metrics).toHaveProperty('memoryUsage');
      
      engine.destroy();
    });

    it('should detect performance issues', async () => {
      const engine = AnimationEngineFactory.createEngine(AnimationStyle.CS2_CASE);
      
      await engine.initialize(mockCanvas, mockConfig);
      await engine.start();

      // Simulate slow frames (poor performance)
      const animationCallback = mockRequestAnimationFrame.mock.calls[0][0];
      
      for (let i = 0; i < 10; i++) {
        mockPerformanceNow.mockReturnValue(1000 + (i * 50)); // 20fps (slow)
        animationCallback();
      }

      const metrics = engine.getPerformanceMetrics();
      expect(metrics.frameDrops).toBeGreaterThan(0);
      
      engine.destroy();
    });
  });

  describe('Error Handling', () => {
    it('should handle initialization errors', async () => {
      const engine = AnimationEngineFactory.createEngine(AnimationStyle.CS2_CASE);
      
      // Mock canvas to return null context
      const badCanvas = {
        ...mockCanvas,
        getContext: jest.fn(() => null)
      } as unknown as HTMLCanvasElement;

      let errorOccurred = false;
      engine.onError = () => {
        errorOccurred = true;
      };

      await engine.initialize(badCanvas, mockConfig);
      
      expect(engine.getState().status).toBe('error');
    });

    it('should handle runtime errors gracefully', async () => {
      const engine = AnimationEngineFactory.createEngine(AnimationStyle.CS2_CASE);
      
      let errorOccurred = false;
      engine.onError = () => {
        errorOccurred = true;
      };

      await engine.initialize(mockCanvas, mockConfig);
      await engine.start();

      // Mock context to throw error
      mockContext.clearRect.mockImplementation(() => {
        throw new Error('Canvas error');
      });

      // Simulate animation frame
      const animationCallback = mockRequestAnimationFrame.mock.calls[0][0];
      mockPerformanceNow.mockReturnValue(1100);
      animationCallback();

      expect(errorOccurred).toBe(true);
      expect(engine.getState().status).toBe('error');
      
      engine.destroy();
    });
  });

  describe('Large Dataset Performance', () => {
    it('should handle large participant lists efficiently', async () => {
      // Create large participant list
      const largeParticipantList = Array.from({ length: 1000 }, (_, i) => ({
        id: `participant-${i}`,
        raffleId: 'test-raffle',
        username: `User${i}`,
        profileImageUrl: `https://example.com/user${i}.jpg`,
        ticketNumber: `T${String(i).padStart(4, '0')}`,
        importDate: new Date()
      }));

      const largeConfig = {
        ...mockConfig,
        participants: largeParticipantList,
        winner: largeParticipantList[500] // Middle participant
      };

      const engine = AnimationEngineFactory.createEngine(AnimationStyle.CS2_CASE);
      
      const startTime = Date.now();
      await engine.initialize(mockCanvas, largeConfig);
      const initTime = Date.now() - startTime;

      // Initialization should complete within reasonable time
      expect(initTime).toBeLessThan(5000); // 5 seconds max
      
      expect(engine.getState().status).toBe('idle');
      
      engine.destroy();
    }, 10000);
  });

  describe('Memory Management', () => {
    it('should clean up resources on destroy', async () => {
      const engine = AnimationEngineFactory.createEngine(AnimationStyle.CS2_CASE);
      
      await engine.initialize(mockCanvas, mockConfig);
      await engine.start();
      
      // Verify animation is running
      expect(engine.isRunning()).toBe(true);
      
      // Destroy should clean up everything
      engine.destroy();
      
      expect(engine.isRunning()).toBe(false);
      expect(engine.getState().status).toBe('idle');
      expect(mockCancelAnimationFrame).toHaveBeenCalled();
    });
  });
});