// Spinning Wheel animation engine implementation

import { BaseAnimationEngine } from '../BaseAnimationEngine';
import { ParticipantDisplayItem, EasingFunctions } from '../../../types/animation';
import { Participant } from '../../../types';
import { assignRandomRarity } from '../../../types/rarity';

export class SpinningWheelAnimationEngine extends BaseAnimationEngine {
  private wheelRadius: number = 0;
  private centerX: number = 0;
  private centerY: number = 0;
  private segments: Array<{
    participant: Participant;
    rarity: string;
    startAngle: number;
    endAngle: number;
    color: string;
  }> = [];
  private currentRotation: number = 0;
  private targetRotation: number = 0;
  private pointerAngle: number = 0; // Fixed pointer at top (0 degrees)
  
  // Animation phases
  private animationPhase: 'acceleration' | 'spinning' | 'deceleration' | 'reveal' = 'acceleration';
  private phaseTransitions = {
    acceleration: 0.2,   // First 20% - speed up
    spinning: 0.7,       // 20-70% - constant fast spinning
    deceleration: 0.95,  // 70-95% - slow down dramatically
    reveal: 1.0          // 95-100% - final positioning and reveal
  };

  // Visual effects
  private sparkles: Array<{
    x: number;
    y: number;
    life: number;
    maxLife: number;
    color: string;
    size: number;
  }> = [];

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  protected async initializeAnimation(): Promise<void> {
    if (!this.config || !this.canvas) {
      throw new Error('Animation not properly initialized');
    }

    // Calculate wheel dimensions
    const canvasWidth = this.canvas.width / this.renderer.pixelRatio;
    const canvasHeight = this.canvas.height / this.renderer.pixelRatio;
    
    this.centerX = canvasWidth / 2;
    this.centerY = canvasHeight / 2;
    this.wheelRadius = Math.min(canvasWidth, canvasHeight) * 0.35;

    // Create wheel segments
    this.createWheelSegments();

    // Calculate target rotation to land on winner
    this.calculateTargetRotation();
  }

  private createWheelSegments(): void {
    if (!this.config) return;

    const participants = this.config.participants;
    const segmentAngle = (Math.PI * 2) / participants.length;

    this.segments = participants.map((participant, index) => {
      const startAngle = index * segmentAngle;
      const endAngle = (index + 1) * segmentAngle;
      const rarity = assignRandomRarity();
      
      // Generate segment color based on rarity
      const rarityLevel = this.config!.config.rarityColors[rarity];
      const baseColor = rarityLevel ? rarityLevel.color : '#4a4a4a';
      
      return {
        participant,
        rarity,
        startAngle,
        endAngle,
        color: baseColor
      };
    });
  }

  private calculateTargetRotation(): void {
    if (!this.config) return;

    // Find winner segment
    const winnerIndex = this.segments.findIndex(
      segment => segment.participant.id === this.config!.winner.id
    );

    if (winnerIndex === -1) {
      console.warn('Winner not found in segments');
      return;
    }

    const winnerSegment = this.segments[winnerIndex];
    const segmentCenter = (winnerSegment.startAngle + winnerSegment.endAngle) / 2;
    
    // Calculate rotation needed to align winner segment with pointer (top)
    // Add multiple full rotations for dramatic effect (3-5 full spins)
    const fullRotations = 3 + Math.random() * 2; // 3-5 rotations
    const baseRotation = fullRotations * Math.PI * 2;
    
    // Adjust for pointer position (top = 0, but we want segment center at top)
    this.targetRotation = baseRotation + (Math.PI * 2 - segmentCenter) + this.pointerAngle;
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

    // Calculate current rotation
    this.calculateCurrentRotation(progress);

    // Update and draw sparkle effects
    this.updateSparkles(deltaTime);
    this.drawSparkles();

    // Draw the spinning wheel
    this.drawWheel();

    // Draw the pointer
    this.drawPointer();

    // Draw winner reveal effects
    if (this.animationPhase === 'reveal') {
      this.drawWinnerReveal(progress);
    }

    // Draw phase-specific overlays
    this.drawPhaseOverlays(progress);
  }

  private updateAnimationPhase(progress: number): void {
    if (progress <= this.phaseTransitions.acceleration) {
      this.animationPhase = 'acceleration';
    } else if (progress <= this.phaseTransitions.spinning) {
      this.animationPhase = 'spinning';
    } else if (progress <= this.phaseTransitions.deceleration) {
      this.animationPhase = 'deceleration';
    } else {
      this.animationPhase = 'reveal';
    }
  }

  private calculateCurrentRotation(progress: number): void {
    let easedProgress: number;
    
    switch (this.animationPhase) {
      case 'acceleration':
        const accelProgress = progress / this.phaseTransitions.acceleration;
        easedProgress = EasingFunctions.easeInCubic(accelProgress) * this.phaseTransitions.acceleration;
        break;
        
      case 'spinning':
        const spinStart = this.phaseTransitions.acceleration;
        const spinProgress = (progress - spinStart) / (this.phaseTransitions.spinning - spinStart);
        easedProgress = spinStart + spinProgress * (this.phaseTransitions.spinning - spinStart);
        break;
        
      case 'deceleration':
        const decelStart = this.phaseTransitions.spinning;
        const decelProgress = (progress - decelStart) / (this.phaseTransitions.deceleration - decelStart);
        const decelEased = EasingFunctions.easeOutQuart(decelProgress);
        easedProgress = decelStart + decelEased * (this.phaseTransitions.deceleration - decelStart);
        break;
        
      case 'reveal':
        const revealStart = this.phaseTransitions.deceleration;
        const revealProgress = (progress - revealStart) / (1 - revealStart);
        const revealEased = EasingFunctions.easeOutElastic(revealProgress);
        easedProgress = revealStart + revealEased * (1 - revealStart);
        break;
        
      default:
        easedProgress = progress;
    }
    
    this.currentRotation = this.targetRotation * easedProgress;
  }

  private drawBackground(canvasWidth: number, canvasHeight: number): void {
    // Draw background image if provided
    if (this.config?.backgroundImage) {
      const bgImage = this.imageCache.get(this.config.backgroundImage);
      if (bgImage) {
        this.renderer.drawImage(bgImage, 0, 0, canvasWidth, canvasHeight);
      }
    }
    
    // Add subtle radial gradient
    const gradient = this.renderer.createRadialGradient(
      this.centerX, this.centerY, 0,
      this.centerX, this.centerY, this.wheelRadius * 1.5
    );
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0.1)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
    
    this.renderer.context.fillStyle = gradient;
    this.renderer.context.fillRect(0, 0, canvasWidth, canvasHeight);
  }

  private drawWheel(): void {
    this.renderer.save();
    this.renderer.translate(this.centerX, this.centerY);
    this.renderer.rotate(this.currentRotation);

    // Draw wheel segments
    this.segments.forEach((segment, index) => {
      this.drawWheelSegment(segment, index);
    });

    // Draw wheel border
    this.renderer.drawCircle(0, 0, this.wheelRadius, {
      stroke: {
        color: '#333',
        width: 4
      }
    });

    // Draw center hub
    this.renderer.drawCircle(0, 0, 20, {
      fill: '#2a2a2a',
      stroke: {
        color: '#555',
        width: 2
      }
    });

    this.renderer.restore();
  }

  private drawWheelSegment(segment: any, index: number): void {
    const { startAngle, endAngle, color, participant } = segment;
    
    // Draw segment background
    this.renderer.context.beginPath();
    this.renderer.context.moveTo(0, 0);
    this.renderer.context.arc(0, 0, this.wheelRadius, startAngle, endAngle);
    this.renderer.context.closePath();
    
    // Create gradient for segment
    const gradient = this.renderer.createRadialGradient(0, 0, 0, 0, 0, this.wheelRadius);
    gradient.addColorStop(0, this.lightenColor(color, 20));
    gradient.addColorStop(1, color);
    
    this.renderer.context.fillStyle = gradient;
    this.renderer.context.fill();
    
    // Draw segment border
    this.renderer.context.strokeStyle = '#333';
    this.renderer.context.lineWidth = 2;
    this.renderer.context.stroke();

    // Draw participant image
    this.drawSegmentContent(segment, startAngle, endAngle);
  }

  private drawSegmentContent(segment: any, startAngle: number, endAngle: number): void {
    const { participant } = segment;
    const midAngle = (startAngle + endAngle) / 2;
    const textRadius = this.wheelRadius * 0.7;
    const imageRadius = this.wheelRadius * 0.4;
    
    this.renderer.save();
    this.renderer.rotate(midAngle);

    // Draw participant image
    const image = this.imageCache.get(participant.profileImageUrl);
    if (image) {
      const imageSize = 40;
      this.renderer.drawImage(
        image,
        -imageSize / 2,
        -imageRadius - imageSize / 2,
        imageSize,
        imageSize
      );
    }

    // Draw participant name
    this.renderer.rotate(-midAngle); // Reset rotation for text
    const textX = Math.cos(midAngle) * textRadius;
    const textY = Math.sin(midAngle) * textRadius;
    
    this.renderer.drawText(
      participant.username,
      textX,
      textY,
      {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
        align: 'center',
        maxWidth: this.wheelRadius * 0.3,
        shadow: {
          color: '#000',
          blur: 2,
          offsetX: 1,
          offsetY: 1
        }
      }
    );

    this.renderer.restore();
  }

  private drawPointer(): void {
    this.renderer.save();
    this.renderer.translate(this.centerX, this.centerY);

    // Draw pointer shadow
    this.renderer.save();
    this.renderer.translate(2, 2);
    this.renderer.setAlpha(0.3);
    this.drawPointerShape('#000');
    this.renderer.restore();

    // Draw main pointer
    this.drawPointerShape('#ff6b35');

    // Add glow effect during reveal
    if (this.animationPhase === 'reveal') {
      this.renderer.save();
      this.renderer.context.shadowColor = '#ff6b35';
      this.renderer.context.shadowBlur = 15;
      this.drawPointerShape('#ff6b35');
      this.renderer.restore();
    }

    this.renderer.restore();
  }

  private drawPointerShape(color: string): void {
    const pointerSize = 30;
    
    this.renderer.context.beginPath();
    this.renderer.context.moveTo(0, -this.wheelRadius - 10);
    this.renderer.context.lineTo(-pointerSize / 2, -this.wheelRadius + pointerSize);
    this.renderer.context.lineTo(pointerSize / 2, -this.wheelRadius + pointerSize);
    this.renderer.context.closePath();
    
    this.renderer.context.fillStyle = color;
    this.renderer.context.fill();
    
    this.renderer.context.strokeStyle = '#333';
    this.renderer.context.lineWidth = 2;
    this.renderer.context.stroke();
  }

  private updateSparkles(deltaTime: number): void {
    // Update existing sparkles
    this.sparkles = this.sparkles.filter(sparkle => {
      sparkle.life -= deltaTime;
      return sparkle.life > 0;
    });

    // Generate new sparkles during spinning phases
    if ((this.animationPhase === 'spinning' || this.animationPhase === 'reveal') && 
        this.sparkles.length < 20) {
      this.generateSparkles();
    }
  }

  private generateSparkles(): void {
    const angle = Math.random() * Math.PI * 2;
    const radius = this.wheelRadius + 10 + Math.random() * 50;
    
    this.sparkles.push({
      x: this.centerX + Math.cos(angle) * radius,
      y: this.centerY + Math.sin(angle) * radius,
      life: 500 + Math.random() * 1000,
      maxLife: 1500,
      color: '#ffd700',
      size: 2 + Math.random() * 3
    });
  }

  private drawSparkles(): void {
    this.sparkles.forEach(sparkle => {
      const alpha = sparkle.life / sparkle.maxLife;
      
      this.renderer.save();
      this.renderer.setAlpha(alpha);
      
      this.renderer.drawCircle(sparkle.x, sparkle.y, sparkle.size, {
        fill: sparkle.color,
        shadow: {
          color: sparkle.color,
          blur: 5,
          offsetX: 0,
          offsetY: 0
        }
      });
      
      this.renderer.restore();
    });
  }

  private drawWinnerReveal(progress: number): void {
    const revealStart = this.phaseTransitions.deceleration;
    const revealProgress = (progress - revealStart) / (1 - revealStart);

    // Find winner segment position
    const winnerSegment = this.segments.find(
      segment => segment.participant.id === this.config!.winner.id
    );
    
    if (!winnerSegment) return;

    // Draw winner highlight
    this.renderer.save();
    this.renderer.translate(this.centerX, this.centerY);
    this.renderer.rotate(this.currentRotation);

    // Pulsing glow effect
    const glowIntensity = 0.7 + 0.3 * Math.sin(Date.now() * 0.01);
    this.renderer.setAlpha(revealProgress * glowIntensity);

    // Draw highlighted segment
    this.renderer.context.beginPath();
    this.renderer.context.moveTo(0, 0);
    this.renderer.context.arc(0, 0, this.wheelRadius + 10, winnerSegment.startAngle, winnerSegment.endAngle);
    this.renderer.context.closePath();
    
    this.renderer.context.strokeStyle = '#ffd700';
    this.renderer.context.lineWidth = 6;
    this.renderer.context.shadowColor = '#ffd700';
    this.renderer.context.shadowBlur = 20;
    this.renderer.context.stroke();

    this.renderer.restore();

    // Draw winner text
    if (revealProgress > 0.5) {
      const textProgress = (revealProgress - 0.5) / 0.5;
      const textScale = EasingFunctions.easeOutBack(textProgress);
      
      this.renderer.save();
      this.renderer.translate(this.centerX, this.centerY + this.wheelRadius + 80);
      this.renderer.scale(textScale, textScale);
      
      this.renderer.drawText(
        'WINNER!',
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
      
      this.renderer.drawText(
        winnerSegment.participant.username,
        0,
        40,
        {
          color: '#fff',
          fontSize: 24,
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
  }

  private drawPhaseOverlays(progress: number): void {
    if (!this.canvas) return;
    
    const canvasWidth = this.canvas.width / this.renderer.pixelRatio;
    const canvasHeight = this.canvas.height / this.renderer.pixelRatio;

    // Draw motion blur during fast spinning
    if (this.animationPhase === 'spinning') {
      const blurAlpha = 0.1;
      this.renderer.save();
      this.renderer.setAlpha(blurAlpha);
      
      // Draw multiple wheel positions for motion blur effect
      for (let i = 1; i <= 3; i++) {
        this.renderer.save();
        this.renderer.translate(this.centerX, this.centerY);
        this.renderer.rotate(this.currentRotation - (i * 0.1));
        
        this.renderer.drawCircle(0, 0, this.wheelRadius, {
          stroke: {
            color: '#fff',
            width: 2
          }
        });
        
        this.renderer.restore();
      }
      
      this.renderer.restore();
    }

    // Draw celebration overlay during reveal
    if (this.animationPhase === 'reveal') {
      const revealStart = this.phaseTransitions.deceleration;
      const revealProgress = (progress - revealStart) / (1 - revealStart);
      
      if (revealProgress > 0.3) {
        const celebrationAlpha = (revealProgress - 0.3) * 0.2;
        const gradient = this.renderer.createRadialGradient(
          this.centerX, this.centerY, 0,
          this.centerX, this.centerY, Math.max(canvasWidth, canvasHeight) / 2
        );
        gradient.addColorStop(0, `rgba(255, 215, 0, ${celebrationAlpha})`);
        gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
        
        this.renderer.context.fillStyle = gradient;
        this.renderer.context.fillRect(0, 0, canvasWidth, canvasHeight);
      }
    }
  }

  private lightenColor(color: string, percent: number): string {
    // Simple color lightening utility
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