// Animation engine exports

// Core engine classes
export { BaseAnimationEngine } from './BaseAnimationEngine';
export { AnimationEngineFactory } from './AnimationEngineFactory';

// Service classes
export { ImageCacheService } from './ImageCacheService';
export { CanvasRendererService } from './CanvasRendererService';
export { PerformanceMonitorService } from './PerformanceMonitorService';

// Specific animation engines
export { CS2CaseAnimationEngine } from './engines/CS2CaseAnimationEngine';

// React component
export { AnimationEngineComponent } from '../components/AnimationEngine';

// Re-export types for convenience
export type {
  AnimationEngine,
  AnimationEngineConfig,
  AnimationState,
  AnimationConfig,
  PerformanceMetrics,
  PerformanceMonitor,
  ImageCache,
  CanvasRenderer,
  EasingFunction,
  ParticipantDisplayItem,
  AnimationFrame,
  VisualEffect,
  AnimationError
} from '../../types/animation';