import React, { useState } from "react";
import {
  Card,
  Typography,
  Space,
  Button,
  Row,
  Col,
  Form,
  Select,
  Switch,
  Input,
  Radio,
  Divider,
  Alert,
  Progress,
  List,
  Tag,
  Tooltip,
  message,
} from "antd";
import {
  ExportOutlined,
  FolderOpenOutlined,
  FileTextOutlined,
  TableOutlined,
  FileExcelOutlined,
  DownloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import { Raffle, Participant, Drawing, ExportOptions } from "../../types";

const { Title, Text } = Typography;
const { Option } = Select;

interface ExportManagerProps {
  raffle: Raffle | null;
  drawing: Drawing | null;
  winner: Participant | null;
  participants: Participant[];
  onExport: (options: ExportOptions) => Promise<void>;
  onComplete: () => void;
  loading: boolean;
  error: string | null;
}

const ExportManager: React.FC<ExportManagerProps> = ({
  raffle,
  drawing,
  winner,
  participants,
  onExport,
  onComplete,
  loading,
  error,
}) => {
  const [form] = Form.useForm();
  const [exportProgress, setExportProgress] = useState(0);

  const handleExport = async (values: any) => {
    try {
      const exportOptions: ExportOptions = {
        format: values.format || "csv",
        outputPath: values.outputPath || "",
        includeMetadata: values.includeTimestamp ?? true,
        customFields: values.customFields || [],
      };

      await onExport(exportOptions);
      message.success("Export completed successfully!");
    } catch (error) {
      message.error("Export failed. Please try again.");
    }
  };

  const selectOutputPath = async () => {
    try {
      const result = await window.electronAPI.showSaveDialog({
        title: "Save Export File",
        defaultPath: `${raffle?.name || "raffle"}_results`,
        filters: [
          { name: "CSV Files", extensions: ["csv"] },
          { name: "Excel Files", extensions: ["xlsx"] },
          { name: "JSON Files", extensions: ["json"] },
          { name: "All Files", extensions: ["*"] },
        ],
      });

      if (result.success && result.data && !result.data.canceled) {
        form.setFieldsValue({ outputPath: result.data.filePath });
      }
    } catch (error) {
      message.error("Failed to select output path");
    }
  };

  if (!raffle || !drawing || !winner) {
    return (
      <Card>
        <Alert
          message="Missing Data"
          description="Cannot export without raffle, drawing, and winner data."
          type="error"
          showIcon
        />
      </Card>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      <Card>
        <Title level={3}>
          <ExportOutlined /> Export Results
        </Title>

        <Text type="secondary">
          Export the drawing results and participant data in your preferred
          format.
        </Text>

        <Divider />

        {error && (
          <Alert
            message="Export Error"
            description={error}
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <Form
          form={form}
          layout="vertical"
          onFinish={handleExport}
          initialValues={{
            format: "csv",
            includeTimestamp: true,
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Export Format"
                name="format"
                rules={[{ required: true, message: "Please select a format" }]}
              >
                <Select>
                  <Option value="csv">
                    <TableOutlined /> CSV File
                  </Option>
                  <Option value="excel">
                    <FileExcelOutlined /> Excel File
                  </Option>
                  <Option value="json">
                    <FileTextOutlined /> JSON File
                  </Option>
                </Select>
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item label="Output Path" name="outputPath">
                <Input
                  placeholder="Select output location..."
                  readOnly
                  suffix={
                    <Button
                      type="text"
                      icon={<FolderOpenOutlined />}
                      onClick={selectOutputPath}
                    />
                  }
                />
              </Form.Item>
            </Col>
          </Row>

          <Title level={4}>Export Options</Title>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="includeTimestamp" valuePropName="checked">
                <Switch />
                <Text style={{ marginLeft: 8 }}>
                  Include Metadata & Timestamps
                </Text>
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                name="customFields"
                label="Custom Fields (comma-separated)"
              >
                <Input
                  placeholder="e.g., email, phone, orderStatus"
                  onChange={(e) => {
                    const fields = e.target.value
                      .split(",")
                      .map((f) => f.trim())
                      .filter((f) => f);
                    form.setFieldsValue({ customFields: fields });
                  }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Divider />

          <Title level={4}>Export Summary</Title>

          <List size="small">
            <List.Item>
              <Text strong>Raffle:</Text> {raffle.name}
            </List.Item>
            <List.Item>
              <Text strong>Winner:</Text> {winner.username} (Ticket #
              {winner.ticketNumber})
            </List.Item>
            <List.Item>
              <Text strong>Total Participants:</Text> {participants.length}
            </List.Item>
            <List.Item>
              <Text strong>Drawing Date:</Text>{" "}
              {new Date(drawing.drawTimestamp).toLocaleString()}
            </List.Item>
          </List>

          {loading && (
            <div style={{ margin: "16px 0" }}>
              <Progress percent={exportProgress} />
              <Text type="secondary">Exporting data...</Text>
            </div>
          )}

          <Divider />

          <Space>
            <Button
              type="primary"
              htmlType="submit"
              icon={<DownloadOutlined />}
              loading={loading}
              size="large"
            >
              Export Results
            </Button>

            <Button onClick={onComplete} size="large">
              Back to Dashboard
            </Button>
          </Space>
        </Form>
      </Card>
    </div>
  );
};

export default ExportManager;
