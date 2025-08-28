import { useState, useEffect, useCallback, useRef } from "react";
import { MemoryManagementService } from "../services/MemoryManagementService";

export interface PerformanceOptimizationOptions {
  enableMemoryMonitoring: boolean;
  enableStreamingCSV: boolean;
  enableVirtualization: boolean;
  enableBulkOperations: boolean;
  memoryThresholds?: {
    warning: number;
    critical: number;
    cleanup: number;
  };
}

export interface PerformanceStats {
  memoryUsage: number;
  memoryTrend: "increasing" | "decreasing" | "stable";
  recommendations: string[];
  isOptimized: boolean;
}

export interface BulkTaskProgress {
  taskId: string;
  progress: number;
  status: "pending" | "running" | "completed" | "error" | "cancelled";
  title: string;
  subtitle?: string;
}

interface BulkTaskResult {
  success: boolean;
  error?: string;
  cancelled?: boolean;
}

export const usePerformanceOptimization = (
  options: PerformanceOptimizationOptions
) => {
  const [performanceStats, setPerformanceStats] = useState<PerformanceStats>({
    memoryUsage: 0,
    memoryTrend: "stable",
    recommendations: [],
    isOptimized: false,
  });

  const [bulkTasks, setBulkTasks] = useState<BulkTaskProgress[]>([]);
  const [isStreamingCSV, setIsStreamingCSV] = useState(false);
  const [streamingProgress, setStreamingProgress] = useState(0);

  const memoryServiceRef = useRef<MemoryManagementService | null>(null);

  // Initialize memory monitoring
  useEffect(() => {
    if (options.enableMemoryMonitoring) {
      memoryServiceRef.current = new MemoryManagementService({
        enableAutoCleanup: true,
        cleanupInterval: 30000,
        thresholds: options.memoryThresholds || {
          warning: 70,
          critical: 85,
          cleanup: 80,
        },
      });

      memoryServiceRef.current.setCallbacks({
        onWarning: (stats) => {
          console.warn("Memory usage warning:", stats);
          updatePerformanceStats();
        },
        onCritical: (stats) => {
          console.error("Critical memory usage:", stats);
          updatePerformanceStats();
        },
        onCleanup: (stats) => {
          console.log("Memory cleanup performed:", stats);
          updatePerformanceStats();
        },
      });

      // Initial stats update
      updatePerformanceStats();

      // Periodic stats update
      const interval = setInterval(updatePerformanceStats, 5000);

      return () => {
        clearInterval(interval);
        memoryServiceRef.current?.destroy();
      };
    }
  }, [options.enableMemoryMonitoring, options.memoryThresholds]);

  // Set up bulk operation listeners
  useEffect(() => {
    if (options.enableBulkOperations && window.electronAPI) {
      const handleProgress = (progress: any) => {
        setBulkTasks((prev) =>
          prev.map((task) =>
            task.taskId === progress.taskId
              ? {
                  ...task,
                  progress: progress.percentage,
                  subtitle: progress.currentItem,
                }
              : task
          )
        );
      };

      const handleResult = (result: any) => {
        setBulkTasks((prev) =>
          prev.map((task) =>
            task.taskId === result.taskId
              ? {
                  ...task,
                  progress: 100,
                  status: result.success ? "completed" : "error",
                  subtitle: result.success ? "Completed" : result.error,
                }
              : task
          )
        );
      };

      const handleError = (error: any) => {
        setBulkTasks((prev) =>
          prev.map((task) =>
            task.taskId === error.taskId
              ? { ...task, status: "error", subtitle: error.error }
              : task
          )
        );
      };

      window.electronAPI.onBulkProgress(handleProgress);
      window.electronAPI.onBulkResult(handleResult);
      window.electronAPI.onBulkError(handleError);

      return () => {
        window.electronAPI.removeBulkListeners();
      };
    }
  }, [options.enableBulkOperations]);

  const updatePerformanceStats = useCallback(() => {
    if (memoryServiceRef.current) {
      const report = memoryServiceRef.current.getMemoryReport();
      setPerformanceStats({
        memoryUsage: report.current.usedPercent,
        memoryTrend: report.trend,
        recommendations: report.recommendations,
        isOptimized: report.current.usedPercent < report.thresholds.warning,
      });
    }
  }, []);

  // Streaming CSV validation
  const validateCSVStreaming = useCallback(
    async (
      filePath: string,
      raffleId: string,
      onProgress?: (processed: number, total: number) => void
    ) => {
      if (!options.enableStreamingCSV || !window.electronAPI) {
        throw new Error("Streaming CSV is not enabled or not available");
      }

      setIsStreamingCSV(true);
      setStreamingProgress(0);

      try {
        const progressCallback = (processed: number, total: number) => {
          const percentage = total > 0 ? (processed / total) * 100 : 0;
          setStreamingProgress(percentage);
          onProgress?.(processed, total);
        };

        const result = await window.electronAPI.streamValidateCSV(
          filePath,
          raffleId,
          {
            batchSize: 1000,
            maxMemoryUsage: 100,
            progressCallback,
          }
        );

        return result;
      } finally {
        setIsStreamingCSV(false);
        setStreamingProgress(0);
      }
    },
    [options.enableStreamingCSV]
  );

  // Bulk task submission
  const submitBulkTask = useCallback(
    async (
      type: "csv_processing" | "export" | "validation" | "image_processing",
      data: any,
      title: string
    ) => {
      if (!options.enableBulkOperations || !window.electronAPI) {
        throw new Error("Bulk operations are not enabled or not available");
      }

      const taskId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const task = {
        id: taskId,
        type,
        data,
        options: {
          batchSize: 1000,
          priority: "normal" as const,
        },
      };

      // Add to local state
      setBulkTasks((prev) => [
        ...prev,
        {
          taskId,
          progress: 0,
          status: "pending",
          title,
        },
      ]);

      try {
        const result = (await window.electronAPI.submitBulkTask(
          task
        )) as unknown as BulkTaskResult;

        if (result.success) {
          setBulkTasks((prev) =>
            prev.map((t) =>
              t.taskId === taskId ? { ...t, status: "running" } : t
            )
          );
          return taskId;
        } else {
          const errorMessage =
            (result as any).error || "Unknown error occurred";
          setBulkTasks((prev) =>
            prev.map((t) =>
              t.taskId === taskId
                ? { ...t, status: "error", subtitle: errorMessage }
                : t
            )
          );
          throw new Error(errorMessage);
        }
      } catch (error) {
        setBulkTasks((prev) => prev.filter((t) => t.taskId !== taskId));
        throw error;
      }
    },
    [options.enableBulkOperations]
  );

  // Cancel bulk task
  const cancelBulkTask = useCallback(
    async (taskId: string) => {
      if (!options.enableBulkOperations || !window.electronAPI) {
        return false;
      }

      try {
        const result = (await window.electronAPI.cancelBulkTask(
          taskId
        )) as unknown as BulkTaskResult;

        if (result.success && result.cancelled) {
          setBulkTasks((prev) =>
            prev.map((task) =>
              task.taskId === taskId ? { ...task, status: "cancelled" } : task
            )
          );
          return true;
        }
        return false;
      } catch (error) {
        console.error("Failed to cancel bulk task:", error);
        return false;
      }
    },
    [options.enableBulkOperations]
  );

  // Cancel all bulk tasks
  const cancelAllBulkTasks = useCallback(async () => {
    const runningTasks = bulkTasks.filter((task) => task.status === "running");
    const cancelPromises = runningTasks.map((task) =>
      cancelBulkTask(task.taskId)
    );

    const results = await Promise.all(cancelPromises);
    return results.every((result) => result);
  }, [bulkTasks, cancelBulkTask]);

  // Force memory optimization
  const optimizeMemory = useCallback(() => {
    if (memoryServiceRef.current) {
      memoryServiceRef.current.optimizeMemory();
      updatePerformanceStats();
    }
  }, [updatePerformanceStats]);

  // Get participant count with streaming
  const getParticipantCountStreaming = useCallback(
    async (filePath: string) => {
      if (!options.enableStreamingCSV || !window.electronAPI) {
        throw new Error("Streaming CSV is not enabled or not available");
      }

      const result = (await window.electronAPI.getParticipantCountStreaming(
        filePath
      )) as any;
      return result.success ? result.result : null;
    },
    [options.enableStreamingCSV]
  );

  return {
    // Performance stats
    performanceStats,

    // Streaming CSV
    isStreamingCSV,
    streamingProgress,
    validateCSVStreaming,
    getParticipantCountStreaming,

    // Bulk operations
    bulkTasks,
    submitBulkTask,
    cancelBulkTask,
    cancelAllBulkTasks,

    // Memory management
    optimizeMemory,

    // Utilities
    updatePerformanceStats,
  };
};
