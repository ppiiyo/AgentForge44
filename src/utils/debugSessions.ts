import { StepLog } from '../types.js';

export interface DebugSnapshot {
  stepIndex: number;
  nodeId: string;
  nodeTitle: string;
  inputsState: string;
  outputsState: string;
  duration: number;
  variableSnapshots: Record<string, any>;
  timestamp: Date;
}

export interface DebugSession {
  id: string;
  graphId: string;
  graphName: string;
  timestamp: Date;
  snapshots: DebugSnapshot[];
  finalOutput: string;
}

const debugSessions = new Map<string, DebugSession>();

export function recordDebugSession(
  graphId: string,
  graphName: string,
  logs: StepLog[],
  finalOutput: string
): DebugSession {
  const sessionId = `debug_${Date.now()}`;
  
  // Re-map sequential steps into granular time-travel checkpoints
  const snapshots: DebugSnapshot[] = logs.map((log, idx) => {
    // Generate active simulated variable state snapshots sequentially
    const variablesAccum: Record<string, any> = {};
    for (let c = 0; c <= idx; c++) {
      variablesAccum[logs[c].nodeId] = logs[c].output;
    }

    return {
      stepIndex: idx,
      nodeId: log.nodeId,
      nodeTitle: log.nodeTitle,
      inputsState: log.input,
      outputsState: log.output,
      duration: log.duration,
      variableSnapshots: variablesAccum,
      timestamp: new Date()
    };
  });

  const session: DebugSession = {
    id: sessionId,
    graphId,
    graphName,
    timestamp: new Date(),
    snapshots,
    finalOutput
  };

  debugSessions.set(sessionId, session);
  
  // Keep the history capped to 15 sessions
  if (debugSessions.size > 15) {
    const oldestKey = debugSessions.keys().next().value;
    if (oldestKey) {
      debugSessions.delete(oldestKey);
    }
  }

  return session;
}

export function getDebugSession(id: string): DebugSession | undefined {
  return debugSessions.get(id);
}

export function listDebugSessions(): DebugSession[] {
  return Array.from(debugSessions.values()).sort((a,b) => b.timestamp.getTime() - a.timestamp.getTime());
}

export function clearDebugSessions() {
  debugSessions.clear();
}

export function updateDebugSnapshot(
  sessionId: string,
  stepIndex: number,
  inputsState: string,
  outputsState: string
): boolean {
  const session = debugSessions.get(sessionId);
  if (!session) return false;
  
  const snapshot = session.snapshots.find(s => s.stepIndex === stepIndex);
  if (!snapshot) return false;
  
  snapshot.inputsState = inputsState;
  snapshot.outputsState = outputsState;
  
  // Propagate updated output to subsequent step snapshots
  for (let idx = stepIndex; idx < session.snapshots.length; idx++) {
    if (session.snapshots[idx].variableSnapshots) {
      session.snapshots[idx].variableSnapshots[snapshot.nodeId] = outputsState;
    }
  }
  
  return true;
}

