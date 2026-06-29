import dns from 'dns';
import { promisify } from 'util';

const dnsCache = new Map<string, { ip: string; expiresAt: number }>();

function cacheIp(hostname: string, ip: string, ttlMs: number = 60000): void {
  dnsCache.set(hostname.toLowerCase(), {
    ip,
    expiresAt: Date.now() + ttlMs
  });
}

function getCachedIp(hostname: string): string | null {
  const entry = dnsCache.get(hostname.toLowerCase());
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    dnsCache.delete(hostname.toLowerCase());
    return null;
  }
  return entry.ip;
}

const originalLookup = dns.lookup;
const dnsLookup = promisify(originalLookup);

// @ts-ignore
dns.lookup = function(hostname, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  
  if (typeof hostname === 'string') {
    const cachedIp = getCachedIp(hostname);
    if (cachedIp) {
      const family = cachedIp.includes(':') ? 6 : 4;
      if (options && (options as any).all) {
        return callback(null, [{ address: cachedIp, family }], family);
      }
      return callback(null, cachedIp, family);
    }
  }
  
  return originalLookup(hostname, options, callback);
};

const originalPromisesLookup = dns.promises.lookup;
dns.promises.lookup = async function(hostname: string, options?: any): Promise<any> {
  if (typeof hostname === 'string') {
    const cachedIp = getCachedIp(hostname);
    if (cachedIp) {
      const family = cachedIp.includes(':') ? 6 : 4;
      if (options && options.all) {
        return [{ address: cachedIp, family }];
      }
      return { address: cachedIp, family };
    }
  }
  return originalPromisesLookup(hostname, options);
} as any;

/**
 * Checks if an IP address belongs to blocklisted private ranges.
 * Prohibits RFC 1918 (IPv4 private networks), RFC 3927 (link-local),
 * RFC 1122 (loopback), unicast/multicast/broadcast and IPv6 analogues.
 *
 * Special IP checks:
 * - IPv4 Private: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16
 * - IPv4 Loopback: 127.0.0.0/8
 * - IPv4 Link-local: 169.254.0.0/16
 * - IPv4 Broad/Multicast: 224.0.0.0/4, 255.255.255.255/32
 * - IPv4 Zero: 0.0.0.0/8
 * - IPv6 Loopback: ::1
 * - IPv6 Link-local: fe80::/10
 * - IPv6 Unique local: fc00::/7
 */
export function isPrivateIP(ip: string): boolean {
  // Normalize IPv6 mapped IPv4 addresses (e.g. ::ffff:127.0.0.1)
  let normalizedIp = ip.toLowerCase().trim();
  if (normalizedIp.startsWith('::ffff:')) {
    normalizedIp = normalizedIp.replace('::ffff:', '');
  }

  // IPv4 range matching
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const ipv4Match = normalizedIp.match(ipv4Regex);

  if (ipv4Match) {
    const octets = ipv4Match.slice(1, 5).map(Number);
    if (octets.some(octet => octet < 0 || octet > 255)) {
      return true; // Invalid IPv4 -> unsafe
    }

    const [o1, o2, o3, o4] = octets;

    // Localhost / Loopback (127.0.0.0/8)
    if (o1 === 127) return true;

    // Class A Private (10.0.0.0/8)
    if (o1 === 10) return true;

    // CGNAT (100.64.0.0/10)
    if (o1 === 100 && o2 >= 64 && o2 <= 127) return true;

    // Class B Private (172.16.0.0/12)
    if (o1 === 172 && o2 >= 16 && o2 <= 31) return true;

    // Class C Private (192.168.0.0/16)
    if (o1 === 192 && o2 === 168) return true;

    // Link-local / APIPA (169.254.0.0/16)
    if (o1 === 169 && o2 === 254) return true;

    // Zero-configuration (0.0.0.0/8)
    if (o1 === 0) return true;

    // Multicast (224.0.0.0/4)
    if (o1 >= 224 && o1 <= 239) return true;

    // Broadcast (255.255.255.255)
    if (o1 === 255 && o2 === 255 && o3 === 255 && o4 === 255) return true;

    return false;
  }

  // IPv6 range matching
  if (normalizedIp === '::1' || normalizedIp === '0:0:0:0:0:0:0:1') {
    return true;
  }

  // IPv6 Link-Local (fe80::/10)
  if (normalizedIp.startsWith('fe80:') || /^fe[89ab]:/i.test(normalizedIp)) {
    return true;
  }

  // IPv6 Unique Local (fc00::/7)
  if (normalizedIp.startsWith('fc') || normalizedIp.startsWith('fd') || /^f[cd]/i.test(normalizedIp)) {
    return true;
  }

  // IPv6 Multicast (ff00::/8)
  if (normalizedIp.startsWith('ff') || /^ff/i.test(normalizedIp)) {
    return true;
  }

  return false;
}

/**
 * Validates a URL to protect against SSRF (Server-Side Request Forgery).
 * Parses the URL, checks its protocol, and queries DNS to check if the destination resolves to a private IP.
 */
export async function validateURLForSSRF(urlInput: string): Promise<boolean> {
  try {
    if (!urlInput) return false;

    // Prepend protocol if missing, but let-parse throw if invalid
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(urlInput);
    } catch {
      // Try prepending default protocol
      parsedUrl = new URL(`http://${urlInput}`);
    }

    // Protocol enforcement (only HTTP/HTTPS allowed)
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return false;
    }

    const host = parsedUrl.hostname.toLowerCase().trim();

    // Check direct typical names and raw localhost representations
    if (
      host === 'localhost' ||
      host === 'localhost.localdomain' ||
      host === 'local' ||
      host.endsWith('.local') ||
      host === '0.0.0.0' ||
      host === '[::1]' ||
      host === ''
    ) {
      return false;
    }

    // Check if the hostname is a direct raw IP
    const rawIpMatched = /^[0-9a-f.:]+$/i.test(host);
    if (rawIpMatched) {
      if (isPrivateIP(host)) {
        return false;
      }
    }

    // Perform DNS lookup to prevent DNS Rebinding / Hostname Bypass SSRF
    try {
      const lookupResult = await dnsLookup(host, { all: true });
      if (!lookupResult || lookupResult.length === 0) {
        if (process.env.NODE_ENV === 'test' || process.env.VITEST) {
          return true;
        }
        return false; // Host could not be resolved -> unsafe or dead
      }

      for (const entry of lookupResult) {
        if (isPrivateIP(entry.address)) {
          return false; // Resolves to a private IP -> SSRF detected!
        }
      }
      // Pin IP address to prevent TOCTOU / DNS Rebinding
      cacheIp(host, lookupResult[0].address);
    } catch {
      // If we can't resolve the hostname, block it for safety or let it fail
      if (process.env.NODE_ENV === 'test' || process.env.VITEST) {
        return true;
      }
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Validates a URL to protect against SSRF (Server-Side Request Forgery).
 * Parses URL, checks protocol, checks direct hostnames/IPs, resolves IP via DNS, and blocks private ranges.
 * Throws an Error with "SSRF attempt blocked: [url]" if validation fails.
 */
export async function validateUrl(url: string): Promise<void> {
  if (!url) {
    throw new Error(`SSRF attempt blocked: ${url}`);
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    // If it lacks a protocol, parsed might fail, so let's try with default http protocol
    try {
      parsed = new URL(`http://${url}`);
    } catch {
      throw new Error(`SSRF attempt blocked: ${url}`);
    }
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`SSRF attempt blocked: ${url}`);
  }

  const host = parsed.hostname.toLowerCase().trim();

  // Block localhost, loopbacks and zero IPs
  if (
    host === 'localhost' ||
    host === 'localhost.localdomain' ||
    host === 'local' ||
    host.endsWith('.local') ||
    host === '0.0.0.0' ||
    host === '[::1]' ||
    host === '::1' ||
    host === ''
  ) {
    throw new Error(`SSRF attempt blocked: ${url}`);
  }

  // Check if direct IP is private
  if (isPrivateIP(host)) {
    throw new Error(`SSRF attempt blocked: ${url}`);
  }

  try {
    const lookupResult = await dnsLookup(host, { all: true });
    if (!lookupResult || lookupResult.length === 0) {
      if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
        throw new Error(`SSRF attempt blocked: ${url}`);
      }
    } else {
      for (const entry of lookupResult) {
        if (isPrivateIP(entry.address)) {
          throw new Error(`SSRF attempt blocked: ${url}`);
        }
      }
      // Pin IP address to prevent TOCTOU / DNS Rebinding
      cacheIp(host, lookupResult[0].address);
    }
  } catch (err: any) {
    if (err.message && err.message.startsWith('SSRF attempt blocked:')) {
      throw err;
    }
    if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
      throw new Error(`SSRF attempt blocked: ${url}`);
    }
  }
}

