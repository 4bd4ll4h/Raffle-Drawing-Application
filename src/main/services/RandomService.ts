import { Participant, RandomSelectionResult, APIError, CS2_RARITY_LEVELS, RarityLevel } from "../../types";
import { randomBytes } from "crypto";
import axios, { AxiosResponse } from "axios";

/**
 * RandomService handles winner selection using Random.org API with cryptographic fallback
 * Implements requirements 3.1, 3.2, 3.3, 3.4, 3.6
 */
export class RandomService {
  private readonly RANDOM_ORG_API_URL =
    "https://api.random.org/json-rpc/4/invoke";
  private readonly API_KEY: string | undefined;
  private readonly TIMEOUT_MS = 10000; // 10 seconds
  private readonly MAX_RETRIES = 3;

  constructor(apiKey?: string) {
    this.API_KEY = apiKey || process.env.RANDOM_ORG_API_KEY;
  }

  /**
   * Select a winner from participants using Random.org API with fallback
   * Requirement 3.1: Use Random.org API for winner selection with proper authentication
   * Requirement 3.2: Use cryptographically secure fallback when API unavailable
   * Requirement 3.3: Store Random.org verification data
   */
  async selectWinner(
    participants: Participant[]
  ): Promise<RandomSelectionResult> {
    if (!participants || participants.length === 0) {
      throw new Error("No participants provided for winner selection");
    }

    if (participants.length === 1) {
      return {
        winner: participants[0],
        fallbackUsed: false,
        timestamp: new Date(),
        method: "single_participant",
      } as RandomSelectionResult;
    }

    // Try Random.org API first if API key is available
    if (this.API_KEY) {
      try {
        const result = await this.selectWinnerWithRandomOrg(participants);
        return result;
      } catch (error) {
        console.warn(
          "Random.org API failed, falling back to crypto randomization:",
          error
        );
        // Continue to fallback method
      }
    } else {
      console.info("No Random.org API key provided, using crypto fallback");
    }

    // Use cryptographic fallback
    return this.selectWinnerWithCryptoFallback(participants);
  }

  /**
   * Select winner using Random.org API
   * Requirement 3.1: Random.org API integration with authentication
   * Requirement 3.3: Store verification data including timestamp and signature
   */
  private async selectWinnerWithRandomOrg(
    participants: Participant[]
  ): Promise<RandomSelectionResult> {
    const requestData = {
      jsonrpc: "2.0",
      method: "generateSignedIntegers",
      params: {
        apiKey: this.API_KEY,
        n: 1, // Generate 1 random number
        min: 0,
        max: participants.length - 1,
        replacement: true,
        base: 10,
        userData: {
          timestamp: new Date().toISOString(),
          participantCount: participants.length,
          method: "raffle_winner_selection",
        },
      },
      id: Date.now(),
    };

    let lastError: any;

    // Retry logic for API failures
    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        const response: AxiosResponse = await axios.post(
          this.RANDOM_ORG_API_URL,
          requestData,
          {
            timeout: this.TIMEOUT_MS,
            headers: {
              "Content-Type": "application/json",
              "User-Agent": "RaffleDrawingApp/1.0",
            },
          }
        );

        if (response.data.error) {
          throw this.createAPIError(response.data.error, "api_error");
        }

        const result = response.data.result;
        if (
          !result ||
          !result.random ||
          !result.random.data ||
          result.random.data.length === 0
        ) {
          throw this.createAPIError(
            "Invalid response format from Random.org",
            "invalid_response"
          );
        }

        const winnerIndex = result.random.data[0];
        const winner = participants[winnerIndex];

        if (!winner) {
          throw new Error(
            `Invalid winner index ${winnerIndex} for ${participants.length} participants`
          );
        }

        // Create verification data string
        const verificationData = JSON.stringify({
          signature: result.signature,
          serialNumber: result.random.serialNumber,
          timestamp: result.random.completionTime,
          userData: result.random.userData,
          winnerIndex,
          participantCount: participants.length,
          apiVersion: "4.0",
        });

        return {
          winner,
          verificationData,
          fallbackUsed: false,
          timestamp: new Date(result.random.completionTime),
          method: "random_org",
        };
      } catch (error) {
        lastError = error;
        console.warn(
          `Random.org API attempt ${attempt}/${this.MAX_RETRIES} failed:`,
          error
        );

        if (attempt < this.MAX_RETRIES) {
          // Wait before retry (exponential backoff)
          await this.delay(Math.pow(2, attempt) * 1000);
        }
      }
    }

    // All retries failed, throw the last error
    throw this.createAPIError(lastError, "service_unavailable");
  }

  /**
   * Select winner using cryptographically secure fallback
   * Requirement 3.2: Cryptographically secure fallback using crypto.randomBytes()
   */
  private selectWinnerWithCryptoFallback(
    participants: Participant[]
  ): RandomSelectionResult {
    try {
      // Generate cryptographically secure random bytes
      const randomBuffer = randomBytes(4); // 4 bytes = 32 bits
      const randomValue = randomBuffer.readUInt32BE(0);

      // Convert to index within participants range
      const winnerIndex = randomValue % participants.length;
      const winner = participants[winnerIndex];

      // Create verification data for fallback method
      const verificationData = JSON.stringify({
        method: "crypto_fallback",
        timestamp: new Date().toISOString(),
        randomBytes: randomBuffer.toString("hex"),
        winnerIndex,
        participantCount: participants.length,
        algorithm: "crypto.randomBytes",
      });

      return {
        winner,
        verificationData,
        fallbackUsed: true,
        timestamp: new Date(),
        method: "crypto_fallback",
      };
    } catch (error) {
      throw new Error(`Crypto fallback failed: ${(error as any).message}`);
    }
  }

  /**
   * Verify Random.org signature (for future use)
   * Requirement 3.3: Verification data storage and retrieval
   */
  async verifyRandomOrgSignature(verificationData: string): Promise<boolean> {
    try {
      const data = JSON.parse(verificationData);

      if (data.method !== "random_org" || !data.signature) {
        return false; // Not a Random.org result or no signature
      }

      // For now, just validate the structure
      // In a full implementation, you would verify the signature against Random.org's public key
      return !!(data.signature && data.serialNumber && data.timestamp);
    } catch (error) {
      console.error("Error verifying Random.org signature:", error);
      return false;
    }
  }

  /**
   * Get API quota information (if available)
   * Requirement 3.6: API quota management
   */
  async getAPIQuota(): Promise<{
    bitsLeft: number;
    requestsLeft: number;
  } | null> {
    if (!this.API_KEY) {
      return null;
    }

    try {
      const requestData = {
        jsonrpc: "2.0",
        method: "getUsage",
        params: {
          apiKey: this.API_KEY,
        },
        id: Date.now(),
      };

      const response: AxiosResponse = await axios.post(
        this.RANDOM_ORG_API_URL,
        requestData,
        {
          timeout: this.TIMEOUT_MS,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.error) {
        throw this.createAPIError(response.data.error, "api_error");
      }

      return {
        bitsLeft: response.data.result.bitsLeft || 0,
        requestsLeft: response.data.result.requestsLeft || 0,
      };
    } catch (error) {
      console.warn("Failed to get API quota:", error);
      return null;
    }
  }

  /**
   * Test API connectivity
   */
  async testConnection(): Promise<boolean> {
    if (!this.API_KEY) {
      return false;
    }

    try {
      const quota = await this.getAPIQuota();
      return quota !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Create standardized API error
   */
  private createAPIError(error: any, type: APIError["type"]): APIError {
    let message = "Unknown API error";
    let statusCode: number | undefined;
    let retryAfter: number | undefined;

    if (typeof error === "string") {
      message = error;
    } else if (error?.message) {
      message = error.message;
    } else if (error?.error?.message) {
      message = error.error.message;
    }

    if (error?.response?.status) {
      statusCode = error.response.status;
    }

    if (error?.code) {
      switch (error.code) {
        case "ECONNABORTED":
        case "ETIMEDOUT":
          type = "network";
          message = "Request timeout";
          break;
        case "ENOTFOUND":
        case "ECONNREFUSED":
          type = "service_unavailable";
          message = "Service unavailable";
          break;
      }
    }

    // Handle Random.org specific errors
    if (error?.error?.code) {
      switch (error.error.code) {
        case 402:
          type = "quota_exceeded";
          message = "API quota exceeded";
          break;
        case 401:
          type = "authentication";
          message = "Invalid API key";
          break;
        case 503:
          type = "service_unavailable";
          message = "Random.org service temporarily unavailable";
          retryAfter = 60; // Retry after 60 seconds
          break;
      }
    }

    const apiError: APIError = {
      type,
      message,
      fallbackUsed: true,
      endpoint: this.RANDOM_ORG_API_URL,
    };

    if (statusCode !== undefined) {
      apiError.statusCode = statusCode;
    }

    if (retryAfter !== undefined) {
      apiError.retryAfter = retryAfter;
    }

    return apiError;
  }

  /**
   * Utility method for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Set API key (for runtime configuration)
   */
  setAPIKey(apiKey: string): void {
    (this as any).API_KEY = apiKey;
  }

  /**
   * Check if API key is configured
   */
  hasAPIKey(): boolean {
    return !!this.API_KEY;
  }

  // ============================================================================
  // RARITY ASSIGNMENT METHODS
  // ============================================================================

  /**
   * Assigns a random rarity level based on CS2 drop rates
   * Requirement 5.1: Assign rarity colors based on official drop percentages
   * Requirement 5.2: Randomly assign each ticket a rarity tier using specified probability distribution
   */
  assignRandomRarity(): string {
    // Generate cryptographically secure random number
    const randomBuffer = randomBytes(4);
    const randomValue = randomBuffer.readUInt32BE(0);
    const random = randomValue / 0xFFFFFFFF; // Convert to 0-1 range

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
   * Requirement 5.3: Ensure random assignment follows exact drop rates for each tier
   * Requirement 5.4: Apply color overlays with proper opacity and visual effects
   */
  assignRaritiesToParticipants(participants: Participant[]): Array<Participant & { rarity: string }> {
    return participants.map(participant => ({
      ...participant,
      rarity: this.assignRandomRarity()
    }));
  }

  /**
   * Gets rarity information by key
   * Requirement 5.6: Ensure visual consistency across all animation styles
   */
  getRarityInfo(rarityKey: string): RarityLevel | null {
    return CS2_RARITY_LEVELS[rarityKey] || null;
  }

  /**
   * Gets rarity color by key
   * Requirement 5.4: Apply color overlays with proper opacity and visual effects
   */
  getRarityColor(rarityKey: string): string {
    const rarity = this.getRarityInfo(rarityKey);
    return rarity ? rarity.color : '#FFFFFF'; // Default to white if not found
  }

  /**
   * Gets rarity name by key
   */
  getRarityName(rarityKey: string): string {
    const rarity = this.getRarityInfo(rarityKey);
    return rarity ? rarity.name : 'Unknown';
  }

  /**
   * Validates rarity distribution percentages (should sum to ~1.0)
   * Requirement 5.3: Ensure random assignment follows exact drop rates
   */
  validateRarityDistribution(): boolean {
    const totalChance = Object.values(CS2_RARITY_LEVELS).reduce((sum, rarity) => sum + rarity.chance, 0);
    // Allow for small floating point errors
    return Math.abs(totalChance - 1.0) < 0.0001;
  }

  /**
   * Gets all available rarity keys
   */
  getAllRarityKeys(): string[] {
    return Object.keys(CS2_RARITY_LEVELS);
  }

  /**
   * Gets all rarity levels sorted by chance (rarest first)
   */
  getRaritiesByRarity(): Array<{ key: string; rarity: RarityLevel }> {
    return Object.entries(CS2_RARITY_LEVELS)
      .map(([key, rarity]) => ({ key, rarity }))
      .sort((a, b) => a.rarity.chance - b.rarity.chance);
  }

  /**
   * Gets rarity statistics for a group of participants
   * Used for testing and validation of rarity distribution
   */
  getRarityStatistics(participants: Array<Participant & { rarity: string }>): Record<string, {
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
   * Creates a CSS gradient string for rarity colors
   * Requirement 5.4: Apply color overlays with proper opacity and visual effects
   */
  createRarityGradient(rarityKey: string, direction: string = 'to right'): string {
    const color = this.getRarityColor(rarityKey);
    const rgb = this.hexToRgb(color);
    
    if (!rgb) return `linear-gradient(${direction}, ${color}, ${color})`;
    
    // Create a subtle gradient with the rarity color
    const lighterColor = this.rgbToHex(
      Math.min(255, rgb.r + 30),
      Math.min(255, rgb.g + 30),
      Math.min(255, rgb.b + 30)
    );
    
    return `linear-gradient(${direction}, ${color}, ${lighterColor})`;
  }

  /**
   * Gets appropriate text color (black or white) for a rarity background
   * Requirement 5.4: Apply color overlays with proper opacity and visual effects
   */
  getContrastTextColor(rarityKey: string): string {
    const color = this.getRarityColor(rarityKey);
    const rgb = this.hexToRgb(color);
    
    if (!rgb) return '#000000';
    
    // Calculate luminance
    const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
    
    // Return black for light backgrounds, white for dark backgrounds
    return luminance > 0.5 ? '#000000' : '#FFFFFF';
  }

  /**
   * Gets animation duration based on rarity (rarer items get longer animations)
   * Requirement 5.6: Ensure visual consistency across all animation styles
   */
  getRarityAnimationDuration(rarityKey: string): number {
    const rarity = this.getRarityInfo(rarityKey);
    if (!rarity) return 1000; // Default 1 second
    
    // Rarer items get longer animations (inverse of chance)
    const baseDuration = 1000; // 1 second base
    const rarityMultiplier = 1 / rarity.chance;
    
    // Cap the maximum duration at 5 seconds
    return Math.min(baseDuration * Math.log(rarityMultiplier), 5000);
  }

  // ============================================================================
  // UTILITY METHODS FOR RARITY SYSTEM
  // ============================================================================

  /**
   * Converts hex color to RGB values
   */
  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
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
  private rgbToHex(r: number, g: number, b: number): string {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }
}
