import { RandomService } from '../RandomService';
import { Participant } from '../../../types';

describe('RandomService - Real Implementation Tests', () => {
  let testParticipants: Participant[];

  beforeEach(() => {
    testParticipants = [
      {
        id: '1',
        raffleId: 'raffle-1',
        username: 'user1',
        profileImageUrl: 'https://example.com/user1.jpg',
        ticketNumber: 'T001',
        importDate: new Date()
      },
      {
        id: '2',
        raffleId: 'raffle-1',
        username: 'user2',
        profileImageUrl: 'https://example.com/user2.jpg',
        ticketNumber: 'T002',
        importDate: new Date()
      },
      {
        id: '3',
        raffleId: 'raffle-1',
        username: 'user3',
        profileImageUrl: 'https://example.com/user3.jpg',
        ticketNumber: 'T003',
        importDate: new Date()
      }
    ];
  });

  describe('Constructor and Configuration', () => {
    it('should create instance with API key', () => {
      const service = new RandomService('my-api-key');
      expect(service.hasAPIKey()).toBe(true);
    });

    it('should create instance without API key', () => {
      const service = new RandomService();
      expect(service.hasAPIKey()).toBe(false);
    });

    it('should set API key at runtime', () => {
      const service = new RandomService();
      expect(service.hasAPIKey()).toBe(false);
      
      service.setAPIKey('new-api-key');
      expect(service.hasAPIKey()).toBe(true);
    });
  });

  describe('Input Validation', () => {
    it('should throw error for empty participants array', async () => {
      const service = new RandomService();
      await expect(service.selectWinner([])).rejects.toThrow(
        'No participants provided for winner selection'
      );
    });

    it('should throw error for null participants', async () => {
      const service = new RandomService();
      await expect(service.selectWinner(null as any)).rejects.toThrow(
        'No participants provided for winner selection'
      );
    });

    it('should handle single participant without API call', async () => {
      const service = new RandomService();
      const singleParticipant = [testParticipants[0]];
      const result = await service.selectWinner(singleParticipant);

      expect(result.winner).toBe(singleParticipant[0]);
      expect(result.fallbackUsed).toBe(false);
      expect(result.method).toBe('single_participant');
      expect(result.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('Crypto Fallback (Real Implementation)', () => {
    it('should use crypto fallback when no API key provided', async () => {
      const service = new RandomService(); // No API key
      const result = await service.selectWinner(testParticipants);

      expect(result.fallbackUsed).toBe(true);
      expect(result.method).toBe('crypto_fallback');
      expect(result.winner).toBeDefined();
      expect(testParticipants).toContain(result.winner);
      expect(result.verificationData).toBeDefined();
      expect(result.timestamp).toBeInstanceOf(Date);

      const verificationData = JSON.parse(result.verificationData!);
      expect(verificationData.method).toBe('crypto_fallback');
      expect(verificationData.algorithm).toBe('crypto.randomBytes');
      expect(verificationData.randomBytes).toBeDefined();
      expect(verificationData.winnerIndex).toBeGreaterThanOrEqual(0);
      expect(verificationData.winnerIndex).toBeLessThan(testParticipants.length);
      expect(verificationData.participantCount).toBe(3);
    });

    it('should produce valid results on multiple calls', async () => {
      const service = new RandomService();
      const results = await Promise.all([
        service.selectWinner(testParticipants),
        service.selectWinner(testParticipants),
        service.selectWinner(testParticipants)
      ]);

      // All results should be valid
      results.forEach(result => {
        expect(result.fallbackUsed).toBe(true);
        expect(result.method).toBe('crypto_fallback');
        expect(testParticipants).toContain(result.winner);
        expect(result.verificationData).toBeDefined();
        expect(result.timestamp).toBeInstanceOf(Date);
      });
    });

    it('should handle larger participant arrays', async () => {
      const largeParticipantArray = Array.from({ length: 100 }, (_, i) => ({
        id: `${i}`,
        raffleId: 'raffle-1',
        username: `user${i}`,
        profileImageUrl: `https://example.com/user${i}.jpg`,
        ticketNumber: `T${i.toString().padStart(3, '0')}`,
        importDate: new Date()
      }));

      const service = new RandomService();
      const result = await service.selectWinner(largeParticipantArray);

      expect(result.fallbackUsed).toBe(true);
      expect(result.method).toBe('crypto_fallback');
      expect(largeParticipantArray).toContain(result.winner);
      expect(result.verificationData).toBeDefined();

      const verificationData = JSON.parse(result.verificationData!);
      expect(verificationData.participantCount).toBe(100);
      expect(verificationData.winnerIndex).toBeGreaterThanOrEqual(0);
      expect(verificationData.winnerIndex).toBeLessThan(100);
    });
  });

  describe('Signature Verification', () => {
    it('should verify valid Random.org signature structure', async () => {
      const service = new RandomService();
      const validVerificationData = JSON.stringify({
        method: 'random_org',
        signature: 'valid-signature',
        serialNumber: 12345,
        timestamp: '2024-01-01T12:00:00Z'
      });

      const isValid = await service.verifyRandomOrgSignature(validVerificationData);
      expect(isValid).toBe(true);
    });

    it('should reject crypto fallback verification data', async () => {
      const service = new RandomService();
      const fallbackVerificationData = JSON.stringify({
        method: 'crypto_fallback',
        randomBytes: '12345678',
        timestamp: '2024-01-01T12:00:00Z'
      });

      const isValid = await service.verifyRandomOrgSignature(fallbackVerificationData);
      expect(isValid).toBe(false);
    });

    it('should reject invalid verification data structure', async () => {
      const service = new RandomService();
      const invalidVerificationData = JSON.stringify({
        method: 'random_org'
        // Missing required fields
      });

      const isValid = await service.verifyRandomOrgSignature(invalidVerificationData);
      expect(isValid).toBe(false);
    });

    it('should handle malformed JSON gracefully', async () => {
      const service = new RandomService();
      const malformedData = 'not-valid-json';

      const isValid = await service.verifyRandomOrgSignature(malformedData);
      expect(isValid).toBe(false);
    });
  });

  describe('API Quota and Connection (No API Key)', () => {
    it('should return null quota when no API key', async () => {
      const service = new RandomService();
      const quota = await service.getAPIQuota();
      expect(quota).toBeNull();
    });

    it('should return false for connection test when no API key', async () => {
      const service = new RandomService();
      const isConnected = await service.testConnection();
      expect(isConnected).toBe(false);
    });
  });

  describe('Consistency and Reliability', () => {
    it('should maintain consistent verification data format', async () => {
      const service = new RandomService();
      const results = await Promise.all([
        service.selectWinner(testParticipants),
        service.selectWinner(testParticipants)
      ]);

      results.forEach(result => {
        expect(result.verificationData).toBeDefined();
        
        const verificationData = JSON.parse(result.verificationData!);
        expect(verificationData).toHaveProperty('method', 'crypto_fallback');
        expect(verificationData).toHaveProperty('algorithm', 'crypto.randomBytes');
        expect(verificationData).toHaveProperty('timestamp');
        expect(verificationData).toHaveProperty('randomBytes');
        expect(verificationData).toHaveProperty('winnerIndex');
        expect(verificationData).toHaveProperty('participantCount', 3);
        
        expect(typeof verificationData.timestamp).toBe('string');
        expect(typeof verificationData.randomBytes).toBe('string');
        expect(typeof verificationData.winnerIndex).toBe('number');
        expect(typeof verificationData.participantCount).toBe('number');
      });
    });

    it('should select valid participants consistently', async () => {
      const service = new RandomService();
      
      // Run a few selections to verify consistency
      for (let i = 0; i < 3; i++) {
        const result = await service.selectWinner(testParticipants);
        
        expect(result.winner).toBeDefined();
        expect(testParticipants).toContain(result.winner);
        expect(result.fallbackUsed).toBe(true);
        expect(result.method).toBe('crypto_fallback');
        expect(result.timestamp).toBeInstanceOf(Date);
        
        // Verify the winner index matches the actual winner
        const verificationData = JSON.parse(result.verificationData!);
        expect(testParticipants[verificationData.winnerIndex]).toBe(result.winner);
      }
    });
  });
});