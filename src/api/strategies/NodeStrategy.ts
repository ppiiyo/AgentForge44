import { GoogleGenAI } from "@google/genai";
import { FlowConnection, StepLog } from '../../types.js';

export interface ExecutionContext {
  ai: GoogleGenAI;
  apiKey: string;
  globalVariables: Record<string, string>;
  nodeOutputs: Record<string, any>;
  activeValueReference: { value: any };
  stepStart: number;
  localValue: any;
  connections: FlowConnection[];
  logs: StepLog[];
  iterationsCount: Record<string, number>;
}

export interface NodeExecutionStrategy {
  execute(node: any, context: ExecutionContext): Promise<void>;
}
