export interface RecordingOptions {
  quality: '720p' | '1080p' | '4K';
  frameRate: 30 | 60;
  codec: 'h264' | 'h265';
  outputFormat: 'mp4' | 'mov' | 'avi';
  audioEnabled: boolean;
  outputPath?: string;
}

export interface RecordingStatus {
  isRecording: boolean;
  startTime?: Date;
  duration?: number;
  outputPath?: string;
  error?: string;
}

export interface RecordingProgress {
  frames: number;
  currentFps: number;
  currentKbps: number;
  targetSize: string;
  timemark: string;
  percent?: number;
}

export interface RecordingService {
  startRecording(options: RecordingOptions): Promise<void>;
  stopRecording(): Promise<string>; // Returns file path
  isRecording(): boolean;
  getStatus(): RecordingStatus;
  onProgress(callback: (progress: RecordingProgress) => void): void;
  onError(callback: (error: Error) => void): void;
}

export const DEFAULT_RECORDING_OPTIONS: RecordingOptions = {
  quality: '1080p',
  frameRate: 60,
  codec: 'h264',
  outputFormat: 'mp4',
  audioEnabled: false
};

export const QUALITY_SETTINGS = {
  '720p': { width: 1280, height: 720 },
  '1080p': { width: 1920, height: 1080 },
  '4K': { width: 3840, height: 2160 }
};