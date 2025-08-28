// Image loading and caching service for animation engine

import {
  ImageCache,
  ImageLoadOptions,
  ImageLoadResult,
  ANIMATION_CONSTANTS
} from '../../types/animation';

export class ImageCacheService implements ImageCache {
  private cache = new Map<string, HTMLImageElement>();
  private loadingPromises = new Map<string, Promise<HTMLImageElement>>();
  private memoryUsage = 0; // in bytes
  private maxCacheSize = ANIMATION_CONSTANTS.IMAGE_CACHE_MAX_SIZE;

  // ============================================================================
  // CACHE OPERATIONS
  // ============================================================================

  get(url: string): HTMLImageElement | null {
    return this.cache.get(url) || null;
  }

  set(url: string, image: HTMLImageElement): void {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxCacheSize) {
      this.evictOldest();
    }

    this.cache.set(url, image);
    this.updateMemoryUsage(image, 'add');
  }

  clear(): void {
    this.cache.clear();
    this.loadingPromises.clear();
    this.memoryUsage = 0;
  }

  getSize(): number {
    return this.cache.size;
  }

  getMemoryUsage(): number {
    return this.memoryUsage;
  }

  // ============================================================================
  // IMAGE LOADING
  // ============================================================================

  async preload(urls: string[], options?: ImageLoadOptions): Promise<void> {
    const loadPromises = urls.map(url => this.loadImage(url, options));
    
    try {
      await Promise.allSettled(loadPromises);
    } catch (error) {
      console.warn('Some images failed to preload:', error);
      // Don't throw - allow animation to continue with missing images
    }
  }

  async loadImage(url: string, options?: ImageLoadOptions): Promise<ImageLoadResult> {
    const startTime = performance.now();
    
    // Check cache first
    const cachedImage = this.cache.get(url);
    if (cachedImage) {
      return {
        image: cachedImage,
        originalUrl: url,
        loadTime: 0,
        cached: true,
        dimensions: {
          width: cachedImage.naturalWidth,
          height: cachedImage.naturalHeight
        }
      };
    }

    // Check if already loading
    const existingPromise = this.loadingPromises.get(url);
    if (existingPromise) {
      const image = await existingPromise;
      const loadTime = performance.now() - startTime;
      return {
        image,
        originalUrl: url,
        loadTime,
        cached: false,
        dimensions: {
          width: image.naturalWidth,
          height: image.naturalHeight
        }
      };
    }

    // Start new load
    const loadPromise = this.createImageLoadPromise(url, options);
    this.loadingPromises.set(url, loadPromise);

    try {
      const image = await loadPromise;
      const loadTime = performance.now() - startTime;
      
      // Cache the loaded image
      this.set(url, image);
      
      // Clean up loading promise
      this.loadingPromises.delete(url);

      return {
        image,
        originalUrl: url,
        loadTime,
        cached: false,
        dimensions: {
          width: image.naturalWidth,
          height: image.naturalHeight
        }
      };
    } catch (error) {
      this.loadingPromises.delete(url);
      throw error;
    }
  }

  private createImageLoadPromise(url: string, options?: ImageLoadOptions): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      const timeout = options?.timeout || 10000; // 10 second default timeout
      
      let timeoutId: NodeJS.Timeout | null = null;
      let resolved = false;

      const cleanup = () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        image.onload = null;
        image.onerror = null;
      };

      const handleLoad = () => {
        if (resolved) return;
        resolved = true;
        cleanup();

        // Apply size constraints if specified
        if (options?.maxWidth || options?.maxHeight) {
          const resizedImage = this.resizeImage(image, options);
          resolve(resizedImage);
        } else {
          resolve(image);
        }
      };

      const handleError = (error: Event | string) => {
        if (resolved) return;
        resolved = true;
        cleanup();
        
        const errorMessage = typeof error === 'string' ? error : 'Failed to load image';
        reject(new Error(`Failed to load image from ${url}: ${errorMessage}`));
      };

      // Set up timeout
      if (timeout > 0) {
        timeoutId = setTimeout(() => {
          handleError('Timeout');
        }, timeout);
      }

      // Set up event handlers
      image.onload = handleLoad;
      image.onerror = (event) => handleError(event);

      // Configure image loading
      if (options?.crossOrigin) {
        image.crossOrigin = options.crossOrigin;
      }

      // Start loading
      image.src = url;
    });
  }

  // ============================================================================
  // IMAGE PROCESSING
  // ============================================================================

  private resizeImage(image: HTMLImageElement, options: ImageLoadOptions): HTMLImageElement {
    const { maxWidth, maxHeight } = options;
    const { naturalWidth, naturalHeight } = image;

    // Calculate new dimensions
    let newWidth = naturalWidth;
    let newHeight = naturalHeight;

    if (maxWidth && newWidth > maxWidth) {
      const ratio = maxWidth / newWidth;
      newWidth = maxWidth;
      newHeight = newHeight * ratio;
    }

    if (maxHeight && newHeight > maxHeight) {
      const ratio = maxHeight / newHeight;
      newHeight = maxHeight;
      newWidth = newWidth * ratio;
    }

    // If no resizing needed, return original
    if (newWidth === naturalWidth && newHeight === naturalHeight) {
      return image;
    }

    // Create canvas for resizing
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.warn('Failed to get canvas context for image resizing');
      return image;
    }

    canvas.width = newWidth;
    canvas.height = newHeight;

    // Draw resized image
    ctx.drawImage(image, 0, 0, newWidth, newHeight);

    // Create new image from canvas
    const resizedImage = new Image();
    resizedImage.src = canvas.toDataURL('image/png', options.quality || 0.9);
    
    return resizedImage;
  }

  // ============================================================================
  // CACHE MANAGEMENT
  // ============================================================================

  private evictOldest(): void {
    // Simple LRU eviction - remove first entry
    const firstKey = this.cache.keys().next().value;
    if (firstKey) {
      const image = this.cache.get(firstKey);
      if (image) {
        this.updateMemoryUsage(image, 'remove');
      }
      this.cache.delete(firstKey);
    }
  }

  private updateMemoryUsage(image: HTMLImageElement, operation: 'add' | 'remove'): void {
    // Estimate memory usage based on image dimensions
    const bytes = image.naturalWidth * image.naturalHeight * 4; // RGBA
    
    if (operation === 'add') {
      this.memoryUsage += bytes;
    } else {
      this.memoryUsage = Math.max(0, this.memoryUsage - bytes);
    }
  }

  cleanup(): void {
    // Remove half of the cache entries to free memory
    const entriesToRemove = Math.floor(this.cache.size / 2);
    const keys = Array.from(this.cache.keys());
    
    for (let i = 0; i < entriesToRemove; i++) {
      const key = keys[i];
      const image = this.cache.get(key);
      if (image) {
        this.updateMemoryUsage(image, 'remove');
      }
      this.cache.delete(key);
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  async loadImageWithFallback(urls: string[], options?: ImageLoadOptions): Promise<ImageLoadResult> {
    let lastError: Error | null = null;

    for (const url of urls) {
      try {
        return await this.loadImage(url, options);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`Failed to load image from ${url}:`, error);
      }
    }

    throw lastError || new Error('All image URLs failed to load');
  }

  getLoadingStats(): {
    cacheSize: number;
    memoryUsage: number;
    activeLoads: number;
  } {
    return {
      cacheSize: this.cache.size,
      memoryUsage: this.memoryUsage,
      activeLoads: this.loadingPromises.size
    };
  }

  // Create a placeholder image for failed loads
  createPlaceholderImage(width: number = 100, height: number = 100): HTMLImageElement {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Failed to create placeholder image');
    }

    canvas.width = width;
    canvas.height = height;

    // Draw a simple placeholder
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, width, height);
    
    ctx.fillStyle = '#ccc';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('No Image', width / 2, height / 2);

    const image = new Image();
    image.src = canvas.toDataURL();
    
    return image;
  }
}