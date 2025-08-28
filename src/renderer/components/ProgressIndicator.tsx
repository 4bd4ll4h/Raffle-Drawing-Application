import React, { useState, useEffect } from 'react';
import '../styles/progress-indicator.css';

export interface ProgressIndicatorProps {
  progress: number; // 0-100
  status: 'idle' | 'running' | 'completed' | 'error' | 'cancelled';
  title?: string;
  subtitle?: string;
  showPercentage?: boolean;
  showTimeRemaining?: boolean;
  estimatedTimeRemaining?: number; // in milliseconds
  onCancel?: () => void;
  size?: 'small' | 'medium' | 'large';
  variant?: 'linear' | 'circular';
  animated?: boolean;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  progress,
  status,
  title,
  subtitle,
  showPercentage = true,
  showTimeRemaining = false,
  estimatedTimeRemaining,
  onCancel,
  size = 'medium',
  variant = 'linear',
  animated = true
}) => {
  const [displayProgress, setDisplayProgress] = useState(progress);

  useEffect(() => {
    if (animated) {
      // Smooth progress animation
      const startProgress = displayProgress;
      const targetProgress = progress;
      const duration = 300; // ms
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const ratio = Math.min(elapsed / duration, 1);
        
        const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
        const easedRatio = easeOutCubic(ratio);
        
        const currentProgress = startProgress + (targetProgress - startProgress) * easedRatio;
        setDisplayProgress(currentProgress);

        if (ratio < 1) {
          requestAnimationFrame(animate);
        }
      };

      requestAnimationFrame(animate);
    } else {
      setDisplayProgress(progress);
    }
  }, [progress, animated, displayProgress]);

  const formatTimeRemaining = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m remaining`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s remaining`;
    } else {
      return `${seconds}s remaining`;
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return '✓';
      case 'error':
        return '✗';
      case 'cancelled':
        return '⊘';
      case 'running':
        return '⟳';
      default:
        return '';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'completed':
        return '#52c41a';
      case 'error':
        return '#ff4d4f';
      case 'cancelled':
        return '#faad14';
      case 'running':
        return '#1890ff';
      default:
        return '#d9d9d9';
    }
  };

  if (variant === 'circular') {
    const radius = size === 'small' ? 20 : size === 'medium' ? 30 : 40;
    const strokeWidth = size === 'small' ? 3 : size === 'medium' ? 4 : 5;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (displayProgress / 100) * circumference;

    return (
      <div className={`progress-indicator circular ${size} ${status}`}>
        <div className="progress-circle-container">
          <svg width={(radius + strokeWidth) * 2} height={(radius + strokeWidth) * 2}>
            <circle
              cx={radius + strokeWidth}
              cy={radius + strokeWidth}
              r={radius}
              fill="none"
              stroke="#f0f0f0"
              strokeWidth={strokeWidth}
            />
            <circle
              cx={radius + strokeWidth}
              cy={radius + strokeWidth}
              r={radius}
              fill="none"
              stroke={getStatusColor()}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              transform={`rotate(-90 ${radius + strokeWidth} ${radius + strokeWidth})`}
              className={animated ? 'animated' : ''}
            />
          </svg>
          <div className="progress-circle-content">
            <div className="status-icon">{getStatusIcon()}</div>
            {showPercentage && (
              <div className="percentage">{Math.round(displayProgress)}%</div>
            )}
          </div>
        </div>
        {title && <div className="progress-title">{title}</div>}
        {subtitle && <div className="progress-subtitle">{subtitle}</div>}
        {showTimeRemaining && estimatedTimeRemaining && (
          <div className="time-remaining">
            {formatTimeRemaining(estimatedTimeRemaining)}
          </div>
        )}
        {onCancel && status === 'running' && (
          <button className="cancel-button" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`progress-indicator linear ${size} ${status}`}>
      <div className="progress-header">
        {title && (
          <div className="progress-title">
            <span className="status-icon">{getStatusIcon()}</span>
            {title}
          </div>
        )}
        {showPercentage && (
          <div className="percentage">{Math.round(displayProgress)}%</div>
        )}
      </div>
      
      <div className="progress-bar-container">
        <div className="progress-bar-background">
          <div
            className={`progress-bar-fill ${animated ? 'animated' : ''}`}
            style={{
              width: `${displayProgress}%`,
              backgroundColor: getStatusColor()
            }}
          />
        </div>
      </div>

      {subtitle && <div className="progress-subtitle">{subtitle}</div>}
      
      {showTimeRemaining && estimatedTimeRemaining && status === 'running' && (
        <div className="time-remaining">
          {formatTimeRemaining(estimatedTimeRemaining)}
        </div>
      )}

      {onCancel && status === 'running' && (
        <div className="progress-actions">
          <button className="cancel-button" onClick={onCancel}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};

export interface BulkProgressIndicatorProps {
  tasks: Array<{
    id: string;
    title: string;
    progress: number;
    status: 'idle' | 'running' | 'completed' | 'error' | 'cancelled';
    subtitle?: string;
  }>;
  onCancelTask?: (taskId: string) => void;
  onCancelAll?: () => void;
  showOverallProgress?: boolean;
}

export const BulkProgressIndicator: React.FC<BulkProgressIndicatorProps> = ({
  tasks,
  onCancelTask,
  onCancelAll,
  showOverallProgress = true
}) => {
  const overallProgress = tasks.length > 0 
    ? tasks.reduce((sum, task) => sum + task.progress, 0) / tasks.length
    : 0;

  const completedTasks = tasks.filter(task => task.status === 'completed').length;
  const runningTasks = tasks.filter(task => task.status === 'running').length;
  const errorTasks = tasks.filter(task => task.status === 'error').length;

  const overallStatus = errorTasks > 0 ? 'error' 
    : runningTasks > 0 ? 'running'
    : completedTasks === tasks.length ? 'completed'
    : 'idle';

  return (
    <div className="bulk-progress-indicator">
      {showOverallProgress && (
        <div className="overall-progress">
          <ProgressIndicator
            progress={overallProgress}
            status={overallStatus}
            title={`Processing ${tasks.length} tasks`}
            subtitle={`${completedTasks} completed, ${runningTasks} running, ${errorTasks} failed`}
            showPercentage={true}
            size="medium"
            variant="linear"
          />
          {onCancelAll && runningTasks > 0 && (
            <button className="cancel-all-button" onClick={onCancelAll}>
              Cancel All
            </button>
          )}
        </div>
      )}

      <div className="task-list">
        {tasks.map(task => (
          <div key={task.id} className="task-progress-item">
            <ProgressIndicator
              progress={task.progress}
              status={task.status}
              title={task.title}
              subtitle={task.subtitle}
              showPercentage={true}
              size="small"
              variant="linear"
              onCancel={onCancelTask ? () => onCancelTask(task.id) : undefined}
            />
          </div>
        ))}
      </div>
    </div>
  );
};