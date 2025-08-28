// Rarity system utilities for CS2-style color assignment
import { RarityLevel, RarityColorMap, CS2_RARITY_LEVELS, Participant } from './index';

// ============================================================================
// RARITY ASSIGNMENT FUNCTIONS
// ============================================================================

/**
 * Assigns a random rarity level based on CS2 drop rates
 */
export function assignRandomRarity(): string {
  const random = Math.random();
  let cumulativeChance = 0;

  // Sort rarity levels by chance (highest to lowest) for proper distribution
  const sortedRarities = Object.entries(CS2_RARITY_LEVELS)
    .sort(([, a], [, b]) => b.chance - a.chance);

  for (const [rarityKey, rarity] of sortedRarities) {
    cumulativeChance += rarity.chance;
    if (random <= cumulativeChance) {
      return rarityKey;
    }
  }

  // Fallback to most common rarity if something goes wrong
  return 'consumer';
}

/**
 * Assigns rarity levels to all participants
 */
export function assignRaritiesToParticipants(participants: Participant[]): Array<Participant & { rarity: string }> {
  return participants.map(participant => ({
    ...participant,
    rarity: assignRandomRarity()
  }));
}

/**
 * Gets rarity information by key
 */
export function getRarityInfo(rarityKey: string): RarityLevel | null {
  return CS2_RARITY_LEVELS[rarityKey] || null;
}

/**
 * Gets rarity color by key
 */
export function getRarityColor(rarityKey: string): string {
  const rarity = getRarityInfo(rarityKey);
  return rarity ? rarity.color : '#FFFFFF'; // Default to white if not found
}

/**
 * Gets rarity name by key
 */
export function getRarityName(rarityKey: string): string {
  const rarity = getRarityInfo(rarityKey);
  return rarity ? rarity.name : 'Unknown';
}

/**
 * Validates rarity distribution percentages (should sum to ~1.0)
 */
export function validateRarityDistribution(rarityMap: RarityColorMap): boolean {
  const totalChance = Object.values(rarityMap).reduce((sum, rarity) => sum + rarity.chance, 0);
  // Allow for small floating point errors
  return Math.abs(totalChance - 1.0) < 0.0001;
}

/**
 * Gets all available rarity keys
 */
export function getAllRarityKeys(): string[] {
  return Object.keys(CS2_RARITY_LEVELS);
}

/**
 * Gets all rarity levels sorted by chance (rarest first)
 */
export function getRaritiesByRarity(): Array<{ key: string; rarity: RarityLevel }> {
  return Object.entries(CS2_RARITY_LEVELS)
    .map(([key, rarity]) => ({ key, rarity }))
    .sort((a, b) => a.rarity.chance - b.rarity.chance);
}

/**
 * Gets rarity statistics for a group of participants
 */
export function getRarityStatistics(participants: Array<Participant & { rarity: string }>): Record<string, {
  count: number;
  percentage: number;
  expectedPercentage: number;
  rarity: RarityLevel;
}> {
  const total = participants.length;
  const rarityCounts: Record<string, number> = {};

  // Count occurrences of each rarity
  participants.forEach(participant => {
    rarityCounts[participant.rarity] = (rarityCounts[participant.rarity] || 0) + 1;
  });

  // Build statistics object
  const statistics: Record<string, any> = {};
  
  Object.entries(CS2_RARITY_LEVELS).forEach(([key, rarity]) => {
    const count = rarityCounts[key] || 0;
    statistics[key] = {
      count,
      percentage: total > 0 ? (count / total) * 100 : 0,
      expectedPercentage: rarity.chance * 100,
      rarity
    };
  });

  return statistics;
}

/**
 * Creates a custom rarity map (for future extensibility)
 */
export function createCustomRarityMap(rarities: Array<{
  key: string;
  name: string;
  color: string;
  chance: number;
}>): RarityColorMap {
  const rarityMap: RarityColorMap = {};
  
  rarities.forEach(({ key, name, color, chance }) => {
    rarityMap[key] = { name, color, chance };
  });

  // Validate that chances sum to 1.0
  if (!validateRarityDistribution(rarityMap)) {
    throw new Error('Rarity chances must sum to 1.0');
  }

  return rarityMap;
}

/**
 * Converts hex color to RGB values
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

/**
 * Converts RGB to hex color
 */
export function rgbToHex(r: number, g: number, b: number): string {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

/**
 * Creates a CSS gradient string for rarity colors
 */
export function createRarityGradient(rarityKey: string, direction: string = 'to right'): string {
  const color = getRarityColor(rarityKey);
  const rgb = hexToRgb(color);
  
  if (!rgb) return `linear-gradient(${direction}, ${color}, ${color})`;
  
  // Create a subtle gradient with the rarity color
  const lighterColor = rgbToHex(
    Math.min(255, rgb.r + 30),
    Math.min(255, rgb.g + 30),
    Math.min(255, rgb.b + 30)
  );
  
  return `linear-gradient(${direction}, ${color}, ${lighterColor})`;
}

/**
 * Gets appropriate text color (black or white) for a rarity background
 */
export function getContrastTextColor(rarityKey: string): string {
  const color = getRarityColor(rarityKey);
  const rgb = hexToRgb(color);
  
  if (!rgb) return '#000000';
  
  // Calculate luminance
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  
  // Return black for light backgrounds, white for dark backgrounds
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

// ============================================================================
// ANIMATION HELPERS
// ============================================================================

/**
 * Creates CSS animation keyframes for rarity reveal effect
 */
export function createRarityRevealKeyframes(rarityKey: string): string {
  const color = getRarityColor(rarityKey);
  const gradient = createRarityGradient(rarityKey);
  
  return `
    @keyframes rarityReveal-${rarityKey} {
      0% {
        background: transparent;
        box-shadow: none;
        transform: scale(1);
      }
      50% {
        background: ${gradient};
        box-shadow: 0 0 20px ${color};
        transform: scale(1.05);
      }
      100% {
        background: ${gradient};
        box-shadow: 0 0 10px ${color};
        transform: scale(1);
      }
    }
  `;
}

/**
 * Gets animation duration based on rarity (rarer items get longer animations)
 */
export function getRarityAnimationDuration(rarityKey: string): number {
  const rarity = getRarityInfo(rarityKey);
  if (!rarity) return 1000; // Default 1 second
  
  // Rarer items get longer animations (inverse of chance)
  const baseDuration = 1000; // 1 second base
  const rarityMultiplier = 1 / rarity.chance;
  
  // Cap the maximum duration at 5 seconds
  return Math.min(baseDuration * Math.log(rarityMultiplier), 5000);
}