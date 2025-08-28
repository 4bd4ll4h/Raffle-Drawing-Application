import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import { EventEmitter } from "events";
import path from "path";
import fs from "fs/promises";
import {
  RecordingOptions,
  RecordingStatus,
  RecordingProgress,
  RecordingService as IRecordingService,
  QUALITY_SETTINGS,
  DEFAULT_RECORDING_OPTIONS,
} from "../../types/recording";

export class RecordingService
  extends EventEmitter
  implements IRecordingService
{
  private ffmpegCommand: ffmpeg.FfmpegCommand | null = null;
  private status: RecordingStatus = { isRecording: false };
  private progressCallback?: (progress: RecordingProgress) => void;
  private errorCallback?: (error: Error) => void;

  constructor() {
    super();
    // Set FFmpeg binary path
    if (ffmpegStatic) {
      ffmpeg.setFfmpegPath(ffmpegStatic);
    }
  }

  async startRecording(
    options: RecordingOptions = DEFAULT_RECORDING_OPTIONS
  ): Promise<void> {
    if (this.status.isRecording) {
      throw new Error("Recording is already in progress");
    }

    try {
      const outputPath = await this.generateOutputPath(options);
      const qualitySettings = QUALITY_SETTINGS[options.quality];

      // Ensure output directory exists
      await fs.mkdir(path.dirname(outputPath), { recursive: true });

      // Create FFmpeg command for screen recording
      this.ffmpegCommand = ffmpeg()
        .input("desktop") // Use desktop capture
        .inputFormat("gdigrab") // Windows screen capture format
        .inputOptions([
          "-framerate",
          options.frameRate.toString(),
          "-video_size",
          `${qualitySettings.width}x${qualitySettings.height}`,
          "-show_region",
          "1", // Show capture region
        ])
        .videoCodec(options.codec === "h264" ? "libx264" : "libx265")
        .outputOptions([
          "-preset",
          "ultrafast", // Fast encoding for real-time
          "-crf",
          "18", // High quality
          "-pix_fmt",
          "yuv420p", // Compatibility
        ])
        .format(options.outputFormat);

      // Add audio if enabled
      if (options.audioEnabled) {
        this.ffmpegCommand
          .input("audio=Microphone") // Default microphone
          .inputFormat("dshow")
          .audioCodec("aac")
          .audioBitrate("128k");
      } else {
        this.ffmpegCommand.noAudio();
      }

      // Set up progress monitoring
      this.ffmpegCommand
        .on("start", (commandLine) => {
          console.log("FFmpeg started with command:", commandLine);
          this.status = {
            isRecording: true,
            startTime: new Date(),
            outputPath,
          };
          this.emit("started", this.status);
        })
        .on("progress", (progress) => {
          const recordingProgress: RecordingProgress = {
            frames: progress.frames || 0,
            currentFps: progress.currentFps || 0,
            currentKbps: progress.currentKbps || 0,
            targetSize:
              typeof progress.targetSize === "number"
                ? `${progress.targetSize}kB`
                : progress.targetSize || "0kB",
            timemark: progress.timemark || "00:00:00.00",
            percent: progress.percent,
          };

          if (this.progressCallback) {
            this.progressCallback(recordingProgress);
          }
          this.emit("progress", recordingProgress);
        })
        .on("end", () => {
          console.log("Recording finished successfully");
          this.status = {
            isRecording: false,
            outputPath,
          };
          this.ffmpegCommand = null;
          this.emit("finished", outputPath);
        })
        .on("error", (error) => {
          console.error("Recording error:", error);
          this.status = {
            isRecording: false,
            error: error.message,
          };
          this.ffmpegCommand = null;

          if (this.errorCallback) {
            this.errorCallback(error);
          }
          this.emit("error", error);
        });

      // Start recording
      this.ffmpegCommand.save(outputPath);
    } catch (error) {
      this.status = {
        isRecording: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
      throw error;
    }
  }

  async stopRecording(): Promise<string> {
    if (!this.status.isRecording || !this.ffmpegCommand) {
      throw new Error("No recording in progress");
    }

    return new Promise((resolve, reject) => {
      const outputPath = this.status.outputPath;

      if (!outputPath) {
        reject(new Error("No output path available"));
        return;
      }

      // Set up one-time listeners for the stop operation
      const onEnd = () => {
        resolve(outputPath);
      };

      const onError = (error: Error) => {
        reject(error);
      };

      this.once("finished", onEnd);
      this.once("error", onError);

      // Send quit signal to FFmpeg
      this.ffmpegCommand!.kill("SIGTERM");
    });
  }

  isRecording(): boolean {
    return this.status.isRecording;
  }

  getStatus(): RecordingStatus {
    return { ...this.status };
  }

  onProgress(callback: (progress: RecordingProgress) => void): void {
    this.progressCallback = callback;
  }

  onError(callback: (error: Error) => void): void {
    this.errorCallback = callback;
  }

  private async generateOutputPath(options: RecordingOptions): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `recording-${timestamp}.${options.outputFormat}`;

    if (options.outputPath) {
      return path.join(options.outputPath, filename);
    }

    // Default to app-data/recordings directory
    const defaultPath = path.join(process.cwd(), "app-data", "recordings");
    return path.join(defaultPath, filename);
  }

  // Generate filename with raffle name and timestamp
  generateRaffleRecordingPath(
    raffleName: string,
    options: RecordingOptions
  ): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const sanitizedRaffleName = raffleName.replace(/[^a-zA-Z0-9-_]/g, "_");
    const filename = `${sanitizedRaffleName}-${timestamp}.${options.outputFormat}`;

    if (options.outputPath) {
      return path.join(options.outputPath, filename);
    }

    const defaultPath = path.join(process.cwd(), "app-data", "recordings");
    return path.join(defaultPath, filename);
  }

  // Platform-specific screen capture setup
  private setupPlatformCapture(
    command: ffmpeg.FfmpegCommand,
    options: RecordingOptions
  ): ffmpeg.FfmpegCommand {
    const qualitySettings = QUALITY_SETTINGS[options.quality];

    if (process.platform === "win32") {
      return command
        .input("desktop")
        .inputFormat("gdigrab")
        .inputOptions([
          "-framerate",
          options.frameRate.toString(),
          "-video_size",
          `${qualitySettings.width}x${qualitySettings.height}`,
        ]);
    } else if (process.platform === "darwin") {
      return command
        .input("1:0") // Main display
        .inputFormat("avfoundation")
        .inputOptions([
          "-framerate",
          options.frameRate.toString(),
          "-video_size",
          `${qualitySettings.width}x${qualitySettings.height}`,
        ]);
    } else {
      // Linux
      return command
        .input(":0.0")
        .inputFormat("x11grab")
        .inputOptions([
          "-framerate",
          options.frameRate.toString(),
          "-video_size",
          `${qualitySettings.width}x${qualitySettings.height}`,
        ]);
    }
  }
}
