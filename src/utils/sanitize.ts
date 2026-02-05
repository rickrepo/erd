/**
 * Input sanitization utilities to prevent XSS and SQL injection
 */

// HTML entities to escape
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
};

/**
 * Escape HTML special characters to prevent XSS
 */
export function escapeHtml(str: string): string {
  if (typeof str !== 'string') return '';
  return str.replace(/[&<>"'`=/]/g, (char) => HTML_ENTITIES[char] || char);
}

/**
 * Sanitize a string for safe display (removes potential script tags)
 */
export function sanitizeForDisplay(str: string): string {
  if (typeof str !== 'string') return '';
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
}

/**
 * Validate and sanitize a table name
 * Returns null if invalid, sanitized name if valid
 */
export function sanitizeTableName(name: string): string | null {
  if (typeof name !== 'string') return null;

  // Trim whitespace
  const trimmed = name.trim();

  // Length check
  if (trimmed.length < 1 || trimmed.length > 64) return null;

  // Remove any HTML/script content
  const cleaned = sanitizeForDisplay(trimmed);

  // Only allow alphanumeric, underscore, and must start with letter or underscore
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(cleaned)) {
    // Try to clean it up - remove invalid characters
    const sanitized = cleaned.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^[0-9]/, '_');
    if (sanitized.length < 1) return null;
    return sanitized;
  }

  return cleaned;
}

/**
 * Validate and sanitize a column name
 */
export function sanitizeColumnName(name: string): string | null {
  if (typeof name !== 'string') return null;

  const trimmed = name.trim();
  if (trimmed.length < 1 || trimmed.length > 64) return null;

  const cleaned = sanitizeForDisplay(trimmed);

  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(cleaned)) {
    const sanitized = cleaned.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^[0-9]/, '_');
    if (sanitized.length < 1) return null;
    return sanitized;
  }

  return cleaned;
}

/**
 * Sanitize SQL input - doesn't execute it, just cleans for display/storage
 * This is NOT for preventing SQL injection in a database context
 * (we don't execute SQL on a server)
 */
export function sanitizeSqlInput(sql: string): string {
  if (typeof sql !== 'string') return '';

  // Remove null bytes and other control characters except newlines/tabs
  return sql
    .replace(/\0/g, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim();
}

/**
 * Validate a session/schema name
 */
export function sanitizeSessionName(name: string): string | null {
  if (typeof name !== 'string') return null;

  const trimmed = name.trim();
  if (trimmed.length < 1 || trimmed.length > 100) return null;

  // Allow letters, numbers, spaces, hyphens, underscores
  const cleaned = sanitizeForDisplay(trimmed);
  if (!/^[a-zA-Z0-9_\- ]+$/.test(cleaned)) {
    // Clean it up
    const sanitized = cleaned.replace(/[^a-zA-Z0-9_\- ]/g, '').trim();
    if (sanitized.length < 1) return null;
    return sanitized;
  }

  return cleaned;
}

/**
 * Generate a safe ID from a string
 */
export function generateSafeId(prefix: string = 'id'): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  if (typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Rate limiting helper - returns true if action should be allowed
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  key: string,
  maxRequests: number = 10,
  windowMs: number = 60000
): boolean {
  const now = Date.now();
  const existing = rateLimitMap.get(key);

  if (!existing || now > existing.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (existing.count >= maxRequests) {
    return false;
  }

  existing.count++;
  return true;
}

/**
 * Clear rate limit for a key
 */
export function clearRateLimit(key: string): void {
  rateLimitMap.delete(key);
}
