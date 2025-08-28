// Integration tests for AnimationEngineFactory with all animation styles

import { AnimationEngineFactory } from '../AnimationEngineFactory';
import { AnimationEngineConfig } from '../../../types/animation';
import { AnimationStyle, Participant } from '../../../types';
import { CS2_RARITY_LEVELS } from '../../../types/rarity';

// Mock participants
const mockParticipants: Participant[] = [
  {
    id: '1',
    raffleId: 'test-raffle',
    username: 'player1',
    profileImageUrl: 'https://example.com/avatar1.jpg',
    ticketNumber: '001',
    importDate: new Date()
  },
  {
    id: '2',
    raffleId: 'test-raffle',
    username: 'player2',
    profileImageUrl: 'https://example.com/avatar2.jpg',
    ticketNumber: '002',
    importDate: new Date()
  },
  {
    id: '3',
    raffleId: 'test-raffle',
    username: 'winner',
    profileImageUrl: 'https://example.com/winner.jpg',
    ticketNumber: '003',
    importDate: new Date()
  }
];

const mockConfig: AnimationEngineConfig = {
  participants: mockParticipants,
  winner: mockParticipants[2],
  animationStyle: AnimationStyle.CS2_CASE, // Will be overridden in tests
  config: {
    duration: 5000,
    easing: 'easeOutCubic' as any,
    scrollSpeed: 1,
    rarityColors: CS2_RARITY_LEVELS,
    showRarityEffects: true,
    targetFPS: 60,
    enableHardwareAcceleration: true
  },
  recordingEnabled: false
};

describe('AnimationEngineFactory Integration', () => {
  describe('Engine Creation', () => {
    it('should create CS2 Case animation engine', () => {
      const engine = AnimationEngineFactory.createEngine(AnimationStyle.CS2_CASE);
      expect(engine).toBeDefined();
      expect(engine.constructor.name).toBe('CS2CaseAnimationEngine');
    });

    it('should create Spinning Wheel animation engine', () => {
      const engine = AnimationEngineFactory.createEngine(AnimationStyle.SPINNING_WHEEL);
      expect(engine).toBeDefined();
      expect(engine.constructor.name).toBe('SpinningWheelAnimationEngine');
    });

    it('should create Card Flip animation engine', () => {
      const engine = AnimationEngineFactory.createEngine(AnimationStyle.CARD_FLIP);
      expect(engine).toBeDefined();
      expect(engine.constructor.name).toBe('CardFlipAnimationEngine');
    });

    it('should create Slot Machine animation engine', () => {
      const engine = AnimationEngineFactory.createEngine(AnimationStyle.SLOT_MACHINE);
      expect(engine).toBeDefined();
      expect(engine.constructor.name).toBe('SlotMachineAnimationEngine');
    });

    it('should create Particle Explosion animation engine', () => {
      const engine = AnimationEngineFactory.createEngine(AnimationStyle.PARTICLE_EXPLOSION);
      expect(engine).toBeDefined();
      expect(engine.constructor.name).toBe('ParticleExplosionAnimationEngine');
    });

    it('should create Zoom Fade animation engine', () => {
      const engine = AnimationEngineFactory.createEngine(AnimationStyle.ZOOM_FADE);
      expect(engine).toBeDefined();
      expect(engine.constructor.name).toBe('ZoomFadeAnimationEngine');
    });

    it('should throw error for unknown animation style', () => {
      expect(() => {
        AnimationEngineFactory.createEngine('unknown_style' as AnimationStyle);
      }).toThrow('Unknown animation style: unknown_style');
    });
  });

  describe('Supported Styles', () => {
    it('should return all supported animation styles', () => {
      const supportedStyles = AnimationEngineFactory.getSupportedStyles();
      
      expect(supportedStyles).toContain(AnimationStyle.CS2_CASE);
      expect(supportedStyles).toContain(AnimationStyle.SPINNING_WHEEL);
      expect(supportedStyles).toContain(AnimationStyle.CARD_FLIP);
      expect(supportedStyles).toContain(AnimationStyle.SLOT_MACHINE);
      expect(supportedStyles).toContain(AnimationStyle.PARTICLE_EXPLOSION);
      expect(supportedStyles).toContain(AnimationStyle.ZOOM_FADE);
      
      expect(supportedStyles).toHaveLength(6);
    });

    it('should correctly identify supported styles', () => {
      expect(AnimationEngineFactory.isStyleSupported(AnimationStyle.CS2_CASE)).toBe(true);
      expect(AnimationEngineFactory.isStyleSupported(AnimationStyle.SPINNING_WHEEL)).toBe(true);
      expect(AnimationEngineFactory.isStyleSupported(AnimationStyle.CARD_FLIP)).toBe(true);
      expect(AnimationEngineFactory.isStyleSupported(AnimationStyle.SLOT_MACHINE)).toBe(true);
      expect(AnimationEngineFactory.isStyleSupported(AnimationStyle.PARTICLE_EXPLOSION)).toBe(true);
      expect(AnimationEngineFactory.isStyleSupported(AnimationStyle.ZOOM_FADE)).toBe(true);
      
      expect(AnimationEngineFactory.isStyleSupported('unknown_style' as AnimationStyle)).toBe(false);
    });
  });

  describe('Style Descriptions', () => {
    it('should provide correct description for CS2 Case', () => {
      const description = AnimationEngineFactory.getStyleDescription(AnimationStyle.CS2_CASE);
      expect(description).toBe('CS2 Case Opening: Horizontal scrolling with gradual slowdown and dramatic reveal');
    });

    it('should provide correct description for Spinning Wheel', () => {
      const description = AnimationEngineFactory.getStyleDescription(AnimationStyle.SPINNING_WHEEL);
      expect(description).toBe('Spinning Wheel: Circular wheel rotation with pointer selection');
    });

    it('should provide correct description for Card Flip', () => {
      const description = AnimationEngineFactory.getStyleDescription(AnimationStyle.CARD_FLIP);
      expect(description).toBe('Card Flip Reveal: Sequential card flipping animation revealing the winner');
    });

    it('should provide correct description for Slot Machine', () => {
      const description = AnimationEngineFactory.getStyleDescription(AnimationStyle.SLOT_MACHINE);
      expect(description).toBe('Slot Machine: Vertical reels spinning and stopping on winner');
    });

    it('should provide correct description for Particle Explosion', () => {
      const description = AnimationEngineFactory.getStyleDescription(AnimationStyle.PARTICLE_EXPLOSION);
      expect(description).toBe('Particle Explosion: Winner emerges from particle effects and explosions');
    });

    it('should provide correct description for Zoom Fade', () => {
      const description = AnimationEngineFactory.getStyleDescription(AnimationStyle.ZOOM_FADE);
      expect(description).toBe('Zoom & Fade: Smooth zoom transitions with fade effects highlighting the winner');
    });

    it('should provide unknown description for invalid style', () => {
      const description = AnimationEngineFactory.getStyleDescription('unknown_style' as AnimationStyle);
      expect(description).toBe('Unknown animation style');
    });
  });

  describe('Config Validation', () => {
    it('should validate valid config successfully', () => {
      const validConfig = { ...mockConfig, animationStyle: AnimationStyle.CS2_CASE };
      expect(() => {
        AnimationEngineFactory.validateConfig(validConfig);
      }).not.toThrow();
    });

    it('should throw error for missing participants', () => {
      const invalidConfig = { ...mockConfig, participants: [] };
      expect(() => {
        AnimationEngineFactory.validateConfig(invalidConfig);
      }).toThrow('Animation config must include participants');
    });

    it('should throw error for missing winner', () => {
      const invalidConfig = { ...mockConfig, winner: null as any };
      expect(() => {
        AnimationEngineFactory.validateConfig(invalidConfig);
      }).toThrow('Animation config must include a winner');
    });

    it('should throw error when winner is not in participants', () => {
      const invalidWinner = {
        id: 'invalid',
        raffleId: 'test-raffle',
        username: 'invalid',
        profileImageUrl: 'invalid.jpg',
        ticketNumber: '999',
        importDate: new Date()
      };
      const invalidConfig = { ...mockConfig, winner: invalidWinner };
      
      expect(() => {
        AnimationEngineFactory.validateConfig(invalidConfig);
      }).toThrow('Winner must be one of the participants');
    });

    it('should throw error for missing animation config', () => {
      const invalidConfig = { ...mockConfig, config: null as any };
      expect(() => {
        AnimationEngineFactory.validateConfig(invalidConfig);
      }).toThrow('Animation config must include animation settings');
    });

    it('should throw error for invalid duration', () => {
      const invalidConfig = {
        ...mockConfig,
        config: { ...mockConfig.config, duration: 0 }
      };
      expect(() => {
        AnimationEngineFactory.validateConfig(invalidConfig);
      }).toThrow('Animation duration must be positive');
    });

    it('should throw error for unsupported animation style', () => {
      const invalidConfig = {
        ...mockConfig,
        animationStyle: 'unsupported_style' as AnimationStyle
      };
      expect(() => {
        AnimationEngineFactory.validateConfig(invalidConfig);
      }).toThrow('Animation style unsupported_style is not supported');
    });
  });

  describe('Engine Interface Compliance', () => {
    const allStyles = [
      AnimationStyle.CS2_CASE,
      AnimationStyle.SPINNING_WHEEL,
      AnimationStyle.CARD_FLIP,
      AnimationStyle.SLOT_MACHINE,
      AnimationStyle.PARTICLE_EXPLOSION,
      AnimationStyle.ZOOM_FADE
    ];

    allStyles.forEach(style => {
      describe(`${style} Engine`, () => {
        let engine: any;

        beforeEach(() => {
          engine = AnimationEngineFactory.createEngine(style);
        });

        afterEach(() => {
          if (engine && typeof engine.destroy === 'function') {
            engine.destroy();
          }
        });

        it('should implement required interface methods', () => {
          expect(typeof engine.initialize).toBe('function');
          expect(typeof engine.start).toBe('function');
          expect(typeof engine.pause).toBe('function');
          expect(typeof engine.resume).toBe('function');
          expect(typeof engine.stop).toBe('function');
          expect(typeof engine.destroy).toBe('function');
          expect(typeof engine.getState).toBe('function');
          expect(typeof engine.isRunning).toBe('function');
          expect(typeof engine.getProgress).toBe('function');
          expect(typeof engine.getFPS).toBe('function');
          expect(typeof engine.getPerformanceMetrics).toBe('function');
        });

        it('should have proper initial state', () => {
          const state = engine.getState();
          expect(state).toHaveProperty('status');
          expect(state).toHaveProperty('progress');
          expect(state).toHaveProperty('currentFrame');
          expect(state).toHaveProperty('totalFrames');
          expect(state).toHaveProperty('elapsedTime');
          expect(state).toHaveProperty('remainingTime');
          
          expect(state.status).toBe('idle');
          expect(state.progress).toBe(0);
          expect(engine.isRunning()).toBe(false);
        });

        it('should provide performance metrics', () => {
          const metrics = engine.getPerformanceMetrics();
          expect(metrics).toHaveProperty('currentFPS');
          expect(metrics).toHaveProperty('averageFPS');
          expect(metrics).toHaveProperty('minFPS');
          expect(metrics).toHaveProperty('maxFPS');
          expect(metrics).toHaveProperty('frameDrops');
          expect(metrics).toHaveProperty('memoryUsage');
          expect(metrics).toHaveProperty('renderTime');
          expect(metrics).toHaveProperty('lastUpdateTime');
        });

        it('should support event handlers', () => {
          expect(engine.onComplete).toBeUndefined();
          expect(engine.onProgress).toBeUndefined();
          expect(engine.onError).toBeUndefined();
          
          // Should be able to set event handlers
          engine.onComplete = jest.fn();
          engine.onProgress = jest.fn();
          engine.onError = jest.fn();
          
          expect(typeof engine.onComplete).toBe('function');
          expect(typeof engine.onProgress).toBe('function');
          expect(typeof engine.onError).toBe('function');
        });
      });
    });
  });

  describe('Cross-Engine Consistency', () => {
    const allStyles = AnimationEngineFactory.getSupportedStyles();

    it('should create different engine instances for different styles', () => {
      const engines = allStyles.map(style => AnimationEngineFactory.createEngine(style));
      
      // All engines should be different instances
      for (let i = 0; i < engines.length; i++) {
        for (let j = i + 1; j < engines.length; j++) {
          expect(engines[i]).not.toBe(engines[j]);
          expect(engines[i].constructor.name).not.toBe(engines[j].constructor.name);
        }
      }
      
      // Clean up
      engines.forEach(engine => engine.destroy());
    });

    it('should create fresh instances on each call', () => {
      const engine1 = AnimationEngineFactory.createEngine(AnimationStyle.CS2_CASE);
      const engine2 = AnimationEngineFactory.createEngine(AnimationStyle.CS2_CASE);
      
      expect(engine1).not.toBe(engine2);
      expect(engine1.constructor.name).toBe(engine2.constructor.name);
      
      engine1.destroy();
      engine2.destroy();
    });

    it('should validate all supported styles', () => {
      allStyles.forEach(style => {
        const config = { ...mockConfig, animationStyle: style };
        expect(() => {
          AnimationEngineFactory.validateConfig(config);
        }).not.toThrow();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle null animation style gracefully', () => {
      expect(() => {
        AnimationEngineFactory.createEngine(null as any);
      }).toThrow();
    });

    it('should handle undefined animation style gracefully', () => {
      expect(() => {
        AnimationEngineFactory.createEngine(undefined as any);
      }).toThrow();
    });

    it('should handle empty string animation style gracefully', () => {
      expect(() => {
        AnimationEngineFactory.createEngine('' as any);
      }).toThrow();
    });
  });
});