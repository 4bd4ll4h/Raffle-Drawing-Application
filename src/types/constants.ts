// Application constants and configuration values
import { AnimationStyle, RecordingQuality, LogoPosition } from './index';

// ============================================================================
// APPLICATION CONSTANTS
// ============================================================================

export const APP_NAME = 'Raffle Drawing Application';
export const APP_VERSION = '1.0.0';

// ============================================================================
// FILE SYSTEM CONSTANTS
// ============================================================================

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
export const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
export const ALLOWED_CSV_EXTENSIONS = ['.csv'];
export const ALLOWED_VIDEO_EXTENSIONS = ['.mp4', '.mov', '.avi'];

// CSV processing constants
export const MAX_CSV_ROWS = 50000; // Maximum number of participants
export const CSV_PREVIEW_ROWS = 10; // Number of rows to show in preview
export const CSV_BATCH_SIZE = 1000; // Process CSV in batches for large files

// ============================================================================
// ANIMATION CONSTANTS
// ============================================================================

export const ANIMATION_DEFAULTS = {
  DURATION: 5000, // 5 seconds
  FPS: 60,
  EASING: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)', // ease-out-quad
  PARTICLE_COUNT: 100,
  SCROLL_SPEED: 1.0
} as const;

export const ANIMATION_STYLE_NAMES: Record<AnimationStyle, string> = {
  [AnimationStyle.CS2_CASE]: 'CS2 Case Opening',
  [AnimationStyle.SPINNING_WHEEL]: 'Spinning Wheel',
  [AnimationStyle.CARD_FLIP]: 'Card Flip Reveal',
  [AnimationStyle.SLOT_MACHINE]: 'Slot Machine',
  [AnimationStyle.PARTICLE_EXPLOSION]: 'Particle Explosion',
  [AnimationStyle.ZOOM_FADE]: 'Zoom & Fade'
};

export const ANIMATION_DESCRIPTIONS: Record<AnimationStyle, string> = {
  [AnimationStyle.CS2_CASE]: 'Horizontal scrolling with gradual slowdown, mimicking CS2 case opening',
  [AnimationStyle.SPINNING_WHEEL]: 'Circular wheel rotation with pointer selection',
  [AnimationStyle.CARD_FLIP]: 'Sequential card flipping animation revealing the winner',
  [AnimationStyle.SLOT_MACHINE]: 'Vertical reels spinning independently to reveal winner',
  [AnimationStyle.PARTICLE_EXPLOSION]: 'Dramatic particle effects revealing the winner',
  [AnimationStyle.ZOOM_FADE]: 'Smooth zoom transitions with fade effects'
};

// ============================================================================
// RECORDING CONSTANTS
// ============================================================================

export const RECORDING_DEFAULTS = {
  QUALITY: '1080p' as RecordingQuality,
  FRAME_RATE: 60,
  CODEC: 'h264',
  FORMAT: 'mp4',
  AUDIO_ENABLED: false
} as const;

export const RECORDING_QUALITY_SPECS = {
  '720p': { width: 1280, height: 720, bitrate: '2500k' },
  '1080p': { width: 1920, height: 1080, bitrate: '5000k' },
  '4K': { width: 3840, height: 2160, bitrate: '15000k' }
} as const;

// ============================================================================
// UI CONSTANTS
// ============================================================================

export const DEFAULT_COLOR_SCHEME = {
  primary: '#1890ff',
  secondary: '#722ed1',
  accent: '#52c41a',
  background: '#f0f2f5'
} as const;

export const LOGO_POSITION_NAMES: Record<LogoPosition, string> = {
  'top-left': 'Top Left',
  'top-right': 'Top Right',
  'bottom-left': 'Bottom Left',
  'bottom-right': 'Bottom Right',
  'center': 'Center'
};

export const DASHBOARD_DEFAULTS = {
  GRID_COLUMNS: 4,
  PAGE_SIZE: 20,
  SORT_FIELD: 'modifiedDate',
  SORT_DIRECTION: 'desc'
} as const;

// ============================================================================
// VALIDATION CONSTANTS
// ============================================================================

export const VALIDATION_LIMITS = {
  RAFFLE_NAME_MIN_LENGTH: 1,
  RAFFLE_NAME_MAX_LENGTH: 200,
  USERNAME_MIN_LENGTH: 1,
  USERNAME_MAX_LENGTH: 100,
  EMAIL_MAX_LENGTH: 255,
  PHONE_MAX_LENGTH: 20,
  TICKET_NUMBER_MAX_LENGTH: 50,
  PARTICIPANT_PREVIEW_COUNT: 5
} as const;

export const REQUIRED_CSV_COLUMNS = [
  'Username',
  'Ticket Number',
  'User Profile'
] as const;

export const OPTIONAL_CSV_COLUMNS = [
  'First Name',
  'Last Name',
  'User Email ID',
  'Phone Number',
  'Product Name',
  'Currency',
  'Ticket Price',
  'Order ID',
  'Order Status',
  'Order Amount',
  'Ticket Purchased Date',
  'Status',
  'Stream ID'
] as const;

// ============================================================================
// API CONSTANTS
// ============================================================================

export const RANDOM_ORG_CONFIG = {
  BASE_URL: 'https://api.random.org/json-rpc/4/invoke',
  TIMEOUT: 10000, // 10 seconds
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000 // 1 second
} as const;

export const API_RATE_LIMITS = {
  RANDOM_ORG_REQUESTS_PER_DAY: 1000,
  RANDOM_ORG_REQUESTS_PER_HOUR: 100
} as const;

// ============================================================================
// DATABASE CONSTANTS
// ============================================================================

export const DATABASE_CONFIG = {
  NAME: 'raffle_app.db',
  VERSION: 1,
  TIMEOUT: 5000, // 5 seconds
  BUSY_TIMEOUT: 3000, // 3 seconds
  WAL_MODE: true,
  FOREIGN_KEYS: true
} as const;

export const TABLE_NAMES = {
  RAFFLES: 'raffles',
  DRAWINGS: 'drawings',
  SETTINGS: 'settings'
} as const;

// ============================================================================
// ERROR MESSAGES
// ============================================================================

export const ERROR_MESSAGES = {
  // File errors
  FILE_TOO_LARGE: `File size exceeds maximum limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
  INVALID_FILE_TYPE: 'Invalid file type. Please select a valid file.',
  FILE_NOT_FOUND: 'File not found or cannot be accessed',
  FILE_CORRUPTED: 'File appears to be corrupted or invalid',
  
  // CSV errors
  CSV_EMPTY: 'CSV file is empty or contains no valid data',
  CSV_INVALID_HEADERS: 'CSV file is missing required columns',
  CSV_TOO_MANY_ROWS: `CSV file contains too many rows. Maximum allowed: ${MAX_CSV_ROWS}`,
  CSV_DUPLICATE_TICKETS: 'CSV file contains duplicate ticket numbers',
  
  // Validation errors
  REQUIRED_FIELD_EMPTY: 'This field is required',
  INVALID_EMAIL: 'Please enter a valid email address',
  INVALID_URL: 'Please enter a valid URL',
  INVALID_PHONE: 'Please enter a valid phone number',
  
  // Database errors
  DATABASE_CONNECTION_FAILED: 'Failed to connect to database',
  DATABASE_OPERATION_FAILED: 'Database operation failed',
  DATABASE_CORRUPTED: 'Database file is corrupted',
  
  // API errors
  RANDOM_ORG_UNAVAILABLE: 'Random.org service is currently unavailable',
  RANDOM_ORG_QUOTA_EXCEEDED: 'Random.org API quota exceeded',
  NETWORK_ERROR: 'Network connection error',
  
  // Animation errors
  ANIMATION_FAILED: 'Animation failed to initialize',
  CANVAS_NOT_SUPPORTED: 'Canvas is not supported in this browser',
  GPU_ACCELERATION_FAILED: 'GPU acceleration is not available',
  
  // Recording errors
  FFMPEG_NOT_FOUND: 'FFmpeg is not installed or not found',
  RECORDING_FAILED: 'Recording failed to start or complete',
  CODEC_NOT_SUPPORTED: 'Selected codec is not supported',
  
  // General errors
  UNKNOWN_ERROR: 'An unknown error occurred',
  OPERATION_CANCELLED: 'Operation was cancelled by user',
  PERMISSION_DENIED: 'Permission denied to access resource'
} as const;

// ============================================================================
// SUCCESS MESSAGES
// ============================================================================

export const SUCCESS_MESSAGES = {
  RAFFLE_CREATED: 'Raffle created successfully',
  RAFFLE_UPDATED: 'Raffle updated successfully',
  RAFFLE_DELETED: 'Raffle deleted successfully',
  CSV_IMPORTED: 'CSV file imported successfully',
  DRAWING_COMPLETED: 'Drawing completed successfully',
  RECORDING_SAVED: 'Recording saved successfully',
  EXPORT_COMPLETED: 'Export completed successfully',
  SETTINGS_SAVED: 'Settings saved successfully'
} as const;

// ============================================================================
// PERFORMANCE CONSTANTS
// ============================================================================

export const PERFORMANCE_THRESHOLDS = {
  LARGE_PARTICIPANT_COUNT: 1000,
  VERY_LARGE_PARTICIPANT_COUNT: 5000,
  MAX_ANIMATION_PARTICIPANTS: 10000,
  VIRTUALIZATION_THRESHOLD: 100,
  MEMORY_WARNING_THRESHOLD: 500 * 1024 * 1024, // 500MB
  FPS_WARNING_THRESHOLD: 30
} as const;

// ============================================================================
// FEATURE FLAGS
// ============================================================================

export const FEATURE_FLAGS = {
  ENABLE_BULK_OPERATIONS: true,
  ENABLE_RECORDING: true,
  ENABLE_RANDOM_ORG: true,
  ENABLE_RARITY_SYSTEM: true,
  ENABLE_PERFORMANCE_MONITORING: true,
  ENABLE_DEBUG_MODE: process.env.NODE_ENV === 'development'
} as const;