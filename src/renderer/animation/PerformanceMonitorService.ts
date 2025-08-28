// Performance monitoring service for animation engine

import {
  PerformanceMonitor,
  PerformanceMetrics,
  FrameTimingData,
  ANIMATION_CONSTANTS
} from '../../types/animation';

export class PerformanceMonitorService implements PerformanceMonitor {
  private frameData: FrameTimingData[] = [];
  private currentFrameStart: number = 0;
  private frameCount: number = 0;
  private startTime: number = 0;
  private lastFPSUpdate: number = 0;
  private currentFPS: number = 0;
  private frameDrops: number = 0;
  private memoryUsage: number = 0;

  private readonly maxSamples = ANIMATION_CONSTANTS.PERFORMANCE_SAMPLE_SIZE;
  private readonly targetFrameTime = 1000 / ANIMATION_CONSTANTS.TARGET_FPS; // ~16.67ms for 60fps

  constructor() {
    this.reset();
  }

  // ============================================================================
  // FRAME TIMING
  // ============================================================================

  startFrame(): void {
    this.currentFrameStart = performance.now();
  }

  endFrame(): void {
    const endTime = performance.now();
    const renderTime = endTime - this.currentFrameStart;
    const fps = this.calculateInstantFPS(endTime);

    // Record frame data
    const frameData: FrameTimingData = {
      frameNumber: this.frameCount,
      startTime: this.currentFrameStart,
      endTime,
      renderTime,
      fps,
      memoryUsage: this.getMemoryUsage()
    };

    this.addFrameData(frameData);
    this.frameCount++;

    // Check for frame drops
    if (renderTime > this.targetFrameTime * 1.5) {
      this.frameDrops++;
    }

    // Update current FPS periodically
    if (endTime - this.lastFPSUpdate > 250) { // Update every 250ms
      this.currentFPS = fps;
      this.lastFPSUpdate = endTime;
    }
  }

  private calculateInstantFPS(currentTime: number): number {
    if (this.frameData.length < 2) {
      return 0;
    }

    const recentFrames = this.frameData.slice(-10); // Use last 10 frames
    if (recentFrames.length < 2) {
      return 0;
    }

    const timeSpan = recentFrames[recentFrames.length - 1].endTime - recentFrames[0].startTime;
    const frameCount = recentFrames.length - 1;
    
    return frameCount > 0 ? (frameCount * 1000) / timeSpan : 0;
  }

  private addFrameData(data: FrameTimingData): void {
    this.frameData.push(data);
    
    // Keep only recent samples
    if (this.frameData.length > this.maxSamples) {
      this.frameData.shift();
    }
  }

  // ============================================================================
  // PERFORMANCE METRICS
  // ============================================================================

  getFPS(): number {
    return this.currentFPS;
  }

  getAverageFPS(): number {
    if (this.frameData.length < 2) {
      return 0;
    }

    const totalTime = this.frameData[this.frameData.length - 1].endTime - this.frameData[0].startTime;
    const frameCount = this.frameData.length - 1;
    
    return frameCount > 0 ? (frameCount * 1000) / totalTime : 0;
  }

  getMetrics(): PerformanceMetrics {
    const renderTimes = this.frameData.map(f => f.renderTime);
    const fpsSamples = this.frameData.map(f => f.fps).filter(fps => fps > 0);

    return {
      currentFPS: this.currentFPS,
      averageFPS: this.getAverageFPS(),
      minFPS: fpsSamples.length > 0 ? Math.min(...fpsSamples) : 0,
      maxFPS: fpsSamples.length > 0 ? Math.max(...fpsSamples) : 0,
      frameDrops: this.frameDrops,
      memoryUsage: this.getMemoryUsage(),
      renderTime: renderTimes.length > 0 ? renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length : 0,
      lastUpdateTime: performance.now()
    };
  }

  reset(): void {
    this.frameData = [];
    this.currentFrameStart = 0;
    this.frameCount = 0;
    this.startTime = performance.now();
    this.lastFPSUpdate = this.startTime;
    this.currentFPS = 0;
    this.frameDrops = 0;
    this.memoryUsage = 0;
  }

  // ============================================================================
  // PERFORMANCE ANALYSIS
  // ============================================================================

  isPerformanceGood(): boolean {
    const metrics = this.getMetrics();
    
    // Consider performance good if:
    // - Average FPS is above minimum threshold
    // - Frame drops are minimal
    // - Memory usage is reasonable
    return (
      metrics.averageFPS >= ANIMATION_CONSTANTS.MIN_ACCEPTABLE_FPS &&
      metrics.frameDrops < this.frameCount * 0.05 && // Less than 5% frame drops
      metrics.memoryUsage < ANIMATION_CONSTANTS.MAX_MEMORY_USAGE_MB
    );
  }

  getRecommendations(): string[] {
    const recommendations: string[] = [];
    const metrics = this.getMetrics();

    if (metrics.averageFPS < ANIMATION_CONSTANTS.MIN_ACCEPTABLE_FPS) {
      recommendations.push('Consider reducing animation complexity or participant count');
    }

    if (metrics.frameDrops > this.frameCount * 0.1) {
      recommendations.push('High frame drop rate detected - enable hardware acceleration');
    }

    if (metrics.memoryUsage > ANIMATION_CONSTANTS.MAX_MEMORY_USAGE_MB * 0.8) {
      recommendations.push('High memory usage - consider clearing image cache');
    }

    if (metrics.renderTime > this.targetFrameTime) {
      recommendations.push('Render time exceeds target - optimize drawing operations');
    }

    if (recommendations.length === 0) {
      recommendations.push('Performance is optimal');
    }

    return recommendations;
  }

  // ============================================================================
  // MEMORY MONITORING
  // ============================================================================

  private getMemoryUsage(): number {
    // Try to get actual memory usage if available
    if ('memory' in performance) {
      const memInfo = (performance as any).memory;
      if (memInfo && memInfo.usedJSHeapSize) {
        return memInfo.usedJSHeapSize / (1024 * 1024); // Convert to MB
      }
    }

    // Fallback to estimated usage
    return this.memoryUsage;
  }

  updateMemoryUsage(usage: number): void {
    this.memoryUsage = usage;
  }

  // ============================================================================
  // PERFORMANCE REPORTING
  // ============================================================================

  getPerformanceReport(): {
    summary: PerformanceMetrics;
    recommendations: string[];
    frameHistory: FrameTimingData[];
    isGood: boolean;
  } {
    return {
      summary: this.getMetrics(),
      recommendations: this.getRecommendations(),
      frameHistory: [...this.frameData],
      isGood: this.isPerformanceGood()
    };
  }

  // Get performance statistics for debugging
  getDetailedStats(): {
    totalFrames: number;
    totalTime: number;
    averageRenderTime: number;
    frameDropPercentage: number;
    fpsDistribution: {
      excellent: number; // >50 fps
      good: number; // 30-50 fps
      poor: number; // <30 fps
    };
  } {
    const renderTimes = this.frameData.map(f => f.renderTime);
    const fpsSamples = this.frameData.map(f => f.fps).filter(fps => fps > 0);
    
    const totalTime = this.frameData.length > 0 
      ? this.frameData[this.frameData.length - 1].endTime - this.frameData[0].startTime
      : 0;

    const fpsDistribution = fpsSamples.reduce(
      (acc, fps) => {
        if (fps > 50) acc.excellent++;
        else if (fps >= 30) acc.good++;
        else acc.poor++;
        return acc;
      },
      { excellent: 0, good: 0, poor: 0 }
    );

    return {
      totalFrames: this.frameCount,
      totalTime,
      averageRenderTime: renderTimes.length > 0 
        ? renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length 
        : 0,
      frameDropPercentage: this.frameCount > 0 ? (this.frameDrops / this.frameCount) * 100 : 0,
      fpsDistribution
    };
  }

  // ============================================================================
  // PERFORMANCE OPTIMIZATION HINTS
  // ============================================================================

  shouldReduceQuality(): boolean {
    const metrics = this.getMetrics();
    return (
      metrics.averageFPS < ANIMATION_CONSTANTS.MIN_ACCEPTABLE_FPS * 0.8 ||
      metrics.frameDrops > this.frameCount * 0.15
    );
  }

  shouldEnableHardwareAcceleration(): boolean {
    const metrics = this.getMetrics();
    return (
      metrics.averageFPS < ANIMATION_CONSTANTS.TARGET_FPS * 0.8 &&
      metrics.renderTime > this.targetFrameTime * 1.2
    );
  }

  shouldClearCache(): boolean {
    return this.getMemoryUsage() > ANIMATION_CONSTANTS.MAX_MEMORY_USAGE_MB * 0.9;
  }

  // Export performance data for analysis
  exportPerformanceData(): string {
    const report = this.getPerformanceReport();
    const stats = this.getDetailedStats();
    
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      summary: report.summary,
      recommendations: report.recommendations,
      detailedStats: stats,
      frameData: this.frameData.slice(-100) // Last 100 frames
    }, null, 2);
  }
}