import { queryOptions } from "@tanstack/react-query";

import { http } from "./client";
import type {
  Message,
  OtpRequestBody,
  OtpRequestResponse,
  OtpVerifyBody,
  PrivateIdentityUpdate,
  PublicProfileUpdate,
  TokenPair,
  UploadUrlBody,
  UploadUrlResponse,
  UserRead,
} from "./generated/types.gen";

// One function per endpoint, returning the response body.

export const requestOtp = (body: OtpRequestBody) =>
  http.post<OtpRequestResponse>("/v1/auth/otp/request", body).then((r) => r.data);

export const verifyOtp = (body: OtpVerifyBody) =>
  http.post<TokenPair>("/v1/auth/otp/verify", body).then((r) => r.data);

export const logout = (refreshToken: string) =>
  http.post<Message>("/v1/auth/logout", { refreshToken }).then((r) => r.data);

export const getMe = () => http.get<UserRead>("/v1/users/me").then((r) => r.data);

export const getUser = (userId: string) =>
  http.get<UserRead>(`/v1/users/${encodeURIComponent(userId)}`).then((r) => r.data);

export const updateMyProfile = (body: PublicProfileUpdate) =>
  http.patch<UserRead>("/v1/users/me/profile", body).then((r) => r.data);

export const updateMyIdentity = (body: PrivateIdentityUpdate) =>
  http.patch<UserRead>("/v1/users/me/identity", body).then((r) => r.data);

export const createUploadUrl = (body: UploadUrlBody) =>
  http.post<UploadUrlResponse>("/v1/media/upload-url", body).then((r) => r.data);

export const confirmUpload = (mediaId: string) =>
  http
    .post<Message>(`/v1/media/${encodeURIComponent(mediaId)}/confirm`)
    .then((r) => r.data);

// Shared query options, so both apps use the same cache keys.

export const meQuery = () => queryOptions({ queryKey: ["users", "me"], queryFn: getMe });

export const userQuery = (userId: string) =>
  queryOptions({ queryKey: ["users", userId], queryFn: () => getUser(userId) });
