import React, { useEffect, useState } from 'react';
import { Layout, Steps, Button, Space, Typography, Card, Progress, Alert, Spin } from 'antd';
import {
  DashboardOutlined,
  SettingOutlined,
  PlayCircleOutlined,
  TrophyOutlined,
  ExportOutlined,
  ArrowLeftOutlined,
  HomeOutlined,
} from '@ant-design/icons';
import { useWorkflow } from '../context/WorkflowContext';
import Dashboard from './Dashboard';
import RaffleConfiguration from './RaffleConfiguration';
import AnimationEngineComponent from './AnimationEngine';
import DrawingResults from './DrawingResults';
import ExportManager from './ExportManager';
import { AnimationConfig } from '../../types/animation';
import { CS2_RARITY_LEVELS, AnimationStyle } from '../../types';
import { EasingFunctions } from '../../types/animation';

const { Content, Sider } = Layout;
const { Title, Text } = Typography;

// ============================================================================
// WORKFLOW STEP DEFINITIONS
// ============================================================================

const workflowSteps = [
  {
    key: 'dashboard',
    title: 'Dashboard',
    description: 'Manage raffles',
    icon: <DashboardOutlined />,
  },
  {
    key: 'configuration',
    title: 'Configuration',
    description: 'Setup raffle',
    icon: <SettingOutlined />,
  },
  {
    key: 'animation',
    title: 'Drawing',
    description: 'Run animation',
    icon: <PlayCircleOutlined />,
  },
  {
    key: 'results',
    title: 'Results',
    description: 'View winner',
    icon: <TrophyOutlined />,
  },
  {
    key: 'export',
    title: 'Export',
    description: 'Save results',
    icon: <ExportOutlined />,
  },
];

// ============================================================================
// MAIN WORKFLOW MANAGER COMPONENT
// ============================================================================

const WorkflowManager: React.FC = () => {
  const {
    state,
    navigateToStep,
    goBack,
    resetWorkflow,
    startNewRaffle,
    editRaffle,
    saveRaffleConfig,
    startDrawing,
    completeDrawing,
    exportResults,
    startRecording,
    stopRecording,
    showNotification,
    clearError,
  } = useWorkflow();

  const [raffles, setRaffles] = useState<any[]>([]);
  const [rafflesLoading, setRafflesLoading] = useState(false);
  const [rafflesError, setRafflesError] = useState<string | undefined>();

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Load raffles on mount
  useEffect(() => {
    loadRaffles();
  }, []);

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  const loadRaffles = async () => {
    setRafflesLoading(true);
    setRafflesError(undefined);

    try {
      const result = await window.electronAPI.getAllRaffles();
      if (result.success) {
        setRaffles(result.data || []);
      } else {
        throw new Error(result.error || 'Failed to load raffles');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load raffles';
      setRafflesError(errorMessage);
      showNotification('Error', errorMessage, 'error');
    } finally {
      setRafflesLoading(false);
    }
  };

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleCreateRaffle = () => {
    startNewRaffle();
  };

  const handleEditRaffle = (id: string) => {
    const raffle = raffles.find(r => r.id === id);
    if (raffle) {
      editRaffle(raffle);
    }
  };

  const handleDeleteRaffle = async (id: string) => {
    try {
      const result = await window.electronAPI.deleteRaffle(id);
      if (result.success) {
        await loadRaffles(); // Reload raffles
        showNotification('Success', 'Raffle deleted successfully', 'success');
      } else {
        throw new Error(result.error || 'Failed to delete raffle');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete raffle';
      showNotification('Error', errorMessage, 'error');
    }
  };

  const handleStartDrawing = async (id: string) => {
    const raffle = raffles.find(r => r.id === id);
    if (!raffle) {
      showNotification('Error', 'Raffle not found', 'error');
      return;
    }

    try {
      // Load raffle and participants
      editRaffle(raffle);
      
      // Load participants from CSV
      if (raffle.csvFilePath) {
        const participantsResult = await window.electronAPI.loadParticipants(raffle.csvFilePath);
        if (participantsResult.success) {
          // Start the drawing process
          await startDrawing();
        } else {
          throw new Error(participantsResult.error || 'Failed to load participants');
        }
      } else {
        throw new Error('No participant data found for this raffle');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start drawing';
      showNotification('Error', errorMessage, 'error');
    }
  };

  const handleViewRaffle = (id: string) => {
    const raffle = raffles.find(r => r.id === id);
    if (raffle) {
      editRaffle(raffle);
      navigateToStep('results');
    }
  };

  const handleBulkDelete = async (ids: string[]) => {
    try {
      const promises = ids.map(id => window.electronAPI.deleteRaffle(id));
      await Promise.all(promises);
      await loadRaffles(); // Reload raffles
      showNotification('Success', `${ids.length} raffles deleted successfully`, 'success');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete raffles';
      showNotification('Error', errorMessage, 'error');
    }
  };

  const handleBulkExport = async (ids: string[], options: any) => {
    try {
      const result = await window.electronAPI.exportMultipleRaffles(ids, options);
      if (result.success) {
        showNotification('Success', `Successfully exported ${result.successful?.length || 0} raffles`, 'success');
        return {
          successful: result.successful || [],
          failed: result.failed || [],
          totalProcessed: ids.length,
          outputPath: result.outputPath,
        };
      } else {
        throw new Error(result.error || 'Failed to export raffles');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to export raffles';
      showNotification('Error', errorMessage, 'error');
      throw error;
    }
  };

  const handleArchiveRaffle = async (id: string) => {
    try {
      const raffle = raffles.find(r => r.id === id);
      if (!raffle) {
        throw new Error('Raffle not found');
      }

      const newStatus = raffle.status === 'archived' ? 'completed' : 'archived';
      const result = await window.electronAPI.updateRaffle(id, { status: newStatus });
      
      if (result.success) {
        await loadRaffles(); // Reload raffles
        showNotification('Success', `Raffle ${newStatus === 'archived' ? 'archived' : 'unarchived'} successfully`, 'success');
      } else {
        throw new Error(result.error || 'Failed to update raffle status');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update raffle';
      showNotification('Error', errorMessage, 'error');
    }
  };

  const handleExportSingle = async (id: string) => {
    try {
      const result = await window.electronAPI.exportRaffleResults(id);
      if (result.success) {
        showNotification('Success', `Results exported to ${result.filePath}`, 'success');
      } else {
        throw new Error(result.error || 'Failed to export results');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to export results';
      showNotification('Error', errorMessage, 'error');
    }
  };

  const handleReExport = async (historyEntryId: string) => {
    try {
      await window.electronAPI.reExport(historyEntryId);
      showNotification('Success', 'Results re-exported successfully', 'success');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to re-export results';
      showNotification('Error', errorMessage, 'error');
    }
  };

  const handleClearExportHistory = async () => {
    try {
      await window.electronAPI.clearExportHistory();
      showNotification('Success', 'Export history cleared', 'success');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to clear export history';
      showNotification('Error', errorMessage, 'error');
    }
  };

  // Animation event handlers
  const handleAnimationComplete = async () => {
    if (state.winner) {
      await completeDrawing(state.winner);
    }
  };

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const getCurrentStepIndex = () => {
    return workflowSteps.findIndex(step => step.key === state.currentStep);
  };

  const canGoBack = () => {
    return state.currentStep !== 'dashboard';
  };

  const canGoHome = () => {
    return state.currentStep !== 'dashboard';
  };

  const renderStepContent = () => {
    switch (state.currentStep) {
      case 'dashboard':
        return (
          <Dashboard
            raffles={raffles}
            loading={rafflesLoading}
            error={rafflesError}
            onCreateRaffle={handleCreateRaffle}
            onEditRaffle={handleEditRaffle}
            onDeleteRaffle={handleDeleteRaffle}
            onStartDrawing={handleStartDrawing}
            onViewRaffle={handleViewRaffle}
            onBulkDelete={handleBulkDelete}
            onBulkExport={handleBulkExport}
            onArchiveRaffle={handleArchiveRaffle}
            onExportSingle={handleExportSingle}
            onReExport={handleReExport}
            onClearExportHistory={handleClearExportHistory}
          />
        );

      case 'configuration':
        return (
          <RaffleConfiguration
            raffle={state.currentRaffle}
            onSave={saveRaffleConfig}
            onCancel={() => navigateToStep('dashboard')}
            loading={state.loading.saving}
            validationErrors={[]}
          />
        );

      case 'animation':
        if (!state.currentRaffle || !state.winner || state.participants.length === 0) {
          return (
            <Card>
              <Alert
                message="Missing Data"
                description="Cannot start animation without raffle, participants, and winner data."
                type="error"
                showIcon
                action={
                  <Button onClick={() => navigateToStep('dashboard')}>
                    Go to Dashboard
                  </Button>
                }
              />
            </Card>
          );
        }

        const animationConfig: AnimationConfig = {
          duration: state.currentRaffle.customSettings?.animationDuration || 5000,
          easing: EasingFunctions.easeOutCubic,
          scrollSpeed: 1.0,
          rarityColors: CS2_RARITY_LEVELS,
          showRarityEffects: true,
          targetFPS: 60,
          enableHardwareAcceleration: true,
        };

        return (
          <AnimationEngineComponent
            participants={state.participants}
            winner={state.winner}
            animationStyle={state.currentRaffle.animationStyle}
            backgroundImage={state.currentRaffle.backgroundImagePath}
            onAnimationComplete={handleAnimationComplete}
            recordingEnabled={true}
            config={animationConfig}
          />
        );

      case 'results':
        return (
          <DrawingResults
            raffle={state.currentRaffle}
            winner={state.winner}
            drawing={state.drawing}
            participants={state.participants}
            onExport={() => navigateToStep('export')}
            onNewDrawing={() => {
              resetWorkflow();
              navigateToStep('dashboard');
            }}
            onBackToDashboard={() => navigateToStep('dashboard')}
          />
        );

      case 'export':
        return (
          <ExportManager
            raffle={state.currentRaffle}
            drawing={state.drawing}
            winner={state.winner}
            participants={state.participants}
            onExport={exportResults}
            onComplete={() => navigateToStep('dashboard')}
            loading={state.loading.export}
            error={state.errors.export}
          />
        );

      default:
        return (
          <Card>
            <Alert
              message="Unknown Step"
              description={`Unknown workflow step: ${state.currentStep}`}
              type="error"
              showIcon
            />
          </Card>
        );
    }
  };

  const renderProgressIndicator = () => {
    const hasActiveProgress = Object.values(state.progress).some(p => p > 0 && p < 1);
    
    if (!hasActiveProgress) return null;

    return (
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          {state.progress.animation > 0 && state.progress.animation < 1 && (
            <div>
              <Text strong>Animation Progress</Text>
              <Progress percent={Math.round(state.progress.animation * 100)} />
            </div>
          )}
          {state.progress.recording > 0 && state.progress.recording < 1 && (
            <div>
              <Text strong>Recording Progress</Text>
              <Progress percent={Math.round(state.progress.recording * 100)} />
            </div>
          )}
          {state.progress.export > 0 && state.progress.export < 1 && (
            <div>
              <Text strong>Export Progress</Text>
              <Progress percent={Math.round(state.progress.export * 100)} />
            </div>
          )}
        </Space>
      </Card>
    );
  };

  const renderErrorAlerts = () => {
    const errors = Object.entries(state.errors).filter(([_, error]) => error !== null);
    
    if (errors.length === 0) return null;

    return (
      <div style={{ marginBottom: 16 }}>
        {errors.map(([key, error]) => (
          <Alert
            key={key}
            message={`${key.charAt(0).toUpperCase() + key.slice(1)} Error`}
            description={error}
            type="error"
            showIcon
            closable
            onClose={() => clearError(key as keyof typeof state.errors)}
            style={{ marginBottom: 8 }}
          />
        ))}
      </div>
    );
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <Layout style={{ height: '100vh' }}>
      {/* Sidebar with workflow steps */}
      <Sider
        width={280}
        theme="light"
        style={{
          borderRight: '1px solid #f0f0f0',
          overflow: 'auto',
        }}
        collapsed={state.ui.sidebarCollapsed}
      >
        <div style={{ padding: '16px' }}>
          <Title level={4} style={{ margin: '0 0 16px 0' }}>
            Workflow
          </Title>
          
          <Steps
            direction="vertical"
            size="small"
            current={getCurrentStepIndex()}
            items={workflowSteps.map((step, index) => ({
              title: step.title,
              description: step.description,
              icon: step.icon,
              status: index < getCurrentStepIndex() ? 'finish' : 
                     index === getCurrentStepIndex() ? 'process' : 'wait',
            }))}
          />
          
          {/* Workflow controls */}
          <div style={{ marginTop: 24 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              {canGoHome() && (
                <Button
                  icon={<HomeOutlined />}
                  onClick={() => navigateToStep('dashboard')}
                  block
                >
                  Dashboard
                </Button>
              )}
              
              {canGoBack() && (
                <Button
                  icon={<ArrowLeftOutlined />}
                  onClick={goBack}
                  block
                >
                  Go Back
                </Button>
              )}
              
              <Button
                onClick={resetWorkflow}
                block
                type="dashed"
              >
                Reset Workflow
              </Button>
            </Space>
          </div>
          
          {/* Current raffle info */}
          {state.currentRaffle && (
            <Card size="small" style={{ marginTop: 16 }}>
              <Title level={5} style={{ margin: '0 0 8px 0' }}>
                Current Raffle
              </Title>
              <Text strong>{state.currentRaffle.name}</Text>
              <br />
              <Text type="secondary">
                {state.participants.length} participants
              </Text>
              <br />
              <Text type="secondary">
                Status: {state.currentRaffle.status}
              </Text>
            </Card>
          )}
        </div>
      </Sider>

      {/* Main content area */}
      <Layout>
        <Content style={{ padding: '24px', overflow: 'auto' }}>
          {/* Progress indicators */}
          {renderProgressIndicator()}
          
          {/* Error alerts */}
          {renderErrorAlerts()}
          
          {/* Loading overlay */}
          <Spin 
            spinning={Object.values(state.loading).some(loading => loading)}
            tip="Processing..."
            size="large"
          >
            {/* Step content */}
            {renderStepContent()}
          </Spin>
        </Content>
      </Layout>
    </Layout>
  );
};

export default WorkflowManager;