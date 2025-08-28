# Deployment Guide

This guide covers the cross-platform build and deployment process for the Raffle Drawing Application.

## Prerequisites

### Development Environment
- Node.js 18 or higher
- npm or yarn package manager
- Git for version control

### Platform-Specific Requirements

#### Windows
- Windows 10 or higher
- Visual Studio Build Tools (for native dependencies)
- Code signing certificate (optional, for production)

#### macOS
- macOS 10.14 or higher
- Xcode Command Line Tools
- Apple Developer account and certificates (for code signing)

#### Linux
- Ubuntu 18.04+ or equivalent
- Build essentials (`build-essential` package)
- Additional dependencies: `libnss3-dev`, `libatk-bridge2.0-dev`, `libdrm2`, `libxcomposite1`, `libxdamage1`, `libxrandr2`, `libgbm1`, `libxss1`, `libasound2`

## Build Configuration

The application uses `electron-builder` for cross-platform builds. Configuration is defined in `package.json` under the `build` section.

### Key Configuration Features

- **Multi-platform support**: Windows (NSIS, Portable), macOS (DMG, ZIP), Linux (DEB, RPM, AppImage)
- **Code signing**: Configured for all platforms (certificates required)
- **Auto-updater**: GitHub releases integration
- **Native installers**: Platform-specific installation experiences
- **File associations**: Proper system integration

## Build Commands

### Development Build
```bash
npm run build
```

### Platform-Specific Builds
```bash
# Windows
npm run dist:win

# macOS
npm run dist:mac

# Linux
npm run dist:linux

# All platforms (requires appropriate OS or CI/CD)
npm run dist:all
```

### Publishing Builds
```bash
# Publish to GitHub releases
npm run publish

# Platform-specific publishing
npm run publish:win
npm run publish:mac
npm run publish:linux
```

## Code Signing

### Windows Code Signing
1. Obtain a code signing certificate from a trusted CA
2. Set environment variables:
   ```bash
   set CSC_LINK=path/to/certificate.p12
   set CSC_KEY_PASSWORD=certificate_password
   ```

### macOS Code Signing
1. Join Apple Developer Program
2. Create certificates in Apple Developer portal
3. Set environment variables:
   ```bash
   export CSC_LINK=path/to/certificate.p12
   export CSC_KEY_PASSWORD=certificate_password
   export APPLE_ID=your_apple_id
   export APPLE_ID_PASSWORD=app_specific_password
   ```

### Linux Code Signing
Linux builds don't require code signing but can be signed with GPG keys for package repositories.

## Auto-Updater Setup

The application includes automatic update functionality using `electron-updater`.

### Configuration
1. Update `package.json` build.publish section with your repository details
2. Set up GitHub releases for distribution
3. Configure update server (GitHub releases by default)

### Update Process
1. Application checks for updates on startup (production only)
2. User is notified of available updates
3. Updates are downloaded in background
4. User can choose to install immediately or later
5. Application restarts to apply updates

## CI/CD Pipeline

The project includes GitHub Actions workflow for automated builds:

### Workflow Features
- **Multi-platform builds**: Windows, macOS, and Linux
- **Automated testing**: Runs tests before building
- **Artifact storage**: Stores build artifacts
- **Release automation**: Creates GitHub releases for tagged versions

### Triggering Builds
- **Tags**: Push tags starting with `v` (e.g., `v1.0.0`)
- **Pull Requests**: Builds are tested but not released
- **Manual**: Can be triggered manually from GitHub Actions

## Platform-Specific Considerations

### Windows
- **NSIS Installer**: Custom installer with user directory selection
- **Portable Version**: No installation required
- **File Associations**: Registers CSV file associations
- **System Integration**: Start menu shortcuts, desktop shortcuts

### macOS
- **DMG Distribution**: Drag-and-drop installer
- **Notarization**: Required for distribution outside App Store
- **Gatekeeper**: Code signing prevents security warnings
- **Universal Builds**: Supports both Intel and Apple Silicon

### Linux
- **Multiple Formats**: DEB (Debian/Ubuntu), RPM (Red Hat/SUSE), AppImage (universal)
- **Desktop Integration**: .desktop files, MIME types
- **Package Dependencies**: Automatically handled by package managers
- **Post-install Scripts**: Sets up application directories and permissions

## File Structure

### Build Assets
```
build/
├── icon.ico              # Windows icon
├── icon.icns             # macOS icon
├── icon.png              # Linux icon
├── entitlements.mac.plist # macOS entitlements
├── installer.nsh         # NSIS installer script
└── linux-after-install.sh # Linux post-install script
```

### Output Directory
```
release/
├── win-unpacked/         # Windows unpacked files
├── mac/                  # macOS app bundle
├── linux-unpacked/       # Linux unpacked files
├── *.exe                 # Windows installers
├── *.dmg                 # macOS disk images
├── *.deb                 # Debian packages
├── *.rpm                 # RPM packages
└── *.AppImage           # Linux AppImages
```

## Testing Deployment

### Local Testing
```bash
# Run deployment tests
npm test -- --testPathPattern=deployment

# Test build process
npm run pack

# Test specific platform build
npm run dist:win  # or dist:mac, dist:linux
```

### Manual Testing
1. Install built application on target platform
2. Verify all features work correctly
3. Test update mechanism (if applicable)
4. Check file associations and system integration
5. Verify uninstallation process

## Troubleshooting

### Common Issues

#### Build Failures
- **Missing dependencies**: Run `npm ci` to ensure clean install
- **Platform tools**: Verify platform-specific build tools are installed
- **Permissions**: Ensure write permissions to output directory

#### Code Signing Issues
- **Certificate errors**: Verify certificate validity and password
- **Keychain access**: On macOS, ensure certificates are in keychain
- **Environment variables**: Check CSC_* environment variables

#### Update Issues
- **Network connectivity**: Verify internet connection for update checks
- **GitHub releases**: Ensure releases are properly published
- **Version format**: Use semantic versioning (e.g., 1.0.0)

### Debug Mode
Set environment variable for verbose logging:
```bash
export DEBUG=electron-builder
npm run dist
```

## Security Considerations

1. **Code Signing**: Always sign production builds
2. **Update Security**: Use HTTPS for update servers
3. **Certificate Management**: Store certificates securely
4. **Dependency Scanning**: Regularly audit dependencies
5. **Build Environment**: Use clean, secure build environments

## Performance Optimization

1. **Bundle Size**: Exclude unnecessary files from build
2. **Native Dependencies**: Use prebuilt binaries when possible
3. **Compression**: Enable compression in electron-builder
4. **Caching**: Use build caches in CI/CD pipelines

## Monitoring and Analytics

Consider integrating:
- **Crash Reporting**: Sentry, Bugsnag
- **Usage Analytics**: Mixpanel, Google Analytics
- **Update Analytics**: Track update success rates
- **Performance Monitoring**: Monitor app performance metrics

## Support and Maintenance

1. **Version Management**: Use semantic versioning
2. **Release Notes**: Maintain detailed changelog
3. **Backward Compatibility**: Test with previous versions
4. **Support Channels**: Provide user support documentation
5. **Issue Tracking**: Use GitHub Issues for bug reports