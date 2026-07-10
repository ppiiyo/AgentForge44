import React, { useState, useRef } from 'react';
import { FlowNode, FlowConnection } from '../types';

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
    broadcastNodeCreated: (_node: FlowNode) => {},
    broadcastNodeDeleted: (_nodeId: string) => {},
    broadcastEdgeCreated: (_conn: FlowConnection) => {},
    broadcastEdgeDeleted: (_connId: string) => {},
    broadcastNodeSettingsUpdated: (_nodeId: string, _fields: any) => {},
    broadcastNodeLock: (_nodeId: string, _isLocked: boolean) => {},
    acquireLock: () => true,
    releaseLock: () => {},
    locksRef,
  };
}
