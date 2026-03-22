import { NextRequest, NextResponse } from 'next/server';

/**
 * API Key Authentication
 *
 * Validates requests against API_KEYS environment variable.
 * Keys can be passed via:
 *   - Header: X-API-Key: oa_sk_live_...
 *   - Header: Authorization: Bearer oa_sk_live_...
 *   - Query:  ?api_key=oa_sk_live_...
 *
 * Set API_AUTH_ENABLED=false to skip auth (dev mode).
 */

export interface AuthResult {
  authenticated: boolean;
  error?: string;
  keyPrefix?: string; // first 12 chars for logging
}

export function validateApiKey(req: NextRequest): AuthResult {
  // Check if auth is enabled
  const authEnabled = process.env.API_AUTH_ENABLED !== 'false';
  if (!authEnabled) {
    return { authenticated: true };
  }

  // Get valid keys from env
  const validKeys = (process.env.API_KEYS || '')
    .split(',')
    .map(k => k.trim())
    .filter(Boolean);

  if (validKeys.length === 0) {
    // No keys configured = auth disabled
    return { authenticated: true };
  }

  // Extract key from request
  const apiKey = extractApiKey(req);

  if (!apiKey) {
    return {
      authenticated: false,
      error: 'Missing API key. Provide via X-API-Key header, Authorization: Bearer header, or api_key query parameter.',
    };
  }

  // Validate
  if (validKeys.includes(apiKey)) {
    return {
      authenticated: true,
      keyPrefix: apiKey.substring(0, 12) + '...',
    };
  }

  return {
    authenticated: false,
    error: 'Invalid API key.',
  };
}

function extractApiKey(req: NextRequest): string | null {
  // 1. X-API-Key header
  const xApiKey = req.headers.get('x-api-key');
  if (xApiKey) return xApiKey;

  // 2. Authorization: Bearer <key>
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }

  // 3. Query parameter
  const queryKey = req.nextUrl.searchParams.get('api_key');
  if (queryKey) return queryKey;

  return null;
}

/**
 * Wrap an API handler with authentication.
 * Returns 401 JSON response if auth fails.
 */
export function withAuth(
  handler: (req: NextRequest, ...args: unknown[]) => Promise<NextResponse>
) {
  return async (req: NextRequest, ...args: unknown[]) => {
    const auth = validateApiKey(req);
    if (!auth.authenticated) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: auth.error,
          docs: '/api-docs',
        },
        { status: 401 }
      );
    }
    return handler(req, ...args);
  };
}

/**
 * Simple auth check that returns a 401 response or null.
 * Use at the top of route handlers:
 *
 *   const authError = checkAuth(req);
 *   if (authError) return authError;
 */
export function checkAuth(req: NextRequest): NextResponse | null {
  const auth = validateApiKey(req);
  if (!auth.authenticated) {
    return NextResponse.json(
      {
        error: 'Unauthorized',
        message: auth.error,
        hint: 'Add your API key via X-API-Key header or Authorization: Bearer header. See /api-docs for details.',
      },
      {
        status: 401,
        headers: {
          'WWW-Authenticate': 'Bearer realm="OrangeApps Finance API"',
        },
      }
    );
  }
  return null;
}
