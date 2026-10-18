import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";

import { http } from "./client";
import type {
  AdminAuditLogPage,
  AdminDashboardStatsRead,
  AdminLoginRequest,
  AdminManualActivateRequest,
  AdminMeRead,
  AdminOrderPage,
  AdminOrderRead,
  AdminPlanCreate,
  AdminPlanRead,
  AdminPlanUpdate,
  AdminSystemConfigRead,
  AdminSystemConfigUpdate,
  AdminTokenResponse,
  AdminUserBanRequest,
  AdminUserListItem,
  AdminUserPage,
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
  MembershipConfigRead,
  Message,
  MessagePage,
  MessageRead,
  OrderCreate,
  OrderRead,
  OrderStatus,
  OrderStatusRead,
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

// Membership & Payments

export const getMembershipConfig = () =>
  http.get<MembershipConfigRead>("/v1/membership/config").then((r) => r.data);

export const membershipConfigQuery = () =>
  queryOptions({
    queryKey: ["membership", "config"],
    queryFn: getMembershipConfig,
    staleTime: 60 * 1000,
  });

export const createOrder = (body: OrderCreate) =>
  http.post<OrderRead>("/v1/orders", body).then((r) => r.data);

export const getOrder = (orderId: string) =>
  http.get<OrderRead>(`/v1/orders/${encodeURIComponent(orderId)}`).then((r) => r.data);

export const orderQuery = (orderId: string) =>
  queryOptions({
    queryKey: ["orders", orderId],
    queryFn: () => getOrder(orderId),
  });

export const getOrderStatus = (orderId: string) =>
  http
    .get<OrderStatusRead>(`/v1/orders/${encodeURIComponent(orderId)}/status`)
    .then((r) => r.data);

export const orderStatusQuery = (orderId: string) =>
  queryOptions({
    queryKey: ["orders", orderId, "status"],
    queryFn: () => getOrderStatus(orderId),
  });

// Admin Auth

export const adminLogin = (body: AdminLoginRequest) =>
  http.post<AdminTokenResponse>("/v1/admin/auth/login", body).then((r) => r.data);

export const getAdminMe = (token?: string) =>
  http
    .get<AdminMeRead>(
      "/v1/admin/auth/me",
      token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
    )
    .then((r) => r.data);

export const adminMeQuery = (token?: string) =>
  queryOptions({
    queryKey: ["admin", "me", token],
    queryFn: () => getAdminMe(token),
  });

// Admin Membership Plans

export const getAdminPlans = (token?: string) =>
  http
    .get<AdminPlanRead[]>(
      "/v1/admin/membership/plans",
      token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
    )
    .then((r) => r.data);

export const adminPlansQuery = (token?: string) =>
  queryOptions({
    queryKey: ["admin", "membership", "plans", token],
    queryFn: () => getAdminPlans(token),
  });

export const createAdminPlan = (body: AdminPlanCreate, token?: string) =>
  http
    .post<AdminPlanRead>(
      "/v1/admin/membership/plans",
      body,
      token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
    )
    .then((r) => r.data);

export const updateAdminPlan = (code: string, body: AdminPlanUpdate, token?: string) =>
  http
    .put<AdminPlanRead>(
      `/v1/admin/membership/plans/${encodeURIComponent(code)}`,
      body,
      token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
    )
    .then((r) => r.data);

export const deleteAdminPlan = (code: string, hardDelete?: boolean, token?: string) =>
  http
    .delete<Message>(`/v1/admin/membership/plans/${encodeURIComponent(code)}`, {
      params: hardDelete ? { hard_delete: true } : undefined,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
    .then((r) => r.data);

// Admin System Config

export const getAdminSystemConfig = (token?: string) =>
  http
    .get<AdminSystemConfigRead>(
      "/v1/admin/system-config",
      token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
    )
    .then((r) => r.data);

export const adminSystemConfigQuery = (token?: string) =>
  queryOptions({
    queryKey: ["admin", "system-config", token],
    queryFn: () => getAdminSystemConfig(token),
  });

export const updateAdminSystemConfig = (body: AdminSystemConfigUpdate, token?: string) =>
  http
    .put<AdminSystemConfigRead>(
      "/v1/admin/system-config",
      body,
      token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
    )
    .then((r) => r.data);

// Admin Orders

export interface GetAdminOrdersParams {
  page?: number;
  limit?: number;
  status?: OrderStatus;
  paymentCode?: string;
  userId?: string;
}

export const getAdminOrders = (params?: GetAdminOrdersParams, token?: string) =>
  http
    .get<AdminOrderPage>("/v1/admin/orders", {
      params: {
        page: params?.page,
        limit: params?.limit,
        status: params?.status,
        payment_code: params?.paymentCode,
        user_id: params?.userId,
      },
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
    .then((r) => r.data);

export const adminOrdersQuery = (params?: GetAdminOrdersParams, token?: string) =>
  queryOptions({
    queryKey: ["admin", "orders", params, token],
    queryFn: () => getAdminOrders(params, token),
  });

export const getAdminOrderDetail = (orderId: string, token?: string) =>
  http
    .get<AdminOrderRead>(
      `/v1/admin/orders/${encodeURIComponent(orderId)}`,
      token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
    )
    .then((r) => r.data);

export const adminOrderDetailQuery = (orderId: string, token?: string) =>
  queryOptions({
    queryKey: ["admin", "orders", orderId, token],
    queryFn: () => getAdminOrderDetail(orderId, token),
  });

export const manualActivateOrder = (
  orderId: string,
  body: AdminManualActivateRequest,
  token?: string,
) =>
  http
    .post<AdminOrderRead>(
      `/v1/admin/orders/${encodeURIComponent(orderId)}/manual-activate`,
      body,
      token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
    )
    .then((r) => r.data);

export const getAdminDashboardStats = (token?: string) =>
  http
    .get<AdminDashboardStatsRead>(
      "/v1/admin/dashboard/stats",
      token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
    )
    .then((r) => r.data);

export const adminDashboardStatsQuery = (token?: string) =>
  queryOptions({
    queryKey: ["admin", "dashboard", "stats", token],
    queryFn: () => getAdminDashboardStats(token),
  });

export interface GetAdminUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  isVip?: boolean;
  status?: string;
}

export const getAdminUsers = (params?: GetAdminUsersParams, token?: string) =>
  http
    .get<AdminUserPage>("/v1/admin/users", {
      params: {
        page: params?.page,
        limit: params?.limit,
        search: params?.search,
        is_vip: params?.isVip,
        status: params?.status,
      },
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
    .then((r) => r.data);

export const adminUsersQuery = (params?: GetAdminUsersParams, token?: string) =>
  queryOptions({
    queryKey: ["admin", "users", params, token],
    queryFn: () => getAdminUsers(params, token),
  });

export const banAdminUser = (userId: string, body: AdminUserBanRequest, token?: string) =>
  http
    .post<AdminUserListItem>(
      `/v1/admin/users/${encodeURIComponent(userId)}/ban`,
      body,
      token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
    )
    .then((r) => r.data);

export interface GetAdminAuditLogsParams {
  page?: number;
  limit?: number;
  adminId?: string;
  action?: string;
  targetType?: string;
}

export const getAdminAuditLogs = (params?: GetAdminAuditLogsParams, token?: string) =>
  http
    .get<AdminAuditLogPage>("/v1/admin/audit-logs", {
      params: {
        page: params?.page,
        limit: params?.limit,
        admin_id: params?.adminId,
        action: params?.action,
        target_type: params?.targetType,
      },
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
    .then((r) => r.data);

export const adminAuditLogsQuery = (params?: GetAdminAuditLogsParams, token?: string) =>
  queryOptions({
    queryKey: ["admin", "audit-logs", params, token],
    queryFn: () => getAdminAuditLogs(params, token),
  });
