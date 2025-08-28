// Core type definitions for the Raffle Drawing Application

// ============================================================================
// CORE DATA MODELS
// ============================================================================

export interface Raffle {
  id: string;
  name: string;
  backgroundImagePath?: string;
  csvFilePath: string;
  status: RaffleStatus;
  animationStyle: AnimationStyle;
  createdDate: Date;
  modifiedDate: Date;
  customSettings: RaffleSettings;
  participantCount: number;
}

export type RaffleStatus = 'draft' | 'ready' | 'completed' | 'archived';

export enum AnimationStyle {
  CS2_CASE = 'cs2_case',
  SPINNING_WHEEL = 'spinning_wheel',
  CARD_FLIP = 'card_flip',
  SLOT_MACHINE = 'slot_machine',
  PARTICLE_EXPLOSION = 'particle_explosion',
  ZOOM_FADE = 'zoom_fade'
}

export interface Participant {
  id: string;
  raffleId: string;
  username: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  profileImageUrl: string;
  ticketNumber: string;
  importDate: Date;
  // Additional fields from CSV that might be useful
  productName?: string;
  currency?: string;
  ticketPrice?: number;
  orderId?: string;
  orderStatus?: string;
  orderAmount?: number;
  ticketPurchasedDate?: string;
  status?: string;
  streamId?: string;
}

export interface Drawing {
  id: string;
  raffleId: string;
  winnerId: string; // Changed from winnerUsername to winnerId for consistency
  winnerUsername: string;
  winnerTicketNumber: string;
  drawTimestamp: Date;
  randomOrgVerification?: string;
  recordingFilePath?: string;
  drawSettings: DrawingSettings;
}

export interface RaffleSettings {
  colorScheme: ColorScheme;
  logoPosition: LogoPosition;
  animationDuration: number;
  soundEnabled: boolean;
}

export interface DrawingSettings {
  recordingEnabled: boolean;
  recordingQuality: RecordingQuality;
  animationStyle: AnimationStyle;
}

export interface ColorScheme {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
}

export type LogoPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';

export type RecordingQuality = '720p' | '1080p' | '4K';

// ============================================================================
// RARITY SYSTEM INTERFACES
// ============================================================================

export interface RarityLevel {
  name: string;
  color: string;
  chance: number; // Percentage as decimal (e.g., 0.7992 for 79.92%)
}

export interface RarityColorMap {
  [key: string]: RarityLevel;
}

// CS2-style rarity definitions with official drop rates
// Note: Consumer Grade adjusted to ensure total equals exactly 1.0
export const CS2_RARITY_LEVELS: RarityColorMap = {
  consumer: {
    name: 'Consumer Grade',
    color: '#B0C3D9',
    chance: 0.79695 // 79.695% (adjusted to make total = 100%)
  },
  industrial: {
    name: 'Industrial Grade',
    color: '#5E98D9',
    chance: 0.1598 // 15.98%
  },
  milspec: {
    name: 'Mil-Spec',
    color: '#4B69FF',
    chance: 0.032 // 3.2%
  },
  restricted: {
    name: 'Restricted',
    color: '#8847FF',
    chance: 0.0064 // 0.64%
  },
  classified: {
    name: 'Classified',
    color: '#D32CE6',
    chance: 0.0026 // 0.26%
  },
  covert: {
    name: 'Covert',
    color: '#EB4B4B',
    chance: 0.002 // 0.20%
  },
  exceedinglyRare: {
    name: 'Exceedingly Rare',
    color: '#FFD700',
    chance: 0.00025 // 0.025%
  }
};

// ============================================================================
// CSV DATA INTERFACES
// ============================================================================

// Raw CSV row interface matching the actual CSV format from examples
export interface CSVRow {
  Username: string;
  'First Name'?: string;
  'Last Name'?: string;
  'User Email ID'?: string;
  'Phone Number'?: string;
  'Product Name'?: string;
  Currency?: string;
  'Ticket Price'?: string;
  'Ticket Number': string;
  'Order ID'?: string;
  'Order Status'?: string;
  'Order Amount'?: string;
  'Ticket Purchased Date'?: string;
  Status?: string;
  'User Billing Fist Name'?: string; // Note: typo in original CSV
  'User Billing Last name'?: string;
  'Billing Email address'?: string;
  'Billing Phone Number'?: string;
  'Billing Company Name'?: string;
  'Shipping Company Name'?: string;
  'Billing Country / Region'?: string;
  'Billing Address Line 1'?: string;
  'Billing Address Line 2'?: string;
  'Billing Town / City'?: string;
  'Billing State'?: string;
  'Billing PIN Code'?: string;
  'Stream ID'?: string;
  'User Profile': string;
}

// Simplified CSV interface for validation (required fields only)
export interface MinimalCSVRow {
  Username: string;
  'Ticket Number': string;
  'User Profile': string;
}

// ============================================================================
// VALIDATION AND ERROR HANDLING INTERFACES
// ============================================================================

export interface ValidationError {
  type: 'missing_column' | 'invalid_format' | 'duplicate_ticket' | 'invalid_url' | 'empty_required_field' | 'invalid_ticket_number';
  row: number;
  column: string;
  message: string;
  severity: 'error' | 'warning';
  value?: string; // The actual value that caused the error
}

export interface ValidationWarning {
  type: 'unexpected_column' | 'invalid_url' | 'invalid_format' | 'missing_optional_field' | 'data_truncated';
  row: number;
  column: string;
  message: string;
  severity: 'warning';
  value?: string;
}

export interface CSVValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  participantCount: number;
  preview: Participant[];
  duplicateTickets: string[]; // List of duplicate ticket numbers found
  totalRows: number;
  validRows: number;
}

// Database error categories
export interface DatabaseError extends Error {
  type: 'connection' | 'constraint' | 'disk_space' | 'corruption' | 'migration' | 'transaction';
  operation: string;
  recoverable: boolean;
  sqlState?: string;
  details?: Record<string, any>;
}

// API error categories
export interface APIError {
  type: 'network' | 'rate_limit' | 'invalid_response' | 'service_unavailable' | 'authentication' | 'quota_exceeded' | 'api_error';
  message: string;
  fallbackUsed: boolean;
  retryAfter?: number;
  statusCode?: number;
  endpoint?: string;
}

// File system error categories
export interface FileSystemError extends Error {
  type: 'permission_denied' | 'file_not_found' | 'disk_full' | 'invalid_path' | 'file_locked' | 'corrupted_file';
  operation: string;
  filePath: string;
  recoverable: boolean;
}

// Animation error categories
export interface AnimationError extends Error {
  type: 'canvas_error' | 'image_load_failed' | 'performance_degradation' | 'memory_exceeded' | 'gpu_error';
  animationStyle: AnimationStyle;
  participantCount: number;
  recoverable: boolean;
}

// Recording error categories
export interface RecordingError extends Error {
  type: 'ffmpeg_not_found' | 'codec_unsupported' | 'disk_space' | 'permission_denied' | 'encoding_failed';
  quality: RecordingQuality;
  outputPath?: string;
  recoverable: boolean;
}

// ============================================================================
// ANIMATION AND RECORDING INTERFACES
// ============================================================================

export interface AnimationConfig {
  duration: number; // in milliseconds
  easing: string | ((t: number) => number); // CSS easing function or easing function
  particleCount?: number; // for particle-based animations
  scrollSpeed: number; // for scrolling animations
  rarityColors: RarityColorMap;
  showRarityEffects: boolean;
  targetFPS?: number;
  enableHardwareAcceleration?: boolean;
}

export interface RecordingOptions {
  quality: RecordingQuality;
  frameRate: 30 | 60;
  codec: 'h264' | 'h265';
  outputFormat: 'mp4' | 'mov' | 'avi';
  audioEnabled: boolean;
  outputPath?: string;
}

// ============================================================================
// SERVICE INTERFACES
// ============================================================================

export interface RandomSelectionResult {
  winner: Participant;
  verificationData?: string;
  fallbackUsed: boolean;
  timestamp: Date;
  method: 'random_org' | 'crypto_fallback' | 'single_participant';
}

export interface ExportOptions {
  format: 'csv' | 'json' | 'xlsx';
  includeMetadata: boolean;
  customFields?: string[];
  outputPath?: string;
}

export interface BulkOperationResult {
  successful: string[]; // IDs of successful operations
  failed: Array<{
    id: string;
    error: string;
  }>;
  totalProcessed: number;
}

// ============================================================================
// COMPONENT PROP INTERFACES
// ============================================================================

export interface DashboardProps {
  raffles: Raffle[];
  onCreateRaffle: () => void;
  onEditRaffle: (id: string) => void;
  onDeleteRaffle: (id: string) => void;
  onStartDrawing: (id: string) => void;
  onBulkDelete?: (ids: string[]) => void;
  onBulkExport?: (ids: string[], options: ExportOptions) => void;
  loading?: boolean;
  error?: string;
}

export interface RaffleConfigProps {
  raffle?: Raffle;
  onSave: (config: RaffleConfig) => void;
  onCancel: () => void;
  loading?: boolean;
  validationErrors?: ValidationError[];
}

export interface RaffleConfig {
  name: string;
  backgroundImage?: File;
  animationStyle: AnimationStyle;
  colorScheme: ColorScheme;
  logoPosition: LogoPosition;
  csvFile?: File;
  animationDuration?: number;
  soundEnabled?: boolean;
}

export interface AnimationEngineProps {
  participants: Participant[];
  winner: Participant;
  animationStyle: AnimationStyle;
  backgroundImage?: string;
  onAnimationComplete: () => void;
  recordingEnabled: boolean;
  config: AnimationConfig;
}

export interface CSVImportProps {
  onImportComplete: (participants: Participant[]) => void;
  onValidationError: (errors: ValidationError[]) => void;
  maxFileSize?: number; // in bytes
  allowedExtensions?: string[];
  previewRowCount?: number;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  field: keyof RaffleGridItem;
  direction: SortDirection;
}

export interface FilterConfig {
  status?: RaffleStatus[];
  animationStyle?: AnimationStyle[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  searchTerm?: string;
}

export interface PaginationConfig {
  page: number;
  pageSize: number;
  total: number;
}

// Grid item for dashboard display
export interface RaffleGridItem {
  id: string;
  name: string;
  status: RaffleStatus;
  participantCount: number;
  backgroundImage?: string;
  createdDate: Date;
  lastModified: Date;
  animationStyle: AnimationStyle;
  hasRecording?: boolean;
  winnerUsername?: string;
}

// ============================================================================
// VALIDATION SCHEMAS (for runtime validation)
// ============================================================================

export interface ValidationSchema {
  required: string[];
  optional: string[];
  types: Record<string, 'string' | 'number' | 'boolean' | 'date' | 'url' | 'email'>;
  constraints: Record<string, {
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    min?: number;
    max?: number;
  }>;
}

// CSV validation schema
export const CSV_VALIDATION_SCHEMA: ValidationSchema = {
  required: ['Username', 'Ticket Number', 'User Profile'],
  optional: [
    'First Name', 'Last Name', 'User Email ID', 'Phone Number',
    'Product Name', 'Currency', 'Ticket Price', 'Order ID',
    'Order Status', 'Order Amount', 'Ticket Purchased Date',
    'Status', 'Stream ID'
  ],
  types: {
    'Username': 'string',
    'First Name': 'string',
    'Last Name': 'string',
    'User Email ID': 'email',
    'Phone Number': 'string',
    'Product Name': 'string',
    'Currency': 'string',
    'Ticket Price': 'number',
    'Ticket Number': 'string',
    'Order ID': 'string',
    'Order Status': 'string',
    'Order Amount': 'number',
    'Ticket Purchased Date': 'string',
    'Status': 'string',
    'Stream ID': 'string',
    'User Profile': 'url'
  },
  constraints: {
    'Username': { minLength: 1, maxLength: 100 },
    'Ticket Number': { minLength: 1, maxLength: 50 },
    'User Profile': { minLength: 1 },
    'User Email ID': { maxLength: 255 },
    'Phone Number': { maxLength: 20 }
  }
};

// Raffle validation schema
export const RAFFLE_VALIDATION_SCHEMA: ValidationSchema = {
  required: ['name', 'animationStyle'],
  optional: ['backgroundImagePath', 'customSettings'],
  types: {
    'name': 'string',
    'animationStyle': 'string',
    'backgroundImagePath': 'string'
  },
  constraints: {
    'name': { minLength: 1, maxLength: 200 }
  }
};