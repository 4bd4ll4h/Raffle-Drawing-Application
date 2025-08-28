import React, { useState, useEffect } from 'react';
import {
  Modal,
  Table,
  Button,
  Space,
  Typography,
  Tag,
  Tooltip,
  message,
  Popconfirm,
  Card,
  Row,
  Col,
  Statistic,
  Empty,
  Input,
  Select,
  DatePicker
} from 'antd';
import {
  HistoryOutlined,
  ExportOutlined,
  DeleteOutlined,
  ReloadOutlined,
  SearchOutlined,
  FilterOutlined,
  FileTextOutlined,
  FolderOutlined,
  FileZipOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  CalendarOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { ExportHistoryEntry } from '../../main/services/ExportService';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Search } = Input;
const { RangePicker } = DatePicker;

interface ExportHistoryProps {
  visible: boolean;
  onClose: () => void;
  onReExport: (historyEntryId: string) => Promise<void>;
  onClearHistory: () => Promise<void>;
  loading?: boolean;
}

const ExportHistory: React.FC<ExportHistoryProps> = ({
  visible,
  onClose,
  onReExport,
  onClearHistory,
  loading = false
}) => {
  const [history, setHistory] = useState<ExportHistoryEntry[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<ExportHistoryEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'failed'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'individual' | 'bulk'>('all');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [reExportingId, setReExportingId] = useState<string | null>(null);

  // Load export history when modal opens
  useEffect(() => {
    if (visible) {
      loadExportHistory();
    }
  }, [visible]);

  // Apply filters when history or filter values change
  useEffect(() => {
    applyFilters();
  }, [history, searchTerm, statusFilter, typeFilter, dateRange]);

  const loadExportHistory = async () => {
    try {
      // This would be called via IPC to the main process
      const historyData = await window.electronAPI?.getExportHistory();
      setHistory(historyData || []);
    } catch (error) {
      console.error('Failed to load export history:', error);
      message.error('Failed to load export history');
    }
  };

  const applyFilters = () => {
    let filtered = [...history];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(entry =>
        entry.raffleIds.some(id => id.toLowerCase().includes(searchTerm.toLowerCase())) ||
        entry.outputPath.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(entry => 
        statusFilter === 'success' ? entry.success : !entry.success
      );
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(entry => entry.exportType === typeFilter);
    }

    // Date range filter
    if (dateRange) {
      const [start, end] = dateRange;
      filtered = filtered.filter(entry => {
        const entryDate = dayjs(entry.timestamp);
        return entryDate.isAfter(start.startOf('day')) && entryDate.isBefore(end.endOf('day'));
      });
    }

    setFilteredHistory(filtered);
  };

  const handleReExport = async (historyEntryId: string) => {
    try {
      setReExportingId(historyEntryId);
      await onReExport(historyEntryId);
      message.success('Re-export completed successfully');
      await loadExportHistory(); // Refresh history
    } catch (error) {
      console.error('Re-export failed:', error);
      message.error('Re-export failed');
    } finally {
      setReExportingId(null);
    }
  };

  const handleClearHistory = async () => {
    try {
      await onClearHistory();
      setHistory([]);
      message.success('Export history cleared');
    } catch (error) {
      console.error('Failed to clear history:', error);
      message.error('Failed to clear export history');
    }
  };

  const getExportTypeIcon = (type: string) => {
    switch (type) {
      case 'individual': return <FileTextOutlined />;
      case 'bulk': return <FolderOutlined />;
      default: return <ExportOutlined />;
    }
  };

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'csv': return <FileTextOutlined />;
      case 'json': return <FileTextOutlined />;
      case 'zip': return <FileZipOutlined />;
      default: return <FileTextOutlined />;
    }
  };

  const columns: ColumnsType<ExportHistoryEntry> = [
    {
      title: 'Date & Time',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 180,
      sorter: (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      defaultSortOrder: 'descend',
      render: (timestamp: Date) => (
        <div>
          <div>{dayjs(timestamp).format('MMM DD, YYYY')}</div>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {dayjs(timestamp).format('HH:mm:ss')}
          </Text>
        </div>
      )
    },
    {
      title: 'Type',
      dataIndex: 'exportType',
      key: 'exportType',
      width: 100,
      filters: [
        { text: 'Individual', value: 'individual' },
        { text: 'Bulk', value: 'bulk' }
      ],
      onFilter: (value, record) => record.exportType === value,
      render: (type: string) => (
        <Tag icon={getExportTypeIcon(type)}>
          {type.charAt(0).toUpperCase() + type.slice(1)}
        </Tag>
      )
    },
    {
      title: 'Format',
      dataIndex: 'format',
      key: 'format',
      width: 80,
      render: (format: string) => (
        <Tag icon={getFormatIcon(format)} color="blue">
          {format.toUpperCase()}
        </Tag>
      )
    },
    {
      title: 'Raffles',
      dataIndex: 'raffleIds',
      key: 'raffleIds',
      width: 100,
      render: (raffleIds: string[]) => (
        <div>
          <Text strong>{raffleIds.length}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {raffleIds.length === 1 ? 'raffle' : 'raffles'}
          </Text>
        </div>
      )
    },
    {
      title: 'Files',
      dataIndex: 'fileCount',
      key: 'fileCount',
      width: 80,
      render: (count: number) => (
        <div style={{ textAlign: 'center' }}>
          <Text strong>{count}</Text>
        </div>
      )
    },
    {
      title: 'Status',
      dataIndex: 'success',
      key: 'success',
      width: 100,
      filters: [
        { text: 'Success', value: true },
        { text: 'Failed', value: false }
      ],
      onFilter: (value, record) => record.success === value,
      render: (success: boolean, record: ExportHistoryEntry) => (
        <div>
          {success ? (
            <Tag icon={<CheckCircleOutlined />} color="success">
              Success
            </Tag>
          ) : (
            <Tooltip title={record.error}>
              <Tag icon={<CloseCircleOutlined />} color="error">
                Failed
              </Tag>
            </Tooltip>
          )}
        </div>
      )
    },
    {
      title: 'Output Path',
      dataIndex: 'outputPath',
      key: 'outputPath',
      ellipsis: {
        showTitle: false
      },
      render: (path: string) => (
        <Tooltip title={path}>
          <Text code style={{ fontSize: '12px' }}>
            {path}
          </Text>
        </Tooltip>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_, record: ExportHistoryEntry) => (
        <Space>
          <Tooltip title="Re-export with same settings">
            <Button
              size="small"
              icon={<ReloadOutlined />}
              onClick={() => handleReExport(record.id)}
              loading={reExportingId === record.id}
              disabled={!record.success}
            />
          </Tooltip>
        </Space>
      )
    }
  ];

  const statistics = {
    total: history.length,
    successful: history.filter(h => h.success).length,
    failed: history.filter(h => !h.success).length,
    individual: history.filter(h => h.exportType === 'individual').length,
    bulk: history.filter(h => h.exportType === 'bulk').length
  };

  return (
    <Modal
      title={
        <Space>
          <HistoryOutlined />
          Export History
        </Space>
      }
      open={visible}
      onCancel={onClose}
      width={1200}
      footer={[
        <Popconfirm
          key="clear"
          title="Clear all export history?"
          description="This action cannot be undone."
          onConfirm={handleClearHistory}
          okText="Clear"
          okType="danger"
        >
          <Button danger icon={<DeleteOutlined />}>
            Clear History
          </Button>
        </Popconfirm>,
        <Button key="close" type="primary" onClick={onClose}>
          Close
        </Button>
      ]}
    >
      {/* Statistics */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Total Exports"
              value={statistics.total}
              prefix={<ExportOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Successful"
              value={statistics.successful}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Failed"
              value={statistics.failed}
              prefix={<CloseCircleOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Bulk Exports"
              value={statistics.bulk}
              prefix={<FolderOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col span={8}>
            <Search
              placeholder="Search by raffle ID or path..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              allowClear
            />
          </Col>
          <Col span={4}>
            <Select
              placeholder="Status"
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: '100%' }}
            >
              <Select.Option value="all">All Status</Select.Option>
              <Select.Option value="success">Success</Select.Option>
              <Select.Option value="failed">Failed</Select.Option>
            </Select>
          </Col>
          <Col span={4}>
            <Select
              placeholder="Type"
              value={typeFilter}
              onChange={setTypeFilter}
              style={{ width: '100%' }}
            >
              <Select.Option value="all">All Types</Select.Option>
              <Select.Option value="individual">Individual</Select.Option>
              <Select.Option value="bulk">Bulk</Select.Option>
            </Select>
          </Col>
          <Col span={6}>
            <RangePicker
              value={dateRange}
              onChange={setDateRange}
              style={{ width: '100%' }}
              placeholder={['Start Date', 'End Date']}
            />
          </Col>
          <Col span={2}>
            <Button
              icon={<FilterOutlined />}
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setTypeFilter('all');
                setDateRange(null);
              }}
            >
              Clear
            </Button>
          </Col>
        </Row>
      </Card>

      {/* History Table */}
      {filteredHistory.length === 0 ? (
        <Empty
          description={
            history.length === 0 
              ? "No export history found" 
              : "No exports match your filters"
          }
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      ) : (
        <Table
          columns={columns}
          dataSource={filteredHistory}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} of ${total} exports`
          }}
          scroll={{ x: 1000 }}
        />
      )}
    </Modal>
  );
};

export default ExportHistory;