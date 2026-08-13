const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://api.datalake").replace(
  /\/$/,
  "",
);

export function isNoAuthMode() {
  return process.env.NEXT_PUBLIC_AUTH_MODE === "noauth";
}

export class ApiError extends Error {
  status: number;

  details: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function buildApiError(response: Response, data: unknown) {
  const message =
    typeof data === "object" &&
    data !== null &&
    "detail" in data &&
    typeof (data as { detail?: unknown }).detail === "string"
      ? (data as { detail: string }).detail
      : `API request failed with status ${response.status}.`;

  return new ApiError(message, response.status, data);
}

async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  const data = text ? safeJsonParse(text) : null;

  if (!response.ok) {
    throw buildApiError(response, data);
  }

  return data as T;
}

export function buildQuery(params: Record<string, string | number | boolean | undefined | null>) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      search.set(key, String(value));
    }
  }

  const query = search.toString();

  return query ? `?${query}` : "";
}

interface RequestOptions extends RequestInit {
  authToken?: string;
}

async function request(path: string, options: RequestOptions) {
  const headers = new Headers(options.headers);

  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (options.authToken) {
    headers.set("Authorization", `Bearer ${options.authToken}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  return response;
}

export async function requestJson<T>(path: string, options: RequestOptions): Promise<T> {
  const response = await request(path, options);

  return parseResponse<T>(response);
}

export function parseContentDispositionFilename(header: string | null, fallback: string) {
  if (!header) {
    return fallback;
  }

  const encodedMatch = header.match(/filename\*=UTF-8''([^;]+)/i);

  if (encodedMatch?.[1]) {
    try {
      return decodeURIComponent(encodedMatch[1]);
    } catch {
      return encodedMatch[1];
    }
  }

  const basicMatch = header.match(/filename="?([^";]+)"?/i);

  return basicMatch?.[1] ?? fallback;
}

export async function requestBlob(
  path: string,
  options: RequestOptions,
  fallbackFilename: string,
) {
  const response = await request(path, options);

  if (!response.ok) {
    const text = await response.text();
    const data = text ? safeJsonParse(text) : null;

    throw buildApiError(response, data);
  }

  const blob = await response.blob();

  return {
    blob,
    filename: parseContentDispositionFilename(
      response.headers.get("Content-Disposition"),
      fallbackFilename,
    ),
    contentType: response.headers.get("Content-Type") ?? blob.type ?? "application/octet-stream",
  };
}
