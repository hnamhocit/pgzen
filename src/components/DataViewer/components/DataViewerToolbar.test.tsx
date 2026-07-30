import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DataViewerToolbar } from './DataViewerToolbar';
import { useDataViewerStore } from '../store/useDataViewerStore';
import { invoke } from '@tauri-apps/api/core';

// Mock Tauri invoke
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

// Mock Sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock Export hook to avoid testing xlsx logic here
vi.mock('../hooks/useDataExport', () => ({
  useDataExport: () => ({
    handleExport: vi.fn(),
  }),
}));

describe('DataViewerToolbar', () => {
  const mockTab = {
    id: 'tab-1',
    connectionId: 'conn-1',
    database: 'postgres',
    type: 'table' as const,
    schema: 'public',
    table: 'users',
    isDirty: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useDataViewerStore.getState().reset();
  });

  it('renders commit and rollback buttons when there are staged deletes', () => {
    useDataViewerStore.setState({
      isStagedDelete: true,
      selectedRows: new Set([0, 1]),
      data: [{ id: 1 }, { id: 2 }],
      columns: [{ name: 'id', data_type: 'int4', is_primary_key: true }],
    });

    render(<DataViewerToolbar tab={mockTab} />);

    expect(screen.getByText(/Commit Delete/i)).toBeInTheDocument();
    expect(screen.getByText(/Cancel/i)).toBeInTheDocument();
  });

  it('renders commit and rollback buttons when there are staged edits', () => {
    useDataViewerStore.setState({
      isStagedEdit: true,
      editedData: { 0: { name: 'New Name' } },
      data: [{ id: 1, name: 'Old' }],
      columns: [{ name: 'id', data_type: 'int4', is_primary_key: true }],
    });

    render(<DataViewerToolbar tab={mockTab} />);

    expect(screen.getByText(/Save Changes/i)).toBeInTheDocument();
    expect(screen.getByText(/Cancel/i)).toBeInTheDocument();
  });

  it('calls execute_sql_raw with DELETE query when committing staged deletes', async () => {
    useDataViewerStore.setState({
      isStagedDelete: true,
      selectedRows: new Set([0]),
      data: [{ id: 1, name: 'A' }],
      columns: [{ name: 'id', data_type: 'int4', is_primary_key: true }],
    });

    vi.mocked(invoke).mockResolvedValueOnce([]);

    render(<DataViewerToolbar tab={mockTab} />);

    const commitBtn = screen.getByText(/Commit Delete/i);
    fireEvent.click(commitBtn);

    // Now the dialog should be open, find the dialog confirm button
    const dialogConfirmBtn = screen.getByText(/Commit 1 Change\(s\)/i);
    fireEvent.click(dialogConfirmBtn);

    // Give microtasks time to finish since it's an async handler
    await new Promise(process.nextTick);

    expect(invoke).toHaveBeenCalledWith('execute_sql_raw', {
      connectionId: 'conn-1',
      database: 'postgres',
      query: 'DELETE FROM "public"."users" WHERE "id" = 1;',
    });
  });

  it('calls execute_sql_raw with UPDATE query when committing staged edits', async () => {
    useDataViewerStore.setState({
      isStagedEdit: true,
      editedData: { 0: { name: 'Bob' } },
      data: [{ id: 1, name: 'Alice' }],
      columns: [{ name: 'id', data_type: 'int4', is_primary_key: true }],
    });

    vi.mocked(invoke).mockResolvedValueOnce([]);

    render(<DataViewerToolbar tab={mockTab} />);

    const commitBtn = screen.getByText(/Save Changes/i);
    fireEvent.click(commitBtn);

    const dialogConfirmBtn = screen.getByText(/Commit 1 Change\(s\)/i);
    fireEvent.click(dialogConfirmBtn);

    await new Promise(process.nextTick);

    expect(invoke).toHaveBeenCalledWith('execute_sql_raw', {
      connectionId: 'conn-1',
      database: 'postgres',
      query: 'UPDATE "public"."users" SET "name" = \'Bob\' WHERE "id" = 1;',
    });
  });
});
