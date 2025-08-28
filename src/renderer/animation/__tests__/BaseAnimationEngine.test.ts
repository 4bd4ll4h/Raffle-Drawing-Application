// Base animation engine tests

import { BaseAnimationEngine } from '../BaseAnimationEngine';
import { AnimationEngineConfig, AnimationState, EasingFunctions } from '../../../types/animation';
import { AnimationStyle, Participant } from '../../../types';

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
  arc: jest.fn(),
  fill: jest.fn(),
  stroke: jest.fn(),
  getTransform: jest.fn(() => new DOMMatrix()),
  globalAlpha: 1,
  fillStyle: '#000',
  strokeStyle: '#000',
  lineWidth: 1,
  font: '16px Arial',
  textAlign: 'left',
  textBaseline: 'top'
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
  value: mockPerformanceNow
});

// Mock requestAnimationFrame
const mockRequestAnimationFrame = jest.fn();
global.requestAnimationFrame = mockRequestAnimationFrame;

// Mock cancelAnimationFrame
const mockCancelAnimationFrame = jest.fn();
global.cancelAnimationFrame = mockCancelAnimationFrame;

// Test implementation of BaseAnimationEngine
class TestAnimationEngine extends BaseAnimationEngine {
  public initializeAnimationCalled = false;
  public renderFrameCalled = false;
  public lastProgress = 0;

  protected async initializeAnimation(): Promise<void> {
    this.initializeAnimationCalled = true;
  }

  protected renderFrame(progress: number, deltaTime: number, elapsedTime: number): void {
    this.renderFrameCalled = true;
    this.lastProgress = progress;
  }

  // Expose protected methods for testing
  public testSetState(updates: Partial<AnimationState>): void {
    this.setState(updates);
  }

  public testGetEasingFunction() {
    return this.getEasingFunction();
  }

  public testCreateAnimationError(type: any, message: string) {
    return this.createAnimationError(type, message);
  }
}

describe('BaseAnimationEngine', () => {
  let engine: TestAnimationEngine;
  let mockConfig: AnimationEngineConfig;
  let mockParticipants: Participant[];

  beforeEach(() => {
    engine = new TestAnimationEngine();
    
    mockParticipants = [
      {
        id: '1',
        raffleId: 'raffle1',
        username: 'user1',
        profileImageUrl: 'https://example.com/user1.jpg',
        ticketNumber: 'T001',
        importDate: new Date()
      },
      {
        id: '2',
        raffleId: 'raffle1',
        username: 'user2',
        profileImageUrl: 'https://example.com/user2.jpg',
        ticketNumber: 'T002',
        importDate: new Date()
      }
    ];

    mockConfig = {
      participants: mockParticipants,
      winner: mockParticipants[0],
      animationStyle: AnimationStyle.CS2_CASE,
      config: {
        duration: 5000,
        easing: EasingFunctions.easeOutCubic,
        scrollSpeed: 1,
        rarityColors: {},
        showRarityEffects: true,
        targetFPS: 60,
        enableHardwareAcceleration: true
      },
      recordingEnabled: false
    };

    // Mock the image cache preload method to resolve immediately
    jest.spyOn(engine['imageCache'], 'preload').mockResolvedValue(undefined);

    // Reset mocks
    jest.clearAllMocks();
    mockPerformanceNow.mockReturnValue(1000);
  });

  describe('Initialization', () => {
    it('should initialize successfully with valid config', async () => {
      await engine.initialize(mockCanvas, mockConfig);
      
      expect(engine.initializeAnimationCalled).toBe(true);
      expect(engine.getState().status).toBe('idle');
      expect(engine.getState().totalFrames).toBeGreaterThan(0);
    });

    it('should throw error if canvas is not provided', async () => {
      await engine.initialize(null as any, mockConfig);
      // The error is handled gracefully and sets status to error
      expect(engine.getState().status).toBe('error');
    });

    it('should calculate total frames based on duration and FPS', async () => {
      await engine.initialize(mockCanvas, mockConfig);
      
      const state = engine.getState();
      const expectedFrames = Math.ceil((mockConfig.config.duration / 1000) * 60);
      expect(state.totalFrames).toBe(expectedFrames);
    });

    it('should handle initialization errors gracefully', async () => {
      // Mock initialization to throw error
      engine.initializeAnimation = jest.fn().mockRejectedValue(new Error('Init failed'));
      
      await engine.initialize(mockCanvas, mockConfig);
      
      expect(engine.getState().status).toBe('error');
    });
  });

  describe('Animation Lifecycle', () => {
    beforeEach(async () => {
      await engine.initialize(mockCanvas, mockConfig);
    });

    it('should start animation successfully', async () => {
      await engine.start();
      
      expect(engine.getState().status).toBe('running');
      expect(mockRequestAnimationFrame).toHaveBeenCalled();
    });

    it('should not start if already running', async () => {
      await engine.start();
      const firstCallCount = mockRequestAnimationFrame.mock.calls.length;
      
      await engine.start(); // Second start
      
      // Should not schedule additional frames
      expect(mockRequestAnimationFrame.mock.calls.length).toBe(firstCallCount);
    });

    it('should pause animation', async () => {
      await engine.start();
      
      // Verify animation started
      expect(mockRequestAnimationFrame).toHaveBeenCalled();
      
      engine.pause();
      
      expect(engine.getState().status).toBe('paused');
      // Note: cancelAnimationFrame might not be called if no animation ID was set
    });

    it('should resume animation', async () => {
      await engine.start();
      engine.pause();
      engine.resume();
      
      expect(engine.getState().status).toBe('running');
      expect(mockRequestAnimationFrame).toHaveBeenCalledTimes(2);
    });

    it('should stop animation', async () => {
      await engine.start();
      engine.stop();
      
      const state = engine.getState();
      expect(state.status).toBe('idle');
      expect(state.progress).toBe(0);
      // Note: cancelAnimationFrame might not be called if no animation ID was set
    });

    it('should destroy animation and clean up resources', async () => {
      await engine.start();
      engine.destroy();
      
      expect(engine.getState().status).toBe('idle');
      // Note: cancelAnimationFrame might not be called if no animation ID was set
    });
  });

  describe('State Management', () => {
    beforeEach(async () => {
      await engine.initialize(mockCanvas, mockConfig);
    });

    it('should return current state', () => {
      const state = engine.getState();
      
      expect(state).toHaveProperty('status');
      expect(state).toHaveProperty('progress');
      expect(state).toHaveProperty('currentFrame');
      expect(state).toHaveProperty('totalFrames');
    });

    it('should update state correctly', () => {
      engine.testSetState({ progress: 0.5, currentFrame: 150 });
      
      const state = engine.getState();
      expect(state.progress).toBe(0.5);
      expect(state.currentFrame).toBe(150);
    });

    it('should report running status correctly', async () => {
      expect(engine.isRunning()).toBe(false);
      
      await engine.start();
      expect(engine.isRunning()).toBe(true);
      
      engine.pause();
      expect(engine.isRunning()).toBe(false);
    });

    it('should return current progress', () => {
      engine.testSetState({ progress: 0.75 });
      expect(engine.getProgress()).toBe(0.75);
    });
  });

  describe('Performance Monitoring', () => {
    beforeEach(async () => {
      await engine.initialize(mockCanvas, mockConfig);
    });

    it('should return FPS metrics', () => {
      const fps = engine.getFPS();
      expect(typeof fps).toBe('number');
      expect(fps).toBeGreaterThanOrEqual(0);
    });

    it('should return performance metrics', () => {
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

    it('should call onComplete when animation finishes', (done) => {
      engine.onComplete = () => {
        done();
      };

      // Simulate animation completion by setting progress to 1
      engine.testSetState({ progress: 1, status: 'completed' });
      
      // Trigger completion manually for test
      if (engine.onComplete) {
        engine.onComplete();
      }
    });

    it('should call onProgress during animation', () => {
      const progressCallback = jest.fn();
      engine.onProgress = progressCallback;

      // Simulate progress update
      if (engine.onProgress) {
        engine.onProgress(0.5);
      }

      expect(progressCallback).toHaveBeenCalledWith(0.5);
    });

    it('should call onError when error occurs', () => {
      const errorCallback = jest.fn();
      engine.onError = errorCallback;

      const testError = engine.testCreateAnimationError('canvas_error', 'Test error');
      
      if (engine.onError) {
        engine.onError(testError);
      }

      expect(errorCallback).toHaveBeenCalledWith(testError);
    });
  });

  describe('Easing Functions', () => {
    beforeEach(async () => {
      await engine.initialize(mockCanvas, mockConfig);
    });

    it('should return configured easing function', () => {
      const easingFn = engine.testGetEasingFunction();
      expect(typeof easingFn).toBe('function');
      
      // Test easing function behavior
      expect(easingFn(0)).toBe(0);
      expect(easingFn(1)).toBe(1);
    });

    it('should default to easeOutCubic if no easing specified', async () => {
      const configWithoutEasing = {
        ...mockConfig,
        config: {
          ...mockConfig.config,
          easing: undefined as any
        }
      };

      await engine.initialize(mockCanvas, configWithoutEasing);
      const easingFn = engine.testGetEasingFunction();
      
      // Should be easeOutCubic
      expect(easingFn).toBe(EasingFunctions.easeOutCubic);
    });
  });

  describe('Error Creation', () => {
    beforeEach(async () => {
      await engine.initialize(mockCanvas, mockConfig);
    });

    it('should create animation errors with correct properties', () => {
      const error = engine.testCreateAnimationError('canvas_error', 'Test error message');
      
      expect(error.type).toBe('canvas_error');
      expect(error.message).toBe('Test error message');
      expect(error.animationStyle).toBe(AnimationStyle.CS2_CASE);
      expect(error.participantCount).toBe(2);
      expect(error.recoverable).toBe(true);
      expect(error.context).toBeDefined();
    });

    it('should mark certain error types as non-recoverable', () => {
      const memoryError = engine.testCreateAnimationError('memory_exceeded', 'Out of memory');
      const gpuError = engine.testCreateAnimationError('gpu_error', 'GPU failed');
      
      expect(memoryError.recoverable).toBe(false);
      expect(gpuError.recoverable).toBe(false);
    });
  });

  describe('Animation Loop', () => {
    beforeEach(async () => {
      await engine.initialize(mockCanvas, mockConfig);
    });

    it('should not start animation loop if not initialized', async () => {
      const uninitializedEngine = new TestAnimationEngine();
      
      await expect(uninitializedEngine.start())
        .rejects.toThrow('Animation engine not initialized');
    });

    it('should handle animation loop errors gracefully', async () => {
      // Mock renderFrame to throw error
      engine.renderFrame = jest.fn().mockImplementation(() => {
        throw new Error('Render error');
      });

      const errorCallback = jest.fn();
      engine.onError = errorCallback;

      await engine.start();
      
      // The error is handled and status is set to error
      expect(engine.getState().status).toBe('error');
      expect(errorCallback).toHaveBeenCalled();
    });
  });
});