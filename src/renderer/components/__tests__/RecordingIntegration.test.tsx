import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AnimationEngine } from '../AnimationEngine';
import { RecordingControls } from '../RecordingControls';
import { Participant } from '../../../types';
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

// Mock canvas and animation services
jest.mock('../../animation/CanvasRendererService');
jest.mock('../../animation/ImageCacheService');
jest.mock('../../animation/PerformanceMonitorService');

const mockParticipants: Participant[] = [
  {
    id: '1',
    raffleId: 'test-raffle',
    username: 'user1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    profileImageUrl: 'https://example.com/avatar1.jpg',
    ticketNumber: '001',
    importDate: new Date(),
  },
  {
    id: '2',
    raffleId: 'test-raffle',
    username: 'user2',
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane@example.com',
    profileImageUrl: 'https://example.com/avatar2.jpg',
    ticketNumber: '002',
    importDate: new Date(),
  },
];

const mockWinner = mockParticipants[0];

// Component that combines animation and recording
const AnimationWithRecording: React.FC = () => {
  const [isAnimating, setIsAnimating] = React.useState(false);
  const [animationComplete, setAnimationComplete] = React.useState(false);

  const handleStartAnimation = () => {
    setIsAnimating(true);
    setAnimationComplete(false);
  };

  const handleAnimationComplete = () => {
    setIsAnimating(false);
    setAnimationComplete(true);
  };

  return (
    <div>
      <RecordingControls 
        raffleName="Test Raffle"
        disabled={false}
      />
      
      <div>
        <button 
          onClick={handleStartAnimation}
          disabled={isAnimating}
        >
          {isAnimating ? 'Animation Running...' : 'Start Animation'}
        </button>
        
        {animationComplete && (
          <div data-testid="animation-complete">
            Animation Complete - Winner: {mockWinner.username}
          </div>
        )}
      </div>

      {isAnimating && (
        <AnimationEngine
          participants={mockParticipants}
          winner={mockWinner}
          animationStyle="cs2_case"
          onAnimationComplete={handleAnimationComplete}
          recordingEnabled={true}
        />
      )}
    </div>
  );
};

describe('Recording Integration with Animation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful recording operations
    mockElectronAPI.startRecording.mockResolvedValue({ success: true });
    mockElectronAPI.stopRecording.mockResolvedValue({ 
      success: true, 
      filePath: '/path/to/recording.mp4' 
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('recording workflow during animation', () => {
    it('should allow starting recording before animation', async () => {
      render(<AnimationWithRecording />);
      
      // Start recording first
      const startRecordingButton = screen.getByText('Start Recording');
      fireEvent.click(startRecordingButton);
      
      expect(mockElectronAPI.startRecording).toHaveBeenCalledWith(DEFAULT_RECORDING_OPTIONS);
      
      // Simulate recording started
      const statusCallback = mockElectronAPI.onRecordingStatus.mock.calls[0][0];
      statusCallback({ isRecording: true, startTime: new Date() });
      
      await waitFor(() => {
        expect(screen.getByText('Stop Recording')).toBeInTheDocument();
      });
      
      // Then start animation
      const startAnimationButton = screen.getByText('Start Animation');
      fireEvent.click(startAnimationButton);
      
      expect(screen.getByText('Animation Running...')).toBeInTheDocument();
    });

    it('should continue recording during animation playback', async () => {
      render(<AnimationWithRecording />);
      
      // Start recording
      const startRecordingButton = screen.getByText('Start Recording');
      fireEvent.click(startRecordingButton);
      
      // Simulate recording started
      const statusCallback = mockElectronAPI.onRecordingStatus.mock.calls[0][0];
      statusCallback({ isRecording: true, startTime: new Date() });
      
      // Start animation
      const startAnimationButton = screen.getByText('Start Animation');
      fireEvent.click(startAnimationButton);
      
      // Simulate recording progress during animation
      const progressCallback = mockElectronAPI.onRecordingProgress.mock.calls[0][0];
      progressCallback({
        frames: 3600, // 60 seconds at 60fps
        currentFps: 60,
        currentKbps: 8000,
        targetSize: '100MB',
        timemark: '00:01:00.00',
        percent: 50
      });
      
      await waitFor(() => {
        expect(screen.getByText('FPS: 60.0')).toBeInTheDocument();
        expect(screen.getByText('Time: 00:01:00.00')).toBeInTheDocument();
        expect(screen.getByText('Animation Running...')).toBeInTheDocument();
      });
    });

    it('should allow stopping recording after animation completes', async () => {
      render(<AnimationWithRecording />);
      
      // Start recording and animation
      const startRecordingButton = screen.getByText('Start Recording');
      fireEvent.click(startRecordingButton);
      
      const statusCallback = mockElectronAPI.onRecordingStatus.mock.calls[0][0];
      statusCallback({ isRecording: true, startTime: new Date() });
      
      const startAnimationButton = screen.getByText('Start Animation');
      fireEvent.click(startAnimationButton);
      
      // Simulate animation completion
      await waitFor(() => {
        const animationEngine = screen.getByTestId('animation-engine');
        fireEvent(animationEngine, new CustomEvent('animationComplete'));
      });
      
      // Animation should be complete
      await waitFor(() => {
        expect(screen.getByTestId('animation-complete')).toBeInTheDocument();
        expect(screen.getByText('Start Animation')).toBeInTheDocument(); // Button is back
      });
      
      // Stop recording
      const stopRecordingButton = screen.getByText('Stop Recording');
      fireEvent.click(stopRecordingButton);
      
      expect(mockElectronAPI.stopRecording).toHaveBeenCalled();
    });

    it('should handle recording errors gracefully during animation', async () => {
      render(<AnimationWithRecording />);
      
      // Start recording
      const startRecordingButton = screen.getByText('Start Recording');
      fireEvent.click(startRecordingButton);
      
      // Simulate recording error
      const statusCallback = mockElectronAPI.onRecordingStatus.mock.calls[0][0];
      statusCallback({ 
        isRecording: false, 
        error: 'Disk space full' 
      });
      
      await waitFor(() => {
        expect(screen.getByText('Disk space full')).toBeInTheDocument();
      });
      
      // Animation should still be startable
      const startAnimationButton = screen.getByText('Start Animation');
      expect(startAnimationButton).not.toBeDisabled();
      fireEvent.click(startAnimationButton);
      
      expect(screen.getByText('Animation Running...')).toBeInTheDocument();
    });
  });

  describe('recording file naming with raffle context', () => {
    it('should use raffle name in recording file path', async () => {
      render(<AnimationWithRecording />);
      
      // Start and stop recording
      const startRecordingButton = screen.getByText('Start Recording');
      fireEvent.click(startRecordingButton);
      
      const statusCallback = mockElectronAPI.onRecordingStatus.mock.calls[0][0];
      statusCallback({ 
        isRecording: true, 
        startTime: new Date(),
        outputPath: '/path/to/Test_Raffle-2024-01-01T12-00-00-000Z.mp4'
      });
      
      const stopRecordingButton = screen.getByText('Stop Recording');
      fireEvent.click(stopRecordingButton);
      
      expect(mockElectronAPI.stopRecording).toHaveBeenCalled();
    });
  });

  describe('performance during recording', () => {
    it('should maintain animation performance while recording', async () => {
      render(<AnimationWithRecording />);
      
      // Start recording
      const startRecordingButton = screen.getByText('Start Recording');
      fireEvent.click(startRecordingButton);
      
      const statusCallback = mockElectronAPI.onRecordingStatus.mock.calls[0][0];
      statusCallback({ isRecording: true, startTime: new Date() });
      
      // Start animation
      const startAnimationButton = screen.getByText('Start Animation');
      fireEvent.click(startAnimationButton);
      
      // Simulate good performance metrics
      const progressCallback = mockElectronAPI.onRecordingProgress.mock.calls[0][0];
      progressCallback({
        frames: 1800,
        currentFps: 60, // Maintaining 60fps
        currentKbps: 5000,
        targetSize: '50MB',
        timemark: '00:00:30.00'
      });
      
      await waitFor(() => {
        expect(screen.getByText('FPS: 60.0')).toBeInTheDocument();
      });
      
      // Performance should be maintained (60fps)
      const fpsDisplay = screen.getByText('FPS: 60.0');
      expect(fpsDisplay).toBeInTheDocument();
    });

    it('should show performance degradation warnings if fps drops', async () => {
      render(<AnimationWithRecording />);
      
      // Start recording and animation
      const startRecordingButton = screen.getByText('Start Recording');
      fireEvent.click(startRecordingButton);
      
      const statusCallback = mockElectronAPI.onRecordingStatus.mock.calls[0][0];
      statusCallback({ isRecording: true, startTime: new Date() });
      
      const startAnimationButton = screen.getByText('Start Animation');
      fireEvent.click(startAnimationButton);
      
      // Simulate performance drop
      const progressCallback = mockElectronAPI.onRecordingProgress.mock.calls[0][0];
      progressCallback({
        frames: 900,
        currentFps: 30, // Dropped to 30fps
        currentKbps: 5000,
        targetSize: '50MB',
        timemark: '00:00:30.00'
      });
      
      await waitFor(() => {
        expect(screen.getByText('FPS: 30.0')).toBeInTheDocument();
      });
    });
  });
});