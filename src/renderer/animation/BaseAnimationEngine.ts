// Base animation engine implementation with common functionality

import {
  AnimationEngine,
  AnimationEngineConfig,
  AnimationState,
  AnimationConfig,
  PerformanceMetrics,
  PerformanceMonitor,
  FrameTimingData,
  AnimationError,
  EasingFunction,
  EasingFunctions,
  ANIMATION_CONSTANTS
} from '../../types/animation';
import { AnimationStyle, Participant } from '../../types';
import { ImageCacheService } from './ImageCacheService';
import { CanvasRendererService } from './CanvasRendererService';
import { PerformanceMonitorService } from './PerformanceMonitorService';
import { VirtualizationService } from './VirtualizationService';

export abstract class BaseAnimationEngine implements AnimationEngine {
  protected canvas: HTMLCanvasElement | null = null;
  protected config: AnimationEngineConfig | null = null;
  protected state: AnimationState;
  protected animationId: number | null = null;
  protected startTime: number = 0;
  protected lastFrameTime: number = 0;
  
  // Services
  protected imageCache: ImageCacheService;
  protected renderer: CanvasRendererService;
  protected performanceMonitor: PerformanceMonitorService;
  protected virtualization: VirtualizationService | null = null;
  
  // Event handlers
  public onComplete?: () => void;
  public onProgress?: (progress: number) => void;
  public onError?: (error: AnimationError) => void;

  constructor() {
    this.state = {
      status: 'idle',
      progress: 0,
      currentFrame: 0,
      totalFrames: 0,
      elapsedTime: 0,
      remainingTime: 0
    };

    this.imageCache = new ImageCacheService();
    this.renderer = new CanvasRendererService();
    this.performanceMonitor = new PerformanceMonitorService();
  }

  // ============================================================================
  // LIFECYCLE METHODS
  // ============================================================================

  async initialize(canvas: HTMLCanvasElement, config: AnimationEngineConfig): Promise<void> {
    try {
      this.setState({ status: 'initializing' });
      
      this.canvas = canvas;
      this.config = config;
      
      // Initialize renderer
      this.renderer.initialize(canvas);
      
      // Calculate total frames based on duration and target FPS
      const targetFPS = config.config.targetFPS || ANIMATION_CONSTANTS.TARGET_FPS;
      const totalFrames = Math.ceil((config.config.duration / 1000) * targetFPS);
      
      this.setState({
        totalFrames,
        remainingTime: config.config.duration
      });

      // Initialize virtualization for large datasets
      if (config.participants.length > ANIMATION_CONSTANTS.HARDWARE_ACCELERATION_THRESHOLD) {
        this.virtualization = new VirtualizationService({
          viewportWidth: canvas.width,
          viewportHeight: canvas.height,
          itemWidth: 100, // Default item width
          itemHeight: 100, // Default item height
          bufferSize: 10,
          maxVisibleItems: 50
        });
        this.virtualization.initialize(config.participants);
        this.virtualization.optimizeForLargeDataset();
      }

      // Preload participant images
      await this.preloadImages();
      
      // Initialize animation-specific setup
      await this.initializeAnimation();
      
      this.setState({ status: 'idle' });
      
    } catch (error) {
      const animationError = this.createAnimationError(
        'initialization_failed',
        `Failed to initialize animation: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      );
      this.handleError(animationError);
    }
  }

  async start(): Promise<void> {
    if (!this.canvas || !this.config) {
      throw new Error('Animation engine not initialized');
    }

    if (this.state.status === 'running') {
      return;
    }

    try {
      this.setState({ status: 'running' });
      this.startTime = performance.now();
      this.lastFrameTime = this.startTime;
      this.performanceMonitor.reset();
      
      // Start the animation loop
      this.animationLoop();
      
    } catch (error) {
      const animationError = this.createAnimationError(
        'canvas_error',
        `Failed to start animation: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      );
      this.handleError(animationError);
    }
  }

  pause(): void {
    if (this.state.status === 'running') {
      this.setState({ status: 'paused' });
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
        this.animationId = null;
      }
    }
  }

  resume(): void {
    if (this.state.status === 'paused') {
      this.setState({ status: 'running' });
      this.lastFrameTime = performance.now();
      this.animationLoop();
    }
  }

  stop(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    
    this.setState({
      status: 'idle',
      progress: 0,
      currentFrame: 0,
      elapsedTime: 0,
      remainingTime: this.config?.config.duration || 0
    });
  }

  destroy(): void {
    this.stop();
    this.imageCache.clear();
    if (this.virtualization) {
      this.virtualization.destroy();
      this.virtualization = null;
    }
    this.canvas = null;
    this.config = null;
  }

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  getState(): AnimationState {
    return { ...this.state };
  }

  isRunning(): boolean {
    return this.state.status === 'running';
  }

  getProgress(): number {
    return this.state.progress;
  }

  protected setState(updates: Partial<AnimationState>): void {
    this.state = { ...this.state, ...updates };
  }

  // ============================================================================
  // PERFORMANCE MONITORING
  // ============================================================================

  getFPS(): number {
    return this.performanceMonitor.getFPS();
  }

  getPerformanceMetrics(): PerformanceMetrics {
    return this.performanceMonitor.getMetrics();
  }

  // ============================================================================
  // ANIMATION LOOP
  // ============================================================================

  private animationLoop = (): void => {
    if (this.state.status !== 'running') {
      return;
    }

    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastFrameTime;
    const elapsedTime = currentTime - this.startTime;
    
    this.performanceMonitor.startFrame();

    try {
      // Calculate progress
      const duration = this.config!.config.duration;
      const progress = Math.min(elapsedTime / duration, 1);
      const remainingTime = Math.max(duration - elapsedTime, 0);
      
      // Update state
      this.setState({
        progress,
        elapsedTime,
        remainingTime,
        currentFrame: this.state.currentFrame + 1
      });

      // Clear canvas
      this.renderer.clear();

      // Render current frame
      this.renderFrame(progress, deltaTime, elapsedTime);

      // Check if animation is complete
      if (progress >= 1) {
        this.completeAnimation();
        return;
      }

      // Call progress callback
      if (this.onProgress) {
        this.onProgress(progress);
      }

      // Check performance
      this.checkPerformance();

    } catch (error) {
      const animationError = this.createAnimationError(
        'canvas_error',
        `Error during animation frame: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      );
      this.handleError(animationError);
      return;
    }

    this.performanceMonitor.endFrame();
    this.lastFrameTime = currentTime;

    // Schedule next frame
    this.animationId = requestAnimationFrame(this.animationLoop);
  };

  private completeAnimation(): void {
    this.setState({ 
      status: 'completed',
      progress: 1,
      remainingTime: 0
    });

    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    if (this.onComplete) {
      this.onComplete();
    }
  }

  private checkPerformance(): void {
    const metrics = this.performanceMonitor.getMetrics();
    
    // Check if performance is degrading
    if (metrics.currentFPS < ANIMATION_CONSTANTS.MIN_ACCEPTABLE_FPS) {
      console.warn('Animation performance degradation detected', {
        currentFPS: metrics.currentFPS,
        averageFPS: metrics.averageFPS,
        frameDrops: metrics.frameDrops
      });
      
      // Could trigger performance optimization here
      this.optimizePerformance();
    }

    // Check memory usage
    if (metrics.memoryUsage > ANIMATION_CONSTANTS.MAX_MEMORY_USAGE_MB) {
      console.warn('High memory usage detected', {
        memoryUsage: metrics.memoryUsage,
        maxAllowed: ANIMATION_CONSTANTS.MAX_MEMORY_USAGE_MB
      });
      
      // Trigger garbage collection or cache cleanup
      this.imageCache.cleanup();
    }
  }

  private optimizePerformance(): void {
    // Reduce quality settings if performance is poor
    if (this.config && this.config.config.enableHardwareAcceleration) {
      // Could reduce particle count, image quality, etc.
      console.log('Applying performance optimizations');
    }
  }

  // ============================================================================
  // IMAGE PRELOADING
  // ============================================================================

  private async preloadImages(): Promise<void> {
    if (!this.config) return;

    const imageUrls = this.config.participants.map(p => p.profileImageUrl);
    
    // Add background image if present
    if (this.config.backgroundImage) {
      imageUrls.push(this.config.backgroundImage);
    }

    try {
      await this.imageCache.preload(imageUrls);
    } catch (error) {
      console.warn('Some images failed to preload:', error);
      // Continue with animation even if some images fail to load
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  protected getEasingFunction(): EasingFunction {
    const easingName = this.config?.config.easing;
    if (typeof easingName === 'function') {
      return easingName;
    }
    
    // Default to easeOutCubic for smooth deceleration
    return EasingFunctions.easeOutCubic;
  }

  protected createAnimationError(
    type: AnimationError['type'],
    message: string,
    originalError?: any
  ): AnimationError {
    const error = new Error(message) as AnimationError;
    error.type = type;
    error.animationStyle = this.config?.animationStyle || AnimationStyle.CS2_CASE;
    error.participantCount = this.config?.participants.length || 0;
    error.recoverable = type !== 'memory_exceeded' && type !== 'gpu_error';
    error.context = {
      state: this.state,
      originalError: originalError?.message || originalError
    };
    
    return error;
  }

  protected handleError(error: AnimationError): void {
    console.error('Animation error:', error);
    
    this.setState({ status: 'error' });
    
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    if (this.onError) {
      this.onError(error);
    }
  }

  // ============================================================================
  // ABSTRACT METHODS (to be implemented by specific animation styles)
  // ============================================================================

  protected abstract initializeAnimation(): Promise<void>;
  protected abstract renderFrame(progress: number, deltaTime: number, elapsedTime: number): void;
}