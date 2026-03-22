import { NextRequest, NextResponse } from 'next/server';

/**
 * Next.js Middleware — runs on every matched request.
 * Enforces API key authentication on /api/* routes.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only protect /api/* routes (not /api-docs)
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Check if auth is enabled
  const authEnabled = process.env.API_AUTH_ENABLED !== 'false';
  if (!authEnabled) {
    return NextResponse.next();
  }

  // Get valid keys
  const validKeys = (process.env.API_KEYS || '')
    .split(',')
    .map(k => k.trim())
    .filter(Boolean);

  // No keys configured = skip auth
  if (validKeys.length === 0) {
    return NextResponse.next();
  }

  // Skip auth for same-origin requests (browser UI fetching its own API)
  const referer = req.headers.get('referer');
  const origin = req.headers.get('origin');
  const host = req.headers.get('host');
  const secFetchSite = req.headers.get('sec-fetch-site');

  // Browser same-origin requests (UI pages calling their own APIs)
  if (secFetchSite === 'same-origin') {
    return NextResponse.next();
  }

  // SSR requests (Next.js server-side fetches have no origin/referer)
  if (!origin && !referer && !req.headers.get('x-api-key') && !req.headers.get('authorization') && !req.nextUrl.searchParams.get('api_key')) {
    // This is likely an internal SSR fetch — but we can't be sure.
    // For safety, only skip if there's a matching referer
  }

  // Referer from same host (covers SSR and client-side navigation)
  if (referer && host) {
    try {
      const refUrl = new URL(referer);
      if (refUrl.host === host) {
        return NextResponse.next();
      }
    } catch {}
  }

  // Extract API key from request
  const apiKey =
    req.headers.get('x-api-key') ||
    (req.headers.get('authorization')?.startsWith('Bearer ')
      ? req.headers.get('authorization')!.slice(7).trim()
      : null) ||
    req.nextUrl.searchParams.get('api_key');

  if (!apiKey) {
    return NextResponse.json(
      {
        error: 'Unauthorized',
        message: 'Missing API key. Provide via X-API-Key header, Authorization: Bearer header, or api_key query parameter.',
        docs: `${req.nextUrl.origin}/api-docs`,
      },
      {
        status: 401,
        headers: {
          'WWW-Authenticate': 'Bearer realm="OrangeApps Finance API"',
          'Content-Type': 'application/json',
        },
      }
    );
  }

  if (!validKeys.includes(apiKey)) {
    return NextResponse.json(
      {
        error: 'Unauthorized',
        message: 'Invalid API key.',
        docs: `${req.nextUrl.origin}/api-docs`,
      },
      {
        status: 401,
        headers: {
          'WWW-Authenticate': 'Bearer realm="OrangeApps Finance API"',
          'Content-Type': 'application/json',
        },
      }
    );
  }

  // Auth passed — continue
  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
