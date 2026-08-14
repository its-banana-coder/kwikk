export async function apiFetch(url: string, init: RequestInit = {}): Promise<Response> {
  return fetch(url, init);
}
