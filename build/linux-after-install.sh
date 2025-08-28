#!/bin/bash

# Post-installation script for Linux
# This script runs after the package is installed

# Create application data directory
mkdir -p "$HOME/.config/RaffleDrawingApp"
mkdir -p "$HOME/.config/RaffleDrawingApp/raffles"
mkdir -p "$HOME/.config/RaffleDrawingApp/recordings"

# Set proper permissions
chmod 755 "$HOME/.config/RaffleDrawingApp"
chmod 755 "$HOME/.config/RaffleDrawingApp/raffles"
chmod 755 "$HOME/.config/RaffleDrawingApp/recordings"

# Update desktop database
if command -v update-desktop-database >/dev/null 2>&1; then
    update-desktop-database
fi

# Update mime database
if command -v update-mime-database >/dev/null 2>&1; then
    update-mime-database /usr/share/mime
fi

echo "Raffle Drawing Application installed successfully!"
echo "Application data will be stored in: $HOME/.config/RaffleDrawingApp"