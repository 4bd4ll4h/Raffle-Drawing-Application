import React, { useState, useMemo } from 'react';
import {
  Card,
  Button,
  Typography,
  Space,
  Input,
  Select,
  Table,
  Tag,
  Dropdown,
  Modal,
  message,
  Row,
  Col,
  Statistic,
  Switch,
  Tooltip,
  Badge,
  Empty,
  Spin
} from 'antd';
import {
  PlusOutlined,
  TrophyOutlined,
  SearchOutlined,
  FilterOutlined,
  DeleteOutlined,
  EditOutlined,
  PlayCircleOutlined,
  EyeOutlined,
  MoreOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  ExportOutlined,
  CalendarOutlined,
  UserOutlined,
  VideoCameraOutlined,
  InboxOutlined,
  HistoryOutlined,
  DownloadOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { MenuProps } from 'antd';
import { Raffle, RaffleStatus, AnimationStyle, RaffleGridItem, SortConfig, BulkOperationResult, ExportOptions } from '../../types';
import BulkExportModal from './BulkExportModal';
import ExportHistory from './ExportHistory';

// Define BulkExportOptions interface
interface BulkExportOptions extends ExportOptions {
  exportType: 'combined' | 'separate' | 'zip';
  includeImages?: boolean;
  includeRecordings?: boolean;
}

const { Title, Paragraph, Text } = Typography;
const { Search } = Input;

interface DashboardProps {
  raffles?: Raffle[];
  loading?: boolean;
  error?: string;
  onCreateRaffle?: () => void;
  onEditRaffle?: (id: string) => void;
  onDeleteRaffle?: (id: string) => void;
  onStartDrawing?: (id: string) => void;
  onViewRaffle?: (id: string) => void;
  onBulkDelete?: (ids: string[]) => void;
  onBulkExport?: (ids: string[], options: BulkExportOptions) => Promise<BulkOperationResult & { outputPath?: string }>;
  onArchiveRaffle?: (id: string) => void;
  onExportSingle?: (id: string) => void;
  onReExport?: (historyEntryId: string) => Promise<void>;
  onClearExportHistory?: () => Promise<void>;
}

const Dashboard: React.FC<DashboardProps> = ({
  raffles = [],
  loading = false,
  error,
  onCreateRaffle = () => console.log('Create new raffle - to be implemented'),
  onEditRaffle = (id) => console.log('Edit raffle:', id),
  onDeleteRaffle = (id) => console.log('Delete raffle:', id),
  onStartDrawing = (id) => console.log('Start drawing:', id),
  onViewRaffle = (id) => console.log('View raffle:', id),
  onBulkDelete = (ids) => console.log('Bulk delete:', ids),
  onBulkExport = async (ids, options) => {
    console.log('Bulk export:', ids, options);
    return { successful: ids, failed: [], totalProcessed: ids.length };
  },
  onArchiveRaffle = (id) => console.log('Archive raffle:', id),
  onExportSingle = (id) => console.log('Export single raffle:', id),
  onReExport = async (historyEntryId) => console.log('Re-export:', historyEntryId),
  onClearExportHistory = async () => console.log('Clear export history')
}) => {
  // State management
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<RaffleStatus[]>([]);
  const [selectedAnimationStyle, setSelectedAnimationStyle] = useState<AnimationStyle[]>([]);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'lastModified', direction: 'desc' });
  const [selectedRaffles, setSelectedRaffles] = useState<string[]>([]);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [raffleToDelete, setRaffleToDelete] = useState<string | null>(null);
  const [bulkDeleteModalVisible, setBulkDeleteModalVisible] = useState(false);
  const [bulkExportModalVisible, setBulkExportModalVisible] = useState(false);
  const [exportHistoryVisible, setExportHistoryVisible] = useState(false);

  // Convert raffles to grid items for display
  const raffleGridItems: RaffleGridItem[] = useMemo(() => {
    return raffles.map(raffle => ({
      id: raffle.id,
      name: raffle.name,
      status: raffle.status,
      participantCount: raffle.participantCount,
      backgroundImage: raffle.backgroundImagePath || undefined,
      createdDate: raffle.createdDate,
      lastModified: raffle.modifiedDate,
      animationStyle: raffle.animationStyle,
      hasRecording: false, // Will be determined from drawings data in later tasks
      winnerUsername: undefined // Will be populated from drawings data in later tasks
    }));
  }, [raffles]);

  // Filter and sort raffles
  const filteredAndSortedRaffles = useMemo(() => {
    let filtered = raffleGridItems;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(raffle =>
        raffle.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (selectedStatus.length > 0) {
      filtered = filtered.filter(raffle => selectedStatus.includes(raffle.status));
    }

    // Apply animation style filter
    if (selectedAnimationStyle.length > 0) {
      filtered = filtered.filter(raffle => selectedAnimationStyle.includes(raffle.animationStyle));
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const aValue = a[sortConfig.field as keyof RaffleGridItem];
      const bValue = b[sortConfig.field as keyof RaffleGridItem];
      
      if (aValue instanceof Date && bValue instanceof Date) {
        return sortConfig.direction === 'asc' 
          ? aValue.getTime() - bValue.getTime()
          : bValue.getTime() - aValue.getTime();
      }
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      return 0;
    });

    return filtered;
  }, [raffleGridItems, searchTerm, selectedStatus, selectedAnimationStyle, sortConfig]);

  // Statistics
  const statistics = useMemo(() => {
    const total = raffles.length;
    const draft = raffles.filter(r => r.status === 'draft').length;
    const ready = raffles.filter(r => r.status === 'ready').length;
    const completed = raffles.filter(r => r.status === 'completed').length;
    const archived = raffles.filter(r => r.status === 'archived').length;
    const totalParticipants = raffles.reduce((sum, r) => sum + r.participantCount, 0);

    return { total, draft, ready, completed, archived, totalParticipants };
  }, [raffles]);

  // Status color mapping
  const getStatusColor = (status: RaffleStatus): string => {
    switch (status) {
      case 'draft': return 'default';
      case 'ready': return 'blue';
      case 'completed': return 'green';
      case 'archived': return 'orange';
      default: return 'default';
    }
  };

  // Animation style display names
  const getAnimationStyleName = (style: AnimationStyle): string => {
    switch (style) {
      case AnimationStyle.CS2_CASE: return 'CS2 Case Opening';
      case AnimationStyle.SPINNING_WHEEL: return 'Spinning Wheel';
      case AnimationStyle.CARD_FLIP: return 'Card Flip';
      case AnimationStyle.SLOT_MACHINE: return 'Slot Machine';
      case AnimationStyle.PARTICLE_EXPLOSION: return 'Particle Explosion';
      case AnimationStyle.ZOOM_FADE: return 'Zoom & Fade';
      default: return style;
    }
  };

  // Context menu for raffle actions
  const getRaffleContextMenu = (raffle: RaffleGridItem): MenuProps['items'] => [
    {
      key: 'view',
      label: 'View Details',
      icon: <EyeOutlined />,
      onClick: () => onViewRaffle(raffle.id)
    },
    {
      key: 'edit',
      label: 'Edit Raffle',
      icon: <EditOutlined />,
      onClick: () => onEditRaffle(raffle.id),
      disabled: raffle.status === 'completed'
    },
    {
      key: 'start',
      label: 'Start Drawing',
      icon: <PlayCircleOutlined />,
      onClick: () => onStartDrawing(raffle.id),
      disabled: raffle.status !== 'ready'
    },
    { type: 'divider' },
    {
      key: 'export',
      label: 'Export Results',
      icon: <DownloadOutlined />,
      onClick: () => onExportSingle && onExportSingle(raffle.id),
      disabled: raffle.status !== 'completed'
    },
    {
      key: 'archive',
      label: raffle.status === 'archived' ? 'Unarchive' : 'Archive',
      icon: <InboxOutlined />,
      onClick: () => onArchiveRaffle(raffle.id),
      disabled: raffle.status === 'draft'
    },
    {
      key: 'delete',
      label: 'Delete Raffle',
      icon: <DeleteOutlined />,
      danger: true,
      onClick: () => handleDeleteRaffle(raffle.id)
    }
  ];

  // Handle single raffle deletion
  const handleDeleteRaffle = (id: string) => {
    setRaffleToDelete(id);
    setDeleteModalVisible(true);
  };

  const confirmDeleteRaffle = () => {
    if (raffleToDelete) {
      onDeleteRaffle(raffleToDelete);
      setDeleteModalVisible(false);
      setRaffleToDelete(null);
      message.success('Raffle deleted successfully');
    }
  };

  // Handle bulk operations
  const handleBulkDelete = () => {
    if (selectedRaffles.length === 0) {
      message.warning('Please select raffles to delete');
      return;
    }
    setBulkDeleteModalVisible(true);
  };

  const confirmBulkDelete = () => {
    onBulkDelete(selectedRaffles);
    setBulkDeleteModalVisible(false);
    setSelectedRaffles([]);
    message.success(`${selectedRaffles.length} raffles deleted successfully`);
  };

  const handleBulkExport = () => {
    if (selectedRaffles.length === 0) {
      message.warning('Please select raffles to export');
      return;
    }
    setBulkExportModalVisible(true);
  };

  const handleBulkExportConfirm = async (options: BulkExportOptions) => {
    try {
      const result = await onBulkExport(selectedRaffles, options);
      setBulkExportModalVisible(false);
      setSelectedRaffles([]);
      
      if (result.failed.length === 0) {
        message.success(`Successfully exported ${result.successful.length} raffles`);
      } else {
        message.warning(`Exported ${result.successful.length} raffles, ${result.failed.length} failed`);
      }
      
      return result;
    } catch (error) {
      message.error('Export failed');
      throw error;
    }
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('');
    setSelectedStatus([]);
    setSelectedAnimationStyle([]);
    setSortConfig({ field: 'lastModified', direction: 'desc' });
  };

  // Table columns for list view
  const tableColumns: ColumnsType<RaffleGridItem> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: true,
      render: (name: string, record: RaffleGridItem) => (
        <div>
          <Text strong>{name}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {getAnimationStyleName(record.animationStyle)}
          </Text>
        </div>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      sorter: true,
      render: (status: RaffleStatus) => (
        <Tag color={getStatusColor(status)}>
          {status.toUpperCase()}
        </Tag>
      )
    },
    {
      title: 'Participants',
      dataIndex: 'participantCount',
      key: 'participantCount',
      sorter: true,
      render: (count: number) => (
        <Badge count={count} showZero color="#1890ff" />
      )
    },
    {
      title: 'Created',
      dataIndex: 'createdDate',
      key: 'createdDate',
      sorter: true,
      render: (date: Date) => new Date(date).toLocaleDateString()
    },
    {
      title: 'Modified',
      dataIndex: 'lastModified',
      key: 'lastModified',
      sorter: true,
      render: (date: Date) => new Date(date).toLocaleDateString()
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record: RaffleGridItem) => (
        <Space>
          <Tooltip title="View Details">
            <Button size="small" icon={<EyeOutlined />} onClick={() => onViewRaffle(record.id)} />
          </Tooltip>
          <Tooltip title="Edit Raffle">
            <Button 
              size="small" 
              icon={<EditOutlined />} 
              onClick={() => onEditRaffle(record.id)}
              disabled={record.status === 'completed'}
            />
          </Tooltip>
          <Tooltip title="Start Drawing">
            <Button 
              size="small" 
              type="primary" 
              icon={<PlayCircleOutlined />} 
              onClick={() => onStartDrawing(record.id)}
              disabled={record.status !== 'ready'}
            />
          </Tooltip>
          <Dropdown menu={{ items: getRaffleContextMenu(record) || [] }} trigger={['click']}>
            <Button size="small" icon={<MoreOutlined />} />
          </Dropdown>
        </Space>
      )
    }
  ];

  // Render empty state
  if (!loading && raffles.length === 0) {
    return (
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <Title level={2}>
            <TrophyOutlined style={{ marginRight: 8, color: '#1890ff' }} />
            Raffle Dashboard
          </Title>
          <Paragraph type="secondary">
            Manage your raffles, configure settings, and conduct drawings with CS2-style animations.
          </Paragraph>
        </div>

        <Card>
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <TrophyOutlined style={{ fontSize: 64, color: '#d9d9d9', marginBottom: 16 }} />
            <Title level={3} type="secondary">No Raffles Yet</Title>
            <Paragraph type="secondary" style={{ marginBottom: 24 }}>
              Get started by creating your first raffle. You can import participants from CSV files,
              customize animations, and conduct fair drawings with Random.org integration.
            </Paragraph>
            <Space>
              <Button 
                type="primary" 
                size="large" 
                icon={<PlusOutlined />}
                onClick={onCreateRaffle}
              >
                Create New Raffle
              </Button>
            </Space>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Title level={2}>
          <TrophyOutlined style={{ marginRight: 8, color: '#1890ff' }} />
          Raffle Dashboard
        </Title>
        <Paragraph type="secondary">
          Manage your raffles, configure settings, and conduct drawings with CS2-style animations.
        </Paragraph>
      </div>

      {/* Statistics Cards */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Raffles"
              value={statistics.total}
              prefix={<TrophyOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Ready to Draw"
              value={statistics.ready}
              prefix={<PlayCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Completed"
              value={statistics.completed}
              prefix={<VideoCameraOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Participants"
              value={statistics.totalParticipants}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Controls */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={16} align="middle">
          <Col xs={24} sm={12} md={8}>
            <Search
              placeholder="Search raffles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              prefix={<SearchOutlined />}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Select
              mode="multiple"
              placeholder="Filter by status"
              value={selectedStatus}
              onChange={setSelectedStatus}
              style={{ width: '100%' }}
              allowClear
              options={[
                { value: 'draft', label: 'Draft' },
                { value: 'ready', label: 'Ready' },
                { value: 'completed', label: 'Completed' },
                { value: 'archived', label: 'Archived' }
              ]}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select
              mode="multiple"
              placeholder="Filter by animation"
              value={selectedAnimationStyle}
              onChange={setSelectedAnimationStyle}
              style={{ width: '100%' }}
              allowClear
              options={Object.values(AnimationStyle).map(style => ({
                value: style,
                label: getAnimationStyleName(style)
              }))}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Space>
              <Button onClick={clearFilters} icon={<FilterOutlined />}>
                Clear Filters
              </Button>
              <Button 
                icon={<HistoryOutlined />} 
                onClick={() => setExportHistoryVisible(true)}
              >
                Export History
              </Button>
              <Switch
                checkedChildren={<AppstoreOutlined />}
                unCheckedChildren={<UnorderedListOutlined />}
                checked={viewMode === 'grid'}
                onChange={(checked) => setViewMode(checked ? 'grid' : 'list')}
              />
            </Space>
          </Col>
        </Row>

        {/* Bulk Actions */}
        {selectedRaffles.length > 0 && (
          <Row style={{ marginTop: 16, padding: '12px', background: '#f0f2f5', borderRadius: '6px' }}>
            <Col span={12}>
              <Text strong>{selectedRaffles.length} raffles selected</Text>
            </Col>
            <Col span={12} style={{ textAlign: 'right' }}>
              <Space>
                <Button icon={<ExportOutlined />} onClick={handleBulkExport}>
                  Export Selected
                </Button>
                <Button danger icon={<DeleteOutlined />} onClick={handleBulkDelete}>
                  Delete Selected
                </Button>
                <Button onClick={() => setSelectedRaffles([])}>
                  Clear Selection
                </Button>
              </Space>
            </Col>
          </Row>
        )}
      </Card>

      {/* Action Bar */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text type="secondary">
          Showing {filteredAndSortedRaffles.length} of {raffles.length} raffles
        </Text>
        <Button type="primary" icon={<PlusOutlined />} onClick={onCreateRaffle}>
          Create New Raffle
        </Button>
      </div>

      {/* Content */}
      <Spin spinning={loading}>
        {error ? (
          <Card>
            <Empty
              description={
                <div>
                  <Text type="danger">Error loading raffles</Text>
                  <br />
                  <Text type="secondary">{error}</Text>
                </div>
              }
            />
          </Card>
        ) : filteredAndSortedRaffles.length === 0 ? (
          <Card>
            <Empty description="No raffles match your filters" />
          </Card>
        ) : viewMode === 'list' ? (
          <Card>
            <Table
              columns={tableColumns}
              dataSource={filteredAndSortedRaffles}
              rowKey="id"
              pagination={{ pageSize: 10, showSizeChanger: true }}
              rowSelection={{
                selectedRowKeys: selectedRaffles,
                onChange: (selectedRowKeys) => setSelectedRaffles(selectedRowKeys as string[]),
                type: 'checkbox'
              }}
              onChange={(_pagination, _filters, sorter) => {
                if (sorter && !Array.isArray(sorter) && sorter.field) {
                  setSortConfig({
                    field: sorter.field as keyof RaffleGridItem,
                    direction: sorter.order === 'ascend' ? 'asc' : 'desc'
                  });
                }
              }}
            />
          </Card>
        ) : (
          <Row gutter={[16, 16]}>
            {filteredAndSortedRaffles.map((raffle) => (
              <Col xs={24} sm={12} md={8} lg={6} key={raffle.id}>
                <Card
                  hoverable
                  style={{ height: '100%' }}
                  cover={
                    raffle.backgroundImage ? (
                      <div style={{ height: 120, background: `url(${raffle.backgroundImage}) center/cover` }} />
                    ) : (
                      <div style={{ height: 120, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <TrophyOutlined style={{ fontSize: 32, color: 'white' }} />
                      </div>
                    )
                  }
                  actions={[
                    <Tooltip title="View Details" key="view">
                      <EyeOutlined onClick={() => onViewRaffle(raffle.id)} />
                    </Tooltip>,
                    <Tooltip title="Edit Raffle" key="edit">
                      <EditOutlined 
                        onClick={() => onEditRaffle(raffle.id)}
                        style={{ color: raffle.status === 'completed' ? '#d9d9d9' : undefined }}
                      />
                    </Tooltip>,
                    <Tooltip title="Start Drawing" key="start">
                      <PlayCircleOutlined 
                        onClick={() => onStartDrawing(raffle.id)}
                        style={{ color: raffle.status === 'ready' ? '#52c41a' : '#d9d9d9' }}
                      />
                    </Tooltip>,
                    <Dropdown menu={{ items: getRaffleContextMenu(raffle) || [] }} trigger={['click']} key="more">
                      <MoreOutlined />
                    </Dropdown>
                  ]}
                >
                  <div style={{ height: 140 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <Title level={5} style={{ margin: 0, flex: 1 }} ellipsis={{ tooltip: raffle.name }}>
                        {raffle.name}
                      </Title>
                      <input
                        type="checkbox"
                        checked={selectedRaffles.includes(raffle.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedRaffles([...selectedRaffles, raffle.id]);
                          } else {
                            setSelectedRaffles(selectedRaffles.filter(id => id !== raffle.id));
                          }
                        }}
                        style={{ marginLeft: 8 }}
                      />
                    </div>
                    
                    <div style={{ marginBottom: 8 }}>
                      <Tag color={getStatusColor(raffle.status)}>
                        {raffle.status.toUpperCase()}
                      </Tag>
                    </div>

                    <div style={{ marginBottom: 4 }}>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        <UserOutlined style={{ marginRight: 4 }} />
                        {raffle.participantCount} participants
                      </Text>
                    </div>

                    <div style={{ marginBottom: 4 }}>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        <CalendarOutlined style={{ marginRight: 4 }} />
                        {new Date(raffle.lastModified).toLocaleDateString()}
                      </Text>
                    </div>

                    <div>
                      <Text type="secondary" style={{ fontSize: '11px' }}>
                        {getAnimationStyleName(raffle.animationStyle)}
                      </Text>
                    </div>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Spin>

      {/* Delete Confirmation Modal */}
      <Modal
        title="Delete Raffle"
        open={deleteModalVisible}
        onOk={confirmDeleteRaffle}
        onCancel={() => setDeleteModalVisible(false)}
        okText="Delete"
        okType="danger"
      >
        <p>Are you sure you want to delete this raffle? This action cannot be undone.</p>
        <p><Text type="secondary">All associated data including participants and drawing history will be permanently removed.</Text></p>
      </Modal>

      {/* Bulk Delete Confirmation Modal */}
      <Modal
        title="Delete Multiple Raffles"
        open={bulkDeleteModalVisible}
        onOk={confirmBulkDelete}
        onCancel={() => setBulkDeleteModalVisible(false)}
        okText="Delete All"
        okType="danger"
      >
        <p>Are you sure you want to delete {selectedRaffles.length} raffles? This action cannot be undone.</p>
        <p><Text type="secondary">All associated data including participants and drawing history will be permanently removed.</Text></p>
      </Modal>

      {/* Bulk Export Modal */}
      <BulkExportModal
        visible={bulkExportModalVisible}
        selectedRaffleIds={selectedRaffles}
        raffleNames={Object.fromEntries(raffles.map(r => [r.id, r.name]))}
        onExport={handleBulkExportConfirm}
        onCancel={() => setBulkExportModalVisible(false)}
      />

      {/* Export History Modal */}
      <ExportHistory
        visible={exportHistoryVisible}
        onClose={() => setExportHistoryVisible(false)}
        onReExport={onReExport}
        onClearHistory={onClearExportHistory}
      />
    </div>
  );
};

export default Dashboard;