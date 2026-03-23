import axios from "axios";
import type { AccessTokenResponse } from "@shared/auth";
import { AxiosHeaders } from "axios";
import type { InternalAxiosRequestConfig } from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:3001";

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

let accessToken: string | null = null;

interface RetriableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
  _skipAuthRefresh?: boolean;
}

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

export const getAccessToken = () => accessToken;

api.interceptors.request.use((config) => {
  if (accessToken) {
    const nextHeaders = AxiosHeaders.from(config.headers);
    nextHeaders.set("Authorization", `Bearer ${accessToken}`);
    config.headers = nextHeaders;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (!axios.isAxiosError(error)) {
      return Promise.reject(error);
    }

    const originalRequest = error.config as RetriableRequestConfig | undefined;
    const status = error.response?.status;
    const requestUrl = originalRequest?.url ?? "";

    if (
      !originalRequest ||
      originalRequest._skipAuthRefresh ||
      originalRequest._retry ||
      status !== 401 ||
      requestUrl.includes("/api/auth/refresh")
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const refreshed = await api.post<AccessTokenResponse>(
        "/api/auth/refresh",
        undefined,
        { _skipAuthRefresh: true } as RetriableRequestConfig,
      );
      setAccessToken(refreshed.data.accessToken);

      const nextHeaders = AxiosHeaders.from(originalRequest.headers);
      nextHeaders.set("Authorization", `Bearer ${refreshed.data.accessToken}`);
      originalRequest.headers = nextHeaders;

      return api(originalRequest);
    } catch (refreshError) {
      setAccessToken(null);
      return Promise.reject(refreshError);
    }
  },
);
