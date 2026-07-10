import express from 'express';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { SecretsShield } from './auth.js';
import { authMiddleware } from './authRoutes.js';
import { verifyToken } from './userAuth.js';
import { SECRETS } from '../config/secrets.js';
import { logger } from '../utils/logger.js';

const router = express.Router();
const GITHUB_CONNECTIONS_FILE = path.join(process.cwd(), 'projects', 'github_connections.json');

// Ensure projects directory exists
if (!fs.existsSync(path.join(process.cwd(), 'projects'))) {
  fs.mkdirSync(path.join(process.cwd(), 'projects'), { recursive: true });
}

// Get helper to load connections securely
function loadConnections(): Record<string, any> {
  if (!fs.existsSync(GITHUB_CONNECTIONS_FILE)) {
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(GITHUB_CONNECTIONS_FILE, 'utf8'));
  } catch {
    return {};
  }
}

// Save helper
function saveConnections(connections: Record<string, any>) {
  fs.writeFileSync(GITHUB_CONNECTIONS_FILE, JSON.stringify(connections, null, 2), 'utf8');
}

/**
 * GET /api/auth/github/url
 * Generate GitHub Authorization URL. We require the user JWT as a parameter
 * so we can use it as the state parameter, which is securely returned to the callback.
 */
router.get('/auth/github/url', (req: express.Request, res: express.Response) => {
  try {
    const userToken = req.query.token as string;
    if (!userToken) {
      res.status(400).json({ error: 'Missing token query parameter for state synchronization' });
      return;
    }

    const clientId = process.env.GITHUB_CLIENT_ID;
    if (!clientId) {
      res.status(500).json({
        error: 'GitHub Integration is not configured on the server. Please define GITHUB_CLIENT_ID in your environment.'
      });
      return;
    }

    const redirectUri = `${req.protocol}://${req.get('host')}/api/auth/github/callback`;

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'repo,user',
      state: userToken
    });

    const authUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;
    res.json({ url: authUrl });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/auth/github/callback
 * Handles the redirect callback from GitHub
 */
const callbackHandler = async (req: express.Request, res: express.Response) => {
  const { code, state } = req.query;

  if (!code || !state) {
    res.status(400).send('Missing authorization code or state token.');
    return;
  }

  // 1. Verify user identity from the state parameter (which contains the JWT)
  const decoded = verifyToken(state as string);
  if (!decoded || !decoded.id) {
    res.status(401).send('Unauthorized: Invalid state session token.');
    return;
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    res.status(500).send('GitHub credentials are not configured on this server.');
    return;
  }

  try {
    // 2. Exchange authorization code for access token
    const tokenResponse = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: clientId,
        client_secret: clientSecret,
        code
      },
      {
        headers: { Accept: 'application/json' }
      }
    );

    const tokenData = tokenResponse.data;
    if (tokenData.error) {
      res.status(400).send(`GitHub OAuth Error: ${tokenData.error_description || tokenData.error}`);
      return;
    }

    const accessToken = tokenData.access_token;

    // 3. Query user profile from GitHub
    const userResponse = await axios.get('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': 'KostromAi44'
      }
    });

    const githubUser = userResponse.data;

    // 4. Save connected user connection securely using SecretsShield
    const shield = new SecretsShield();
    const connections = loadConnections();
    
    connections[decoded.id] = {
      encryptedToken: shield.encrypt(accessToken),
      username: githubUser.login,
      avatarUrl: githubUser.avatar_url,
      connectedAt: new Date().toISOString()
    };
    saveConnections(connections);

    logger.info(`Successfully linked GitHub account "${githubUser.login}" for user ID ${decoded.id}`);

    // 5. Send confirmation postMessage and close popup window
    res.send(`
      <html>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background-color: #0d1117; color: #c9d1d9;">
          <div style="text-align: center; padding: 2rem; border-radius: 8px; background: #161b22; border: 1px solid #30363d; max-width: 400px; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">
            <img src="${githubUser.avatar_url}" style="width: 80px; height: 80px; border-radius: 50%; border: 2px solid #58a6ff; margin-bottom: 1rem;" />
            <h2 style="margin: 0 0 0.5rem 0; color: #58a6ff;">Успешно подключено!</h2>
            <p style="margin: 0 0 1.5rem 0; font-size: 0.9rem; color: #8b949e;">Аккаунт <strong>${githubUser.login}</strong> успешно привязан.</p>
            <p style="margin: 0; font-size: 0.8rem; color: #8b949e;">Окно закроется автоматически...</p>
          </div>
          <script>
            if (window.opener) {
              window.opener.postMessage({ 
                type: 'OAUTH_AUTH_SUCCESS', 
                username: '${githubUser.login}',
                avatarUrl: '${githubUser.avatar_url}'
              }, '*');
              setTimeout(() => {
                window.close();
              }, 1500);
            } else {
              window.location.href = '/';
            }
          </script>
        </body>
      </html>
    `);
  } catch (err: any) {
    logger.error('Error during GitHub auth callback:', err);
    res.status(500).send(`Authentication failed: ${err.message}`);
  }
};

router.get('/auth/github/callback', callbackHandler);
router.get('/auth/github/callback/', callbackHandler);

/**
 * GET /api/github/connection
 * Retrieve connection status for the logged-in user
 */
router.get('/github/connection', authMiddleware, (req: express.Request, res: express.Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const connections = loadConnections();
    const conn = connections[userId];

    if (!conn) {
      res.json({ connected: false });
      return;
    }

    res.json({
      connected: true,
      username: conn.username,
      avatarUrl: conn.avatarUrl,
      connectedAt: conn.connectedAt
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/github/connection
 * Revoke GitHub credentials association
 */
router.delete('/github/connection', authMiddleware, (req: express.Request, res: express.Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const connections = loadConnections();
    if (connections[userId]) {
      delete connections[userId];
      saveConnections(connections);
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/github/repos
 * List repositories for the connected GitHub account
 */
router.get('/github/repos', authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const connections = loadConnections();
    const conn = connections[userId];

    if (!conn || !conn.encryptedToken) {
      res.status(400).json({ error: 'GitHub account is not connected.' });
      return;
    }

    const shield = new SecretsShield();
    const accessToken = shield.decrypt(conn.encryptedToken);

    const reposResponse = await axios.get('https://api.github.com/user/repos', {
      params: {
        per_page: 100,
        sort: 'updated'
      },
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': 'KostromAi44'
      }
    });

    const repos = reposResponse.data.map((r: any) => ({
      name: r.name,
      full_name: r.full_name,
      default_branch: r.default_branch || 'main',
      private: r.private
    }));

    res.json(repos);
  } catch (err: any) {
    logger.error('Error fetching GitHub repos:', err);
    res.status(500).json({ error: err.response?.data?.message || err.message });
  }
});

/**
 * POST /api/github/push
 * Push file content directly to a repository
 */
router.post('/github/push', authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { repo, branch, commitMessage, filePath, content } = req.body;

    if (!repo || !branch || !commitMessage || !filePath || content === undefined) {
      res.status(400).json({ error: 'Missing required parameters: repo, branch, commitMessage, filePath, content' });
      return;
    }

    const connections = loadConnections();
    const conn = connections[userId];

    if (!conn || !conn.encryptedToken) {
      res.status(400).json({ error: 'GitHub account is not connected.' });
      return;
    }

    const shield = new SecretsShield();
    const accessToken = shield.decrypt(conn.encryptedToken);

    // 1. Check if the file already exists in the repository to obtain its blob SHA
    let existingSha: string | undefined;
    const url = `https://api.github.com/repos/${repo}/contents/${filePath}`;

    try {
      const existingResponse = await axios.get(url, {
        params: { ref: branch },
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'User-Agent': 'KostromAi44'
        }
      });
      existingSha = existingResponse.data?.sha;
    } catch (err: any) {
      // 404 is expected for newly created files, so do not crash
      if (err.response?.status !== 404) {
        throw err;
      }
    }

    // 2. Put the file content to GitHub (Base64 encoded)
    const base64Content = Buffer.from(content).toString('base64');
    const putResponse = await axios.put(
      url,
      {
        message: commitMessage,
        content: base64Content,
        branch,
        sha: existingSha
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'User-Agent': 'KostromAi44'
        }
      }
    );

    res.json({
      success: true,
      html_url: putResponse.data?.content?.html_url,
      commit_sha: putResponse.data?.commit?.sha
    });
  } catch (err: any) {
    logger.error('Error pushing to GitHub:', err);
    res.status(500).json({ error: err.response?.data?.message || err.message });
  }
});

export default router;
