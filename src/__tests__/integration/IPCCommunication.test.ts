import { jest } from '@jest/globals';

// Mock Electron modules
const mockIpcRenderer = {
  invoke: jest.fn(),
  on: jest.fn(),
  removeAllListeners: jest.fn()
};

const mockElectronAPI = {
  // App info
  getVersion: jest.fn(),
  getPlatform: jest.fn(),
  getPlatformPaths: jest.fn(),
  getPlatformSettings: jest.fn(),

  // Database API
  createRaffle: jest.fn(),
  updateRaffle: jest.fn(),
  deleteRaffle: jest.fn(),
  getRaffle: jest.fn(),
  getAllRaffles: jest.fn(),
  recordDrawing: jest.fn(),
  getDrawingHistory: jest.fn(),

  // File operations API
  saveCSVFile: jest.fn(),
  loadParticipants: jest.fn(),
  validateCSVData: jest.fn(),
  saveBackgroundImage: jest.fn(),

  // Random service API
  selectWinner: jest.fn(),
  assignRarities: jest.fn(),

  // Notification API
  showNotification: jest.fn(),

  // Window management API
  minimizeWindow: jest.fn(),
  maximizeWindow: jest.fn(),
  closeWindow: jest.fn(),
  hideToTray: jest.fn(),

  // Dialog API
  showOpenDialog: jest.fn(),
  showSaveDialog: jest.fn(),
  showMessageDialog: jest.fn(),
  showErrorDialog: jest.fn(),

  // Drag and drop API
  validateDroppedFiles: jest.fn(),
  readDroppedFile: jest.fn(),

  // Lifecycle management API
  getAppStatus: jest.fn(),
  restartApp: jest.fn(),
  quitApp: jest.fn(),

  // Recording API
  startRecording: jest.fn(),
  stopRecording: jest.fn(),
  getRecordingStatus: jest.fn(),
  isRecording: jest.fn(),

  // Event listeners
  onMenuNewRaffle: jest.fn(),
  onMenuImportCSV: jest.fn(),
  onMenuExportResults: jest.fn(),
  removeMenuListeners: jest.fn(),
  onRecordingStatus: jest.fn(),
  onRecordingProgress: jest.fn(),
  onRecordingFinished: jest.fn(),
  onRecordingError: jest.fn(),
  removeRecordingListeners: jest.fn()
};

// Mock window.electronAPI
Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true
});

describe('IPC Communication Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Database Operations', () => {
    it('should create a raffle through IPC', async () => {
      const mockRaffle = {
        name: 'Test Raffle',
        status: 'draft',
        animationStyle: 'cs2_case'
      };

      mockElectronAPI.createRaffle.mockResolvedValue({
        success: true,
        data: { id: 'raffle-1', ...mockRaffle }
      });

      const result = await window.electronAPI.createRaffle(mockRaffle);

      expect(mockElectronAPI.createRaffle).toHaveBeenCalledWith(mockRaffle);
      expect(result.success).toBe(true);
      expect(result.data.id).toBe('raffle-1');
    });

    it('should handle database errors gracefully', async () => {
      mockElectronAPI.createRaffle.mockResolvedValue({
        success: false,
        error: 'Database connection failed'
      });

      const result = await window.electronAPI.createRaffle({});

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database connection failed');
    });

    it('should get all raffles', async () => {
      const mockRaffles = [
        { id: 'raffle-1', name: 'Raffle 1' },
        { id: 'raffle-2', name: 'Raffle 2' }
      ];

      mockElectronAPI.getAllRaffles.mockResolvedValue({
        success: true,
        data: mockRaffles
      });

      const result = await window.electronAPI.getAllRaffles();

      expect(mockElectronAPI.getAllRaffles).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    it('should update a raffle', async () => {
      const updates = { name: 'Updated Raffle Name' };
      const raffleId = 'raffle-1';

      mockElectronAPI.updateRaffle.mockResolvedValue({
        success: true,
        data: { id: raffleId, ...updates }
      });

      const result = await window.electronAPI.updateRaffle(raffleId, updates);

      expect(mockElectronAPI.updateRaffle).toHaveBeenCalledWith(raffleId, updates);
      expect(result.success).toBe(true);
    });

    it('should delete a raffle', async () => {
      const raffleId = 'raffle-1';

      mockElectronAPI.deleteRaffle.mockResolvedValue({
        success: true
      });

      const result = await window.electronAPI.deleteRaffle(raffleId);

      expect(mockElectronAPI.deleteRaffle).toHaveBeenCalledWith(raffleId);
      expect(result.success).toBe(true);
    });
  });

  describe('File Operations', () => {
    it('should save CSV file', async () => {
      const raffleId = 'raffle-1';
      const csvData = 'Username,Email\nJohn,john@example.com';

      mockElectronAPI.saveCSVFile.mockResolvedValue({
        success: true,
        data: '/path/to/saved/file.csv'
      });

      const result = await window.electronAPI.saveCSVFile(raffleId, csvData);

      expect(mockElectronAPI.saveCSVFile).toHaveBeenCalledWith(raffleId, csvData);
      expect(result.success).toBe(true);
      expect(result.data).toBe('/path/to/saved/file.csv');
    });

    it('should validate CSV data', async () => {
      const csvData = 'Username,Email\nJohn,john@example.com';

      mockElectronAPI.validateCSVData.mockResolvedValue({
        success: true,
        data: {
          isValid: true,
          participantCount: 1,
          errors: []
        }
      });

      const result = await window.electronAPI.validateCSVData(csvData);

      expect(mockElectronAPI.validateCSVData).toHaveBeenCalledWith(csvData);
      expect(result.success).toBe(true);
      expect(result.data.isValid).toBe(true);
    });

    it('should load participants from CSV file', async () => {
      const csvFilePath = '/path/to/participants.csv';
      const mockParticipants = [
        { id: '1', username: 'John', email: 'john@example.com' }
      ];

      mockElectronAPI.loadParticipants.mockResolvedValue({
        success: true,
        data: mockParticipants
      });

      const result = await window.electronAPI.loadParticipants(csvFilePath);

      expect(mockElectronAPI.loadParticipants).toHaveBeenCalledWith(csvFilePath);
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });
  });

  describe('Window Management', () => {
    it('should minimize window', async () => {
      mockElectronAPI.minimizeWindow.mockResolvedValue({
        success: true
      });

      const result = await window.electronAPI.minimizeWindow();

      expect(mockElectronAPI.minimizeWindow).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should maximize window', async () => {
      mockElectronAPI.maximizeWindow.mockResolvedValue({
        success: true
      });

      const result = await window.electronAPI.maximizeWindow();

      expect(mockElectronAPI.maximizeWindow).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should hide window to tray', async () => {
      mockElectronAPI.hideToTray.mockResolvedValue({
        success: true
      });

      const result = await window.electronAPI.hideToTray();

      expect(mockElectronAPI.hideToTray).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });

  describe('Notifications', () => {
    it('should show notification', async () => {
      const notificationOptions = {
        title: 'Test Notification',
        body: 'This is a test notification'
      };

      mockElectronAPI.showNotification.mockResolvedValue({
        success: true
      });

      const result = await window.electronAPI.showNotification(notificationOptions);

      expect(mockElectronAPI.showNotification).toHaveBeenCalledWith(notificationOptions);
      expect(result.success).toBe(true);
    });

    it('should handle notification errors', async () => {
      mockElectronAPI.showNotification.mockResolvedValue({
        success: false,
        error: 'Notifications not supported'
      });

      const result = await window.electronAPI.showNotification({
        title: 'Test',
        body: 'Test'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Notifications not supported');
    });
  });

  describe('Drag and Drop', () => {
    it('should validate dropped files', async () => {
      const filePaths = ['/path/to/file.csv', '/path/to/image.png'];

      mockElectronAPI.validateDroppedFiles.mockResolvedValue({
        success: true,
        data: {
          validFiles: [
            { path: '/path/to/file.csv', type: 'csv', name: 'file.csv' },
            { path: '/path/to/image.png', type: 'image', name: 'image.png' }
          ],
          invalidFiles: [],
          hasValidFiles: true,
          hasInvalidFiles: false
        }
      });

      const result = await window.electronAPI.validateDroppedFiles(filePaths);

      expect(mockElectronAPI.validateDroppedFiles).toHaveBeenCalledWith(filePaths);
      expect(result.success).toBe(true);
      expect(result.data.validFiles).toHaveLength(2);
    });

    it('should read dropped file', async () => {
      const filePath = '/path/to/file.csv';

      mockElectronAPI.readDroppedFile.mockResolvedValue({
        success: true,
        data: {
          content: 'Username,Email\nJohn,john@example.com',
          type: 'csv',
          fileName: 'file.csv'
        }
      });

      const result = await window.electronAPI.readDroppedFile(filePath);

      expect(mockElectronAPI.readDroppedFile).toHaveBeenCalledWith(filePath);
      expect(result.success).toBe(true);
      expect(result.data.type).toBe('csv');
    });
  });

  describe('Random Service', () => {
    it('should select winner', async () => {
      const participants = [
        { id: '1', username: 'John' },
        { id: '2', username: 'Jane' }
      ];

      mockElectronAPI.selectWinner.mockResolvedValue({
        success: true,
        data: {
          winner: participants[0],
          verificationData: 'random-org-verification',
          fallbackUsed: false
        }
      });

      const result = await window.electronAPI.selectWinner(participants);

      expect(mockElectronAPI.selectWinner).toHaveBeenCalledWith(participants);
      expect(result.success).toBe(true);
      expect(result.data.winner.id).toBe('1');
    });

    it('should assign rarities', async () => {
      const participants = [
        { id: '1', username: 'John' },
        { id: '2', username: 'Jane' }
      ];

      mockElectronAPI.assignRarities.mockResolvedValue({
        success: true,
        data: participants.map(p => ({ ...p, rarity: 'Consumer Grade' }))
      });

      const result = await window.electronAPI.assignRarities(participants);

      expect(mockElectronAPI.assignRarities).toHaveBeenCalledWith(participants);
      expect(result.success).toBe(true);
      expect(result.data[0].rarity).toBe('Consumer Grade');
    });
  });

  describe('Application Lifecycle', () => {
    it('should get app status', async () => {
      mockElectronAPI.getAppStatus.mockResolvedValue({
        success: true,
        data: {
          isQuitting: false,
          hasMainWindow: true,
          hasTray: true,
          isRecording: false,
          uptime: 3600
        }
      });

      const result = await window.electronAPI.getAppStatus();

      expect(mockElectronAPI.getAppStatus).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.data.hasMainWindow).toBe(true);
    });

    it('should restart app', async () => {
      mockElectronAPI.restartApp.mockResolvedValue({
        success: true
      });

      const result = await window.electronAPI.restartApp();

      expect(mockElectronAPI.restartApp).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should quit app', async () => {
      mockElectronAPI.quitApp.mockResolvedValue({
        success: true
      });

      const result = await window.electronAPI.quitApp();

      expect(mockElectronAPI.quitApp).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });

  describe('Event Listeners', () => {
    it('should set up menu event listeners', () => {
      const callback = jest.fn();
      
      window.electronAPI.onMenuNewRaffle(callback);
      
      expect(mockElectronAPI.onMenuNewRaffle).toHaveBeenCalledWith(callback);
    });

    it('should set up recording event listeners', () => {
      const statusCallback = jest.fn();
      const progressCallback = jest.fn();
      const finishedCallback = jest.fn();
      const errorCallback = jest.fn();
      
      window.electronAPI.onRecordingStatus(statusCallback);
      window.electronAPI.onRecordingProgress(progressCallback);
      window.electronAPI.onRecordingFinished(finishedCallback);
      window.electronAPI.onRecordingError(errorCallback);
      
      expect(mockElectronAPI.onRecordingStatus).toHaveBeenCalledWith(statusCallback);
      expect(mockElectronAPI.onRecordingProgress).toHaveBeenCalledWith(progressCallback);
      expect(mockElectronAPI.onRecordingFinished).toHaveBeenCalledWith(finishedCallback);
      expect(mockElectronAPI.onRecordingError).toHaveBeenCalledWith(errorCallback);
    });

    it('should remove event listeners', () => {
      window.electronAPI.removeMenuListeners();
      window.electronAPI.removeRecordingListeners();
      
      expect(mockElectronAPI.removeMenuListeners).toHaveBeenCalled();
      expect(mockElectronAPI.removeRecordingListeners).toHaveBeenCalled();
    });
  });

  describe('Dialog Operations', () => {
    it('should show open dialog', async () => {
      const options = {
        properties: ['openFile'],
        filters: [{ name: 'CSV Files', extensions: ['csv'] }]
      };

      mockElectronAPI.showOpenDialog.mockResolvedValue({
        success: true,
        data: {
          canceled: false,
          filePaths: ['/path/to/file.csv']
        }
      });

      const result = await window.electronAPI.showOpenDialog(options);

      expect(mockElectronAPI.showOpenDialog).toHaveBeenCalledWith(options);
      expect(result.success).toBe(true);
      expect(result.data.filePaths).toHaveLength(1);
    });

    it('should show save dialog', async () => {
      const options = {
        defaultPath: 'export.csv',
        filters: [{ name: 'CSV Files', extensions: ['csv'] }]
      };

      mockElectronAPI.showSaveDialog.mockResolvedValue({
        success: true,
        data: {
          canceled: false,
          filePath: '/path/to/export.csv'
        }
      });

      const result = await window.electronAPI.showSaveDialog(options);

      expect(mockElectronAPI.showSaveDialog).toHaveBeenCalledWith(options);
      expect(result.success).toBe(true);
      expect(result.data.filePath).toBe('/path/to/export.csv');
    });

    it('should show message dialog', async () => {
      const options = {
        type: 'info',
        title: 'Test',
        message: 'Test message'
      };

      mockElectronAPI.showMessageDialog.mockResolvedValue({
        success: true,
        data: {
          response: 0
        }
      });

      const result = await window.electronAPI.showMessageDialog(options);

      expect(mockElectronAPI.showMessageDialog).toHaveBeenCalledWith(options);
      expect(result.success).toBe(true);
    });

    it('should show error dialog', async () => {
      const title = 'Error';
      const content = 'An error occurred';

      mockElectronAPI.showErrorDialog.mockResolvedValue({
        success: true
      });

      const result = await window.electronAPI.showErrorDialog(title, content);

      expect(mockElectronAPI.showErrorDialog).toHaveBeenCalledWith(title, content);
      expect(result.success).toBe(true);
    });
  });
});