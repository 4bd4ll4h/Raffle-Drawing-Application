// Zoom & Fade animation engine implementation

import { BaseAnimationEngine } from '../BaseAnimationEngine';
import { ParticipantDisplayItem, EasingFunctions } from '../../../types/animation';
import { Participant } from '../../../types';
import { assignRandomRarity } from '../../../types/rarity';

interface ZoomItem extends ParticipantDisplayItem {
  targetScale: number;
  targetAlpha: number;
  zoomStartTime: number;
  isZooming: boolean;
  isWinner: boolean;
  finalPosition: { x: number; y: number };
  glowIntensity: number;
}

export class ZoomFadeAnimationEngine extends BaseAnimationEngine {
  private items: ZoomItem[] = [];
  private centerX: number = 0;
  private centerY: number = 0;
  private gridCols: number = 0;
  private gridRows: number = 0;
  private itemSize: number = 80;
  private itemSpacing: number = 20;
  private currentZoomIndex: number = 0;
  private winnerIndex: number = -1;
  
  // Animation phases
  private animationPhase: 'setup' | 'zooming' | 'reveal' | 'celebration' = 'setup';
  private phaseTransitions = {
    setup: 0.15,      // First 15% - items appear in grid
    zooming: 0.8,     // 15-80% - sequential zoom and fade
    reveal: 0.95,     // 80-95% - winner zoom and highlight
    celebration: 1.0  // 95-100% - celebration effects
  };

  // Visual effects
  private lightRays: Array<{
    angle: number;
    length: number;
    alpha: number;
    width: number;
  }> = [];

  private floatingParticles: Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
    color: string;
    size: number;
    alpha: number;
  }> = [];

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  protected async initializeAnimation(): Promise<void> {
    if (!this.config || !this.canvas) {
      throw new Error('Animation not properly initialized');
    }

    // Calculate layout
    this.calculateLayout();

    // Create items
    this.createItems();

    // Find winner
    this.findWinner();

    // Initialize light rays
    this.initializeLightRays();
  }

  private calculateLayout(): void {
    if (!this.canvas) return;

    const canvasWidth = this.canvas.width / this.renderer.pixelRatio;
    const canvasHeight = this.canvas.height / this.renderer.pixelRatio;
    const participantCount = this.config!.participants.length;

    this.centerX = canvasWidth / 2;
    this.centerY = canvasHeight / 2;

    // Calculate optimal grid layout
    const availableWidth = canvasWidth - 100;
    const availableHeight = canvasHeight - 150;

    // Find best grid configuration
    let bestLayout = { rows: 1, cols: participantCount };
    let bestWaste = Infinity;

    for (let rows = 1; rows <= Math.ceil(Math.sqrt(participantCount)); rows++) {
      const cols = Math.ceil(participantCount / rows);
      const totalWidth = cols * this.itemSize + (cols - 1) * this.itemSpacing;
      const totalHeight = rows * this.itemSize + (rows - 1) * this.itemSpacing;

      if (totalWidth <= availableWidth && totalHeight <= availableHeight) {
        const waste = (availableWidth - totalWidth) + (availableHeight - totalHeight);
        if (waste < bestWaste) {
          bestWaste = waste;
          bestLayout = { rows, cols };
        }
      }
    }

    this.gridRows = bestLayout.rows;
    this.gridCols = bestLayout.cols;
  }

  private createItems(): void {
    if (!this.config) return;

    const participants = this.config.participants;
    const totalWidth = this.gridCols * this.itemSize + (this.gridCols - 1) * this.itemSpacing;
    const totalHeight = this.gridRows * this.itemSize + (this.gridRows - 1) * this.itemSpacing;
    const startX = this.centerX - totalWidth / 2;
    const startY = this.centerY - totalHeight / 2;

    this.items = participants.map((participant, index) => {
      const row = Math.floor(index / this.gridCols);
      const col = index % this.gridCols;
      
      const x = startX + col * (this.itemSize + this.itemSpacing);
      const y = startY + row * (this.itemSize + this.itemSpacing);
      
      const rarity = assignRandomRarity();
      const isWinner = participant.id === this.config!.winner.id;

      return {
        participant,
        rarity,
        position: { x, y },
        size: { width: this.itemSize, height: this.itemSize },
        scale: 0, // Start invisible
        alpha: 0,
        targetScale: 1,
        targetAlpha: 1,
        rotation: 0,
        zoomStartTime: 0,
        isZooming: false,
        isWinner,
        finalPosition: { x: this.centerX, y: this.centerY },
        glowIntensity: 0
      };
    });
  }

  private findWinner(): void {
    this.winnerIndex = this.items.findIndex(item => item.isWinner);
  }

  private initializeLightRays(): void {
    const rayCount = 12;
    for (let i = 0; i < rayCount; i++) {
      this.lightRays.push({
        angle: (Math.PI * 2 * i) / rayCount,
        length: 0,
        alpha: 0,
        width: 2 + Math.random() * 4
      });
    }
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

    // Draw background
    this.drawBackground(canvasWidth, canvasHeight);

    // Update items
    this.updateItems(progress, deltaTime);

    // Update and draw light rays
    this.updateLightRays(progress);
    this.drawLightRays();

    // Update and draw floating particles
    this.updateFloatingParticles(deltaTime);
    this.drawFloatingParticles();

    // Draw items
    this.drawItems();

    // Draw phase-specific effects
    this.drawPhaseEffects(progress, canvasWidth, canvasHeight);
  }

  private updateAnimationPhase(progress: number): void {
    if (progress <= this.phaseTransitions.setup) {
      this.animationPhase = 'setup';
    } else if (progress <= this.phaseTransitions.zooming) {
      this.animationPhase = 'zooming';
    } else if (progress <= this.phaseTransitions.reveal) {
      this.animationPhase = 'reveal';
    } else {
      this.animationPhase = 'celebration';
    }
  }

  private updateItems(progress: number, deltaTime: number): void {
    switch (this.animationPhase) {
      case 'setup':
        this.updateSetupPhase(progress);
        break;
      case 'zooming':
        this.updateZoomingPhase(progress);
        break;
      case 'reveal':
        this.updateRevealPhase(progress);
        break;
      case 'celebration':
        this.updateCelebrationPhase(progress, deltaTime);
        break;
    }
  }

  private updateSetupPhase(progress: number): void {
    const setupProgress = progress / this.phaseTransitions.setup;
    
    // Items appear with staggered timing
    this.items.forEach((item, index) => {
      const delay = (index / this.items.length) * 0.6;
      const itemProgress = Math.max(0, (setupProgress - delay) / (1 - delay));
      const easedProgress = EasingFunctions.easeOutBack(itemProgress);
      
      item.scale = easedProgress;
      item.alpha = easedProgress;
    });
  }

  private updateZoomingPhase(progress: number): void {
    const zoomingStart = this.phaseTransitions.setup;
    const zoomingProgress = (progress - zoomingStart) / (this.phaseTransitions.zooming - zoomingStart);
    
    // Calculate which items should be zooming
    const totalZoomTime = this.phaseTransitions.zooming - this.phaseTransitions.setup;
    const itemsToZoom = Math.floor(zoomingProgress * this.items.length);
    
    // Create zoom sequence (winner last)
    const zoomOrder = Array.from({ length: this.items.length }, (_, i) => i);
    if (this.winnerIndex !== -1) {
      // Move winner to the end
      const winnerPos = zoomOrder.indexOf(this.winnerIndex);
      if (winnerPos !== -1) {
        zoomOrder.splice(winnerPos, 1);
        zoomOrder.push(this.winnerIndex);
      }
    }

    // Update items based on zoom sequence
    zoomOrder.forEach((itemIndex, orderIndex) => {
      const item = this.items[itemIndex];
      
      if (orderIndex < itemsToZoom) {
        if (!item.isZooming && item.zoomStartTime === 0) {
          item.isZooming = true;
          item.zoomStartTime = progress;
        }
        
        if (item.isZooming) {
          const zoomDuration = 0.08; // Each zoom takes 8% of total time
          const zoomElapsed = progress - item.zoomStartTime;
          const zoomProgress = Math.min(zoomElapsed / zoomDuration, 1);
          
          if (orderIndex === zoomOrder.length - 1) {
            // Winner - zoom in and move to center
            const easedProgress = EasingFunctions.easeInOutCubic(zoomProgress);
            item.scale = 1 + easedProgress * 1.5; // Scale up to 2.5x
            item.position.x = item.position.x + (item.finalPosition.x - item.position.x) * easedProgress;
            item.position.y = item.position.y + (item.finalPosition.y - item.position.y) * easedProgress;
            item.alpha = 1; // Winner stays visible
          } else {
            // Non-winners - zoom in then fade out
            if (zoomProgress < 0.5) {
              const scaleProgress = zoomProgress * 2;
              item.scale = 1 + EasingFunctions.easeInCubic(scaleProgress) * 0.5;
              item.alpha = 1;
            } else {
              const fadeProgress = (zoomProgress - 0.5) * 2;
              item.scale = 1.5 - EasingFunctions.easeOutCubic(fadeProgress) * 1.5;
              item.alpha = 1 - EasingFunctions.easeInCubic(fadeProgress);
            }
          }
          
          if (zoomProgress >= 1) {
            item.isZooming = false;
          }
        }
      }
    });
  }

  private updateRevealPhase(progress: number): void {
    const revealStart = this.phaseTransitions.zooming;
    const revealProgress = (progress - revealStart) / (this.phaseTransitions.reveal - revealStart);
    
    // Hide all non-winner items
    this.items.forEach((item, index) => {
      if (index !== this.winnerIndex) {
        item.alpha = 0;
        item.scale = 0;
      }
    });

    // Enhance winner
    if (this.winnerIndex !== -1) {
      const winner = this.items[this.winnerIndex];
      winner.scale = 2.5 + 0.2 * EasingFunctions.easeInOutSine(revealProgress * 4);
      winner.alpha = 1;
      winner.glowIntensity = revealProgress;
      
      // Position at center
      winner.position.x = this.centerX;
      winner.position.y = this.centerY;
    }
  }

  private updateCelebrationPhase(progress: number, deltaTime: number): void {
    const celebrationStart = this.phaseTransitions.reveal;
    const celebrationProgress = (progress - celebrationStart) / (1 - celebrationStart);

    // Winner celebration effects
    if (this.winnerIndex !== -1) {
      const winner = this.items[this.winnerIndex];
      
      // Gentle pulsing
      const pulse = 1 + 0.1 * Math.sin(Date.now() * 0.008);
      winner.scale = 2.5 * pulse;
      winner.glowIntensity = 0.8 + 0.2 * Math.sin(Date.now() * 0.01);
      
      // Gentle rotation
      winner.rotation += 0.003;
    }

    // Generate floating particles
    if (this.floatingParticles.length < 30 && celebrationProgress > 0.2) {
      this.generateFloatingParticles();
    }
  }

  private updateLightRays(progress: number): void {
    if (this.animationPhase === 'reveal' || this.animationPhase === 'celebration') {
      const intensity = this.animationPhase === 'celebration' ? 1 : 
        (progress - this.phaseTransitions.zooming) / (this.phaseTransitions.reveal - this.phaseTransitions.zooming);
      
      this.lightRays.forEach((ray, index) => {
        const maxLength = Math.max(this.canvas!.width, this.canvas!.height) / this.renderer.pixelRatio;
        ray.length = maxLength * intensity;
        ray.alpha = intensity * 0.3;
        
        // Slowly rotate rays
        ray.angle += 0.002 * (index % 2 === 0 ? 1 : -1);
      });
    } else {
      this.lightRays.forEach(ray => {
        ray.length = 0;
        ray.alpha = 0;
      });
    }
  }

  private updateFloatingParticles(deltaTime: number): void {
    this.floatingParticles = this.floatingParticles.filter(particle => {
      particle.x += particle.vx * deltaTime;
      particle.y += particle.vy * deltaTime;
      particle.life -= deltaTime;
      particle.alpha = Math.max(0, particle.life / particle.maxLife);
      
      return particle.life > 0;
    });
  }

  private generateFloatingParticles(): void {
    const colors = ['#ffd700', '#ffed4e', '#4ecdc4', '#45b7d1'];
    
    for (let i = 0; i < 3; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 100 + Math.random() * 150;
      
      this.floatingParticles.push({
        x: this.centerX + Math.cos(angle) * radius,
        y: this.centerY + Math.sin(angle) * radius,
        vx: (Math.random() - 0.5) * 0.05,
        vy: (Math.random() - 0.5) * 0.05,
        life: 3000 + Math.random() * 2000,
        maxLife: 5000,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 2 + Math.random() * 4,
        alpha: 0.8
      });
    }
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
    let gradientIntensity = 0.3;
    if (this.animationPhase === 'reveal' || this.animationPhase === 'celebration') {
      gradientIntensity = 0.5;
    }
    
    const gradient = this.renderer.createRadialGradient(
      this.centerX, this.centerY, 0,
      this.centerX, this.centerY, Math.max(canvasWidth, canvasHeight) / 2
    );
    gradient.addColorStop(0, `rgba(40, 40, 60, ${gradientIntensity * 0.5})`);
    gradient.addColorStop(1, `rgba(10, 10, 30, ${gradientIntensity})`);
    
    this.renderer.context.fillStyle = gradient;
    this.renderer.context.fillRect(0, 0, canvasWidth, canvasHeight);
  }

  private drawLightRays(): void {
    if (this.winnerIndex === -1) return;
    
    this.lightRays.forEach(ray => {
      if (ray.alpha <= 0 || ray.length <= 0) return;
      
      this.renderer.save();
      this.renderer.setAlpha(ray.alpha);
      this.renderer.translate(this.centerX, this.centerY);
      this.renderer.rotate(ray.angle);
      
      // Draw light ray as gradient line
      const gradient = this.renderer.createLinearGradient(0, 0, ray.length, 0);
      gradient.addColorStop(0, '#ffd700');
      gradient.addColorStop(0.5, '#ffed4e80');
      gradient.addColorStop(1, '#ffd70000');
      
      this.renderer.context.strokeStyle = gradient;
      this.renderer.context.lineWidth = ray.width;
      this.renderer.context.beginPath();
      this.renderer.context.moveTo(0, 0);
      this.renderer.context.lineTo(ray.length, 0);
      this.renderer.context.stroke();
      
      this.renderer.restore();
    });
  }

  private drawFloatingParticles(): void {
    this.floatingParticles.forEach(particle => {
      this.renderer.save();
      this.renderer.setAlpha(particle.alpha);
      
      this.renderer.drawCircle(particle.x, particle.y, particle.size, {
        fill: particle.color,
        shadow: {
          color: particle.color,
          blur: particle.size * 2,
          offsetX: 0,
          offsetY: 0
        }
      });
      
      this.renderer.restore();
    });
  }

  private drawItems(): void {
    this.items.forEach((item, index) => {
      if (item.alpha <= 0 || item.scale <= 0) return;
      
      this.renderer.save();
      
      // Apply transformations
      this.renderer.translate(
        item.position.x + item.size.width / 2,
        item.position.y + item.size.height / 2
      );
      this.renderer.scale(item.scale, item.scale);
      this.renderer.rotate(item.rotation);
      this.renderer.setAlpha(item.alpha);

      // Draw item
      this.drawItem(item);
      
      this.renderer.restore();
    });
  }

  private drawItem(item: ZoomItem): void {
    const halfSize = this.itemSize / 2;
    
    // Draw glow effect for winner
    if (item.isWinner && item.glowIntensity > 0) {
      this.renderer.save();
      this.renderer.setAlpha(item.glowIntensity);
      
      // Multiple glow layers
      for (let i = 0; i < 3; i++) {
        const glowSize = 15 + i * 10;
        this.renderer.drawCircle(0, 0, halfSize + glowSize, {
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
        });
      }
      
      this.renderer.restore();
    }

    // Draw rarity background
    const rarityLevel = this.config!.config.rarityColors[item.rarity];
    const rarityColor = rarityLevel ? rarityLevel.color : '#4a4a4a';
    
    // Create gradient background
    const gradient = this.renderer.createRadialGradient(0, 0, 0, 0, 0, halfSize);
    gradient.addColorStop(0, this.lightenColor(rarityColor, 30));
    gradient.addColorStop(1, rarityColor);
    
    this.renderer.context.fillStyle = gradient;
    this.renderer.drawCircle(0, 0, halfSize, {
      fill: gradient as any,
      stroke: {
        color: item.isWinner ? '#ffd700' : rarityColor,
        width: item.isWinner ? 3 : 2
      }
    });

    // Draw participant image
    const image = this.imageCache.get(item.participant.profileImageUrl);
    if (image) {
      const imageSize = this.itemSize - 20;
      this.renderer.drawImage(
        image,
        -imageSize / 2,
        -imageSize / 2,
        imageSize,
        imageSize
      );
    }

    // Draw participant name (only for winner during reveal/celebration)
    if (item.isWinner && (this.animationPhase === 'reveal' || this.animationPhase === 'celebration')) {
      this.renderer.drawText(
        item.participant.username,
        0,
        halfSize + 25,
        {
          color: '#ffd700',
          fontSize: 18,
          fontWeight: 'bold',
          align: 'center',
          shadow: {
            color: '#000',
            blur: 4,
            offsetX: 2,
            offsetY: 2
          }
        }
      );
    }
  }

  private drawPhaseEffects(progress: number, canvasWidth: number, canvasHeight: number): void {
    // Draw title
    this.drawTitle(progress, canvasWidth);

    // Draw winner announcement
    if (this.animationPhase === 'celebration' && this.winnerIndex !== -1) {
      this.drawWinnerAnnouncement(progress, canvasWidth, canvasHeight);
    }
  }

  private drawTitle(progress: number, canvasWidth: number): void {
    let title = 'Zoom & Fade';
    let titleColor = '#fff';
    
    if (this.animationPhase === 'zooming') {
      title = 'Focusing...';
      titleColor = '#4ecdc4';
    } else if (this.animationPhase === 'reveal') {
      title = 'Winner Revealed!';
      titleColor = '#ffd700';
    } else if (this.animationPhase === 'celebration') {
      title = 'Congratulations!';
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
        fontSize: 28,
        fontWeight: 'bold',
        align: 'center',
        shadow: {
          color: '#000',
          blur: 4,
          offsetX: 2,
          offsetY: 2
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
    const winner = this.items[this.winnerIndex];
    
    this.renderer.save();
    this.renderer.translate(canvasWidth / 2, canvasHeight - 60);
    this.renderer.scale(textScale, textScale);
    
    this.renderer.drawText(
      winner.participant.username,
      0,
      0,
      {
        color: '#ffd700',
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

  private lightenColor(color: string, percent: number): string {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    
    return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
  }
}