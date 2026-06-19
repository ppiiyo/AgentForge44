/**
 * XSS Protection escaping and filtering utility
 */
export function escapeHTML(str: string): string {
  if (typeof str !== 'string') return str;
  return str.replace(/[&<>"']/g, (m) => {
    switch (m) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      case "'": return '&#39;';
      default: return m;
    }
  });
}

export function sanitizeXSSPayload(str: string): string {
  if (typeof str !== 'string') return str;
  // Remove script tags, javascript: links, inline events
  let sanitized = str;
  sanitized = sanitized.replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '');
  sanitized = sanitized.replace(/javascript:/gi, '[removed]');
  sanitized = sanitized.replace(/onload|onerror|onclick|onmouseover|onfocus/gi, 'blocked-event');
  return sanitized;
}
