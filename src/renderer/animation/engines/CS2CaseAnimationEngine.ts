// CS2 Case Opening animation engine implementation

import { BaseAnimationEngine } from '../BaseAnimationEngine';
import { ParticipantDisplayItem, EasingFunctions } from '../../../types/animation';
import { Participant } from '../../../types';
import { assignRandomRarity } from '../../../types/rarity';

export class CS2CaseAnimationEngine extends BaseAnimationEngine {
  private displayItems: ParticipantDisplayItem[] = [];
  private scrollOffset: number = 0;
  private itemWidth: number = 120;
  private itemHeight: number = 160;
  private itemSpacing: number = 20;
  private totalWidth: number = 0;
  private winnerIndex: number = 0;
  private finalScrollPosition: number = 0;
  
  // Animation phases for better control
  private animationPhase: 'acceleration' | 'cruising' | 'deceleration' | 'reveal' = 'acceleration';
  private phaseTransitions = {
    acceleration: 0.15,  // First 15% - speed up
    cruising: 0.65,      // 15-65% - constant speed
    deceleration: 0.90,  // 65-90% - slow down
    reveal: 1.0          // 90-100% - dramatic reveal
  };
  
  // Enhanced visual effects
  private particleEffects: Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
    color: string;
    size: number;
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

    // Create display items with duplicates for seamless scrolling
    this.createDisplayItems();

    // Find winner index in the display items (not original participants)
    this.winnerIndex = this.displayItems.findIndex(
      item => item.participant.id === this.config!.winner.id
    );

    if (this.winnerIndex === -1) {
      throw new Error('Winner not found in participants list');
    }

    // Calculate final scroll position to center winner
    this.calculateFinalPosition();
  }

  private createDisplayItems(): void {
    if (!this.config) return;

    const participants = this.config.participants;
    const canvasWidth = this.canvas!.width / this.renderer.pixelRatio;
    
    // Calculate how many items we need for smooth scrolling
    const itemsPerScreen = Math.ceil(canvasWidth / (this.itemWidth + this.itemSpacing));
    const totalItemsNeeded = Math.max(itemsPerScreen * 5, participants.length * 3); // Ensure enough items

    // Create enough items by repeating participants, ensuring winner appears multiple times
    const extendedParticipants: Participant[] = [];
    let winnerInsertions = 0;
    const maxWinnerInsertions = Math.ceil(totalItemsNeeded / participants.length);
    
    while (extendedParticipants.length < totalItemsNeeded) {
      for (const participant of participants) {
        extendedParticipants.push(participant);
        
        // Insert winner at strategic positions for better reveal
        if (participant.id === this.config.winner.id && winnerInsertions < maxWinnerInsertions) {
          winnerInsertions++;
        }
      }
    }

    // Create display items with proper rarity assignment
    this.displayItems = extendedParticipants.map((participant, index) => {
      const x = index * (this.itemWidth + this.itemSpacing);
      const y = (this.canvas!.height / this.renderer.pixelRatio - this.itemHeight) / 2;

      // Use proper rarity assignment from the rarity system
      const rarity = assignRandomRarity();

      return {
        participant,
        rarity,
        position: { x, y },
        size: { width: this.itemWidth, height: this.itemHeight },
        scale: 1,
        alpha: 1,
        velocity: { x: 0, y: 0 },
        rotation: 0
      };
    });

    this.totalWidth = this.displayItems.length * (this.itemWidth + this.itemSpacing);
  }

  private calculateFinalPosition(): void {
    if (!this.canvas) return;

    const canvasWidth = this.canvas.width / this.renderer.pixelRatio;
    const centerX = canvasWidth / 2;
    
    // Find a winner item that will be well-positioned for the reveal
    // Look for a winner item that's not too early or too late in the sequence
    const winnerItems = this.displayItems
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => item.participant.id === this.config!.winner.id);
    
    if (winnerItems.length === 0) {
      console.warn('Winner not found in display items');
      return;
    }
    
    // Choose a winner item that's positioned well for dramatic reveal
    // Prefer items in the latter half but not at the very end
    const idealPosition = Math.floor(this.displayItems.length * 0.7);
    const chosenWinner = winnerItems.reduce((best, current) => {
      const bestDistance = Math.abs(best.index - idealPosition);
      const currentDistance = Math.abs(current.index - idealPosition);
      return currentDistance < bestDistance ? current : best;
    });
    
    this.winnerIndex = chosenWinner.index;
    const winnerX = this.displayItems[this.winnerIndex].position.x + this.itemWidth / 2;
    this.finalScrollPosition = winnerX - centerX;
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

    // Apply screen shake if active
    this.updateScreenShake(deltaTime);
    if (this.screenShake.intensity > 0) {
      const shakeX = (Math.random() - 0.5) * this.screenShake.intensity;
      const shakeY = (Math.random() - 0.5) * this.screenShake.intensity;
      this.renderer.translate(shakeX, shakeY);
    }

    // Draw background with subtle gradient
    this.drawBackground(canvasWidth, canvasHeight);

    // Calculate current scroll position with CS2-style easing
    this.calculateScrollPosition(progress);

    // Update and draw particle effects
    this.updateParticleEffects(deltaTime);
    this.drawParticleEffects();

    // Draw items with enhanced effects
    this.drawItems(progress);

    // Draw selection indicator
    this.drawSelectionIndicator(progress);

    // Draw winner highlight and effects during reveal phase
    if (this.animationPhase === 'reveal') {
      this.drawWinnerReveal(progress);
    }

    // Draw phase-specific overlays
    this.drawPhaseOverlays(progress);
  }

  private updateAnimationPhase(progress: number): void {
    if (progress <= this.phaseTransitions.acceleration) {
      this.animationPhase = 'acceleration';
    } else if (progress <= this.phaseTransitions.cruising) {
      this.animationPhase = 'cruising';
    } else if (progress <= this.phaseTransitions.deceleration) {
      this.animationPhase = 'deceleration';
    } else {
      this.animationPhase = 'reveal';
    }
  }

  private calculateScrollPosition(progress: number): void {
    let easedProgress: number;
    
    switch (this.animationPhase) {
      case 'acceleration':
        // Ease in - slow start, building speed
        const accelProgress = progress / this.phaseTransitions.acceleration;
        easedProgress = EasingFunctions.easeInCubic(accelProgress) * this.phaseTransitions.acceleration;
        break;
        
      case 'cruising':
        // Linear movement during cruising
        const cruiseStart = this.phaseTransitions.acceleration;
        const cruiseProgress = (progress - cruiseStart) / (this.phaseTransitions.cruising - cruiseStart);
        easedProgress = cruiseStart + cruiseProgress * (this.phaseTransitions.cruising - cruiseStart);
        break;
        
      case 'deceleration':
        // Dramatic slowdown - CS2 signature effect
        const decelStart = this.phaseTransitions.cruising;
        const decelProgress = (progress - decelStart) / (this.phaseTransitions.deceleration - decelStart);
        const decelEased = EasingFunctions.easeOutQuart(decelProgress);
        easedProgress = decelStart + decelEased * (this.phaseTransitions.deceleration - decelStart);
        break;
        
      case 'reveal':
        // Final positioning with micro-adjustments
        const revealStart = this.phaseTransitions.deceleration;
        const revealProgress = (progress - revealStart) / (1 - revealStart);
        const revealEased = EasingFunctions.easeOutElastic(revealProgress);
        easedProgress = revealStart + revealEased * (1 - revealStart);
        break;
        
      default:
        easedProgress = progress;
    }
    
    this.scrollOffset = this.finalScrollPosition * easedProgress;
  }

  private drawBackground(canvasWidth: number, canvasHeight: number): void {
    // Draw background image if provided
    if (this.config?.backgroundImage) {
      const bgImage = this.imageCache.get(this.config.backgroundImage);
      if (bgImage) {
        this.renderer.drawImage(bgImage, 0, 0, canvasWidth, canvasHeight);
      }
    }
    
    // Add subtle gradient overlay for CS2 atmosphere
    const gradient = this.renderer.createLinearGradient(0, 0, 0, canvasHeight);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0.1)');
    gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.05)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.2)');
    
    this.renderer.context.fillStyle = gradient;
    this.renderer.context.fillRect(0, 0, canvasWidth, canvasHeight);
  }

  private drawItems(progress: number): void {
    if (!this.canvas) return;

    const canvasWidth = this.canvas.width / this.renderer.pixelRatio;
    const canvasHeight = this.canvas.height / this.renderer.pixelRatio;
    const centerX = canvasWidth / 2;

    this.displayItems.forEach((item, index) => {
      const x = item.position.x - this.scrollOffset;
      
      // Only draw items that are visible on screen (with larger buffer for effects)
      if (x + this.itemWidth < -100 || x > canvasWidth + 100) {
        return;
      }

      // Calculate distance from center for various effects
      const itemCenterX = x + this.itemWidth / 2;
      const distanceFromCenter = Math.abs(itemCenterX - centerX);
      const isNearCenter = distanceFromCenter < this.itemWidth;
      const isWinner = index === this.winnerIndex;

      // Apply motion blur effect during fast scrolling
      const motionBlurIntensity = this.getMotionBlurIntensity(progress);
      if (motionBlurIntensity > 0) {
        this.renderer.save();
        this.renderer.setAlpha(0.7);
      }

      // Draw item background with enhanced styling
      this.drawItemBackground(x, item.position.y, isNearCenter, isWinner, progress);

      // Draw rarity overlay with enhanced effects
      this.drawEnhancedRarityOverlay(x, item.position.y, item.rarity, isNearCenter, progress);

      // Draw participant image with proper scaling
      this.drawParticipantImage(item, x, isNearCenter, isWinner, progress);

      // Draw participant name with enhanced styling
      this.drawParticipantName(item, x, isNearCenter, isWinner);

      if (motionBlurIntensity > 0) {
        this.renderer.restore();
      }
    });
  }

  private getMotionBlurIntensity(progress: number): number {
    // Apply motion blur during fast movement phases
    if (this.animationPhase === 'acceleration' || this.animationPhase === 'cruising') {
      return 0.3;
    }
    return 0;
  }

  private drawItemBackground(x: number, y: number, isNearCenter: boolean, isWinner: boolean, progress: number): void {
    const baseColor = '#2a2a2a';
    const highlightColor = '#3a3a3a';
    const winnerColor = '#4a4a2a';
    
    let fillColor = baseColor;
    let strokeColor = '#444';
    let strokeWidth = 2;
    
    if (isNearCenter && this.animationPhase === 'reveal') {
      fillColor = isWinner ? winnerColor : highlightColor;
      strokeColor = isWinner ? '#ffd700' : '#666';
      strokeWidth = isWinner ? 3 : 2;
    }

    this.renderer.drawRect(x, y, this.itemWidth, this.itemHeight, {
      fill: fillColor,
      stroke: { color: strokeColor, width: strokeWidth },
      cornerRadius: 8,
      shadow: isWinner && this.animationPhase === 'reveal' ? {
        color: '#ffd700',
        blur: 15,
        offsetX: 0,
        offsetY: 0
      } : undefined
    });
  }

  private drawEnhancedRarityOverlay(x: number, y: number, rarity: string, isNearCenter: boolean, progress: number): void {
    if (!this.config) return;
    
    // Enhanced rarity overlay with better visual effects
    const rarityLevel = this.config.config.rarityColors[rarity];
    if (!rarityLevel) return;

    this.renderer.save();
    
    // Increase intensity for items near center during reveal
    const intensity = (isNearCenter && this.animationPhase === 'reveal') ? 1.5 : 1.0;
    
    // Create more sophisticated gradient
    const gradient = this.renderer.createLinearGradient(x, y, x, y + this.itemHeight);
    gradient.addColorStop(0, `${rarityLevel.color}00`); // Transparent at top
    gradient.addColorStop(0.3, `${rarityLevel.color}${Math.floor(40 * intensity).toString(16).padStart(2, '0')}`);
    gradient.addColorStop(0.7, `${rarityLevel.color}${Math.floor(60 * intensity).toString(16).padStart(2, '0')}`);
    gradient.addColorStop(1, `${rarityLevel.color}${Math.floor(80 * intensity).toString(16).padStart(2, '0')}`);

    // Draw gradient overlay
    this.renderer.context.fillStyle = gradient;
    this.renderer.context.fillRect(x, y, this.itemWidth, this.itemHeight);

    // Draw enhanced border with glow
    this.renderer.context.strokeStyle = rarityLevel.color;
    this.renderer.context.lineWidth = 2;
    this.renderer.context.shadowColor = rarityLevel.color;
    this.renderer.context.shadowBlur = 10 * intensity;
    this.renderer.context.strokeRect(x, y, this.itemWidth, this.itemHeight);

    this.renderer.restore();
  }

  private drawParticipantImage(item: ParticipantDisplayItem, x: number, isNearCenter: boolean, isWinner: boolean, progress: number): void {
    const image = this.imageCache.get(item.participant.profileImageUrl);
    if (!image) return;

    const baseImageSize = Math.min(this.itemWidth - 20, this.itemHeight - 40);
    let imageSize = baseImageSize;
    
    // Scale up winner image during reveal
    if (isWinner && this.animationPhase === 'reveal') {
      const revealProgress = (progress - this.phaseTransitions.deceleration) / (1 - this.phaseTransitions.deceleration);
      const scaleMultiplier = 1 + (0.2 * EasingFunctions.easeOutBack(revealProgress));
      imageSize = baseImageSize * scaleMultiplier;
    }
    
    const imageX = x + (this.itemWidth - imageSize) / 2;
    const imageY = item.position.y + 10 + (baseImageSize - imageSize) / 2;
    
    // Add glow effect for winner
    if (isWinner && this.animationPhase === 'reveal') {
      this.renderer.save();
      this.renderer.context.shadowColor = '#ffd700';
      this.renderer.context.shadowBlur = 20;
      this.renderer.drawImage(image, imageX, imageY, imageSize, imageSize);
      this.renderer.restore();
    } else {
      this.renderer.drawImage(image, imageX, imageY, imageSize, imageSize);
    }
  }

  private drawParticipantName(item: ParticipantDisplayItem, x: number, isNearCenter: boolean, isWinner: boolean): void {
    const fontSize = isWinner && this.animationPhase === 'reveal' ? 14 : 12;
    const color = isWinner && this.animationPhase === 'reveal' ? '#ffd700' : '#fff';
    
    this.renderer.drawText(
      item.participant.username,
      x + this.itemWidth / 2,
      item.position.y + this.itemHeight - 25,
      {
        color,
        fontSize,
        fontWeight: isWinner && this.animationPhase === 'reveal' ? 'bold' : 'normal',
        align: 'center',
        maxWidth: this.itemWidth - 10,
        shadow: isWinner && this.animationPhase === 'reveal' ? {
          color: '#000',
          blur: 4,
          offsetX: 1,
          offsetY: 1
        } : undefined
      }
    );
  }

  private updateScreenShake(deltaTime: number): void {
    if (this.screenShake.duration > 0) {
      this.screenShake.elapsed += deltaTime;
      
      if (this.screenShake.elapsed >= this.screenShake.duration) {
        this.screenShake.intensity = 0;
        this.screenShake.duration = 0;
        this.screenShake.elapsed = 0;
      } else {
        // Fade out shake intensity over time
        const progress = this.screenShake.elapsed / this.screenShake.duration;
        this.screenShake.intensity *= (1 - progress);
      }
    }
  }

  private triggerScreenShake(intensity: number, duration: number): void {
    this.screenShake.intensity = intensity;
    this.screenShake.duration = duration;
    this.screenShake.elapsed = 0;
  }

  private updateParticleEffects(deltaTime: number): void {
    // Update existing particles
    this.particleEffects = this.particleEffects.filter(particle => {
      particle.x += particle.vx * deltaTime;
      particle.y += particle.vy * deltaTime;
      particle.life -= deltaTime;
      
      // Apply gravity
      particle.vy += 0.0005 * deltaTime;
      
      // Fade out over time
      particle.vy *= 0.99;
      particle.vx *= 0.99;
      
      return particle.life > 0;
    });

    // Generate new particles during reveal phase
    if (this.animationPhase === 'reveal' && this.particleEffects.length < 50) {
      this.generateRevealParticles();
    }
  }

  private generateRevealParticles(): void {
    if (!this.canvas) return;
    
    const canvasWidth = this.canvas.width / this.renderer.pixelRatio;
    const canvasHeight = this.canvas.height / this.renderer.pixelRatio;
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;
    
    // Generate particles around the winner area
    for (let i = 0; i < 3; i++) {
      this.particleEffects.push({
        x: centerX + (Math.random() - 0.5) * this.itemWidth,
        y: centerY + (Math.random() - 0.5) * this.itemHeight,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        life: 1000 + Math.random() * 1000,
        maxLife: 2000,
        color: '#ffd700',
        size: 2 + Math.random() * 3
      });
    }
  }

  private drawParticleEffects(): void {
    this.particleEffects.forEach(particle => {
      const alpha = particle.life / particle.maxLife;
      
      this.renderer.save();
      this.renderer.setAlpha(alpha);
      
      this.renderer.drawCircle(particle.x, particle.y, particle.size, {
        fill: particle.color,
        shadow: {
          color: particle.color,
          blur: 5,
          offsetX: 0,
          offsetY: 0
        }
      });
      
      this.renderer.restore();
    });
  }

  private drawSelectionIndicator(progress: number): void {
    if (!this.canvas) return;

    const canvasWidth = this.canvas.width / this.renderer.pixelRatio;
    const canvasHeight = this.canvas.height / this.renderer.pixelRatio;
    const centerX = canvasWidth / 2;

    this.renderer.save();
    
    // Animate the indicator appearance and intensity
    let indicatorAlpha = Math.min(progress * 2, 1);
    let indicatorColor = '#ff6b35';
    let glowIntensity = 10;
    
    // Enhanced effects during reveal phase
    if (this.animationPhase === 'reveal') {
      indicatorColor = '#ffd700';
      glowIntensity = 20;
      indicatorAlpha = 0.8 + 0.2 * Math.sin(Date.now() * 0.01); // Pulsing effect
    }
    
    this.renderer.setAlpha(indicatorAlpha);

    // Draw enhanced vertical line with gradient
    const gradient = this.renderer.createLinearGradient(centerX - 2, 50, centerX + 2, canvasHeight - 50);
    gradient.addColorStop(0, `${indicatorColor}80`);
    gradient.addColorStop(0.5, indicatorColor);
    gradient.addColorStop(1, `${indicatorColor}80`);
    
    this.renderer.context.fillStyle = gradient;
    this.renderer.context.shadowColor = indicatorColor;
    this.renderer.context.shadowBlur = glowIntensity;
    this.renderer.context.fillRect(centerX - 2, 50, 4, canvasHeight - 100);

    // Draw enhanced arrow at top
    const arrowSize = this.animationPhase === 'reveal' ? 25 : 20;
    const arrowY = 30;
    
    this.renderer.context.beginPath();
    this.renderer.context.moveTo(centerX, arrowY);
    this.renderer.context.lineTo(centerX - arrowSize / 2, arrowY - arrowSize);
    this.renderer.context.lineTo(centerX + arrowSize / 2, arrowY - arrowSize);
    this.renderer.context.closePath();
    this.renderer.context.fillStyle = indicatorColor;
    this.renderer.context.shadowBlur = glowIntensity;
    this.renderer.context.fill();

    this.renderer.restore();
  }

  private drawWinnerReveal(progress: number): void {
    if (!this.canvas) return;

    const canvasWidth = this.canvas.width / this.renderer.pixelRatio;
    const canvasHeight = this.canvas.height / this.renderer.pixelRatio;
    const centerX = canvasWidth / 2;

    // Find the winner item at center
    const winnerItem = this.displayItems[this.winnerIndex];
    if (!winnerItem) return;

    const x = winnerItem.position.x - this.scrollOffset;
    const revealProgress = (progress - this.phaseTransitions.deceleration) / (1 - this.phaseTransitions.deceleration);

    this.renderer.save();

    // Dramatic screen flash effect at the moment of reveal
    if (revealProgress < 0.1) {
      const flashIntensity = (0.1 - revealProgress) / 0.1;
      this.renderer.setAlpha(flashIntensity * 0.3);
      this.renderer.drawRect(0, 0, canvasWidth, canvasHeight, {
        fill: '#ffffff'
      });
    }

    // Pulsing glow effect around winner
    const glowIntensity = 0.7 + 0.3 * Math.sin(Date.now() * 0.015);
    this.renderer.setAlpha(revealProgress * glowIntensity);

    // Multiple glow layers for dramatic effect
    for (let i = 0; i < 3; i++) {
      const glowSize = 15 + i * 10;
      const glowAlpha = (3 - i) / 3;
      
      this.renderer.save();
      this.renderer.setAlpha(revealProgress * glowAlpha * 0.3);
      
      this.renderer.drawRect(
        x - glowSize,
        winnerItem.position.y - glowSize,
        this.itemWidth + glowSize * 2,
        this.itemHeight + glowSize * 2,
        {
          stroke: {
            color: '#ffd700',
            width: 2
          },
          shadow: {
            color: '#ffd700',
            blur: glowSize,
            offsetX: 0,
            offsetY: 0
          }
        }
      );
      
      this.renderer.restore();
    }

    // Winner text with dramatic entrance
    if (revealProgress > 0.3) {
      const textProgress = (revealProgress - 0.3) / 0.7;
      const textScale = EasingFunctions.easeOutBack(textProgress);
      const textY = winnerItem.position.y - 40 - (1 - textProgress) * 20;
      
      this.renderer.save();
      this.renderer.translate(x + this.itemWidth / 2, textY);
      this.renderer.scale(textScale, textScale);
      
      this.renderer.drawText(
        'WINNER!',
        0,
        0,
        {
          color: '#ffd700',
          fontSize: 28,
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

    // Confetti-like particle burst
    if (revealProgress > 0.5 && this.particleEffects.length < 100) {
      this.generateWinnerParticleBurst(x + this.itemWidth / 2, winnerItem.position.y + this.itemHeight / 2);
    }

    // Screen shake for dramatic impact
    if (revealProgress > 0.1 && revealProgress < 0.3) {
      this.triggerScreenShake(5, 200);
    }

    this.renderer.restore();
  }

  private generateWinnerParticleBurst(centerX: number, centerY: number): void {
    const colors = ['#ffd700', '#ffed4e', '#ff6b35', '#ff8c42', '#ffd23f'];
    
    for (let i = 0; i < 10; i++) {
      const angle = (Math.PI * 2 * i) / 10 + Math.random() * 0.5;
      const speed = 0.1 + Math.random() * 0.2;
      
      this.particleEffects.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 2000 + Math.random() * 1000,
        maxLife: 3000,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 3 + Math.random() * 4
      });
    }
  }

  private drawPhaseOverlays(progress: number): void {
    if (!this.canvas) return;
    
    const canvasWidth = this.canvas.width / this.renderer.pixelRatio;
    const canvasHeight = this.canvas.height / this.renderer.pixelRatio;

    // Draw phase-specific visual indicators
    switch (this.animationPhase) {
      case 'acceleration':
        this.drawAccelerationOverlay(progress, canvasWidth, canvasHeight);
        break;
      case 'deceleration':
        this.drawDecelerationOverlay(progress, canvasWidth, canvasHeight);
        break;
      case 'reveal':
        this.drawRevealOverlay(progress, canvasWidth, canvasHeight);
        break;
    }
  }

  private drawAccelerationOverlay(progress: number, canvasWidth: number, canvasHeight: number): void {
    // Subtle speed lines during acceleration
    const accelProgress = progress / this.phaseTransitions.acceleration;
    const lineAlpha = accelProgress * 0.1;
    
    this.renderer.save();
    this.renderer.setAlpha(lineAlpha);
    
    for (let i = 0; i < 5; i++) {
      const y = (canvasHeight / 6) * (i + 1);
      const lineLength = canvasWidth * (0.3 + accelProgress * 0.4);
      
      this.renderer.drawRect(canvasWidth - lineLength, y - 1, lineLength, 2, {
        fill: '#ffffff'
      });
    }
    
    this.renderer.restore();
  }

  private drawDecelerationOverlay(progress: number, canvasWidth: number, canvasHeight: number): void {
    // Tension-building overlay during deceleration
    const decelStart = this.phaseTransitions.cruising;
    const decelProgress = (progress - decelStart) / (this.phaseTransitions.deceleration - decelStart);
    
    // Vignette effect
    const gradient = this.renderer.createRadialGradient(
      canvasWidth / 2, canvasHeight / 2, 0,
      canvasWidth / 2, canvasHeight / 2, Math.max(canvasWidth, canvasHeight) / 2
    );
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(1, `rgba(0, 0, 0, ${decelProgress * 0.3})`);
    
    this.renderer.context.fillStyle = gradient;
    this.renderer.context.fillRect(0, 0, canvasWidth, canvasHeight);
  }

  private drawRevealOverlay(progress: number, canvasWidth: number, canvasHeight: number): void {
    // Celebration overlay during reveal
    const revealStart = this.phaseTransitions.deceleration;
    const revealProgress = (progress - revealStart) / (1 - revealStart);
    
    // Golden glow overlay
    if (revealProgress > 0.2) {
      const glowAlpha = (revealProgress - 0.2) * 0.1;
      const gradient = this.renderer.createRadialGradient(
        canvasWidth / 2, canvasHeight / 2, 0,
        canvasWidth / 2, canvasHeight / 2, Math.max(canvasWidth, canvasHeight) / 3
      );
      gradient.addColorStop(0, `rgba(255, 215, 0, ${glowAlpha})`);
      gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
      
      this.renderer.context.fillStyle = gradient;
      this.renderer.context.fillRect(0, 0, canvasWidth, canvasHeight);
    }
  }
}