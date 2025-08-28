import { CSVService } from '../CSVService';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('CSV Integration Test', () => {
  let csvService: CSVService;
  let tempDir: string;

  beforeEach(async () => {
    csvService = new CSVService();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'csv-test-'));
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  it('should validate and parse a real CSV file', async () => {
    const csvContent = `Username,First Name,Last Name,User Email ID,Phone Number,Ticket Number,User Profile
user1,John,Doe,john@example.com,1234567890,1,https://example.com/avatar1.jpg
user2,Jane,Smith,jane@example.com,0987654321,2,https://example.com/avatar2.jpg`;

    const csvPath = path.join(tempDir, 'test.csv');
    await fs.writeFile(csvPath, csvContent);

    const result = await csvService.validateAndParseCSV(csvPath, 'test-raffle');

    expect(result.isValid).toBe(true);
    expect(result.participantCount).toBe(2);
    expect(result.errors).toHaveLength(0);
    expect(result.preview).toHaveLength(2);
    expect(result.preview[0].username).toBe('user1');
    expect(result.preview[1].username).toBe('user2');
  });

  it('should detect validation errors', async () => {
    const csvContent = `Username,Ticket Number
user1,1
user2,1`; // Missing User Profile column and duplicate ticket

    const csvPath = path.join(tempDir, 'invalid.csv');
    await fs.writeFile(csvPath, csvContent);

    const result = await csvService.validateAndParseCSV(csvPath, 'test-raffle');

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    
    // Should detect missing User Profile column
    const missingColumnError = result.errors.find(e => e.type === 'missing_column');
    expect(missingColumnError).toBeDefined();
    
    // Should detect duplicate ticket numbers
    const duplicateError = result.errors.find(e => e.type === 'duplicate_ticket');
    expect(duplicateError).toBeDefined();
  });

  it('should save and load participants', async () => {
    const csvContent = `Username,First Name,Last Name,User Email ID,Phone Number,Ticket Number,User Profile
user1,John,Doe,john@example.com,1234567890,1,https://example.com/avatar1.jpg`;

    const sourcePath = path.join(tempDir, 'source.csv');
    await fs.writeFile(sourcePath, csvContent);

    // Save CSV file
    const savedPath = await csvService.saveCSVFile('test-raffle', sourcePath);
    expect(savedPath).toContain('participants.csv');

    // Load participants
    const participants = await csvService.loadParticipants(savedPath, 'test-raffle');
    expect(participants).toHaveLength(1);
    expect(participants[0].username).toBe('user1');
    expect(participants[0].firstName).toBe('John');
    expect(participants[0].raffleId).toBe('test-raffle');
  });

  it('should export participants', async () => {
    const participants = [
      {
        id: '1',
        raffleId: 'test-raffle',
        username: 'user1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phoneNumber: '1234567890',
        profileImageUrl: 'https://example.com/avatar1.jpg',
        ticketNumber: '1',
        importDate: new Date('2025-01-01')
      }
    ];

    const exportPath = path.join(tempDir, 'export.csv');
    await csvService.exportParticipants(participants, exportPath);

    const exists = await fs.access(exportPath).then(() => true).catch(() => false);
    expect(exists).toBe(true);

    const content = await fs.readFile(exportPath, 'utf8');
    expect(content).toContain('Username,First Name,Last Name');
    expect(content).toContain('user1,John,Doe');
  });
});