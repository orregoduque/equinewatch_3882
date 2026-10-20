/** Refresh horse records without changing auth headers or camera-image caching. */
export function freshHorseFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
  const method = (init?.method || (typeof input === 'object' && 'method' in input ? input.method : 'GET')).toUpperCase();
  return fetch(input, url.pathname === '/rest/v1/horses' && method === 'GET'
    ? { ...init, cache: 'no-store' }
    : init);
}
