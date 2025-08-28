import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
} from "react";
import {
  Raffle,
  Participant,
  Drawing,
  RaffleConfig,
  AnimationStyle,
  RecordingOptions,
  ExportOptions,
  BulkOperationResult,
} from "../../types";
import { RecordingProgress } from "../../types/recording";
import { message } from "antd";

// ============================================================================
// WORKFLOW STATE TYPES
// ============================================================================

export type WorkflowStep =
  | "dashboard"
  | "configuration"
  | "animation"
  | "results"
  | "export";

export interface WorkflowState {
  // Current workflow state
  currentStep: WorkflowStep;
  currentRaffle: Raffle | null;
  participants: Participant[];
  winner: Participant | null;
  drawing: Drawing | null;

  // Loading states
  loading: {
    raffles: boolean;
    participants: boolean;
    animation: boolean;
    recording: boolean;
    export: boolean;
    saving: boolean;
  };

  // Error states
  errors: {
    raffles: string | null;
    participants: string | null;
    animation: string | null;
    recording: string | null;
    export: string | null;
    saving: string | null;
  };

  // Progress tracking
  progress: {
    animation: number;
    recording: number;
    export: number;
  };

  // Recording state
  recording: {
    isActive: boolean;
    filePath: string | null;
    options: RecordingOptions | null;
  };

  // Export state
  export: {
    history: any[];
    lastExportPath: string | null;
  };

  // UI state
  ui: {
    sidebarCollapsed: boolean;
    theme: "light" | "dark";
    notifications: boolean;
  };
}

export type WorkflowAction =
  // Navigation actions
  | { type: "NAVIGATE_TO_STEP"; payload: WorkflowStep }
  | { type: "GO_BACK" }
  | { type: "RESET_WORKFLOW" }

  // Raffle actions
  | { type: "SET_CURRENT_RAFFLE"; payload: Raffle | null }
  | { type: "UPDATE_RAFFLE"; payload: Partial<Raffle> }

  // Participant actions
  | { type: "SET_PARTICIPANTS"; payload: Participant[] }
  | { type: "CLEAR_PARTICIPANTS" }

  // Drawing actions
  | { type: "SET_WINNER"; payload: Participant }
  | { type: "SET_DRAWING"; payload: Drawing }
  | { type: "CLEAR_DRAWING" }

  // Loading actions
  | {
      type: "SET_LOADING";
      payload: { key: keyof WorkflowState["loading"]; value: boolean };
    }
  | {
      type: "SET_ERROR";
      payload: { key: keyof WorkflowState["errors"]; value: string | null };
    }
  | {
      type: "SET_PROGRESS";
      payload: { key: keyof WorkflowState["progress"]; value: number };
    }

  // Recording actions
  | { type: "START_RECORDING"; payload: RecordingOptions }
  | { type: "STOP_RECORDING"; payload: string | null }
  | { type: "SET_RECORDING_PROGRESS"; payload: number }

  // Export actions
  | { type: "SET_EXPORT_HISTORY"; payload: any[] }
  | { type: "ADD_EXPORT_ENTRY"; payload: any }
  | { type: "SET_LAST_EXPORT_PATH"; payload: string }

  // UI actions
  | { type: "TOGGLE_SIDEBAR" }
  | { type: "SET_THEME"; payload: "light" | "dark" }
  | { type: "TOGGLE_NOTIFICATIONS" };

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState: WorkflowState = {
  currentStep: "dashboard",
  currentRaffle: null,
  participants: [],
  winner: null,
  drawing: null,

  loading: {
    raffles: false,
    participants: false,
    animation: false,
    recording: false,
    export: false,
    saving: false,
  },

  errors: {
    raffles: null,
    participants: null,
    animation: null,
    recording: null,
    export: null,
    saving: null,
  },

  progress: {
    animation: 0,
    recording: 0,
    export: 0,
  },

  recording: {
    isActive: false,
    filePath: null,
    options: null,
  },

  export: {
    history: [],
    lastExportPath: null,
  },

  ui: {
    sidebarCollapsed: false,
    theme: "light",
    notifications: true,
  },
};

// ============================================================================
// REDUCER
// ============================================================================

function workflowReducer(
  state: WorkflowState,
  action: WorkflowAction
): WorkflowState {
  switch (action.type) {
    case "NAVIGATE_TO_STEP":
      return {
        ...state,
        currentStep: action.payload,
      };

    case "GO_BACK":
      const stepOrder: WorkflowStep[] = [
        "dashboard",
        "configuration",
        "animation",
        "results",
        "export",
      ];
      const currentIndex = stepOrder.indexOf(state.currentStep);
      const previousStep =
        currentIndex > 0 ? stepOrder[currentIndex - 1] : "dashboard";
      return {
        ...state,
        currentStep: previousStep,
      };

    case "RESET_WORKFLOW":
      return {
        ...initialState,
        ui: state.ui, // Preserve UI settings
      };

    case "SET_CURRENT_RAFFLE":
      return {
        ...state,
        currentRaffle: action.payload,
      };

    case "UPDATE_RAFFLE":
      return {
        ...state,
        currentRaffle: state.currentRaffle
          ? {
              ...state.currentRaffle,
              ...action.payload,
            }
          : null,
      };

    case "SET_PARTICIPANTS":
      return {
        ...state,
        participants: action.payload,
      };

    case "CLEAR_PARTICIPANTS":
      return {
        ...state,
        participants: [],
      };

    case "SET_WINNER":
      return {
        ...state,
        winner: action.payload,
      };

    case "SET_DRAWING":
      return {
        ...state,
        drawing: action.payload,
      };

    case "CLEAR_DRAWING":
      return {
        ...state,
        winner: null,
        drawing: null,
      };

    case "SET_LOADING":
      return {
        ...state,
        loading: {
          ...state.loading,
          [action.payload.key]: action.payload.value,
        },
      };

    case "SET_ERROR":
      return {
        ...state,
        errors: {
          ...state.errors,
          [action.payload.key]: action.payload.value,
        },
      };

    case "SET_PROGRESS":
      return {
        ...state,
        progress: {
          ...state.progress,
          [action.payload.key]: action.payload.value,
        },
      };

    case "START_RECORDING":
      return {
        ...state,
        recording: {
          isActive: true,
          filePath: null,
          options: action.payload,
        },
      };

    case "STOP_RECORDING":
      return {
        ...state,
        recording: {
          ...state.recording,
          isActive: false,
          filePath: action.payload,
        },
      };

    case "SET_RECORDING_PROGRESS":
      return {
        ...state,
        progress: {
          ...state.progress,
          recording: action.payload,
        },
      };

    case "SET_EXPORT_HISTORY":
      return {
        ...state,
        export: {
          ...state.export,
          history: action.payload,
        },
      };

    case "ADD_EXPORT_ENTRY":
      return {
        ...state,
        export: {
          ...state.export,
          history: [...state.export.history, action.payload],
        },
      };

    case "SET_LAST_EXPORT_PATH":
      return {
        ...state,
        export: {
          ...state.export,
          lastExportPath: action.payload,
        },
      };

    case "TOGGLE_SIDEBAR":
      return {
        ...state,
        ui: {
          ...state.ui,
          sidebarCollapsed: !state.ui.sidebarCollapsed,
        },
      };

    case "SET_THEME":
      return {
        ...state,
        ui: {
          ...state.ui,
          theme: action.payload,
        },
      };

    case "TOGGLE_NOTIFICATIONS":
      return {
        ...state,
        ui: {
          ...state.ui,
          notifications: !state.ui.notifications,
        },
      };

    default:
      return state;
  }
}

// ============================================================================
// CONTEXT
// ============================================================================

interface WorkflowContextType {
  state: WorkflowState;
  dispatch: React.Dispatch<WorkflowAction>;

  // Navigation helpers
  navigateToStep: (step: WorkflowStep) => void;
  goBack: () => void;
  resetWorkflow: () => void;

  // Workflow actions
  startNewRaffle: () => void;
  editRaffle: (raffle: Raffle) => void;
  saveRaffleConfig: (config: RaffleConfig) => Promise<void>;
  loadParticipants: (csvFilePath: string) => Promise<void>;
  startDrawing: () => Promise<void>;
  completeDrawing: (winner: Participant) => Promise<void>;
  exportResults: (options: ExportOptions) => Promise<void>;

  // Recording actions
  startRecording: (options: RecordingOptions) => Promise<void>;
  stopRecording: () => Promise<string | null>;

  // Utility functions
  showNotification: (
    title: string,
    message: string,
    type?: "success" | "error" | "warning" | "info"
  ) => void;
  clearError: (key: keyof WorkflowState["errors"]) => void;
  setLoading: (key: keyof WorkflowState["loading"], value: boolean) => void;
}

const WorkflowContext = createContext<WorkflowContextType | undefined>(
  undefined
);

// ============================================================================
// PROVIDER COMPONENT
// ============================================================================

interface WorkflowProviderProps {
  children: React.ReactNode;
}

export const WorkflowProvider: React.FC<WorkflowProviderProps> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(workflowReducer, initialState);

  // ============================================================================
  // NAVIGATION HELPERS
  // ============================================================================

  const navigateToStep = useCallback((step: WorkflowStep) => {
    dispatch({ type: "NAVIGATE_TO_STEP", payload: step });
  }, []);

  const goBack = useCallback(() => {
    dispatch({ type: "GO_BACK" });
  }, []);

  const resetWorkflow = useCallback(() => {
    dispatch({ type: "RESET_WORKFLOW" });
  }, []);

  // ============================================================================
  // WORKFLOW ACTIONS
  // ============================================================================

  const startNewRaffle = useCallback(() => {
    dispatch({ type: "RESET_WORKFLOW" });
    dispatch({ type: "NAVIGATE_TO_STEP", payload: "configuration" });
  }, []);

  const editRaffle = useCallback((raffle: Raffle) => {
    dispatch({ type: "SET_CURRENT_RAFFLE", payload: raffle });
    dispatch({ type: "NAVIGATE_TO_STEP", payload: "configuration" });
  }, []);

  const saveRaffleConfig = useCallback(
    async (config: RaffleConfig) => {
      dispatch({
        type: "SET_LOADING",
        payload: { key: "saving", value: true },
      });
      dispatch({ type: "SET_ERROR", payload: { key: "saving", value: null } });

      try {
        // Create or update raffle
        const raffleData = {
          name: config.name,
          animationStyle: config.animationStyle,
          customSettings: {
            colorScheme: config.colorScheme,
            logoPosition: config.logoPosition,
            animationDuration: config.animationDuration || 5000,
            soundEnabled: config.soundEnabled || true,
          },
          status: "draft" as const,
          participantCount: 0,
          createdDate: new Date(),
          modifiedDate: new Date(),
        };

        let savedRaffle: Raffle;

        if (state.currentRaffle) {
          // Update existing raffle
          const result = await window.electronAPI.updateRaffle(
            state.currentRaffle.id,
            raffleData
          );
          if (!result.success) {
            throw new Error(result.error || "Failed to update raffle");
          }
          savedRaffle = result.data;
        } else {
          // Create new raffle
          const result = await window.electronAPI.createRaffle(raffleData);
          if (!result.success) {
            throw new Error(result.error || "Failed to create raffle");
          }
          savedRaffle = result.data;
        }

        // Save background image if provided
        if (config.backgroundImage) {
          const imageBuffer = await config.backgroundImage.arrayBuffer();
          const result = await window.electronAPI.saveBackgroundImage(
            savedRaffle.id,
            Buffer.from(imageBuffer),
            config.backgroundImage.name
          );

          if (result.success) {
            savedRaffle.backgroundImagePath = result.data;
          }
        }

        // Save CSV file and load participants if provided
        if (config.csvFile) {
          const csvContent = await config.csvFile.text();
          const saveResult = await window.electronAPI.saveCSVFile(
            savedRaffle.id,
            csvContent
          );

          if (!saveResult.success) {
            throw new Error(saveResult.error || "Failed to save CSV file");
          }

          savedRaffle.csvFilePath = saveResult.data;

          // Load participants
          const participantsResult = await window.electronAPI.loadParticipants(
            saveResult.data
          );
          if (participantsResult.success) {
            dispatch({
              type: "SET_PARTICIPANTS",
              payload: participantsResult.data,
            });
            savedRaffle.participantCount = participantsResult.data.length;
            savedRaffle.status = "ready";

            // Update raffle with participant count and status
            await window.electronAPI.updateRaffle(savedRaffle.id, {
              participantCount: savedRaffle.participantCount,
              status: savedRaffle.status,
            });
          }
        }

        dispatch({ type: "SET_CURRENT_RAFFLE", payload: savedRaffle });

        showNotification(
          "Success",
          "Raffle configuration saved successfully!",
          "success"
        );

        // Navigate to dashboard or animation based on whether we have participants
        if (savedRaffle.participantCount > 0) {
          dispatch({ type: "NAVIGATE_TO_STEP", payload: "dashboard" });
        } else {
          dispatch({ type: "NAVIGATE_TO_STEP", payload: "dashboard" });
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to save raffle configuration";
        dispatch({
          type: "SET_ERROR",
          payload: { key: "saving", value: errorMessage },
        });
        showNotification("Error", errorMessage, "error");
      } finally {
        dispatch({
          type: "SET_LOADING",
          payload: { key: "saving", value: false },
        });
      }
    },
    [state.currentRaffle]
  );

  const loadParticipants = useCallback(
    async (csvFilePath: string) => {
      dispatch({
        type: "SET_LOADING",
        payload: { key: "participants", value: true },
      });
      dispatch({
        type: "SET_ERROR",
        payload: { key: "participants", value: null },
      });

      try {
        const result = await window.electronAPI.loadParticipants(csvFilePath);

        if (!result.success) {
          throw new Error(result.error || "Failed to load participants");
        }

        dispatch({ type: "SET_PARTICIPANTS", payload: result.data });

        // Update current raffle with participant count
        if (state.currentRaffle) {
          const updatedRaffle = {
            ...state.currentRaffle,
            participantCount: result.data.length,
            status: "ready" as const,
          };

          await window.electronAPI.updateRaffle(state.currentRaffle.id, {
            participantCount: updatedRaffle.participantCount,
            status: updatedRaffle.status,
          });

          dispatch({ type: "SET_CURRENT_RAFFLE", payload: updatedRaffle });
        }

        showNotification(
          "Success",
          `Loaded ${result.data.length} participants successfully!`,
          "success"
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to load participants";
        dispatch({
          type: "SET_ERROR",
          payload: { key: "participants", value: errorMessage },
        });
        showNotification("Error", errorMessage, "error");
      } finally {
        dispatch({
          type: "SET_LOADING",
          payload: { key: "participants", value: false },
        });
      }
    },
    [state.currentRaffle]
  );

  const startDrawing = useCallback(async () => {
    if (!state.currentRaffle || state.participants.length === 0) {
      showNotification(
        "Error",
        "No raffle or participants available for drawing",
        "error"
      );
      return;
    }

    dispatch({
      type: "SET_LOADING",
      payload: { key: "animation", value: true },
    });
    dispatch({ type: "SET_ERROR", payload: { key: "animation", value: null } });

    try {
      // Select winner using Random.org or fallback
      const winnerResult = await window.electronAPI.selectWinner(
        state.participants
      );

      if (!winnerResult.success) {
        throw new Error(winnerResult.error || "Failed to select winner");
      }

      const winner = winnerResult.data.winner;
      dispatch({ type: "SET_WINNER", payload: winner });

      // Assign rarities to all participants
      const raritiesResult = await window.electronAPI.assignRarities(
        state.participants
      );
      if (raritiesResult.success) {
        dispatch({ type: "SET_PARTICIPANTS", payload: raritiesResult.data });
      }

      // Navigate to animation step
      dispatch({ type: "NAVIGATE_TO_STEP", payload: "animation" });

      showNotification(
        "Success",
        `Winner selected: ${winner.username}`,
        "success"
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to start drawing";
      dispatch({
        type: "SET_ERROR",
        payload: { key: "animation", value: errorMessage },
      });
      showNotification("Error", errorMessage, "error");
    } finally {
      dispatch({
        type: "SET_LOADING",
        payload: { key: "animation", value: false },
      });
    }
  }, [state.currentRaffle, state.participants]);

  const completeDrawing = useCallback(
    async (winner: Participant) => {
      if (!state.currentRaffle) {
        showNotification("Error", "No raffle available", "error");
        return;
      }

      dispatch({
        type: "SET_LOADING",
        payload: { key: "saving", value: true },
      });

      try {
        // Create drawing record
        const drawing: Omit<Drawing, "id"> = {
          raffleId: state.currentRaffle.id,
          winnerId: winner.id,
          winnerUsername: winner.username,
          winnerTicketNumber: winner.ticketNumber,
          drawTimestamp: new Date(),
          randomOrgVerification: undefined, // Will be set by the service
          recordingFilePath: state.recording.filePath || undefined,
          drawSettings: {
            recordingEnabled: state.recording.isActive,
            recordingQuality: state.recording.options?.quality || "1080p",
            animationStyle: state.currentRaffle.animationStyle,
          },
        };

        const result = await window.electronAPI.recordDrawing(drawing);

        if (!result.success) {
          throw new Error(result.error || "Failed to record drawing");
        }

        dispatch({ type: "SET_DRAWING", payload: result.data });

        // Update raffle status to completed
        const updatedRaffle = {
          ...state.currentRaffle,
          status: "completed" as const,
          modifiedDate: new Date(),
        };

        await window.electronAPI.updateRaffle(state.currentRaffle.id, {
          status: updatedRaffle.status,
          modifiedDate: updatedRaffle.modifiedDate,
        });

        dispatch({ type: "SET_CURRENT_RAFFLE", payload: updatedRaffle });

        // Navigate to results
        dispatch({ type: "NAVIGATE_TO_STEP", payload: "results" });

        showNotification(
          "Success",
          "Drawing completed successfully!",
          "success"
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to complete drawing";
        dispatch({
          type: "SET_ERROR",
          payload: { key: "saving", value: errorMessage },
        });
        showNotification("Error", errorMessage, "error");
      } finally {
        dispatch({
          type: "SET_LOADING",
          payload: { key: "saving", value: false },
        });
      }
    },
    [state.currentRaffle, state.recording]
  );

  const exportResults = useCallback(
    async (options: ExportOptions) => {
      if (!state.currentRaffle || !state.drawing) {
        showNotification("Error", "No drawing results to export", "error");
        return;
      }

      dispatch({
        type: "SET_LOADING",
        payload: { key: "export", value: true },
      });
      dispatch({ type: "SET_ERROR", payload: { key: "export", value: null } });

      try {
        const result = await window.electronAPI.exportRaffleResults(
          state.currentRaffle.id,
          options.outputPath,
          options
        );

        if (!result.success) {
          throw new Error(result.error || "Failed to export results");
        }

        dispatch({ type: "SET_LAST_EXPORT_PATH", payload: result.filePath });
        dispatch({
          type: "ADD_EXPORT_ENTRY",
          payload: {
            id: Date.now().toString(),
            raffleId: state.currentRaffle.id,
            raffleName: state.currentRaffle.name,
            exportDate: new Date(),
            filePath: result.filePath,
            format: options.format,
          },
        });

        showNotification(
          "Success",
          `Results exported to ${result.filePath}`,
          "success"
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to export results";
        dispatch({
          type: "SET_ERROR",
          payload: { key: "export", value: errorMessage },
        });
        showNotification("Error", errorMessage, "error");
      } finally {
        dispatch({
          type: "SET_LOADING",
          payload: { key: "export", value: false },
        });
      }
    },
    [state.currentRaffle, state.drawing]
  );

  // ============================================================================
  // RECORDING ACTIONS
  // ============================================================================

  const startRecording = useCallback(async (options: RecordingOptions) => {
    dispatch({
      type: "SET_LOADING",
      payload: { key: "recording", value: true },
    });
    dispatch({ type: "SET_ERROR", payload: { key: "recording", value: null } });

    try {
      const result = await window.electronAPI.startRecording(options);

      if (!result.success) {
        throw new Error(result.error || "Failed to start recording");
      }

      dispatch({ type: "START_RECORDING", payload: options });
      showNotification("Success", "Recording started", "success");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to start recording";
      dispatch({
        type: "SET_ERROR",
        payload: { key: "recording", value: errorMessage },
      });
      showNotification("Error", errorMessage, "error");
    } finally {
      dispatch({
        type: "SET_LOADING",
        payload: { key: "recording", value: false },
      });
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    dispatch({
      type: "SET_LOADING",
      payload: { key: "recording", value: true },
    });

    try {
      const result = await window.electronAPI.stopRecording();

      if (!result.success) {
        throw new Error(result.error || "Failed to stop recording");
      }

      const filePath = result.filePath || null;
      dispatch({ type: "STOP_RECORDING", payload: filePath });

      if (filePath) {
        showNotification(
          "Success",
          `Recording saved to ${filePath}`,
          "success"
        );
      }

      return filePath;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to stop recording";
      dispatch({
        type: "SET_ERROR",
        payload: { key: "recording", value: errorMessage },
      });
      showNotification("Error", errorMessage, "error");
      return null;
    } finally {
      dispatch({
        type: "SET_LOADING",
        payload: { key: "recording", value: false },
      });
    }
  }, []);

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  const showNotification = useCallback(
    (
      title: string,
      content: string,
      type: "success" | "error" | "warning" | "info" = "info"
    ) => {
      if (!state.ui.notifications) return;

      switch (type) {
        case "success":
          message.success(content);
          break;
        case "error":
          message.error(content);
          break;
        case "warning":
          message.warning(content);
          break;
        default:
          message.info(content);
          break;
      }

      // Also show system notification for important events
      if (type === "success" || type === "error") {
        window.electronAPI?.showNotification?.({
          title,
          body: content,
        });
      }
    },
    [state.ui.notifications]
  );

  const clearError = useCallback((key: keyof WorkflowState["errors"]) => {
    dispatch({ type: "SET_ERROR", payload: { key, value: null } });
  }, []);

  const setLoading = useCallback(
    (key: keyof WorkflowState["loading"], value: boolean) => {
      dispatch({ type: "SET_LOADING", payload: { key, value } });
    },
    []
  );

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Load export history on mount
  useEffect(() => {
    const loadExportHistory = async () => {
      try {
        const history = await window.electronAPI.getExportHistory();
        dispatch({ type: "SET_EXPORT_HISTORY", payload: history });
      } catch (error) {
        console.error("Failed to load export history:", error);
      }
    };

    loadExportHistory();
  }, []);

  // Set up recording event listeners
  useEffect(() => {
    const handleRecordingProgress = (progress: RecordingProgress) => {
      // Convert RecordingProgress to a percentage for the UI
      const progressPercentage = progress.percent || 0;
      dispatch({ type: "SET_RECORDING_PROGRESS", payload: progressPercentage });
    };

    const handleRecordingFinished = (filePath: string) => {
      dispatch({ type: "STOP_RECORDING", payload: filePath });
      showNotification("Success", `Recording saved to ${filePath}`, "success");
    };

    const handleRecordingError = (error: string) => {
      dispatch({
        type: "SET_ERROR",
        payload: { key: "recording", value: error },
      });
      dispatch({ type: "STOP_RECORDING", payload: null });
      showNotification("Error", `Recording failed: ${error}`, "error");
    };

    if (window.electronAPI) {
      window.electronAPI.onRecordingProgress?.(handleRecordingProgress);
      window.electronAPI.onRecordingFinished?.(handleRecordingFinished);
      window.electronAPI.onRecordingError?.(handleRecordingError);
    }

    return () => {
      if (window.electronAPI) {
        window.electronAPI.removeRecordingListeners?.();
      }
    };
  }, [showNotification]);

  // ============================================================================
  // CONTEXT VALUE
  // ============================================================================

  const contextValue: WorkflowContextType = {
    state,
    dispatch,

    // Navigation helpers
    navigateToStep,
    goBack,
    resetWorkflow,

    // Workflow actions
    startNewRaffle,
    editRaffle,
    saveRaffleConfig,
    loadParticipants,
    startDrawing,
    completeDrawing,
    exportResults,

    // Recording actions
    startRecording,
    stopRecording,

    // Utility functions
    showNotification,
    clearError,
    setLoading,
  };

  return (
    <WorkflowContext.Provider value={contextValue}>
      {children}
    </WorkflowContext.Provider>
  );
};

// ============================================================================
// HOOK
// ============================================================================

export const useWorkflow = (): WorkflowContextType => {
  const context = useContext(WorkflowContext);
  if (context === undefined) {
    throw new Error("useWorkflow must be used within a WorkflowProvider");
  }
  return context;
};
