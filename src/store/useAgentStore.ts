import { create } from 'zustand';
import { UISlice, createUISlice } from './uiSlice';
import { EditorSlice, createEditorSlice } from './editorSlice';
import { PipelineSlice, createPipelineSlice } from './pipelineSlice';

export type AgentState = UISlice & EditorSlice & PipelineSlice;

export const useAgentStore = create<AgentState>()((set, get, store) => ({
  ...createUISlice(set, get, store),
  ...createEditorSlice(set, get, store),
  ...createPipelineSlice(set, get, store),
}));
