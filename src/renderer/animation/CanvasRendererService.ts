// Canvas rendering service with hardware acceleration and optimization

import {
  CanvasRenderer,
  TextOptions,
  RectOptions,
  CircleOptions,
  CANVAS_SETTINGS
} from '../../types/animation';
import { RarityColorMap } from '../../types';

export class CanvasRendererService implements CanvasRenderer {
  public canvas!: HTMLCanvasElement;
  public context!: CanvasRenderingContext2D;
  public width: number = 0;
  public height: number = 0;
  public pixelRatio: number = 1;

  private transformStack: Array<{
    transform: DOMMatrix;
    alpha: number;
  }> = [];

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  initialize(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.setupCanvas();
    this.enableHardwareAcceleration();
    this.optimizeForAnimation();
  }

  private setupCanvas(): void {
    const context = this.canvas.getContext('2d', CANVAS_SETTINGS);
    if (!context) {
      throw new Error('Failed to get 2D rendering context');
    }
    
    this.context = context as CanvasRenderingContext2D;
    this.pixelRatio = window.devicePixelRatio || 1;
    
    // Set initial size
    this.resize(this.canvas.clientWidth, this.canvas.clientHeight);
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;

    // Set actual canvas size in memory (scaled for pixel ratio)
    this.canvas.width = width * this.pixelRatio;
    this.canvas.height = height * this.pixelRatio;

    // Scale the canvas back down using CSS
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';

    // Scale the drawing context so everything draws at the correct size
    this.context.scale(this.pixelRatio, this.pixelRatio);
  }

  clear(): void {
    this.context.clearRect(0, 0, this.width, this.height);
  }

  // ============================================================================
  // HARDWARE ACCELERATION AND OPTIMIZATION
  // ============================================================================

  enableHardwareAcceleration(): void {
    // Enable hardware acceleration hints
    this.context.imageSmoothingEnabled = true;
    this.context.imageSmoothingQuality = 'high';
    
    // Set composite operation for better performance
    this.context.globalCompositeOperation = 'source-over';
  }

  optimizeForAnimation(): void {
    // Disable text rendering optimizations that can cause flickering
    // Note: textRenderingOptimization is not standard, skip for now
    // this.context.textRenderingOptimization = 'speed';
    
    // Set line cap and join for better performance
    this.context.lineCap = 'round';
    this.context.lineJoin = 'round';
    
    // Enable path caching
    this.context.miterLimit = 10;
  }

  // ============================================================================
  // DRAWING METHODS
  // ============================================================================

  drawImage(
    image: HTMLImageElement,
    x: number,
    y: number,
    width?: number,
    height?: number
  ): void {
    if (!image.complete || image.naturalWidth === 0) {
      // Draw placeholder if image not loaded
      this.drawImagePlaceholder(x, y, width || 100, height || 100);
      return;
    }

    try {
      if (width !== undefined && height !== undefined) {
        this.context.drawImage(image, x, y, width, height);
      } else {
        this.context.drawImage(image, x, y);
      }
    } catch (error) {
      console.warn('Failed to draw image:', error);
      this.drawImagePlaceholder(x, y, width || image.naturalWidth, height || image.naturalHeight);
    }
  }

  private drawImagePlaceholder(x: number, y: number, width: number, height: number): void {
    this.context.save();
    
    // Draw placeholder background
    this.context.fillStyle = '#f0f0f0';
    this.context.fillRect(x, y, width, height);
    
    // Draw border
    this.context.strokeStyle = '#ccc';
    this.context.lineWidth = 1;
    this.context.strokeRect(x, y, width, height);
    
    // Draw "No Image" text
    this.context.fillStyle = '#999';
    this.context.font = '12px Arial';
    this.context.textAlign = 'center';
    this.context.textBaseline = 'middle';
    this.context.fillText('No Image', x + width / 2, y + height / 2);
    
    this.context.restore();
  }

  drawText(text: string, x: number, y: number, options: TextOptions = {}): void {
    this.context.save();

    // Set font properties
    const fontSize = options.fontSize || 16;
    const fontWeight = options.fontWeight || 'normal';
    const fontFamily = options.font || 'Arial, sans-serif';
    this.context.font = `${fontWeight} ${fontSize}px ${fontFamily}`;

    // Set text alignment
    this.context.textAlign = options.align || 'left';
    this.context.textBaseline = options.baseline || 'top';

    // Set shadow if specified
    if (options.shadow) {
      this.context.shadowColor = options.shadow.color;
      this.context.shadowBlur = options.shadow.blur;
      this.context.shadowOffsetX = options.shadow.offsetX;
      this.context.shadowOffsetY = options.shadow.offsetY;
    }

    // Draw stroke if specified
    if (options.stroke) {
      this.context.strokeStyle = options.stroke.color;
      this.context.lineWidth = options.stroke.width;
      this.context.strokeText(text, x, y, options.maxWidth);
    }

    // Draw fill
    this.context.fillStyle = options.color || '#000';
    this.context.fillText(text, x, y, options.maxWidth);

    this.context.restore();
  }

  drawRect(x: number, y: number, width: number, height: number, options: RectOptions = {}): void {
    this.context.save();

    // Set shadow if specified
    if (options.shadow) {
      this.context.shadowColor = options.shadow.color;
      this.context.shadowBlur = options.shadow.blur;
      this.context.shadowOffsetX = options.shadow.offsetX;
      this.context.shadowOffsetY = options.shadow.offsetY;
    }

    // Draw with corner radius if specified
    if (options.cornerRadius && options.cornerRadius > 0) {
      this.drawRoundedRect(x, y, width, height, options.cornerRadius);
    } else {
      // Draw fill
      if (options.fill) {
        this.context.fillStyle = options.fill;
        this.context.fillRect(x, y, width, height);
      }

      // Draw stroke
      if (options.stroke) {
        this.context.strokeStyle = options.stroke.color;
        this.context.lineWidth = options.stroke.width;
        this.context.strokeRect(x, y, width, height);
      }
    }

    this.context.restore();
  }

  private drawRoundedRect(x: number, y: number, width: number, height: number, radius: number): void {
    this.context.beginPath();
    this.context.moveTo(x + radius, y);
    this.context.lineTo(x + width - radius, y);
    this.context.quadraticCurveTo(x + width, y, x + width, y + radius);
    this.context.lineTo(x + width, y + height - radius);
    this.context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    this.context.lineTo(x + radius, y + height);
    this.context.quadraticCurveTo(x, y + height, x, y + height - radius);
    this.context.lineTo(x, y + radius);
    this.context.quadraticCurveTo(x, y, x + radius, y);
    this.context.closePath();

    if (this.context.fillStyle) {
      this.context.fill();
    }
    if (this.context.strokeStyle) {
      this.context.stroke();
    }
  }

  drawCircle(x: number, y: number, radius: number, options: CircleOptions = {}): void {
    this.context.save();

    // Set shadow if specified
    if (options.shadow) {
      this.context.shadowColor = options.shadow.color;
      this.context.shadowBlur = options.shadow.blur;
      this.context.shadowOffsetX = options.shadow.offsetX;
      this.context.shadowOffsetY = options.shadow.offsetY;
    }

    this.context.beginPath();
    this.context.arc(x, y, radius, 0, 2 * Math.PI);

    // Draw fill
    if (options.fill) {
      this.context.fillStyle = options.fill;
      this.context.fill();
    }

    // Draw stroke
    if (options.stroke) {
      this.context.strokeStyle = options.stroke.color;
      this.context.lineWidth = options.stroke.width;
      this.context.stroke();
    }

    this.context.restore();
  }

  drawRarityOverlay(
    x: number,
    y: number,
    width: number,
    height: number,
    rarity: string,
    colors: RarityColorMap
  ): void {
    const rarityLevel = colors[rarity];
    if (!rarityLevel) return;

    this.context.save();

    // Create gradient overlay
    const gradient = this.context.createLinearGradient(x, y, x, y + height);
    gradient.addColorStop(0, `${rarityLevel.color}00`); // Transparent at top
    gradient.addColorStop(0.7, `${rarityLevel.color}40`); // Semi-transparent
    gradient.addColorStop(1, `${rarityLevel.color}80`); // More opaque at bottom

    // Draw overlay
    this.context.fillStyle = gradient;
    this.context.fillRect(x, y, width, height);

    // Draw border
    this.context.strokeStyle = rarityLevel.color;
    this.context.lineWidth = 2;
    this.context.strokeRect(x, y, width, height);

    // Add glow effect
    this.context.shadowColor = rarityLevel.color;
    this.context.shadowBlur = 10;
    this.context.strokeRect(x, y, width, height);

    this.context.restore();
  }

  // ============================================================================
  // TRANSFORM METHODS
  // ============================================================================

  save(): void {
    this.context.save();
    
    // Save our custom state
    this.transformStack.push({
      transform: this.context.getTransform(),
      alpha: this.context.globalAlpha
    });
  }

  restore(): void {
    this.context.restore();
    
    // Restore our custom state
    if (this.transformStack.length > 0) {
      this.transformStack.pop();
    }
  }

  translate(x: number, y: number): void {
    this.context.translate(x, y);
  }

  rotate(angle: number): void {
    this.context.rotate(angle);
  }

  scale(x: number, y: number): void {
    this.context.scale(x, y);
  }

  setAlpha(alpha: number): void {
    this.context.globalAlpha = Math.max(0, Math.min(1, alpha));
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  measureText(text: string, font?: string): TextMetrics {
    if (font) {
      this.context.save();
      this.context.font = font;
    }
    
    const metrics = this.context.measureText(text);
    
    if (font) {
      this.context.restore();
    }
    
    return metrics;
  }

  createPattern(image: HTMLImageElement, repetition: string = 'repeat'): CanvasPattern | null {
    return this.context.createPattern(image, repetition);
  }

  createLinearGradient(x0: number, y0: number, x1: number, y1: number): CanvasGradient {
    return this.context.createLinearGradient(x0, y0, x1, y1);
  }

  createRadialGradient(
    x0: number,
    y0: number,
    r0: number,
    x1: number,
    y1: number,
    r1: number
  ): CanvasGradient {
    return this.context.createRadialGradient(x0, y0, r0, x1, y1, r1);
  }

  // Performance optimization: batch similar drawing operations
  drawImages(images: Array<{
    image: HTMLImageElement;
    x: number;
    y: number;
    width?: number;
    height?: number;
  }>): void {
    // Group images by size to minimize context state changes
    const sizedGroups = new Map<string, typeof images>();
    
    images.forEach(item => {
      const key = `${item.width || 'auto'}-${item.height || 'auto'}`;
      if (!sizedGroups.has(key)) {
        sizedGroups.set(key, []);
      }
      sizedGroups.get(key)!.push(item);
    });

    // Draw each group
    sizedGroups.forEach(group => {
      group.forEach(item => {
        this.drawImage(item.image, item.x, item.y, item.width, item.height);
      });
    });
  }

  // Get canvas as data URL for recording
  toDataURL(type?: string, quality?: number): string {
    return this.canvas.toDataURL(type, quality);
  }

  // Get canvas as blob for recording
  toBlob(callback: BlobCallback, type?: string, quality?: number): void {
    this.canvas.toBlob(callback, type, quality);
  }
}