import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DataTable } from './DataTable';
import { useDataViewerStore } from '../store/useDataViewerStore';

// Mock dependencies
vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: () => ({
    getVirtualItems: () => [
      { index: 0, start: 0, size: 40 },
      { index: 1, start: 40, size: 40 }
    ],
    getTotalSize: () => 80,
    measureElement: vi.fn(),
  }),
}));

vi.mock('./DataCell', () => ({
  DataCell: ({ row, column }: any) => <td data-testid={`cell-${column.name}`}>{row[column.name]}</td>
}));

describe('DataTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useDataViewerStore.getState().reset();
  });

  it('renders loading state when loading is true', () => {
    useDataViewerStore.setState({ loading: true, columns: [], data: [] });
    const { container } = render(<DataTable />);
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders error state when error is present', () => {
    useDataViewerStore.setState({ error: 'Query failed syntax error', columns: [], data: [] });
    render(<DataTable />);
    expect(screen.getByText(/Query failed syntax error/i)).toBeInTheDocument();
  });

  it('renders table headers based on columns', () => {
    useDataViewerStore.setState({
      columns: [
        { name: 'id', data_type: 'int4', is_primary_key: true },
        { name: 'username', data_type: 'varchar', is_primary_key: false },
      ],
      data: [{ id: 1, username: 'alice' }, { id: 2, username: 'bob' }],
      foreignKeys: [],
    });

    render(<DataTable />);

    expect(screen.getByText('id')).toBeInTheDocument();
    expect(screen.getByText('username')).toBeInTheDocument();
  });

  it('renders rows based on virtualized data', () => {
    useDataViewerStore.setState({
      columns: [{ name: 'id', data_type: 'int4', is_primary_key: true }],
      data: [{ id: 101 }, { id: 102 }],
      foreignKeys: [],
      selectedRows: new Set(),
    });

    render(<DataTable />);

    expect(screen.getByText('101')).toBeInTheDocument();
    expect(screen.getByText('102')).toBeInTheDocument();
  });
});
