// Simple test to verify CSV functionality works
const { CSVService } = require('./dist/main/services/CSVService.js');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

async function testCSVFunctionality() {
  console.log('Testing CSV functionality...');
  
  const csvService = new CSVService();
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'csv-test-'));
  
  try {
    // Test CSV content
    const csvContent = `Username,First Name,Last Name,User Email ID,Phone Number,Ticket Number,User Profile
user1,John,Doe,john@example.com,1234567890,1,https://example.com/avatar1.jpg
user2,Jane,Smith,jane@example.com,0987654321,2,https://example.com/avatar2.jpg`;

    const csvPath = path.join(tempDir, 'test.csv');
    await fs.writeFile(csvPath, csvContent);

    // Test validation
    const result = await csvService.validateAndParseCSV(csvPath, 'test-raffle');
    
    console.log('✓ CSV validation result:', {
      isValid: result.isValid,
      participantCount: result.participantCount,
      errorCount: result.errors.length,
      warningCount: result.warnings.length
    });

    if (result.isValid && result.participantCount === 2) {
      console.log('✓ CSV functionality is working correctly!');
      return true;
    } else {
      console.log('✗ CSV validation failed');
      console.log('Errors:', result.errors);
      return false;
    }
  } catch (error) {
    console.log('✗ Error testing CSV functionality:', error.message);
    return false;
  } finally {
    // Cleanup
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testCSVFunctionality().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { testCSVFunctionality };