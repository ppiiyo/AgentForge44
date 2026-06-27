import { describe, it, expect, beforeEach } from 'vitest';
import { useAgentStore } from '../store/useAgentStore.js';

describe('Zustand Zustand Store Modular Slices', () => {
  beforeEach(() => {
    // Reset Zustand store state by loading an empty template
    useAgentStore.getState().loadTemplate({ id: 'reset', name: 'Reset', nodes: [], connections: [] });
    useAgentStore.getState().setSelectedNodeId(null);
    useAgentStore.getState().setProjectNameInput('');
    useAgentStore.getState().setCurrentSavedProjectName(null);
  });

  it('should manage UI slice actions correctly', () => {
    expect(useAgentStore.getState().selectedNodeId).toBeNull();
    useAgentStore.getState().setSelectedNodeId('node-1234');
    expect(useAgentStore.getState().selectedNodeId).toBe('node-1234');
  });

  it('should manage Editor slice actions correctly (adding/updating/deleting nodes)', () => {
    const store = useAgentStore.getState();
    expect(store.nodes.length).toBe(0);

    store.addNode('prompt');
    const updatedStore = useAgentStore.getState();
    expect(updatedStore.nodes.length).toBe(1);
    expect(updatedStore.nodes[0].type).toBe('prompt');
    expect(updatedStore.selectedNodeId).not.toBeNull();

    const nodeId = updatedStore.nodes[0].id;
    updatedStore.updateNodeFields(nodeId, { template: 'Custom greeting: {topic}' });
    expect(useAgentStore.getState().nodes[0].fields.template).toBe('Custom greeting: {topic}');

    useAgentStore.getState().deleteNode(nodeId);
    expect(useAgentStore.getState().nodes.length).toBe(0);
  });

  it('should manage Pipeline slice actions correctly', () => {
    const store = useAgentStore.getState();
    expect(store.projectNameInput).toBe('');

    store.setProjectNameInput('Super Project');
    expect(useAgentStore.getState().projectNameInput).toBe('Super Project');

    store.saveSnapshot();
    expect(useAgentStore.getState().savedSnapshots.length).toBe(1);
    expect(useAgentStore.getState().savedSnapshots[0].name).toBe('Super Project');
  });
});
