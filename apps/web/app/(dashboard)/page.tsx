"use client";

import { useQuery } from "@tanstack/react-query";
import ArrowRight from "lucide-react-native/icons/arrow-right";
import Check from "lucide-react-native/icons/check";
import CircleAlert from "lucide-react-native/icons/circle-alert";
import Clock from "lucide-react-native/icons/clock";
import CreditCard from "lucide-react-native/icons/credit-card";
import Crown from "lucide-react-native/icons/crown";
import RefreshCw from "lucide-react-native/icons/refresh-cw";
import Settings from "lucide-react-native/icons/settings";
import TrendingUp from "lucide-react-native/icons/trending-up";
import Users from "lucide-react-native/icons/users";
import Link from "next/link";
import * as React from "react";

import {
  adminDashboardStatsQuery,
  adminOrdersQuery,
  adminSystemConfigQuery,
} from "@repo/api-contract";
import { APP_NAME } from "@repo/core";
import { Badge, Icon, Text } from "@repo/ui";

import { useAdminAuthStore } from "../../src/stores/admin-auth";

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

const getStatusBadge = (status: string) => {
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

export default function AdminOverviewPage() {
  const adminUser = useAdminAuthStore((s) => s.adminUser);

  const {
    data: stats,
    isLoading: isStatsLoading,
    refetch: refetchStats,
    isRefetching: isStatsRefetching,
  } = useQuery(adminDashboardStatsQuery());

  const {
    data: ordersData,
    isLoading: isOrdersLoading,
    refetch: refetchOrders,
  } = useQuery(adminOrdersQuery({ limit: 5 }));

  const { data: systemConfig } = useQuery(adminSystemConfigQuery());

  const handleRefresh = () => {
    void refetchStats();
    void refetchOrders();
  };

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      {/* Welcome & Quick Action Bar */}
      <div className="border-border bg-card flex flex-col justify-between gap-4 rounded-2xl border p-6 shadow-sm md:flex-row md:items-center">
        <div className="flex flex-col gap-1">
          <div className="flex flex-row items-center gap-2">
            <h2 className="text-foreground text-2xl font-bold tracking-tight">
              Bảng Điều Khiển Tổng Quan
            </h2>
            <Badge
              variant={adminUser?.role === "superadmin" ? "default" : "secondary"}
              className="px-2.5 py-0.5"
            >
              <Text className="text-xs font-semibold capitalize">
                {adminUser?.role ?? "moderator"}
              </Text>
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            Theo dõi tình hình kinh doanh, số lượng hội viên và giao dịch của hệ thống{" "}
            {APP_NAME}.
          </p>
        </div>

        <div className="flex flex-row items-center gap-3">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isStatsRefetching}
            className="border-border bg-background hover:bg-muted text-foreground flex flex-row items-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-semibold transition-colors disabled:opacity-50"
          >
            <Icon
              as={RefreshCw}
              size={14}
              className={`text-muted-foreground ${isStatsRefetching ? "animate-spin" : ""}`}
            />
            <span>Làm mới</span>
          </button>

          <Link
            href="/settings"
            className="bg-primary hover:bg-primary/90 text-primary-foreground flex flex-row items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors shadow-sm"
          >
            <Icon as={Settings} size={14} className="text-primary-foreground" />
            <span>Cấu hình hệ thống</span>
          </Link>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Tổng Doanh Thu */}
        <div className="border-border bg-card flex flex-col justify-between rounded-xl border p-5 shadow-sm">
          <div className="flex flex-row items-center justify-between">
            <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
              Tổng Doanh Thu
            </span>
            <div className="bg-emerald-500/10 flex h-9 w-9 items-center justify-center rounded-lg">
              <Icon as={CreditCard} size={18} className="text-emerald-500" />
            </div>
          </div>
          <div className="mt-3 flex flex-col gap-1">
            <span className="text-foreground text-2xl font-bold tracking-tight">
              {isStatsLoading ? "..." : formatVnd(stats?.totalRevenue ?? 0)}
            </span>
            <span className="text-muted-foreground text-xs">
              Từ các gói hội viên VIP đã thanh toán
            </span>
          </div>
        </div>

        {/* Card 2: Tổng Người Dùng */}
        <div className="border-border bg-card flex flex-col justify-between rounded-xl border p-5 shadow-sm">
          <div className="flex flex-row items-center justify-between">
            <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
              Tổng Người Dùng
            </span>
            <div className="bg-primary/10 flex h-9 w-9 items-center justify-center rounded-lg">
              <Icon as={Users} size={18} className="text-primary" />
            </div>
          </div>
          <div className="mt-3 flex flex-col gap-1">
            <span className="text-foreground text-2xl font-bold tracking-tight">
              {isStatsLoading ? "..." : (stats?.totalUsers ?? 0).toLocaleString("vi-VN")}
            </span>
            <span className="text-muted-foreground text-xs">
              Tài khoản đã đăng ký trên hệ thống
            </span>
          </div>
        </div>

        {/* Card 3: VIP Active */}
        <div className="border-border bg-card flex flex-col justify-between rounded-xl border p-5 shadow-sm">
          <div className="flex flex-row items-center justify-between">
            <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
              Hội Viên VIP Active
            </span>
            <div className="bg-amber-500/10 flex h-9 w-9 items-center justify-center rounded-lg">
              <Icon as={Crown} size={18} className="text-amber-500" />
            </div>
          </div>
          <div className="mt-3 flex flex-col gap-1">
            <div className="flex flex-row items-baseline gap-2">
              <span className="text-foreground text-2xl font-bold tracking-tight">
                {isStatsLoading
                  ? "..."
                  : (stats?.activeVipUsers ?? 0).toLocaleString("vi-VN")}
              </span>
              <span className="text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                ({stats?.conversionRate ?? 0}% tổng user)
              </span>
            </div>
            <span className="text-muted-foreground text-xs">
              Đang sở hữu gói Plus / Gold còn hạn
            </span>
          </div>
        </div>

        {/* Card 4: Đơn Hàng Thành Công */}
        <div className="border-border bg-card flex flex-col justify-between rounded-xl border p-5 shadow-sm">
          <div className="flex flex-row items-center justify-between">
            <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
              Đơn Hàng Đã Xử Lý
            </span>
            <div className="bg-blue-500/10 flex h-9 w-9 items-center justify-center rounded-lg">
              <Icon as={TrendingUp} size={18} className="text-blue-500" />
            </div>
          </div>
          <div className="mt-3 flex flex-col gap-1">
            <span className="text-foreground text-2xl font-bold tracking-tight">
              {isStatsLoading
                ? "..."
                : (stats?.paidOrdersCount ?? 0).toLocaleString("vi-VN")}
            </span>
            <span className="text-muted-foreground text-xs">
              Giao dịch thanh toán VietQR thành công
            </span>
          </div>
        </div>
      </div>

      {/* Free Mode Status Alert Banner */}
      {systemConfig?.freeModeEnabled ? (
        <div className="border-amber-500/30 bg-amber-500/10 flex flex-col justify-between gap-3 rounded-xl border p-4 sm:flex-row sm:items-center">
          <div className="flex flex-row items-center gap-3">
            <div className="bg-amber-500/20 flex h-9 w-9 items-center justify-center rounded-lg">
              <Icon as={CircleAlert} size={20} className="text-amber-500" />
            </div>
            <div className="flex flex-col">
              <span className="text-amber-600 dark:text-amber-400 text-sm font-bold">
                Chế độ Dùng thử Miễn phí (Free Mode) ĐANG BẬT
              </span>
              <span className="text-muted-foreground text-xs">
                Toàn bộ người dùng di động đang được kích hoạt tính năng VIP miễn phí mà
                không cần thanh toán.
              </span>
            </div>
          </div>
          <Link
            href="/settings"
            className="border-amber-500/40 bg-background hover:bg-muted text-foreground flex shrink-0 flex-row items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors"
          >
            <span>Tùy chỉnh trong Cài đặt</span>
            <Icon as={ArrowRight} size={12} className="text-muted-foreground" />
          </Link>
        </div>
      ) : null}

      {/* Recent Orders Section */}
      <div className="border-border bg-card flex flex-col gap-4 rounded-2xl border p-6 shadow-sm">
        <div className="flex flex-row items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <h3 className="text-foreground text-lg font-bold">
              Giao Dịch VietQR Gần Đây
            </h3>
            <p className="text-muted-foreground text-xs">
              Các đơn hàng kích hoạt gói cước được tạo gần đây nhất
            </p>
          </div>
          <Link
            href="/payments"
            className="text-primary hover:text-primary/80 flex flex-row items-center gap-1 text-xs font-semibold transition-colors"
          >
            <span>Xem tất cả đơn hàng</span>
            <Icon as={ArrowRight} size={14} className="text-primary" />
          </Link>
        </div>

        {/* Table of Orders */}
        <div className="border-border overflow-hidden rounded-xl border">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[750px] text-left text-sm">
              <thead className="bg-muted/50 border-border border-b text-xs uppercase text-muted-foreground">
                <tr>
                  <th
                    scope="col"
                    className="px-4 py-3 font-semibold whitespace-nowrap min-w-[140px]"
                  >
                    Mã Chuyển Khoản
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 font-semibold whitespace-nowrap min-w-[130px]"
                  >
                    Khách Hàng
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 font-semibold whitespace-nowrap min-w-[100px]"
                  >
                    Gói Cước
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 font-semibold whitespace-nowrap min-w-[100px]"
                  >
                    Số Tiền
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 font-semibold whitespace-nowrap min-w-[120px]"
                  >
                    Thời Gian
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 font-semibold whitespace-nowrap min-w-[110px]"
                  >
                    Trạng Thái
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isOrdersLoading ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="text-muted-foreground px-4 py-8 text-center text-xs"
                    >
                      Đang tải danh sách đơn hàng...
                    </td>
                  </tr>
                ) : !ordersData?.items || ordersData.items.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="text-muted-foreground px-4 py-8 text-center text-xs"
                    >
                      Chưa có giao dịch đơn hàng nào trên hệ thống.
                    </td>
                  </tr>
                ) : (
                  ordersData.items.map((order) => {
                    const badge = getStatusBadge(order.status);
                    return (
                      <tr key={order.id} className="hover:bg-muted/30 transition-colors">
                        <td className="text-foreground px-4 py-3 font-mono text-xs font-bold whitespace-nowrap min-w-[140px]">
                          {order.paymentCode || order.id.slice(-8)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap min-w-[140px]">
                          <div className="flex flex-col">
                            <span className="text-foreground text-xs font-semibold">
                              {order.userDisplayName || (
                                <span className="font-normal italic text-muted-foreground">
                                  Chưa đặt tên
                                </span>
                              )}
                            </span>
                            <span className="text-muted-foreground text-[10px]">
                              {order.userPhone || `ID: ${order.userId.slice(-6)}`}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap min-w-[100px]">
                          <span className="bg-secondary text-secondary-foreground rounded-md px-2 py-0.5 text-xs font-semibold uppercase">
                            {order.planCode}
                          </span>
                        </td>
                        <td className="text-foreground px-4 py-3 font-semibold text-xs whitespace-nowrap min-w-[100px]">
                          {formatVnd(order.amount)}
                        </td>
                        <td className="text-muted-foreground px-4 py-3 text-xs whitespace-nowrap min-w-[120px]">
                          {formatDate(order.createdAt)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap min-w-[110px]">
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
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
