import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RecordingControls } from '../RecordingControls';
import { DEFAULT_RECORDING_OPTIONS } from '../../../types/recording';

// Mock the electron API
const mockElectronAPI = {
  startRecording: jest.fn(),
  stopRecording: jest.fn(),
  onRecordingStatus: jest.fn(),
  onRecordingProgress: jest.fn(),
  removeRecordingListeners: jest.fn(),
};

// Mock window.electronAPI
Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true,
});

describe('RecordingControls', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('rendering', () => {
    it('should render start recording button initially', () => {
      render(<RecordingControls />);
      
      expect(screen.getByText('Start Recording')).toBeInTheDocument();
      expect(screen.getByTitle('Recording Settings')).toBeInTheDocument();
    });

    it('should render with raffle name when provided', () => {
      render(<RecordingControls raffleName="Test Raffle" />);
      
      expect(screen.getByText('Start Recording')).toBeInTheDocument();
    });

    it('should disable controls when disabled prop is true', () => {
      render(<RecordingControls disabled={true} />);
      
      const startButton = screen.getByText('Start Recording');
      expect(startButton).toBeDisabled();
    });
  });

  describe('recording controls', () => {
    it('should call onStartRecording when start button is clicked', async () => {
      const mockOnStart = jest.fn();
      render(<RecordingControls onStartRecording={mockOnStart} />);
      
      const startButton = screen.getByText('Start Recording');
      fireEvent.click(startButton);
      
      expect(mockOnStart).toHaveBeenCalledWith(DEFAULT_RECORDING_OPTIONS);
    });

    it('should call electronAPI.startRecording when no callback provided', async () => {
      mockElectronAPI.startRecording.mockResolvedValue({ success: true });
      
      render(<RecordingControls />);
      
      const startButton = screen.getByText('Start Recording');
      fireEvent.click(startButton);
      
      expect(mockElectronAPI.startRecording).toHaveBeenCalledWith(DEFAULT_RECORDING_OPTIONS);
    });

    it('should show stop button when recording', async () => {
      const { rerender } = render(<RecordingControls />);
      
      // Simulate recording status change
      const statusCallback = mockElectronAPI.onRecordingStatus.mock.calls[0][0];
      statusCallback({ isRecording: true, startTime: new Date() });
      
      rerender(<RecordingControls />);
      
      await waitFor(() => {
        expect(screen.getByText('Stop Recording')).toBeInTheDocument();
      });
    });

    it('should call onStopRecording when stop button is clicked', async () => {
      const mockOnStop = jest.fn();
      const { rerender } = render(<RecordingControls onStopRecording={mockOnStop} />);
      
      // Simulate recording status change
      const statusCallback = mockElectronAPI.onRecordingStatus.mock.calls[0][0];
      statusCallback({ isRecording: true, startTime: new Date() });
      
      rerender(<RecordingControls onStopRecording={mockOnStop} />);
      
      await waitFor(() => {
        const stopButton = screen.getByText('Stop Recording');
        fireEvent.click(stopButton);
        expect(mockOnStop).toHaveBeenCalled();
      });
    });
  });

  describe('recording settings', () => {
    it('should show settings panel when settings button is clicked', () => {
      render(<RecordingControls />);
      
      const settingsButton = screen.getByTitle('Recording Settings');
      fireEvent.click(settingsButton);
      
      expect(screen.getByText('Recording Settings')).toBeInTheDocument();
      expect(screen.getByText('Quality:')).toBeInTheDocument();
      expect(screen.getByText('Frame Rate:')).toBeInTheDocument();
      expect(screen.getByText('Codec:')).toBeInTheDocument();
      expect(screen.getByText('Format:')).toBeInTheDocument();
    });

    it('should update recording options when settings are changed', () => {
      const mockOnStart = jest.fn();
      render(<RecordingControls onStartRecording={mockOnStart} />);
      
      // Open settings
      const settingsButton = screen.getByTitle('Recording Settings');
      fireEvent.click(settingsButton);
      
      // Change quality setting
      const qualitySelect = screen.getByDisplayValue('1080p (1920x1080)');
      fireEvent.change(qualitySelect, { target: { value: '4K' } });
      
      // Start recording
      const startButton = screen.getByText('Start Recording');
      fireEvent.click(startButton);
      
      expect(mockOnStart).toHaveBeenCalledWith({
        ...DEFAULT_RECORDING_OPTIONS,
        quality: '4K'
      });
    });

    it('should disable settings button when recording', async () => {
      const { rerender } = render(<RecordingControls />);
      
      // Simulate recording status change
      const statusCallback = mockElectronAPI.onRecordingStatus.mock.calls[0][0];
      statusCallback({ isRecording: true, startTime: new Date() });
      
      rerender(<RecordingControls />);
      
      await waitFor(() => {
        const settingsButton = screen.getByTitle('Recording Settings');
        expect(settingsButton).toBeDisabled();
      });
    });
  });

  describe('recording status display', () => {
    it('should show recording status when recording', async () => {
      const { rerender } = render(<RecordingControls raffleName="Test Raffle" />);
      
      // Simulate recording status change
      const statusCallback = mockElectronAPI.onRecordingStatus.mock.calls[0][0];
      statusCallback({ 
        isRecording: true, 
        startTime: new Date(Date.now() - 10000) // 10 seconds ago
      });
      
      rerender(<RecordingControls raffleName="Test Raffle" />);
      
      await waitFor(() => {
        expect(screen.getByText(/Recording "Test Raffle"/)).toBeInTheDocument();
        expect(screen.getByText(/00:1\d/)).toBeInTheDocument(); // Duration display
      });
    });

    it('should show recording progress when available', async () => {
      const { rerender } = render(<RecordingControls />);
      
      // Simulate recording status change
      const statusCallback = mockElectronAPI.onRecordingStatus.mock.calls[0][0];
      statusCallback({ isRecording: true, startTime: new Date() });
      
      // Simulate progress update
      const progressCallback = mockElectronAPI.onRecordingProgress.mock.calls[0][0];
      progressCallback({
        frames: 1800,
        currentFps: 60,
        currentKbps: 5000,
        targetSize: '50MB',
        timemark: '00:00:30.00',
        percent: 25
      });
      
      rerender(<RecordingControls />);
      
      await waitFor(() => {
        expect(screen.getByText('FPS: 60.0')).toBeInTheDocument();
        expect(screen.getByText('Size: 50MB')).toBeInTheDocument();
        expect(screen.getByText('Time: 00:00:30.00')).toBeInTheDocument();
        expect(screen.getByText('Progress: 25.0%')).toBeInTheDocument();
      });
    });

    it('should show error message when recording fails', async () => {
      const { rerender } = render(<RecordingControls />);
      
      // Simulate recording status with error
      const statusCallback = mockElectronAPI.onRecordingStatus.mock.calls[0][0];
      statusCallback({ 
        isRecording: false, 
        error: 'FFmpeg not found' 
      });
      
      rerender(<RecordingControls />);
      
      await waitFor(() => {
        expect(screen.getByText('FFmpeg not found')).toBeInTheDocument();
      });
    });
  });

  describe('cleanup', () => {
    it('should remove event listeners on unmount', () => {
      const { unmount } = render(<RecordingControls />);
      
      unmount();
      
      expect(mockElectronAPI.removeRecordingListeners).toHaveBeenCalled();
    });
  });
});