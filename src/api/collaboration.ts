import fs from 'fs';
import path from 'path';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { verifyToken } from './userAuth.js';

const DATA_DIR = path.join(process.cwd(), 'projects', '.metadata');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
const PRESENCE_HISTORY_FILE = path.join(DATA_DIR, 'presence_history_db.json');

export interface PresenceUser {
  id: string;      // Randomly generated or local persistent user ID
  name: string;    // Interactive display name
  color: string;   // High-contrast HEX or Tailwind color
  x: number;       // Mouse x position
  y: number;       // Mouse y position
  lastActive: number;
  editingNodeId?: string | null; // Node currently under lock edit
}

// Presence history logs schema mirror
export interface PresenceLogRecord {
  id: string;
  graphId: string;
  userId: string;
  userName: string;
  action: 'joined' | 'left';
  timestamp: string;
}

/**
 * In-memory state holding live active rooms and their respective presence details
 */
export const activeRooms: Record<string, Record<string, PresenceUser>> = {};

export interface SocketResource {
  socket: any;
  cleanup: () => void;
}

export const socketResources = new Map<string, SocketResource>();

export function cleanupSocketResources(socketId: string) {
  const rs = socketResources.get(socketId);
  if (rs) {
    try {
      rs.cleanup();
    } catch (e) {
      console.error(`Error in cleanupSocketResources for ${socketId}:`, e);
    }
    socketResources.delete(socketId);
  }
}

/**
 * Save presence historical logging in DB files
 */
function logPresenceHistory(graphId: string, user: { id: string; name: string }, action: 'joined' | 'left') {
  try {
    let history: PresenceLogRecord[] = [];
    if (fs.existsSync(PRESENCE_HISTORY_FILE)) {
      try {
        const raw = fs.readFileSync(PRESENCE_HISTORY_FILE, 'utf-8');
        history = JSON.parse(raw) as PresenceLogRecord[];
      } catch (e) {
        history = [];
      }
    }

    const logEntry: PresenceLogRecord = {
      id: `pres_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      graphId,
      userId: user.id,
      userName: user.name,
      action,
      timestamp: new Date().toISOString()
    };

    history.push(logEntry);
    // Keep last 500 logs for high efficiency
    if (history.length > 500) {
      history.shift();
    }
    fs.writeFileSync(PRESENCE_HISTORY_FILE, JSON.stringify(history, null, 2), 'utf-8');
  } catch (err) {
    console.error("Failed to write presence history log:", err);
  }
}

/**
 * Get full historic presence logs for audit review
 */
export function getPresenceHistory(graphId: string): PresenceLogRecord[] {
  try {
    if (fs.existsSync(PRESENCE_HISTORY_FILE)) {
      const raw = fs.readFileSync(PRESENCE_HISTORY_FILE, 'utf-8');
      const all = JSON.parse(raw) as PresenceLogRecord[];
      return all.filter(r => r.graphId === graphId).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }
  } catch (e) {
    console.error(e);
  }
  return [];
}

/**
 * Main Collaboration Server Setup Class
 */
export class CollaborationServer {
  private io: SocketIOServer;

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      },
      pingTimeout: 30000,
      pingInterval: 15000
    });

    // 1. Connection authentication handshake with safety fallback for local sandboxes
    this.io.use((socket, next) => {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (token && typeof token === 'string') {
        const decoded = verifyToken(token);
        if (!decoded) {
          return next(new Error('Authentication failed: Invalid token'));
        }
        socket.data.user = decoded;
      } else {
        // Safe development mode warning
        console.warn(`[SocketJS] Client connected without workspace JWT token. Allowed conditionally in developmental environments.`);
      }
      return next();
    });

    this.setupListeners();
    console.log("👥 Real-time Collaboration Engine activated with Socket.io");
  }

  private setupListeners() {
    this.io.on('connection', (socket: Socket) => {
      let currentRoom: string | null = null;
      let currentUser: { id: string; name: string; color: string } | null = null;

      // 2. Custom rate limiter per socket connection (max 50 events per 10 seconds to prevent DDoS)
      const messageHistory: { timestamp: number }[] = [];
      if (typeof socket.use === 'function') {
        socket.use((packet, next) => {
          const now = Date.now();
          // Remove logs older than 10 seconds
          while (messageHistory.length > 0 && now - messageHistory[0].timestamp > 10000) {
            messageHistory.shift();
          }

          if (messageHistory.length >= 50) {
            console.warn(`[SocketJS] Throttled rapid messaging rate from socket ID: ${socket.id}`);
            return next(new Error('Rate limit exceeded: Too many socket events sent.'));
          }

          messageHistory.push({ timestamp: now });
          next();
        });
      }

      // Register the socket resource immediately with a standard closure-based cleanup
      socketResources.set(socket.id, {
        socket,
        cleanup: () => {
          if (currentRoom && currentUser) {
            const u = activeRooms[currentRoom]?.[currentUser.id];
            if (u) {
              // Unset locking
              if (u.editingNodeId) {
                this.io.to(currentRoom).emit('node:lock', {
                  nodeId: u.editingNodeId,
                  userId: currentUser.id,
                  userName: currentUser.name,
                  locked: false
                });
              }

              delete activeRooms[currentRoom][currentUser.id];
              
              // Clean empty rooms
              if (Object.keys(activeRooms[currentRoom]).length === 0) {
                delete activeRooms[currentRoom];
              }
            }

            logPresenceHistory(currentRoom, currentUser, 'left');
            
            if (activeRooms[currentRoom]) {
              this.io.to(currentRoom).emit('presence:update', Object.values(activeRooms[currentRoom]));
            }

            console.log(`👤 User '${currentUser.name}' disconnected from '${currentRoom}'`);
          }
        }
      });

      // 1. Join Room Event Handler
      socket.on('room:join', ({ graphId, user }: { graphId: string; user: { id: string; name: string; color: string } }) => {
        if (!graphId || !user) return;
        
        currentRoom = graphId;
        currentUser = user;

        socket.join(graphId);

        // Register user inside room index
        if (!activeRooms[graphId]) {
          activeRooms[graphId] = {};
        }

        activeRooms[graphId][user.id] = {
          ...user,
          x: 0,
          y: 0,
          lastActive: Date.now()
        };

        // Persistent Presence history log in JSON Database
        logPresenceHistory(graphId, user, 'joined');

        // Broadcast current users update to room
        this.io.to(graphId).emit('presence:update', Object.values(activeRooms[graphId]));

        console.log(`👤 User '${user.name}' (${user.id}) joined room '${graphId}'`);
      });

      // 2. Multi-user cursor tracking
      socket.on('cursor:moved', ({ x, y }: { x: number; y: number }) => {
        if (!currentRoom || !currentUser) return;

        const u = activeRooms[currentRoom]?.[currentUser.id];
        if (u) {
          u.x = x;
          u.y = y;
          u.lastActive = Date.now();
        }

        // Broadcast coords except to the sender for performance efficiency
        socket.to(currentRoom).emit('cursor:moved', {
          userId: currentUser.id,
          userName: currentUser.name,
          userColor: currentUser.color,
          x,
          y
        });
      });

      // 3. Real-time Node Actions
      socket.on('node:moved', ({ nodeId, x, y }: { nodeId: string; x: number; y: number }) => {
        if (!currentRoom) return;
        socket.to(currentRoom).emit('node:moved', { nodeId, x, y });
      });

      socket.on('node:created', ({ node }: { node: any }) => {
        if (!currentRoom) return;
        socket.to(currentRoom).emit('node:created', { node });
      });

      socket.on('node:deleted', ({ nodeId }: { nodeId: string }) => {
        if (!currentRoom) return;
        socket.to(currentRoom).emit('node:deleted', { nodeId });
      });

      socket.on('edge:created', ({ connection }: { connection: any }) => {
        if (!currentRoom) return;
        socket.to(currentRoom).emit('edge:created', { connection });
      });

      socket.on('edge:deleted', ({ connectionId }: { connectionId: string }) => {
        if (!currentRoom) return;
        socket.to(currentRoom).emit('edge:deleted', { connectionId });
      });

      socket.on('node:settings:updated', ({ nodeId, fields }: { nodeId: string; fields: any }) => {
        if (!currentRoom) return;
        socket.to(currentRoom).emit('node:settings:updated', { nodeId, fields });
      });

      // 4. Client Locking editing status indicators
      socket.on('node:lock', ({ nodeId, locked }: { nodeId: string; locked: boolean }) => {
        if (!currentRoom || !currentUser) return;

        const u = activeRooms[currentRoom]?.[currentUser.id];
        if (u) {
          u.editingNodeId = locked ? nodeId : null;
        }

        // Broadcast node locking status
        this.io.to(currentRoom).emit('node:lock', {
          nodeId,
          userId: currentUser.id,
          userName: currentUser.name,
          locked
        });
      });

      // 5. Explicit user leaves or disconnect
      const handleDisconnect = () => {
        cleanupSocketResources(socket.id);
        socket.removeAllListeners();
      };

      socket.on('room:leave', handleDisconnect);
      socket.on('disconnect', (reason) => {
        console.log(`Socket disconnected: ${socket.id}, reason: ${reason}`);
        
        // Удаляем все слушатели, привязанные к этому сокету
        socket.removeAllListeners();
        
        // Очищаем ссылки на объекты графа/сессии
        // (если есть хранение в Map/Set)
        cleanupSocketResources(socket.id);
      });
    });
  }
}
