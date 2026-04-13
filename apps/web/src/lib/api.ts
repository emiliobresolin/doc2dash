import type { PreviewPayload, UploadManifest, UploadRuntime } from "../types/manifest";
import type { PreviewSearchResponse } from "../types/search";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

export class ApiRequestError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = "ApiRequestError";
    this.code = code;
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, init);
  const payload = (await response.json()) as {
    data: T | null;
    error: { code: string; message: string } | null;
  };

  if (!response.ok || payload.error || payload.data === null) {
    throw new ApiRequestError(
      payload.error?.message ?? "Request failed.",
      payload.error?.code ?? "request_failed",
      response.status,
    );
  }

  return payload.data;
}

export function getUploadManifest(uploadId: string) {
  return request<UploadManifest>(`/api/uploads/${uploadId}/manifest`);
}

export function createUpload(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return request<UploadManifest>("/api/uploads", {
    method: "POST",
    body: formData,
  });
}

export function getUploadRuntime(uploadId: string) {
  return request<UploadRuntime>(`/api/uploads/${uploadId}/runtime`);
}

export function getTablePreview(
  uploadId: string,
  tableId: string,
  options?: {
    filter?: string;
    page?: number;
    pageSize?: number;
  },
) {
  const searchParams = new URLSearchParams();
  if (options?.filter?.trim()) {
    searchParams.set("filter", options.filter.trim());
  }
  if (options?.page) {
    searchParams.set("page", String(options.page));
  }
  if (options?.pageSize) {
    searchParams.set("pageSize", String(options.pageSize));
  }

  const suffix = searchParams.size ? `?${searchParams.toString()}` : "";
  return request<PreviewPayload>(
    `/api/uploads/${uploadId}/tables/${tableId}/preview${suffix}`,
  );
}

export function searchUploadPreview(
  uploadId: string,
  query: string,
  options?: {
    limit?: number;
    signal?: AbortSignal;
  },
) {
  const searchParams = new URLSearchParams({ q: query });
  if (options?.limit) {
    searchParams.set("limit", String(options.limit));
  }

  return request<PreviewSearchResponse>(
    `/api/uploads/${uploadId}/search?${searchParams.toString()}`,
    { signal: options?.signal },
  );
}
