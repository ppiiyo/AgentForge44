import { describe, it, expect, vi } from 'vitest';
import Database from 'better-sqlite3';
import path from 'path';
import request from 'supertest';
import { app } from '../../server.js';
import { EventEmitter } from 'events';
import { Server as HTTPServer } from 'http';
import { CollaborationServer, activeRooms } from '../api/collaboration.js';

describe('=== Phase 2: Architectural Stability and Performance Suite ===', () => {

  describe('1. SQLite Concurrency (WAL and Busy Timeout)', () => {
    it('should have journal_mode set to wal and busy_timeout configured appropriately', () => {
      const DB_PATH = path.join(process.cwd(), 'agentforge.db');
      const db = new Database(DB_PATH);
      
      const journalMode = db.pragma('journal_mode', { simple: true });
      const busyTimeout = db.pragma('busy_timeout', { simple: true });

      expect(journalMode).toBe('wal');
      // busy_timeout should be 5000ms as configured
      expect(Number(busyTimeout)).toBe(5000);
      
      db.close();
    });
  });

  describe('2. Express Request Payload Limits', () => {
    it('should accept body sizes larger than the default 100kb without throwing 413 Payload Too Large', async () => {
      // Create a large body with a size > 150KB
      const largeField = 'a'.repeat(200000); // 200 KB
      
      // Post to a public check/route or authorized route
      const res = await request(app)
        .post('/api/runs')
        .set('Authorization', 'Bearer forge_production_admin_token')
        .send({
          nodes: [
            {
              id: 'input-1',
              type: 'input',
              title: largeField, // oversized title
              x: 0, y: 0,
              fields: {}
            }
          ],
          connections: []
        });

      // We should not receive a 413 Payload Too Large status
      expect(res.status).not.toBe(413);
    });
  });

  describe('3. Socket.io Memory Leak Protections', () => {
    it('should successfully prune all bound event listeners upon client disconnections', () => {
      // Setup mock HTTPServer and CollaborationServer instance
      const dummyServer = new HTTPServer();
      const colNode = new CollaborationServer(dummyServer);

      // Create a Mock Socket exhibiting Node's EventEmitter
      const mockSocket = new EventEmitter() as any;
      mockSocket.id = 'session-agent-42';
      mockSocket.join = vi.fn();
      mockSocket.leave = vi.fn();
      mockSocket.to = vi.fn().mockReturnValue({
        emit: vi.fn()
      });

      // Emulate connection lifecycle hook inside socket.io server
      const connectionCallback = (colNode as any).io.listeners('connection')[0] || (colNode as any).io.listeners('connect')[0];
      expect(connectionCallback).toBeDefined();

      // Trigger the socket connection callback
      connectionCallback(mockSocket);

      // Assert listeners like room:join, cursor:moved, disconnect are bound on the socket
      expect(mockSocket.listenerCount('room:join')).toBeGreaterThan(0);
      expect(mockSocket.listenerCount('disconnect')).toBeGreaterThan(0);

      // Emulate a join-room event to set currentUser state
      mockSocket.emit('room:join', {
        graphId: 'graph-x',
        user: { id: 'user-alpha', name: 'Alpha Agent', color: '#ff0000' }
      });

      expect(activeRooms['graph-x']).toBeDefined();
      expect(activeRooms['graph-x']['user-alpha']).toBeDefined();

      // Now trigger the 'disconnect' event on the socket
      mockSocket.emit('disconnect');

      // Room state is deleted if no active users are left
      expect(activeRooms['graph-x']).toBeUndefined();

      // Ensure that ALL custom event listeners are completely stripped off the socket instance 
      // preventing reference retaining leaks
      expect(mockSocket.listenerCount('room:join')).toBe(0);
      expect(mockSocket.listenerCount('cursor:moved')).toBe(0);
      expect(mockSocket.listenerCount('node:lock')).toBe(0);
      expect(mockSocket.listenerCount('disconnect')).toBe(0);

      // Clean up server resources
      dummyServer.close();
      (colNode as any).io.close();
    });
  });

});
