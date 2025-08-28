import React, { useState, useEffect } from 'react';
import { 
  RecordingOptions, 
  RecordingStatus, 
  RecordingProgress,
  DEFAULT_RECORDING_OPTIONS 
} from '../../types/recording';

interface RecordingControlsProps {
  raffleName?: string;
  onStartRecording?: (options: RecordingOptions) => void;
  onStopRecording?: () => void;
  disabled?: boolean;
}

export const RecordingControls: React.FC<RecordingControlsProps> = ({
  raffleName,
  onStartRecording,
  onStopRecording,
  disabled = false
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingStatus, setRecordingStatus] = useState<RecordingStatus>({ isRecording: false });
  const [recordingProgress, setRecordingProgress] = useState<RecordingProgress | null>(null);
  const [options, setOptions] = useState<RecordingOptions>(DEFAULT_RECORDING_OPTIONS);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    // Listen for recording status updates from main process
    const handleRecordingStatus = (status: RecordingStatus) => {
      setRecordingStatus(status);
      setIsRecording(status.isRecording);
    };

    const handleRecordingProgress = (progress: RecordingProgress) => {
      setRecordingProgress(progress);
    };

    // Set up IPC listeners
    window.electronAPI?.onRecordingStatus?.(handleRecordingStatus);
    window.electronAPI?.onRecordingProgress?.(handleRecordingProgress);

    return () => {
      // Cleanup listeners
      window.electronAPI?.removeRecordingListeners?.();
    };
  }, []);

  const handleStartRecording = async () => {
    if (onStartRecording) {
      onStartRecording(options);
    } else {
      // Direct IPC call
      try {
        await window.electronAPI?.startRecording?.(options);
      } catch (error) {
        console.error('Failed to start recording:', error);
      }
    }
  };

  const handleStopRecording = async () => {
    if (onStopRecording) {
      onStopRecording();
    } else {
      // Direct IPC call
      try {
        const filePath = await window.electronAPI?.stopRecording?.();
        console.log('Recording saved to:', filePath);
      } catch (error) {
        console.error('Failed to stop recording:', error);
      }
    }
  };

  const formatDuration = (startTime?: Date): string => {
    if (!startTime) return '00:00';
    
    const now = new Date();
    const diff = Math.floor((now.getTime() - startTime.getTime()) / 1000);
    const minutes = Math.floor(diff / 60);
    const seconds = diff % 60;
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="recording-controls">
      <div className="recording-main-controls">
        {!isRecording ? (
          <button
            className="recording-btn recording-btn-start"
            onClick={handleStartRecording}
            disabled={disabled}
            title="Start Recording"
          >
            <span className="recording-icon">⏺</span>
            Start Recording
          </button>
        ) : (
          <button
            className="recording-btn recording-btn-stop"
            onClick={handleStopRecording}
            title="Stop Recording"
          >
            <span className="recording-icon recording-icon-pulse">⏹</span>
            Stop Recording
          </button>
        )}

        <button
          className="recording-btn recording-btn-settings"
          onClick={() => setShowSettings(!showSettings)}
          disabled={isRecording}
          title="Recording Settings"
        >
          ⚙️
        </button>
      </div>

      {isRecording && (
        <div className="recording-status">
          <div className="recording-indicator">
            <span className="recording-dot"></span>
            <span className="recording-text">
              Recording {raffleName ? `"${raffleName}"` : ''}
            </span>
            <span className="recording-duration">
              {formatDuration(recordingStatus.startTime)}
            </span>
          </div>

          {recordingProgress && (
            <div className="recording-progress">
              <div className="progress-item">
                <span>FPS: {recordingProgress.currentFps.toFixed(1)}</span>
              </div>
              <div className="progress-item">
                <span>Size: {recordingProgress.targetSize}</span>
              </div>
              <div className="progress-item">
                <span>Time: {recordingProgress.timemark}</span>
              </div>
              {recordingProgress.percent && (
                <div className="progress-item">
                  <span>Progress: {recordingProgress.percent.toFixed(1)}%</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {recordingStatus.error && (
        <div className="recording-error">
          <span className="error-icon">⚠️</span>
          <span className="error-text">{recordingStatus.error}</span>
        </div>
      )}

      {showSettings && !isRecording && (
        <div className="recording-settings">
          <h4>Recording Settings</h4>
          
          <div className="setting-group">
            <label>Quality:</label>
            <select
              value={options.quality}
              onChange={(e) => setOptions({
                ...options,
                quality: e.target.value as RecordingOptions['quality']
              })}
            >
              <option value="720p">720p (1280x720)</option>
              <option value="1080p">1080p (1920x1080)</option>
              <option value="4K">4K (3840x2160)</option>
            </select>
          </div>

          <div className="setting-group">
            <label>Frame Rate:</label>
            <select
              value={options.frameRate}
              onChange={(e) => setOptions({
                ...options,
                frameRate: parseInt(e.target.value) as RecordingOptions['frameRate']
              })}
            >
              <option value={30}>30 FPS</option>
              <option value={60}>60 FPS</option>
            </select>
          </div>

          <div className="setting-group">
            <label>Codec:</label>
            <select
              value={options.codec}
              onChange={(e) => setOptions({
                ...options,
                codec: e.target.value as RecordingOptions['codec']
              })}
            >
              <option value="h264">H.264 (Faster)</option>
              <option value="h265">H.265 (Smaller file)</option>
            </select>
          </div>

          <div className="setting-group">
            <label>Format:</label>
            <select
              value={options.outputFormat}
              onChange={(e) => setOptions({
                ...options,
                outputFormat: e.target.value as RecordingOptions['outputFormat']
              })}
            >
              <option value="mp4">MP4</option>
              <option value="mov">MOV</option>
              <option value="avi">AVI</option>
            </select>
          </div>

          <div className="setting-group">
            <label>
              <input
                type="checkbox"
                checked={options.audioEnabled}
                onChange={(e) => setOptions({
                  ...options,
                  audioEnabled: e.target.checked
                })}
              />
              Include Audio
            </label>
          </div>
        </div>
      )}
    </div>
  );
};