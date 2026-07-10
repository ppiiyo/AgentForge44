export interface EnvironmentValidationResult {
  jwtMissing: boolean;
  jwtInsecure: boolean;
  jwtLength: number;
  encryptionMissing: boolean;
  encryptionInsecure: boolean;
  encryptionLength: number;
  overallSecure: boolean;
}

/**
 * Validates whether mandatory environment keys (JWT_SECRET, ENCRYPTION_MASTER_KEY)
 * are correctly configured and satisfy minimum security/entropy standards (>= 32 chars).
 */
export async function validateEnvironment(): Promise<EnvironmentValidationResult> {
  try {
    const res = await fetch('/api/config/env-status');
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.error('Failed to validate environment keys via server:', err);
  }

  // Fallback defaults indicating insecure status if the network request fails
  return {
    jwtMissing: true,
    jwtInsecure: true,
    jwtLength: 0,
    encryptionMissing: true,
    encryptionInsecure: true,
    encryptionLength: 0,
    overallSecure: false
  };
}

/**
 * Requests the backend server to dynamically update or generate secure keys and persist them.
 */
export async function updateEnvironmentKeys(jwtSecret: string, encryptionKey: string): Promise<boolean> {
  try {
    const res = await fetch('/api/config/update-keys', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ jwtSecret, encryptionKey }),
    });
    if (res.ok) {
      const data = await res.json();
      return !!data.success;
    }
  } catch (err) {
    console.error('Failed to update environment keys:', err);
  }
  return false;
}
