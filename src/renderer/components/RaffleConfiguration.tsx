import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  Form,
  Input,
  Button,
  Upload,
  Select,
  Row,
  Col,
  Typography,
  Space,
  message,
  Divider,
  Radio,
  ColorPicker,
  Spin,
  Alert,
  Progress,
  Image,
  Tag,
  Tooltip,
} from "antd";
import {
  UploadOutlined,
  PictureOutlined,
  FileTextOutlined,
  SettingOutlined,
  SaveOutlined,
  CloseOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import type { UploadFile, UploadProps } from "antd/es/upload";
import type { Color } from "antd/es/color-picker";
import {
  RaffleConfig,
  AnimationStyle,
  ColorScheme,
  LogoPosition,
  CSVValidationResult,
  ValidationError,
} from "../../types";

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface RaffleConfigurationProps {
  raffle?: any; // Will be typed properly when Raffle interface is used
  onSave: (config: RaffleConfig) => void;
  onCancel: () => void;
  loading?: boolean;
  validationErrors?: ValidationError[];
}

interface AnimationStyleOption {
  value: AnimationStyle;
  label: string;
  description: string;
  preview: string;
}

const RaffleConfiguration: React.FC<RaffleConfigurationProps> = ({
  raffle,
  onSave,
  onCancel,
  loading = false,
  validationErrors = [],
}) => {
  const [form] = Form.useForm();
  const [backgroundImage, setBackgroundImage] = useState<UploadFile | null>(
    null
  );
  const [csvFile, setCsvFile] = useState<UploadFile | null>(null);
  const [csvValidation, setCsvValidation] =
    useState<CSVValidationResult | null>(null);
  const [csvValidating, setCsvValidating] = useState(false);
  const [backgroundPreview, setBackgroundPreview] = useState<string | null>(
    null
  );
  const [selectedAnimationStyle, setSelectedAnimationStyle] =
    useState<AnimationStyle>(AnimationStyle.CS2_CASE);
  const [colorScheme, setColorScheme] = useState<ColorScheme>({
    primary: "#1890ff",
    secondary: "#722ed1",
    accent: "#52c41a",
    background: "#f0f2f5",
  });

  // Animation style options with descriptions and previews
  const animationStyleOptions: AnimationStyleOption[] = [
    {
      value: AnimationStyle.CS2_CASE,
      label: "CS2 Case Opening",
      description:
        "Horizontal scrolling with gradual slowdown and dramatic reveal",
      preview: "🎁 → → → 🏆",
    },
    {
      value: AnimationStyle.SPINNING_WHEEL,
      label: "Spinning Wheel",
      description: "Circular wheel rotation with pointer selection",
      preview: "🎯 ↻ 🏆",
    },
    {
      value: AnimationStyle.CARD_FLIP,
      label: "Card Flip Reveal",
      description: "Sequential card flipping animation revealing the winner",
      preview: "🃏 ↻ 🏆",
    },
    {
      value: AnimationStyle.SLOT_MACHINE,
      label: "Slot Machine",
      description: "Vertical reels spinning and stopping on winner",
      preview: "🎰 ↕ 🏆",
    },
    {
      value: AnimationStyle.PARTICLE_EXPLOSION,
      label: "Particle Explosion",
      description: "Winner emerges from particle effects and explosions",
      preview: "✨ 💥 🏆",
    },
    {
      value: AnimationStyle.ZOOM_FADE,
      label: "Zoom & Fade",
      description:
        "Smooth zoom transitions with fade effects highlighting the winner",
      preview: "🔍 ✨ 🏆",
    },
  ];

  // Logo position options
  const logoPositionOptions = [
    { value: "top-left" as LogoPosition, label: "Top Left" },
    { value: "top-right" as LogoPosition, label: "Top Right" },
    { value: "bottom-left" as LogoPosition, label: "Bottom Left" },
    { value: "bottom-right" as LogoPosition, label: "Bottom Right" },
    { value: "center" as LogoPosition, label: "Center" },
  ];

  // Initialize form with existing raffle data
  useEffect(() => {
    if (raffle) {
      form.setFieldsValue({
        name: raffle.name,
        animationStyle: raffle.animationStyle || AnimationStyle.CS2_CASE,
        logoPosition: raffle.customSettings?.logoPosition || "top-right",
        animationDuration: raffle.customSettings?.animationDuration || 5000,
        soundEnabled: raffle.customSettings?.soundEnabled || true,
      });

      if (raffle.customSettings?.colorScheme) {
        setColorScheme(raffle.customSettings.colorScheme);
      }

      if (raffle.backgroundImagePath) {
        setBackgroundPreview(raffle.backgroundImagePath);
      }

      setSelectedAnimationStyle(
        raffle.animationStyle || AnimationStyle.CS2_CASE
      );
    }
  }, [raffle, form]);

  // Handle background image upload
  const handleBackgroundUpload: UploadProps["customRequest"] = (options) => {
    const { file, onSuccess, onError } = options;

    // Ensure file is a File object, not a string
    if (typeof file === "string") {
      message.error("Invalid file format");
      onError?.(new Error("Invalid file format"));
      return;
    }

    const fileObj = file as File;

    // Validate file type
    const isImage = fileObj.type?.startsWith("image/");
    if (!isImage) {
      message.error("Please upload an image file (JPG, PNG, GIF)");
      onError?.(new Error("Invalid file type"));
      return;
    }

    // Validate file size (max 10MB)
    const isLt10M = fileObj.size < 10 * 1024 * 1024;
    if (!isLt10M) {
      message.error("Image must be smaller than 10MB");
      onError?.(new Error("File too large"));
      return;
    }

    // Create preview URL
    const reader = new FileReader();
    reader.onload = (e) => {
      setBackgroundPreview(e.target?.result as string);
    };
    reader.readAsDataURL(fileObj);

    // Create UploadFile object from File
    const rcFile = fileObj as any; // Cast to RcFile
    rcFile.uid = Date.now().toString();
    rcFile.lastModifiedDate = new Date(fileObj.lastModified);

    const uploadFile: UploadFile = {
      uid: rcFile.uid,
      name: fileObj.name,
      status: "done",
      originFileObj: rcFile,
    };
    setBackgroundImage(uploadFile);
    onSuccess?.("ok");
  };

  // Handle CSV file upload and validation
  const handleCSVUpload: UploadProps["customRequest"] = async (options) => {
    const { file, onSuccess, onError } = options;

    // Ensure file is a File object, not a string
    if (typeof file === "string") {
      message.error("Invalid file format");
      onError?.(new Error("Invalid file format"));
      return;
    }

    const fileObj = file as File;

    // Validate file type
    const isCSV = fileObj.type === "text/csv" || fileObj.name?.endsWith(".csv");
    if (!isCSV) {
      message.error("Please upload a CSV file");
      onError?.(new Error("Invalid file type"));
      return;
    }

    // Validate file size (max 50MB)
    const isLt50M = fileObj.size < 50 * 1024 * 1024;
    if (!isLt50M) {
      message.error("CSV file must be smaller than 50MB");
      onError?.(new Error("File too large"));
      return;
    }

    // Create UploadFile object from File
    const rcFile = fileObj as any; // Cast to RcFile
    rcFile.uid = Date.now().toString();
    rcFile.lastModifiedDate = new Date(fileObj.lastModified);

    const uploadFile: UploadFile = {
      uid: rcFile.uid,
      name: fileObj.name,
      status: "uploading",
      originFileObj: rcFile,
    };
    setCsvFile(uploadFile);
    setCsvValidating(true);

    try {
      // TODO: Implement actual CSV validation using CSVService in later integration
      // For now, simulate validation
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const mockValidation: CSVValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        participantCount: 150,
        preview: [],
        duplicateTickets: [],
        totalRows: 150,
        validRows: 150,
      };

      // Update the upload file status
      const completedUploadFile: UploadFile = {
        ...uploadFile,
        status: "done",
      };
      setCsvFile(completedUploadFile);
      setCsvValidation(mockValidation);
      message.success(
        `CSV validated successfully! Found ${mockValidation.participantCount} participants.`
      );
      onSuccess?.("ok");
    } catch (error) {
      console.error("CSV validation failed:", error);
      // Update the upload file status to error
      const errorUploadFile: UploadFile = {
        ...uploadFile,
        status: "error",
      };
      setCsvFile(errorUploadFile);
      message.error("Failed to validate CSV file");
      onError?.(error as Error);
    } finally {
      setCsvValidating(false);
    }
  };

  // Handle color scheme changes
  const handleColorChange = (colorType: keyof ColorScheme, color: Color) => {
    setColorScheme((prev) => ({
      ...prev,
      [colorType]: color.toHexString(),
    }));
  };

  // Handle form submission
  const handleSubmit = async (values: any) => {
    try {
      const config: RaffleConfig = {
        name: values.name,
        backgroundImage: backgroundImage?.originFileObj,
        animationStyle: values.animationStyle,
        colorScheme,
        logoPosition: values.logoPosition,
        csvFile: csvFile?.originFileObj,
        animationDuration: values.animationDuration,
        soundEnabled: values.soundEnabled,
      };

      onSave(config);
    } catch (error) {
      console.error("Failed to save raffle configuration:", error);
      message.error("Failed to save configuration");
    }
  };

  // Remove background image
  const removeBackgroundImage = () => {
    setBackgroundImage(null);
    setBackgroundPreview(null);
  };

  // Remove CSV file
  const removeCSVFile = () => {
    setCsvFile(null);
    setCsvValidation(null);
  };

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "24px" }}>
      <Card>
        <div style={{ marginBottom: 24 }}>
          <Title level={2}>
            <SettingOutlined style={{ marginRight: 8, color: "#1890ff" }} />
            {raffle ? "Edit Raffle Configuration" : "Create New Raffle"}
          </Title>
          <Paragraph type="secondary">
            Configure your raffle settings, upload participant data, and
            customize the drawing experience.
          </Paragraph>
        </div>

        <Spin spinning={loading}>
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            initialValues={{
              animationStyle: AnimationStyle.CS2_CASE,
              logoPosition: "top-right",
              animationDuration: 5000,
              soundEnabled: true,
            }}
          >
            {/* Basic Information */}
            <Card
              size="small"
              title="Basic Information"
              style={{ marginBottom: 16 }}
            >
              <Form.Item
                name="name"
                label="Raffle Name"
                rules={[
                  { required: true, message: "Please enter a raffle name" },
                  {
                    min: 1,
                    max: 200,
                    message: "Name must be between 1 and 200 characters",
                  },
                ]}
              >
                <Input
                  placeholder="Enter raffle name (e.g., 'CS2 Skin Giveaway')"
                  prefix={<FileTextOutlined />}
                />
              </Form.Item>
            </Card>

            {/* Background Image Upload */}
            <Card
              size="small"
              title="Background Image"
              style={{ marginBottom: 16 }}
            >
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="Upload Background Image"
                    extra="Supported formats: JPG, PNG, GIF. Max size: 10MB"
                  >
                    <Upload
                      customRequest={handleBackgroundUpload}
                      showUploadList={false}
                      accept="image/*"
                    >
                      <Button
                        icon={<UploadOutlined />}
                        disabled={!!backgroundImage}
                      >
                        {backgroundImage ? "Image Uploaded" : "Select Image"}
                      </Button>
                    </Upload>

                    {backgroundImage && (
                      <div style={{ marginTop: 8 }}>
                        <Tag
                          closable
                          onClose={removeBackgroundImage}
                          icon={<PictureOutlined />}
                        >
                          {backgroundImage.name}
                        </Tag>
                      </div>
                    )}
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  {backgroundPreview && (
                    <div>
                      <Text strong>Preview:</Text>
                      <div style={{ marginTop: 8 }}>
                        <Image
                          src={backgroundPreview}
                          alt="Background preview"
                          style={{
                            maxWidth: "100%",
                            maxHeight: 200,
                            borderRadius: 8,
                          }}
                          fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6UAAABRWlDQ1BJQ0MgUHJvZmlsZQAAKJFjYGASSSwoyGFhYGDIzSspCnJ3UoiIjFJgf8LAwSDCIMogwMCcmFxc4BgQ4ANUwgCjUcG3awyMIPqyLsis7PPOq3QdDFcvjV3jOD1boQVTPQrgSkktTgbSf4A4LbmgqISBgTEFyFYuLykAsTuAbJEioKOA7DkgdjqEvQHEToKwj4DVhAQ5A9k3gGyB5IxEoBmML4BsnSQk8XQkNtReEOBxcfXxUQg1Mjc0dyHgXNJBSWpFCYh2zi+oLMpMzyhRcASGUqqCZ16yno6CkYGRAQMDKMwhqj/fAIcloxgHQqxAjIHBEugw5sUIsSQpBobtQPdLciLEVJYzMPBHMDBsayhILEqEO4DxG0txmrERhM29nYGBddr//5/DGRjYNRkY/l7////39v///y4Dmn+LgeHANwDrkl1AuO+pmgAAADhlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAAqACAAQAAAABAAAAwqADAAQAAAABAAAAwwAAAAD9b/HnAAAHlklEQVR4Ae3dP3Ik1RnG4W+FgYxN"
                        />
                      </div>
                    </div>
                  )}
                </Col>
              </Row>
            </Card>

            {/* Animation Style Selection */}
            <Card
              size="small"
              title="Animation Style"
              style={{ marginBottom: 16 }}
            >
              <Form.Item
                name="animationStyle"
                label="Select Animation Style"
                rules={[
                  {
                    required: true,
                    message: "Please select an animation style",
                  },
                ]}
              >
                <Radio.Group
                  value={selectedAnimationStyle}
                  onChange={(e) => setSelectedAnimationStyle(e.target.value)}
                  style={{ width: "100%" }}
                >
                  <Row gutter={[16, 16]}>
                    {animationStyleOptions.map((option) => (
                      <Col xs={24} sm={12} md={8} key={option.value}>
                        <Card
                          size="small"
                          hoverable
                          style={{
                            border:
                              selectedAnimationStyle === option.value
                                ? "2px solid #1890ff"
                                : "1px solid #d9d9d9",
                            cursor: "pointer",
                          }}
                          onClick={() => {
                            setSelectedAnimationStyle(option.value);
                            form.setFieldValue("animationStyle", option.value);
                          }}
                        >
                          <Radio
                            value={option.value}
                            style={{ marginBottom: 8 }}
                          >
                            <Text strong>{option.label}</Text>
                          </Radio>
                          <div
                            style={{
                              textAlign: "center",
                              fontSize: "24px",
                              margin: "8px 0",
                            }}
                          >
                            {option.preview}
                          </div>
                          <Text type="secondary" style={{ fontSize: "12px" }}>
                            {option.description}
                          </Text>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                </Radio.Group>
              </Form.Item>
            </Card>

            {/* Color Scheme Customization */}
            <Card
              size="small"
              title="Color Scheme"
              style={{ marginBottom: 16 }}
            >
              <Row gutter={16}>
                <Col xs={12} sm={6}>
                  <Form.Item label="Primary Color">
                    <ColorPicker
                      value={colorScheme.primary}
                      onChange={(color) => handleColorChange("primary", color)}
                      showText
                    />
                  </Form.Item>
                </Col>
                <Col xs={12} sm={6}>
                  <Form.Item label="Secondary Color">
                    <ColorPicker
                      value={colorScheme.secondary}
                      onChange={(color) =>
                        handleColorChange("secondary", color)
                      }
                      showText
                    />
                  </Form.Item>
                </Col>
                <Col xs={12} sm={6}>
                  <Form.Item label="Accent Color">
                    <ColorPicker
                      value={colorScheme.accent}
                      onChange={(color) => handleColorChange("accent", color)}
                      showText
                    />
                  </Form.Item>
                </Col>
                <Col xs={12} sm={6}>
                  <Form.Item label="Background Color">
                    <ColorPicker
                      value={colorScheme.background}
                      onChange={(color) =>
                        handleColorChange("background", color)
                      }
                      showText
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            {/* Logo Position */}
            <Card
              size="small"
              title="Logo Settings"
              style={{ marginBottom: 16 }}
            >
              <Form.Item
                name="logoPosition"
                label="Logo Position"
                tooltip="Choose where to position your logo overlay during animations"
              >
                <Select placeholder="Select logo position" allowClear>
                  {logoPositionOptions.map((option) => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Card>

            {/* CSV File Upload */}
            <Card
              size="small"
              title="Participant Data"
              style={{ marginBottom: 16 }}
            >
              <Form.Item
                label="Upload CSV File"
                extra="Upload a CSV file containing participant data. Required columns: Username, Ticket Number, User Profile"
                rules={[
                  {
                    required: !raffle,
                    message: "Please upload a CSV file with participant data",
                  },
                ]}
              >
                <Upload
                  customRequest={handleCSVUpload}
                  showUploadList={false}
                  accept=".csv"
                >
                  <Button
                    icon={<UploadOutlined />}
                    loading={csvValidating}
                    disabled={!!csvFile}
                  >
                    {csvValidating
                      ? "Validating..."
                      : csvFile
                        ? "CSV Uploaded"
                        : "Select CSV File"}
                  </Button>
                </Upload>

                {csvFile && (
                  <div style={{ marginTop: 8 }}>
                    <Tag
                      closable
                      onClose={removeCSVFile}
                      icon={<FileTextOutlined />}
                      color={csvValidation?.isValid ? "green" : "orange"}
                    >
                      {csvFile.name}
                    </Tag>
                  </div>
                )}
              </Form.Item>

              {/* CSV Validation Results */}
              {csvValidation && (
                <div style={{ marginTop: 16 }}>
                  {csvValidation.isValid ? (
                    <Alert
                      message="CSV Validation Successful"
                      description={
                        <div>
                          <p>
                            ✅ Found {csvValidation.participantCount} valid
                            participants
                          </p>
                          <p>✅ All required columns present</p>
                          <p>✅ No duplicate ticket numbers</p>
                        </div>
                      }
                      type="success"
                      icon={<CheckCircleOutlined />}
                      showIcon
                    />
                  ) : (
                    <Alert
                      message="CSV Validation Issues"
                      description={
                        <div>
                          <p>❌ {csvValidation.errors.length} errors found</p>
                          <p>⚠️ {csvValidation.warnings.length} warnings</p>
                          <p>
                            Valid participants: {csvValidation.validRows} of{" "}
                            {csvValidation.totalRows}
                          </p>
                        </div>
                      }
                      type="warning"
                      icon={<ExclamationCircleOutlined />}
                      showIcon
                    />
                  )}
                </div>
              )}
            </Card>

            {/* Advanced Settings */}
            <Card
              size="small"
              title="Advanced Settings"
              style={{ marginBottom: 24 }}
            >
              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="animationDuration"
                    label="Animation Duration (ms)"
                    tooltip="How long the animation should run before revealing the winner"
                  >
                    <Input
                      type="number"
                      min={2000}
                      max={30000}
                      placeholder="5000"
                      addonAfter="ms"
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="soundEnabled"
                    label="Enable Sound Effects"
                    valuePropName="checked"
                  >
                    <Radio.Group>
                      <Radio value={true}>Enabled</Radio>
                      <Radio value={false}>Disabled</Radio>
                    </Radio.Group>
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            {/* Validation Errors */}
            {validationErrors.length > 0 && (
              <Alert
                message="Validation Errors"
                description={
                  <ul>
                    {validationErrors.map((error, index) => (
                      <li key={index}>
                        {error.message} (Row: {error.row}, Column:{" "}
                        {error.column})
                      </li>
                    ))}
                  </ul>
                }
                type="error"
                style={{ marginBottom: 16 }}
              />
            )}

            {/* Action Buttons */}
            <div style={{ textAlign: "right" }}>
              <Space>
                <Button
                  onClick={onCancel}
                  icon={<CloseOutlined />}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<SaveOutlined />}
                  loading={loading}
                  disabled={loading}
                >
                  {raffle ? "Update Raffle" : "Create Raffle"}
                </Button>
              </Space>
            </div>
          </Form>
        </Spin>
      </Card>
    </div>
  );
};

export default RaffleConfiguration;
