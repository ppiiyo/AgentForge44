import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../server.js';
import { signToken } from '../api/userAuth.js';

describe('=== Phase 1: Authentication & Authorization Guard Enforcement ===', () => {
  const tokenUserA = signToken({ id: 'user-a', email: 'user-a@test.com', role: 'editor' });
  const tokenUserB = signToken({ id: 'user-b', email: 'user-b@test.com', role: 'editor' });

  it('1. should block requests to POST /api/projects without a valid authorization token with 401', async () => {
    const res = await request(app)
      .post('/api/projects')
      .send({
        id: 'test-project-1',
        name: 'Test Project 1',
        nodes: [],
        connections: []
      });
    
    expect(res.status).toBe(401);
  });

  it('2. should allow project creation when authorized with a valid user token', async () => {
    const res = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({
        id: 'test-project-a',
        name: 'test-project-a',
        nodes: [],
        connections: []
      });
    
    if (res.status !== 200) {
      console.log('Failed project creation response:', res.status, res.text);
    }
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('3. should block a different authenticated user (User B) from viewing or updating User A\'s project with 403', async () => {
    // Attempt to read/load User A's project with User B's token
    const resGet = await request(app)
      .get('/api/graphs/test-project-a')
      .set('Authorization', `Bearer ${tokenUserB}`);
    
    if (resGet.status !== 403) {
      console.log('Failed resGet response:', resGet.status, resGet.text);
    }
    expect(resGet.status).toBe(403);
    expect(resGet.body.error).toContain('Access denied');

    // Attempt to update User A's project with User B's token
    const resPut = await request(app)
      .put('/api/graphs/test-project-a')
      .set('Authorization', `Bearer ${tokenUserB}`)
      .send({
        id: 'test-project-a',
        name: 'Malicious Overwrite attempt',
        nodes: [],
        connections: []
      });
    
    expect(resPut.status).toBe(403);
    expect(resPut.body.error).toContain('Access denied');

    // Attempt to delete User A's project with User B's token
    const resDel = await request(app)
      .delete('/api/projects/test-project-a')
      .set('Authorization', `Bearer ${tokenUserB}`);
    
    expect(resDel.status).toBe(403);
    expect(resDel.body.error).toContain('Access denied');
  });

  it('4. should successfully allow User A to read, update, and delete their own project', async () => {
    // 1. Read
    const resGet = await request(app)
      .get('/api/graphs/test-project-a')
      .set('Authorization', `Bearer ${tokenUserA}`);
    expect(resGet.status).toBe(200);

    // 2. Update
    const resPut = await request(app)
      .put('/api/graphs/test-project-a')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({
        id: 'test-project-a',
        name: 'Test Project A Updated',
        nodes: [],
        connections: []
      });
    expect(resPut.status).toBe(200);

    // 3. Delete
    const resDel = await request(app)
      .delete('/api/projects/test-project-a')
      .set('Authorization', `Bearer ${tokenUserA}`);
    expect(resDel.status).toBe(200);
  });
});
