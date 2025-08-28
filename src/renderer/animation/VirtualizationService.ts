import { Participant } from '../../types';
import { ParticipantDisplayItem } from '../../types/animation';

export interface VirtualizationConfig {
  viewportWidth: number;
  viewportHeight: number;
  itemWidth: number;
  itemHeight: number;
  bufferSize: number; // Number of items to render outside viewport
  maxVisibleItems: number; // Maximum items to render at once
}

export interface VirtualizedViewport {
  startIndex: number;
  endIndex: number;
  visibleItems: ParticipantDisplayItem[];
  totalItems: number;
  scrollOffset: number;
}

export class VirtualizationService {
  private config: VirtualizationConfig;
  private participants: Participant[] = [];
  private displayItems: ParticipantDisplayItem[] = [];
  private viewport: VirtualizedViewport;

  constructor(config: VirtualizationConfig) {
    this.config = config;
    this.viewport = {
      startIndex: 0,
      endIndex: 0,
      visibleItems: [],
      totalItems: 0,
      scrollOffset: 0
    };
  }

  /**
   * Initialize virtualization with participants
   */
  initialize(participants: Participant[]): void {
    this.participants = participants;
    this.displayItems = this.createDisplayItems(participants);
    this.viewport.totalItems = participants.length;
    this.updateViewport(0);
  }

  /**
   * Update viewport based on scroll position
   */
  updateViewport(scrollOffset: number): VirtualizedViewport {
    this.viewport.scrollOffset = scrollOffset;

    // Calculate which items should be visible
    const { startIndex, endIndex } = this.calculateVisibleRange(scrollOffset);
    
    this.viewport.startIndex = startIndex;
    this.viewport.endIndex = endIndex;
    
    // Get visible items with buffer
    this.viewport.visibleItems = this.getVisibleItems(startIndex, endIndex);

    return { ...this.viewport };
  }

  /**
   * Get viewport for horizontal scrolling (CS2 style)
   */
  getHorizontalViewport(scrollX: number): VirtualizedViewport {
    const itemsPerRow = Math.floor(this.config.viewportWidth / this.config.itemWidth);
    const startIndex = Math.max(0, Math.floor(scrollX / this.config.itemWidth) - this.config.bufferSize);
    const endIndex = Math.min(
      this.participants.length - 1,
      startIndex + itemsPerRow + (this.config.bufferSize * 2)
    );

    const maxItems = Math.min(endIndex - startIndex + 1, this.config.maxVisibleItems);
    const visibleItems = this.displayItems.slice(startIndex, startIndex + maxItems).map((item, index) => ({
      ...item,
      position: {
        x: (startIndex + index) * this.config.itemWidth - scrollX,
        y: item.position.y
      }
    }));

    return {
      startIndex,
      endIndex,
      visibleItems,
      totalItems: this.participants.length,
      scrollOffset: scrollX
    };
  }

  /**
   * Get viewport for circular arrangement (wheel style)
   */
  getCircularViewport(rotation: number, radius: number): VirtualizedViewport {
    const centerX = this.config.viewportWidth / 2;
    const centerY = this.config.viewportHeight / 2;
    
    // Calculate which items are visible based on angle
    const anglePerItem = (2 * Math.PI) / this.participants.length;
    const visibleAngleRange = Math.PI; // Show items within 180 degrees
    
    const visibleItems: ParticipantDisplayItem[] = [];
    
    for (let i = 0; i < this.participants.length; i++) {
      const itemAngle = (i * anglePerItem + rotation) % (2 * Math.PI);
      
      // Check if item is within visible range
      const normalizedAngle = itemAngle < Math.PI ? itemAngle : itemAngle - 2 * Math.PI;
      if (Math.abs(normalizedAngle) <= visibleAngleRange / 2) {
        const x = centerX + Math.cos(itemAngle) * radius;
        const y = centerY + Math.sin(itemAngle) * radius;
        
        if (visibleItems.length < this.config.maxVisibleItems) {
          visibleItems.push({
            ...this.displayItems[i],
            position: { x, y },
            rotation: itemAngle + Math.PI / 2 // Face outward
          });
        }
      }
    }

    return {
      startIndex: 0,
      endIndex: visibleItems.length - 1,
      visibleItems,
      totalItems: this.participants.length,
      scrollOffset: rotation
    };
  }

  /**
   * Get viewport for grid arrangement (card flip, slot machine)
   */
  getGridViewport(offsetX: number, offsetY: number, columns: number): VirtualizedViewport {
    const rows = Math.ceil(this.participants.length / columns);
    const visibleRows = Math.ceil(this.config.viewportHeight / this.config.itemHeight) + this.config.bufferSize * 2;
    
    const startRow = Math.max(0, Math.floor(offsetY / this.config.itemHeight) - this.config.bufferSize);
    const endRow = Math.min(rows - 1, startRow + visibleRows);
    
    const startIndex = startRow * columns;
    const endIndex = Math.min(this.participants.length - 1, (endRow + 1) * columns - 1);
    
    const visibleItems: ParticipantDisplayItem[] = [];
    
    for (let i = startIndex; i <= endIndex; i++) {
      if (i >= this.participants.length) break;
      
      const row = Math.floor(i / columns);
      const col = i % columns;
      
      const x = col * this.config.itemWidth - offsetX;
      const y = row * this.config.itemHeight - offsetY;
      
      if (visibleItems.length < this.config.maxVisibleItems) {
        visibleItems.push({
          ...this.displayItems[i],
          position: { x, y }
        });
      }
    }

    return {
      startIndex,
      endIndex,
      visibleItems,
      totalItems: this.participants.length,
      scrollOffset: offsetY
    };
  }

  /**
   * Optimize for large datasets by reducing quality
   */
  optimizeForLargeDataset(): void {
    if (this.participants.length > 1000) {
      // Reduce buffer size for very large datasets
      this.config.bufferSize = Math.max(5, Math.floor(this.config.bufferSize / 2));
      this.config.maxVisibleItems = Math.min(100, this.config.maxVisibleItems);
    }

    if (this.participants.length > 5000) {
      // Further optimization for extremely large datasets
      this.config.bufferSize = 3;
      this.config.maxVisibleItems = 50;
    }
  }

  /**
   * Get memory usage statistics
   */
  getMemoryStats(): {
    totalParticipants: number;
    visibleItems: number;
    memoryUsage: number; // Estimated in MB
  } {
    const estimatedItemSize = 1024; // Rough estimate per display item in bytes
    const memoryUsage = (this.viewport.visibleItems.length * estimatedItemSize) / (1024 * 1024);
    
    return {
      totalParticipants: this.participants.length,
      visibleItems: this.viewport.visibleItems.length,
      memoryUsage
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<VirtualizationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Calculate visible range based on scroll position
   */
  private calculateVisibleRange(scrollOffset: number): { startIndex: number; endIndex: number } {
    const itemsPerScreen = Math.ceil(this.config.viewportHeight / this.config.itemHeight);
    const startIndex = Math.max(0, Math.floor(scrollOffset / this.config.itemHeight) - this.config.bufferSize);
    const endIndex = Math.min(
      this.participants.length - 1,
      startIndex + itemsPerScreen + (this.config.bufferSize * 2)
    );

    return { startIndex, endIndex };
  }

  /**
   * Get visible items within range
   */
  private getVisibleItems(startIndex: number, endIndex: number): ParticipantDisplayItem[] {
    const visibleItems: ParticipantDisplayItem[] = [];
    const maxItems = Math.min(endIndex - startIndex + 1, this.config.maxVisibleItems);
    
    for (let i = startIndex; i < startIndex + maxItems && i < this.displayItems.length; i++) {
      const item = this.displayItems[i];
      const y = i * this.config.itemHeight - this.viewport.scrollOffset;
      
      visibleItems.push({
        ...item,
        position: {
          x: item.position.x,
          y
        }
      });
    }

    return visibleItems;
  }

  /**
   * Create display items from participants
   */
  private createDisplayItems(participants: Participant[]): ParticipantDisplayItem[] {
    return participants.map((participant, index) => ({
      participant,
      rarity: 'Consumer Grade', // Will be assigned by rarity system
      position: {
        x: 0,
        y: index * this.config.itemHeight
      },
      size: {
        width: this.config.itemWidth,
        height: this.config.itemHeight
      },
      scale: 1,
      alpha: 1
    }));
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.participants = [];
    this.displayItems = [];
    this.viewport = {
      startIndex: 0,
      endIndex: 0,
      visibleItems: [],
      totalItems: 0,
      scrollOffset: 0
    };
  }
}