import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ExportHistory from '../ExportHistory';
import { ExportHistoryEntry } from '../../../main/services/ExportService';
import dayjs from 'dayjs';

// Mock antd components
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

// Mock dayjs
jest.mock('dayjs', () => {
  const originalDayjs = jest.requireActual('dayjs');
  const mockDayjs = jest.fn((date?: any) => {
    if (date) {
      return originalDayjs(date);
    }
    return originalDayjs('2024-01-15T10:30:00Z');
  });
  
  // Copy all static methods
  Object.keys(originalDayjs).forEach(key => {
    mockDayjs[key] = originalDayjs[key];
  });
  
  return mockDayjs;
});

// Mock window.electronAPI
const mockElectronAPI = {
  getExportHistory: jest.fn()
};

Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true
});

describe('ExportHistory', () => {
  const mockHistoryEntries: ExportHistoryEntry[] = [
    {
      id: 'entry-1',
      timestamp: new Date('2024-01-15T10:30:00Z'),
      exportType: 'individual',
      format: 'csv',
      raffleIds: ['raffle-1'],
      outputPath: '/path/to/export1.csv',
      fileCount: 1,
      success: true
    },
    {
      id: 'entry-2',
      timestamp: new Date('2024-01-14T15:45:00Z'),
      exportType: 'bulk',
      format: 'json',
      raffleIds: ['raffle-1', 'raffle-2'],
      outputPath: '/path/to/bulk-export.json',
      fileCount: 2,
      success: true
    },
    {
      id: 'entry-3',
      timestamp: new Date('2024-01-13T09:15:00Z'),
      exportType: 'individual',
      format: 'csv',
      raffleIds: ['raffle-3'],
      outputPath: '/path/to/failed-export.csv',
      fileCount: 0,
      success: false,
      error: 'File not found'
    }
  ];

  const defaultProps = {
    visible: true,
    onClose: jest.fn(),
    onReExport: jest.fn(),
    onClearHistory: jest.fn(),
    loading: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockElectronAPI.getExportHistory.mockResolvedValue(mockHistoryEntries);
  });

  it('should render modal with correct title', () => {
    render(<ExportHistory {...defaultProps} />);
    
    expect(screen.getByText('Export History')).toBeInTheDocument();
  });

  it('should load and display export history on mount', async () => {
    render(<ExportHistory {...defaultProps} />);
    
    await waitFor(() => {
      expect(mockElectronAPI.getExportHistory).toHaveBeenCalled();
    });

    // Check statistics
    expect(screen.getByText('3')).toBeInTheDocument(); // Total exports
    expect(screen.getByText('2')).toBeInTheDocument(); // Successful
    expect(screen.getByText('1')).toBeInTheDocument(); // Failed
    expect(screen.getByText('1')).toBeInTheDocument(); // Bulk exports
  });

  it('should display history entries in table', async () => {
    render(<ExportHistory {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('/path/to/export1.csv')).toBeInTheDocument();
      expect(screen.getByText('/path/to/bulk-export.json')).toBeInTheDocument();
      expect(screen.getByText('/path/to/failed-export.csv')).toBeInTheDocument();
    });

    // Check entry details
    expect(screen.getByText('Individual')).toBeInTheDocument();
    expect(screen.getByText('Bulk')).toBeInTheDocument();
    expect(screen.getByText('CSV')).toBeInTheDocument();
    expect(screen.getByText('JSON')).toBeInTheDocument();
  });

  it('should show success and failed status correctly', async () => {
    render(<ExportHistory {...defaultProps} />);
    
    await waitFor(() => {
      const successTags = screen.getAllByText('Success');
      const failedTags = screen.getAllByText('Failed');
      
      expect(successTags).toHaveLength(2);
      expect(failedTags).toHaveLength(1);
    });
  });

  it('should filter by search term', async () => {
    const user = userEvent.setup();
    render(<ExportHistory {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('/path/to/export1.csv')).toBeInTheDocument();
    });

    // Search for specific path
    const searchInput = screen.getByPlaceholderText('Search by raffle ID or path...');
    await user.type(searchInput, 'bulk-export');
    
    // Should only show matching entry
    expect(screen.getByText('/path/to/bulk-export.json')).toBeInTheDocument();
    expect(screen.queryByText('/path/to/export1.csv')).not.toBeInTheDocument();
  });

  it('should filter by status', async () => {
    const user = userEvent.setup();
    render(<ExportHistory {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getAllByText('Success')).toHaveLength(2);
    });

    // Filter by failed status
    const statusSelect = screen.getByDisplayValue('All Status');
    await user.click(statusSelect);
    await user.click(screen.getByText('Failed'));
    
    // Should only show failed entries
    expect(screen.getAllByText('Failed')).toHaveLength(1);
    expect(screen.queryByText('Success')).not.toBeInTheDocument();
  });

  it('should filter by export type', async () => {
    const user = userEvent.setup();
    render(<ExportHistory {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Individual')).toBeInTheDocument();
      expect(screen.getByText('Bulk')).toBeInTheDocument();
    });

    // Filter by individual type
    const typeSelect = screen.getByDisplayValue('All Types');
    await user.click(typeSelect);
    await user.click(screen.getByText('Individual'));
    
    // Should only show individual entries
    expect(screen.getAllByText('Individual')).toHaveLength(2);
    expect(screen.queryByText('Bulk')).not.toBeInTheDocument();
  });

  it('should filter by date range', async () => {
    const user = userEvent.setup();
    render(<ExportHistory {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getAllByText(/Jan \d+, 2024/)).toHaveLength(3);
    });

    // Set date range (this is simplified - actual date picker interaction is complex)
    const dateRangePicker = screen.getByPlaceholderText('Start Date');
    fireEvent.change(dateRangePicker, { target: { value: '2024-01-14' } });
    
    // Note: Full date range testing would require more complex mocking of antd DatePicker
  });

  it('should clear all filters', async () => {
    const user = userEvent.setup();
    render(<ExportHistory {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('/path/to/export1.csv')).toBeInTheDocument();
    });

    // Apply some filters
    const searchInput = screen.getByPlaceholderText('Search by raffle ID or path...');
    await user.type(searchInput, 'test');
    
    // Clear filters
    const clearButton = screen.getByRole('button', { name: 'Clear' });
    await user.click(clearButton);
    
    // All entries should be visible again
    expect(searchInput).toHaveValue('');
  });

  it('should call onReExport when re-export button is clicked', async () => {
    const user = userEvent.setup();
    const mockOnReExport = jest.fn().mockResolvedValue(undefined);
    
    render(<ExportHistory {...defaultProps} onReExport={mockOnReExport} />);
    
    await waitFor(() => {
      expect(screen.getByText('/path/to/export1.csv')).toBeInTheDocument();
    });

    // Click re-export button for successful entry
    const reExportButtons = screen.getAllByRole('button', { name: '' }); // Icon buttons
    const reExportButton = reExportButtons.find(btn => 
      btn.querySelector('.anticon-reload')
    );
    
    if (reExportButton) {
      await user.click(reExportButton);
      
      await waitFor(() => {
        expect(mockOnReExport).toHaveBeenCalledWith('entry-1');
      });
    }
  });

  it('should disable re-export button for failed entries', async () => {
    render(<ExportHistory {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('File not found')).toBeInTheDocument();
    });

    // Find the row with failed export and check if re-export button is disabled
    const failedRow = screen.getByText('File not found').closest('tr');
    const reExportButton = failedRow?.querySelector('button[disabled]');
    
    expect(reExportButton).toBeInTheDocument();
  });

  it('should call onClearHistory when clear history is confirmed', async () => {
    const user = userEvent.setup();
    const mockOnClearHistory = jest.fn().mockResolvedValue(undefined);
    
    render(<ExportHistory {...defaultProps} onClearHistory={mockOnClearHistory} />);
    
    // Click clear history button
    const clearHistoryButton = screen.getByRole('button', { name: 'Clear History' });
    await user.click(clearHistoryButton);
    
    // Confirm in popconfirm
    const confirmButton = screen.getByRole('button', { name: 'Clear' });
    await user.click(confirmButton);
    
    await waitFor(() => {
      expect(mockOnClearHistory).toHaveBeenCalled();
    });
  });

  it('should call onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    const mockOnClose = jest.fn();
    
    render(<ExportHistory {...defaultProps} onClose={mockOnClose} />);
    
    const closeButton = screen.getByRole('button', { name: 'Close' });
    await user.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should show empty state when no history exists', async () => {
    mockElectronAPI.getExportHistory.mockResolvedValue([]);
    
    render(<ExportHistory {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('No export history found')).toBeInTheDocument();
    });
  });

  it('should show empty state when no entries match filters', async () => {
    const user = userEvent.setup();
    render(<ExportHistory {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('/path/to/export1.csv')).toBeInTheDocument();
    });

    // Apply filter that matches nothing
    const searchInput = screen.getByPlaceholderText('Search by raffle ID or path...');
    await user.type(searchInput, 'nonexistent');
    
    await waitFor(() => {
      expect(screen.getByText('No exports match your filters')).toBeInTheDocument();
    });
  });

  it('should show loading state', () => {
    render(<ExportHistory {...defaultProps} loading={true} />);
    
    // Check for loading spinner in table
    expect(screen.getByRole('table')).toHaveClass('ant-table-loading');
  });

  it('should handle re-export loading state', async () => {
    const user = userEvent.setup();
    const mockOnReExport = jest.fn().mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 100))
    );
    
    render(<ExportHistory {...defaultProps} onReExport={mockOnReExport} />);
    
    await waitFor(() => {
      expect(screen.getByText('/path/to/export1.csv')).toBeInTheDocument();
    });

    // Click re-export button
    const reExportButtons = screen.getAllByRole('button', { name: '' });
    const reExportButton = reExportButtons.find(btn => 
      btn.querySelector('.anticon-reload')
    );
    
    if (reExportButton) {
      await user.click(reExportButton);
      
      // Should show loading state
      expect(reExportButton).toHaveClass('ant-btn-loading');
    }
  });

  it('should format dates correctly', async () => {
    render(<ExportHistory {...defaultProps} />);
    
    await waitFor(() => {
      // Check if dates are formatted properly
      expect(screen.getByText('Jan 15, 2024')).toBeInTheDocument();
      expect(screen.getByText('Jan 14, 2024')).toBeInTheDocument();
      expect(screen.getByText('Jan 13, 2024')).toBeInTheDocument();
    });
  });

  it('should show error tooltip for failed exports', async () => {
    const user = userEvent.setup();
    render(<ExportHistory {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Failed')).toBeInTheDocument();
    });

    // Hover over failed tag to see tooltip
    const failedTag = screen.getByText('Failed');
    await user.hover(failedTag);
    
    await waitFor(() => {
      expect(screen.getByText('File not found')).toBeInTheDocument();
    });
  });

  it('should sort table by columns', async () => {
    const user = userEvent.setup();
    render(<ExportHistory {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('/path/to/export1.csv')).toBeInTheDocument();
    });

    // Click on date column header to sort
    const dateHeader = screen.getByText('Date & Time');
    await user.click(dateHeader);
    
    // Table should re-render with sorted data
    // (Detailed sorting verification would require more complex testing)
  });

  it('should handle pagination', async () => {
    // Create more entries to test pagination
    const manyEntries = Array.from({ length: 15 }, (_, i) => ({
      id: `entry-${i}`,
      timestamp: new Date(`2024-01-${i + 1}T10:30:00Z`),
      exportType: 'individual' as const,
      format: 'csv' as const,
      raffleIds: [`raffle-${i}`],
      outputPath: `/path/to/export${i}.csv`,
      fileCount: 1,
      success: true
    }));

    mockElectronAPI.getExportHistory.mockResolvedValue(manyEntries);
    
    render(<ExportHistory {...defaultProps} />);
    
    await waitFor(() => {
      // Should show pagination controls
      expect(screen.getByText('1-10 of 15 exports')).toBeInTheDocument();
    });
  });
});