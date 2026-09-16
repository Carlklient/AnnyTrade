export type ApiSuccess<T> = { ok: true; data: T };
export type ApiFailure = {
  ok: false;
  error: { code: string; message: string; details?: unknown };
};

export async function annytradeFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`/api/annytrade${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const json = (await response.json()) as ApiSuccess<T> | ApiFailure;
  if (!json.ok) {
    const err = new Error(json.error.message) as Error & {
      code?: string;
      status?: number;
    };
    err.code = json.error.code;
    err.status = response.status;
    throw err;
  }
  return json.data;
}
