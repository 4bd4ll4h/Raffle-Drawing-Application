import React from 'react';
import { render, screen } from '@testing-library/react';
import RaffleConfiguration from '../RaffleConfiguration';
import { AnimationStyle } from '../../../types';

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

describe('RaffleConfiguration - Simple Tests', () => {
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
  });

  describe('Basic Rendering', () => {
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

    it('renders all animation style options', () => {
      render(<RaffleConfiguration {...defaultProps} />);
      
      expect(screen.getByText('CS2 Case Opening')).toBeInTheDocument();
      expect(screen.getByText('Spinning Wheel')).toBeInTheDocument();
      expect(screen.getByText('Card Flip Reveal')).toBeInTheDocument();
      expect(screen.getByText('Slot Machine')).toBeInTheDocument();
      expect(screen.getByText('Particle Explosion')).toBeInTheDocument();
      expect(screen.getByText('Zoom & Fade')).toBeInTheDocument();
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

    it('renders color pickers', () => {
      render(<RaffleConfiguration {...defaultProps} />);
      
      expect(screen.getByText('Primary Color')).toBeInTheDocument();
      expect(screen.getByText('Secondary Color')).toBeInTheDocument();
      expect(screen.getByText('Accent Color')).toBeInTheDocument();
      expect(screen.getByText('Background Color')).toBeInTheDocument();
    });

    it('renders advanced settings', () => {
      render(<RaffleConfiguration {...defaultProps} />);
      
      expect(screen.getByText('Animation Duration (ms)')).toBeInTheDocument();
      const durationInput = screen.getByPlaceholderText('5000');
      expect(durationInput).toBeInTheDocument();

      expect(screen.getByText('Enable Sound Effects')).toBeInTheDocument();
      expect(screen.getByText('Enabled')).toBeInTheDocument();
      expect(screen.getByText('Disabled')).toBeInTheDocument();
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

  describe('Validation Errors', () => {
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