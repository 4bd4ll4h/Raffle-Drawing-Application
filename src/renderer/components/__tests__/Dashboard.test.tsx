import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from '../Dashboard';
import { Raffle, AnimationStyle, RaffleStatus } from '../../../types';

// Simple mock for Ant Design components
jest.mock('antd', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
  Button: ({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) => (
    <button onClick={onClick} disabled={disabled} data-testid="button">{children}</button>
  ),
  Typography: {
    Title: ({ children }: { children: React.ReactNode }) => <h2 data-testid="title">{children}</h2>,
    Paragraph: ({ children }: { children: React.ReactNode }) => <p data-testid="paragraph">{children}</p>,
    Text: ({ children }: { children: React.ReactNode }) => <span data-testid="text">{children}</span>,
  },
  Space: ({ children }: { children: React.ReactNode }) => <div data-testid="space">{children}</div>,
  Input: {
    Search: ({ placeholder, value, onChange }: any) => (
      <input 
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        data-testid="search-input"
      />
    )
  },
  Select: ({ options, value, onChange, placeholder, mode }: any) => {
    // For multiple select, ensure value is always an array
    const selectValue = mode === 'multiple' ? (Array.isArray(value) ? value : []) : value;
    
    return (
      <select 
        value={selectValue} 
        onChange={onChange} 
        data-testid="select"
        multiple={mode === 'multiple'}
      >
        <option value="">{placeholder}</option>
        {options?.map((option: any) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  },
  Table: ({ dataSource }: any) => (
    <div data-testid="table">
      {dataSource?.map((item: any) => (
        <div key={item.id} data-testid={`table-row-${item.id}`}>
          {item.name}
        </div>
      ))}
    </div>
  ),
  Tag: ({ children }: { children: React.ReactNode }) => <span data-testid="tag">{children}</span>,
  Dropdown: ({ children }: { children: React.ReactNode }) => <div data-testid="dropdown">{children}</div>,
  Modal: ({ title, open, children, onOk, onCancel }: any) => 
    open ? (
      <div data-testid="modal">
        <h3>{title}</h3>
        {children}
        <button onClick={onOk} data-testid="modal-ok">OK</button>
        <button onClick={onCancel} data-testid="modal-cancel">Cancel</button>
      </div>
    ) : null,
  message: {
    success: jest.fn(),
    warning: jest.fn(),
    error: jest.fn(),
  },
  Row: ({ children }: any) => <div data-testid="row">{children}</div>,
  Col: ({ children }: any) => <div data-testid="col">{children}</div>,
  Statistic: ({ title, value }: any) => (
    <div data-testid="statistic">
      <div>{title}</div>
      <div>{value}</div>
    </div>
  ),
  Switch: ({ checked, onChange }: any) => (
    <button 
      onClick={() => onChange?.(!checked)}
      data-testid="switch"
      data-checked={checked}
    >
      Switch
    </button>
  ),
  Tooltip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Badge: ({ count, children }: { count: number; children?: React.ReactNode }) => (
    <span data-testid="badge">{children}{count}</span>
  ),
  Empty: ({ description }: { description: React.ReactNode }) => (
    <div data-testid="empty">{description}</div>
  ),
  Spin: ({ spinning, children }: { spinning: boolean; children: React.ReactNode }) => (
    <div data-testid="spin" data-spinning={spinning}>{children}</div>
  ),
}));

// Mock icons
jest.mock('@ant-design/icons', () => ({
  PlusOutlined: () => <span data-testid="plus-icon">+</span>,
  TrophyOutlined: () => <span data-testid="trophy-icon">🏆</span>,
  SearchOutlined: () => <span data-testid="search-icon">🔍</span>,
  FilterOutlined: () => <span data-testid="filter-icon">🔽</span>,
  DeleteOutlined: () => <span data-testid="delete-icon">🗑️</span>,
  EditOutlined: () => <span data-testid="edit-icon">✏️</span>,
  PlayCircleOutlined: () => <span data-testid="play-icon">▶️</span>,
  EyeOutlined: () => <span data-testid="eye-icon">👁️</span>,
  MoreOutlined: () => <span data-testid="more-icon">⋯</span>,
  AppstoreOutlined: () => <span data-testid="grid-icon">⊞</span>,
  UnorderedListOutlined: () => <span data-testid="list-icon">☰</span>,
  ExportOutlined: () => <span data-testid="export-icon">📤</span>,
  CalendarOutlined: () => <span data-testid="calendar-icon">📅</span>,
  UserOutlined: () => <span data-testid="user-icon">👤</span>,
  VideoCameraOutlined: () => <span data-testid="video-icon">📹</span>,
  InboxOutlined: () => <span data-testid="archive-icon">📦</span>,
}));

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

// Mock data
const mockRaffles: Raffle[] = [
  {
    id: '1',
    name: 'Test Raffle 1',
    backgroundImagePath: '/path/to/image1.jpg',
    csvFilePath: '/path/to/csv1.csv',
    status: 'ready' as RaffleStatus,
    animationStyle: AnimationStyle.CS2_CASE,
    createdDate: new Date('2024-01-01'),
    modifiedDate: new Date('2024-01-02'),
    customSettings: {
      colorScheme: { primary: '#1890ff', secondary: '#f0f0f0', accent: '#52c41a', background: '#ffffff' },
      logoPosition: 'top-left' as const,
      animationDuration: 5000,
      soundEnabled: true
    },
    participantCount: 100
  },
  {
    id: '2',
    name: 'Test Raffle 2',
    backgroundImagePath: undefined,
    csvFilePath: '/path/to/csv2.csv',
    status: 'draft' as RaffleStatus,
    animationStyle: AnimationStyle.SPINNING_WHEEL,
    createdDate: new Date('2024-01-03'),
    modifiedDate: new Date('2024-01-04'),
    customSettings: {
      colorScheme: { primary: '#722ed1', secondary: '#f0f0f0', accent: '#fa8c16', background: '#ffffff' },
      logoPosition: 'center' as const,
      animationDuration: 3000,
      soundEnabled: false
    },
    participantCount: 50
  }
];

describe('Dashboard Component', () => {
  const defaultProps = {
    raffles: [],
    loading: false,
    error: undefined,
    onCreateRaffle: jest.fn(),
    onEditRaffle: jest.fn(),
    onDeleteRaffle: jest.fn(),
    onStartDrawing: jest.fn(),
    onViewRaffle: jest.fn(),
    onBulkDelete: jest.fn(),
    onBulkExport: jest.fn(),
    onArchiveRaffle: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Empty State', () => {
    test('renders empty state when no raffles exist', () => {
      renderWithRouter(<Dashboard {...defaultProps} />);
      
      expect(screen.getByText(/Raffle Dashboard/i)).toBeInTheDocument();
      expect(screen.getByText(/No Raffles Yet/i)).toBeInTheDocument();
      expect(screen.getByText(/Get started by creating your first raffle/i)).toBeInTheDocument();
      expect(screen.getByText(/Create New Raffle/i)).toBeInTheDocument();
    });

    test('calls onCreateRaffle when create button is clicked in empty state', () => {
      renderWithRouter(<Dashboard {...defaultProps} />);
      
      const createButton = screen.getByText(/Create New Raffle/i);
      fireEvent.click(createButton);
      
      expect(defaultProps.onCreateRaffle).toHaveBeenCalledTimes(1);
    });
  });

  describe('Loading State', () => {
    test('shows loading spinner when loading is true', () => {
      renderWithRouter(<Dashboard {...defaultProps} loading={true} raffles={mockRaffles} />);
      
      const spinner = screen.getByTestId('spin');
      expect(spinner).toHaveAttribute('data-spinning', 'true');
    });
  });

  describe('Error State', () => {
    test('displays error message when error prop is provided', () => {
      const errorMessage = 'Failed to load raffles';
      renderWithRouter(<Dashboard {...defaultProps} error={errorMessage} raffles={mockRaffles} />);
      
      expect(screen.getByText('Error loading raffles')).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  describe('Raffle Display', () => {
    test('renders dashboard title and description', () => {
      renderWithRouter(<Dashboard {...defaultProps} raffles={mockRaffles} />);
      
      expect(screen.getByText(/Raffle Dashboard/i)).toBeInTheDocument();
      expect(screen.getByText(/Manage your raffles, configure settings/i)).toBeInTheDocument();
    });

    test('renders statistics cards', () => {
      renderWithRouter(<Dashboard {...defaultProps} raffles={mockRaffles} />);
      
      expect(screen.getByText('Total Raffles')).toBeInTheDocument();
      expect(screen.getByText('Ready to Draw')).toBeInTheDocument();
      expect(screen.getAllByText('Completed')[0]).toBeInTheDocument(); // First occurrence (statistic card)
      expect(screen.getByText('Total Participants')).toBeInTheDocument();
    });

    test('renders raffles in grid view by default', () => {
      renderWithRouter(<Dashboard {...defaultProps} raffles={mockRaffles} />);
      
      expect(screen.getByText('Test Raffle 1')).toBeInTheDocument();
      expect(screen.getByText('Test Raffle 2')).toBeInTheDocument();
    });

    test('shows search and filter controls', () => {
      renderWithRouter(<Dashboard {...defaultProps} raffles={mockRaffles} />);
      
      expect(screen.getByTestId('search-input')).toBeInTheDocument();
      expect(screen.getByText('Clear Filters')).toBeInTheDocument();
    });

    test('shows create new raffle button', () => {
      renderWithRouter(<Dashboard {...defaultProps} raffles={mockRaffles} />);
      
      const createButtons = screen.getAllByText('Create New Raffle');
      expect(createButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Raffle Actions', () => {
    test('calls onCreateRaffle when create button is clicked', () => {
      renderWithRouter(<Dashboard {...defaultProps} raffles={mockRaffles} />);
      
      const createButton = screen.getAllByText('Create New Raffle')[0];
      fireEvent.click(createButton);
      
      expect(defaultProps.onCreateRaffle).toHaveBeenCalledTimes(1);
    });

    test('displays raffle count information', () => {
      renderWithRouter(<Dashboard {...defaultProps} raffles={mockRaffles} />);
      
      expect(screen.getByText(/Showing \d+ of \d+ raffles/)).toBeInTheDocument();
    });
  });

  describe('View Toggle', () => {
    test('has view toggle switch', () => {
      renderWithRouter(<Dashboard {...defaultProps} raffles={mockRaffles} />);
      
      const switchElement = screen.getByTestId('switch');
      expect(switchElement).toBeInTheDocument();
      expect(switchElement).toHaveAttribute('data-checked', 'true'); // Grid view by default
    });

    test('switches to list view when toggle is clicked', () => {
      renderWithRouter(<Dashboard {...defaultProps} raffles={mockRaffles} />);
      
      const viewToggle = screen.getByTestId('switch');
      fireEvent.click(viewToggle);
      
      // Should show table in list view
      expect(screen.getByTestId('table')).toBeInTheDocument();
    });
  });

  describe('Component Structure', () => {
    test('renders main dashboard structure', () => {
      renderWithRouter(<Dashboard {...defaultProps} raffles={mockRaffles} />);
      
      // Check for main structural elements
      expect(screen.getAllByTestId('card')).toHaveLength(7); // 4 Statistics cards + 1 controls card + 2 raffle cards
      expect(screen.getAllByTestId('row')).toHaveLength(3); // Statistics row + controls row + raffle grid row
      expect(screen.getAllByTestId('title')).toHaveLength(3); // Main title + 2 raffle titles
    });

    test('renders with proper accessibility structure', () => {
      renderWithRouter(<Dashboard {...defaultProps} raffles={mockRaffles} />);
      
      // Should have proper heading structure
      expect(screen.getAllByTestId('title')).toHaveLength(3); // Main title + 2 raffle titles
      expect(screen.getAllByTestId('paragraph')).toHaveLength(1);
    });
  });

  describe('Search and Filter Functionality', () => {
    test('filters raffles by search term', () => {
      renderWithRouter(<Dashboard {...defaultProps} raffles={mockRaffles} />);
      
      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: 'Test Raffle 1' } });
      
      expect(screen.getByText('Test Raffle 1')).toBeInTheDocument();
      expect(screen.queryByText('Test Raffle 2')).not.toBeInTheDocument();
    });

    test('clears filters when clear button is clicked', () => {
      renderWithRouter(<Dashboard {...defaultProps} raffles={mockRaffles} />);
      
      const clearButton = screen.getByText('Clear Filters');
      fireEvent.click(clearButton);
      
      // Should show all raffles after clearing
      expect(screen.getByText('Test Raffle 1')).toBeInTheDocument();
      expect(screen.getByText('Test Raffle 2')).toBeInTheDocument();
    });
  });

  describe('Modal Functionality', () => {
    test('does not show delete modal initially', () => {
      renderWithRouter(<Dashboard {...defaultProps} raffles={mockRaffles} />);
      
      expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
    });
  });

  describe('Statistics Display', () => {
    test('calculates and displays correct statistics', () => {
      renderWithRouter(<Dashboard {...defaultProps} raffles={mockRaffles} />);
      
      // Check statistics values
      expect(screen.getByText('2')).toBeInTheDocument(); // Total raffles
      expect(screen.getByText('1')).toBeInTheDocument(); // Ready to draw
      expect(screen.getByText('0')).toBeInTheDocument(); // Completed
      expect(screen.getByText('150')).toBeInTheDocument(); // Total participants (100 + 50)
    });
  });

  describe('Props Handling', () => {
    test('handles undefined props gracefully', () => {
      const minimalProps = {
        raffles: mockRaffles
      };
      
      expect(() => {
        renderWithRouter(<Dashboard {...minimalProps} />);
      }).not.toThrow();
    });

    test('displays correct raffle count', () => {
      renderWithRouter(<Dashboard {...defaultProps} raffles={mockRaffles} />);
      
      expect(screen.getByText(`Showing ${mockRaffles.length} of ${mockRaffles.length} raffles`)).toBeInTheDocument();
    });
  });
});