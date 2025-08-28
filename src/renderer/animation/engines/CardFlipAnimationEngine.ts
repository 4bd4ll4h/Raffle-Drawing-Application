// Card Flip Reveal animation engine implementation

import { BaseAnimationEngine } from '../BaseAnimationEngine';
import { ParticipantDisplayItem, EasingFunctions } from '../../../types/animation';
import { Participant } from '../../../types';
import { assignRandomRarity } from '../../../types/rarity';

interface CardItem extends ParticipantDisplayItem {
  flipProgress: number;
  isFlipped: boolean;
  flipStartTime: number;
  isWinner: boolean;
  glowIntensity: number;
}

export class CardFlipAnimationEngine extends BaseAnimationEngine {
  private cards: CardItem[] = [];
  private cardWidth: number = 140;
  private cardHeight: number = 180;
  private cardsPerRow: number = 0;
  private rows: number = 0;
  private gridStartX: number = 0;
  private gridStartY: number = 0;
  private flipSequence: number[] = []; // Order in which cards flip
  private currentFlipIndex: number = 0;
  private winnerCardIndex: number = -1;
  
  // Animation phases
  private animationPhase: 'setup' | 'flipping' | 'reveal' | 'celebration' = 'setup';
  private phaseTransitions = {
    setup: 0.1,        // First 10% - cards appear
    flipping: 0.8,     // 10-80% - sequential card flipping
    reveal: 0.95,      // 80-95% - winner reveal
    celebration: 1.0   // 95-100% - celebration effects
  };

  // Visual effects
  private confetti: Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
    color: string;
    size: number;
    rotation: number;
    rotationSpeed: number;
  }> = [];

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  protected async initializeAnimation(): Promise<void> {
    if (!this.config || !this.canvas) {
      throw new Error('Animation not properly initialized');
    }

    // Calculate grid layout
    this.calculateGridLayout();

    // Create card items
    this.createCards();

    // Generate flip sequence
    this.generateFlipSequence();

    // Find winner card
    this.findWinnerCard();
  }

  private calculateGridLayout(): void {
    if (!this.canvas) return;

    const canvasWidth = this.canvas.width / this.renderer.pixelRatio;
    const canvasHeight = this.canvas.height / this.renderer.pixelRatio;
    const participantCount = this.config!.participants.length;

    // Calculate optimal grid layout
    const cardSpacing = 20;
    const availableWidth = canvasWidth - 100; // Leave margins
    const availableHeight = canvasHeight - 150; // Leave space for title and winner text

    // Try different row configurations to find the best fit
    let bestLayout = { rows: 1, cols: participantCount };
    let bestWaste = Infinity;

    for (let rows = 1; rows <= Math.ceil(Math.sqrt(participantCount)); rows++) {
      const cols = Math.ceil(participantCount / rows);
      const totalWidth = cols * this.cardWidth + (cols - 1) * cardSpacing;
      const totalHeight = rows * this.cardHeight + (rows - 1) * cardSpacing;

      if (totalWidth <= availableWidth && totalHeight <= availableHeight) {
        const waste = (availableWidth - totalWidth) + (availableHeight - totalHeight);
        if (waste < bestWaste) {
          bestWaste = waste;
          bestLayout = { rows, cols };
        }
      }
    }

    this.rows = bestLayout.rows;
    this.cardsPerRow = bestLayout.cols;

    // Calculate starting position to center the grid
    const totalWidth = this.cardsPerRow * this.cardWidth + (this.cardsPerRow - 1) * cardSpacing;
    const totalHeight = this.rows * this.cardHeight + (this.rows - 1) * cardSpacing;
    
    this.gridStartX = (canvasWidth - totalWidth) / 2;
    this.gridStartY = (canvasHeight - totalHeight) / 2;
  }

  private createCards(): void {
    if (!this.config) return;

    const cardSpacing = 20;
    
    this.cards = this.config.participants.map((participant, index) => {
      const row = Math.floor(index / this.cardsPerRow);
      const col = index % this.cardsPerRow;
      
      const x = this.gridStartX + col * (this.cardWidth + cardSpacing);
      const y = this.gridStartY + row * (this.cardHeight + cardSpacing);
      
      const rarity = assignRandomRarity();
      const isWinner = participant.id === this.config!.winner.id;

      return {
        participant,
        rarity,
        position: { x, y },
        size: { width: this.cardWidth, height: this.cardHeight },
        scale: 0, // Start invisible, will animate in
        alpha: 1,
        rotation: 0,
        flipProgress: 0,
        isFlipped: false,
        flipStartTime: 0,
        isWinner,
        glowIntensity: 0
      };
    });
  }

  private generateFlipSequence(): void {
    const cardCount = this.cards.length;
    
    // Create array of indices
    this.flipSequence = Array.from({ length: cardCount }, (_, i) => i);
    
    // Shuffle the sequence for random flipping order
    for (let i = this.flipSequence.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.flipSequence[i], this.flipSequence[j]] = [this.flipSequence[j], this.flipSequence[i]];
    }

    // Ensure winner card is flipped last for dramatic effect
    const winnerIndex = this.cards.findIndex(card => card.isWinner);
    if (winnerIndex !== -1) {
      const winnerInSequence = this.flipSequence.indexOf(winnerIndex);
      if (winnerInSequence !== -1) {
        // Move winner to the end
        this.flipSequence.splice(winnerInSequence, 1);
        this.flipSequence.push(winnerIndex);
      }
    }
  }

  private findWinnerCard(): void {
    this.winnerCardIndex = this.cards.findIndex(card => card.isWinner);
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

    // Update cards based on current phase
    this.updateCards(progress, deltaTime);

    // Update and draw confetti
    this.updateConfetti(deltaTime);
    this.drawConfetti();

    // Draw cards
    this.drawCards();

    // Draw title
    this.drawTitle(progress);

    // Draw winner announcement
    if (this.animationPhase === 'celebration') {
      this.drawWinnerAnnouncement(progress);
    }
  }

  private updateAnimationPhase(progress: number): void {
    if (progress <= this.phaseTransitions.setup) {
      this.animationPhase = 'setup';
    } else if (progress <= this.phaseTransitions.flipping) {
      this.animationPhase = 'flipping';
    } else if (progress <= this.phaseTransitions.reveal) {
      this.animationPhase = 'reveal';
    } else {
      this.animationPhase = 'celebration';
    }
  }

  private updateCards(progress: number, deltaTime: number): void {
    switch (this.animationPhase) {
      case 'setup':
        this.updateSetupPhase(progress);
        break;
      case 'flipping':
        this.updateFlippingPhase(progress);
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
    const easedProgress = EasingFunctions.easeOutBack(setupProgress);
    
    // Animate cards appearing with staggered timing
    this.cards.forEach((card, index) => {
      const delay = (index / this.cards.length) * 0.5;
      const cardProgress = Math.max(0, (setupProgress - delay) / (1 - delay));
      card.scale = EasingFunctions.easeOutBack(cardProgress);
    });
  }

  private updateFlippingPhase(progress: number): void {
    const flippingStart = this.phaseTransitions.setup;
    const flippingProgress = (progress - flippingStart) / (this.phaseTransitions.flipping - flippingStart);
    
    // Calculate how many cards should be flipping
    const totalFlipTime = this.phaseTransitions.flipping - this.phaseTransitions.setup;
    const cardsToFlip = Math.floor(flippingProgress * this.flipSequence.length);
    
    // Start flipping cards in sequence
    for (let i = 0; i < Math.min(cardsToFlip + 1, this.flipSequence.length); i++) {
      const cardIndex = this.flipSequence[i];
      const card = this.cards[cardIndex];
      
      if (!card.isFlipped && card.flipStartTime === 0) {
        card.flipStartTime = progress;
      }
      
      if (card.flipStartTime > 0) {
        const flipDuration = 0.1; // Each flip takes 10% of total time
        const flipElapsed = progress - card.flipStartTime;
        const flipProgress = Math.min(flipElapsed / flipDuration, 1);
        
        card.flipProgress = EasingFunctions.easeInOutCubic(flipProgress);
        
        if (flipProgress >= 1) {
          card.isFlipped = true;
        }
      }
    }
  }

  private updateRevealPhase(progress: number): void {
    const revealStart = this.phaseTransitions.flipping;
    const revealProgress = (progress - revealStart) / (this.phaseTransitions.reveal - revealStart);
    
    // Ensure all cards are flipped
    this.cards.forEach(card => {
      if (!card.isFlipped) {
        card.flipProgress = 1;
        card.isFlipped = true;
      }
    });

    // Highlight winner card
    if (this.winnerCardIndex !== -1) {
      const winnerCard = this.cards[this.winnerCardIndex];
      winnerCard.glowIntensity = revealProgress;
    }
  }

  private updateCelebrationPhase(progress: number, deltaTime: number): void {
    const celebrationStart = this.phaseTransitions.reveal;
    const celebrationProgress = (progress - celebrationStart) / (1 - celebrationStart);
    
    // Animate winner card
    if (this.winnerCardIndex !== -1) {
      const winnerCard = this.cards[this.winnerCardIndex];
      winnerCard.glowIntensity = 0.8 + 0.2 * Math.sin(Date.now() * 0.01);
      
      // Slight pulsing scale effect
      const pulseScale = 1 + 0.05 * Math.sin(Date.now() * 0.008);
      winnerCard.scale = pulseScale;
    }

    // Generate confetti
    if (this.confetti.length < 50 && celebrationProgress > 0.2) {
      this.generateConfetti();
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
    
    // Add subtle gradient overlay
    const gradient = this.renderer.createLinearGradient(0, 0, 0, canvasHeight);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0.2)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
    
    this.renderer.context.fillStyle = gradient;
    this.renderer.context.fillRect(0, 0, canvasWidth, canvasHeight);
  }

  private drawCards(): void {
    this.cards.forEach((card, index) => {
      if (card.scale <= 0) return; // Don't draw invisible cards
      
      this.renderer.save();
      
      // Apply card transformations
      this.renderer.translate(
        card.position.x + this.cardWidth / 2,
        card.position.y + this.cardHeight / 2
      );
      this.renderer.scale(card.scale, card.scale);
      this.renderer.rotate(card.rotation);

      // Draw card with flip effect
      this.drawFlippingCard(card);
      
      this.renderer.restore();
    });
  }

  private drawFlippingCard(card: CardItem): void {
    const halfWidth = this.cardWidth / 2;
    const halfHeight = this.cardHeight / 2;
    
    // Calculate flip transformation
    const flipAngle = card.flipProgress * Math.PI;
    const scaleX = Math.cos(flipAngle);
    const showBack = Math.abs(scaleX) < 0.1; // Show back when nearly edge-on
    
    this.renderer.save();
    this.renderer.scale(Math.abs(scaleX), 1);

    if (showBack || !card.isFlipped) {
      // Draw card back
      this.drawCardBack(halfWidth, halfHeight, card);
    } else {
      // Draw card front with participant
      this.drawCardFront(halfWidth, halfHeight, card);
    }

    this.renderer.restore();

    // Draw glow effect for winner
    if (card.isWinner && card.glowIntensity > 0) {
      this.drawWinnerGlow(halfWidth, halfHeight, card.glowIntensity);
    }
  }

  private drawCardBack(halfWidth: number, halfHeight: number, card: CardItem): void {
    // Draw card background
    this.renderer.drawRect(-halfWidth, -halfHeight, this.cardWidth, this.cardHeight, {
      fill: '#2a2a2a',
      stroke: {
        color: '#444',
        width: 2
      },
      cornerRadius: 12
    });

    // Draw card back pattern
    const patternSize = 20;
    this.renderer.context.strokeStyle = '#444';
    this.renderer.context.lineWidth = 1;
    
    for (let x = -halfWidth + patternSize; x < halfWidth; x += patternSize) {
      for (let y = -halfHeight + patternSize; y < halfHeight; y += patternSize) {
        this.renderer.context.strokeRect(x - patternSize/2, y - patternSize/2, patternSize, patternSize);
      }
    }

    // Draw question mark
    this.renderer.drawText(
      '?',
      0,
      0,
      {
        color: '#666',
        fontSize: 48,
        fontWeight: 'bold',
        align: 'center',
        baseline: 'middle'
      }
    );
  }

  private drawCardFront(halfWidth: number, halfHeight: number, card: CardItem): void {
    // Draw card background with rarity color
    const rarityLevel = this.config!.config.rarityColors[card.rarity];
    const rarityColor = rarityLevel ? rarityLevel.color : '#4a4a4a';
    
    // Create gradient background
    const gradient = this.renderer.createLinearGradient(0, -halfHeight, 0, halfHeight);
    gradient.addColorStop(0, this.lightenColor(rarityColor, 30));
    gradient.addColorStop(1, rarityColor);
    
    this.renderer.context.fillStyle = gradient;
    this.renderer.drawRect(-halfWidth, -halfHeight, this.cardWidth, this.cardHeight, {
      fill: gradient as any,
      stroke: {
        color: rarityColor,
        width: 3
      },
      cornerRadius: 12
    });

    // Draw participant image
    const image = this.imageCache.get(card.participant.profileImageUrl);
    if (image) {
      const imageSize = Math.min(this.cardWidth - 20, 80);
      this.renderer.drawImage(
        image,
        -imageSize / 2,
        -halfHeight + 20,
        imageSize,
        imageSize
      );
    }

    // Draw participant name
    this.renderer.drawText(
      card.participant.username,
      0,
      halfHeight - 40,
      {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
        align: 'center',
        maxWidth: this.cardWidth - 10,
        shadow: {
          color: '#000',
          blur: 2,
          offsetX: 1,
          offsetY: 1
        }
      }
    );

    // Draw rarity indicator
    this.renderer.drawText(
      rarityLevel?.name || 'Common',
      0,
      halfHeight - 20,
      {
        color: '#fff',
        fontSize: 10,
        align: 'center',
        maxWidth: this.cardWidth - 10,
        shadow: {
          color: '#000',
          blur: 1,
          offsetX: 1,
          offsetY: 1
        }
      }
    );
  }

  private drawWinnerGlow(halfWidth: number, halfHeight: number, intensity: number): void {
    this.renderer.save();
    this.renderer.setAlpha(intensity);
    
    // Draw multiple glow layers
    for (let i = 0; i < 3; i++) {
      const glowSize = 10 + i * 8;
      this.renderer.drawRect(
        -halfWidth - glowSize,
        -halfHeight - glowSize,
        this.cardWidth + glowSize * 2,
        this.cardHeight + glowSize * 2,
        {
          stroke: {
            color: '#ffd700',
            width: 2
          },
          cornerRadius: 12 + glowSize,
          shadow: {
            color: '#ffd700',
            blur: glowSize,
            offsetX: 0,
            offsetY: 0
          }
        }
      );
    }
    
    this.renderer.restore();
  }

  private drawTitle(progress: number): void {
    if (!this.canvas) return;
    
    const canvasWidth = this.canvas.width / this.renderer.pixelRatio;
    const titleY = 50;
    
    let title = 'Card Flip Reveal';
    let titleColor = '#fff';
    
    if (this.animationPhase === 'celebration') {
      title = 'Winner Found!';
      titleColor = '#ffd700';
    }
    
    const titleAlpha = Math.min(progress * 2, 1);
    
    this.renderer.save();
    this.renderer.setAlpha(titleAlpha);
    
    this.renderer.drawText(
      title,
      canvasWidth / 2,
      titleY,
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

  private drawWinnerAnnouncement(progress: number): void {
    if (!this.canvas || this.winnerCardIndex === -1) return;
    
    const canvasWidth = this.canvas.width / this.renderer.pixelRatio;
    const canvasHeight = this.canvas.height / this.renderer.pixelRatio;
    
    const celebrationStart = this.phaseTransitions.reveal;
    const celebrationProgress = (progress - celebrationStart) / (1 - celebrationStart);
    
    if (celebrationProgress < 0.3) return;
    
    const textProgress = (celebrationProgress - 0.3) / 0.7;
    const textScale = EasingFunctions.easeOutBack(textProgress);
    const winnerCard = this.cards[this.winnerCardIndex];
    
    this.renderer.save();
    this.renderer.translate(canvasWidth / 2, canvasHeight - 80);
    this.renderer.scale(textScale, textScale);
    
    this.renderer.drawText(
      winnerCard.participant.username,
      0,
      0,
      {
        color: '#ffd700',
        fontSize: 36,
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

  private updateConfetti(deltaTime: number): void {
    // Update existing confetti
    this.confetti = this.confetti.filter(piece => {
      piece.x += piece.vx * deltaTime;
      piece.y += piece.vy * deltaTime;
      piece.vy += 0.0003 * deltaTime; // Gravity
      piece.rotation += piece.rotationSpeed * deltaTime;
      piece.life -= deltaTime;
      
      return piece.life > 0;
    });
  }

  private generateConfetti(): void {
    if (!this.canvas) return;
    
    const canvasWidth = this.canvas.width / this.renderer.pixelRatio;
    const colors = ['#ffd700', '#ff6b35', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57'];
    
    for (let i = 0; i < 5; i++) {
      this.confetti.push({
        x: Math.random() * canvasWidth,
        y: -20,
        vx: (Math.random() - 0.5) * 0.2,
        vy: Math.random() * 0.1 + 0.05,
        life: 3000 + Math.random() * 2000,
        maxLife: 5000,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 4 + Math.random() * 6,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.01
      });
    }
  }

  private drawConfetti(): void {
    this.confetti.forEach(piece => {
      const alpha = piece.life / piece.maxLife;
      
      this.renderer.save();
      this.renderer.setAlpha(alpha);
      this.renderer.translate(piece.x, piece.y);
      this.renderer.rotate(piece.rotation);
      
      this.renderer.drawRect(
        -piece.size / 2,
        -piece.size / 2,
        piece.size,
        piece.size,
        {
          fill: piece.color
        }
      );
      
      this.renderer.restore();
    });
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