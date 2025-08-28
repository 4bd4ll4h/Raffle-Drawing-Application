import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { message } from 'antd';
import RaffleConfiguration from '../RaffleConfiguration';
import { AnimationStyle, RaffleConfig } from '../../../types';

// Mock antd message
jest.mock('antd', () => ({
  ...jest.requireActual('antd'),
  message: {
    error: jest.fn(),
    success: jest.fn(),
    info: jest.fn(),
    warning: jest.fn()
  }
}));

// Mock file reader
const mockFileReader = {
  readAsDataURL: jest.fn(),
  result: 'data:image/png;base64,mock-image-data',
  onload: null as any
};

Object.defineProperty(window, 'FileReader', {
  writable: true,
  value: jest.fn(() => mockFileReader)
});

describe('RaffleConfiguration', () => {
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

  describe('Component Rendering', () => {
    it('renders create mode correctly', () => {
      render(<RaffleConfiguration {...defaultProps} />);
      
      expect(screen.getByText('Create New Raffle')).toBeInTheDocument();
      expect(screen.getByText('Configure your raffle settings, upload participant data, and customize the drawing experience.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create raffle/i })).toBeInTheDocument();
    });

    it('renders edit mode correctly', () => {
      const mockRaffle = {
        id: '1',
        name: 'Test Raffle',
        animationStyle: AnimationStyle.CS2_CASE,
        customSettings: {
          logoPosition: 'top-right' as const,
          animationDuration: 5000,
          soundEnabled: true,
          colorScheme: {
            primary: '#1890ff',
            secondary: '#722ed1',
            accent: '#52c41a',
            background: '#f0f2f5'
          }
        }
      };

      render(<RaffleConfiguration {...defaultProps} raffle={mockRaffle} />);
      
      expect(screen.getByText('Edit Raffle Configuration')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /update raffle/i })).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test Raffle')).toBeInTheDocument();
    });

    it('renders all animation style options', () => {
      render(<RaffleConfiguration {...defaultProps} />);
      
      expect(screen.getByText('CS2 Case Opening')).toBeInTheDocument();
      expect(screen.getByText('Spinning Wheel')).toBeInTheDocument();
      expect(screen.getByText('Card Flip Reveal')).toBeInTheDocument();
      expect(screen.getByText('Slot Machine')).toBeInTheDocument();
      expect(screen.getByText('Particle Explosion')).toBeInTheDocument();
      expect(screen.getByText('Zoom & Fade')).toBeInTheDocument();
    });

    it('renders all form sections', () => {
      render(<RaffleConfiguration {...defaultProps} />);
      
      expect(screen.getByText('Basic Information')).toBeInTheDocument();
      expect(screen.getByText('Background Image')).toBeInTheDocument();
      expect(screen.getByText('Animation Style')).toBeInTheDocument();
      expect(screen.getByText('Color Scheme')).toBeInTheDocument();
      expect(screen.getByText('Logo Settings')).toBeInTheDocument();
      expect(screen.getByText('Participant Data')).toBeInTheDocument();
      expect(screen.getByText('Advanced Settings')).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('validates required raffle name', async () => {
      const user = userEvent.setup();
      render(<RaffleConfiguration {...defaultProps} />);
      
      const submitButton = screen.getByRole('button', { name: /create raffle/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Please enter a raffle name')).toBeInTheDocument();
      });
    });

    it('validates raffle name length', async () => {
      const user = userEvent.setup();
      render(<RaffleConfiguration {...defaultProps} />);
      
      const nameInput = screen.getByPlaceholderText(/enter raffle name/i);
      await user.type(nameInput, 'a'.repeat(201)); // Exceeds max length
      
      const submitButton = screen.getByRole('button', { name: /create raffle/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Name must be between 1 and 200 characters')).toBeInTheDocument();
      });
    });

    it('requires CSV file for new raffles', async () => {
      const user = userEvent.setup();
      render(<RaffleConfiguration {...defaultProps} />);
      
      const nameInput = screen.getByPlaceholderText(/enter raffle name/i);
      await user.type(nameInput, 'Test Raffle');
      
      const submitButton = screen.getByRole('button', { name: /create raffle/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Please upload a CSV file with participant data')).toBeInTheDocument();
      });
    });

    it('displays validation errors', () => {
      const validationErrors = [
        {
          type: 'missing_column' as const,
          row: 1,
          column: 'Username',
          message: 'Missing required column: Username',
          severity: 'error' as const
        }
      ];

      render(<RaffleConfiguration {...defaultProps} validationErrors={validationErrors} />);
      
      expect(screen.getByText('Validation Errors')).toBeInTheDocument();
      expect(screen.getByText('Missing required column: Username (Row: 1, Column: Username)')).toBeInTheDocument();
    });
  });

  describe('Background Image Upload', () => {
    it('handles valid image upload', async () => {
      const user = userEvent.setup();
      render(<RaffleConfiguration {...defaultProps} />);
      
      const file = new File(['image content'], 'test.jpg', { type: 'image/jpeg' });
      const uploadButton = screen.getByText('Select Image');
      
      // Mock the upload input
      const input = uploadButton.closest('span')?.querySelector('input[type="file"]');
      if (input) {
        await act(async () => {
          fireEvent.change(input, { target: { files: [file] } });
        });
      }
      
      await waitFor(() => {
        expect(screen.getByText('Image Uploaded')).toBeInTheDocument();
        expect(screen.getByText('test.jpg')).toBeInTheDocument();
      });
    });

    it('rejects non-image files', async () => {
      const user = userEvent.setup();
      render(<RaffleConfiguration {...defaultProps} />);
      
      const file = new File(['text content'], 'test.txt', { type: 'text/plain' });
      const uploadButton = screen.getByText('Select Image');
      
      const input = uploadButton.closest('span')?.querySelector('input[type="file"]');
      if (input) {
        await act(async () => {
          fireEvent.change(input, { target: { files: [file] } });
        });
      }
      
      expect(message.error).toHaveBeenCalledWith('Please upload an image file (JPG, PNG, GIF)');
    });

    it('rejects files larger than 10MB', async () => {
      const user = userEvent.setup();
      render(<RaffleConfiguration {...defaultProps} />);
      
      // Create a mock file larger than 10MB
      const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });
      Object.defineProperty(largeFile, 'size', { value: 11 * 1024 * 1024 });
      
      const uploadButton = screen.getByText('Select Image');
      const input = uploadButton.closest('span')?.querySelector('input[type="file"]');
      
      if (input) {
        await act(async () => {
          fireEvent.change(input, { target: { files: [largeFile] } });
        });
      }
      
      expect(message.error).toHaveBeenCalledWith('Image must be smaller than 10MB');
    });

    it('allows removing uploaded image', async () => {
      const user = userEvent.setup();
      render(<RaffleConfiguration {...defaultProps} />);
      
      // First upload an image
      const file = new File(['image content'], 'test.jpg', { type: 'image/jpeg' });
      const uploadButton = screen.getByText('Select Image');
      const input = uploadButton.closest('span')?.querySelector('input[type="file"]');
      
      if (input) {
        await act(async () => {
          fireEvent.change(input, { target: { files: [file] } });
        });
      }
      
      await waitFor(() => {
        expect(screen.getByText('test.jpg')).toBeInTheDocument();
      });
      
      // Then remove it
      const removeButton = screen.getByRole('img', { name: /close/i });
      await user.click(removeButton);
      
      await waitFor(() => {
        expect(screen.queryByText('test.jpg')).not.toBeInTheDocument();
        expect(screen.getByText('Select Image')).toBeInTheDocument();
      });
    });
  });

  describe('CSV File Upload', () => {
    it('handles valid CSV upload', async () => {
      const user = userEvent.setup();
      render(<RaffleConfiguration {...defaultProps} />);
      
      const file = new File(['Username,Ticket Number,User Profile\ntest,123,url'], 'test.csv', { type: 'text/csv' });
      const uploadButton = screen.getByText('Select CSV File');
      const input = uploadButton.closest('span')?.querySelector('input[type="file"]');
      
      if (input) {
        await act(async () => {
          fireEvent.change(input, { target: { files: [file] } });
        });
      }
      
      await waitFor(() => {
        expect(screen.getByText('Validating...')).toBeInTheDocument();
      });
      
      await waitFor(() => {
        expect(screen.getByText('CSV Uploaded')).toBeInTheDocument();
        expect(screen.getByText('test.csv')).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('rejects non-CSV files', async () => {
      const user = userEvent.setup();
      render(<RaffleConfiguration {...defaultProps} />);
      
      const file = new File(['text content'], 'test.txt', { type: 'text/plain' });
      const uploadButton = screen.getByText('Select CSV File');
      const input = uploadButton.closest('span')?.querySelector('input[type="file"]');
      
      if (input) {
        await act(async () => {
          fireEvent.change(input, { target: { files: [file] } });
        });
      }
      
      expect(message.error).toHaveBeenCalledWith('Please upload a CSV file');
    });

    it('rejects files larger than 50MB', async () => {
      const user = userEvent.setup();
      render(<RaffleConfiguration {...defaultProps} />);
      
      const largeFile = new File(['x'.repeat(51 * 1024 * 1024)], 'large.csv', { type: 'text/csv' });
      Object.defineProperty(largeFile, 'size', { value: 51 * 1024 * 1024 });
      
      const uploadButton = screen.getByText('Select CSV File');
      const input = uploadButton.closest('span')?.querySelector('input[type="file"]');
      
      if (input) {
        await act(async () => {
          fireEvent.change(input, { target: { files: [largeFile] } });
        });
      }
      
      expect(message.error).toHaveBeenCalledWith('CSV file must be smaller than 50MB');
    });

    it('shows validation results', async () => {
      const user = userEvent.setup();
      render(<RaffleConfiguration {...defaultProps} />);
      
      const file = new File(['Username,Ticket Number,User Profile\ntest,123,url'], 'test.csv', { type: 'text/csv' });
      const uploadButton = screen.getByText('Select CSV File');
      const input = uploadButton.closest('span')?.querySelector('input[type="file"]');
      
      if (input) {
        await act(async () => {
          fireEvent.change(input, { target: { files: [file] } });
        });
      }
      
      // Wait for validation to complete
      await waitFor(() => {
        expect(screen.getByText('CSV Validation Successful')).toBeInTheDocument();
      }, { timeout: 3000 });
      
      expect(screen.getByText(/Found 150 valid participants/)).toBeInTheDocument();
    });

    it('allows removing uploaded CSV', async () => {
      const user = userEvent.setup();
      render(<RaffleConfiguration {...defaultProps} />);
      
      // Upload CSV first
      const file = new File(['Username,Ticket Number,User Profile\ntest,123,url'], 'test.csv', { type: 'text/csv' });
      const uploadButton = screen.getByText('Select CSV File');
      const input = uploadButton.closest('span')?.querySelector('input[type="file"]');
      
      if (input) {
        await act(async () => {
          fireEvent.change(input, { target: { files: [file] } });
        });
      }
      
      // Wait for file to be processed
      await waitFor(() => {
        expect(screen.getByText('CSV Uploaded')).toBeInTheDocument();
      }, { timeout: 3000 });
      
      // Find and click remove button
      const removeButtons = screen.getAllByRole('img', { name: /close/i });
      const csvRemoveButton = removeButtons.find(button => 
        button.closest('.ant-tag')?.textContent?.includes('test.csv')
      );
      
      if (csvRemoveButton) {
        await user.click(csvRemoveButton);
      }
      
      await waitFor(() => {
        expect(screen.queryByText('test.csv')).not.toBeInTheDocument();
        expect(screen.getByText('Select CSV File')).toBeInTheDocument();
      });
    });
  });

  describe('Animation Style Selection', () => {
    it('allows selecting animation styles', async () => {
      const user = userEvent.setup();
      render(<RaffleConfiguration {...defaultProps} />);
      
      const spinningWheelOption = screen.getByText('Spinning Wheel');
      await user.click(spinningWheelOption);
      
      const radioButton = spinningWheelOption.closest('.ant-card')?.querySelector('input[type="radio"]');
      expect(radioButton).toBeChecked();
    });

    it('shows animation style descriptions', () => {
      render(<RaffleConfiguration {...defaultProps} />);
      
      expect(screen.getByText('Horizontal scrolling with gradual slowdown and dramatic reveal')).toBeInTheDocument();
      expect(screen.getByText('Circular wheel rotation with pointer selection')).toBeInTheDocument();
      expect(screen.getByText('Sequential card flipping animation revealing the winner')).toBeInTheDocument();
    });

    it('shows animation previews', () => {
      render(<RaffleConfiguration {...defaultProps} />);
      
      expect(screen.getByText('🎁 → → → 🏆')).toBeInTheDocument();
      expect(screen.getByText('🎯 ↻ 🏆')).toBeInTheDocument();
      expect(screen.getByText('🃏 ↻ 🏆')).toBeInTheDocument();
    });
  });

  describe('Color Scheme Customization', () => {
    it('renders color pickers', () => {
      render(<RaffleConfiguration {...defaultProps} />);
      
      expect(screen.getByText('Primary Color')).toBeInTheDocument();
      expect(screen.getByText('Secondary Color')).toBeInTheDocument();
      expect(screen.getByText('Accent Color')).toBeInTheDocument();
      expect(screen.getByText('Background Color')).toBeInTheDocument();
    });
  });

  describe('Logo Position Selection', () => {
    it('renders logo position options', () => {
      render(<RaffleConfiguration {...defaultProps} />);
      
      expect(screen.getByText('Logo Position')).toBeInTheDocument();
      // The placeholder text is inside the Select component
      const selectElement = screen.getByRole('combobox');
      expect(selectElement).toBeInTheDocument();
    });
  });

  describe('Advanced Settings', () => {
    it('renders animation duration input', () => {
      render(<RaffleConfiguration {...defaultProps} />);
      
      expect(screen.getByText('Animation Duration (ms)')).toBeInTheDocument();
      const durationInput = screen.getByPlaceholderText('5000');
      expect(durationInput).toBeInTheDocument();
    });

    it('renders sound settings', () => {
      render(<RaffleConfiguration {...defaultProps} />);
      
      expect(screen.getByText('Enable Sound Effects')).toBeInTheDocument();
      expect(screen.getByText('Enabled')).toBeInTheDocument();
      expect(screen.getByText('Disabled')).toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('calls onSave with correct configuration', async () => {
      const user = userEvent.setup();
      render(<RaffleConfiguration {...defaultProps} />);
      
      // Fill in required fields
      const nameInput = screen.getByPlaceholderText(/enter raffle name/i);
      await user.type(nameInput, 'Test Raffle');
      
      // Upload CSV
      const csvFile = new File(['Username,Ticket Number,User Profile\ntest,123,url'], 'test.csv', { type: 'text/csv' });
      const csvUploadButton = screen.getByText('Select CSV File');
      const csvInput = csvUploadButton.closest('span')?.querySelector('input[type="file"]');
      
      if (csvInput) {
        await act(async () => {
          fireEvent.change(csvInput, { target: { files: [csvFile] } });
        });
      }
      
      // Wait for CSV to be processed
      await waitFor(() => {
        expect(screen.getByText('CSV Uploaded')).toBeInTheDocument();
      }, { timeout: 3000 });
      
      // Submit form
      const submitButton = screen.getByRole('button', { name: /create raffle/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Test Raffle',
            animationStyle: AnimationStyle.CS2_CASE,
            csvFile: expect.any(File),
            colorScheme: expect.objectContaining({
              primary: '#1890ff',
              secondary: '#722ed1',
              accent: '#52c41a',
              background: '#f0f2f5'
            })
          })
        );
      });
    });

    it('calls onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(<RaffleConfiguration {...defaultProps} />);
      
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);
      
      expect(mockOnCancel).toHaveBeenCalled();
    });
  });

  describe('Loading States', () => {
    it('shows loading spinner when loading prop is true', () => {
      render(<RaffleConfiguration {...defaultProps} loading={true} />);
      
      const spinner = document.querySelector('.ant-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('disables form when loading', () => {
      render(<RaffleConfiguration {...defaultProps} loading={true} />);
      
      const submitButton = screen.getByRole('button', { name: /create raffle/i });
      expect(submitButton).toBeDisabled();
      
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      expect(cancelButton).toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('has proper form labels', () => {
      render(<RaffleConfiguration {...defaultProps} />);
      
      expect(screen.getByLabelText(/raffle name/i)).toBeInTheDocument();
      expect(screen.getByText('Upload Background Image')).toBeInTheDocument();
      expect(screen.getByText('Select Animation Style')).toBeInTheDocument();
    });

    it('has proper button roles', () => {
      render(<RaffleConfiguration {...defaultProps} />);
      
      expect(screen.getByRole('button', { name: /create raffle/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /select image/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /select csv file/i })).toBeInTheDocument();
    });

    it('has proper form structure', () => {
      render(<RaffleConfiguration {...defaultProps} />);
      
      const form = document.querySelector('form');
      expect(form).toBeInTheDocument();
      
      const requiredInputs = screen.getAllByRole('textbox', { name: /raffle name/i });
      expect(requiredInputs.length).toBeGreaterThan(0);
    });
  });
});