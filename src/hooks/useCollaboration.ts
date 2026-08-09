import React, { useState, useRef, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { FlowNode, FlowConnection } from '../types';
import { safeJsonStringify } from '../utils/safe-json';

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

export function useCollaboration(
  _graphId: string,
  _nodes: FlowNode[],
  _connections: FlowConnection[],
  _setNodes: React.Dispatch<React.SetStateAction<FlowNode[]>>,
  _setConnections: React.Dispatch<React.SetStateAction<FlowConnection[]>>
) {
  const [userId] = useState("local-user");
  const [userName, setUserName] = useState(() => {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem("kostromai44_user_name") || "Local Architect";
    }
    return "Local Architect";
  });
  const [userColor, setUserColor] = useState(() => {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem("kostromai44_user_color") || "#38bdf8";
    }
    return "#38bdf8";
  });
  const [connected] = useState(true);
  const [onlineUsers] = useState(() => [
    { 
      id: "local-user", 
      name: typeof localStorage !== 'undefined' ? (localStorage.getItem("kostromai44_user_name") || "Local Architect") : "Local Architect", 
      color: typeof localStorage !== 'undefined' ? (localStorage.getItem("kostromai44_user_color") || "#38bdf8") : "#38bdf8" 
    }
  ]);
  const [cursors] = useState<Record<string, RemoteCursor>>({});
  const [locks] = useState<Record<string, RemoteLock>>({});
  const [notifications] = useState<CollabNotification[]>([]);
  const locksRef = useRef<Record<string, RemoteLock>>({});
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let socket: Socket | null = null;
    try {
      socket = io({
        autoConnect: true,
        transports: ['websocket', 'polling']
      });
      socketRef.current = socket;

      const graphId = _graphId || 'default-workspace';
      socket.emit('room:join', {
        graphId,
        user: { id: userId, name: userName, color: userColor }
      });

      socket.on('node:settings:updated', ({ nodeId, fields }: { nodeId: string; fields: any }) => {
        _setNodes((prev) =>
          prev.map((n) =>
            n.id === nodeId
              ? { ...n, fields: { ...n.fields, ...fields } }
              : n
          )
        );
      });

      socket.on('node:created', ({ node }: { node: FlowNode }) => {
        if (node) {
          _setNodes((prev) => (prev.some((n) => n.id === node.id) ? prev : [...prev, node]));
        }
      });

      socket.on('node:deleted', ({ nodeId }: { nodeId: string }) => {
        if (nodeId) {
          _setNodes((prev) => prev.filter((n) => n.id !== nodeId));
        }
      });

      socket.on('edge:created', ({ connection }: { connection: FlowConnection }) => {
        if (connection) {
          _setConnections((prev) => (prev.some((c) => c.id === connection.id) ? prev : [...prev, connection]));
        }
      });

      socket.on('edge:deleted', ({ connectionId }: { connectionId: string }) => {
        if (connectionId) {
          _setConnections((prev) => prev.filter((c) => c.id !== connectionId));
        }
      });
    } catch (e) {
      console.warn('Socket.io initialization warning:', e);
    }

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel('kostromai44_collab_channel');
    } catch (e) {}

    const handleMessage = (data: any) => {
      if (!data || typeof data !== 'object') return;
      
      switch (data.type) {
        case 'NODE_SETTINGS_UPDATED': {
          const { nodeId, fields } = data;
          _setNodes((prev) =>
            prev.map((n) =>
              n.id === nodeId
                ? {
                    ...n,
                    fields: { ...n.fields, ...fields }
                  }
                : n
            )
          );
          break;
        }
        case 'NODE_CREATED': {
          if (data.node) {
            _setNodes((prev) => prev.some(n => n.id === data.node.id) ? prev : [...prev, data.node]);
          }
          break;
        }
        case 'NODE_DELETED': {
          if (data.nodeId) {
            _setNodes((prev) => prev.filter(n => n.id !== data.nodeId));
          }
          break;
        }
        case 'EDGE_CREATED': {
          if (data.connection) {
            _setConnections((prev) => prev.some(c => c.id === data.connection.id) ? prev : [...prev, data.connection]);
          }
          break;
        }
        case 'EDGE_DELETED': {
          if (data.connectionId) {
            _setConnections((prev) => prev.filter(c => c.id !== data.connectionId));
          }
          break;
        }
      }
    };

    if (channel) {
      channel.onmessage = (event) => handleMessage(event.data);
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'kostromai44_collab_sync' && e.newValue) {
        try {
          const payload = JSON.parse(e.newValue);
          handleMessage(payload);
        } catch (_) {}
      }
    };

    window.addEventListener('storage', handleStorage);

    return () => {
      if (socket) {
        socket.disconnect();
      }
      if (channel) channel.close();
      window.removeEventListener('storage', handleStorage);
    };
  }, [_graphId, _setNodes, _setConnections, userId, userName, userColor]);

  const dispatchBroadcast = (payload: any) => {
    if (socketRef.current && socketRef.current.connected) {
      if (payload.type === 'NODE_SETTINGS_UPDATED') {
        socketRef.current.emit('node:settings:updated', { nodeId: payload.nodeId, fields: payload.fields });
      } else if (payload.type === 'NODE_CREATED') {
        socketRef.current.emit('node:created', { node: payload.node });
      } else if (payload.type === 'NODE_DELETED') {
        socketRef.current.emit('node:deleted', { nodeId: payload.nodeId });
      } else if (payload.type === 'EDGE_CREATED') {
        socketRef.current.emit('edge:created', { connection: payload.connection });
      } else if (payload.type === 'EDGE_DELETED') {
        socketRef.current.emit('edge:deleted', { connectionId: payload.connectionId });
      }
    }

    try {
      const channel = new BroadcastChannel('kostromai44_collab_channel');
      channel.postMessage(payload);
      channel.close();
    } catch (e) {}
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('kostromai44_collab_sync', safeJsonStringify({ ...payload, _t: Date.now() }));
      } catch (_) {}
    }
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
    updateUserName: (name: string) => {
      const nextName = name || "Local Architect";
      setUserName(nextName);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem("kostromai44_user_name", nextName);
      }
    },
    updateUserColor: (color: string) => {
      const nextColor = color || "#38bdf8";
      setUserColor(nextColor);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem("kostromai44_user_color", nextColor);
      }
    },
    addNotification: () => {},
    clearNotifications: () => {},
    broadcastCursorMoved: (_x: number, _y: number) => {},
    broadcastNodeMoved: (_nodeId: string, _x: number, _y: number) => {},
    broadcastNodeCreated: (node: FlowNode) => dispatchBroadcast({ type: 'NODE_CREATED', node }),
    broadcastNodeDeleted: (nodeId: string) => dispatchBroadcast({ type: 'NODE_DELETED', nodeId }),
    broadcastEdgeCreated: (connection: FlowConnection) => dispatchBroadcast({ type: 'EDGE_CREATED', connection }),
    broadcastEdgeDeleted: (connectionId: string) => dispatchBroadcast({ type: 'EDGE_DELETED', connectionId }),
    broadcastNodeSettingsUpdated: (nodeId: string, fields: any) => dispatchBroadcast({ type: 'NODE_SETTINGS_UPDATED', nodeId, fields }),
    broadcastNodeLock: (_nodeId: string, _isLocked: boolean) => {},
    acquireLock: () => true,
    releaseLock: () => {},
    locksRef,
  };
}
