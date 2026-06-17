import { describe, it, expect, vi } from 'vitest';
import { EventEmitter } from 'events';
import { Server as HTTPServer } from 'http';
import { CollaborationServer, socketResources, activeRooms } from '../api/collaboration.js';

describe('=== Phase 4: Socket.io Memory Leak Prevention Suite ===', () => {
  it('should successfully mock connect, track, and disconnect 10 sockets', () => {
    const dummyServer = new HTTPServer();
    const colServer = new CollaborationServer(dummyServer);

    const connectionCallback = (colServer as any).io.listeners('connection')[0] || (colServer as any).io.listeners('connect')[0];
    expect(connectionCallback).toBeDefined();

    const sockets: any[] = [];
    for (let i = 0; i < 10; i++) {
      const mockSocket = new EventEmitter() as any;
      mockSocket.id = `socket-mock-${i}`;
      mockSocket.join = vi.fn();
      mockSocket.leave = vi.fn();
      mockSocket.to = vi.fn().mockReturnValue({ emit: vi.fn() });

      connectionCallback(mockSocket);
      sockets.push(mockSocket);
    }

    // Verify 10 sockets registered in resources
    expect(socketResources.size).toBe(10);
    for (const socket of sockets) {
      expect(socket.listenerCount('disconnect')).toBeGreaterThan(0);
    }

    // Now disconnect all sockets
    for (const socket of sockets) {
      socket.emit('disconnect', 'transport close');
    }

    // Verify all cleaned up in resources Map
    expect(socketResources.size).toBe(0);

    // Verify listeners count is 0
    for (const socket of sockets) {
      expect(socket.listenerCount('disconnect')).toBe(0);
      expect(socket.listenerCount('room:join')).toBe(0);
    }

    dummyServer.close();
    (colServer as any).io.close();
  });

  it('should verify that socket.listenerCount() === 0 after disconnect', () => {
    const dummyServer = new HTTPServer();
    const colServer = new CollaborationServer(dummyServer);

    const connectionCallback = (colServer as any).io.listeners('connection')[0] || (colServer as any).io.listeners('connect')[0];
    const mockSocket = new EventEmitter() as any;
    mockSocket.id = `socket-single-leak`;
    mockSocket.join = vi.fn();
    mockSocket.leave = vi.fn();
    mockSocket.to = vi.fn().mockReturnValue({ emit: vi.fn() });

    connectionCallback(mockSocket);

    expect(mockSocket.listenerCount('disconnect')).toBeGreaterThan(0);
    expect(socketResources.has(mockSocket.id)).toBe(true);

    mockSocket.emit('disconnect', 'client leave');

    expect(mockSocket.listenerCount('disconnect')).toBe(0);
    expect(mockSocket.listenerCount('room:join')).toBe(0);
    expect(socketResources.has(mockSocket.id)).toBe(false);

    dummyServer.close();
    (colServer as any).io.close();
  });

  it('should verify that mock memory resources do not grow after 100 connect/disconnect cycles', () => {
    const dummyServer = new HTTPServer();
    const colServer = new CollaborationServer(dummyServer);

    const connectionCallback = (colServer as any).io.listeners('connection')[0] || (colServer as any).io.listeners('connect')[0];

    const getHeapStats = () => {
      return {
        registrySize: socketResources.size,
        activeRoomsCount: Object.keys(activeRooms).length
      };
    };

    const initialStats = getHeapStats();
    expect(initialStats.registrySize).toBe(0);

    // Run 100 connection/disconnection cycles
    for (let i = 0; i < 100; i++) {
      const mockSocket = new EventEmitter() as any;
      mockSocket.id = `cycle-socket-${i}`;
      mockSocket.join = vi.fn();
      mockSocket.leave = vi.fn();
      mockSocket.to = vi.fn().mockReturnValue({ emit: vi.fn() });

      connectionCallback(mockSocket);
      
      // Simulate activity
      mockSocket.emit('room:join', {
        graphId: `leak-test-graph-${i % 5}`,
        user: { id: `user-${i}`, name: 'AI Client', color: '#00ff00' }
      });

      // Disconnect
      mockSocket.emit('disconnect', 'cycle complete');
    }

    const finalStats = getHeapStats();
    expect(finalStats.registrySize).toBe(0); // must be completely reset to initial
    expect(finalStats.activeRoomsCount).toBe(0); // should be completely swept clean
    
    // Check that there are no leak traces in our Maps / Objects
    expect(socketResources.size).toBe(0);

    dummyServer.close();
    (colServer as any).io.close();
  });
});
