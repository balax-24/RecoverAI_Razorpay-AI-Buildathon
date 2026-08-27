/**
 * Shared RecoverAI web API client.
 * Ensures consistent base URL, demo-mode header, cache policy, and response parsing.
 */

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export class ApiError extends Error {
  status: number;
  url: string;

  constructor(message: string, status: number, url: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.url = url;
  }
}

export interface PaginatedMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginatedMeta;
}

type DemoModeGetter = boolean | (() => boolean);

function resolveDemoMode(isDemoMode: DemoModeGetter): boolean {
  return typeof isDemoMode === 'function' ? isDemoMode() : isDemoMode;
}

/**
 * Low-level fetch with x-demo-mode + cache: 'no-store'.
 * Avoids stale HTTP 304 empty-body races with Express ETags during polling.
 */
export async function apiFetch(
  path: string,
  isDemoMode: DemoModeGetter,
  init: RequestInit = {}
): Promise<Response> {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const headers = new Headers(init.headers || {});
  headers.set('x-demo-mode', String(resolveDemoMode(isDemoMode)));

  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(url, {
    ...init,
    headers,
    cache: 'no-store',
  });
}

export async function apiJson<T>(
  path: string,
  isDemoMode: DemoModeGetter,
  init: RequestInit = {}
): Promise<T> {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const res = await apiFetch(path, isDemoMode, init);

  if (!res.ok) {
    throw new ApiError(`API returned HTTP ${res.status} from ${url}`, res.status, url);
  }

  return res.json() as Promise<T>;
}

/** Normalize paginated list payloads: { data, meta } | { items, total } | T[] */
export function parsePaginated<T>(json: unknown): PaginatedResult<T> {
  if (Array.isArray(json)) {
    return {
      data: json as T[],
      meta: {
        page: 1,
        limit: json.length,
        total: json.length,
        totalPages: 1,
      },
    };
  }

  if (!json || typeof json !== 'object') {
    throw new Error('Unexpected API response: expected object or array');
  }

  const body = json as Record<string, unknown>;
  const data = Array.isArray(body.data)
    ? (body.data as T[])
    : Array.isArray(body.items)
      ? (body.items as T[])
      : null;

  if (!data) {
    throw new Error('Unexpected API response: missing data/items array');
  }

  const metaObj =
    body.meta && typeof body.meta === 'object'
      ? (body.meta as Record<string, unknown>)
      : {};

  const total = Number(
    metaObj.total ?? body.total ?? data.length
  );
  const page = Number(metaObj.page ?? body.page ?? 1);
  const limit = Number(metaObj.limit ?? body.limit ?? body.pageSize ?? (data.length || 25));
  const totalPages = Number(
    metaObj.totalPages ?? (Math.ceil(total / (limit || 1)) || 1)
  );

  return {
    data,
    meta: { page, limit, total, totalPages },
  };
}

/** Normalize pending approvals: T[] | { data: T[] } */
export function parseApprovalsList<T>(json: unknown): T[] {
  if (Array.isArray(json)) return json as T[];
  if (json && typeof json === 'object') {
    const body = json as Record<string, unknown>;
    if (Array.isArray(body.data)) return body.data as T[];
    if (Array.isArray(body.items)) return body.items as T[];
  }
  throw new Error('Unexpected approvals response: expected array');
}
