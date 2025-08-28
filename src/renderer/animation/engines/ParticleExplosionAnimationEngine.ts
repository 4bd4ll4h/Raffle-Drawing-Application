// Particle Explosion Reveal animation engine implementation

import { BaseAnimationEngine } from '../BaseAnimationEngine';
import { ParticipantDisplayItem, EasingFunctions } from '../../../types/animation';
import { Participant } from '../../../types';
import { assignRandomRarity } from '../../../types/rarity';

interface ParticleItem {
  participant: Participant;
  rarity: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  vx: number;
  vy: number;
  scale: number;
  alpha: number;
  rotation: number;
  rotationSpeed: number;
  isWinner: boolean;
  explosionDelay: number;
  hasExploded: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  alpha: number;
  type: 'spark' | 'smoke' | 'star' | 'glow';
}

export class ParticleExplosionAnimationEngine extends BaseAnimationEngine {
  private participantItems: ParticleItem[] = [];
  private particles: Particle[] = [];
  private centerX: number = 0;
  private centerY: number = 0;
  private explosionRadius: number = 200;
  private winnerIndex: number = -1;
  
  // Animation phases
  private animationPhase: 'gathering' | 'explosion' | 'reveal' | 'celebration' = 'gathering';
  private phaseTransitions = {
    gathering: 0.3,    // First 30% - particles gather at center
    explosion: 0.7,    // 30-70% - massive explosion effect
    reveal: 0.9,       // 70-90% - winner emerges from explosion
    celebration: 1.0   // 90-100% - celebration effects
  };

  // Explosion effects
  private explosionWaves: Array<{
    x: number;
    y: number;
    radius: number;
    maxRadius: number;
    alpha: number;
    color: string;
    startTime: number;
  }> = [];

  private screenShake = {
    intensity: 0,
    duration: 0,
    elapsed: 0
  };

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  protected async initializeAnimation(): Promise<void> {
    if (!this.config || !this.canvas) {
      throw new Error('Animation not properly initialized');
    }

    // Calculate center position
    const canvasWidth = this.canvas.width / this.renderer.pixelRatio;
    const canvasHeight = this.canvas.height / this.renderer.pixelRatio;
    
    this.centerX = canvasWidth / 2;
    this.centerY = canvasHeight / 2;
    this.explosionRadius = Math.min(canvasWidth, canvasHeight) * 0.3;

    // Create participant items
    this.createParticipantItems();

    // Find winner
    this.findWinner();
  }

  private createParticipantItems(): void {
    if (!this.config || !this.canvas) return;

    const canvasWidth = this.canvas.width / this.renderer.pixelRatio;
    const canvasHeight = this.canvas.height / this.renderer.pixelRatio;
    const participants = this.config.participants;

    this.participantItems = participants.map((participant, index) => {
      // Start positions around the edges of the screen
      const angle = (Math.PI * 2 * index) / participants.length;
      const startRadius = Math.max(canvasWidth, canvasHeight) * 0.6;
      const startX = this.centerX + Math.cos(angle) * startRadius;
      const startY = this.centerY + Math.sin(angle) * startRadius;

      // Target positions in a circle around center
      const targetRadius = this.explosionRadius * 0.8;
      const targetX = this.centerX + Math.cos(angle) * targetRadius;
      const targetY = this.centerY + Math.sin(angle) * targetRadius;

      const rarity = assignRandomRarity();
      const isWinner = participant.id === this.config!.winner.id;

      return {
        participant,
        rarity,
        x: startX,
        y: startY,
        targetX,
        targetY,
        vx: 0,
        vy: 0,
        scale: 0.5,
        alpha: 1,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.02,
        isWinner,
        explosionDelay: Math.random() * 0.3, // Stagger explosions
        hasExploded: false
      };
    });
  }

  private findWinner(): void {
    this.winnerIndex = this.participantItems.findIndex(item => item.isWinner);
  }

  // ============================================================================
  // ANIMATION RENDERING
  // ============================================================================

  protected renderFrame(progress: number, deltaTime: number, elapsedTime: number): void {
    if (!this.canvas || !this.config) return;

    const canvasWidth = this.canvas.width / this.renderer.pixelRatio;
    const canvasHeight = this.canvas.height / this.renderer.pixelRatio;

    // Update animation phase
    this.updateAnimationPhase(progress);

    // Apply screen shake
    this.updateScreenShake(deltaTime);
    if (this.screenShake.intensity > 0) {
      const shakeX = (Math.random() - 0.5) * this.screenShake.intensity;
      const shakeY = (Math.random() - 0.5) * this.screenShake.intensity;
      this.renderer.translate(shakeX, shakeY);
    }

    // Draw background
    this.drawBackground(canvasWidth, canvasHeight);

    // Update and draw explosion waves
    this.updateExplosionWaves(progress, deltaTime);
    this.drawExplosionWaves();

    // Update participant items
    this.updateParticipantItems(progress, deltaTime);

    // Update particles
    this.updateParticles(deltaTime);

    // Draw particles (background layer)
    this.drawParticles('background');

    // Draw participant items
    this.drawParticipantItems();

    // Draw particles (foreground layer)
    this.drawParticles('foreground');

    // Draw phase-specific effects
    this.drawPhaseEffects(progress);
  }

  private updateAnimationPhase(progress: number): void {
    if (progress <= this.phaseTransitions.gathering) {
      this.animationPhase = 'gathering';
    } else if (progress <= this.phaseTransitions.explosion) {
      this.animationPhase = 'explosion';
    } else if (progress <= this.phaseTransitions.reveal) {
      this.animationPhase = 'reveal';
    } else {
      this.animationPhase = 'celebration';
    }
  }

  private updateParticipantItems(progress: number, deltaTime: number): void {
    switch (this.animationPhase) {
      case 'gathering':
        this.updateGatheringPhase(progress);
        break;
      case 'explosion':
        this.updateExplosionPhase(progress, deltaTime);
        break;
      case 'reveal':
        this.updateRevealPhase(progress);
        break;
      case 'celebration':
        this.updateCelebrationPhase(progress, deltaTime);
        break;
    }
  }

  private updateGatheringPhase(progress: number): void {
    const gatheringProgress = progress / this.phaseTransitions.gathering;
    const easedProgress = EasingFunctions.easeInOutCubic(gatheringProgress);

    this.participantItems.forEach(item => {
      // Move towards target position
      item.x = item.x + (item.targetX - item.x) * easedProgress * 0.1;
      item.y = item.y + (item.targetY - item.y) * easedProgress * 0.1;
      
      // Scale up as they approach
      item.scale = 0.5 + easedProgress * 0.5;
      
      // Rotate
      item.rotation += item.rotationSpeed * 16.67; // Assuming ~60fps
    });

    // Generate gathering particles
    if (gatheringProgress > 0.5 && this.particles.length < 100) {
      this.generateGatheringParticles();
    }
  }

  private updateExplosionPhase(progress: number, deltaTime: number): void {
    const explosionStart = this.phaseTransitions.gathering;
    const explosionProgress = (progress - explosionStart) / (this.phaseTransitions.explosion - explosionStart);

    this.participantItems.forEach((item, index) => {
      const itemExplosionTime = item.explosionDelay;
      
      if (explosionProgress >= itemExplosionTime && !item.hasExploded) {
        item.hasExploded = true;
        this.explodeParticipantItem(item, index);
        
        // Trigger screen shake for major explosions
        if (item.isWinner) {
          this.triggerScreenShake(15, 500);
        } else {
          this.triggerScreenShake(5, 200);
        }
      }

      if (item.hasExploded) {
        // Items become invisible during explosion
        item.alpha = Math.max(0, 1 - (explosionProgress - itemExplosionTime) * 3);
        item.scale *= 0.95; // Shrink rapidly
      }
    });

    // Generate massive explosion particles
    if (explosionProgress > 0.3 && this.particles.length < 300) {
      this.generateExplosionParticles();
    }
  }

  private updateRevealPhase(progress: number): void {
    const revealStart = this.phaseTransitions.explosion;
    const revealProgress = (progress - revealStart) / (this.phaseTransitions.reveal - revealStart);

    // Winner emerges from the explosion
    if (this.winnerIndex !== -1) {
      const winner = this.participantItems[this.winnerIndex];
      
      // Winner appears at center with dramatic entrance
      winner.x = this.centerX;
      winner.y = this.centerY;
      winner.alpha = EasingFunctions.easeOutBack(revealProgress);
      winner.scale = 1.5 + 0.5 * EasingFunctions.easeOutElastic(revealProgress);
      winner.rotation = 0; // Stop rotation for clarity
    }

    // Hide other participants
    this.participantItems.forEach((item, index) => {
      if (index !== this.winnerIndex) {
        item.alpha = 0;
      }
    });
  }

  private updateCelebrationPhase(progress: number, deltaTime: number): void {
    const celebrationStart = this.phaseTransitions.reveal;
    const celebrationProgress = (progress - celebrationStart) / (1 - celebrationStart);

    // Winner celebration effects
    if (this.winnerIndex !== -1) {
      const winner = this.participantItems[this.winnerIndex];
      
      // Pulsing effect
      const pulse = 1 + 0.1 * Math.sin(Date.now() * 0.01);
      winner.scale = 1.5 * pulse;
      
      // Gentle rotation
      winner.rotation += 0.005;
    }

    // Generate celebration particles
    if (this.particles.length < 200) {
      this.generateCelebrationParticles();
    }
  }

  private explodeParticipantItem(item: ParticleItem, index: number): void {
    const particleCount = item.isWinner ? 50 : 20;
    const colors = item.isWinner ? 
      ['#ffd700', '#ffed4e', '#ff6b35', '#ff8c42'] :
      ['#ff6b35', '#4ecdc4', '#45b7d1', '#96ceb4'];

    // Create explosion wave
    this.explosionWaves.push({
      x: item.x,
      y: item.y,
      radius: 0,
      maxRadius: item.isWinner ? 150 : 80,
      alpha: 1,
      color: item.isWinner ? '#ffd700' : '#ff6b35',
      startTime: Date.now()
    });

    // Generate explosion particles
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.5;
      const speed = 0.2 + Math.random() * 0.3;
      const size = 2 + Math.random() * (item.isWinner ? 8 : 4);
      
      this.particles.push({
        x: item.x,
        y: item.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1000 + Math.random() * 2000,
        maxLife: 3000,
        color: colors[Math.floor(Math.random() * colors.length)],
        size,
        alpha: 1,
        type: item.isWinner ? 'star' : 'spark'
      });
    }
  }

  private generateGatheringParticles(): void {
    const colors = ['#4ecdc4', '#45b7d1', '#96ceb4', '#feca57'];
    
    for (let i = 0; i < 5; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = this.explosionRadius + Math.random() * 100;
      
      this.particles.push({
        x: this.centerX + Math.cos(angle) * radius,
        y: this.centerY + Math.sin(angle) * radius,
        vx: -Math.cos(angle) * 0.1,
        vy: -Math.sin(angle) * 0.1,
        life: 2000 + Math.random() * 1000,
        maxLife: 3000,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 1 + Math.random() * 3,
        alpha: 0.7,
        type: 'glow'
      });
    }
  }

  private generateExplosionParticles(): void {
    const colors = ['#ff6b35', '#ff8c42', '#ffd23f', '#ffed4e'];
    
    for (let i = 0; i < 10; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.3 + Math.random() * 0.4;
      
      this.particles.push({
        x: this.centerX + (Math.random() - 0.5) * 100,
        y: this.centerY + (Math.random() - 0.5) * 100,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1500 + Math.random() * 1500,
        maxLife: 3000,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 3 + Math.random() * 6,
        alpha: 1,
        type: Math.random() > 0.5 ? 'spark' : 'smoke'
      });
    }
  }

  private generateCelebrationParticles(): void {
    const colors = ['#ffd700', '#ffed4e', '#ff6b35', '#4ecdc4'];
    
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.1 + Math.random() * 0.2;
      
      this.particles.push({
        x: this.centerX + (Math.random() - 0.5) * 200,
        y: this.centerY + (Math.random() - 0.5) * 200,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.05, // Slight upward bias
        life: 3000 + Math.random() * 2000,
        maxLife: 5000,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 2 + Math.random() * 4,
        alpha: 0.8,
        type: 'star'
      });
    }
  }

  private updateParticles(deltaTime: number): void {
    this.particles = this.particles.filter(particle => {
      // Update position
      particle.x += particle.vx * deltaTime;
      particle.y += particle.vy * deltaTime;
      
      // Apply effects based on type
      switch (particle.type) {
        case 'spark':
          particle.vy += 0.0003 * deltaTime; // Gravity
          particle.vx *= 0.995; // Air resistance
          particle.vy *= 0.995;
          break;
        case 'smoke':
          particle.vy -= 0.0001 * deltaTime; // Float upward
          particle.vx *= 0.99;
          particle.size *= 1.002; // Expand
          break;
        case 'star':
          particle.vy += 0.0001 * deltaTime; // Light gravity
          break;
        case 'glow':
          particle.vx *= 0.98;
          particle.vy *= 0.98;
          break;
      }
      
      // Update life
      particle.life -= deltaTime;
      particle.alpha = Math.max(0, particle.life / particle.maxLife);
      
      return particle.life > 0;
    });
  }

  private updateExplosionWaves(progress: number, deltaTime: number): void {
    this.explosionWaves = this.explosionWaves.filter(wave => {
      const elapsed = Date.now() - wave.startTime;
      const duration = 1000; // 1 second duration
      const waveProgress = Math.min(elapsed / duration, 1);
      
      wave.radius = wave.maxRadius * EasingFunctions.easeOutCubic(waveProgress);
      wave.alpha = 1 - waveProgress;
      
      return waveProgress < 1;
    });
  }

  private updateScreenShake(deltaTime: number): void {
    if (this.screenShake.duration > 0) {
      this.screenShake.elapsed += deltaTime;
      
      if (this.screenShake.elapsed >= this.screenShake.duration) {
        this.screenShake.intensity = 0;
        this.screenShake.duration = 0;
        this.screenShake.elapsed = 0;
      } else {
        const progress = this.screenShake.elapsed / this.screenShake.duration;
        this.screenShake.intensity *= (1 - progress);
      }
    }
  }

  private triggerScreenShake(intensity: number, duration: number): void {
    this.screenShake.intensity = Math.max(this.screenShake.intensity, intensity);
    this.screenShake.duration = Math.max(this.screenShake.duration, duration);
    this.screenShake.elapsed = 0;
  }

  private drawBackground(canvasWidth: number, canvasHeight: number): void {
    // Draw background image if provided
    if (this.config?.backgroundImage) {
      const bgImage = this.imageCache.get(this.config.backgroundImage);
      if (bgImage) {
        this.renderer.drawImage(bgImage, 0, 0, canvasWidth, canvasHeight);
      }
    }
    
    // Add dynamic gradient based on phase
    let gradientColor1 = 'rgba(20, 20, 40, 0.3)';
    let gradientColor2 = 'rgba(10, 10, 20, 0.7)';
    
    if (this.animationPhase === 'explosion') {
      gradientColor1 = 'rgba(60, 30, 10, 0.4)';
      gradientColor2 = 'rgba(30, 15, 5, 0.8)';
    } else if (this.animationPhase === 'celebration') {
      gradientColor1 = 'rgba(40, 40, 20, 0.3)';
      gradientColor2 = 'rgba(20, 20, 10, 0.7)';
    }
    
    const gradient = this.renderer.createRadialGradient(
      this.centerX, this.centerY, 0,
      this.centerX, this.centerY, Math.max(canvasWidth, canvasHeight) / 2
    );
    gradient.addColorStop(0, gradientColor1);
    gradient.addColorStop(1, gradientColor2);
    
    this.renderer.context.fillStyle = gradient;
    this.renderer.context.fillRect(0, 0, canvasWidth, canvasHeight);
  }

  private drawExplosionWaves(): void {
    this.explosionWaves.forEach(wave => {
      this.renderer.save();
      this.renderer.setAlpha(wave.alpha);
      
      // Draw expanding circle
      this.renderer.drawCircle(wave.x, wave.y, wave.radius, {
        stroke: {
          color: wave.color,
          width: 4
        },
        shadow: {
          color: wave.color,
          blur: 20,
          offsetX: 0,
          offsetY: 0
        }
      });
      
      this.renderer.restore();
    });
  }

  private drawParticipantItems(): void {
    this.participantItems.forEach(item => {
      if (item.alpha <= 0) return;
      
      this.renderer.save();
      
      // Apply transformations
      this.renderer.translate(item.x, item.y);
      this.renderer.scale(item.scale, item.scale);
      this.renderer.rotate(item.rotation);
      this.renderer.setAlpha(item.alpha);

      // Draw participant with enhanced effects for winner
      this.drawParticipantItem(item);
      
      this.renderer.restore();
    });
  }

  private drawParticipantItem(item: ParticleItem): void {
    const size = 60;
    const halfSize = size / 2;
    
    // Draw rarity background
    const rarityLevel = this.config!.config.rarityColors[item.rarity];
    const rarityColor = rarityLevel ? rarityLevel.color : '#4a4a4a';
    
    // Enhanced glow for winner
    if (item.isWinner && this.animationPhase === 'reveal') {
      this.renderer.save();
      this.renderer.context.shadowColor = '#ffd700';
      this.renderer.context.shadowBlur = 30;
      
      this.renderer.drawCircle(0, 0, halfSize + 10, {
        fill: '#ffd70030',
        stroke: {
          color: '#ffd700',
          width: 3
        }
      });
      
      this.renderer.restore();
    }

    // Draw participant background
    this.renderer.drawCircle(0, 0, halfSize, {
      fill: rarityColor + '40',
      stroke: {
        color: rarityColor,
        width: 2
      }
    });

    // Draw participant image
    const image = this.imageCache.get(item.participant.profileImageUrl);
    if (image) {
      const imageSize = size - 10;
      this.renderer.drawImage(
        image,
        -imageSize / 2,
        -imageSize / 2,
        imageSize,
        imageSize
      );
    }

    // Draw participant name below
    this.renderer.drawText(
      item.participant.username,
      0,
      halfSize + 20,
      {
        color: item.isWinner ? '#ffd700' : '#fff',
        fontSize: item.isWinner ? 16 : 12,
        fontWeight: item.isWinner ? 'bold' : 'normal',
        align: 'center',
        shadow: {
          color: '#000',
          blur: 3,
          offsetX: 1,
          offsetY: 1
        }
      }
    );
  }

  private drawParticles(layer: 'background' | 'foreground'): void {
    this.particles.forEach(particle => {
      // Draw different particle types in different layers
      const isBackground = particle.type === 'smoke' || particle.type === 'glow';
      if ((layer === 'background') !== isBackground) return;
      
      this.renderer.save();
      this.renderer.setAlpha(particle.alpha);
      
      switch (particle.type) {
        case 'spark':
          this.drawSparkParticle(particle);
          break;
        case 'smoke':
          this.drawSmokeParticle(particle);
          break;
        case 'star':
          this.drawStarParticle(particle);
          break;
        case 'glow':
          this.drawGlowParticle(particle);
          break;
      }
      
      this.renderer.restore();
    });
  }

  private drawSparkParticle(particle: Particle): void {
    this.renderer.drawCircle(particle.x, particle.y, particle.size, {
      fill: particle.color,
      shadow: {
        color: particle.color,
        blur: 5,
        offsetX: 0,
        offsetY: 0
      }
    });
  }

  private drawSmokeParticle(particle: Particle): void {
    this.renderer.drawCircle(particle.x, particle.y, particle.size, {
      fill: `${particle.color}40`,
      shadow: {
        color: particle.color,
        blur: particle.size * 2,
        offsetX: 0,
        offsetY: 0
      }
    });
  }

  private drawStarParticle(particle: Particle): void {
    // Draw a simple star shape
    const spikes = 5;
    const outerRadius = particle.size;
    const innerRadius = particle.size * 0.4;
    
    this.renderer.context.beginPath();
    
    for (let i = 0; i < spikes * 2; i++) {
      const angle = (i * Math.PI) / spikes;
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const x = particle.x + Math.cos(angle) * radius;
      const y = particle.y + Math.sin(angle) * radius;
      
      if (i === 0) {
        this.renderer.context.moveTo(x, y);
      } else {
        this.renderer.context.lineTo(x, y);
      }
    }
    
    this.renderer.context.closePath();
    this.renderer.context.fillStyle = particle.color;
    this.renderer.context.shadowColor = particle.color;
    this.renderer.context.shadowBlur = 8;
    this.renderer.context.fill();
  }

  private drawGlowParticle(particle: Particle): void {
    this.renderer.drawCircle(particle.x, particle.y, particle.size, {
      fill: `${particle.color}60`,
      shadow: {
        color: particle.color,
        blur: particle.size * 3,
        offsetX: 0,
        offsetY: 0
      }
    });
  }

  private drawPhaseEffects(progress: number): void {
    if (!this.canvas) return;
    
    const canvasWidth = this.canvas.width / this.renderer.pixelRatio;
    const canvasHeight = this.canvas.height / this.renderer.pixelRatio;

    // Draw title
    this.drawTitle(progress, canvasWidth);

    // Draw winner announcement during celebration
    if (this.animationPhase === 'celebration' && this.winnerIndex !== -1) {
      this.drawWinnerAnnouncement(progress, canvasWidth, canvasHeight);
    }
  }

  private drawTitle(progress: number, canvasWidth: number): void {
    let title = 'Particle Explosion';
    let titleColor = '#fff';
    
    if (this.animationPhase === 'explosion') {
      title = 'EXPLOSION!';
      titleColor = '#ff6b35';
    } else if (this.animationPhase === 'celebration') {
      title = 'WINNER REVEALED!';
      titleColor = '#ffd700';
    }
    
    const titleAlpha = Math.min(progress * 2, 1);
    
    this.renderer.save();
    this.renderer.setAlpha(titleAlpha);
    
    this.renderer.drawText(
      title,
      canvasWidth / 2,
      50,
      {
        color: titleColor,
        fontSize: 32,
        fontWeight: 'bold',
        align: 'center',
        shadow: {
          color: '#000',
          blur: 6,
          offsetX: 3,
          offsetY: 3
        }
      }
    );
    
    this.renderer.restore();
  }

  private drawWinnerAnnouncement(progress: number, canvasWidth: number, canvasHeight: number): void {
    const celebrationStart = this.phaseTransitions.reveal;
    const celebrationProgress = (progress - celebrationStart) / (1 - celebrationStart);
    
    if (celebrationProgress < 0.3) return;
    
    const textProgress = (celebrationProgress - 0.3) / 0.7;
    const textScale = EasingFunctions.easeOutBack(textProgress);
    const winner = this.participantItems[this.winnerIndex];
    
    this.renderer.save();
    this.renderer.translate(canvasWidth / 2, canvasHeight - 80);
    this.renderer.scale(textScale, textScale);
    
    this.renderer.drawText(
      winner.participant.username,
      0,
      0,
      {
        color: '#ffd700',
        fontSize: 36,
        fontWeight: 'bold',
        align: 'center',
        shadow: {
          color: '#000',
          blur: 8,
          offsetX: 4,
          offsetY: 4
        }
      }
    );
    
    this.renderer.restore();
  }
}