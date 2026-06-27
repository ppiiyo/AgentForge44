import React from 'react';
import { FlowNode, FlowConnection, StepLog } from '../types';
import posthog from 'posthog-js';
import * as Sentry from '@sentry/react';

interface UsePipelineExecutionProps {
  nodes: FlowNode[];
  connections: FlowConnection[];
  setNodes: React.Dispatch<React.SetStateAction<FlowNode[]>>;
  isRunning: boolean;
  setIsRunning: React.Dispatch<React.SetStateAction<boolean>>;
  runLogs: StepLog[];
  setRunLogs: React.Dispatch<React.SetStateAction<StepLog[]>>;
  nodeExecutionStatuses: Record<string, 'idle' | 'running' | 'completed' | 'failed'>;
  setNodeExecutionStatuses: React.Dispatch<React.SetStateAction<Record<string, 'idle' | 'running' | 'completed' | 'failed'>>>;
  finalResult: string;
  setFinalResult: React.Dispatch<React.SetStateAction<string>>;
  errorText: string | null;
  setErrorText: React.Dispatch<React.SetStateAction<string | null>>;
  totalDuration: number;
  setTotalDuration: React.Dispatch<React.SetStateAction<number>>;
  setActiveTab: React.Dispatch<React.SetStateAction<any>>;
  isDryRunningNode: string | null;
  setIsDryRunningNode: React.Dispatch<React.SetStateAction<string | null>>;
  dryRunOutput: Record<string, string>;
  setDryRunOutput: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}

export function usePipelineExecution({
  nodes,
  connections,
  setNodes,
  isRunning,
  setIsRunning,
  runLogs,
  setRunLogs,
  nodeExecutionStatuses,
  setNodeExecutionStatuses,
  finalResult,
  setFinalResult,
  errorText,
  setErrorText,
  totalDuration,
  setTotalDuration,
  setActiveTab,
  isDryRunningNode,
  setIsDryRunningNode,
  dryRunOutput,
  setDryRunOutput,
}: UsePipelineExecutionProps) {

  // Trace animator
  const animateNodeProgress = async (logsList: StepLog[]) => {
    const cleanStatuses: Record<string, 'idle' | 'running' | 'completed' | 'failed'> = {};
    nodes.forEach(n => { cleanStatuses[n.id] = 'idle'; });
    setNodeExecutionStatuses(cleanStatuses);

    const logsAccumulator: StepLog[] = [];
    for (const logItem of logsList) {
      setNodeExecutionStatuses(prev => ({ ...prev, [logItem.nodeId]: 'running' }));
      
      // Delay to simulate visual signals propagation
      await new Promise(resolve => setTimeout(resolve, 750));

      const finalStatus = logItem.status === 'completed' ? 'completed' : 'failed';
      setNodeExecutionStatuses(prev => ({ ...prev, [logItem.nodeId]: finalStatus }));

      logsAccumulator.push(logItem);
      setRunLogs([...logsAccumulator]);
    }
  };

  // Run a single node in isolated dry-run mode
  const handleDryRunNode = async (nodeId: string) => {
    if (isDryRunningNode) return;
    setIsDryRunningNode(nodeId);
    setDryRunOutput(prev => ({ ...prev, [nodeId]: "Initializing isolated dry-run engine..." }));

    try {
      const response = await fetch('/api/run-pipeline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nodes: nodes,
          connections: connections
        }),
      });

      const data = await response.json();
      
      if (!response.ok || data.error) {
        throw new Error(data.error || "Failed to execute dry-run pipeline.");
      }

      const logs: StepLog[] = data.logs || [];
      const nodeLog = logs.find(l => l.nodeId === nodeId);

      if (nodeLog) {
        const outputText = nodeLog.status === 'completed' 
          ? (nodeLog.output || "Completed with no text output.") 
          : `Execution failed:\n${nodeLog.output || "Unknown error"}`;
        setDryRunOutput(prev => ({ ...prev, [nodeId]: outputText }));
      } else {
        setDryRunOutput(prev => ({ 
          ...prev, 
          [nodeId]: "Node was not executed. Ensure it is connected and input variables are populated correctly." 
        }));
      }
    } catch (err: any) {
      setDryRunOutput(prev => ({ 
        ...prev, 
        [nodeId]: `Dry-run failed:\n${err.message || String(err)}` 
      }));
    } finally {
      setIsDryRunningNode(null);
    }
  };

  // Execute actual Node Pipeline
  const handleRunPipeline = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setRunLogs([]);
    setNodeExecutionStatuses({});
    setFinalResult("");
    setErrorText(null);
    setActiveTab('logs');

    // Telemetry trace start
    posthog.capture('pipeline_run_started', {
      node_count: nodes.length,
      connection_count: connections.length
    });

    try {
      const response = await fetch('/api/run-pipeline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nodes: nodes,
          connections: connections
        }),
      });

      const data = await response.json();
      
      if (!response.ok || data.error) {
        const errorMsg = data.error || "Failed to execute visual agent pipeline.";
        const errObj = new Error(errorMsg);
        Sentry.captureException(errObj);
        throw errObj;
      }

      setFinalResult(data.finalResult || "");
      setTotalDuration(data.totalDuration || 0);
      
      posthog.capture('pipeline_run_success', {
        duration: data.totalDuration || 0,
        node_count: nodes.length
      });

      // Play high-fidelity sequential execution tracer
      await animateNodeProgress(data.logs || []);
    } catch (err: any) {
      console.error(err);
      setErrorText(err.message || String(err));
      posthog.capture('pipeline_run_failed', {
        error: err.message || String(err)
      });
      Sentry.captureException(err);
    } finally {
      setIsRunning(false);
    }
  };

  // Auto Self-Heal to gemini-3.1-flash-lite
  const handleAutoSelfHealAndRun = async () => {
    if (isRunning) return;
    const updatedNodes = nodes.map(n => {
      if (n.type === 'gemini') {
        return {
          ...n,
          fields: {
            ...n.fields,
            model: 'gemini-3.1-flash-lite'
          }
        };
      }
      return n;
    });
    setNodes(updatedNodes);
    setErrorText(null);
    setIsRunning(true);
    setRunLogs([]);
    setNodeExecutionStatuses({});
    setFinalResult("");
    setActiveTab('logs');

    try {
      const response = await fetch('/api/run-pipeline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nodes: updatedNodes,
          connections: connections
        }),
      });

      const data = await response.json();
      
      if (!response.ok || data.error) {
        const errorMsg = data.error || "Self-heal visual agent pipeline execution failed.";
        const errObj = new Error(errorMsg);
        Sentry.captureException(errObj);
        throw errObj;
      }

      setFinalResult(data.finalResult || "");
      setTotalDuration(data.totalDuration || 0);
      
      posthog.capture('pipeline_self_heal_success', {
        duration: data.totalDuration || 0,
        node_count: updatedNodes.length
      });

      await animateNodeProgress(data.logs || []);
    } catch (err: any) {
      console.error(err);
      setErrorText(err.message || String(err));
      Sentry.captureException(err);
    } finally {
      setIsRunning(false);
    }
  };

  return {
    handleDryRunNode,
    handleRunPipeline,
    handleAutoSelfHealAndRun,
    animateNodeProgress
  };
}
