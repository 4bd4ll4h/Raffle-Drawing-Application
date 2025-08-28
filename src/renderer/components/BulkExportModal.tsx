import React, { useState } from 'react';
import {
  Modal,
  Form,
  Select,
  Checkbox,
  Button,
  Space,
  Typography,
  Alert,
  Progress,
  List,
  Tag,
  Divider,
  Row,
  Col,
  Card
} from 'antd';
import {
  ExportOutlined,
  FileTextOutlined,
  FolderOutlined,
  FileZipOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { BulkOperationResult } from '../../types';
import { BulkExportOptions } from '@/main/services/ExportService';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

interface BulkExportModalProps {
  visible: boolean;
  selectedRaffleIds: string[];
  raffleNames: Record<string, string>; // Map of raffle ID to name
  onExport: (options: BulkExportOptions) => Promise<BulkOperationResult & { outputPath?: string }>;
  onCancel: () => void;
  loading?: boolean;
}

interface ExportProgress {
  current: number;
  total: number;
  currentRaffle?: string;
  status: 'preparing' | 'exporting' | 'completed' | 'error';
}

const BulkExportModal: React.FC<BulkExportModalProps> = ({
  visible,
  selectedRaffleIds,
  raffleNames,
  onExport,
  onCancel,
  loading = false
}) => {
  const [form] = Form.useForm();
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);
  const [exportResult, setExportResult] = useState<(BulkOperationResult & { outputPath?: string }) | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    try {
      const values = await form.validateFields();
      setIsExporting(true);
      setExportProgress({
        current: 0,
        total: selectedRaffleIds.length,
        status: 'preparing'
      });

      const options: BulkExportOptions = {
        format: values.format,
        exportType: values.exportType,
        includeDrawingHistory: values.includeDrawingHistory || false,
        includeParticipants: values.includeParticipants !== false, // Default to true
        includeMetadata: values.includeMetadata !== false, // Default to true
        customFields: values.customFields || []
      };

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setExportProgress(prev => {
          if (!prev || prev.status === 'completed') return prev;
          
          const newCurrent = Math.min(prev.current + 1, prev.total);
          const currentRaffleName = raffleNames[selectedRaffleIds[newCurrent - 1]];
          
          return {
            ...prev,
            current: newCurrent,
            currentRaffle: currentRaffleName,
            status: newCurrent === prev.total ? 'completed' : 'exporting'
          };
        });
      }, 500);

      const result = await onExport(options);
      
      clearInterval(progressInterval);
      setExportProgress(prev => prev ? { ...prev, status: 'completed' } : null);
      setExportResult(result);
      setIsExporting(false);

    } catch (error) {
      console.error('Export failed:', error);
      setExportProgress(prev => prev ? { ...prev, status: 'error' } : null);
      setIsExporting(false);
    }
  };

  const handleClose = () => {
    setExportProgress(null);
    setExportResult(null);
    setIsExporting(false);
    form.resetFields();
    onCancel();
  };

  const getExportTypeIcon = (type: string) => {
    switch (type) {
      case 'combined': return <FileTextOutlined />;
      case 'separate': return <FolderOutlined />;
      case 'zip': return <FileZipOutlined />;
      default: return <ExportOutlined />;
    }
  };

  const getProgressPercent = () => {
    if (!exportProgress) return 0;
    return Math.round((exportProgress.current / exportProgress.total) * 100);
  };

  const renderExportOptions = () => (
    <Form
      form={form}
      layout="vertical"
      initialValues={{
        format: 'csv',
        exportType: 'separate',
        includeParticipants: true,
        includeDrawingHistory: true,
        includeMetadata: true
      }}
    >
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="format"
            label="Export Format"
            rules={[{ required: true, message: 'Please select export format' }]}
          >
            <Select>
              <Option value="csv">CSV (Comma Separated Values)</Option>
              <Option value="json">JSON (JavaScript Object Notation)</Option>
            </Select>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="exportType"
            label="Export Type"
            rules={[{ required: true, message: 'Please select export type' }]}
          >
            <Select>
              <Option value="combined">
                <Space>
                  <FileTextOutlined />
                  Combined - Single file with all raffles
                </Space>
              </Option>
              <Option value="separate">
                <Space>
                  <FolderOutlined />
                  Separate - Individual files per raffle
                </Space>
              </Option>
              <Option value="zip">
                <Space>
                  <FileZipOutlined />
                  ZIP Archive - All files in compressed archive
                </Space>
              </Option>
            </Select>
          </Form.Item>
        </Col>
      </Row>

      <Divider>Export Content</Divider>

      <Row gutter={16}>
        <Col span={8}>
          <Form.Item name="includeParticipants" valuePropName="checked">
            <Checkbox>Include Participants</Checkbox>
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="includeDrawingHistory" valuePropName="checked">
            <Checkbox>Include Drawing History</Checkbox>
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="includeMetadata" valuePropName="checked">
            <Checkbox>Include Metadata</Checkbox>
          </Form.Item>
        </Col>
      </Row>

      <Form.Item
        name="customFields"
        label="Custom Fields (Optional)"
        help="Comma-separated list of additional fields to include"
      >
        <Select
          mode="tags"
          placeholder="e.g., productName, currency, orderAmount"
          tokenSeparators={[',']}
        />
      </Form.Item>
    </Form>
  );

  const renderProgress = () => (
    <div style={{ textAlign: 'center', padding: '20px 0' }}>
      <Progress
        type="circle"
        percent={getProgressPercent()}
        status={exportProgress?.status === 'error' ? 'exception' : 'active'}
        format={() => `${exportProgress?.current || 0}/${exportProgress?.total || 0}`}
      />
      <div style={{ marginTop: 16 }}>
        <Text strong>
          {exportProgress?.status === 'preparing' && 'Preparing export...'}
          {exportProgress?.status === 'exporting' && `Exporting: ${exportProgress.currentRaffle}`}
          {exportProgress?.status === 'completed' && 'Export completed!'}
          {exportProgress?.status === 'error' && 'Export failed'}
        </Text>
      </div>
    </div>
  );

  const renderResults = () => {
    if (!exportResult) return null;

    const hasFailures = exportResult.failed.length > 0;

    return (
      <div>
        <Alert
          message={hasFailures ? 'Export completed with errors' : 'Export completed successfully'}
          type={hasFailures ? 'warning' : 'success'}
          icon={hasFailures ? <InfoCircleOutlined /> : <CheckCircleOutlined />}
          style={{ marginBottom: 16 }}
        />

        {exportResult.outputPath && (
          <Card size="small" style={{ marginBottom: 16 }}>
            <Text strong>Output Location:</Text>
            <br />
            <Text code copyable>{exportResult.outputPath}</Text>
          </Card>
        )}

        <Row gutter={16}>
          <Col span={12}>
            <Card size="small">
              <div style={{ textAlign: 'center' }}>
                <CheckCircleOutlined style={{ fontSize: 24, color: '#52c41a' }} />
                <div style={{ marginTop: 8 }}>
                  <Text strong>{exportResult.successful.length}</Text>
                  <br />
                  <Text type="secondary">Successful</Text>
                </div>
              </div>
            </Card>
          </Col>
          <Col span={12}>
            <Card size="small">
              <div style={{ textAlign: 'center' }}>
                <CloseCircleOutlined style={{ fontSize: 24, color: '#ff4d4f' }} />
                <div style={{ marginTop: 8 }}>
                  <Text strong>{exportResult.failed.length}</Text>
                  <br />
                  <Text type="secondary">Failed</Text>
                </div>
              </div>
            </Card>
          </Col>
        </Row>

        {exportResult.failed.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <Title level={5}>Failed Exports:</Title>
            <List
              size="small"
              dataSource={exportResult.failed}
              renderItem={item => (
                <List.Item>
                  <Space>
                    <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                    <Text>{raffleNames[item.id] || item.id}</Text>
                    <Tag color="red">{item.error}</Tag>
                  </Space>
                </List.Item>
              )}
            />
          </div>
        )}
      </div>
    );
  };

  const getModalTitle = () => {
    if (exportProgress) {
      return exportProgress.status === 'completed' ? 'Export Results' : 'Exporting Raffles';
    }
    return 'Bulk Export Raffles';
  };

  const getModalFooter = () => {
    if (exportProgress && exportProgress.status !== 'completed' && exportProgress.status !== 'error') {
      return null; // No footer during export
    }

    if (exportResult) {
      return [
        <Button key="close" type="primary" onClick={handleClose}>
          Close
        </Button>
      ];
    }

    return [
      <Button key="cancel" onClick={handleClose}>
        Cancel
      </Button>,
      <Button
        key="export"
        type="primary"
        icon={<ExportOutlined />}
        onClick={handleExport}
        loading={isExporting}
        disabled={selectedRaffleIds.length === 0}
      >
        Export {selectedRaffleIds.length} Raffles
      </Button>
    ];
  };

  return (
    <Modal
      title={getModalTitle()}
      open={visible}
      onCancel={handleClose}
      footer={getModalFooter()}
      width={700}
      maskClosable={false}
      destroyOnClose
    >
      {!exportProgress && !exportResult && (
        <div>
          <Alert
            message={`Ready to export ${selectedRaffleIds.length} raffles`}
            description="Configure your export settings below. You can choose the format, export type, and what data to include."
            type="info"
            showIcon
            style={{ marginBottom: 24 }}
          />

          <Card title="Selected Raffles" size="small" style={{ marginBottom: 24 }}>
            <div style={{ maxHeight: 120, overflowY: 'auto' }}>
              {selectedRaffleIds.map(id => (
                <Tag key={id} style={{ margin: '2px' }}>
                  {raffleNames[id] || id}
                </Tag>
              ))}
            </div>
          </Card>

          {renderExportOptions()}
        </div>
      )}

      {exportProgress && !exportResult && renderProgress()}
      {exportResult && renderResults()}
    </Modal>
  );
};

export default BulkExportModal;