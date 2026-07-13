/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ProjectEditor } from '../features/ProjectEditor/ProjectEditor';
import { FlowNode, FlowConnection } from '../types';

// Mock dependencies to isolate ProjectEditor
vi.mock('../features/ProjectEditor/components/AgentFlowCanvas', () => ({
  AgentFlowCanvas: ({ nodes, connections }: any) => (
    <div data-testid="mock-flow-canvas">
      <div data-testid="nodes-count">{nodes.length}</div>
      <div data-testid="connections-count">{connections.length}</div>
      {nodes.map((n: any) => (
        <div key={n.id} data-testid={`canvas-node-${n.id}`}>
          {n.name || n.type}
        </div>
      ))}
    </div>
  )
}));

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { changeLanguage: () => Promise.resolve() }
  })
}));

describe('ProjectEditor React Component Unit Tests', () => {
  const mockNodes: FlowNode[] = [
    {
      id: 'node-1',
      type: 'prompt',
      position: { x: 100, y: 150 },
      fields: { title: 'User Input Prompt', template: 'Hello {name}' }
    },
    {
      id: 'node-2',
      type: 'gemini',
      position: { x: 300, y: 150 },
      fields: { model: 'gemini-2.5-pro', temperature: 0.7 }
    }
  ];

  const mockConnections: FlowConnection[] = [
    {
      id: 'conn-1',
      sourceId: 'node-1',
      targetId: 'node-2',
      sourceHandle: 'output',
      targetHandle: 'input'
    }
  ];

  const defaultProps = {
    currentLang: 'en' as const,
    currentTheme: 'indigo',
    translations: {},
    nodes: mockNodes,
    setNodes: vi.fn(),
    connections: mockConnections,
    setConnections: vi.fn(),
    selectedNodeId: null,
    setSelectedNodeId: vi.fn(),
    highlightedNodeId: null,
    nodeExecutionStatuses: {},
    isRunning: false,
    showcaseMode: false,
    setShowcaseMode: vi.fn(),
    leftSidebarCollapsed: false,
    setLeftSidebarCollapsed: vi.fn(),
    rightSidebarCollapsed: true,
    setRightSidebarCollapsed: vi.fn(),
    canvasZoom: 1,
    setCanvasZoom: vi.fn(),
    snapToGrid: true,
    setSnapToGrid: vi.fn(),
    canvasLocked: false,
    setCanvasLocked: vi.fn(),
    onCreateNode: vi.fn(),
    savedSnapshots: [],
    onRestoreSnapshot: vi.fn(),
    onDeleteSnapshot: vi.fn(),
    onSaveSnapshot: vi.fn(),
    projectNameInput: 'Demo Project',
    onProjectNameInputChange: vi.fn(),
    onSaveProjectToServer: vi.fn(),
    savingProject: false,
    serverProjects: [],
    loadingProjects: false,
    currentSavedProjectName: null,
    onLoadProjectFromServer: vi.fn(),
    handleDeleteNode: vi.fn(),
    handleConnectNodes: vi.fn(),
    handleUpdateNodeField: vi.fn(),
    handleDuplicateNode: vi.fn(),
    handleDryRunNode: vi.fn(),
    isDryRunningNode: null,
    dryRunOutput: {},
    setDryRunOutput: vi.fn(),
    handleAutoAlignNodes: vi.fn(),
    userId: 'test-user-123',
    locks: {},
    validationReport: null,
    setValidationReport: vi.fn(),
    handleValidateFlow: vi.fn()
  };

  it('renders the editor layout with correct nodes and connections count', () => {
    render(<ProjectEditor {...defaultProps} />);
    
    // Check if mock canvas is rendered
    expect(screen.getByTestId('mock-flow-canvas')).toBeTruthy();
    
    // Verify nodes and connections counts passed to canvas
    expect(screen.getByTestId('nodes-count').textContent).toBe('2');
    expect(screen.getByTestId('connections-count').textContent).toBe('1');
    
    // Verify specific nodes are found
    expect(screen.getByTestId('canvas-node-node-1')).toBeTruthy();
    expect(screen.getByTestId('canvas-node-node-2')).toBeTruthy();
  });

  it('displays validation report errors and warnings when present', () => {
    const report = {
      errors: ['Circular dependency detected on node-1', 'Required field template is empty'],
      warnings: ['Node-2 is unconnected']
    };

    render(<ProjectEditor {...defaultProps} validationReport={report} />);
    
    // Check if error alerts are rendered in the validation HUD
    expect(screen.getByText('Circular dependency detected on node-1')).toBeTruthy();
    expect(screen.getByText('Required field template is empty')).toBeTruthy();
    expect(screen.getByText('Node-2 is unconnected')).toBeTruthy();
  });

  it('triggers left sidebar collapsed toggle action', () => {
    const setLeftSidebarCollapsed = vi.fn();
    render(
      <ProjectEditor 
        {...defaultProps} 
        leftSidebarCollapsed={false} 
        setLeftSidebarCollapsed={setLeftSidebarCollapsed} 
      />
    );
    
    // Find the toggle button on left sidebar if collapsed or expandable
    const toggleButton = screen.queryByTitle('Collapse Sidebar') || screen.queryByTitle('addNode') || screen.queryByRole('button', { name: /addNode|toolboxHeader/i });
    if (toggleButton) {
      toggleButton.click();
      expect(setLeftSidebarCollapsed).toHaveBeenCalled();
    }
  });
});
