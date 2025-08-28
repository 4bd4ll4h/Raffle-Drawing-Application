import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BulkExportModal from '../BulkExportModal';
import { BulkExportOptions, BulkOperationResult } from '../../../types';

// Mock antd components that have complex behavior
jest.mock('antd', () => {
  const antd = jest.requireActual('antd');
  return {
    ...antd,
    message: {
      success: jest.fn(),
      error: jest.fn(),
      warning: jest.fn()
    }
  };
});

describe('BulkExportModal', () => {
  const mockRaffleNames = {
    'raffle-1': 'Test Raffle 1',
    'raffle-2': 'Test Raffle 2',
    'raffle-3': 'Test Raffle 3'
  };

  const defaultProps = {
    visible: true,
    selectedRaffleIds: ['raffle-1', 'raffle-2'],
    raffleNames: mockRaffleNames,
    onExport: jest.fn(),
    onCancel: jest.fn(),
    loading: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render modal with correct title and selected raffles', () => {
    render(<BulkExportModal {...defaultProps} />);
    
    expect(screen.getByText('Bulk Export Raffles')).toBeInTheDocument();
    expect(screen.getByText('Ready to export 2 raffles')).toBeInTheDocument();
    expect(screen.getByText('Test Raffle 1')).toBeInTheDocument();
    expect(screen.getByText('Test Raffle 2')).toBeInTheDocument();
  });

  it('should have default form values set correctly', () => {
    render(<BulkExportModal {...defaultProps} />);
    
    // Check default selections
    expect(screen.getByDisplayValue('CSV (Comma Separated Values)')).toBeInTheDocument();
    expect(screen.getByText('Separate - Individual files per raffle')).toBeInTheDocument();
    
    // Check default checkboxes
    expect(screen.getByRole('checkbox', { name: 'Include Participants' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Include Drawing History' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Include Metadata' })).toBeChecked();
  });

  it('should allow changing export format', async () => {
    const user = userEvent.setup();
    render(<BulkExportModal {...defaultProps} />);
    
    // Click on format dropdown
    const formatSelect = screen.getByDisplayValue('CSV (Comma Separated Values)');
    await user.click(formatSelect);
    
    // Select JSON option
    await user.click(screen.getByText('JSON (JavaScript Object Notation)'));
    
    expect(screen.getByDisplayValue('JSON (JavaScript Object Notation)')).toBeInTheDocument();
  });

  it('should allow changing export type', async () => {
    const user = userEvent.setup();
    render(<BulkExportModal {...defaultProps} />);
    
    // Find and click the export type dropdown
    const exportTypeSelect = screen.getByText('Separate - Individual files per raffle');
    await user.click(exportTypeSelect);
    
    // Select combined option
    await user.click(screen.getByText('Combined - Single file with all raffles'));
    
    expect(screen.getByText('Combined - Single file with all raffles')).toBeInTheDocument();
  });

  it('should allow toggling content options', async () => {
    const user = userEvent.setup();
    render(<BulkExportModal {...defaultProps} />);
    
    const participantsCheckbox = screen.getByRole('checkbox', { name: 'Include Participants' });
    const historyCheckbox = screen.getByRole('checkbox', { name: 'Include Drawing History' });
    const metadataCheckbox = screen.getByRole('checkbox', { name: 'Include Metadata' });
    
    // Toggle checkboxes
    await user.click(participantsCheckbox);
    await user.click(historyCheckbox);
    await user.click(metadataCheckbox);
    
    expect(participantsCheckbox).not.toBeChecked();
    expect(historyCheckbox).not.toBeChecked();
    expect(metadataCheckbox).not.toBeChecked();
  });

  it('should call onExport with correct options when export button is clicked', async () => {
    const user = userEvent.setup();
    const mockOnExport = jest.fn().mockResolvedValue({
      successful: ['raffle-1', 'raffle-2'],
      failed: [],
      totalProcessed: 2,
      outputPath: '/path/to/export'
    });

    render(<BulkExportModal {...defaultProps} onExport={mockOnExport} />);
    
    // Click export button
    const exportButton = screen.getByRole('button', { name: /Export 2 Raffles/ });
    await user.click(exportButton);
    
    await waitFor(() => {
      expect(mockOnExport).toHaveBeenCalledWith({
        format: 'csv',
        exportType: 'separate',
        includeDrawingHistory: true,
        includeParticipants: true,
        includeMetadata: true,
        customFields: []
      });
    });
  });

  it('should show progress during export', async () => {
    const user = userEvent.setup();
    const mockOnExport = jest.fn().mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        successful: ['raffle-1', 'raffle-2'],
        failed: [],
        totalProcessed: 2
      }), 100))
    );

    render(<BulkExportModal {...defaultProps} onExport={mockOnExport} />);
    
    const exportButton = screen.getByRole('button', { name: /Export 2 Raffles/ });
    await user.click(exportButton);
    
    // Should show progress
    expect(screen.getByText('Exporting Raffles')).toBeInTheDocument();
    expect(screen.getByText('Preparing export...')).toBeInTheDocument();
    
    // Wait for completion
    await waitFor(() => {
      expect(screen.getByText('Export Results')).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('should show export results after successful export', async () => {
    const user = userEvent.setup();
    const mockOnExport = jest.fn().mockResolvedValue({
      successful: ['raffle-1', 'raffle-2'],
      failed: [],
      totalProcessed: 2,
      outputPath: '/path/to/export/folder'
    });

    render(<BulkExportModal {...defaultProps} onExport={mockOnExport} />);
    
    const exportButton = screen.getByRole('button', { name: /Export 2 Raffles/ });
    await user.click(exportButton);
    
    await waitFor(() => {
      expect(screen.getByText('Export completed successfully')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument(); // Successful count
      expect(screen.getByText('0')).toBeInTheDocument(); // Failed count
      expect(screen.getByText('/path/to/export/folder')).toBeInTheDocument();
    });
  });

  it('should show export results with failures', async () => {
    const user = userEvent.setup();
    const mockOnExport = jest.fn().mockResolvedValue({
      successful: ['raffle-1'],
      failed: [{ id: 'raffle-2', error: 'File not found' }],
      totalProcessed: 2,
      outputPath: '/path/to/export'
    });

    render(<BulkExportModal {...defaultProps} onExport={mockOnExport} />);
    
    const exportButton = screen.getByRole('button', { name: /Export 2 Raffles/ });
    await user.click(exportButton);
    
    await waitFor(() => {
      expect(screen.getByText('Export completed with errors')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument(); // Successful count
      expect(screen.getByText('1')).toBeInTheDocument(); // Failed count
      expect(screen.getByText('Failed Exports:')).toBeInTheDocument();
      expect(screen.getByText('Test Raffle 2')).toBeInTheDocument();
      expect(screen.getByText('File not found')).toBeInTheDocument();
    });
  });

  it('should handle export errors gracefully', async () => {
    const user = userEvent.setup();
    const mockOnExport = jest.fn().mockRejectedValue(new Error('Network error'));

    render(<BulkExportModal {...defaultProps} onExport={mockOnExport} />);
    
    const exportButton = screen.getByRole('button', { name: /Export 2 Raffles/ });
    await user.click(exportButton);
    
    await waitFor(() => {
      expect(screen.getByText('Export failed')).toBeInTheDocument();
    });
  });

  it('should call onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    const mockOnCancel = jest.fn();

    render(<BulkExportModal {...defaultProps} onCancel={mockOnCancel} />);
    
    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    await user.click(cancelButton);
    
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('should call onCancel when close button is clicked after export', async () => {
    const user = userEvent.setup();
    const mockOnCancel = jest.fn();
    const mockOnExport = jest.fn().mockResolvedValue({
      successful: ['raffle-1', 'raffle-2'],
      failed: [],
      totalProcessed: 2
    });

    render(<BulkExportModal {...defaultProps} onCancel={mockOnCancel} onExport={mockOnExport} />);
    
    // Complete export first
    const exportButton = screen.getByRole('button', { name: /Export 2 Raffles/ });
    await user.click(exportButton);
    
    await waitFor(() => {
      expect(screen.getByText('Export Results')).toBeInTheDocument();
    });
    
    // Click close button
    const closeButton = screen.getByRole('button', { name: 'Close' });
    await user.click(closeButton);
    
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('should disable export button when no raffles selected', () => {
    render(<BulkExportModal {...defaultProps} selectedRaffleIds={[]} />);
    
    const exportButton = screen.getByRole('button', { name: /Export 0 Raffles/ });
    expect(exportButton).toBeDisabled();
  });

  it('should show loading state when loading prop is true', () => {
    render(<BulkExportModal {...defaultProps} loading={true} />);
    
    const exportButton = screen.getByRole('button', { name: /Export 2 Raffles/ });
    expect(exportButton).toHaveAttribute('class', expect.stringContaining('ant-btn-loading'));
  });

  it('should allow adding custom fields', async () => {
    const user = userEvent.setup();
    render(<BulkExportModal {...defaultProps} />);
    
    // Find custom fields input
    const customFieldsInput = screen.getByPlaceholderText('e.g., productName, currency, orderAmount');
    
    // Add custom fields
    await user.type(customFieldsInput, 'productName,currency');
    await user.keyboard('{Enter}');
    
    // Verify tags are created
    expect(screen.getByText('productName')).toBeInTheDocument();
    expect(screen.getByText('currency')).toBeInTheDocument();
  });

  it('should not show footer during active export', async () => {
    const user = userEvent.setup();
    const mockOnExport = jest.fn().mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        successful: ['raffle-1'],
        failed: [],
        totalProcessed: 1
      }), 100))
    );

    render(<BulkExportModal {...defaultProps} onExport={mockOnExport} />);
    
    const exportButton = screen.getByRole('button', { name: /Export 2 Raffles/ });
    await user.click(exportButton);
    
    // During export, footer should not be visible
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument();
  });

  it('should reset state when modal is closed and reopened', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<BulkExportModal {...defaultProps} />);
    
    // Make some changes
    const participantsCheckbox = screen.getByRole('checkbox', { name: 'Include Participants' });
    await user.click(participantsCheckbox);
    
    // Close modal
    rerender(<BulkExportModal {...defaultProps} visible={false} />);
    
    // Reopen modal
    rerender(<BulkExportModal {...defaultProps} visible={true} />);
    
    // State should be reset
    const newParticipantsCheckbox = screen.getByRole('checkbox', { name: 'Include Participants' });
    expect(newParticipantsCheckbox).toBeChecked();
  });
});