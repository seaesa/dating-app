import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";

import { http } from "./client";
import type {
  ChallengeRead,
  CloseBody,
  ConnectionPage,
  ConnectionRead,
  DiscoveryCountRead,
  DiscoveryFeedRead,
  GetDiscoveryCountData,
  GetDiscoveryFeedData,
  InteractionCreate,
  InteractionResultRead,
  MatchCriteria,
  Message,
  MessagePage,
  MessageRead,
  OtpRequestBody,
  OtpRequestResponse,
  OtpVerifyBody,
  PrivateIdentityUpdate,
  ProfileOptionsRead,
  PublicProfileUpdate,
  PushDeviceBody,
  ReceivedInteractionRead,
  RevealKind,
  SendMessageBody,
  SensitiveAttributes,
  SubmitBody,
  TokenPair,
  UnreadCountRead,
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

export const getReceivedInteractions = (limit = 50) =>
  http
    .get<ReceivedInteractionRead[]>("/v1/interactions/received", {
      params: { limit },
    })
    .then((r) => r.data);

export const receivedInteractionsQuery = (limit = 50) =>
  queryOptions({
    queryKey: ["interactions", "received", limit],
    queryFn: () => getReceivedInteractions(limit),
  });

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

// Chat

const connectionPath = (connectionId: string) =>
  `/v1/connections/${encodeURIComponent(connectionId)}`;

export const listConnections = (cursor?: string) =>
  http.get<ConnectionPage>("/v1/connections", { params: { cursor } }).then((r) => r.data);

export const getUnreadCount = () =>
  http.get<UnreadCountRead>("/v1/connections/unread-count").then((r) => r.data);

export const getConnection = (connectionId: string) =>
  http.get<ConnectionRead>(connectionPath(connectionId)).then((r) => r.data);

export const listMessages = (connectionId: string, cursor?: string) =>
  http
    .get<MessagePage>(`${connectionPath(connectionId)}/messages`, {
      params: { cursor, limit: 30 },
    })
    .then((r) => r.data);

export const sendMessage = (connectionId: string, body: SendMessageBody) =>
  http
    .post<MessageRead>(`${connectionPath(connectionId)}/messages`, body)
    .then((r) => r.data);

export const markConnectionRead = (connectionId: string, lastReadId: string) =>
  http
    .post<void>(`${connectionPath(connectionId)}/read`, { lastReadId })
    .then(() => undefined);

export const requestReveal = (connectionId: string, kind: RevealKind) =>
  http
    .post<ConnectionRead>(`${connectionPath(connectionId)}/reveals/${kind}`)
    .then((r) => r.data);

export const acceptReveal = (connectionId: string, kind: RevealKind) =>
  http
    .post<ConnectionRead>(`${connectionPath(connectionId)}/reveals/${kind}/accept`)
    .then((r) => r.data);

export const declineReveal = (connectionId: string, kind: RevealKind) =>
  http
    .post<ConnectionRead>(`${connectionPath(connectionId)}/reveals/${kind}/decline`)
    .then((r) => r.data);

export const closeConnection = (connectionId: string, body: CloseBody) =>
  http.post<void>(`${connectionPath(connectionId)}/close`, body).then(() => undefined);

export const registerPushDevice = (body: PushDeviceBody) =>
  http.put<void>("/v1/me/push-devices", body).then(() => undefined);

export const unregisterPushDevice = (token: string) =>
  http
    .delete<void>(`/v1/me/push-devices/${encodeURIComponent(token)}`)
    .then(() => undefined);

// Keys: ["connections", "list" | "unread" | id, ...]. A room's messages live
// under its id, so invalidating ["connections"] refreshes everything chat.
export const connectionsQuery = () =>
  infiniteQueryOptions({
    queryKey: ["connections", "list"],
    queryFn: ({ pageParam }) => listConnections(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });

export const unreadCountQuery = () =>
  queryOptions({ queryKey: ["connections", "unread"], queryFn: getUnreadCount });

export const connectionQuery = (connectionId: string) =>
  queryOptions({
    queryKey: ["connections", connectionId],
    queryFn: () => getConnection(connectionId),
  });

export const messagesQuery = (connectionId: string) =>
  infiniteQueryOptions({
    queryKey: ["connections", connectionId, "messages"],
    queryFn: ({ pageParam }) => listMessages(connectionId, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
