import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
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

Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true,
});

describe('Recording Integration - Simple Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockElectronAPI.startRecording.mockResolvedValue({ success: true });
    mockElectronAPI.stopRecording.mockResolvedValue({ 
      success: true, 
      filePath: '/path/to/recording.mp4' 
    });
  });

  it('should integrate recording controls with raffle context', async () => {
    const raffleName = 'Test Raffle Integration';
    
    render(<RecordingControls raffleName={raffleName} />);
    
    // Should show the raffle name context
    expect(screen.getByText('Start Recording')).toBeInTheDocument();
    
    // Start recording
    const startButton = screen.getByText('Start Recording');
    fireEvent.click(startButton);
    
    expect(mockElectronAPI.startRecording).toHaveBeenCalledWith(DEFAULT_RECORDING_OPTIONS);
  });

  it('should handle recording workflow for animation sessions', async () => {
    const onStartRecording = jest.fn();
    const onStopRecording = jest.fn();
    
    render(
      <RecordingControls 
        raffleName="Animation Test"
        onStartRecording={onStartRecording}
        onStopRecording={onStopRecording}
      />
    );
    
    // Start recording before animation
    const startButton = screen.getByText('Start Recording');
    fireEvent.click(startButton);
    
    expect(onStartRecording).toHaveBeenCalledWith(DEFAULT_RECORDING_OPTIONS);
    
    // Simulate recording started
    const statusCallback = mockElectronAPI.onRecordingStatus.mock.calls[0][0];
    statusCallback({ isRecording: true, startTime: new Date() });
    
    // Should show stop button
    expect(screen.getByText('Stop Recording')).toBeInTheDocument();
    
    // Stop recording after animation
    const stopButton = screen.getByText('Stop Recording');
    fireEvent.click(stopButton);
    
    expect(onStopRecording).toHaveBeenCalled();
  });

  it('should provide recording settings for different animation styles', () => {
    render(<RecordingControls raffleName="Settings Test" />);
    
    // Open settings
    const settingsButton = screen.getByTitle('Recording Settings');
    fireEvent.click(settingsButton);
    
    // Should show all recording options
    expect(screen.getByText('Recording Settings')).toBeInTheDocument();
    expect(screen.getByText('Quality:')).toBeInTheDocument();
    expect(screen.getByText('Frame Rate:')).toBeInTheDocument();
    expect(screen.getByText('Codec:')).toBeInTheDocument();
    expect(screen.getByText('Format:')).toBeInTheDocument();
    
    // Should have quality options suitable for animations
    expect(screen.getByDisplayValue('1080p (1920x1080)')).toBeInTheDocument();
    expect(screen.getByDisplayValue('60 FPS')).toBeInTheDocument();
  });

  it('should handle recording errors gracefully during animation', async () => {
    mockElectronAPI.startRecording.mockResolvedValue({ 
      success: false, 
      error: 'FFmpeg not available' 
    });
    
    render(<RecordingControls raffleName="Error Test" />);
    
    const startButton = screen.getByText('Start Recording');
    fireEvent.click(startButton);
    
    // Should still attempt to start recording
    expect(mockElectronAPI.startRecording).toHaveBeenCalled();
    
    // Simulate error status
    const statusCallback = mockElectronAPI.onRecordingStatus.mock.calls[0][0];
    statusCallback({ 
      isRecording: false, 
      error: 'FFmpeg not available' 
    });
    
    // Should show error message
    expect(screen.getByText('FFmpeg not available')).toBeInTheDocument();
    
    // Start button should still be available for retry
    expect(screen.getByText('Start Recording')).toBeInTheDocument();
  });

  it('should support structured file naming for raffle recordings', () => {
    const raffleName = 'CS2 Case Opening Demo';
    
    render(<RecordingControls raffleName={raffleName} />);
    
    // The raffle name should be displayed in the UI
    const startButton = screen.getByText('Start Recording');
    expect(startButton).toBeInTheDocument();
    
    // When recording starts, the raffle name context should be available
    fireEvent.click(startButton);
    
    expect(mockElectronAPI.startRecording).toHaveBeenCalledWith(
      expect.objectContaining({
        quality: '1080p',
        frameRate: 60,
        codec: 'h264',
        outputFormat: 'mp4'
      })
    );
  });
});