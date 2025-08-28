# Raffle Drawing Application

A comprehensive Electron desktop application for managing and conducting raffle drawings with CS2-style animations. Built with Electron, React, TypeScript, and modern web technologies.

## Features

- **Cross-Platform**: Runs on Windows, macOS, and Linux
- **Modern Tech Stack**: Electron + React + TypeScript
- **CS2-Style Animations**: Multiple animation styles for engaging raffle drawings
- **Random.org Integration**: True randomness with cryptographic fallback
- **CSV Import**: Easy participant management via CSV files
- **Screen Recording**: Built-in FFmpeg integration for recording drawings
- **Professional UI**: Ant Design components with custom theming

## Development Setup

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd raffle-drawing-application

# Install dependencies
npm install
```

### Development Scripts

```bash
# Start development server (both main and renderer processes)
npm run dev

# Build for production
npm run build

# Start the built application
npm start

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```

### Building for Distribution

```bash
# Build for all platforms
npm run dist

# Build for specific platforms
npm run dist:win    # Windows
npm run dist:mac    # macOS
npm run dist:linux  # Linux
```

## Project Structure

```
src/
├── main/                 # Electron main process
│   ├── main.ts          # Main application entry point
│   └── preload.ts       # Preload script for secure IPC
├── renderer/            # React frontend
│   ├── components/      # React components
│   ├── styles/         # CSS styles
│   ├── App.tsx         # Main React app
│   └── index.tsx       # React entry point
└── types/              # TypeScript type definitions
    └── index.ts        # Shared types
```

## Technology Stack

- **Desktop Framework**: Electron 28+
- **Frontend**: React 18 + TypeScript
- **UI Library**: Ant Design 5
- **Animation**: Framer Motion
- **Database**: SQLite with better-sqlite3
- **Build Tool**: Webpack 5
- **Testing**: Jest + React Testing Library
- **Linting**: ESLint + TypeScript ESLint

## Development Guidelines

- Use TypeScript strict mode for type safety
- Follow React functional component patterns
- Implement proper error handling and validation
- Write tests for all components and services
- Use semantic commit messages
- Follow the established project structure

## Next Steps

This project structure is now ready for implementing the raffle drawing features. The next tasks will involve:

1. Database foundation and file system structure
2. Core data models and interfaces  
3. CSV import and validation system
4. Random.org API integration
5. Animation engine development
6. UI components for raffle management

See the implementation plan in `.kiro/specs/raffle-drawing-app/tasks.md` for detailed next steps.

---

# Technical Specifications
## Core Functionality Requirements

### 1. Admin Dashboard System
- **Raffle Management Interface**: Central dashboard displaying all raffles in grid/list view
- **Raffle CRUD Operations**:
  - **Add New Raffle**: Create raffle with required fields
  - **Edit Existing Raffle**: Modify raffle details and settings
  - **Delete Raffle**: Remove raffle with confirmation dialog
- **Raffle Properties**:
  - Raffle name (required)
  - Background image upload/selection
  - Status (Draft, Ready, Completed, Archived)
  - Start Drawing button (when status is "Ready")
- **Dashboard Features**:
  - Search/filter raffles by name or status
  - Sort by date created, last modified, or status
  - Quick actions menu for each raffle

### 2. Raffle Configuration System
- **CSV File Upload**:
  - Specific format validation for contestant data
  - Required columns: Username, Profile Image Path/URL, Ticket Number, Email (optional)
  - File validation with error reporting for incorrect format
  - Preview imported data before saving
- **Visual Customization Options**:
  - Background image upload (supports JPG, PNG, GIF)
  - **Winner Animation Styles** (suggest multiple options):
    - Classic CS2 Case Opening (horizontal scroll)
    - Spinning Wheel Animation
    - Card Flip Reveal
    - Slot Machine Style
    - Particle Explosion Reveal
    - Zoom & Fade Animation
  - Color scheme customization for UI elements
  - Logo overlay positioning options

### 3. Data Import & Management
- **CSV File Import**: Application must read and process CSV files containing:
  - Username
  - Profile picture (likely file paths or URLs)
  - Ticket number
- **Data Validation**: Ensure imported data integrity
- **Error Handling**: Graceful handling of malformed CSV files

### 4. Random Winner Selection
- **Integration**: Use Random.org API for true randomness
- **API Implementation**: 
  - Make API calls to Random.org
  - Handle API responses and potential failures
  - Implement fallback randomization if API unavailable
- **Winner Selection Logic**: Select random ticket from imported dataset

### 5. Animation System (CS2-Style Case Opening)
- **Visual Design**: Horizontal scrolling animation mimicking CS2 case openings
- **Profile Display**: Show participant profile images during animation
- **Animation Flow**:
  - Start with rapid scrolling through profiles
  - Gradually slow down
  - Stop on winner with dramatic reveal
- **Smooth Performance**: 60fps animation with proper easing

### 6. Rarity System Implementation
- **Color Overlay System**: 
```
 { "rarity": "Consumer Grade", "color": "#B0C3D9", "chance": 79.92 },
  { "rarity": "Industrial Grade", "color": "#5E98D9", "chance": 15.98 },
  { "rarity": "Mil-Spec", "color": "#4B69FF", "chance": 3.2 },
  { "rarity": "Restricted", "color": "#8847FF", "chance": 0.64 },
  { "rarity": "Classified", "color": "#D32CE6", "chance": 0.26 },
  { "rarity": "Covert", "color": "#EB4B4B", "chance": 0.20 },
  { "rarity": "Exceedingly Rare", "color": "#FFD700", "chance": 0.025 }
```
- **Drop Rate Logic**: Implement official CS2 drop percentages for color assignment
- **Random Assignment**: Each ticket gets randomly assigned rarity during display

### 7. Advanced Export & Bulk Operations
- **Individual Raffle Export**:
  - Save winner and raffle information to CSV
  - Custom file location selection dialog
  - Include: Winner details, raffle name, timestamp, Random.org verification
- **Bulk Operations Dashboard**:
  - Multi-select raffles functionality
  - **Bulk Export Options**:
    - Download all winners from selected raffles
    - Combined CSV with all raffle data
    - Separate files for each selected raffle
    - ZIP archive containing multiple CSV files
  - **Bulk Status Updates**: Change multiple raffle statuses simultaneously
  - **Bulk Delete**: Remove multiple raffles with confirmation

### 8. Screen Recording Integration (FFmpeg)
- **Recording Functionality**:
  - Integrate FFmpeg for high-quality screen recording
  - Record drawing animations in best possible quality (1080p/4K support)
  - Audio recording option (system audio/microphone)
- **Recording Settings**:
  - Video quality presets (720p, 1080p, 4K)
  - Frame rate options (30fps, 60fps)
  - Codec selection (H.264, H.265)
  - Output format (MP4, MOV, AVI)
- **Recording Controls**:
  - Start/stop recording before/after drawing
  - Automatic recording start with drawing initiation
  - Recording indicator during draw
  - Save location selection for recorded videos

### 9. Data Persistence & Settings Management
- **Database System**:
  - **Local SQLite Database** for raffle data storage:
    - Raffles table (id, name, background, status, created_date, settings)
    - Contestants table (raffle_id, username, profile_image, ticket_number, email)
    - Drawings table (raffle_id, winner_id, timestamp, verification_data, recording_path)
    - Settings table (user preferences, app configurations)
- **Settings Storage**:
  - User preferences (default export location, recording settings, UI theme)
  - Application settings (API keys, default animation styles)
  - Export/Import settings for backup purposes

### 10. Logging & History System
- **Draw Logging**: Record each raffle draw with:
  - Timestamp
  - Competition name
  - Winner details (username, ticket number)
  - Random.org verification data
- **Persistent Storage**: Save history locally or in database
- **Export Functionality**: Allow history export (CSV/JSON format)

### 11. Customization Features
- **Background Support**: Allow custom background images/themes
- **UI Flexibility**: Configurable elements based on brand requirements

## Technical Deliverables

### Electron Desktop Application Requirements
- **Cross-platform Compatibility**: Windows, macOS, Linux support
- **Native Desktop Integration**:
  - File system access for CSV imports and exports
  - Native file dialogs
  - System notifications
  - Auto-updater functionality
- **Application Architecture**:
  - Main process for system operations
  - Renderer process for UI
  - IPC communication between processes

### Frontend Requirements
- **Responsive Design**: Works on desktop/tablet
- **Intuitive UI**: Easy file upload and raffle management
- **Real-time Feedback**: Progress indicators and status updates
- **Accessibility**: Basic accessibility compliance

### Backend/Data Requirements
- **SQLite Database**: Local database for all application data
- **File Processing**: Advanced CSV parsing with format validation
- **API Integration**: Reliable Random.org API handling with offline fallback
- **FFmpeg Integration**: Video recording capabilities with quality options
- **Export System**: Multiple export formats and bulk operations
- **Settings Management**: Persistent user preferences and app configurations

### Performance Requirements
- **Animation Performance**: Smooth 60fps animations with hardware acceleration
- **Database Performance**: Efficient queries for large raffle datasets
- **File Size Handling**: Support large CSV files (10,000+ entries) with streaming
- **Recording Performance**: High-quality video recording without affecting animation
- **Response Time**: Quick loading and processing, background operations for heavy tasks

## Reference Materials Provided
- Example CSV file format
- UI mockup for design guidance

## Development Considerations

### Technology Stack (Required)
- **Desktop Framework**: Electron.js
- **Frontend**: React.js or Vue.js with component-based architecture
- **Database**: SQLite with better-sqlite3 for Node.js integration
- **Styling**: CSS3 animations or GSAP for complex animations
- **File Handling**: Node.js fs module for file operations
- **HTTP Requests**: Axios for Random.org API integration
- **Video Recording**: FFmpeg integration via fluent-ffmpeg
- **UI Components**: Electron-compatible UI library (Ant Design, Material-UI)
- **State Management**: Redux or Vuex for complex state handling

### Key Challenges to Address
1. **Electron Performance**: Optimize for desktop performance and memory usage
2. **FFmpeg Integration**: Seamless video recording without performance impact
3. **Database Design**: Efficient schema for complex raffle relationships
4. **File System Operations**: Handle large CSV files and video exports
5. **Animation Synchronization**: Coordinate animations with recording
6. **Cross-platform Compatibility**: Ensure consistent experience across operating systems
7. **User Experience**: Intuitive admin workflow for raffle management
8. **Data Integrity**: Prevent data loss during operations and crashes

## Database Schema Design

### Required Tables
```sql
-- Raffles table
CREATE TABLE raffles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    background_image_path TEXT,
    status TEXT DEFAULT 'draft',
    animation_style TEXT DEFAULT 'cs2_case',
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    modified_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    custom_settings JSON
);

-- Contestants table
CREATE TABLE contestants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    raffle_id INTEGER REFERENCES raffles(id) ON DELETE CASCADE,
    username TEXT NOT NULL,
    profile_image_path TEXT,
    ticket_number TEXT NOT NULL,
    email TEXT,
    import_date DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Drawings table
CREATE TABLE drawings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    raffle_id INTEGER REFERENCES raffles(id),
    winner_contestant_id INTEGER REFERENCES contestants(id),
    draw_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    random_org_verification TEXT,
    recording_file_path TEXT,
    draw_settings JSON
);

-- Settings table
CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    category TEXT,
    modified_date DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## File Structure Requirements

### CSV Import Format
see the example file

### Export File Naming Convention
- Single raffle: `{RaffleName}_Winner_{YYYY-MM-DD_HH-MM-SS}.csv`
- Bulk export: `RaffleWinners_Bulk_{YYYY-MM-DD_HH-MM-SS}.zip`
- Recordings: `{RaffleName}_Drawing_{YYYY-MM-DD_HH-MM-SS}.mp4`


## Deliverables
1. **Complete Electron Desktop Application**
   - Installer packages for Windows, macOS, and Linux
   - Application icon and branding
2. **Source Code Package**
   - Complete codebase with documentation
   - Database migration scripts
   - Build and deployment instructions


## Additional Technical Requirements

### Security Considerations
- **Data Encryption**: Encrypt sensitive data in database
- **File Validation**: Secure file upload and processing
- **API Security**: Secure storage of Random.org API credentials
- **Input Sanitization**: Prevent injection attacks in CSV processing

### User Experience Enhancements
- **Drag & Drop**: CSV file drag-and-drop import
- **Progress Indicators**: Loading states for all operations
- **Keyboard Shortcuts**: Power-user shortcuts for common actions
- **Tooltips & Help**: Contextual help throughout the application
- **Error Handling**: User-friendly error messages and recovery options

### Scalability Considerations
- **Database Optimization**: Indexes for large datasets
- **Memory Management**: Efficient handling of large CSV files
- **Background Processing**: Heavy operations in separate processes
- **Caching**: Cache frequently accessed data and images