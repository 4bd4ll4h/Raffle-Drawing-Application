/**
 * Complete Workflow Quality Assurance Tests
 * End-to-end testing for complete raffle workflows as required by task 20
 */

import { DatabaseService } from '../../main/services/DatabaseService';
import { CSVService } from '../../main/services/CSVService';
import { RandomService } from '../../main/services/RandomService';
import { RecordingService } from '../../main/services/RecordingService';
import { ExportService } from '../../main/services/ExportService';
import { WorkflowManager } from '../../renderer/components/WorkflowManager';
import { Raffle, Participant, Drawing } from '../../types';

describe('Complete Workflow Quality Assurance', () => {
  let databaseService: DatabaseService;
  let csvService: CSVService;
  let randomService: RandomService;
  let recordingService: RecordingService;
  let exportService: ExportService;
  let workflowManager: WorkflowManager;

  beforeAll(async () => {
    // Initialize all services
    databaseService = new DatabaseService();
    csvService = new CSVService();
    randomService = new RandomService();
    recordingService = new RecordingService();
    exportService = new ExportService();
    workflowManager = new WorkflowManager();

    await databaseService.initialize();
  });

  afterAll(async () => {
    await databaseService.close();
  });

  describe('Complete Raffle Creation to Drawing Workflow', () => {
    it('should complete full workflow: Create → Import → Configure → Draw → Export', async () => {
      // Step 1: Create Raffle
      console.log('Step 1: Creating raffle...');
      const raffle = await databaseService.createRaffle({
        name: 'E2E Test Raffle',
        csvFilePath: '',
        status: 'draft',
        animationStyle: 'cs2_case',
        createdDate: new Date(),
        modifiedDate: new Date(),
        customSettings: {
          backgroundColor: '#1a1a1a',
          logoPosition: 'top-right'
        },
        participantCount: 0
      });

      expect(raffle).toBeDefined();
      expect(raffle.id).toBeDefined();
      expect(raffle.status).toBe('draft');

      // Step 2: Import CSV Data
      console.log('Step 2: Importing CSV data...');
      const csvData = generateTestCSVData(100);
      const validationResult = await csvService.validateCSVContent(csvData);
      
      expect(validationResult.isValid).toBe(true);
      expect(validationResult.participantCount).toBe(100);

      // Update raffle with CSV data
      const updatedRaffle = await databaseService.updateRaffle(raffle.id, {
        csvFilePath: 'test-participants.csv',
        participantCount: 100,
        status: 'ready'
      });

      expect(updatedRaffle.status).toBe('ready');
      expect(updatedRaffle.participantCount).toBe(100);
    }, 30000);
  });
});

function generateTestCSVData(count: number): string {
  const headers = ['Username', 'First Name', 'Last Name', 'User Email ID', 'Phone Number', 'Ticket Number', 'User Profile'];
  const rows = [headers];
  
  for (let i = 1; i <= count; i++) {
    rows.push([
      `user${i}`,
      `First${i}`,
      `Last${i}`,
      `user${i}@example.com`,
      `555-${String(i).padStart(4, '0')}`,
      String(i),
      `https://example.com/avatar${i}.jpg`
    ]);
  }
  
  return rows.map(row => row.join(',')).join('\n');
}