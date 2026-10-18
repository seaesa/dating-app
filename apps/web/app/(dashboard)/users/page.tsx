"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Check from "lucide-react-native/icons/check";
import ChevronLeft from "lucide-react-native/icons/chevron-left";
import ChevronRight from "lucide-react-native/icons/chevron-right";
import CircleAlert from "lucide-react-native/icons/circle-alert";
import Crown from "lucide-react-native/icons/crown";
import RefreshCw from "lucide-react-native/icons/refresh-cw";
import Search from "lucide-react-native/icons/search";
import ShieldAlert from "lucide-react-native/icons/shield-alert";
import UserCheck from "lucide-react-native/icons/user-check";
import UserX from "lucide-react-native/icons/user-x";
import X from "lucide-react-native/icons/x";
import * as React from "react";

import {
  adminUsersQuery,
  banAdminUser,
  type AdminUserListItem,
} from "@repo/api-contract";
import { Badge, Icon, Input, Label, Text } from "@repo/ui";

const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
};

const formatGender = (gender?: string | null) => {
  if (!gender) return "-";
  const g = gender.toLowerCase();
  if (g === "male" || g === "nam") return "Nam";
  if (g === "female" || g === "nu" || g === "nữ") return "Nữ";
  return "Khác";
};

export default function AdminUsersPage() {
  const queryClient = useQueryClient();

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [vipFilter, setVipFilter] = React.useState<"all" | "true" | "false">("all");
  const [statusFilter, setStatusFilter] = React.useState<"all" | "active" | "suspended">(
    "all",
  );

  // Debounce search input
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const {
    data: usersData,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery(
    adminUsersQuery({
      page,
      limit: 10,
      search: debouncedSearch || undefined,
      isVip: vipFilter === "all" ? undefined : vipFilter === "true",
      status: statusFilter === "all" ? undefined : statusFilter,
    }),
  );

  // Modal Ban / Unban State
  const [targetUser, setTargetUser] = React.useState<AdminUserListItem | null>(null);
  const [banReason, setBanReason] = React.useState("");
  const [feedback, setFeedback] = React.useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const banMutation = useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) =>
      banAdminUser(userId, { reason }),
    onSuccess: (updated) => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "dashboard", "stats"] });
      setTargetUser(null);
      setBanReason("");
      const isSuspended = updated.status === "suspended";
      setFeedback({
        type: "success",
        message: isSuspended
          ? `Đã khóa tài khoản '${updated.displayName}' thành công!`
          : `Đã mở khóa tài khoản '${updated.displayName}' thành công!`,
      });
    },
    onError: (err: unknown) => {
      const msg =
        err && typeof err === "object" && "response" in err
          ? ((err as { response?: { data?: { detail?: string } } }).response?.data
              ?.detail ?? "Không thể thực hiện thao tác. Vui lòng thử lại sau.")
          : "Đã xảy ra lỗi khi kết nối đến máy chủ.";
      setFeedback({ type: "error", message: msg });
    },
  });

  const handleOpenBanModal = (user: AdminUserListItem) => {
    setTargetUser(user);
    setBanReason(
      user.status === "suspended"
        ? "Đã xác minh tài khoản hợp lệ, mở khóa phục hồi dịch vụ"
        : "Vi phạm tiêu chuẩn cộng đồng hoặc thông tin hồ sơ giả mạo",
    );
    setFeedback(null);
  };

  const handleConfirmBanToggle = async () => {
    if (!targetUser) return;
    if (!banReason.trim()) {
      setFeedback({
        type: "error",
        message: "Vui lòng nhập lý do khóa hoặc mở khóa tài khoản.",
      });
      return;
    }

    await banMutation.mutateAsync({
      userId: targetUser.id,
      reason: banReason.trim(),
    });
  };

  const totalPages = usersData?.totalPages ?? 1;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      {/* Header Bar */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="flex flex-col gap-1">
          <div className="flex flex-row items-center gap-2">
            <h2 className="text-foreground text-2xl font-bold tracking-tight">
              Quản Lý Người Dùng & Kiểm Duyệt
            </h2>
            <Badge variant="secondary" className="px-2.5 py-0.5">
              <Text className="text-xs font-semibold">
                {usersData?.total ?? 0} Thành Viên
              </Text>
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            Tra cứu tài khoản người dùng, trạng thái gói VIP và kiểm duyệt khóa tài khoản
            vi phạm tiêu chuẩn.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void refetch()}
          disabled={isRefetching}
          className="border-border bg-card hover:bg-muted text-foreground flex shrink-0 flex-row items-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-semibold transition-colors disabled:opacity-50"
        >
          <Icon
            as={RefreshCw}
            size={14}
            className={`text-muted-foreground ${isRefetching ? "animate-spin" : ""}`}
          />
          <span>Làm mới</span>
        </button>
      </div>

      {/* Feedback Banner */}
      {feedback ? (
        <div
          className={`flex flex-row items-center justify-between rounded-xl border p-4 ${
            feedback.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "border-destructive/30 bg-destructive/10 text-destructive"
          }`}
        >
          <div className="flex flex-row items-center gap-2.5">
            <Icon
              as={feedback.type === "success" ? Check : CircleAlert}
              size={18}
              className="text-current shrink-0"
            />
            <span className="text-sm font-medium">{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-current hover:opacity-70 p-1"
          >
            <Icon as={X} size={14} className="text-current" />
          </button>
        </div>
      ) : null}

      {/* Filters & Search Toolbar */}
      <div className="border-border bg-card flex flex-col justify-between gap-4 rounded-2xl border p-4 shadow-sm lg:flex-row lg:items-center">
        {/* Search Input */}
        <div className="relative w-full lg:w-80">
          <div className="absolute left-3 top-2.5 pointer-events-none">
            <Icon as={Search} size={15} className="text-muted-foreground" />
          </div>
          <Input
            accessibilityLabel="Tìm kiếm theo số điện thoại hoặc tên"
            placeholder="Tìm theo SĐT hoặc Nickname..."
            value={searchInput}
            onChangeText={setSearchInput}
            className="pl-9 h-9 text-xs"
          />
          {searchInput ? (
            <button
              type="button"
              onClick={() => setSearchInput("")}
              className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
            >
              <Icon as={X} size={14} className="text-current" />
            </button>
          ) : null}
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* VIP Filter */}
          <div className="flex flex-row items-center gap-1.5">
            <span className="text-muted-foreground text-xs font-semibold">Gói VIP:</span>
            <div className="bg-muted/50 border-border flex rounded-lg border p-0.5 text-xs">
              <button
                type="button"
                onClick={() => {
                  setVipFilter("all");
                  setPage(1);
                }}
                className={`rounded-md px-2.5 py-1 font-semibold transition-all ${
                  vipFilter === "all"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Tất cả
              </button>
              <button
                type="button"
                onClick={() => {
                  setVipFilter("true");
                  setPage(1);
                }}
                className={`rounded-md px-2.5 py-1 font-semibold transition-all ${
                  vipFilter === "true"
                    ? "bg-card text-amber-500 shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Có VIP
              </button>
              <button
                type="button"
                onClick={() => {
                  setVipFilter("false");
                  setPage(1);
                }}
                className={`rounded-md px-2.5 py-1 font-semibold transition-all ${
                  vipFilter === "false"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Thường
              </button>
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex flex-row items-center gap-1.5">
            <span className="text-muted-foreground text-xs font-semibold">
              Trạng thái:
            </span>
            <div className="bg-muted/50 border-border flex rounded-lg border p-0.5 text-xs">
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("all");
                  setPage(1);
                }}
                className={`rounded-md px-2.5 py-1 font-semibold transition-all ${
                  statusFilter === "all"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Tất cả
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("active");
                  setPage(1);
                }}
                className={`rounded-md px-2.5 py-1 font-semibold transition-all ${
                  statusFilter === "active"
                    ? "bg-card text-emerald-600 dark:text-emerald-400 shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Hoạt động
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("suspended");
                  setPage(1);
                }}
                className={`rounded-md px-2.5 py-1 font-semibold transition-all ${
                  statusFilter === "suspended"
                    ? "bg-card text-destructive shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Bị khóa
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="border-border bg-card flex flex-col gap-4 rounded-2xl border p-6 shadow-sm">
        <div className="border-border overflow-hidden rounded-xl border">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] text-left text-sm">
              <thead className="bg-muted/50 border-border border-b text-xs uppercase text-muted-foreground">
                <tr>
                  <th
                    scope="col"
                    className="px-4 py-3 font-semibold whitespace-nowrap min-w-[180px]"
                  >
                    Thành Viên
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 font-semibold whitespace-nowrap min-w-[130px]"
                  >
                    Số Điện Thoại
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 font-semibold whitespace-nowrap min-w-[120px]"
                  >
                    Giới Tính / Tuổi
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 font-semibold whitespace-nowrap min-w-[110px]"
                  >
                    Khu Vực
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 font-semibold whitespace-nowrap min-w-[110px]"
                  >
                    Gói VIP
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 font-semibold whitespace-nowrap min-w-[110px]"
                  >
                    Trạng Thái
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 font-semibold whitespace-nowrap min-w-[110px]"
                  >
                    Ngày Tạo
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-right font-semibold whitespace-nowrap min-w-[100px]"
                  >
                    Thao Tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="text-muted-foreground px-4 py-8 text-center text-xs"
                    >
                      Đang tải danh sách tài khoản người dùng...
                    </td>
                  </tr>
                ) : !usersData?.items || usersData.items.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="text-muted-foreground px-4 py-8 text-center text-xs"
                    >
                      Không tìm thấy người dùng nào phù hợp với điều kiện tìm kiếm.
                    </td>
                  </tr>
                ) : (
                  usersData.items.map((user) => {
                    const isSuspended = user.status === "suspended";

                    return (
                      <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3.5 min-w-[180px]">
                          <div className="flex flex-row items-center gap-2.5">
                            <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-primary">
                              {user.displayName
                                ? user.displayName.slice(0, 1).toUpperCase()
                                : "U"}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-foreground font-bold text-xs">
                                {user.displayName || "Chưa đặt tên"}
                              </span>
                              <span className="text-muted-foreground font-mono text-[10px]">
                                ID: {user.id.slice(-6)}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="text-foreground px-4 py-3.5 font-mono text-xs whitespace-nowrap min-w-[130px]">
                          {user.phone}
                        </td>

                        <td className="text-muted-foreground px-4 py-3.5 text-xs whitespace-nowrap min-w-[120px]">
                          {formatGender(user.gender)}
                          {user.age ? `, ${user.age} tuổi` : ""}
                        </td>

                        <td className="text-muted-foreground px-4 py-3.5 text-xs whitespace-nowrap min-w-[110px]">
                          {user.city || "-"}
                        </td>

                        <td className="px-4 py-3.5 whitespace-nowrap min-w-[110px]">
                          {user.isVip ? (
                            <div className="flex flex-col">
                              <Badge
                                variant="default"
                                className="bg-amber-500 hover:bg-amber-600 px-2 py-0.5 w-fit"
                              >
                                <Icon as={Crown} size={10} className="text-white mr-1" />
                                <Text className="text-[10px] font-bold text-white uppercase">
                                  VIP
                                </Text>
                              </Badge>
                              {user.vipExpiresAt ? (
                                <span className="text-muted-foreground text-[10px] mt-0.5">
                                  Hạn: {formatDate(user.vipExpiresAt)}
                                </span>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">Thường</span>
                          )}
                        </td>

                        <td className="px-4 py-3.5 whitespace-nowrap min-w-[110px]">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                              isSuspended
                                ? "border-destructive/30 bg-destructive/10 text-destructive"
                                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                isSuspended ? "bg-destructive" : "bg-emerald-500"
                              }`}
                            />
                            <span>{isSuspended ? "Bị khóa" : "Hoạt động"}</span>
                          </span>
                        </td>

                        <td className="text-muted-foreground px-4 py-3.5 text-xs whitespace-nowrap min-w-[110px]">
                          {formatDate(user.createdAt)}
                        </td>

                        <td className="px-4 py-3.5 text-right whitespace-nowrap min-w-[100px]">
                          <button
                            type="button"
                            onClick={() => handleOpenBanModal(user)}
                            className={`inline-flex flex-row items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors ${
                              isSuspended
                                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                                : "border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20"
                            }`}
                          >
                            <Icon
                              as={isSuspended ? UserCheck : UserX}
                              size={12}
                              className="text-current"
                            />
                            <span>{isSuspended ? "Mở khóa" : "Khóa"}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination Bar */}
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center pt-2">
          <span className="text-muted-foreground text-xs">
            Trang <strong className="text-foreground">{page}</strong> trên{" "}
            <strong className="text-foreground">{totalPages}</strong> (Tổng{" "}
            <strong className="text-foreground">{usersData?.total ?? 0}</strong> tài
            khoản)
          </span>

          <div className="flex flex-row items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || isLoading}
              className="border-border bg-background hover:bg-muted text-foreground flex flex-row items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-40"
            >
              <Icon as={ChevronLeft} size={14} className="text-muted-foreground" />
              <span>Trước</span>
            </button>

            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || isLoading}
              className="border-border bg-background hover:bg-muted text-foreground flex flex-row items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-40"
            >
              <span>Sau</span>
              <Icon as={ChevronRight} size={14} className="text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>

      {/* BAN / UNBAN MODAL */}
      {targetUser ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="border-border bg-card w-full max-w-md rounded-2xl border p-6 shadow-2xl">
            {/* Modal Header */}
            <div className="flex flex-row items-center justify-between border-b border-border pb-4">
              <div className="flex flex-row items-center gap-2.5">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                    targetUser.status === "suspended"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "bg-destructive/10 text-destructive"
                  }`}
                >
                  <Icon
                    as={targetUser.status === "suspended" ? UserCheck : ShieldAlert}
                    size={20}
                    className="text-current"
                  />
                </div>
                <div className="flex flex-col">
                  <h3 className="text-foreground text-base font-bold">
                    {targetUser.status === "suspended"
                      ? "Mở Khóa Tài Khoản Người Dùng"
                      : "Khóa Tài Khoản Người Dùng"}
                  </h3>
                  <span className="text-muted-foreground text-xs">
                    {targetUser.displayName} ({targetUser.phone})
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTargetUser(null)}
                className="text-muted-foreground hover:text-foreground p-1"
              >
                <Icon as={X} size={18} className="text-current" />
              </button>
            </div>

            {/* Warning Callout */}
            <div className="my-4 border-destructive/20 bg-destructive/5 flex flex-row items-start gap-2.5 rounded-lg border p-3">
              <Icon
                as={CircleAlert}
                size={16}
                className="text-destructive shrink-0 mt-0.5"
              />
              <span className="text-muted-foreground text-xs leading-relaxed">
                {targetUser.status === "suspended"
                  ? "Xác nhận mở khóa tài khoản sẽ cho phép người dùng đăng nhập lại vào ứng dụng di động."
                  : "CẢNH BÁO: Khi bị khóa, người dùng sẽ lập tức bị hủy phiên đăng nhập trên ứng dụng di động và không thể tiếp tục nhắn tin hay ghép đôi."}
              </span>
            </div>

            {/* Reason Field */}
            <div className="flex flex-col gap-1.5">
              <Label nativeID="ban-reason-input">Lý Do Thao Tác (Bắt buộc)</Label>
              <Input
                accessibilityLabel="Lý Do Thao Tác"
                accessibilityLabelledBy="ban-reason-input"
                placeholder="Nhập lý do chi tiết..."
                value={banReason}
                onChangeText={setBanReason}
                editable={!banMutation.isPending}
              />
              <span className="text-muted-foreground text-[10px]">
                Lý do này sẽ được ghi vào Nhật ký Kiểm toán (Audit Log) để phục vụ kiểm
                tra
              </span>
            </div>

            {/* Modal Actions */}
            <div className="mt-6 flex flex-row justify-end gap-3 border-t border-border pt-4">
              <button
                type="button"
                onClick={() => setTargetUser(null)}
                className="border-border bg-background hover:bg-muted text-foreground rounded-lg border px-4 py-2 text-xs font-semibold transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmBanToggle}
                disabled={banMutation.isPending}
                className={`flex flex-row items-center gap-1.5 rounded-lg px-5 py-2 text-xs font-bold text-white transition-all shadow-sm disabled:opacity-50 ${
                  targetUser.status === "suspended"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-destructive hover:bg-destructive/90"
                }`}
              >
                {banMutation.isPending ? (
                  <Icon as={RefreshCw} size={14} className="text-white animate-spin" />
                ) : (
                  <Icon
                    as={targetUser.status === "suspended" ? UserCheck : UserX}
                    size={14}
                    className="text-white"
                  />
                )}
                <span>
                  {banMutation.isPending
                    ? "Đang xử lý..."
                    : targetUser.status === "suspended"
                      ? "Xác Nhận Mở Khóa"
                      : "Xác Nhận Khóa Tài Khoản"}
                </span>
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
