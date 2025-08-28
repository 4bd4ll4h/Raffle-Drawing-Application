import { RandomService } from '../RandomService';
import { CS2_RARITY_LEVELS, Participant } from '../../../types';

describe('RandomService - Rarity System', () => {
  let randomService: RandomService;

  beforeEach(() => {
    randomService = new RandomService();
  });

  describe('Rarity Level Definitions', () => {
    test('should have all required rarity levels with correct colors', () => {
      const expectedRarities = {
        consumer: { name: 'Consumer Grade', color: '#B0C3D9', chance: 0.79695 },
        industrial: { name: 'Industrial Grade', color: '#5E98D9', chance: 0.1598 },
        milspec: { name: 'Mil-Spec', color: '#4B69FF', chance: 0.032 },
        restricted: { name: 'Restricted', color: '#8847FF', chance: 0.0064 },
        classified: { name: 'Classified', color: '#D32CE6', chance: 0.0026 },
        covert: { name: 'Covert', color: '#EB4B4B', chance: 0.002 },
        exceedinglyRare: { name: 'Exceedingly Rare', color: '#FFD700', chance: 0.00025 }
      };

      Object.entries(expectedRarities).forEach(([key, expected]) => {
        const rarity = CS2_RARITY_LEVELS[key];
        expect(rarity).toBeDefined();
        expect(rarity.name).toBe(expected.name);
        expect(rarity.color).toBe(expected.color);
        expect(rarity.chance).toBe(expected.chance);
      });
    });

    test('should have rarity chances that sum to approximately 1.0', () => {
      const totalChance = Object.values(CS2_RARITY_LEVELS).reduce((sum, rarity) => sum + rarity.chance, 0);
      expect(Math.abs(totalChance - 1.0)).toBeLessThan(0.0001);
    });

    test('validateRarityDistribution should return true for valid distribution', () => {
      expect(randomService.validateRarityDistribution()).toBe(true);
    });
  });

  describe('Random Rarity Assignment', () => {
    test('assignRandomRarity should return a valid rarity key', () => {
      const validKeys = Object.keys(CS2_RARITY_LEVELS);
      
      for (let i = 0; i < 100; i++) {
        const rarity = randomService.assignRandomRarity();
        expect(validKeys).toContain(rarity);
      }
    });

    test('assignRandomRarity should follow approximate distribution over large sample', () => {
      const sampleSize = 100000; // Large sample for statistical accuracy
      const rarityCounts: Record<string, number> = {};
      
      // Initialize counts
      Object.keys(CS2_RARITY_LEVELS).forEach(key => {
        rarityCounts[key] = 0;
      });

      // Generate large sample
      for (let i = 0; i < sampleSize; i++) {
        const rarity = randomService.assignRandomRarity();
        rarityCounts[rarity]++;
      }

      // Check that each rarity is within reasonable bounds of expected percentage
      Object.entries(CS2_RARITY_LEVELS).forEach(([key, expected]) => {
        const actualPercentage = (rarityCounts[key] / sampleSize) * 100;
        const expectedPercentage = expected.chance * 100;
        
        // Allow for statistical variance - more tolerance for very rare items
        let tolerance;
        if (expectedPercentage < 0.1) {
          tolerance = Math.max(expectedPercentage * 2, 0.05); // At least 0.05% tolerance for very rare
        } else if (expectedPercentage < 1) {
          tolerance = expectedPercentage * 0.8; // 80% tolerance for rare items
        } else {
          tolerance = expectedPercentage * 0.15; // 15% tolerance for common items
        }
        
        expect(actualPercentage).toBeGreaterThanOrEqual(Math.max(0, expectedPercentage - tolerance));
        expect(actualPercentage).toBeLessThanOrEqual(expectedPercentage + tolerance);
      });
    });

    test('should generate different rarities over multiple calls', () => {
      const rarities = new Set<string>();
      
      // Generate 1000 rarities - should get multiple different ones
      for (let i = 0; i < 1000; i++) {
        rarities.add(randomService.assignRandomRarity());
      }
      
      // Should have at least the common rarities
      expect(rarities.size).toBeGreaterThan(3);
      expect(rarities.has('consumer')).toBe(true);
      expect(rarities.has('industrial')).toBe(true);
    });
  });

  const mockParticipants: Participant[] = [
    {
      id: '1',
      raffleId: 'test-raffle',
      username: 'user1',
      profileImageUrl: 'https://example.com/user1.jpg',
      ticketNumber: 'T001',
      importDate: new Date()
    },
    {
      id: '2',
      raffleId: 'test-raffle',
      username: 'user2',
      profileImageUrl: 'https://example.com/user2.jpg',
      ticketNumber: 'T002',
      importDate: new Date()
    },
    {
      id: '3',
      raffleId: 'test-raffle',
      username: 'user3',
      profileImageUrl: 'https://example.com/user3.jpg',
      ticketNumber: 'T003',
      importDate: new Date()
    }
  ];

  describe('Participant Rarity Assignment', () => {

    test('assignRaritiesToParticipants should assign rarity to all participants', () => {
      const participantsWithRarity = randomService.assignRaritiesToParticipants(mockParticipants);
      
      expect(participantsWithRarity).toHaveLength(mockParticipants.length);
      
      participantsWithRarity.forEach((participant, index) => {
        // Should preserve all original participant data
        expect(participant.id).toBe(mockParticipants[index].id);
        expect(participant.username).toBe(mockParticipants[index].username);
        expect(participant.ticketNumber).toBe(mockParticipants[index].ticketNumber);
        
        // Should have rarity assigned
        expect(participant.rarity).toBeDefined();
        expect(Object.keys(CS2_RARITY_LEVELS)).toContain(participant.rarity);
      });
    });

    test('assignRaritiesToParticipants should handle empty array', () => {
      const result = randomService.assignRaritiesToParticipants([]);
      expect(result).toEqual([]);
    });
  });

  describe('Rarity Information Methods', () => {
    test('getRarityInfo should return correct rarity information', () => {
      const consumerInfo = randomService.getRarityInfo('consumer');
      expect(consumerInfo).toEqual({
        name: 'Consumer Grade',
        color: '#B0C3D9',
        chance: 0.79695
      });

      const exceedinglyRareInfo = randomService.getRarityInfo('exceedinglyRare');
      expect(exceedinglyRareInfo).toEqual({
        name: 'Exceedingly Rare',
        color: '#FFD700',
        chance: 0.00025
      });
    });

    test('getRarityInfo should return null for invalid rarity', () => {
      const invalidInfo = randomService.getRarityInfo('invalid');
      expect(invalidInfo).toBeNull();
    });

    test('getRarityColor should return correct colors', () => {
      expect(randomService.getRarityColor('consumer')).toBe('#B0C3D9');
      expect(randomService.getRarityColor('industrial')).toBe('#5E98D9');
      expect(randomService.getRarityColor('milspec')).toBe('#4B69FF');
      expect(randomService.getRarityColor('restricted')).toBe('#8847FF');
      expect(randomService.getRarityColor('classified')).toBe('#D32CE6');
      expect(randomService.getRarityColor('covert')).toBe('#EB4B4B');
      expect(randomService.getRarityColor('exceedinglyRare')).toBe('#FFD700');
    });

    test('getRarityColor should return white for invalid rarity', () => {
      expect(randomService.getRarityColor('invalid')).toBe('#FFFFFF');
    });

    test('getRarityName should return correct names', () => {
      expect(randomService.getRarityName('consumer')).toBe('Consumer Grade');
      expect(randomService.getRarityName('exceedinglyRare')).toBe('Exceedingly Rare');
      expect(randomService.getRarityName('invalid')).toBe('Unknown');
    });

    test('getAllRarityKeys should return all rarity keys', () => {
      const keys = randomService.getAllRarityKeys();
      const expectedKeys = ['consumer', 'industrial', 'milspec', 'restricted', 'classified', 'covert', 'exceedinglyRare'];
      
      expect(keys).toHaveLength(expectedKeys.length);
      expectedKeys.forEach(key => {
        expect(keys).toContain(key);
      });
    });

    test('getRaritiesByRarity should return rarities sorted by chance (rarest first)', () => {
      const sortedRarities = randomService.getRaritiesByRarity();
      
      expect(sortedRarities).toHaveLength(7);
      
      // Should be sorted by chance ascending (rarest first)
      for (let i = 1; i < sortedRarities.length; i++) {
        expect(sortedRarities[i].rarity.chance).toBeGreaterThanOrEqual(sortedRarities[i - 1].rarity.chance);
      }
      
      // First should be exceedingly rare, last should be consumer
      expect(sortedRarities[0].key).toBe('exceedinglyRare');
      expect(sortedRarities[sortedRarities.length - 1].key).toBe('consumer');
    });
  });

  describe('Rarity Statistics', () => {
    test('getRarityStatistics should calculate correct statistics', () => {
      const participantsWithRarity = [
        { ...mockParticipants[0], rarity: 'consumer' },
        { ...mockParticipants[1], rarity: 'consumer' },
        { ...mockParticipants[2], rarity: 'industrial' }
      ];

      const stats = randomService.getRarityStatistics(participantsWithRarity);
      
      expect(stats.consumer.count).toBe(2);
      expect(stats.consumer.percentage).toBeCloseTo(66.67, 1);
      expect(stats.consumer.expectedPercentage).toBeCloseTo(79.695, 2);
      
      expect(stats.industrial.count).toBe(1);
      expect(stats.industrial.percentage).toBeCloseTo(33.33, 1);
      expect(stats.industrial.expectedPercentage).toBe(15.98);
      
      expect(stats.milspec.count).toBe(0);
      expect(stats.milspec.percentage).toBe(0);
    });

    test('getRarityStatistics should handle empty array', () => {
      const stats = randomService.getRarityStatistics([]);
      
      Object.values(stats).forEach(stat => {
        expect(stat.count).toBe(0);
        expect(stat.percentage).toBe(0);
      });
    });
  });

  describe('Visual Overlay System', () => {
    test('createRarityGradient should create valid CSS gradient', () => {
      const gradient = randomService.createRarityGradient('consumer');
      expect(gradient).toMatch(/^linear-gradient\(to right, #[A-Fa-f0-9]{6}, #[A-Fa-f0-9]{6}\)$/);
      expect(gradient).toContain('#B0C3D9');
    });

    test('createRarityGradient should support custom direction', () => {
      const gradient = randomService.createRarityGradient('consumer', 'to bottom');
      expect(gradient).toContain('to bottom');
    });

    test('getContrastTextColor should return appropriate text colors', () => {
      // Light colors should get black text
      expect(randomService.getContrastTextColor('consumer')).toBe('#000000'); // Light blue
      
      // Dark colors should get white text
      expect(randomService.getContrastTextColor('restricted')).toBe('#FFFFFF'); // Dark purple
      expect(randomService.getContrastTextColor('covert')).toBe('#FFFFFF'); // Dark red
    });

    test('getRarityAnimationDuration should return longer durations for rarer items', () => {
      const consumerDuration = randomService.getRarityAnimationDuration('consumer');
      const exceedinglyRareDuration = randomService.getRarityAnimationDuration('exceedinglyRare');
      
      expect(exceedinglyRareDuration).toBeGreaterThan(consumerDuration);
      expect(exceedinglyRareDuration).toBeLessThanOrEqual(5000); // Capped at 5 seconds
    });

    test('getRarityAnimationDuration should return default for invalid rarity', () => {
      const duration = randomService.getRarityAnimationDuration('invalid');
      expect(duration).toBe(1000);
    });
  });

  describe('Distribution Validation', () => {
    test('should verify rarity distribution over very large sample', () => {
      const sampleSize = 1000000; // 1 million samples for high accuracy
      const participants: Participant[] = Array.from({ length: sampleSize }, (_, i) => ({
        id: `${i}`,
        raffleId: 'test',
        username: `user${i}`,
        profileImageUrl: `https://example.com/user${i}.jpg`,
        ticketNumber: `T${i.toString().padStart(6, '0')}`,
        importDate: new Date()
      }));

      const participantsWithRarity = randomService.assignRaritiesToParticipants(participants);
      const stats = randomService.getRarityStatistics(participantsWithRarity);

      // Verify each rarity is within reasonable tolerance for large sample
      Object.entries(CS2_RARITY_LEVELS).forEach(([key, expected]) => {
        const actualPercentage = stats[key].percentage;
        const expectedPercentage = expected.chance * 100;
        
        // For very rare items, allow more tolerance due to statistical variance
        let tolerance;
        if (expectedPercentage < 0.1) {
          tolerance = 0.1; // 0.1% tolerance for very rare items
        } else if (expectedPercentage < 1) {
          tolerance = 0.3; // 0.3% tolerance for rare items
        } else {
          tolerance = 0.5; // 0.5% tolerance for common items
        }
        
        expect(Math.abs(actualPercentage - expectedPercentage)).toBeLessThan(tolerance);
      });
    }, 30000); // 30 second timeout for large sample test
  });
});