"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Check from "lucide-react-native/icons/check";
import CircleAlert from "lucide-react-native/icons/circle-alert";
import Crown from "lucide-react-native/icons/crown";
import Eye from "lucide-react-native/icons/eye";
import EyeOff from "lucide-react-native/icons/eye-off";
import Pencil from "lucide-react-native/icons/pencil";
import Plus from "lucide-react-native/icons/plus";
import RefreshCw from "lucide-react-native/icons/refresh-cw";
import X from "lucide-react-native/icons/x";
import * as React from "react";

import {
  adminPlansQuery,
  createAdminPlan,
  updateAdminPlan,
  type AdminPlanCreate,
  type AdminPlanRead,
  type AdminPlanUpdate,
} from "@repo/api-contract";
import { Badge, Icon, Input, Label, Text } from "@repo/ui";

const formatVnd = (amount: number) => `${amount.toLocaleString("vi-VN")} ₫`;

interface FeatureOption {
  id: string;
  label: string;
  desc: string;
}

const VIP_FEATURES: FeatureOption[] = [
  {
    id: "SEE_WHO_LIKED_YOU",
    label: "Xem ai thích mình",
    desc: "Xem danh sách người dùng đã vuốt thích bạn",
  },
  {
    id: "UNLIMITED_LIKES",
    label: "Thích không giới hạn",
    desc: "Không bị giới hạn lượt quẹt thẻ mỗi ngày",
  },
  {
    id: "VIP_BADGE",
    label: "Huy hiệu VIP Hoàng Gia",
    desc: "Huy hiệu vương miện vàng nổi bật trên trang cá nhân",
  },
  {
    id: "DIAMOND_BADGE",
    label: "Huy hiệu VIP Kim Cương (VIP PRO)",
    desc: "Biểu tượng kim cương tím nổi bật nhất trang khám phá",
  },
  {
    id: "PROFILE_BOOST",
    label: "Tự động Đẩy hồ sơ lên Top (Boost)",
    desc: "Cộng +30 điểm xếp hạng ưu tiên trong feed khám phá",
  },
];

export default function AdminMembersPage() {
  const queryClient = useQueryClient();

  const {
    data: plans = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery(adminPlansQuery());

  // Modal State
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [modalMode, setModalMode] = React.useState<"create" | "edit">("create");
  const [editingCode, setEditingCode] = React.useState<string>("");

  // Form Fields
  const [code, setCode] = React.useState("");
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [price, setPrice] = React.useState("");
  const [originalPrice, setOriginalPrice] = React.useState("");
  const [durationDays, setDurationDays] = React.useState("30");
  const [sortOrder, setSortOrder] = React.useState("1");
  const [isPopular, setIsPopular] = React.useState(false);
  const [selectedFeatures, setSelectedFeatures] = React.useState<string[]>([]);

  // Feedback State
  const [feedback, setFeedback] = React.useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const resetForm = () => {
    setCode("");
    setName("");
    setDescription("");
    setPrice("");
    setOriginalPrice("");
    setDurationDays("30");
    setSortOrder("1");
    setIsPopular(false);
    setSelectedFeatures([]);
    setEditingCode("");
  };

  const handleOpenCreateModal = () => {
    resetForm();
    setModalMode("create");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (plan: AdminPlanRead) => {
    setModalMode("edit");
    setEditingCode(plan.code);
    setCode(plan.code);
    setName(plan.name);
    setDescription(plan.description ?? "");
    setPrice(String(plan.price));
    setOriginalPrice(String(plan.originalPrice));
    setDurationDays(String(plan.durationDays));
    setSortOrder(String(plan.sortOrder ?? 1));
    setIsPopular(Boolean(plan.isPopular));
    setSelectedFeatures(plan.features ?? []);
    setIsModalOpen(true);
  };

  const createMutation = useMutation({
    mutationFn: (body: AdminPlanCreate) => createAdminPlan(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "membership", "plans"] });
      setIsModalOpen(false);
      resetForm();
      setFeedback({ type: "success", message: "Đã tạo gói cước VIP mới thành công!" });
    },
    onError: (err: unknown) => {
      const msg =
        err && typeof err === "object" && "response" in err
          ? ((err as { response?: { data?: { detail?: string } } }).response?.data
              ?.detail ?? "Không thể tạo gói cước. Vui lòng thử lại sau.")
          : "Đã xảy ra lỗi khi tạo gói cước.";
      setFeedback({ type: "error", message: msg });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ planCode, body }: { planCode: string; body: AdminPlanUpdate }) =>
      updateAdminPlan(planCode, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "membership", "plans"] });
      setIsModalOpen(false);
      resetForm();
      setFeedback({
        type: "success",
        message: "Đã cập nhật thông tin gói cước thành công!",
      });
    },
    onError: (err: unknown) => {
      const msg =
        err && typeof err === "object" && "response" in err
          ? ((err as { response?: { data?: { detail?: string } } }).response?.data
              ?.detail ?? "Không thể cập nhật gói cước. Vui lòng thử lại sau.")
          : "Đã xảy ra lỗi khi cập nhật gói cước.";
      setFeedback({ type: "error", message: msg });
    },
  });

  const handleToggleActive = async (plan: AdminPlanRead) => {
    const nextActive = !plan.isActive;
    await updateMutation.mutateAsync({
      planCode: plan.code,
      body: { isActive: nextActive },
    });
  };

  const handleFeatureToggle = (featureId: string) => {
    setSelectedFeatures((prev) =>
      prev.includes(featureId)
        ? prev.filter((id) => id !== featureId)
        : [...prev, featureId],
    );
  };

  const handleSavePlan = async () => {
    const priceNum = parseInt(price, 10);
    const origPriceNum = parseInt(originalPrice, 10);
    const durationNum = parseInt(durationDays, 10);
    const sortNum = parseInt(sortOrder, 10);

    if (!name.trim()) {
      setFeedback({ type: "error", message: "Vui lòng nhập tên gói cước." });
      return;
    }

    if (isNaN(priceNum) || priceNum <= 0) {
      setFeedback({
        type: "error",
        message: "Giá bán gói cước phải là một số nguyên dương.",
      });
      return;
    }

    if (modalMode === "create") {
      if (!code.trim()) {
        setFeedback({
          type: "error",
          message: "Vui lòng nhập mã code định danh gói (vd: 149k, vip_pro).",
        });
        return;
      }

      await createMutation.mutateAsync({
        code: code.trim(),
        name: name.trim(),
        description: description.trim(),
        price: priceNum,
        originalPrice: isNaN(origPriceNum) ? priceNum : origPriceNum,
        durationDays: isNaN(durationNum) ? 30 : durationNum,
        sortOrder: isNaN(sortNum) ? 1 : sortNum,
        isPopular,
        features: selectedFeatures,
      });
    } else {
      await updateMutation.mutateAsync({
        planCode: editingCode,
        body: {
          name: name.trim(),
          description: description.trim(),
          price: priceNum,
          originalPrice: isNaN(origPriceNum) ? priceNum : origPriceNum,
          durationDays: isNaN(durationNum) ? 30 : durationNum,
          sortOrder: isNaN(sortNum) ? 1 : sortNum,
          isPopular,
          features: selectedFeatures,
        },
      });
    }
  };

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      {/* Header Bar */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="flex flex-col gap-1">
          <div className="flex flex-row items-center gap-2">
            <h2 className="text-foreground text-2xl font-bold tracking-tight">
              Quản Lý Gói Hội Viên VIP
            </h2>
            <Badge variant="secondary" className="px-2.5 py-0.5">
              <Text className="text-xs font-semibold">{plans.length} Gói</Text>
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            Cấu hình bảng giá, thời hạn, quyền lợi đặc quyền và trạng thái hiển thị của
            các gói nạp VIP.
          </p>
        </div>

        <div className="flex flex-row items-center gap-3">
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

          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="bg-primary hover:bg-primary/90 text-primary-foreground flex shrink-0 flex-row items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all shadow-sm"
          >
            <Icon as={Plus} size={14} className="text-primary-foreground" />
            <span>Thêm Gói Mới</span>
          </button>
        </div>
      </div>

      {/* Feedback Alert */}
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

      {/* Plans Table */}
      <div className="border-border bg-card flex flex-col gap-4 rounded-2xl border p-6 shadow-sm">
        <div className="border-border overflow-hidden rounded-xl border">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-muted/50 border-border border-b text-xs uppercase text-muted-foreground">
                <tr>
                  <th
                    scope="col"
                    className="px-4 py-3 font-semibold whitespace-nowrap min-w-[180px]"
                  >
                    Gói & Mã
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 font-semibold whitespace-nowrap min-w-[120px]"
                  >
                    Giá Bán
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 font-semibold whitespace-nowrap min-w-[100px]"
                  >
                    Thời Hạn
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold min-w-[260px]">
                    Đặc Quyền VIP
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 font-semibold whitespace-nowrap min-w-[90px]"
                  >
                    Nổi Bật
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 font-semibold whitespace-nowrap min-w-[110px]"
                  >
                    Trạng Thái
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-right font-semibold whitespace-nowrap min-w-[110px]"
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
                      Đang tải danh sách gói hội viên...
                    </td>
                  </tr>
                ) : plans.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="text-muted-foreground px-4 py-8 text-center text-xs"
                    >
                      Chưa có gói hội viên nào được cấu hình.
                    </td>
                  </tr>
                ) : (
                  plans.map((plan) => (
                    <tr key={plan.code} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3.5 min-w-[180px]">
                        <div className="flex flex-col">
                          <div className="flex flex-row items-center gap-1.5">
                            <span className="text-foreground font-bold">{plan.name}</span>
                            <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase">
                              {plan.code}
                            </span>
                          </div>
                          {plan.description ? (
                            <span className="text-muted-foreground line-clamp-1 text-xs">
                              {plan.description}
                            </span>
                          ) : null}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap min-w-[120px]">
                        <div className="flex flex-col">
                          <span className="text-foreground font-bold text-sm">
                            {formatVnd(plan.price)}
                          </span>
                          {plan.originalPrice > plan.price ? (
                            <span className="text-muted-foreground text-xs line-through">
                              {formatVnd(plan.originalPrice)}
                            </span>
                          ) : null}
                        </div>
                      </td>

                      <td className="text-foreground px-4 py-3.5 text-xs font-semibold whitespace-nowrap min-w-[100px]">
                        {plan.durationDays} ngày
                      </td>

                      <td className="px-4 py-3.5 min-w-[260px]">
                        <div className="flex flex-wrap gap-1">
                          {plan.features && plan.features.length > 0 ? (
                            plan.features.slice(0, 3).map((feat) => {
                              const fInfo = VIP_FEATURES.find((f) => f.id === feat);
                              return (
                                <span
                                  key={feat}
                                  className="bg-primary/10 text-primary border-primary/20 rounded-md border px-2 py-0.5 text-[10px] font-semibold"
                                >
                                  {fInfo?.label ?? feat}
                                </span>
                              );
                            })
                          ) : (
                            <span className="text-muted-foreground text-xs">Cơ bản</span>
                          )}
                          {plan.features && plan.features.length > 3 ? (
                            <span className="text-muted-foreground text-[10px] font-semibold self-center">
                              +{plan.features.length - 3} đặc quyền
                            </span>
                          ) : null}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap min-w-[90px]">
                        {plan.isPopular ? (
                          <Badge
                            variant="default"
                            className="bg-amber-500 hover:bg-amber-600 px-2 py-0.5"
                          >
                            <Text className="text-[10px] font-bold text-white uppercase">
                              Phổ biến
                            </Text>
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap min-w-[110px]">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                            plan.isActive
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                              : "bg-muted text-muted-foreground border-border"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              plan.isActive ? "bg-emerald-500" : "bg-muted-foreground"
                            }`}
                          />
                          <span>{plan.isActive ? "Hoạt động" : "Tạm dừng"}</span>
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-right whitespace-nowrap min-w-[110px]">
                        <div className="flex flex-row items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleActive(plan)}
                            title={
                              plan.isActive ? "Ẩn gói khỏi app" : "Hiện gói trên app"
                            }
                            className="border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground flex h-7 w-7 items-center justify-center rounded-lg border transition-colors"
                          >
                            <Icon
                              as={plan.isActive ? EyeOff : Eye}
                              size={13}
                              className="text-current"
                            />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(plan)}
                            className="border-border bg-background hover:bg-muted text-foreground flex flex-row items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors"
                          >
                            <Icon
                              as={Pencil}
                              size={12}
                              className="text-muted-foreground"
                            />
                            <span>Sửa</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* CREATE / EDIT PLAN MODAL */}
      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="border-border bg-card my-8 w-full max-w-xl rounded-2xl border p-6 shadow-2xl">
            {/* Modal Header */}
            <div className="flex flex-row items-center justify-between border-b border-border pb-4">
              <div className="flex flex-row items-center gap-2.5">
                <div className="bg-primary/10 flex h-9 w-9 items-center justify-center rounded-xl">
                  <Icon as={Crown} size={18} className="text-primary" />
                </div>
                <div className="flex flex-col">
                  <h3 className="text-foreground text-base font-bold">
                    {modalMode === "create"
                      ? "Thêm Gói Hội Viên VIP Mới"
                      : `Chỉnh Sửa Gói '${code}'`}
                  </h3>
                  <span className="text-muted-foreground text-xs">
                    Cấu hình thông số chi tiết của gói nạp
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1"
              >
                <Icon as={X} size={18} className="text-current" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="mt-5 flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label nativeID="plan-code">Mã Code Gói</Label>
                  <Input
                    accessibilityLabel="Mã Code Gói"
                    accessibilityLabelledBy="plan-code"
                    placeholder="vd: 49k, 149k, vip_pro"
                    value={code}
                    onChangeText={setCode}
                    editable={modalMode === "create"}
                  />
                  <span className="text-muted-foreground text-[10px]">
                    {modalMode === "create"
                      ? "Mã định danh duy nhất (không đổi sau khi tạo)"
                      : "Không thể thay đổi mã định danh"}
                  </span>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label nativeID="plan-name">Tên Gói</Label>
                  <Input
                    accessibilityLabel="Tên Gói"
                    accessibilityLabelledBy="plan-name"
                    placeholder="vd: Gói VIP Cơ Bản, Gói Gold"
                    value={name}
                    onChangeText={setName}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label nativeID="plan-desc">Mô Tả Gói Cước</Label>
                <Input
                  accessibilityLabel="Mô Tả Gói Cước"
                  accessibilityLabelledBy="plan-desc"
                  placeholder="Mô tả các tính năng nổi bật của gói cước hiển thị trên app..."
                  value={description}
                  onChangeText={setDescription}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="flex flex-col gap-1.5">
                  <Label nativeID="plan-price">Giá Bán (VND)</Label>
                  <Input
                    accessibilityLabel="Giá Bán"
                    accessibilityLabelledBy="plan-price"
                    placeholder="49000"
                    value={price}
                    onChangeText={setPrice}
                    keyboardType="numeric"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label nativeID="plan-orig-price">Giá Gốc (VND)</Label>
                  <Input
                    accessibilityLabel="Giá Gốc"
                    accessibilityLabelledBy="plan-orig-price"
                    placeholder="99000"
                    value={originalPrice}
                    onChangeText={setOriginalPrice}
                    keyboardType="numeric"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label nativeID="plan-duration">Thời Hạn (Ngày)</Label>
                  <Input
                    accessibilityLabel="Thời Hạn"
                    accessibilityLabelledBy="plan-duration"
                    placeholder="30"
                    value={durationDays}
                    onChangeText={setDurationDays}
                    keyboardType="numeric"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label nativeID="plan-sort">Thứ Tự Hiển Thị</Label>
                  <Input
                    accessibilityLabel="Thứ Tự Hiển Thị"
                    accessibilityLabelledBy="plan-sort"
                    placeholder="1"
                    value={sortOrder}
                    onChangeText={setSortOrder}
                    keyboardType="numeric"
                  />
                </div>

                <div className="flex flex-col justify-end">
                  <label className="border-border bg-background flex flex-row items-center gap-3 rounded-lg border p-2.5 cursor-pointer hover:bg-muted/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={isPopular}
                      onChange={(e) => setIsPopular(e.target.checked)}
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                    />
                    <div className="flex flex-col">
                      <span className="text-foreground text-xs font-bold">
                        Gói Phổ Biến (Popular)
                      </span>
                      <span className="text-muted-foreground text-[10px]">
                        Hiển thị huy hiệu nổi bật kích thích mua
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* VIP Features Checkbox List */}
              <div className="flex flex-col gap-2 pt-2">
                <span className="text-foreground text-xs font-bold uppercase tracking-wider">
                  Đặc Quyền VIP Kèm Theo ({selectedFeatures.length} đã chọn)
                </span>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {VIP_FEATURES.map((feat) => {
                    const checked = selectedFeatures.includes(feat.id);
                    return (
                      <label
                        key={feat.id}
                        className={`flex flex-row items-start gap-2.5 rounded-lg border p-2.5 cursor-pointer transition-colors ${
                          checked
                            ? "border-primary/40 bg-primary/5"
                            : "border-border bg-background hover:bg-muted/30"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleFeatureToggle(feat.id)}
                          className="mt-0.5 h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary"
                        />
                        <div className="flex flex-col">
                          <span
                            className={`text-xs font-semibold ${checked ? "text-primary" : "text-foreground"}`}
                          >
                            {feat.label}
                          </span>
                          <span className="text-muted-foreground text-[10px] leading-tight">
                            {feat.desc}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="mt-6 flex flex-row justify-end gap-3 border-t border-border pt-4">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="border-border bg-background hover:bg-muted text-foreground rounded-lg border px-4 py-2 text-xs font-semibold transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleSavePlan}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="bg-primary hover:bg-primary/90 text-primary-foreground flex flex-row items-center gap-1.5 rounded-lg px-5 py-2 text-xs font-bold transition-all shadow-sm disabled:opacity-50"
              >
                {createMutation.isPending || updateMutation.isPending ? (
                  <Icon
                    as={RefreshCw}
                    size={14}
                    className="text-primary-foreground animate-spin"
                  />
                ) : (
                  <Icon as={Check} size={14} className="text-primary-foreground" />
                )}
                <span>
                  {createMutation.isPending || updateMutation.isPending
                    ? "Đang lưu..."
                    : modalMode === "create"
                      ? "Tạo Gói Mới"
                      : "Lưu Thay Đổi"}
                </span>
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
