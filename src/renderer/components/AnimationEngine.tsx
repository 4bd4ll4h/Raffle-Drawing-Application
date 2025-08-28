// React component wrapper for the animation engine

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { AnimationEngineProps } from '../../types';
import { AnimationEngine, AnimationState, PerformanceMetrics, AnimationError } from '../../types/animation';
import { AnimationEngineFactory } from '../animation/AnimationEngineFactory';
import { EasingFunctions, ANIMATION_CONSTANTS } from '../../types/animation';
import { RecordingControls } from './RecordingControls';

interface AnimationEngineComponentState {
  isInitialized: boolean;
  isRunning: boolean;
  progress: number;
  error: string | null;
  performanceMetrics: PerformanceMetrics | null;
  recordingActive: boolean;
}

export const AnimationEngineComponent: React.FC<AnimationEngineProps> = ({
  participants,
  winner,
  animationStyle,
  backgroundImage,
  onAnimationComplete,
  recordingEnabled,
  config
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<AnimationEngine | null>(null);
  const [state, setState] = useState<AnimationEngineComponentState>({
    isInitialized: false,
    isRunning: false,
    progress: 0,
    error: null,
    performanceMetrics: null,
    recordingActive: false
  });

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  const initializeEngine = useCallback(async () => {
    if (!canvasRef.current) {
      setState(prev => ({ ...prev, error: 'Canvas not available' }));
      return;
    }

    try {
      setState(prev => ({ ...prev, error: null }));

      // Create engine
      const engine = AnimationEngineFactory.createEngine(animationStyle);
      engineRef.current = engine;

      // Set up event handlers
      engine.onComplete = () => {
        setState(prev => ({ ...prev, isRunning: false, progress: 1 }));
        onAnimationComplete();
      };

      engine.onProgress = (progress: number) => {
        setState(prev => ({ 
          ...prev, 
          progress,
          performanceMetrics: engine.getPerformanceMetrics()
        }));
      };

      engine.onError = (error: AnimationError) => {
        setState(prev => ({ 
          ...prev, 
          error: error.message,
          isRunning: false
        }));
        console.error('Animation error:', error);
      };

      // Initialize engine
      const easingFunction = typeof config.easing === 'string' 
        ? EasingFunctions.easeOutCubic 
        : config.easing || EasingFunctions.easeOutCubic;
        
      const engineConfig = {
        participants,
        winner,
        animationStyle,
        backgroundImage,
        config: {
          ...config,
          easing: easingFunction,
          targetFPS: config.targetFPS || ANIMATION_CONSTANTS.TARGET_FPS,
          enableHardwareAcceleration: config.enableHardwareAcceleration ?? true
        },
        recordingEnabled
      };

      // Validate config
      AnimationEngineFactory.validateConfig(engineConfig);

      await engine.initialize(canvasRef.current, engineConfig);

      setState(prev => ({ ...prev, isInitialized: true }));

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown initialization error';
      setState(prev => ({ ...prev, error: errorMessage }));
      console.error('Failed to initialize animation engine:', error);
    }
  }, [participants, winner, animationStyle, backgroundImage, config, recordingEnabled, onAnimationComplete]);

  // ============================================================================
  // LIFECYCLE EFFECTS
  // ============================================================================

  useEffect(() => {
    initializeEngine();

    return () => {
      if (engineRef.current) {
        engineRef.current.destroy();
        engineRef.current = null;
      }
    };
  }, [initializeEngine]);

  // Handle canvas resize
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current && engineRef.current) {
        const canvas = canvasRef.current;
        const container = canvas.parentElement;
        if (container) {
          canvas.width = container.clientWidth;
          canvas.height = container.clientHeight;
        }
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial resize

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // ============================================================================
  // RECORDING CONTROLS
  // ============================================================================

  const handleStartRecording = useCallback(async (options: any) => {
    try {
      const result = await window.electronAPI?.startRecording?.(options);
      if (result?.success) {
        setState(prev => ({ ...prev, recordingActive: true }));
      } else {
        console.error('Failed to start recording:', result?.error);
      }
    } catch (error) {
      console.error('Recording start error:', error);
    }
  }, []);

  const handleStopRecording = useCallback(async () => {
    try {
      const result = await window.electronAPI?.stopRecording?.();
      if (result?.success) {
        setState(prev => ({ ...prev, recordingActive: false }));
        console.log('Recording saved to:', result.filePath);
      } else {
        console.error('Failed to stop recording:', result?.error);
      }
    } catch (error) {
      console.error('Recording stop error:', error);
    }
  }, []);

  // ============================================================================
  // ANIMATION CONTROLS
  // ============================================================================

  const startAnimation = useCallback(async () => {
    if (!engineRef.current || !state.isInitialized) {
      setState(prev => ({ ...prev, error: 'Engine not initialized' }));
      return;
    }

    try {
      setState(prev => ({ ...prev, isRunning: true, error: null, progress: 0 }));
      await engineRef.current.start();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start animation';
      setState(prev => ({ ...prev, error: errorMessage, isRunning: false }));
    }
  }, [state.isInitialized]);

  const pauseAnimation = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.pause();
      setState(prev => ({ ...prev, isRunning: false }));
    }
  }, []);

  const resumeAnimation = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.resume();
      setState(prev => ({ ...prev, isRunning: true }));
    }
  }, []);

  const stopAnimation = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.stop();
      setState(prev => ({ ...prev, isRunning: false, progress: 0 }));
    }
  }, []);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="animation-engine-container" style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* Recording Controls */}
      {recordingEnabled && (
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          zIndex: 15,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          borderRadius: '8px',
          padding: '8px'
        }}>
          <RecordingControls
            raffleName={`${animationStyle} Animation`}
            onStartRecording={handleStartRecording}
            onStopRecording={handleStopRecording}
            disabled={false}
          />
        </div>
      )}

      <canvas
        ref={canvasRef}
        className="animation-canvas"
        data-testid="animation-engine"
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          backgroundColor: '#000'
        }}
      />
      
      {/* Controls */}
      <div className="animation-controls" style={{
        position: 'absolute',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: '10px',
        zIndex: 10
      }}>
        {!state.isRunning && state.progress === 0 && (
          <button
            onClick={startAnimation}
            disabled={!state.isInitialized || !!state.error}
            style={{
              padding: '10px 20px',
              backgroundColor: '#ff6b35',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: state.isInitialized && !state.error ? 'pointer' : 'not-allowed',
              opacity: state.isInitialized && !state.error ? 1 : 0.5
            }}
          >
            Start Animation
          </button>
        )}
        
        {state.isRunning && (
          <button
            onClick={pauseAnimation}
            style={{
              padding: '10px 20px',
              backgroundColor: '#ffa500',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Pause
          </button>
        )}
        
        {!state.isRunning && state.progress > 0 && state.progress < 1 && (
          <button
            onClick={resumeAnimation}
            style={{
              padding: '10px 20px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Resume
          </button>
        )}
        
        {state.progress > 0 && (
          <button
            onClick={stopAnimation}
            style={{
              padding: '10px 20px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Stop
          </button>
        )}
      </div>

      {/* Progress Bar */}
      {state.progress > 0 && (
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          right: '20px',
          height: '4px',
          backgroundColor: 'rgba(255, 255, 255, 0.3)',
          borderRadius: '2px',
          overflow: 'hidden',
          zIndex: 10
        }}>
          <div style={{
            width: `${state.progress * 100}%`,
            height: '100%',
            backgroundColor: '#ff6b35',
            transition: 'width 0.1s ease-out'
          }} />
        </div>
      )}

      {/* Performance Metrics */}
      {state.performanceMetrics && process.env.NODE_ENV === 'development' && (
        <div style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '10px',
          borderRadius: '5px',
          fontSize: '12px',
          fontFamily: 'monospace',
          zIndex: 10
        }}>
          <div>FPS: {Math.round(state.performanceMetrics.currentFPS)}</div>
          <div>Avg FPS: {Math.round(state.performanceMetrics.averageFPS)}</div>
          <div>Frame Drops: {state.performanceMetrics.frameDrops}</div>
          <div>Memory: {Math.round(state.performanceMetrics.memoryUsage)}MB</div>
        </div>
      )}

      {/* Error Display */}
      {state.error && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'rgba(220, 53, 69, 0.9)',
          color: 'white',
          padding: '20px',
          borderRadius: '10px',
          textAlign: 'center',
          maxWidth: '80%',
          zIndex: 20
        }}>
          <h3>Animation Error</h3>
          <p>{state.error}</p>
          <button
            onClick={initializeEngine}
            style={{
              marginTop: '10px',
              padding: '8px 16px',
              backgroundColor: 'white',
              color: '#dc3545',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading State */}
      {!state.isInitialized && !state.error && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: 'white',
          textAlign: 'center',
          zIndex: 20
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid rgba(255, 255, 255, 0.3)',
            borderTop: '4px solid #ff6b35',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 10px'
          }} />
          <p>Initializing Animation...</p>
        </div>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default AnimationEngineComponent;