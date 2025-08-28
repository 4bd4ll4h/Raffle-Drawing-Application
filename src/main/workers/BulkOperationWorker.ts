import { EventEmitter } from "events";
import { ChildProcess, fork } from "child_process";
import * as path from "path";

export interface BulkOperationTask {
  id: string;
  type: "csv_processing" | "export" | "validation" | "image_processing";
  data: any;
  options?: {
    batchSize?: number;
    priority?: "low" | "normal" | "high";
    timeout?: number;
  };
}

export interface BulkOperationResult {
  taskId: string;
  success: boolean;
  data?: any;
  error?: string;
  progress: number;
  completed: boolean;
}

export interface BulkOperationProgress {
  taskId: string;
  processed: number;
  total: number;
  percentage: number;
  currentItem?: string;
  estimatedTimeRemaining?: number;
}

export class BulkOperationWorker extends EventEmitter {
  private workers: Map<string, ChildProcess> = new Map();
  private tasks: Map<string, BulkOperationTask> = new Map();
  private maxWorkers: number;
  private activeWorkers: number = 0;

  constructor(maxWorkers: number = 4) {
    super();
    this.maxWorkers = Math.min(maxWorkers, require("os").cpus().length);
  }

  /**
   * Submit a bulk operation task
   */
  async submitTask(task: BulkOperationTask): Promise<string> {
    this.tasks.set(task.id, task);

    if (this.activeWorkers < this.maxWorkers) {
      await this.startWorker(task);
    }

    return task.id;
  }

  /**
   * Cancel a running task
   */
  async cancelTask(taskId: string): Promise<boolean> {
    const worker = this.workers.get(taskId);
    if (worker) {
      worker.kill("SIGTERM");
      this.workers.delete(taskId);
      this.tasks.delete(taskId);
      this.activeWorkers--;

      this.emit("taskCancelled", { taskId });
      return true;
    }
    return false;
  }

  /**
   * Get task status
   */
  getTaskStatus(
    taskId: string
  ): "pending" | "running" | "completed" | "cancelled" | "error" {
    if (!this.tasks.has(taskId)) {
      return "cancelled";
    }

    if (this.workers.has(taskId)) {
      return "running";
    }

    return "pending";
  }

  /**
   * Get all active tasks
   */
  getActiveTasks(): string[] {
    return Array.from(this.workers.keys());
  }

  /**
   * Shutdown all workers
   */
  async shutdown(): Promise<void> {
    const terminationPromises = Array.from(this.workers.values()).map(
      (worker) =>
        new Promise<void>((resolve) => {
          worker.on("exit", () => resolve());
          worker.kill("SIGTERM");
        })
    );

    await Promise.all(terminationPromises);

    this.workers.clear();
    this.tasks.clear();
    this.activeWorkers = 0;
  }

  /**
   * Start a worker for a task
   */
  private async startWorker(task: BulkOperationTask): Promise<void> {
    // For now, just process tasks in the main thread to avoid worker thread issues
    // In a real implementation, you would use child processes or worker threads
    this.activeWorkers++;

    try {
      await this.processTaskInMainThread(task);
    } catch (error) {
      this.emit("error", {
        taskId: task.id,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      this.cleanupWorker(task.id);
    }
  }

  /**
   * Process task in main thread (simplified for testing)
   */
  private async processTaskInMainThread(
    task: BulkOperationTask
  ): Promise<void> {
    const sendProgress = (
      processed: number,
      total: number,
      currentItem?: string
    ) => {
      const progress: BulkOperationProgress = {
        taskId: task.id,
        processed,
        total,
        percentage: Math.round((processed / total) * 100),
        currentItem,
        estimatedTimeRemaining:
          total > 0
            ? ((total - processed) / processed) * Date.now()
            : undefined,
      };

      this.emit("progress", progress);
    };

    const sendResult = (success: boolean, data?: any, error?: string) => {
      const result: BulkOperationResult = {
        taskId: task.id,
        success,
        data,
        error,
        progress: 100,
        completed: true,
      };

      this.emit("result", result);
    };

    // Simulate processing based on task type
    switch (task.type) {
      case "csv_processing":
        await this.processCsvTask(task, sendProgress, sendResult);
        break;

      case "export":
        await this.processExportTask(task, sendProgress, sendResult);
        break;

      case "validation":
        await this.processValidationTask(task, sendProgress, sendResult);
        break;

      case "image_processing":
        await this.processImageTask(task, sendProgress, sendResult);
        break;

      default:
        throw new Error(`Unknown task type: ${task.type}`);
    }
  }

  /**
   * Cleanup worker resources
   */
  private cleanupWorker(taskId: string): void {
    this.workers.delete(taskId);
    this.tasks.delete(taskId);
    this.activeWorkers--;

    // Start next pending task if any
    const pendingTask = Array.from(this.tasks.values()).find(
      (task) => !this.workers.has(task.id)
    );

    if (pendingTask && this.activeWorkers < this.maxWorkers) {
      this.startWorker(pendingTask);
    }
  }

  /**
   * Task processors
   */
  private async processCsvTask(
    task: BulkOperationTask,
    sendProgress: (
      processed: number,
      total: number,
      currentItem?: string
    ) => void,
    sendResult: (success: boolean, data?: any, error?: string) => void
  ): Promise<void> {
    const { filePath, raffleId, batchSize = 1000 } = task.data;

    try {
      // Import required modules
      const { StreamingCSVService } = await import(
        "../services/StreamingCSVService"
      );
      const streamingService = new StreamingCSVService();

      const results: any[] = [];
      let totalProcessed = 0;

      const generator = streamingService.streamParticipants(
        filePath,
        raffleId,
        { batchSize }
      );

      for await (const batch of generator) {
        if (batch.cancelled) {
          sendResult(false, undefined, "Task was cancelled");
          return;
        }

        results.push(...batch.data);
        totalProcessed = batch.totalProcessed;

        sendProgress(
          totalProcessed,
          -1,
          `Processing batch ${Math.ceil(totalProcessed / batchSize)}`
        );
      }

      sendResult(true, { participants: results, totalProcessed });
    } catch (error) {
      sendResult(
        false,
        undefined,
        error instanceof Error ? error.message : "CSV processing failed"
      );
    }
  }

  private async processExportTask(
    task: BulkOperationTask,
    sendProgress: (
      processed: number,
      total: number,
      currentItem?: string
    ) => void,
    sendResult: (success: boolean, data?: any, error?: string) => void
  ): Promise<void> {
    const { raffles, outputPath, format } = task.data;
    const total = raffles.length;

    try {
      const results = [];

      for (let i = 0; i < raffles.length; i++) {
        const raffle = raffles[i];
        sendProgress(i, total, `Exporting ${raffle.name}`);

        // Simulate export processing
        await new Promise((resolve) => setTimeout(resolve, 100));

        results.push({
          raffleId: raffle.id,
          exported: true,
          filePath: `${outputPath}/${raffle.name}.${format}`,
        });
      }

      sendResult(true, { exports: results });
    } catch (error) {
      sendResult(
        false,
        undefined,
        error instanceof Error ? error.message : "Export failed"
      );
    }
  }

  private async processValidationTask(
    task: BulkOperationTask,
    sendProgress: (
      processed: number,
      total: number,
      currentItem?: string
    ) => void,
    sendResult: (success: boolean, data?: any, error?: string) => void
  ): Promise<void> {
    const { files } = task.data;
    const total = files.length;

    try {
      const results = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        sendProgress(i, total, `Validating ${file.name}`);

        // Simulate validation
        await new Promise((resolve) => setTimeout(resolve, 200));

        results.push({
          fileName: file.name,
          valid: Math.random() > 0.1, // 90% success rate
          errors: Math.random() > 0.8 ? ["Sample error"] : [],
        });
      }

      sendResult(true, { validations: results });
    } catch (error) {
      sendResult(
        false,
        undefined,
        error instanceof Error ? error.message : "Validation failed"
      );
    }
  }

  private async processImageTask(
    task: BulkOperationTask,
    sendProgress: (
      processed: number,
      total: number,
      currentItem?: string
    ) => void,
    sendResult: (success: boolean, data?: any, error?: string) => void
  ): Promise<void> {
    const { imageUrls, options } = task.data;
    const total = imageUrls.length;

    try {
      const results = [];

      for (let i = 0; i < imageUrls.length; i++) {
        const url = imageUrls[i];
        sendProgress(i, total, `Processing ${url}`);

        // Simulate image processing
        await new Promise((resolve) => setTimeout(resolve, 300));

        results.push({
          url,
          processed: true,
          size: { width: 100, height: 100 },
        });
      }

      sendResult(true, { images: results });
    } catch (error) {
      sendResult(
        false,
        undefined,
        error instanceof Error ? error.message : "Image processing failed"
      );
    }
  }
}
