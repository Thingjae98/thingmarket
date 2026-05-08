const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export async function adminFetch<T>(
  path: string,
  token: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers as Record<string, string>),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "API 오류");
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}
