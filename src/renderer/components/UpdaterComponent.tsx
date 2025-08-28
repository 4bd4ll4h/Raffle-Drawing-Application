import React, { useEffect, useState } from 'react';
import { Modal, Button, Progress, Typography, Space, Alert } from 'antd';
import { DownloadOutlined, ReloadOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

interface UpdateInfo {
  version: string;
  releaseDate: string;
  releaseNotes: string;
  downloadSize: number;
}

interface UpdateProgress {
  bytesPerSecond: number;
  percent: number;
  transferred: number;
  total: number;
}

export const UpdaterComponent: React.FC = () => {
  const [isCheckingForUpdates, setIsCheckingForUpdates] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState<UpdateInfo | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<UpdateProgress | null>(null);
  const [updateDownloaded, setUpdateDownloaded] = useState<UpdateInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);

  useEffect(() => {
    // Set up updater event listeners
    window.electronAPI.onUpdaterChecking(() => {
      setIsCheckingForUpdates(true);
      setError(null);
    });

    window.electronAPI.onUpdaterUpdateAvailable((info: UpdateInfo) => {
      setIsCheckingForUpdates(false);
      setUpdateAvailable(info);
      setShowUpdateModal(true);
    });

    window.electronAPI.onUpdaterUpdateNotAvailable(() => {
      setIsCheckingForUpdates(false);
      setUpdateAvailable(null);
    });

    window.electronAPI.onUpdaterDownloadProgress((progress: UpdateProgress) => {
      setDownloadProgress(progress);
    });

    window.electronAPI.onUpdaterUpdateDownloaded((info: UpdateInfo) => {
      setIsDownloading(false);
      setShowDownloadModal(false);
      setUpdateDownloaded(info);
      setShowInstallModal(true);
    });

    window.electronAPI.onUpdaterError((error: string) => {
      setIsCheckingForUpdates(false);
      setIsDownloading(false);
      setError(error);
      setShowDownloadModal(false);
    });

    // Cleanup listeners on unmount
    return () => {
      window.electronAPI.removeUpdaterListeners();
    };
  }, []);

  const handleCheckForUpdates = async () => {
    try {
      await window.electronAPI.checkForUpdates();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to check for updates');
    }
  };

  const handleDownloadUpdate = async () => {
    if (!updateAvailable) return;

    try {
      setIsDownloading(true);
      setShowUpdateModal(false);
      setShowDownloadModal(true);
      setDownloadProgress(null);
      
      await window.electronAPI.downloadUpdate();
    } catch (error) {
      setIsDownloading(false);
      setShowDownloadModal(false);
      setError(error instanceof Error ? error.message : 'Failed to download update');
    }
  };

  const handleInstallUpdate = async () => {
    try {
      await window.electronAPI.quitAndInstall();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to install update');
    }
  };

  const formatFileSize = (bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const formatSpeed = (bytesPerSecond: number): string => {
    return `${formatFileSize(bytesPerSecond)}/s`;
  };

  return (
    <>
      {/* Update Available Modal */}
      <Modal
        title={
          <Space>
            <DownloadOutlined />
            <span>Update Available</span>
          </Space>
        }
        open={showUpdateModal}
        onCancel={() => setShowUpdateModal(false)}
        footer={[
          <Button key="later" onClick={() => setShowUpdateModal(false)}>
            Later
          </Button>,
          <Button key="download" type="primary" onClick={handleDownloadUpdate}>
            Download Now
          </Button>
        ]}
        width={600}
      >
        {updateAvailable && (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Title level={4}>Version {updateAvailable.version}</Title>
            <Text type="secondary">
              Released: {new Date(updateAvailable.releaseDate).toLocaleDateString()}
            </Text>
            <Text type="secondary">
              Size: {formatFileSize(updateAvailable.downloadSize)}
            </Text>
            
            <div style={{ marginTop: 16 }}>
              <Title level={5}>Release Notes:</Title>
              <div style={{ 
                maxHeight: 200, 
                overflowY: 'auto', 
                padding: 12, 
                backgroundColor: '#f5f5f5', 
                borderRadius: 4 
              }}>
                <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
                  {updateAvailable.releaseNotes}
                </pre>
              </div>
            </div>
          </Space>
        )}
      </Modal>

      {/* Download Progress Modal */}
      <Modal
        title={
          <Space>
            <DownloadOutlined />
            <span>Downloading Update</span>
          </Space>
        }
        open={showDownloadModal}
        footer={null}
        closable={false}
        width={500}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          {downloadProgress && (
            <>
              <Progress 
                percent={Math.round(downloadProgress.percent)} 
                status="active"
                strokeColor={{
                  '0%': '#108ee9',
                  '100%': '#87d068',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary">
                  {formatFileSize(downloadProgress.transferred)} / {formatFileSize(downloadProgress.total)}
                </Text>
                <Text type="secondary">
                  {formatSpeed(downloadProgress.bytesPerSecond)}
                </Text>
              </div>
            </>
          )}
          {!downloadProgress && (
            <div style={{ textAlign: 'center', padding: 20 }}>
              <Progress type="circle" percent={0} />
              <div style={{ marginTop: 16 }}>
                <Text>Preparing download...</Text>
              </div>
            </div>
          )}
        </Space>
      </Modal>

      {/* Install Update Modal */}
      <Modal
        title={
          <Space>
            <CheckCircleOutlined style={{ color: '#52c41a' }} />
            <span>Update Ready</span>
          </Space>
        }
        open={showInstallModal}
        onCancel={() => setShowInstallModal(false)}
        footer={[
          <Button key="later" onClick={() => setShowInstallModal(false)}>
            Install Later
          </Button>,
          <Button key="install" type="primary" onClick={handleInstallUpdate}>
            <ReloadOutlined />
            Restart & Install
          </Button>
        ]}
        width={500}
      >
        {updateDownloaded && (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Alert
              message="Update Downloaded Successfully"
              description={`Version ${updateDownloaded.version} is ready to install. The application will restart to complete the installation.`}
              type="success"
              showIcon
            />
          </Space>
        )}
      </Modal>

      {/* Error Display */}
      {error && (
        <Modal
          title={
            <Space>
              <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
              <span>Update Error</span>
            </Space>
          }
          open={!!error}
          onCancel={() => setError(null)}
          footer={[
            <Button key="ok" onClick={() => setError(null)}>
              OK
            </Button>
          ]}
        >
          <Alert
            message="Update Failed"
            description={error}
            type="error"
            showIcon
          />
        </Modal>
      )}

      {/* Manual Check Button (can be used in settings or help menu) */}
      <Button
        onClick={handleCheckForUpdates}
        loading={isCheckingForUpdates}
        icon={<DownloadOutlined />}
        style={{ display: 'none' }} // Hidden by default, can be shown in settings
      >
        Check for Updates
      </Button>
    </>
  );
};

export default UpdaterComponent;