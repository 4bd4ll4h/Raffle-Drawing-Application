// Animation engine types and interfaces

import { AnimationStyle, Participant, RarityColorMap } from './index';

// ============================================================================
// ANIMATION ENGINE CORE INTERFACES
// ============================================================================

export interface AnimationEngine {
  // Lifecycle methods
  initialize(canvas: HTMLCanvasElement, config: AnimationEngineConfig): Promise<void>;
  start(): Promise<void>;
  pause(): void;
  resume(): void;
  stop(): void;
  destroy(): void;

  // State management
  getState(): AnimationState;
  isRunning(): boolean;
  getProgress(): number; // 0-1

  // Performance monitoring
  getFPS(): number;
  getPerformanceMetrics(): PerformanceMetrics;

  // Event handlers
  onComplete?: () => void;
  onProgress?: (progress: number) => void;
  onError?: (error: AnimationError) => void;
}

export interface AnimationEngineConfig {
  participants: Participant[];
  winner: Participant;
  animationStyle: AnimationStyle;
  backgroundImage?: string;
  config: AnimationConfig;
  recordingEnabled: boolean;
}

export interface AnimationConfig {
  duration: number; // in milliseconds
  easing: EasingFunction;
  particleCount?: number;
  scrollSpeed: number;
  rarityColors: RarityColorMap;
  showRarityEffects: boolean;
  targetFPS: number;
  enableHardwareAcceleration: boolean;
}

export interface AnimationState {
  status: 'idle' | 'initializing' | 'running' | 'paused' | 'completed' | 'error';
  progress: number; // 0-1
  currentFrame: number;
  totalFrames: number;
  elapsedTime: number;
  remainingTime: number;
  winner?: Participant;
}

export interface PerformanceMetrics {
  currentFPS: number;
  averageFPS: number;
  minFPS: number;
  maxFPS: number;
  frameDrops: number;
  memoryUsage: number; // in MB
  renderTime: number; // average render time per frame in ms
  lastUpdateTime: number;
}

// ============================================================================
// EASING FUNCTIONS
// ============================================================================

export type EasingFunction = (t: number) => number;

export const EasingFunctions = {
  linear: (t: number) => t,
  easeInQuad: (t: number) => t * t,
  easeOutQuad: (t: number) => t * (2 - t),
  easeInOutQuad: (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  easeInCubic: (t: number) => t * t * t,
  easeOutCubic: (t: number) => (--t) * t * t + 1,
  easeInOutCubic: (t: number) => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
  easeInQuart: (t: number) => t * t * t * t,
  easeOutQuart: (t: number) => 1 - (--t) * t * t * t,
  easeInOutQuart: (t: number) => t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t,
  easeInQuint: (t: number) => t * t * t * t * t,
  easeOutQuint: (t: number) => 1 + (--t) * t * t * t * t,
  easeInOutQuint: (t: number) => t < 0.5 ? 16 * t * t * t * t * t : 1 + 16 * (--t) * t * t * t * t,
  easeInSine: (t: number) => 1 - Math.cos(t * Math.PI / 2),
  easeOutSine: (t: number) => Math.sin(t * Math.PI / 2),
  easeInOutSine: (t: number) => -(Math.cos(Math.PI * t) - 1) / 2,
  easeInExpo: (t: number) => t === 0 ? 0 : Math.pow(2, 10 * (t - 1)),
  easeOutExpo: (t: number) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
  easeInOutExpo: (t: number) => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    if (t < 0.5) return Math.pow(2, 20 * t - 10) / 2;
    return (2 - Math.pow(2, -20 * t + 10)) / 2;
  },
  easeInCirc: (t: number) => 1 - Math.sqrt(1 - t * t),
  easeOutCirc: (t: number) => Math.sqrt(1 - (--t) * t),
  easeInOutCirc: (t: number) => t < 0.5 ? (1 - Math.sqrt(1 - 4 * t * t)) / 2 : (Math.sqrt(1 - (-2 * t + 2) * (-2 * t + 2)) + 1) / 2,
  easeInBack: (t: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return c3 * t * t * t - c1 * t * t;
  },
  easeOutBack: (t: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  easeInOutBack: (t: number) => {
    const c1 = 1.70158;
    const c2 = c1 * 1.525;
    return t < 0.5
      ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
      : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
  },
  easeInElastic: (t: number) => {
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 : -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * c4);
  },
  easeOutElastic: (t: number) => {
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },
  easeInOutElastic: (t: number) => {
    const c5 = (2 * Math.PI) / 4.5;
    return t === 0 ? 0 : t === 1 ? 1 : t < 0.5
      ? -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * c5)) / 2
      : (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * c5)) / 2 + 1;
  },
  easeInBounce: (t: number) => 1 - EasingFunctions.easeOutBounce(1 - t),
  easeOutBounce: (t: number) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) {
      return n1 * t * t;
    } else if (t < 2 / d1) {
      return n1 * (t -= 1.5 / d1) * t + 0.75;
    } else if (t < 2.5 / d1) {
      return n1 * (t -= 2.25 / d1) * t + 0.9375;
    } else {
      return n1 * (t -= 2.625 / d1) * t + 0.984375;
    }
  },
  easeInOutBounce: (t: number) => t < 0.5
    ? (1 - EasingFunctions.easeOutBounce(1 - 2 * t)) / 2
    : (1 + EasingFunctions.easeOutBounce(2 * t - 1)) / 2
};

// ============================================================================
// IMAGE LOADING AND CACHING
// ============================================================================

export interface ImageCache {
  get(url: string): HTMLImageElement | null;
  set(url: string, image: HTMLImageElement): void;
  preload(urls: string[]): Promise<void>;
  clear(): void;
  getSize(): number;
  getMemoryUsage(): number; // in bytes
}

export interface ImageLoadOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0-1
  crossOrigin?: string;
  timeout?: number; // in ms
}

export interface ImageLoadResult {
  image: HTMLImageElement;
  originalUrl: string;
  loadTime: number;
  cached: boolean;
  dimensions: {
    width: number;
    height: number;
  };
}

// ============================================================================
// CANVAS RENDERING
// ============================================================================

export interface CanvasRenderer {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  width: number;
  height: number;
  pixelRatio: number;

  // Setup methods
  initialize(canvas: HTMLCanvasElement): void;
  resize(width: number, height: number): void;
  clear(): void;

  // Drawing methods
  drawImage(image: HTMLImageElement, x: number, y: number, width?: number, height?: number): void;
  drawText(text: string, x: number, y: number, options?: TextOptions): void;
  drawRect(x: number, y: number, width: number, height: number, options?: RectOptions): void;
  drawCircle(x: number, y: number, radius: number, options?: CircleOptions): void;
  drawRarityOverlay(x: number, y: number, width: number, height: number, rarity: string, colors: RarityColorMap): void;

  // Transform methods
  save(): void;
  restore(): void;
  translate(x: number, y: number): void;
  rotate(angle: number): void;
  scale(x: number, y: number): void;
  setAlpha(alpha: number): void;

  // Performance methods
  enableHardwareAcceleration(): void;
  optimizeForAnimation(): void;
}

export interface TextOptions {
  font?: string;
  fontSize?: number;
  fontWeight?: string;
  color?: string;
  align?: 'left' | 'center' | 'right';
  baseline?: 'top' | 'middle' | 'bottom';
  maxWidth?: number;
  stroke?: {
    color: string;
    width: number;
  };
  shadow?: {
    color: string;
    blur: number;
    offsetX: number;
    offsetY: number;
  };
}

export interface RectOptions {
  fill?: string;
  stroke?: {
    color: string;
    width: number;
  };
  cornerRadius?: number;
  shadow?: {
    color: string;
    blur: number;
    offsetX: number;
    offsetY: number;
  };
}

export interface CircleOptions {
  fill?: string;
  stroke?: {
    color: string;
    width: number;
  };
  shadow?: {
    color: string;
    blur: number;
    offsetX: number;
    offsetY: number;
  };
}

// ============================================================================
// ANIMATION SPECIFIC INTERFACES
// ============================================================================

export interface ParticipantDisplayItem {
  participant: Participant;
  image?: HTMLImageElement;
  rarity: string;
  position: {
    x: number;
    y: number;
  };
  size: {
    width: number;
    height: number;
  };
  rotation?: number;
  scale?: number;
  alpha?: number;
  velocity?: {
    x: number;
    y: number;
  };
}

export interface AnimationFrame {
  timestamp: number;
  deltaTime: number;
  progress: number;
  items: ParticipantDisplayItem[];
  effects?: VisualEffect[];
}

export interface VisualEffect {
  type: 'particle' | 'glow' | 'flash' | 'shake' | 'zoom' | 'fade';
  position: {
    x: number;
    y: number;
  };
  properties: Record<string, any>;
  duration: number;
  startTime: number;
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

export interface AnimationError extends Error {
  type: 'canvas_error' | 'image_load_failed' | 'performance_degradation' | 'memory_exceeded' | 'gpu_error' | 'initialization_failed';
  animationStyle: AnimationStyle;
  participantCount: number;
  recoverable: boolean;
  context?: Record<string, any>;
}

// ============================================================================
// PERFORMANCE MONITORING
// ============================================================================

export interface PerformanceMonitor {
  startFrame(): void;
  endFrame(): void;
  getFPS(): number;
  getAverageFPS(): number;
  getMetrics(): PerformanceMetrics;
  reset(): void;
  isPerformanceGood(): boolean;
  getRecommendations(): string[];
}

export interface FrameTimingData {
  frameNumber: number;
  startTime: number;
  endTime: number;
  renderTime: number;
  fps: number;
  memoryUsage?: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const ANIMATION_CONSTANTS = {
  TARGET_FPS: 60,
  MIN_ACCEPTABLE_FPS: 30,
  PERFORMANCE_SAMPLE_SIZE: 60, // frames to average for performance metrics
  MAX_MEMORY_USAGE_MB: 512,
  IMAGE_CACHE_MAX_SIZE: 100,
  DEFAULT_ANIMATION_DURATION: 5000, // 5 seconds
  FRAME_TIMEOUT_MS: 33, // ~30fps fallback
  HARDWARE_ACCELERATION_THRESHOLD: 50, // participant count threshold
} as const;

export const CANVAS_SETTINGS = {
  ALPHA: false, // disable alpha channel for better performance
  ANTIALIAS: true,
  DEPTH: false,
  PRESERVE_DRAWING_BUFFER: false,
  POWER_PREFERENCE: 'high-performance' as const,
  FAIL_IF_MAJOR_PERFORMANCE_CAVEAT: false,
} as const;