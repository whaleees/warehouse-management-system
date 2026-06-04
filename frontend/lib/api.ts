import { API_BASE_URL } from "./config";
import { getToken } from "./auth";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: any,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function toApiError(res: Response): Promise<ApiError> {
  let body: any = undefined;
  try {
    if ((res.headers.get("content-type") || "").includes("application/json")) {
      body = await res.json();
    }
  } catch {
    // ignore — fall back to status text below
  }

  const message = Array.isArray(body?.message)
    ? body.message.join(", ")
    : (body?.message ?? `API error: ${res.status}`);

  return new ApiError(res.status, message, body);
}

export async function api<T = any>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    throw await toApiError(res);
  }

  return (await res.json()) as T;
}

export async function upload<T = any>(
  path: string,
  formData: FormData,
): Promise<T> {
  const token = getToken();

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    body: formData,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!res.ok) {
    throw await toApiError(res);
  }

  return (await res.json()) as T;
}
