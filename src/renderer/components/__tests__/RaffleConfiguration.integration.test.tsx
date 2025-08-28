import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RaffleConfiguration from '../RaffleConfiguration';
import { AnimationStyle } from '../../../types';

// Mock file operations
const mockFileReader = {
  readAsDataURL: jest.fn(),
  result: 'data:image/png;base64,mock-image-data',
  onload: null as any
};

Object.defineProperty(window, 'FileReader', {
  writable: true,
  value: jest.fn(() => mockFileReader)
});

describe('RaffleConfiguration Integration Tests', () => {
  const mockOnSave = jest.fn();
  const mockOnCancel = jest.fn();

  const defaultProps = {
    onSave: mockOnSave,
    onCancel: mockOnCancel,
    loading: false,
    validationErrors: []
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFileReader.readAsDataURL.mockClear();
  });

  describe('Complete Workflow Tests', () => {
    it('completes full raffle configuration workflow', async () => {
      const user = userEvent.setup();
      render(<RaffleConfiguration {...defaultProps} />);

      // Step 1: Enter raffle name
      const nameInput = screen.getByPlaceholderText(/enter raffle name/i);
      await user.type(nameInput, 'CS2 Skin Giveaway');

      // Step 2: Upload background image
      const backgroundFile = new File(['image content'], 'background.jpg', { type: 'image/jpeg' });
      const backgroundUpload = screen.getByText('Select Image');
      const backgroundInput = backgroundUpload.closest('span')?.querySelector('input[type="file"]');
      
      if (backgroundInput) {
        await act(async () => {
          fireEvent.change(backgroundInput, { target: { files: [backgroundFile] } });
        });
      }

      await waitFor(() => {
        expect(screen.getByText('Image Uploaded')).toBeInTheDocument();
      });

      // Step 3: Select animation style
      const cardFlipOption = screen.getByText('Card Flip Reveal');
      await user.click(cardFlipOption);

      // Step 4: Customize colors (simulate color picker interaction)
      // Note: Color picker interaction is complex, so we'll verify it's rendered
      expect(screen.getByText('Primary Color')).toBeInTheDocument();

      // Step 5: Set logo position
      const logoSelect = screen.getByText('Select logo position');
      await user.click(logoSelect);
      const topLeftOption = screen.getByText('Top Left');
      await user.click(topLeftOption);

      // Step 6: Upload CSV file
      const csvFile = new File(['Username,Ticket Number,User Profile\ntest,123,url'], 'participants.csv', { type: 'text/csv' });
      const csvUpload = screen.getByText('Select CSV File');
      const csvInput = csvUpload.closest('span')?.querySelector('input[type="file"]');
      
      if (csvInput) {
        await act(async () => {
          fireEvent.change(csvInput, { target: { files: [csvFile] } });
        });
      }

      await waitFor(() => {
        expect(screen.getByText('CSV Validation Successful')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Step 7: Configure advanced settings
      const durationInput = screen.getByPlaceholderText('5000');
      await user.clear(durationInput);
      await user.type(durationInput, '7000');

      const soundDisabled = screen.getByLabelText('Disabled');
      await user.click(soundDisabled);

      // Step 8: Submit form
      const submitButton = screen.getByRole('button', { name: /create raffle/i });
      await user.click(submitButton);

      // Verify onSave was called with correct data
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'CS2 Skin Giveaway',
            animationStyle: AnimationStyle.CARD_FLIP,
            backgroundImage: expect.any(File),
            csvFile: expect.any(File),
            animationDuration: 7000,
            soundEnabled: false
          })
        );
      });
    });

    it('handles edit workflow with existing data', async () => {
      const user = userEvent.setup();
      const existingRaffle = {
        id: '1',
        name: 'Existing Raffle',
        animationStyle: AnimationStyle.SPINNING_WHEEL,
        backgroundImagePath: '/path/to/image.jpg',
        customSettings: {
          logoPosition: 'center' as const,
          animationDuration: 8000,
          soundEnabled: false,
          colorScheme: {
            primary: '#ff0000',
            secondary: '#00ff00',
            accent: '#0000ff',
            background: '#ffffff'
          }
        }
      };

      render(<RaffleConfiguration {...defaultProps} raffle={existingRaffle} />);

      // Verify existing data is loaded
      expect(screen.getByDisplayValue('Existing Raffle')).toBeInTheDocument();
      expect(screen.getByDisplayValue('8000')).toBeInTheDocument();
      
      // Verify animation style is selected
      const spinningWheelCard = screen.getByText('Spinning Wheel').closest('.ant-card');
      const radioButton = spinningWheelCard?.querySelector('input[type="radio"]');
      expect(radioButton).toBeChecked();

      // Make changes
      const nameInput = screen.getByDisplayValue('Existing Raffle');
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Raffle Name');

      // Submit changes
      const submitButton = screen.getByRole('button', { name: /update raffle/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Updated Raffle Name',
            animationStyle: AnimationStyle.SPINNING_WHEEL
          })
        );
      });
    });
  });

  describe('Error Handling Integration', () => {
    it('handles multiple validation errors gracefully', async () => {
      const user = userEvent.setup();
      const validationErrors = [
        {
          type: 'missing_column' as const,
          row: 1,
          column: 'Username',
          message: 'Missing Username column',
          severity: 'error' as const
        },
        {
          type: 'duplicate_ticket' as const,
          row: 5,
          column: 'Ticket Number',
          message: 'Duplicate ticket number found',
          severity: 'error' as const
        }
      ];

      render(<RaffleConfiguration {...defaultProps} validationErrors={validationErrors} />);

      expect(screen.getByText('Validation Errors')).toBeInTheDocument();
      expect(screen.getByText(/Missing Username column/)).toBeInTheDocument();
      expect(screen.getByText(/Duplicate ticket number found/)).toBeInTheDocument();

      // Form should still be submittable (validation errors are informational)
      const nameInput = screen.getByPlaceholderText(/enter raffle name/i);
      await user.type(nameInput, 'Test Raffle');

      const submitButton = screen.getByRole('button', { name: /create raffle/i });
      expect(submitButton).not.toBeDisabled();
    });

    it('handles file upload errors and recovery', async () => {
      const user = userEvent.setup();
      render(<RaffleConfiguration {...defaultProps} />);

      // Try to upload invalid file
      const invalidFile = new File(['content'], 'test.txt', { type: 'text/plain' });
      const uploadButton = screen.getByText('Select Image');
      const input = uploadButton.closest('span')?.querySelector('input[type="file"]');
      
      if (input) {
        await act(async () => {
          fireEvent.change(input, { target: { files: [invalidFile] } });
        });
      }

      // Should still show "Select Image" button
      expect(screen.getByText('Select Image')).toBeInTheDocument();

      // Now upload valid file
      const validFile = new File(['image content'], 'test.jpg', { type: 'image/jpeg' });
      
      if (input) {
        await act(async () => {
          fireEvent.change(input, { target: { files: [validFile] } });
        });
      }

      await waitFor(() => {
        expect(screen.getByText('Image Uploaded')).toBeInTheDocument();
      });
    });
  });

  describe('Performance and Large Data Handling', () => {
    it('handles large CSV files efficiently', async () => {
      const user = userEvent.setup();
      render(<RaffleConfiguration {...defaultProps} />);

      // Create a large CSV file (simulated)
      const largeCSVContent = 'Username,Ticket Number,User Profile\n' + 
        Array.from({ length: 10000 }, (_, i) => `user${i},ticket${i},https://example.com/user${i}.jpg`).join('\n');
      
      const largeCSVFile = new File([largeCSVContent], 'large.csv', { type: 'text/csv' });
      
      const uploadButton = screen.getByText('Select CSV File');
      const input = uploadButton.closest('span')?.querySelector('input[type="file"]');
      
      if (input) {
        await act(async () => {
          fireEvent.change(input, { target: { files: [largeCSVFile] } });
        });
      }

      // Should show validating state
      expect(screen.getByText('Validating...')).toBeInTheDocument();

      // Should eventually complete validation
      await waitFor(() => {
        expect(screen.getByText('CSV Validation Successful')).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('maintains responsive UI during file operations', async () => {
      const user = userEvent.setup();
      render(<RaffleConfiguration {...defaultProps} />);

      const csvFile = new File(['Username,Ticket Number,User Profile\ntest,123,url'], 'test.csv', { type: 'text/csv' });
      const uploadButton = screen.getByText('Select CSV File');
      const input = uploadButton.closest('span')?.querySelector('input[type="file"]');
      
      if (input) {
        await act(async () => {
          fireEvent.change(input, { target: { files: [csvFile] } });
        });
      }

      // UI should remain responsive - other form elements should still be interactive
      const nameInput = screen.getByPlaceholderText(/enter raffle name/i);
      await user.type(nameInput, 'Test');
      
      expect(screen.getByDisplayValue('Test')).toBeInTheDocument();
    });
  });

  describe('Cross-browser Compatibility', () => {
    it('handles FileReader API gracefully', async () => {
      const user = userEvent.setup();
      
      // Mock FileReader to simulate different browser behaviors
      const originalFileReader = window.FileReader;
      
      // Test with FileReader that takes time to load
      const slowFileReader = {
        readAsDataURL: jest.fn((file) => {
          setTimeout(() => {
            if (slowFileReader.onload) {
              slowFileReader.onload({ target: { result: 'data:image/png;base64,slow-load' } } as any);
            }
          }, 100);
        }),
        result: null,
        onload: null as any
      };
      
      (window as any).FileReader = jest.fn(() => slowFileReader);
      
      render(<RaffleConfiguration {...defaultProps} />);

      const file = new File(['image content'], 'test.jpg', { type: 'image/jpeg' });
      const uploadButton = screen.getByText('Select Image');
      const input = uploadButton.closest('span')?.querySelector('input[type="file"]');
      
      if (input) {
        await act(async () => {
          fireEvent.change(input, { target: { files: [file] } });
        });
      }

      await waitFor(() => {
        expect(screen.getByText('Image Uploaded')).toBeInTheDocument();
      }, { timeout: 1000 });

      // Restore original FileReader
      window.FileReader = originalFileReader;
    });
  });

  describe('Accessibility Integration', () => {
    it('maintains focus management during interactions', async () => {
      const user = userEvent.setup();
      render(<RaffleConfiguration {...defaultProps} />);

      const nameInput = screen.getByPlaceholderText(/enter raffle name/i);
      await user.click(nameInput);
      
      expect(nameInput).toHaveFocus();

      // Tab to next focusable element
      await user.tab();
      
      // Should move focus to next form element
      const nextElement = document.activeElement;
      expect(nextElement).not.toBe(nameInput);
      expect(nextElement).toBeInstanceOf(HTMLElement);
    });

    it('provides proper ARIA labels and descriptions', () => {
      render(<RaffleConfiguration {...defaultProps} />);

      // Check for proper labeling
      const nameInput = screen.getByLabelText(/raffle name/i);
      expect(nameInput).toBeInTheDocument();

      // Check for form structure
      const form = document.querySelector('form');
      expect(form).toBeInTheDocument();

      // Check for proper button labeling
      const submitButton = screen.getByRole('button', { name: /create raffle/i });
      expect(submitButton).toBeInTheDocument();
    });
  });
});