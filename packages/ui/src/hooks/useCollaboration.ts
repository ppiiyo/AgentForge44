import React, { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { FlowNode, FlowConnection } from '../../../../src/types';

export interface RemoteCursor {
  userId: string;
  userName: string;
  userColor: string;
  x: number;
  y: number;
}

export interface RemoteLock {
  nodeId: string;
  userId: string;
  userName: string;
}

export interface CollabNotification {
  id: string;
  message: string;
  timestamp: Date;
  type: 'info' | 'success' | 'warning';
}

const COLLAB_COLORS = [
  '#f43f5e', // Rose
  '#10b981', // Emerald
  '#3b82f6', // Blue
  '#8b5cf6', // Violet
  '#f59e0b', // Amber
  '#06b6d4', // Cyan
  '#ec4899', // Pink
  '#14b8a6', // Teal
];

const COLLAB_NAMES = [
  'Forge Craft', 'Flow Architect', 'Prompt Guru', 'Agent Smith', 
  'Chain Orchestrator', 'Model Auditor', 'Synthesizer', 'RAG Scout'
];

export function useCollaboration(
  graphId: string,
  nodes: FlowNode[],
  connections: FlowConnection[],
  setNodes: React.Dispatch<React.SetStateAction<FlowNode[]>>,
  setConnections: React.Dispatch<React.SetStateAction<FlowConnection[]>>
) {
  const [userId] = useState(() => {
    const saved = localStorage.getItem('agentforge_user_id');
    if (saved) return saved;
    const uid = `user_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('agentforge_user_id', uid);
    return uid;
  });

  const [userName, setUserName] = useState(() => {
    const saved = localStorage.getItem('agentforge_user_name');
    if (saved) return saved;
    const name = `${COLLAB_NAMES[Math.floor(Math.random() * COLLAB_NAMES.length)]}-${Math.floor(100 + Math.random() * 900)}`;
    localStorage.setItem('agentforge_user_name', name);
    return name;
  });

  const [userColor] = useState(() => {
    const saved = localStorage.getItem('agentforge_user_color');
    if (saved) return saved;
    const color = COLLAB_COLORS[Math.floor(Math.random() * COLLAB_COLORS.length)];
    localStorage.setItem('agentforge_user_color', color);
    return color;
  });

  const [connected, setConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [cursors, setCursors] = useState<Record<string, RemoteCursor>>({});
  const [locks, setLocks] = useState<Record<string, RemoteLock>>({});
  const [notifications, setNotifications] = useState<CollabNotification[]>([]);
  
  const socketRef = useRef<Socket | null>(null);
  const offlineQueueRef = useRef<Array<{ event: string; payload: any }>>([]);

  // Store names / colors locally when user edits them
  const updateUserName = (newName: string) => {
    const clean = newName.trim();
    if (!clean) return;
    setUserName(clean);
    localStorage.setItem('agentforge_user_name', clean);
    
    // Notify server of update
    if (socketRef.current && connected) {
      socketRef.current.emit('room:join', {
        graphId,
        user: { id: userId, name: clean, color: userColor }
      });
    }
  };

  const addNotification = (message: string, type: CollabNotification['type'] = 'info') => {
    const notif: CollabNotification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      message,
      timestamp: new Date(),
      type
    };
    setNotifications(prev => [notif, ...prev].slice(0, 10)); // Keep last 10
  };

  useEffect(() => {
    // Connect to same host as window context
    const socket: Socket = io(window.location.origin, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      addNotification('Connected to collaboration channel', 'success');

      // Join room
      socket.emit('room:join', {
        graphId,
        user: { id: userId, name: userName, color: userColor }
      });

      // Process offline queue events
      const queue = offlineQueueRef.current;
      if (queue.length > 0) {
        queue.forEach(({ event, payload }) => {
          socket.emit(event, payload);
        });
        offlineQueueRef.current = [];
        addNotification(`Synchronized ${queue.length} pending operations`, 'success');
      }
    });

    socket.on('disconnect', () => {
      setConnected(false);
      addNotification('Connection interrupted. Actions will sync on reconnect...', 'warning');
    });

    // Handle incoming broadcast events
    socket.on('presence:update', (users: any[]) => {
      setOnlineUsers(users);
    });

    socket.on('cursor:moved', (cursor: RemoteCursor) => {
      setCursors(prev => ({
        ...prev,
        [cursor.userId]: cursor
      }));
    });

    socket.on('node:moved', ({ nodeId, x, y }: { nodeId: string; x: number; y: number }) => {
      setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, x, y } : n));
    });

    socket.on('node:created', ({ node }: { node: any }) => {
      setNodes(prev => {
        if (prev.some(n => n.id === node.id)) return prev; // Idempotent block duplications
        addNotification(`Component '${node.title}' created by collaborator`);
        return [...prev, node];
      });
    });

    socket.on('node:deleted', ({ nodeId }: { nodeId: string }) => {
      setNodes(prev => {
        const matching = prev.find(n => n.id === nodeId);
        if (!matching) return prev;
        addNotification(`Component '${matching.title}' deleted by collaborator`, 'warning');
        return prev.filter(n => n.id !== nodeId);
      });
      // Filter connections too
      setConnections(prev => prev.filter(c => c.sourceId !== nodeId && c.targetId !== nodeId));
    });

    socket.on('edge:created', ({ connection }: { connection: any }) => {
      setConnections(prev => {
        if (prev.some(c => c.id === connection.id)) return prev; // Guard
        addNotification(`Flow connection established`);
        return [...prev, connection];
      });
    });

    socket.on('edge:deleted', ({ connectionId }: { connectionId: string }) => {
      setConnections(prev => {
        const exists = prev.some(c => c.id === connectionId);
        if (!exists) return prev;
        addNotification(`Flow connection severed`, 'warning');
        return prev.filter(c => c.id !== connectionId);
      });
    });

    socket.on('node:settings:updated', ({ nodeId, fields }: { nodeId: string; fields: any }) => {
      setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, fields: { ...n.fields, ...fields } } : n));
    });

    socket.on('node:lock', ({ nodeId, userId: rUserId, userName: rUserName, locked }: any) => {
      setLocks(prev => {
        const next = { ...prev };
        if (locked) {
          next[nodeId] = { nodeId, userId: rUserId, userName: rUserName };
        } else {
          delete next[nodeId];
        }
        return next;
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [graphId]);

  /**
   * Safe emiter that buffers operations if offline
   */
  const emitCollabEvent = (event: string, payload: any) => {
    if (socketRef.current && connected) {
      socketRef.current.emit(event, payload);
    } else {
      // Buffer in offline retry queue
      offlineQueueRef.current.push({ event, payload });
      // Keep queue in reasonable limits
      if (offlineQueueRef.current.length > 50) {
        offlineQueueRef.current.shift();
      }
    }
  };

  // Client triggers
  const broadcastNodeMoved = (nodeId: string, x: number, y: number) => {
    emitCollabEvent('node:moved', { nodeId, x, y });
  };

  const broadcastNodeCreated = (node: FlowNode) => {
    emitCollabEvent('node:created', { node });
  };

  const broadcastNodeDeleted = (nodeId: string) => {
    emitCollabEvent('node:deleted', { nodeId });
  };

  const broadcastEdgeCreated = (connection: FlowConnection) => {
    emitCollabEvent('edge:created', { connection });
  };

  const broadcastEdgeDeleted = (connectionId: string) => {
    emitCollabEvent('edge:deleted', { connectionId });
  };

  const broadcastNodeSettingsUpdated = (nodeId: string, fields: any) => {
    emitCollabEvent('node:settings:updated', { nodeId, fields });
  };

  const broadcastNodeLock = (nodeId: string, locked: boolean) => {
    emitCollabEvent('node:lock', { nodeId, locked });
  };

  const broadcastCursorMoved = (x: number, y: number) => {
    emitCollabEvent('cursor:moved', { x, y });
  };

  return {
    userId,
    userName,
    userColor,
    connected,
    onlineUsers,
    cursors,
    locks,
    notifications,
    updateUserName,
    broadcastNodeMoved,
    broadcastNodeCreated,
    broadcastNodeDeleted,
    broadcastEdgeCreated,
    broadcastEdgeDeleted,
    broadcastNodeSettingsUpdated,
    broadcastNodeLock,
    broadcastCursorMoved
  };
}
