// Animation engine factory for creating different animation styles

import { AnimationEngine, AnimationEngineConfig } from '../../types/animation';
import { AnimationStyle } from '../../types';
import { CS2CaseAnimationEngine } from './engines/CS2CaseAnimationEngine';
import { SpinningWheelAnimationEngine } from './engines/SpinningWheelAnimationEngine';
import { CardFlipAnimationEngine } from './engines/CardFlipAnimationEngine';
import { SlotMachineAnimationEngine } from './engines/SlotMachineAnimationEngine';
import { ParticleExplosionAnimationEngine } from './engines/ParticleExplosionAnimationEngine';
import { ZoomFadeAnimationEngine } from './engines/ZoomFadeAnimationEngine';

export class AnimationEngineFactory {
  static createEngine(animationStyle: AnimationStyle): AnimationEngine {
    switch (animationStyle) {
      case AnimationStyle.CS2_CASE:
        return new CS2CaseAnimationEngine();
      
      case AnimationStyle.SPINNING_WHEEL:
        return new SpinningWheelAnimationEngine();
      
      case AnimationStyle.CARD_FLIP:
        return new CardFlipAnimationEngine();
      
      case AnimationStyle.SLOT_MACHINE:
        return new SlotMachineAnimationEngine();
      
      case AnimationStyle.PARTICLE_EXPLOSION:
        return new ParticleExplosionAnimationEngine();
      
      case AnimationStyle.ZOOM_FADE:
        return new ZoomFadeAnimationEngine();
      
      default:
        throw new Error(`Unknown animation style: ${animationStyle}`);
    }
  }

  static getSupportedStyles(): AnimationStyle[] {
    return [
      AnimationStyle.CS2_CASE,
      AnimationStyle.SPINNING_WHEEL,
      AnimationStyle.CARD_FLIP,
      AnimationStyle.SLOT_MACHINE,
      AnimationStyle.PARTICLE_EXPLOSION,
      AnimationStyle.ZOOM_FADE
    ];
  }

  static isStyleSupported(style: AnimationStyle): boolean {
    return this.getSupportedStyles().includes(style);
  }

  static getStyleDescription(style: AnimationStyle): string {
    switch (style) {
      case AnimationStyle.CS2_CASE:
        return 'CS2 Case Opening: Horizontal scrolling with gradual slowdown and dramatic reveal';
      
      case AnimationStyle.SPINNING_WHEEL:
        return 'Spinning Wheel: Circular wheel rotation with pointer selection';
      
      case AnimationStyle.CARD_FLIP:
        return 'Card Flip Reveal: Sequential card flipping animation revealing the winner';
      
      case AnimationStyle.SLOT_MACHINE:
        return 'Slot Machine: Vertical reels spinning and stopping on winner';
      
      case AnimationStyle.PARTICLE_EXPLOSION:
        return 'Particle Explosion: Winner emerges from particle effects and explosions';
      
      case AnimationStyle.ZOOM_FADE:
        return 'Zoom & Fade: Smooth zoom transitions with fade effects highlighting the winner';
      
      default:
        return 'Unknown animation style';
    }
  }

  static validateConfig(config: AnimationEngineConfig): void {
    if (!config.participants || config.participants.length === 0) {
      throw new Error('Animation config must include participants');
    }

    if (!config.winner) {
      throw new Error('Animation config must include a winner');
    }

    if (!config.participants.find(p => p.id === config.winner.id)) {
      throw new Error('Winner must be one of the participants');
    }

    if (!config.config) {
      throw new Error('Animation config must include animation settings');
    }

    if (config.config.duration <= 0) {
      throw new Error('Animation duration must be positive');
    }

    if (!this.isStyleSupported(config.animationStyle)) {
      throw new Error(`Animation style ${config.animationStyle} is not supported`);
    }
  }
}