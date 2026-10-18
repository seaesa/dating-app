"use client";

import { useQuery } from "@tanstack/react-query";
import Activity from "lucide-react-native/icons/activity";
import ChevronLeft from "lucide-react-native/icons/chevron-left";
import ChevronRight from "lucide-react-native/icons/chevron-right";
import CreditCard from "lucide-react-native/icons/credit-card";
import Crown from "lucide-react-native/icons/crown";
import RefreshCw from "lucide-react-native/icons/refresh-cw";
import Settings from "lucide-react-native/icons/settings";
import UserCheck from "lucide-react-native/icons/user-check";
import UserX from "lucide-react-native/icons/user-x";
import * as React from "react";

import { adminAuditLogsQuery } from "@repo/api-contract";
import { Badge, Icon, Text } from "@repo/ui";

const formatDate = (dateStr: string) => {
  try {
    const d = new Date(dateStr);
    return d.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return dateStr;
  }
};

const ACTION_FILTERS: { id: string; label: string }[] = [
  { id: "all", label: "Tất cả hành động" },
  { id: "update_system_config", label: "Cấu hình hệ thống" },
  { id: "ban_user", label: "Khóa người dùng" },
  { id: "unban_user", label: "Mở khóa người dùng" },
  { id: "manual_activate_order", label: "Duyệt đơn thủ công" },
  { id: "create_plan", label: "Tạo gói cước" },
  { id: "update_plan", label: "Sửa gói cước" },
];

const getActionInfo = (action: string) => {
  switch (action) {
    case "ban_user":
      return {
        label: "Khóa Tài Khoản",
        icon: UserX,
        colorClass: "bg-destructive/10 text-destructive border-destructive/20",
      };
    case "unban_user":
      return {
        label: "Mở Khóa Tài Khoản",
        icon: UserCheck,
        colorClass:
          "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
      };
    case "manual_activate_order":
      return {
        label: "Duyệt Đơn Thủ Công",
        icon: CreditCard,
        colorClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
      };
    case "update_system_config":
      return {
        label: "Sửa Cấu Hình",
        icon: Settings,
        colorClass:
          "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
      };
    case "create_plan":
      return {
        label: "Tạo Gói VIP",
        icon: Crown,
        colorClass:
          "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
      };
    case "update_plan":
      return {
        label: "Sửa Gói VIP",
        icon: Crown,
        colorClass:
          "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
      };
    default:
      return {
        label: action,
        icon: Activity,
        colorClass: "bg-muted text-muted-foreground border-border",
      };
  }
};

export default function AdminAuditLogsPage() {
  const [page, setPage] = React.useState(1);
  const [actionFilter, setActionFilter] = React.useState("all");

  const {
    data: auditData,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery(
    adminAuditLogsQuery({
      page,
      limit: 15,
      action: actionFilter === "all" ? undefined : actionFilter,
    }),
  );

  const totalPages = auditData?.totalPages ?? 1;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      {/* Header Bar */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="flex flex-col gap-1">
          <div className="flex flex-row items-center gap-2">
            <h2 className="text-foreground text-2xl font-bold tracking-tight">
              Nhật Ký Kiểm Toán (Audit Logs)
            </h2>
            <Badge variant="secondary" className="px-2.5 py-0.5">
              <Text className="text-xs font-semibold">
                {auditData?.total ?? 0} Thao Tác
              </Text>
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            Theo dõi toàn bộ lịch sử can thiệp, thay đổi cấu hình, duyệt đơn và xử lý vi
            phạm của ban quản trị.
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

      {/* Action Filters Tabs */}
      <div className="border-border bg-card flex flex-col gap-3 rounded-2xl border p-4 shadow-sm">
        <span className="text-muted-foreground text-xs font-bold uppercase tracking-wider">
          Lọc theo loại thao tác
        </span>
        <div className="flex flex-wrap gap-1.5">
          {ACTION_FILTERS.map((tab) => {
            const active = actionFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActionFilter(tab.id);
                  setPage(1);
                }}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground border"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Logs Table */}
      <div className="border-border bg-card flex flex-col gap-4 rounded-2xl border p-6 shadow-sm">
        <div className="border-border overflow-hidden rounded-xl border">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead className="bg-muted/50 border-border border-b text-xs uppercase text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Thời Gian
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Quản Trị Viên
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Hành Động
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Đối Tượng
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Chi Tiết Thay Đổi
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">
                    Địa Chỉ IP
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="text-muted-foreground px-4 py-8 text-center text-xs"
                    >
                      Đang tải nhật ký kiểm toán...
                    </td>
                  </tr>
                ) : !auditData?.items || auditData.items.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="text-muted-foreground px-4 py-8 text-center text-xs"
                    >
                      Chưa ghi nhận thao tác kiểm toán nào phù hợp với bộ lọc hiện tại.
                    </td>
                  </tr>
                ) : (
                  auditData.items.map((log) => {
                    const act = getActionInfo(log.action);

                    return (
                      <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                        <td className="text-foreground px-4 py-3.5 font-mono text-xs whitespace-nowrap">
                          {formatDate(log.createdAt)}
                        </td>

                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="flex flex-row items-center gap-1.5">
                            <span className="bg-primary/10 text-primary flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold">
                              {log.adminUsername.slice(0, 1).toUpperCase()}
                            </span>
                            <span className="text-foreground text-xs font-bold">
                              {log.adminUsername}
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${act.colorClass}`}
                          >
                            <Icon as={act.icon} size={11} className="text-current" />
                            <span>{act.label}</span>
                          </span>
                        </td>

                        <td className="px-4 py-3.5 text-xs whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="text-foreground font-semibold uppercase">
                              {log.targetType}
                            </span>
                            {log.targetId ? (
                              <span className="text-muted-foreground font-mono text-[10px]">
                                ID: {log.targetId.slice(-8)}
                              </span>
                            ) : null}
                          </div>
                        </td>

                        <td className="px-4 py-3.5 min-w-[240px] max-w-md">
                          <div className="text-muted-foreground bg-muted/40 rounded-lg p-2 font-mono text-[11px] leading-relaxed">
                            {log.details ? (
                              typeof log.details === "object" ? (
                                Object.entries(log.details).map(([key, val]) => (
                                  <div key={key} className="flex flex-row gap-1">
                                    <span className="text-foreground font-semibold">
                                      {key}:
                                    </span>
                                    <span>{String(val)}</span>
                                  </div>
                                ))
                              ) : (
                                String(log.details)
                              )
                            ) : (
                              <span className="italic">Không có chi tiết</span>
                            )}
                          </div>
                        </td>

                        <td className="text-muted-foreground px-4 py-3.5 text-right font-mono text-xs whitespace-nowrap">
                          {log.ipAddress || "127.0.0.1"}
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
            <strong className="text-foreground">{auditData?.total ?? 0}</strong> nhật ký)
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
    </div>
  );
}
