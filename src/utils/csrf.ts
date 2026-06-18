let csrfToken: string | null = null;
let csrfPromise: Promise<string> | null = null;

export async function getCsrfToken(): Promise<string> {
  if (csrfToken) return csrfToken;
  if (!csrfPromise) {
    csrfPromise = fetch('/api/csrf-token')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch CSRF token');
        return res.json();
      })
      .then(data => {
        csrfToken = data.csrfToken;
        return csrfToken || '';
      })
      .catch(err => {
        console.error('Failed to load CSRF token:', err);
        csrfPromise = null;
        return '';
      });
  }
  return csrfPromise;
}

// Intercept global fetch to attach CSRF headers
if (typeof window !== 'undefined') {
  const originalFetch = window.fetch;
  window.fetch = async function (input: any, init?: any) {
    const method = (init?.method || 'GET').toUpperCase();
    const url = typeof input === 'string' ? input : (input instanceof URL ? input.href : input.url);

    if (
      url.includes('/api/') &&
      !url.includes('/api/csrf-token') &&
      ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)
    ) {
      try {
        const token = await getCsrfToken();
        if (token) {
          init = init || {};
          const headers = new Headers(init.headers || {});
          headers.set('X-CSRF-Token', token);
          headers.set('CSRF-Token', token);
          init.headers = headers;
        }
      } catch (err) {
        console.error('CSRF token insertion failed:', err);
      }
    }
    return originalFetch.call(this, input, init);
  };
}
