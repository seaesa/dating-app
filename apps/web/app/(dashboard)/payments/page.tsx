"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Check from "lucide-react-native/icons/check";
import ChevronLeft from "lucide-react-native/icons/chevron-left";
import ChevronRight from "lucide-react-native/icons/chevron-right";
import CircleAlert from "lucide-react-native/icons/circle-alert";
import Clock from "lucide-react-native/icons/clock";
import CreditCard from "lucide-react-native/icons/credit-card";
import RefreshCw from "lucide-react-native/icons/refresh-cw";
import Search from "lucide-react-native/icons/search";
import ShieldCheck from "lucide-react-native/icons/shield-check";
import X from "lucide-react-native/icons/x";
import * as React from "react";

import {
  adminOrdersQuery,
  manualActivateOrder,
  type AdminOrderRead,
  type OrderStatus,
} from "@repo/api-contract";
import { Badge, Icon, Input, Label, Text } from "@repo/ui";

const formatVnd = (amount: number) => `${amount.toLocaleString("vi-VN")} ₫`;

const formatDate = (dateStr: string) => {
  try {
    const d = new Date(dateStr);
    return d.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
};

const STATUS_TABS: { id: OrderStatus | "all"; label: string }[] = [
  { id: "all", label: "Tất cả đơn" },
  { id: "pending", label: "Chờ thanh toán" },
  { id: "paid", label: "Đã thanh toán" },
  { id: "manual_paid", label: "Duyệt thủ công" },
  { id: "expired", label: "Đã hết hạn" },
];

const getStatusBadge = (status: OrderStatus) => {
  switch (status) {
    case "paid":
      return {
        label: "Đã thanh toán",
        colorClass:
          "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
      };
    case "manual_paid":
      return {
        label: "Duyệt thủ công",
        colorClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
      };
    case "pending":
      return {
        label: "Chờ thanh toán",
        colorClass:
          "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
      };
    case "expired":
      return {
        label: "Đã hết hạn",
        colorClass: "bg-muted text-muted-foreground border-border",
      };
    default:
      return {
        label: status,
        colorClass: "bg-muted text-muted-foreground border-border",
      };
  }
};

export default function AdminPaymentsPage() {
  const queryClient = useQueryClient();

  const [page, setPage] = React.useState(1);
  const [statusFilter, setStatusFilter] = React.useState<OrderStatus | "all">("all");
  const [searchInput, setSearchInput] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");

  // Debounce search input
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const {
    data: ordersData,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery(
    adminOrdersQuery({
      page,
      limit: 10,
      status: statusFilter === "all" ? undefined : statusFilter,
      paymentCode: debouncedSearch.startsWith("TD") ? debouncedSearch : undefined,
      userId:
        !debouncedSearch.startsWith("TD") && debouncedSearch
          ? debouncedSearch
          : undefined,
    }),
  );

  // Manual Activation Modal State
  const [selectedOrder, setSelectedOrder] = React.useState<AdminOrderRead | null>(null);
  const [activationNote, setActivationNote] = React.useState("");
  const [feedback, setFeedback] = React.useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const activateMutation = useMutation({
    mutationFn: ({ orderId, note }: { orderId: string; note: string }) =>
      manualActivateOrder(orderId, { note }),
    onSuccess: (order) => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "dashboard", "stats"] });
      setSelectedOrder(null);
      setActivationNote("");
      setFeedback({
        type: "success",
        message: `Đã kích hoạt thủ công thành công đơn hàng '${order.paymentCode}'!`,
      });
    },
    onError: (err: unknown) => {
      const msg =
        err && typeof err === "object" && "response" in err
          ? ((err as { response?: { data?: { detail?: string } } }).response?.data
              ?.detail ?? "Không thể kích hoạt đơn hàng. Vui lòng kiểm tra lại.")
          : "Đã xảy ra lỗi khi duyệt đơn hàng.";
      setFeedback({ type: "error", message: msg });
    },
  });

  const handleOpenActivateModal = (order: AdminOrderRead) => {
    setSelectedOrder(order);
    setActivationNote("Khách gửi biên lai chuyển khoản ngân hàng qua hỗ trợ");
    setFeedback(null);
  };

  const handleConfirmActivation = async () => {
    if (!selectedOrder) return;
    if (!activationNote.trim()) {
      setFeedback({ type: "error", message: "Vui lòng nhập lý do duyệt đơn thủ công." });
      return;
    }

    await activateMutation.mutateAsync({
      orderId: selectedOrder.id,
      note: activationNote.trim(),
    });
  };

  const totalPages = ordersData?.totalPages ?? 1;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      {/* Header Bar */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="flex flex-col gap-1">
          <div className="flex flex-row items-center gap-2">
            <h2 className="text-foreground text-2xl font-bold tracking-tight">
              Quản Trị Đơn Hàng & Đối Soát VietQR
            </h2>
            <Badge variant="secondary" className="px-2.5 py-0.5">
              <Text className="text-xs font-semibold">
                {ordersData?.total ?? 0} Đơn Hàng
              </Text>
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            Tra cứu lịch sử thanh toán, đối soát mã chuyển khoản TD và duyệt đơn kích hoạt
            VIP thủ công.
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
      <div className="border-border bg-card flex flex-col justify-between gap-4 rounded-2xl border p-4 shadow-sm md:flex-row md:items-center">
        {/* Status Filter Tabs */}
        <div className="bg-muted/50 border-border flex flex-wrap gap-1 rounded-xl border p-1">
          {STATUS_TABS.map((tab) => {
            const active = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setStatusFilter(tab.id);
                  setPage(1);
                }}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                  active
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <div className="absolute left-3 top-2.5 pointer-events-none">
            <Icon as={Search} size={15} className="text-muted-foreground" />
          </div>
          <Input
            accessibilityLabel="Tìm kiếm theo mã chuyển khoản hoặc ID"
            placeholder="Tìm theo mã TD hoặc ID khách..."
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
      </div>

      {/* Orders Table */}
      <div className="border-border bg-card flex flex-col gap-4 rounded-2xl border p-6 shadow-sm">
        <div className="border-border overflow-hidden rounded-xl border">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-muted/50 border-border border-b text-xs uppercase text-muted-foreground">
                <tr>
                  <th
                    scope="col"
                    className="px-4 py-3 font-semibold whitespace-nowrap min-w-[150px]"
                  >
                    Mã Chuyển Khoản
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 font-semibold whitespace-nowrap min-w-[140px]"
                  >
                    Khách Hàng
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
                    Số Tiền
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 font-semibold whitespace-nowrap min-w-[120px]"
                  >
                    Thời Gian Tạo
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 font-semibold whitespace-nowrap min-w-[120px]"
                  >
                    Trạng Thái
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-right font-semibold whitespace-nowrap min-w-[120px]"
                  >
                    Thao Tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="text-muted-foreground px-4 py-8 text-center text-xs"
                    >
                      Đang tải danh sách đơn hàng...
                    </td>
                  </tr>
                ) : !ordersData?.items || ordersData.items.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="text-muted-foreground px-4 py-8 text-center text-xs"
                    >
                      Không tìm thấy đơn hàng nào phù hợp với bộ lọc hiện tại.
                    </td>
                  </tr>
                ) : (
                  ordersData.items.map((order) => {
                    const badge = getStatusBadge(order.status);
                    const canActivate =
                      order.status === "pending" || order.status === "expired";

                    return (
                      <tr key={order.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3.5 whitespace-nowrap min-w-[150px]">
                          <div className="flex flex-col">
                            <span className="text-foreground font-mono text-xs font-bold">
                              {order.paymentCode || order.id.slice(-8)}
                            </span>
                            <span className="text-muted-foreground font-mono text-[10px]">
                              ID: {order.id.slice(-6)}
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-3.5 whitespace-nowrap min-w-[140px]">
                          <div className="flex flex-col">
                            <span className="text-foreground text-xs font-semibold">
                              {order.userPhone || (
                                <span className="font-mono text-muted-foreground">
                                  Chưa có SĐT
                                </span>
                              )}
                            </span>
                            <span className="text-muted-foreground font-mono text-[10px]">
                              UID: {order.userId.slice(-6)}
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-3.5 whitespace-nowrap min-w-[110px]">
                          <span className="bg-secondary text-secondary-foreground rounded-md px-2 py-0.5 text-xs font-semibold uppercase">
                            {order.planName || order.planCode}
                          </span>
                        </td>

                        <td className="text-foreground px-4 py-3.5 text-xs font-bold whitespace-nowrap min-w-[110px]">
                          {formatVnd(order.amount)}
                        </td>

                        <td className="text-muted-foreground px-4 py-3.5 text-xs whitespace-nowrap min-w-[120px]">
                          {formatDate(order.createdAt)}
                        </td>

                        <td className="px-4 py-3.5 whitespace-nowrap min-w-[120px]">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${badge.colorClass}`}
                          >
                            {order.status === "paid" || order.status === "manual_paid" ? (
                              <Icon as={Check} size={11} className="text-current" />
                            ) : order.status === "pending" ? (
                              <Icon as={Clock} size={11} className="text-current" />
                            ) : null}
                            <span>{badge.label}</span>
                          </span>
                        </td>

                        <td className="px-4 py-3.5 text-right whitespace-nowrap min-w-[120px]">
                          {canActivate ? (
                            <button
                              type="button"
                              onClick={() => handleOpenActivateModal(order)}
                              className="border-primary/40 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg border px-2.5 py-1 text-xs font-bold transition-colors"
                            >
                              Duyệt thủ công
                            </button>
                          ) : (
                            <span className="text-muted-foreground text-xs italic">
                              Đã xử lý
                            </span>
                          )}
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
            <strong className="text-foreground">{ordersData?.total ?? 0}</strong> đơn
            hàng)
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

      {/* MANUAL ACTIVATION MODAL */}
      {selectedOrder ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="border-border bg-card w-full max-w-md rounded-2xl border p-6 shadow-2xl">
            {/* Modal Header */}
            <div className="flex flex-row items-center justify-between border-b border-border pb-4">
              <div className="flex flex-row items-center gap-2.5">
                <div className="bg-primary/10 flex h-9 w-9 items-center justify-center rounded-xl">
                  <Icon as={ShieldCheck} size={20} className="text-primary" />
                </div>
                <div className="flex flex-col">
                  <h3 className="text-foreground text-base font-bold">
                    Duyệt Đơn Thanh Toán Thủ Công
                  </h3>
                  <span className="text-muted-foreground text-xs font-mono">
                    {selectedOrder.paymentCode}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="text-muted-foreground hover:text-foreground p-1"
              >
                <Icon as={X} size={18} className="text-current" />
              </button>
            </div>

            {/* Modal Summary */}
            <div className="my-4 flex flex-col gap-2 rounded-xl bg-muted/40 p-3.5 text-xs">
              <div className="flex flex-row justify-between">
                <span className="text-muted-foreground">Khách hàng:</span>
                <span className="text-foreground font-semibold">
                  {selectedOrder.userPhone || selectedOrder.userId}
                </span>
              </div>
              <div className="flex flex-row justify-between">
                <span className="text-muted-foreground">Gói cước:</span>
                <span className="text-foreground font-semibold uppercase">
                  {selectedOrder.planName || selectedOrder.planCode}
                </span>
              </div>
              <div className="flex flex-row justify-between">
                <span className="text-muted-foreground">Số tiền:</span>
                <span className="text-foreground font-bold text-sm">
                  {formatVnd(selectedOrder.amount)}
                </span>
              </div>
              <div className="flex flex-row justify-between">
                <span className="text-muted-foreground">Trạng thái hiện tại:</span>
                <span className="font-semibold capitalize text-amber-500">
                  {selectedOrder.status}
                </span>
              </div>
            </div>

            {/* Warning Callout */}
            <div className="border-primary/20 bg-primary/5 mb-4 flex flex-row items-start gap-2.5 rounded-lg border p-3">
              <Icon as={CircleAlert} size={16} className="text-primary shrink-0 mt-0.5" />
              <span className="text-muted-foreground text-xs leading-relaxed">
                Thao tác này sẽ xác nhận khách hàng đã chuyển khoản thành công và{" "}
                <strong>kích hoạt ngay đặc quyền VIP</strong> cho tài khoản.
              </span>
            </div>

            {/* Reason Field */}
            <div className="flex flex-col gap-1.5">
              <Label nativeID="note-input">Lý Do Duyệt Đơn (Bắt buộc)</Label>
              <Input
                accessibilityLabel="Lý Do Duyệt Đơn"
                accessibilityLabelledBy="note-input"
                placeholder="vd: Khách gửi biên lai chuyển khoản MBBank qua Zalo"
                value={activationNote}
                onChangeText={setActivationNote}
                editable={!activateMutation.isPending}
              />
              <span className="text-muted-foreground text-[10px]">
                Lý do này sẽ được ghi vào Nhật ký Kiểm toán (Audit Log)
              </span>
            </div>

            {/* Modal Actions */}
            <div className="mt-6 flex flex-row justify-end gap-3 border-t border-border pt-4">
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="border-border bg-background hover:bg-muted text-foreground rounded-lg border px-4 py-2 text-xs font-semibold transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmActivation}
                disabled={activateMutation.isPending}
                className="bg-primary hover:bg-primary/90 text-primary-foreground flex flex-row items-center gap-1.5 rounded-lg px-5 py-2 text-xs font-bold transition-all shadow-sm disabled:opacity-50"
              >
                {activateMutation.isPending ? (
                  <Icon
                    as={RefreshCw}
                    size={14}
                    className="text-primary-foreground animate-spin"
                  />
                ) : (
                  <Icon as={CreditCard} size={14} className="text-primary-foreground" />
                )}
                <span>
                  {activateMutation.isPending ? "Đang xử lý..." : "Xác Nhận Kích Hoạt"}
                </span>
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
