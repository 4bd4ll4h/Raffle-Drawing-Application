import React, { useState } from 'react';
import {
  Card,
  Typography,
  Space,
  Button,
  Row,
  Col,
  Statistic,
  Avatar,
  Tag,
  Descriptions,
  Alert,
  Image,
  Divider,
  Timeline,
  Badge,
  Tooltip,
} from 'antd';
import {
  TrophyOutlined,
  UserOutlined,
  CalendarOutlined,
  ExportOutlined,
  PlusOutlined,
  HomeOutlined,
  PlayCircleOutlined,
  VideoCameraOutlined,
  DownloadOutlined,
  ShareAltOutlined,
  PrinterOutlined,
} from '@ant-design/icons';
import { Raffle, Participant, Drawing } from '../../types';
import { CS2_RARITY_LEVELS } from '../../types';

const { Title, Text, Paragraph } = Typography;

interface DrawingResultsProps {
  raffle: Raffle | null;
  winner: Participant | null;
  drawing: Drawing | null;
  participants: Participant[];
  onExport: () => void;
  onNewDrawing: () => void;
  onBackToDashboard: () => void;
}

const DrawingResults: React.FC<DrawingResultsProps> = ({
  raffle,
  winner,
  drawing,
  participants,
  onExport,
  onNewDrawing,
  onBackToDashboard,
}) => {
  const [showAllParticipants, setShowAllParticipants] = useState(false);

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const getRarityInfo = (participant: Participant) => {
    // This would normally come from the participant data after rarity assignment
    // For now, we'll use a placeholder
    const rarityKeys = Object.keys(CS2_RARITY_LEVELS);
    const randomRarity = rarityKeys[Math.floor(Math.random() * rarityKeys.length)];
    return CS2_RARITY_LEVELS[randomRarity];
  };

  const getAnimationStyleName = (style: string): string => {
    switch (style) {
      case 'cs2_case': return 'CS2 Case Opening';
      case 'spinning_wheel': return 'Spinning Wheel';
      case 'card_flip': return 'Card Flip';
      case 'slot_machine': return 'Slot Machine';
      case 'particle_explosion': return 'Particle Explosion';
      case 'zoom_fade': return 'Zoom & Fade';
      default: return style;
    }
  };

  const formatDateTime = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date(date));
  };

  const renderWinnerCard = () => {
    if (!winner) {
      return (
        <Card>
          <Alert
            message="No Winner Selected"
            description="No winner data is available for this drawing."
            type="warning"
            showIcon
          />
        </Card>
      );
    }

    const rarityInfo = getRarityInfo(winner);

    return (
      <Card
        style={{
          background: `linear-gradient(135deg, ${rarityInfo.color}20, ${rarityInfo.color}10)`,
          border: `2px solid ${rarityInfo.color}`,
        }}
      >
        <Row gutter={24} align="middle">
          <Col xs={24} sm={8} style={{ textAlign: 'center' }}>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <Avatar
                size={120}
                src={winner.profileImageUrl}
                icon={<UserOutlined />}
                style={{
                  border: `4px solid ${rarityInfo.color}`,
                  boxShadow: `0 0 20px ${rarityInfo.color}40`,
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: -10,
                  right: -10,
                  background: rarityInfo.color,
                  borderRadius: '50%',
                  padding: '8px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                }}
              >
                <TrophyOutlined style={{ color: 'white', fontSize: '24px' }} />
              </div>
            </div>
          </Col>
          
          <Col xs={24} sm={16}>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <div>
                <Title level={2} style={{ margin: 0, color: rarityInfo.color }}>
                  🎉 {winner.username}
                </Title>
                <Text type="secondary" style={{ fontSize: '16px' }}>
                  Ticket #{winner.ticketNumber}
                </Text>
              </div>
              
              <div>
                <Tag
                  color={rarityInfo.color}
                  style={{
                    fontSize: '14px',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontWeight: 'bold',
                  }}
                >
                  {rarityInfo.name}
                </Tag>
              </div>
              
              <Descriptions column={1} size="small">
                {winner.firstName && (
                  <Descriptions.Item label="Name">
                    {winner.firstName} {winner.lastName}
                  </Descriptions.Item>
                )}
                {winner.email && (
                  <Descriptions.Item label="Email">
                    {winner.email}
                  </Descriptions.Item>
                )}
                {winner.phoneNumber && (
                  <Descriptions.Item label="Phone">
                    {winner.phoneNumber}
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Space>
          </Col>
        </Row>
      </Card>
    );
  };

  const renderDrawingInfo = () => {
    if (!raffle || !drawing) {
      return null;
    }

    return (
      <Card title="Drawing Information" size="small">
        <Descriptions column={{ xs: 1, sm: 2 }} size="small">
          <Descriptions.Item label="Raffle Name">
            {raffle.name}
          </Descriptions.Item>
          <Descriptions.Item label="Drawing Time">
            <Space>
              <CalendarOutlined />
              {formatDateTime(drawing.drawTimestamp)}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="Animation Style">
            <Space>
              <PlayCircleOutlined />
              {getAnimationStyleName(raffle.animationStyle)}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="Total Participants">
            <Badge count={participants.length} showZero color="#1890ff" />
          </Descriptions.Item>
          {drawing.recordingFilePath && (
            <Descriptions.Item label="Recording">
              <Space>
                <VideoCameraOutlined />
                <Text>Available</Text>
                <Button
                  size="small"
                  type="link"
                  icon={<DownloadOutlined />}
                  onClick={() => {
                    // Open recording file location
                    window.electronAPI?.showOpenDialog?.({
                      defaultPath: drawing.recordingFilePath,
                    });
                  }}
                >
                  Open
                </Button>
              </Space>
            </Descriptions.Item>
          )}
          {drawing.randomOrgVerification && (
            <Descriptions.Item label="Verification">
              <Tooltip title="Random.org verification data available">
                <Tag color="green">Verified</Tag>
              </Tooltip>
            </Descriptions.Item>
          )}
        </Descriptions>
      </Card>
    );
  };

  const renderStatistics = () => {
    const totalParticipants = participants.length;
    const winnerIndex = participants.findIndex(p => p.id === winner?.id);
    const winningOdds = totalParticipants > 0 ? (1 / totalParticipants * 100).toFixed(4) : '0';

    return (
      <Row gutter={16}>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Total Participants"
              value={totalParticipants}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Winning Odds"
              value={`${winningOdds}%`}
              prefix={<TrophyOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Winner Position"
              value={winnerIndex >= 0 ? winnerIndex + 1 : 'N/A'}
              suffix={`/ ${totalParticipants}`}
              prefix={<Badge />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Drawing Method"
              value={drawing?.randomOrgVerification ? 'Random.org' : 'Crypto Fallback'}
              valueStyle={{ 
                color: drawing?.randomOrgVerification ? '#52c41a' : '#fa8c16',
                fontSize: '16px',
              }}
            />
          </Card>
        </Col>
      </Row>
    );
  };

  const renderParticipantsList = () => {
    const displayParticipants = showAllParticipants ? participants : participants.slice(0, 10);

    return (
      <Card
        title="All Participants"
        size="small"
        extra={
          participants.length > 10 && (
            <Button
              type="link"
              onClick={() => setShowAllParticipants(!showAllParticipants)}
            >
              {showAllParticipants ? 'Show Less' : `Show All (${participants.length})`}
            </Button>
          )
        }
      >
        <Row gutter={[8, 8]}>
          {displayParticipants.map((participant, index) => {
            const isWinner = participant.id === winner?.id;
            const rarityInfo = getRarityInfo(participant);
            
            return (
              <Col key={participant.id} xs={12} sm={8} md={6} lg={4}>
                <Card
                  size="small"
                  hoverable
                  style={{
                    border: isWinner ? `2px solid ${rarityInfo.color}` : '1px solid #d9d9d9',
                    background: isWinner ? `${rarityInfo.color}10` : undefined,
                  }}
                  bodyStyle={{ padding: '8px' }}
                >
                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    <div style={{ textAlign: 'center' }}>
                      <Avatar
                        size={40}
                        src={participant.profileImageUrl}
                        icon={<UserOutlined />}
                        style={{
                          border: isWinner ? `2px solid ${rarityInfo.color}` : undefined,
                        }}
                      />
                      {isWinner && (
                        <div style={{ marginTop: 4 }}>
                          <TrophyOutlined style={{ color: rarityInfo.color }} />
                        </div>
                      )}
                    </div>
                    
                    <div style={{ textAlign: 'center' }}>
                      <Text
                        strong={isWinner}
                        style={{
                          fontSize: '12px',
                          color: isWinner ? rarityInfo.color : undefined,
                        }}
                        ellipsis={{ tooltip: participant.username }}
                      >
                        {participant.username}
                      </Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: '10px' }}>
                        #{participant.ticketNumber}
                      </Text>
                    </div>
                    
                    <div style={{ textAlign: 'center' }}>
                      <Tag
                        color={rarityInfo.color}
                        style={{ fontSize: '10px', padding: '0 4px' }}
                      >
                        {rarityInfo.name.split(' ')[0]}
                      </Tag>
                    </div>
                  </Space>
                </Card>
              </Col>
            );
          })}
        </Row>
      </Card>
    );
  };

  const renderTimeline = () => {
    if (!raffle || !drawing) return null;

    const timelineItems = [
      {
        color: 'blue',
        children: (
          <div>
            <Text strong>Raffle Created</Text>
            <br />
            <Text type="secondary">{formatDateTime(raffle.createdDate)}</Text>
          </div>
        ),
      },
      {
        color: 'green',
        children: (
          <div>
            <Text strong>Participants Loaded</Text>
            <br />
            <Text type="secondary">{participants.length} participants imported</Text>
          </div>
        ),
      },
      {
        color: 'orange',
        children: (
          <div>
            <Text strong>Drawing Started</Text>
            <br />
            <Text type="secondary">Animation: {getAnimationStyleName(raffle.animationStyle)}</Text>
          </div>
        ),
      },
      {
        color: 'red',
        children: (
          <div>
            <Text strong>Winner Selected</Text>
            <br />
            <Text type="secondary">{formatDateTime(drawing.drawTimestamp)}</Text>
            <br />
            <Text strong style={{ color: '#52c41a' }}>{winner?.username}</Text>
          </div>
        ),
      },
    ];

    return (
      <Card title="Drawing Timeline" size="small">
        <Timeline items={timelineItems} />
      </Card>
    );
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (!raffle) {
    return (
      <Card>
        <Alert
          message="No Raffle Data"
          description="No raffle data is available to display results."
          type="warning"
          showIcon
          action={
            <Button onClick={onBackToDashboard}>
              Go to Dashboard
            </Button>
          }
        />
      </Card>
    );
  }

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Title level={2}>
          <TrophyOutlined style={{ marginRight: 8, color: '#1890ff' }} />
          Drawing Results
        </Title>
        <Paragraph type="secondary">
          View the winner and complete results for "{raffle.name}"
        </Paragraph>
      </div>

      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Winner Card */}
        {renderWinnerCard()}

        {/* Statistics */}
        {renderStatistics()}

        {/* Drawing Information */}
        {renderDrawingInfo()}

        {/* Timeline */}
        <Row gutter={16}>
          <Col xs={24} lg={12}>
            {renderTimeline()}
          </Col>
          <Col xs={24} lg={12}>
            <Card title="Quick Actions" size="small">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Button
                  type="primary"
                  icon={<ExportOutlined />}
                  onClick={onExport}
                  block
                  size="large"
                >
                  Export Results
                </Button>
                
                <Button
                  icon={<ShareAltOutlined />}
                  onClick={() => {
                    // Copy winner info to clipboard
                    const winnerInfo = `🎉 Winner: ${winner?.username}\nTicket: #${winner?.ticketNumber}\nRaffle: ${raffle.name}`;
                    navigator.clipboard.writeText(winnerInfo);
                  }}
                  block
                >
                  Copy Winner Info
                </Button>
                
                <Button
                  icon={<PrinterOutlined />}
                  onClick={() => window.print()}
                  block
                >
                  Print Results
                </Button>
                
                <Divider />
                
                <Button
                  icon={<PlusOutlined />}
                  onClick={onNewDrawing}
                  block
                >
                  Start New Drawing
                </Button>
                
                <Button
                  icon={<HomeOutlined />}
                  onClick={onBackToDashboard}
                  block
                >
                  Back to Dashboard
                </Button>
              </Space>
            </Card>
          </Col>
        </Row>

        {/* All Participants */}
        {renderParticipantsList()}
      </Space>
    </div>
  );
};

export default DrawingResults;