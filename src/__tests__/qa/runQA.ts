#!/usr/bin/env node

/**
 * Quality Assurance Test Runner Script
 * Implements task 20: Implement final testing and quality assurance
 */

import { ComprehensiveTestRunner } from './ComprehensiveTestRunner';

async function main() {
  console.log('🎯 Raffle Drawing Application - Final Quality Assurance');
  console.log('Task 20: Implement final testing and quality assurance');
  console.log('=' .repeat(80));

  const runner = new ComprehensiveTestRunner();

  try {
    const results = await runner.runComprehensiveQA();
    
    // Determine if QA passed
    const totalTests = Object.values(results)
      .filter(r => typeof r === 'object' && 'total' in r)
      .reduce((sum, r: any) => sum + r.total, 0);

    const totalPassed = Object.values(results)
      .filter(r => typeof r === 'object' && 'passed' in r)
      .reduce((sum, r: any) => sum + r.passed, 0);

    const passRate = totalTests > 0 ? (totalPassed / totalTests * 100) : 0;

    console.log('\n' + '=' .repeat(80));
    console.log('🏁 FINAL QUALITY ASSURANCE RESULTS');
    console.log('=' .repeat(80));

    if (passRate >= 90 && results.coverage.overall >= 75) {
      console.log('✅ QUALITY ASSURANCE PASSED');
      console.log('   Application is ready for production deployment');
      process.exit(0);
    } else if (passRate >= 75) {
      console.log('⚠️  QUALITY ASSURANCE PARTIAL');
      console.log('   Application needs minor improvements before production');
      process.exit(1);
    } else {
      console.log('❌ QUALITY ASSURANCE FAILED');
      console.log('   Application requires significant improvements');
      process.exit(2);
    }

  } catch (error) {
    console.error('💥 Quality Assurance testing failed:', error);
    process.exit(3);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { main as runQA };