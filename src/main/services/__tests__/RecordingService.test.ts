import { RecordingService } from '../RecordingService';
import { RecordingOptions, DEFAULT_RECORDING_OPTIONS } from '../../../types/recording';
import fs from 'fs/promises';
import path from 'path';

// Mock FFmpeg
jest.mock('fluent-ffmpeg', () => {
  const mockCommand = {
    input: jest.fn().mockReturnThis(),
    inputFormat: jest.fn().mockReturnThis(),
    inputOptions: jest.fn().mockReturnThis(),
    videoCodec: jest.fn().mockReturnThis(),
    outputOptions: jest.fn().mockReturnThis(),
    format: jest.fn().mockReturnThis(),
    audioCodec: jest.fn().mockReturnThis(),
    audioBitrate: jest.fn().mockReturnThis(),
    noAudio: jest.fn().mockReturnThis(),
    on: jest.fn().mockReturnThis(),
    save: jest.fn().mockReturnThis(),
    kill: jest.fn().mockReturnThis(),
  };

  const mockFfmpeg = jest.fn(() => mockCommand);
  mockFfmpeg.setFfmpegPath = jest.fn();
  
  return mockFfmpeg;
});

jest.mock('ffmpeg-static', () => '/path/to/ffmpeg');

describe('RecordingService', () => {
  let recordingService: RecordingService;
  let mockFfmpeg: any;

  beforeEach(() => {
    jest.clearAllMocks();
    recordingService = new RecordingService();
    mockFfmpeg = require('fluent-ffmpeg');
  });

  afterEach(async () => {
    // Ensure no recording is left running
    if (recordingService.isRecording()) {
      try {
        await recordingService.stopRecording();
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });

  describe('initialization', () => {
    it('should initialize with correct default state', () => {
      expect(recordingService.isRecording()).toBe(false);
      expect(recordingService.getStatus()).toEqual({ isRecording: false });
    });

    it('should set FFmpeg path on initialization', () => {
      expect(mockFfmpeg.setFfmpegPath).toHaveBeenCalledWith('/path/to/ffmpeg');
    });
  });

  describe('startRecording', () => {
    it('should start recording with default options', async () => {
      const mockCommand = mockFfmpeg();
      
      // Mock successful start
      mockCommand.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'start') {
          process.nextTick(() => callback('ffmpeg command line'));
        }
        return mockCommand;
      });

      await recordingService.startRecording();

      expect(mockFfmpeg).toHaveBeenCalled();
      expect(mockCommand.input).toHaveBeenCalledWith('desktop');
      expect(mockCommand.inputFormat).toHaveBeenCalledWith('gdigrab');
      expect(mockCommand.videoCodec).toHaveBeenCalledWith('libx264');
      expect(mockCommand.format).toHaveBeenCalledWith('mp4');
      expect(mockCommand.save).toHaveBeenCalled();
    });

    it('should start recording with custom options', async () => {
      const mockCommand = mockFfmpeg();
      const customOptions: RecordingOptions = {
        quality: '4K',
        frameRate: 30,
        codec: 'h265',
        outputFormat: 'mov',
        audioEnabled: true,
        outputPath: '/custom/path'
      };

      mockCommand.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'start') {
          setTimeout(() => callback('ffmpeg command line'), 0);
        }
        return mockCommand;
      });

      await recordingService.startRecording(customOptions);

      expect(mockCommand.videoCodec).toHaveBeenCalledWith('libx265');
      expect(mockCommand.format).toHaveBeenCalledWith('mov');
      expect(mockCommand.audioCodec).toHaveBeenCalledWith('aac');
      expect(mockCommand.audioBitrate).toHaveBeenCalledWith('128k');
    });

    it('should throw error if recording is already in progress', async () => {
      const mockCommand = mockFfmpeg();
      
      mockCommand.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'start') {
          process.nextTick(() => callback('ffmpeg command line'));
        }
        return mockCommand;
      });

      await recordingService.startRecording();
      
      // Wait for the status to be updated
      await new Promise(resolve => process.nextTick(resolve));
      
      await expect(recordingService.startRecording()).rejects.toThrow(
        'Recording is already in progress'
      );
    });

    it('should handle FFmpeg errors during start', async () => {
      const mockCommand = mockFfmpeg();
      const testError = new Error('FFmpeg failed to start');

      mockCommand.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'error') {
          setTimeout(() => callback(testError), 0);
        }
        return mockCommand;
      });

      // Start recording and wait for error event
      const recordingPromise = recordingService.startRecording();
      
      // Wait a bit for the error event to be processed
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(recordingService.getStatus().error).toBe('FFmpeg failed to start');
    });
  });

  describe('stopRecording', () => {
    it('should stop recording successfully', async () => {
      const mockCommand = mockFfmpeg();
      let onEndCallback: Function;

      mockCommand.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'start') {
          setTimeout(() => callback('ffmpeg command line'), 0);
        } else if (event === 'end') {
          onEndCallback = callback;
        }
        return mockCommand;
      });

      // Start recording first
      await recordingService.startRecording();
      expect(recordingService.isRecording()).toBe(true);

      // Stop recording
      const stopPromise = recordingService.stopRecording();
      
      // Simulate FFmpeg end event
      setTimeout(() => onEndCallback(), 10);
      
      const filePath = await stopPromise;
      expect(typeof filePath).toBe('string');
      expect(recordingService.isRecording()).toBe(false);
    });

    it('should throw error if no recording in progress', async () => {
      await expect(recordingService.stopRecording()).rejects.toThrow(
        'No recording in progress'
      );
    });
  });

  describe('progress monitoring', () => {
    it('should emit progress events', async () => {
      const mockCommand = mockFfmpeg();
      const progressCallback = jest.fn();
      let onProgressCallback: Function;

      mockCommand.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'start') {
          setTimeout(() => callback('ffmpeg command line'), 0);
        } else if (event === 'progress') {
          onProgressCallback = callback;
        }
        return mockCommand;
      });

      recordingService.onProgress(progressCallback);
      await recordingService.startRecording();

      // Simulate progress event
      const mockProgress = {
        frames: 100,
        currentFps: 60,
        currentKbps: 1000,
        targetSize: '10MB',
        timemark: '00:00:10.00',
        percent: 50
      };

      onProgressCallback(mockProgress);

      expect(progressCallback).toHaveBeenCalledWith({
        frames: 100,
        currentFps: 60,
        currentKbps: 1000,
        targetSize: '10MB',
        timemark: '00:00:10.00',
        percent: 50
      });
    });

    it('should emit error events', async () => {
      const mockCommand = mockFfmpeg();
      const errorCallback = jest.fn();
      const testError = new Error('Recording failed');
      let onErrorCallback: Function;

      mockCommand.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'start') {
          setTimeout(() => callback('ffmpeg command line'), 0);
        } else if (event === 'error') {
          onErrorCallback = callback;
        }
        return mockCommand;
      });

      recordingService.onError(errorCallback);
      await recordingService.startRecording();

      // Simulate error event
      onErrorCallback(testError);

      expect(errorCallback).toHaveBeenCalledWith(testError);
    });
  });

  describe('file path generation', () => {
    it('should generate recording path with default location', async () => {
      const mockCommand = mockFfmpeg();
      
      mockCommand.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'start') {
          setTimeout(() => {
            callback('ffmpeg command line');
          }, 0);
        }
        return mockCommand;
      });

      await recordingService.startRecording();
      
      const status = recordingService.getStatus();
      expect(status.outputPath).toContain('app-data/recordings');
      expect(status.outputPath).toMatch(/recording-.*\.mp4$/);
    });

    it('should generate raffle-specific recording path', () => {
      const raffleName = 'Test Raffle 2024';
      const options: RecordingOptions = {
        ...DEFAULT_RECORDING_OPTIONS,
        outputFormat: 'mov'
      };

      const filePath = recordingService.generateRaffleRecordingPath(raffleName, options);
      
      expect(filePath).toContain('Test_Raffle_2024');
      expect(filePath).toMatch(/Test_Raffle_2024-.*\.mov$/);
      expect(filePath).toMatch(/app-data[\\\/]recordings/);
    });

    it('should sanitize raffle names for file paths', () => {
      const raffleName = 'Test/Raffle\\With:Special*Characters?';
      const options: RecordingOptions = {
        ...DEFAULT_RECORDING_OPTIONS,
        outputFormat: 'mp4'
      };

      const filePath = recordingService.generateRaffleRecordingPath(raffleName, options);
      
      expect(filePath).toContain('Test_Raffle_With_Special_Characters_');
      // Check that the filename part doesn't contain invalid characters (excluding path separators)
      const filename = filePath.split(/[\\\/]/).pop() || '';
      expect(filename).not.toMatch(/[:*?"<>|]/);
    });
  });

  describe('status management', () => {
    it('should track recording status correctly', async () => {
      const mockCommand = mockFfmpeg();
      
      mockCommand.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'start') {
          setTimeout(() => callback('ffmpeg command line'), 0);
        }
        return mockCommand;
      });

      // Initial state
      expect(recordingService.isRecording()).toBe(false);
      expect(recordingService.getStatus().isRecording).toBe(false);

      // After starting
      await recordingService.startRecording();
      expect(recordingService.isRecording()).toBe(true);
      expect(recordingService.getStatus().isRecording).toBe(true);
      expect(recordingService.getStatus().startTime).toBeInstanceOf(Date);
    });
  });
});