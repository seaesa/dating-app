import { queryOptions } from "@tanstack/react-query";

import { http } from "./client";
import type {
  ChallengeRead,
  DiscoveryCountRead,
  DiscoveryFeedRead,
  GetDiscoveryCountData,
  GetDiscoveryFeedData,
  InteractionCreate,
  InteractionResultRead,
  MatchCriteria,
  Message,
  OtpRequestBody,
  OtpRequestResponse,
  OtpVerifyBody,
  PrivateIdentityUpdate,
  ProfileOptionsRead,
  PublicProfileUpdate,
  SensitiveAttributes,
  SubmitBody,
  TokenPair,
  UploadUrlBody,
  UploadUrlResponse,
  UserRead,
  VerificationRead,
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

export const getProfileOptions = () =>
  http.get<ProfileOptionsRead>("/v1/catalog/profile-options").then((r) => r.data);

export const updateMyCriteria = (body: MatchCriteria) =>
  http.put<UserRead>("/v1/users/me/criteria", body).then((r) => r.data);

export const completeMyOnboarding = () =>
  http.post<UserRead>("/v1/users/me/onboarding/complete").then((r) => r.data);

export const updateMySensitive = (body: SensitiveAttributes) =>
  http.patch<UserRead>("/v1/users/me/sensitive", body).then((r) => r.data);

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

// The catalog only changes with a server deploy.
export const profileOptionsQuery = () =>
  queryOptions({
    queryKey: ["catalog", "profile-options"],
    queryFn: getProfileOptions,
    staleTime: 60 * 60 * 1000,
  });

export const recordVerificationConsent = () =>
  http.post<VerificationRead>("/v1/verification/consent").then((r) => r.data);

export const createVerificationChallenge = () =>
  http.post<ChallengeRead>("/v1/verification/challenge").then((r) => r.data);

export const submitVerification = (body: SubmitBody) =>
  http.post<VerificationRead>("/v1/verification/submit", body).then((r) => r.data);

// Discovery & Matching

export const getDiscoveryFeed = (params?: GetDiscoveryFeedData["query"]) =>
  http.get<DiscoveryFeedRead>("/v1/discovery", { params }).then((r) => r.data);

export const getDiscoveryCount = (params?: GetDiscoveryCountData["query"]) =>
  http.get<DiscoveryCountRead>("/v1/discovery/count", { params }).then((r) => r.data);

export const createInteraction = (body: InteractionCreate) =>
  http.post<InteractionResultRead>("/v1/interactions", body).then((r) => r.data);

export const discoveryFeedQuery = (params?: GetDiscoveryFeedData["query"]) =>
  queryOptions({
    queryKey: ["discovery", "feed", params ?? {}],
    queryFn: () => getDiscoveryFeed(params),
  });

export const discoveryCountQuery = (params?: GetDiscoveryCountData["query"]) =>
  queryOptions({
    queryKey: ["discovery", "count", params ?? {}],
    queryFn: () => getDiscoveryCount(params),
  });
