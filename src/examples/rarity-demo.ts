/**
 * Rarity System Demo
 * 
 * This file demonstrates the CS2-style rarity system implementation
 * showing how to assign rarities to participants and get statistics.
 */

import { RandomService } from '../main/services/RandomService';
import { CS2_RARITY_LEVELS, RarityLevel } from '../types';

// Create a demo function to show the rarity system in action
function demonstrateRaritySystem() {
  console.log('=== CS2-Style Rarity System Demo ===\n');

  // Initialize the random service
  const randomService = new RandomService();

  // Show rarity level definitions
  console.log('1. Rarity Level Definitions:');
  console.log('----------------------------');
  Object.entries(CS2_RARITY_LEVELS).forEach(([, rarity]: [string, RarityLevel]) => {
    console.log(`${rarity.name}: ${rarity.color} (${(rarity.chance * 100).toFixed(3)}%)`);
  });

  // Validate distribution
  console.log(`\n2. Distribution Validation:`);
  console.log(`---------------------------`);
  const isValid = randomService.validateRarityDistribution();
  console.log(`Total percentage sums to 100%: ${isValid ? '✓' : '✗'}`);

  // Create sample participants
  const participants = Array.from({ length: 1000 }, (_, i) => ({
    id: `participant-${i + 1}`,
    raffleId: 'demo-raffle',
    username: `Player${i + 1}`,
    profileImageUrl: `https://example.com/avatar${i + 1}.jpg`,
    ticketNumber: `T${(i + 1).toString().padStart(4, '0')}`,
    importDate: new Date()
  }));

  console.log(`\n3. Assigning Rarities to ${participants.length} Participants:`);
  console.log('-------------------------------------------------------');

  // Assign rarities to all participants
  const participantsWithRarity = randomService.assignRaritiesToParticipants(participants);

  // Get statistics
  const stats = randomService.getRarityStatistics(participantsWithRarity);

  console.log('Rarity Distribution Results:');
  console.log('Rarity Level        | Count | Actual % | Expected % | Difference');
  console.log('-------------------|-------|----------|------------|------------');

  Object.entries(stats).forEach(([, stat]: [string, any]) => {
    const difference = stat.percentage - stat.expectedPercentage;
    const diffStr = difference >= 0 ? `+${difference.toFixed(2)}%` : `${difference.toFixed(2)}%`;
    
    console.log(
      `${stat.rarity.name.padEnd(18)} | ${stat.count.toString().padStart(5)} | ${stat.percentage.toFixed(2).padStart(7)}% | ${stat.expectedPercentage.toFixed(2).padStart(9)}% | ${diffStr.padStart(10)}`
    );
  });

  // Show some examples of rarity visual effects
  console.log('\n4. Visual Effect Examples:');
  console.log('--------------------------');

  const rarityExamples = ['consumer', 'milspec', 'restricted', 'covert', 'exceedinglyRare'];
  
  rarityExamples.forEach(rarity => {
    const color = randomService.getRarityColor(rarity);
    const name = randomService.getRarityName(rarity);
    const gradient = randomService.createRarityGradient(rarity);
    const textColor = randomService.getContrastTextColor(rarity);
    const animationDuration = randomService.getRarityAnimationDuration(rarity);

    console.log(`\n${name}:`);
    console.log(`  Color: ${color}`);
    console.log(`  Text Color: ${textColor}`);
    console.log(`  Animation Duration: ${animationDuration}ms`);
    console.log(`  CSS Gradient: ${gradient}`);
  });

  // Show rarity sorted by rarity (rarest first)
  console.log('\n5. Rarities Sorted by Rarity (Rarest First):');
  console.log('--------------------------------------------');
  
  const sortedRarities = randomService.getRaritiesByRarity();
  sortedRarities.forEach((item: any, index: number) => {
    console.log(`${index + 1}. ${item.rarity.name} (${(item.rarity.chance * 100).toFixed(3)}%)`);
  });

  console.log('\n=== Demo Complete ===');

  return {
    participants: participantsWithRarity,
    statistics: stats,
    isValidDistribution: isValid
  };
}

// Example of how to use the rarity system in a real application
function exampleRarityUsage() {
  const randomService = new RandomService();

  // Example 1: Assign rarity to a single participant
  const singleRarity = randomService.assignRandomRarity();
  console.log(`Random rarity assigned: ${randomService.getRarityName(singleRarity)}`);

  // Example 2: Get rarity information
  const rarityInfo = randomService.getRarityInfo('exceedinglyRare');
  if (rarityInfo) {
    console.log(`Exceedingly Rare info:`, rarityInfo);
  }

  // Example 3: Create CSS variables for styling
  const cssVars = {
    '--rarity-color': randomService.getRarityColor('covert'),
    '--rarity-gradient': randomService.createRarityGradient('covert'),
    '--rarity-text-color': randomService.getContrastTextColor('covert')
  };
  console.log('CSS Variables for Covert rarity:', cssVars);

  // Example 4: Validate that a custom rarity distribution would work
  const customRarities = {
    common: { name: 'Common', color: '#CCCCCC', chance: 0.7 },
    rare: { name: 'Rare', color: '#0066FF', chance: 0.25 },
    legendary: { name: 'Legendary', color: '#FF6600', chance: 0.05 }
  };

  const customTotal = Object.values(customRarities).reduce((sum, r) => sum + r.chance, 0);
  console.log(`Custom distribution valid: ${Math.abs(customTotal - 1.0) < 0.0001}`);
}

// Export the functions for use in other modules
export {
  demonstrateRaritySystem,
  exampleRarityUsage
};

// Run the demo if this file is executed directly
if (typeof require !== 'undefined' && require.main === module) {
  demonstrateRaritySystem();
  console.log('\n');
  exampleRarityUsage();
}