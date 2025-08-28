# Requirements Document

## Introduction

The Raffle Drawing Application is a comprehensive Electron desktop application designed to manage and conduct raffle drawings with CS2-style animations. The application provides an admin dashboard for raffle management, supports CSV data import, integrates with Random.org for true randomness, and includes advanced features like screen recording and bulk operations. The system is designed to handle large datasets efficiently while providing smooth 60fps animations and cross-platform compatibility.

## Requirements

### Requirement 1

**User Story:** As an administrator, I want to manage multiple raffles through a centralized dashboard, so that I can efficiently organize and track all my raffle events.

#### Acceptance Criteria

1. WHEN the application starts THEN the system SHALL display a dashboard with all raffles in grid/list view
2. WHEN I click "Add New Raffle" THEN the system SHALL open a form to create a raffle with required fields (name, background image, status)
3. WHEN I select an existing raffle THEN the system SHALL provide options to edit, delete, or start drawing
4. WHEN I search or filter raffles THEN the system SHALL display results matching name or status criteria
5. WHEN I sort raffles THEN the system SHALL organize them by date created, last modified, or status
6. WHEN I attempt to delete a raffle THEN the system SHALL show a confirmation dialog before removal
7. WHEN I view raffle status THEN the system SHALL display one of four states: Draft, Ready, Completed, or Archived
8. WHEN I perform quick actions THEN the system SHALL provide context menus for each raffle with common operations

### Requirement 2

**User Story:** As an administrator, I want to configure raffle settings and import contestant data, so that I can customize the drawing experience and ensure accurate participant information.

#### Acceptance Criteria

1. WHEN I upload a CSV file THEN the system SHALL validate the format according to the specification in the CSV format text file
2. WHEN the CSV format is incorrect THEN the system SHALL display specific error messages identifying missing or invalid columns
3. WHEN I upload a valid CSV THEN the system SHALL show a preview of imported data before saving to database
4. WHEN I select visual customization options THEN the system SHALL allow background image upload (JPG, PNG, GIF) and animation style selection from multiple raffle drawing styles
5. WHEN I choose an animation style THEN the system SHALL provide six distinct options with unique visual characteristics:
   - Classic CS2 Case Opening: Horizontal scrolling with gradual slowdown and dramatic reveal
   - Spinning Wheel Animation: Circular wheel rotation with pointer selection
   - Card Flip Reveal: Sequential card flipping animation revealing the winner
   - Slot Machine Style: Vertical reels spinning and stopping on winner
   - Particle Explosion Reveal: Winner emerges from particle effects and explosions
   - Zoom & Fade Animation: Smooth zoom transitions with fade effects highlighting the winner
6. WHEN I customize UI elements THEN the system SHALL allow color scheme modification and logo overlay positioning
7. WHEN I save raffle configuration THEN the system SHALL store all settings in the database with proper validation

### Requirement 3

**User Story:** As an administrator, I want the system to select winners using true randomness, so that the drawing process is fair and verifiable.

#### Acceptance Criteria

1. WHEN I initiate a drawing THEN the system SHALL use Random.org API for winner selection with proper authentication
2. WHEN the Random.org API is unavailable THEN the system SHALL use a cryptographically secure fallback randomization method
3. WHEN a winner is selected THEN the system SHALL store the Random.org verification data including timestamp and signature
4. WHEN the API call fails THEN the system SHALL handle the error gracefully with user notification and retry options
5. WHEN multiple tickets exist THEN the system SHALL ensure each ticket has equal probability of selection
6. WHEN API quota is exceeded THEN the system SHALL implement rate limiting and queue management

### Requirement 4

**User Story:** As an administrator, I want to display animated winner reveals with customizable animations, so that the drawing experience is engaging and professional.

#### Acceptance Criteria

1. WHEN a drawing starts THEN the system SHALL display the selected animation style with participant profiles
2. WHEN the animation plays THEN the system SHALL maintain 60fps performance with hardware acceleration
3. WHEN using any animation style THEN the system SHALL execute the animation with appropriate timing, easing, and visual effects specific to that style
4. WHEN the winner is revealed THEN the system SHALL stop on the winner with dramatic effect and highlighting regardless of animation style
5. WHEN profiles are displayed THEN the system SHALL show participant profile images with proper scaling and aspect ratio
6. WHEN the animation completes THEN the system SHALL clearly display winner information and provide options to save results
7. WHEN using different animation styles THEN the system SHALL maintain consistent performance and visual quality across all styles

### Requirement 5

**User Story:** As an administrator, I want to assign rarity colors to tickets during display, so that the drawing mimics CS2 case opening aesthetics with authentic drop rates and visual appeal.

#### Acceptance Criteria

1. WHEN tickets are displayed THEN the system SHALL assign rarity colors based on the following official drop percentages:
   - Consumer Grade (#B0C3D9): 79.92%
   - Industrial Grade (#5E98D9): 15.98%
   - Mil-Spec (#4B69FF): 3.2%
   - Restricted (#8847FF): 0.64%
   - Classified (#D32CE6): 0.26%
   - Covert (#EB4B4B): 0.20%
   - Exceedingly Rare (#FFD700): 0.025%
2. WHEN assigning rarities THEN the system SHALL randomly assign each ticket a rarity tier using the specified probability distribution
3. WHEN calculating rarity distribution THEN the system SHALL ensure the random assignment follows the exact drop rates for each tier
4. WHEN displaying tickets THEN the system SHALL apply color overlays with proper opacity and visual effects matching the assigned rarity
5. WHEN the animation plays THEN the system SHALL show rarity colors during the scrolling sequence with appropriate visual feedback
6. WHEN rarity colors are applied THEN the system SHALL ensure visual consistency across all animation styles

### Requirement 6

**User Story:** As an administrator, I want to record drawing sessions and export results in multiple formats, so that I can document the process and share outcomes with stakeholders.

#### Acceptance Criteria

1. WHEN I start a drawing THEN the system SHALL offer to begin screen recording using integrated FFmpeg functionality
2. WHEN recording is active THEN the system SHALL capture video in selected quality (720p, 1080p, 4K) and frame rate (30fps, 60fps) with codec options (H.264, H.265)
3. WHEN I export individual raffle results THEN the system SHALL save winner and raffle information to CSV with custom file location selection dialog
4. WHEN I perform bulk operations THEN the system SHALL allow multi-select raffles with checkbox interface and bulk action toolbar
5. WHEN exporting multiple raffles THEN the system SHALL provide options for combined CSV, separate files per raffle, or ZIP archive containing multiple files
6. WHEN recording completes THEN the system SHALL save video files with structured naming convention including raffle name and timestamp
7. WHEN managing exports THEN the system SHALL track export history and provide re-export capabilities

### Requirement 7

**User Story:** As an administrator, I want all raffle data to be stored persistently with proper relationships, so that I can access historical information and maintain data integrity.

#### Acceptance Criteria

1. WHEN I create or modify raffles THEN the system SHALL store data in local SQLite database with proper schema and constraints
2. WHEN I import contestants THEN the system SHALL save participant data linked to specific raffles with foreign key relationships
3. WHEN drawings are completed THEN the system SHALL record results with timestamps, winner details, and Random.org verification data
4. WHEN I configure settings THEN the system SHALL persist user preferences, export locations, recording settings, and UI themes
5. WHEN the application restarts THEN the system SHALL restore all previous data, settings, and window states
6. WHEN database operations occur THEN the system SHALL maintain ACID compliance with proper transaction handling
7. WHEN data corruption is detected THEN the system SHALL provide backup and recovery mechanisms

### Requirement 8

**User Story:** As an administrator, I want to view comprehensive drawing history and logs, so that I can track past events, maintain audit trails, and generate reports.

#### Acceptance Criteria

1. WHEN drawings are completed THEN the system SHALL log each event with timestamp, competition name, winner details, and verification data
2. WHEN I access history THEN the system SHALL display all past drawings with searchable, filterable, and sortable interface
3. WHEN I export history THEN the system SHALL provide multiple format options including CSV, JSON, and formatted reports
4. WHEN viewing logs THEN the system SHALL include Random.org verification data, recording file paths, and custom settings used
5. WHEN managing history THEN the system SHALL allow data retention settings, archiving options, and selective cleanup
6. WHEN generating reports THEN the system SHALL provide summary statistics, winner distribution analysis, and export capabilities

### Requirement 9

**User Story:** As an administrator, I want the application to work seamlessly across different operating systems, so that I can deploy it on Windows, macOS, and Linux environments.

#### Acceptance Criteria

1. WHEN I install the application THEN the system SHALL provide native installers (.exe, .dmg, .deb/.rpm) for all supported platforms
2. WHEN I use file operations THEN the system SHALL integrate with native file dialogs, drag-and-drop, and system notifications
3. WHEN the application updates THEN the system SHALL provide auto-updater functionality with proper code signing
4. WHEN I access files THEN the system SHALL handle cross-platform file paths, permissions, and system folder structures correctly
5. WHEN using system features THEN the system SHALL maintain consistent behavior and appearance following platform conventions
6. WHEN deploying THEN the system SHALL include proper application icons, metadata, and platform-specific optimizations

### Requirement 10

**User Story:** As an administrator, I want the application to handle large datasets efficiently with optimized performance, so that I can manage raffles with thousands of participants without degradation.

#### Acceptance Criteria

1. WHEN I import large CSV files (10,000+ entries) THEN the system SHALL process them using streaming techniques with progress indicators
2. WHEN displaying animations THEN the system SHALL maintain smooth 60fps performance regardless of participant count using virtualization
3. WHEN querying database THEN the system SHALL execute operations efficiently with proper indexing and query optimization
4. WHEN recording video THEN the system SHALL maintain animation quality without performance degradation through separate process handling
5. WHEN performing bulk operations THEN the system SHALL handle them in background worker processes with cancellation support
6. WHEN memory usage increases THEN the system SHALL implement garbage collection and memory management to prevent crashes
7. WHEN handling concurrent operations THEN the system SHALL queue tasks appropriately and provide user feedback on operation status

### Requirement 11

**User Story:** As an administrator, I want comprehensive error handling and data validation, so that the application remains stable and provides clear feedback for any issues.

#### Acceptance Criteria

1. WHEN invalid data is entered THEN the system SHALL provide specific, actionable error messages with correction guidance
2. WHEN file operations fail THEN the system SHALL handle errors gracefully with retry mechanisms and alternative options
3. WHEN network operations timeout THEN the system SHALL implement proper fallback procedures and user notification
4. WHEN database operations fail THEN the system SHALL maintain data consistency and provide recovery options
5. WHEN application crashes occur THEN the system SHALL implement auto-recovery with session restoration and error reporting
6. WHEN user permissions are insufficient THEN the system SHALL request appropriate access or suggest alternative approaches
7. WHEN validation fails THEN the system SHALL highlight specific fields or data points requiring attention

### Requirement 12

**User Story:** As an administrator, I want multiple animation styles available for different raffle themes, so that I can customize the drawing experience to match different event types and audiences.

#### Acceptance Criteria

1. WHEN I select Classic CS2 Case Opening THEN the system SHALL display horizontal scrolling animation with gradual slowdown mimicking CS2 case opening mechanics
2. WHEN I select Spinning Wheel Animation THEN the system SHALL display a circular wheel that spins and slows down to select the winner with a pointer
3. WHEN I select Card Flip Reveal THEN the system SHALL display participant cards that flip sequentially until revealing the winner card
4. WHEN I select Slot Machine Style THEN the system SHALL display vertical reels that spin independently and stop to reveal the winner
5. WHEN I select Particle Explosion Reveal THEN the system SHALL use particle effects and explosions to dramatically reveal the winner
6. WHEN I select Zoom & Fade Animation THEN the system SHALL use smooth zoom transitions and fade effects to highlight the winner
7. WHEN switching between animation styles THEN the system SHALL maintain consistent performance and visual quality
8. WHEN any animation style is selected THEN the system SHALL apply the rarity color system consistently across all styles


## Data Specifications

### CSV Format Specification
The application requires CSV files to follow a specific format as detailed in the accompanying CSV format specification text file. This includes:
- Required column headers and data types
- Optional fields and their usage
- File encoding requirements
- Maximum file size limitations
- Error handling for malformed data

### Rarity System Specification  
The CS2-style rarity system implementation follows official drop rates and color schemes as detailed in the accompanying rarity specification text file. This includes:
- Complete rarity tier definitions
- Exact color codes for each tier
- Percentage distributions for random assignment
- Visual overlay specifications
- Animation integration requirements

## Technical Constraints

1. **Platform Requirements**: Windows 10+, macOS 10.14+, Ubuntu 18.04+ or equivalent Linux distributions
2. **Hardware Requirements**: Minimum 4GB RAM, 2GB available storage, graphics card supporting hardware acceleration
3. **Network Requirements**: Internet connection for Random.org API and application updates (offline fallback available)
4. **Database Requirements**: SQLite 3.31+ with WAL mode support
5. **Video Recording**: FFmpeg 4.0+ integration with hardware acceleration support where available
6. **Performance Targets**: Application startup < 3 seconds, database queries < 100ms, animation rendering at stable 60fps