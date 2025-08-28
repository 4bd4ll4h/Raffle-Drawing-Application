export interface MemoryStats {
  usedJSHeapSize: number; // in bytes
  totalJSHeapSize: number; // in bytes
  jsHeapSizeLimit: number; // in bytes
  usedPercent: number;
  timestamp: number;
}

export interface MemoryThresholds {
  warning: number; // percentage (0-100)
  critical: number; // percentage (0-100)
  cleanup: number; // percentage (0-100)
}

export interface MemoryOptimizationOptions {
  enableAutoCleanup: boolean;
  cleanupInterval: number; // in milliseconds
  thresholds: MemoryThresholds;
  maxCacheSize: number; // maximum items in cache
  imageQualityReduction: boolean;
}

export class MemoryManagementService {
  private options: MemoryOptimizationOptions;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private memoryHistory: MemoryStats[] = [];
  private maxHistorySize = 100;
  private callbacks: {
    onWarning?: (stats: MemoryStats) => void;
    onCritical?: (stats: MemoryStats) => void;
    onCleanup?: (stats: MemoryStats) => void;
  } = {};

  constructor(options: Partial<MemoryOptimizationOptions> = {}) {
    this.options = {
      enableAutoCleanup: true,
      cleanupInterval: 30000, // 30 seconds
      thresholds: {
        warning: 70,
        critical: 85,
        cleanup: 80
      },
      maxCacheSize: 100,
      imageQualityReduction: false,
      ...options
    };

    if (this.options.enableAutoCleanup) {
      this.startMonitoring();
    }
  }

  /**
   * Get current memory statistics
   */
  getMemoryStats(): MemoryStats {
    let memory: any = null;
    
    // Try to get memory info from different sources
    if (typeof window !== 'undefined' && (window.performance as any)?.memory) {
      memory = (window.performance as any).memory;
    } else if (typeof performance !== 'undefined' && (performance as any).memory) {
      memory = (performance as any).memory;
    } else if (typeof process !== 'undefined' && process.memoryUsage) {
      // Node.js environment
      const nodeMemory = process.memoryUsage();
      memory = {
        usedJSHeapSize: nodeMemory.heapUsed,
        totalJSHeapSize: nodeMemory.heapTotal,
        jsHeapSizeLimit: nodeMemory.heapTotal * 2 // Estimate
      };
    }
    
    if (!memory) {
      // Fallback for environments that don't support memory monitoring
      return {
        usedJSHeapSize: 0,
        totalJSHeapSize: 0,
        jsHeapSizeLimit: 0,
        usedPercent: 0,
        timestamp: Date.now()
      };
    }

    const stats: MemoryStats = {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      usedPercent: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100,
      timestamp: Date.now()
    };

    // Add to history
    this.memoryHistory.push(stats);
    if (this.memoryHistory.length > this.maxHistorySize) {
      this.memoryHistory.shift();
    }

    return stats;
  }

  /**
   * Get memory usage trend
   */
  getMemoryTrend(): 'increasing' | 'decreasing' | 'stable' {
    if (this.memoryHistory.length < 5) {
      return 'stable';
    }

    const recent = this.memoryHistory.slice(-5);
    const first = recent[0].usedPercent;
    const last = recent[recent.length - 1].usedPercent;
    const diff = last - first;

    if (diff > 5) return 'increasing';
    if (diff < -5) return 'decreasing';
    return 'stable';
  }

  /**
   * Force garbage collection if available
   */
  forceGarbageCollection(): boolean {
    if (typeof window !== 'undefined' && typeof (window as any).gc === 'function') {
      (window as any).gc();
      return true;
    } else if (typeof global !== 'undefined' && typeof (global as any).gc === 'function') {
      (global as any).gc();
      return true;
    }
    return false;
  }

  /**
   * Optimize memory usage
   */
  optimizeMemory(): void {
    const stats = this.getMemoryStats();
    
    // Clear image caches
    this.clearImageCaches();
    
    // Clear animation caches
    this.clearAnimationCaches();
    
    // Reduce canvas quality if needed
    if (this.options.imageQualityReduction && stats.usedPercent > this.options.thresholds.critical) {
      this.reduceCanvasQuality();
    }
    
    // Force garbage collection
    this.forceGarbageCollection();
    
    // Trigger cleanup callback
    if (this.callbacks.onCleanup) {
      this.callbacks.onCleanup(stats);
    }
  }

  /**
   * Set memory event callbacks
   */
  setCallbacks(callbacks: {
    onWarning?: (stats: MemoryStats) => void;
    onCritical?: (stats: MemoryStats) => void;
    onCleanup?: (stats: MemoryStats) => void;
  }): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Start memory monitoring
   */
  startMonitoring(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(() => {
      const stats = this.getMemoryStats();
      
      if (stats.usedPercent >= this.options.thresholds.critical) {
        if (this.callbacks.onCritical) {
          this.callbacks.onCritical(stats);
        }
        this.optimizeMemory();
      } else if (stats.usedPercent >= this.options.thresholds.cleanup) {
        this.optimizeMemory();
      } else if (stats.usedPercent >= this.options.thresholds.warning) {
        if (this.callbacks.onWarning) {
          this.callbacks.onWarning(stats);
        }
      }
    }, this.options.cleanupInterval);
  }

  /**
   * Stop memory monitoring
   */
  stopMonitoring(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Update configuration
   */
  updateOptions(options: Partial<MemoryOptimizationOptions>): void {
    this.options = { ...this.options, ...options };
    
    if (this.options.enableAutoCleanup && !this.cleanupInterval) {
      this.startMonitoring();
    } else if (!this.options.enableAutoCleanup && this.cleanupInterval) {
      this.stopMonitoring();
    }
  }

  /**
   * Get memory usage recommendations
   */
  getRecommendations(): string[] {
    const stats = this.getMemoryStats();
    const trend = this.getMemoryTrend();
    const recommendations: string[] = [];

    if (stats.usedPercent > this.options.thresholds.critical) {
      recommendations.push('Memory usage is critical. Consider reducing participant count or image quality.');
    } else if (stats.usedPercent > this.options.thresholds.warning) {
      recommendations.push('Memory usage is high. Monitor performance closely.');
    }

    if (trend === 'increasing') {
      recommendations.push('Memory usage is increasing. Consider enabling auto-cleanup.');
    }

    if (!this.options.enableAutoCleanup) {
      recommendations.push('Enable auto-cleanup for better memory management.');
    }

    if (this.memoryHistory.length > 10) {
      const avgUsage = this.memoryHistory.slice(-10).reduce((sum, stat) => sum + stat.usedPercent, 0) / 10;
      if (avgUsage > 60) {
        recommendations.push('Consider using virtualization for large datasets.');
      }
    }

    return recommendations;
  }

  /**
   * Format memory size for display
   */
  formatMemorySize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  /**
   * Get detailed memory report
   */
  getMemoryReport(): {
    current: MemoryStats;
    trend: 'increasing' | 'decreasing' | 'stable';
    recommendations: string[];
    history: MemoryStats[];
    thresholds: MemoryThresholds;
  } {
    return {
      current: this.getMemoryStats(),
      trend: this.getMemoryTrend(),
      recommendations: this.getRecommendations(),
      history: [...this.memoryHistory],
      thresholds: { ...this.options.thresholds }
    };
  }

  /**
   * Clear image caches
   */
  private clearImageCaches(): void {
    if (typeof window === 'undefined') return;
    
    // Clear image cache service if available
    const imageCacheService = (window as any).imageCacheService;
    if (imageCacheService && typeof imageCacheService.cleanup === 'function') {
      imageCacheService.cleanup();
    }

    // Clear browser image cache
    if (typeof document !== 'undefined') {
      const images = document.querySelectorAll('img');
      images.forEach(img => {
        if (img.src && img.src.startsWith('blob:')) {
          URL.revokeObjectURL(img.src);
        }
      });
    }
  }

  /**
   * Clear animation caches
   */
  private clearAnimationCaches(): void {
    if (typeof document === 'undefined') return;
    
    // Clear canvas contexts
    const canvases = document.querySelectorAll('canvas');
    canvases.forEach(canvas => {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    });

    // Clear animation frame requests
    if (typeof window !== 'undefined' && (window as any).animationFrameIds) {
      (window as any).animationFrameIds.forEach((id: number) => {
        cancelAnimationFrame(id);
      });
      (window as any).animationFrameIds = [];
    }
  }

  /**
   * Reduce canvas quality for memory optimization
   */
  private reduceCanvasQuality(): void {
    if (typeof document === 'undefined') return;
    
    const canvases = document.querySelectorAll('canvas');
    canvases.forEach(canvas => {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Reduce image smoothing quality
        (ctx as any).imageSmoothingQuality = 'low';
        ctx.imageSmoothingEnabled = false;
      }
    });
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopMonitoring();
    this.memoryHistory = [];
    this.callbacks = {};
  }
}