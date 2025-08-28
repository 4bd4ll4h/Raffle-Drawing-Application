// Slot Machine animation engine implementation

import { BaseAnimationEngine } from '../BaseAnimationEngine';
import { ParticipantDisplayItem, EasingFunctions } from '../../../types/animation';
import { Participant } from '../../../types';
import { assignRandomRarity } from '../../../types/rarity';

interface ReelItem {
  participant: Participant;
  rarity: string;
  y: number;
  targetY: number;
  isWinner: boolean;
}

interface Reel {
  items: ReelItem[];
  currentOffset: number;
  targetOffset: number;
  isSpinning: boolean;
  stopTime: number;
  itemHeight: number;
  visibleItems: number;
}

export class SlotMachineAnimationEngine extends BaseAnimationEngine {
  private reels: Reel[] = [];
  private reelWidth: number = 120;
  private reelHeight: number = 300;
  private itemHeight: number = 60;
  private reelSpacing: number = 20;
  private machineStartX: number = 0;
  private machineStartY: number = 0;
  private winnerReelIndex: number = -1;
  private winnerItemIndex: number = -1;
  
  // Animation phases
  private animationPhase: 'startup' | 'spinning' | 'stopping' | 'reveal' = 'startup';
  private phaseTransitions = {
    startup: 0.15,     // First 15% - reels start spinning
    spinning: 0.6,     // 15-60% - all reels spinning fast
    stopping: 0.9,     // 60-90% - reels stop one by one
    reveal: 1.0        // 90-100% - winner reveal
  };

  // Visual effects
  private sparks: Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
    color: string;
    size: number;
  }> = [];

  private flashEffect = {
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

    // Calculate machine layout
    this.calculateMachineLayout();

    // Create reels
    this.createReels();

    // Find winner position
    this.findWinnerPosition();
  }

  private calculateMachineLayout(): void {
    if (!this.canvas) return;

    const canvasWidth = this.canvas.width / this.renderer.pixelRatio;
    const canvasHeight = this.canvas.height / this.renderer.pixelRatio;
    
    // Calculate number of reels (3-5 reels depending on participant count)
    const participantCount = this.config!.participants.length;
    const reelCount = Math.min(5, Math.max(3, Math.ceil(participantCount / 8)));
    
    // Calculate machine dimensions
    const totalMachineWidth = reelCount * this.reelWidth + (reelCount - 1) * this.reelSpacing;
    
    this.machineStartX = (canvasWidth - totalMachineWidth) / 2;
    this.machineStartY = (canvasHeight - this.reelHeight) / 2;
    
    this.itemHeight = this.reelHeight / 5; // 5 visible items per reel
  }

  private createReels(): void {
    if (!this.config) return;

    const participants = this.config.participants;
    const reelCount = Math.min(5, Math.max(3, Math.ceil(participants.length / 8)));
    
    // Distribute participants across reels
    const participantsPerReel = Math.ceil(participants.length / reelCount);
    
    for (let reelIndex = 0; reelIndex < reelCount; reelIndex++) {
      const reelParticipants = participants.slice(
        reelIndex * participantsPerReel,
        (reelIndex + 1) * participantsPerReel
      );
      
      // Create extended list for smooth scrolling (repeat participants)
      const extendedParticipants: Participant[] = [];
      const repetitions = Math.max(10, Math.ceil(50 / reelParticipants.length));
      
      for (let i = 0; i < repetitions; i++) {
        extendedParticipants.push(...reelParticipants);
      }

      // Create reel items
      const items: ReelItem[] = extendedParticipants.map((participant, itemIndex) => {
        const rarity = assignRandomRarity();
        const isWinner = participant.id === this.config!.winner.id;
        
        return {
          participant,
          rarity,
          y: itemIndex * this.itemHeight,
          targetY: itemIndex * this.itemHeight,
          isWinner
        };
      });

      const reel: Reel = {
        items,
        currentOffset: 0,
        targetOffset: 0,
        isSpinning: false,
        stopTime: 0,
        itemHeight: this.itemHeight,
        visibleItems: 5
      };

      this.reels.push(reel);
    }
  }

  private findWinnerPosition(): void {
    // Find which reel contains the winner and position it for reveal
    for (let reelIndex = 0; reelIndex < this.reels.length; reelIndex++) {
      const reel = this.reels[reelIndex];
      const winnerItems = reel.items
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => item.isWinner);
      
      if (winnerItems.length > 0) {
        // Choose a winner item positioned for good reveal (middle of visible area)
        const idealPosition = Math.floor(reel.items.length * 0.6);
        const chosenWinner = winnerItems.reduce((best, current) => {
          const bestDistance = Math.abs(best.index - idealPosition);
          const currentDistance = Math.abs(current.index - idealPosition);
          return currentDistance < bestDistance ? current : best;
        });
        
        this.winnerReelIndex = reelIndex;
        this.winnerItemIndex = chosenWinner.index;
        
        // Calculate target offset to center winner in visible area
        const centerPosition = 2; // Middle of 5 visible items (0-4)
        reel.targetOffset = (chosenWinner.index - centerPosition) * this.itemHeight;
        break;
      }
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

    // Update reels
    this.updateReels(progress, deltaTime);

    // Draw slot machine frame
    this.drawMachineFrame();

    // Draw reels
    this.drawReels();

    // Update and draw effects
    this.updateEffects(deltaTime);
    this.drawEffects();

    // Draw winner reveal
    if (this.animationPhase === 'reveal') {
      this.drawWinnerReveal(progress);
    }

    // Draw flash effect
    if (this.flashEffect.intensity > 0) {
      this.drawFlashEffect();
    }
  }

  private updateAnimationPhase(progress: number): void {
    if (progress <= this.phaseTransitions.startup) {
      this.animationPhase = 'startup';
    } else if (progress <= this.phaseTransitions.spinning) {
      this.animationPhase = 'spinning';
    } else if (progress <= this.phaseTransitions.stopping) {
      this.animationPhase = 'stopping';
    } else {
      this.animationPhase = 'reveal';
    }
  }

  private updateReels(progress: number, deltaTime: number): void {
    switch (this.animationPhase) {
      case 'startup':
        this.updateStartupPhase(progress);
        break;
      case 'spinning':
        this.updateSpinningPhase(progress, deltaTime);
        break;
      case 'stopping':
        this.updateStoppingPhase(progress, deltaTime);
        break;
      case 'reveal':
        this.updateRevealPhase(progress);
        break;
    }
  }

  private updateStartupPhase(progress: number): void {
    const startupProgress = progress / this.phaseTransitions.startup;
    
    // Start reels spinning with staggered timing
    this.reels.forEach((reel, index) => {
      const delay = (index / this.reels.length) * 0.5;
      const reelProgress = Math.max(0, (startupProgress - delay) / (1 - delay));
      
      if (reelProgress > 0) {
        reel.isSpinning = true;
      }
    });
  }

  private updateSpinningPhase(progress: number, deltaTime: number): void {
    // All reels spinning at maximum speed
    this.reels.forEach(reel => {
      if (reel.isSpinning) {
        const spinSpeed = 0.8; // pixels per millisecond
        reel.currentOffset += spinSpeed * deltaTime;
        
        // Wrap around when reaching end of items
        const maxOffset = (reel.items.length - reel.visibleItems) * reel.itemHeight;
        if (reel.currentOffset > maxOffset) {
          reel.currentOffset = 0;
        }
      }
    });
  }

  private updateStoppingPhase(progress: number, deltaTime: number): void {
    const stoppingStart = this.phaseTransitions.spinning;
    const stoppingProgress = (progress - stoppingStart) / (this.phaseTransitions.stopping - stoppingStart);
    
    // Stop reels one by one, winner reel last
    const reelStopOrder = Array.from({ length: this.reels.length }, (_, i) => i);
    
    // Move winner reel to the end for dramatic effect
    if (this.winnerReelIndex !== -1) {
      const winnerIndex = reelStopOrder.indexOf(this.winnerReelIndex);
      if (winnerIndex !== -1) {
        reelStopOrder.splice(winnerIndex, 1);
        reelStopOrder.push(this.winnerReelIndex);
      }
    }

    reelStopOrder.forEach((reelIndex, orderIndex) => {
      const reel = this.reels[reelIndex];
      const stopThreshold = (orderIndex + 1) / reelStopOrder.length;
      
      if (stoppingProgress >= stopThreshold && reel.isSpinning) {
        reel.isSpinning = false;
        reel.stopTime = progress;
        
        // Trigger flash effect when reel stops
        this.triggerFlash(0.3, 200);
        
        // Generate sparks
        this.generateSparks(reelIndex);
      }
      
      // Animate to target position with easing
      if (!reel.isSpinning && reel.stopTime > 0) {
        const stopElapsed = progress - reel.stopTime;
        const stopDuration = 0.1; // Time to settle into position
        const stopProgress = Math.min(stopElapsed / stopDuration, 1);
        
        const easedProgress = EasingFunctions.easeOutBounce(stopProgress);
        reel.currentOffset = reel.currentOffset + 
          (reel.targetOffset - reel.currentOffset) * easedProgress;
      }
    });
  }

  private updateRevealPhase(progress: number): void {
    // Ensure all reels are stopped and in final position
    this.reels.forEach(reel => {
      reel.isSpinning = false;
      reel.currentOffset = reel.targetOffset;
    });
  }

  private drawBackground(canvasWidth: number, canvasHeight: number): void {
    // Draw background image if provided
    if (this.config?.backgroundImage) {
      const bgImage = this.imageCache.get(this.config.backgroundImage);
      if (bgImage) {
        this.renderer.drawImage(bgImage, 0, 0, canvasWidth, canvasHeight);
      }
    }
    
    // Add casino-style gradient
    const gradient = this.renderer.createRadialGradient(
      canvasWidth / 2, canvasHeight / 2, 0,
      canvasWidth / 2, canvasHeight / 2, Math.max(canvasWidth, canvasHeight) / 2
    );
    gradient.addColorStop(0, 'rgba(20, 20, 40, 0.3)');
    gradient.addColorStop(1, 'rgba(10, 10, 20, 0.7)');
    
    this.renderer.context.fillStyle = gradient;
    this.renderer.context.fillRect(0, 0, canvasWidth, canvasHeight);
  }

  private drawMachineFrame(): void {
    const totalWidth = this.reels.length * this.reelWidth + (this.reels.length - 1) * this.reelSpacing;
    const frameMargin = 30;
    
    // Draw machine body
    this.renderer.drawRect(
      this.machineStartX - frameMargin,
      this.machineStartY - frameMargin,
      totalWidth + frameMargin * 2,
      this.reelHeight + frameMargin * 2,
      {
        fill: '#1a1a1a',
        stroke: {
          color: '#444',
          width: 4
        },
        cornerRadius: 15,
        shadow: {
          color: '#000',
          blur: 20,
          offsetX: 0,
          offsetY: 10
        }
      }
    );

    // Draw individual reel frames
    this.reels.forEach((reel, index) => {
      const reelX = this.machineStartX + index * (this.reelWidth + this.reelSpacing);
      
      this.renderer.drawRect(
        reelX - 5,
        this.machineStartY - 5,
        this.reelWidth + 10,
        this.reelHeight + 10,
        {
          fill: '#000',
          stroke: {
            color: '#666',
            width: 2
          },
          cornerRadius: 8
        }
      );
    });
  }

  private drawReels(): void {
    this.reels.forEach((reel, reelIndex) => {
      const reelX = this.machineStartX + reelIndex * (this.reelWidth + this.reelSpacing);
      
      // Set clipping region for reel
      this.renderer.save();
      this.renderer.context.beginPath();
      this.renderer.context.rect(reelX, this.machineStartY, this.reelWidth, this.reelHeight);
      this.renderer.context.clip();

      // Draw reel items
      this.drawReelItems(reel, reelX, reelIndex);
      
      this.renderer.restore();
    });
  }

  private drawReelItems(reel: Reel, reelX: number, reelIndex: number): void {
    const startY = this.machineStartY - reel.currentOffset;
    
    reel.items.forEach((item, itemIndex) => {
      const itemY = startY + itemIndex * this.itemHeight;
      
      // Only draw visible items
      if (itemY + this.itemHeight < this.machineStartY || 
          itemY > this.machineStartY + this.reelHeight) {
        return;
      }

      // Determine if this is the winning item
      const isWinningItem = reelIndex === this.winnerReelIndex && 
                           itemIndex === this.winnerItemIndex &&
                           this.animationPhase === 'reveal';

      this.drawReelItem(item, reelX, itemY, isWinningItem);
    });
  }

  private drawReelItem(item: ReelItem, x: number, y: number, isWinning: boolean): void {
    // Draw item background
    const rarityLevel = this.config!.config.rarityColors[item.rarity];
    const rarityColor = rarityLevel ? rarityLevel.color : '#4a4a4a';
    
    let backgroundColor = '#2a2a2a';
    let borderColor = '#444';
    
    if (isWinning) {
      backgroundColor = '#4a4a2a';
      borderColor = '#ffd700';
    }

    this.renderer.drawRect(x + 2, y + 2, this.reelWidth - 4, this.itemHeight - 4, {
      fill: backgroundColor,
      stroke: {
        color: borderColor,
        width: isWinning ? 3 : 1
      },
      cornerRadius: 4
    });

    // Draw rarity overlay
    if (rarityLevel) {
      this.renderer.drawRect(x + 2, y + 2, this.reelWidth - 4, this.itemHeight - 4, {
        fill: `${rarityColor}20`,
        cornerRadius: 4
      });
    }

    // Draw participant image
    const image = this.imageCache.get(item.participant.profileImageUrl);
    if (image) {
      const imageSize = Math.min(this.itemHeight - 10, 40);
      this.renderer.drawImage(
        image,
        x + 8,
        y + (this.itemHeight - imageSize) / 2,
        imageSize,
        imageSize
      );
    }

    // Draw participant name
    this.renderer.drawText(
      item.participant.username,
      x + 55,
      y + this.itemHeight / 2,
      {
        color: isWinning ? '#ffd700' : '#fff',
        fontSize: 11,
        fontWeight: isWinning ? 'bold' : 'normal',
        align: 'left',
        baseline: 'middle',
        maxWidth: this.reelWidth - 60,
        shadow: isWinning ? {
          color: '#000',
          blur: 2,
          offsetX: 1,
          offsetY: 1
        } : undefined
      }
    );

    // Draw winning glow
    if (isWinning) {
      this.renderer.save();
      this.renderer.setAlpha(0.6 + 0.4 * Math.sin(Date.now() * 0.01));
      
      this.renderer.drawRect(x, y, this.reelWidth, this.itemHeight, {
        stroke: {
          color: '#ffd700',
          width: 4
        },
        cornerRadius: 6,
        shadow: {
          color: '#ffd700',
          blur: 15,
          offsetX: 0,
          offsetY: 0
        }
      });
      
      this.renderer.restore();
    }
  }

  private updateEffects(deltaTime: number): void {
    // Update sparks
    this.sparks = this.sparks.filter(spark => {
      spark.x += spark.vx * deltaTime;
      spark.y += spark.vy * deltaTime;
      spark.vy += 0.0005 * deltaTime; // Gravity
      spark.life -= deltaTime;
      
      return spark.life > 0;
    });

    // Update flash effect
    if (this.flashEffect.duration > 0) {
      this.flashEffect.elapsed += deltaTime;
      
      if (this.flashEffect.elapsed >= this.flashEffect.duration) {
        this.flashEffect.intensity = 0;
        this.flashEffect.duration = 0;
        this.flashEffect.elapsed = 0;
      } else {
        const progress = this.flashEffect.elapsed / this.flashEffect.duration;
        this.flashEffect.intensity *= (1 - progress);
      }
    }
  }

  private generateSparks(reelIndex: number): void {
    const reelX = this.machineStartX + reelIndex * (this.reelWidth + this.reelSpacing);
    const sparkCount = 8;
    
    for (let i = 0; i < sparkCount; i++) {
      const angle = (Math.PI * 2 * i) / sparkCount + Math.random() * 0.5;
      const speed = 0.1 + Math.random() * 0.15;
      
      this.sparks.push({
        x: reelX + this.reelWidth / 2,
        y: this.machineStartY + this.reelHeight / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 800 + Math.random() * 400,
        maxLife: 1200,
        color: '#ffd700',
        size: 2 + Math.random() * 3
      });
    }
  }

  private drawEffects(): void {
    // Draw sparks
    this.sparks.forEach(spark => {
      const alpha = spark.life / spark.maxLife;
      
      this.renderer.save();
      this.renderer.setAlpha(alpha);
      
      this.renderer.drawCircle(spark.x, spark.y, spark.size, {
        fill: spark.color,
        shadow: {
          color: spark.color,
          blur: 4,
          offsetX: 0,
          offsetY: 0
        }
      });
      
      this.renderer.restore();
    });
  }

  private drawFlashEffect(): void {
    if (!this.canvas) return;
    
    const canvasWidth = this.canvas.width / this.renderer.pixelRatio;
    const canvasHeight = this.canvas.height / this.renderer.pixelRatio;
    
    this.renderer.save();
    this.renderer.setAlpha(this.flashEffect.intensity);
    
    this.renderer.drawRect(0, 0, canvasWidth, canvasHeight, {
      fill: '#ffffff'
    });
    
    this.renderer.restore();
  }

  private triggerFlash(intensity: number, duration: number): void {
    this.flashEffect.intensity = intensity;
    this.flashEffect.duration = duration;
    this.flashEffect.elapsed = 0;
  }

  private drawWinnerReveal(progress: number): void {
    if (!this.canvas || this.winnerReelIndex === -1) return;
    
    const canvasWidth = this.canvas.width / this.renderer.pixelRatio;
    const canvasHeight = this.canvas.height / this.renderer.pixelRatio;
    
    const revealStart = this.phaseTransitions.stopping;
    const revealProgress = (progress - revealStart) / (1 - revealStart);
    
    if (revealProgress < 0.3) return;
    
    const textProgress = (revealProgress - 0.3) / 0.7;
    const textScale = EasingFunctions.easeOutBack(textProgress);
    
    const winnerItem = this.reels[this.winnerReelIndex].items[this.winnerItemIndex];
    
    this.renderer.save();
    this.renderer.translate(canvasWidth / 2, canvasHeight - 80);
    this.renderer.scale(textScale, textScale);
    
    this.renderer.drawText(
      'JACKPOT!',
      0,
      -30,
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
      winnerItem.participant.username,
      0,
      10,
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