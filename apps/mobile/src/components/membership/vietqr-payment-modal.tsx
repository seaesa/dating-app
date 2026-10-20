import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Clipboard from "expo-clipboard";
import { Image } from "expo-image";
import Check from "lucide-react-native/icons/check";
import CircleAlert from "lucide-react-native/icons/circle-alert";
import Clock from "lucide-react-native/icons/clock";
import Copy from "lucide-react-native/icons/copy";
import Crown from "lucide-react-native/icons/crown";
import RefreshCw from "lucide-react-native/icons/refresh-cw";
import Sparkles from "lucide-react-native/icons/sparkles";
import X from "lucide-react-native/icons/x";
import * as React from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { OrderRead } from "@repo/api-contract";
import { createOrder, orderStatusQuery } from "@repo/api-contract";
import { Button, Icon, Text } from "@repo/ui";

import { useMembership } from "@/hooks/use-membership";

export interface VietQrPaymentModalProps {
  visible: boolean;
  planCode: string | null;
  onClose: () => void;
  onSuccess?: () => void;
}

interface ParsedBankInfo {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
}

function parseVietQrUrl(urlStr: string): ParsedBankInfo {
  try {
    const clean = urlStr.includes("://") ? urlStr.split("://")[1] : urlStr;
    const pathPart = clean.split("?")[0];
    const segments = pathPart.split("/").filter(Boolean);
    if (segments.length >= 3) {
      const holder = decodeURIComponent(segments[segments.length - 1]);
      const number = segments[segments.length - 2];
      const bank = segments[segments.length - 3];
      if (bank && number && holder) {
        return { bankName: bank, accountNumber: number, accountHolder: holder };
      }
    }
  } catch {
    // fallback below
  }
  return {
    bankName: "MBBank",
    accountNumber: "0333857321",
    accountHolder: "TERDIN DATE",
  };
}

function getRemainingSeconds(expiresAtIso: string): number {
  const expiry = new Date(expiresAtIso).getTime();
  const now = Date.now();
  return Math.max(0, Math.floor((expiry - now) / 1000));
}

function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatVND(amount: number): string {
  return `${amount.toLocaleString("vi-VN")} đ`;
}

export function VietQrPaymentModal({
  visible,
  planCode,
  onClose,
  onSuccess,
}: VietQrPaymentModalProps) {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { isVip, currentPlan, plans } = useMembership();

  const targetPlan = plans.find((p) => p.code === planCode);
  const currentRank = currentPlan?.sort_order ?? currentPlan?.price ?? 0;
  const targetRank = targetPlan?.sort_order ?? targetPlan?.price ?? 0;

  const isRenewal =
    isVip && Boolean(currentPlan) && targetPlan?.code === currentPlan?.code;
  const isUpgrade = isVip && Boolean(currentPlan) && targetRank > currentRank;

  const [order, setOrder] = React.useState<OrderRead | null>(null);
  const [timeLeft, setTimeLeft] = React.useState<number>(0);
  const [copiedField, setCopiedField] = React.useState<string | null>(null);
  const [isCelebrated, setIsCelebrated] = React.useState<boolean>(false);

  const hasRequestedRef = React.useRef(false);
  const prevVisibleRef = React.useRef(visible);
  const onCloseRef = React.useRef(onClose);
  onCloseRef.current = onClose;
  const onSuccessRef = React.useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  const createOrderMutation = useMutation({
    mutationFn: createOrder,
    onSuccess: (data) => {
      setOrder(data);
      setTimeLeft(getRemainingSeconds(data.expires_at));
    },
    onError: () => {
      hasRequestedRef.current = false;
    },
  });

  const { mutate: createOrderMutate, reset: resetOrderMutation } = createOrderMutation;

  // Trigger creation when modal is opened with planCode
  React.useEffect(() => {
    if (visible && planCode && !order && !hasRequestedRef.current) {
      hasRequestedRef.current = true;
      createOrderMutate({ plan_code: planCode });
    }
  }, [visible, planCode, order, createOrderMutate]);

  // Reset when closing (only when transitioning from open to closed)
  React.useEffect(() => {
    if (prevVisibleRef.current && !visible) {
      hasRequestedRef.current = false;
      setOrder(null);
      setTimeLeft(0);
      setCopiedField(null);
      setIsCelebrated(false);
      resetOrderMutation();
    }
    prevVisibleRef.current = visible;
  }, [visible, resetOrderMutation]);

  // Countdown timer
  React.useEffect(() => {
    if (!order || isCelebrated) return;
    const interval = setInterval(() => {
      const remaining = getRemainingSeconds(order.expires_at);
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [order, isCelebrated]);

  // Auto-polling for order payment status
  const {
    data: orderStatus,
    refetch: checkStatusNow,
    isFetching: isCheckingStatus,
  } = useQuery({
    ...orderStatusQuery(order?.id ?? ""),
    enabled: Boolean(order?.id) && !isCelebrated && timeLeft > 0,
    refetchInterval: (query) => {
      const status = query.state.data;
      if (status?.paid || status?.status === "paid" || status?.status === "manual_paid") {
        return false;
      }
      if (
        status?.status === "expired" ||
        status?.status === "cancelled" ||
        timeLeft <= 0
      ) {
        return false;
      }
      return 3000;
    },
  });

  // Handle successful payment
  React.useEffect(() => {
    if (orderStatus?.paid && !isCelebrated) {
      setIsCelebrated(true);
      void queryClient.invalidateQueries({ queryKey: ["users", "me"] });
      void queryClient.invalidateQueries({
        queryKey: ["membership", "config"],
      });
      onSuccessRef.current?.();
      const timeout = setTimeout(() => {
        onCloseRef.current();
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [orderStatus?.paid, isCelebrated, queryClient]);

  const handleCopy = async (text: string, field: string) => {
    await Clipboard.setStringAsync(text);
    setCopiedField(field);
    setTimeout(() => {
      setCopiedField((curr) => (curr === field ? null : curr));
    }, 2000);
  };

  const parsedBank = order ? parseVietQrUrl(order.qr_url) : null;
  const isExpired = Boolean(order && timeLeft <= 0 && !isCelebrated);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/60">
        <Pressable
          className="flex-1"
          onPress={onClose}
          accessibilityLabel="Đóng thanh toán"
        />

        <View
          style={{ paddingBottom: Math.max(insets.bottom, 20) }}
          className="max-h-[92%] rounded-t-[32px] border-t border-border/30 bg-card p-6 shadow-2xl"
        >
          {/* Header */}
          <View className="flex-row items-center justify-between pb-3">
            <View className="flex-row items-center gap-2.5">
              <View className="h-10 w-10 items-center justify-center rounded-2xl bg-primary/15">
                <Icon as={Crown} className="text-primary" size={22} />
              </View>
              <View>
                <Text className="text-lg font-black text-foreground">
                  Thanh toán VietQR
                </Text>
                <Text className="text-xs text-muted-foreground">
                  Chuyển khoản tự động khớp tiền tức thì
                </Text>
              </View>
            </View>

            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Đóng modal thanh toán"
              className="h-8 w-8 items-center justify-center rounded-full bg-secondary/60 active:opacity-70"
            >
              <Icon as={X} className="text-muted-foreground" size={18} />
            </Pressable>
          </View>

          {/* Loading Order State */}
          {createOrderMutation.isPending ? (
            <View className="items-center justify-center py-16 gap-3">
              <ActivityIndicator size="large" color="#e11d48" />
              <Text className="text-sm font-semibold text-foreground">
                Đang khởi tạo mã thanh toán VietQR...
              </Text>
              <Text className="text-xs text-muted-foreground">
                Vui lòng đợi trong giây lát
              </Text>
            </View>
          ) : null}

          {/* Error Creating Order State */}
          {createOrderMutation.isError ? (
            <View className="items-center justify-center py-12 gap-3">
              <View className="h-12 w-12 items-center justify-center rounded-full bg-destructive/15">
                <Icon as={CircleAlert} className="text-destructive" size={24} />
              </View>
              <Text className="text-base font-bold text-foreground">
                Không thể tạo đơn hàng
              </Text>
              <Text className="text-xs text-muted-foreground text-center px-4">
                Đã xảy ra sự cố khi kết nối tới máy chủ. Vui lòng kiểm tra kết nối mạng và
                thử lại.
              </Text>
              <Button
                onPress={() => {
                  if (planCode) {
                    createOrderMutation.mutate({ plan_code: planCode });
                  }
                }}
                className="mt-2 h-11 rounded-full bg-primary px-6"
              >
                <Text className="font-bold text-primary-foreground">Thử lại</Text>
              </Button>
            </View>
          ) : null}

          {/* Celebration Success State */}
          {isCelebrated ? (
            <View className="items-center justify-center py-10 gap-3">
              <View className="h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
                <Icon as={Check} className="text-emerald-500" size={32} />
              </View>
              <View className="flex-row items-center gap-1.5">
                <Icon as={Sparkles} className="text-amber-500" size={20} />
                <Text className="text-xl font-black text-foreground">
                  Thanh toán thành công!
                </Text>
                <Icon as={Sparkles} className="text-amber-500" size={20} />
              </View>
              <Text className="text-sm text-muted-foreground text-center px-6">
                Chúc mừng bạn! Gói Hội viên VIP Terdin Date đã được kích hoạt thành công.
              </Text>

              <View className="mt-4 w-full pt-2">
                <Button
                  onPress={onClose}
                  className="h-12 w-full rounded-full bg-primary shadow-md shadow-primary/25"
                >
                  <Text className="text-base font-bold text-primary-foreground">
                    Bắt đầu trải nghiệm ngay
                  </Text>
                </Button>
              </View>
            </View>
          ) : null}

          {/* Expired State */}
          {isExpired ? (
            <View className="items-center justify-center py-12 gap-3">
              <View className="h-14 w-14 items-center justify-center rounded-full bg-amber-500/15">
                <Icon as={CircleAlert} className="text-amber-500" size={28} />
              </View>
              <Text className="text-base font-bold text-foreground">
                Đơn thanh toán đã hết hạn
              </Text>
              <Text className="text-xs text-muted-foreground text-center px-4">
                Mã chuyển khoản này đã quá hạn kiểm tra. Vui lòng tạo lại đơn mới để tiếp
                tục thanh toán.
              </Text>
              <Button
                onPress={() => {
                  if (planCode) {
                    setOrder(null);
                    createOrderMutation.mutate({ plan_code: planCode });
                  }
                }}
                className="mt-3 h-11 rounded-full bg-primary px-6"
              >
                <Text className="font-bold text-primary-foreground">
                  Tạo lại đơn thanh toán
                </Text>
              </Button>
            </View>
          ) : null}

          {/* Normal Waiting Payment State */}
          {order && !isCelebrated && !isExpired ? (
            <ScrollView showsVerticalScrollIndicator={false} className="flex-grow-0 pt-1">
              {/* Countdown Banner */}
              <View className="flex-row items-center justify-center gap-2 rounded-xl bg-secondary/30 py-2 px-3 mb-3">
                <Icon as={Clock} className="text-primary" size={15} />
                <Text className="text-xs text-muted-foreground">
                  Thời gian thanh toán còn lại:{" "}
                  <Text className="font-bold text-primary">
                    {formatCountdown(timeLeft)}
                  </Text>
                </Text>
              </View>

              {/* Dynamic Upgrade / Renewal note */}
              {isUpgrade && targetPlan ? (
                <View className="mb-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3 flex-row items-start gap-2.5">
                  <Icon as={Sparkles} className="text-amber-500 mt-0.5" size={15} />
                  <View className="flex-1">
                    <Text className="text-xs font-bold text-amber-500">
                      Nâng cấp lên {targetPlan.name}:
                    </Text>
                    <Text className="text-xs text-muted-foreground mt-0.5 leading-4">
                      Đặc quyền gói sẽ được áp dụng ngay từ bây giờ trong vòng{" "}
                      <Text className="font-bold text-amber-500">
                        {targetPlan.duration_days} ngày
                      </Text>{" "}
                      (thay thế gói {currentPlan?.name} hiện tại).
                    </Text>
                  </View>
                </View>
              ) : isRenewal && targetPlan ? (
                <View className="mb-3 rounded-2xl border border-primary/40 bg-primary/10 p-3 flex-row items-start gap-2.5">
                  <Icon as={Clock} className="text-primary mt-0.5" size={15} />
                  <View className="flex-1">
                    <Text className="text-xs font-bold text-primary">
                      Gia hạn gói {targetPlan.name}:
                    </Text>
                    <Text className="text-xs text-muted-foreground mt-0.5 leading-4">
                      Thời hạn sẽ được cộng dồn thêm{" "}
                      <Text className="font-bold text-primary">
                        {targetPlan.duration_days} ngày
                      </Text>{" "}
                      vào ngày hết hạn hiện tại của bạn.
                    </Text>
                  </View>
                </View>
              ) : null}

              {/* VietQR QuickLink Image */}
              <View className="items-center justify-center py-2">
                <View className="items-center justify-center rounded-3xl bg-white p-3.5 shadow-md shadow-black/10 border border-border/40">
                  <Image
                    source={{ uri: order.qr_url }}
                    style={{ width: 200, height: 200 }}
                    contentFit="contain"
                    accessibilityLabel="Mã QR chuyển khoản VietQR"
                  />
                </View>
                <Text className="text-xs text-muted-foreground pt-2.5">
                  Mở ứng dụng Ngân hàng bất kỳ để quét mã QR
                </Text>
              </View>

              {/* Bank Details Card */}
              {parsedBank ? (
                <View className="mt-3 rounded-2xl border border-border/50 bg-secondary/15 p-4 gap-2.5">
                  <Text className="text-xs font-bold uppercase tracking-wider text-muted-foreground pb-1">
                    Thông tin chuyển khoản thủ công
                  </Text>

                  {/* Bank Name */}
                  <View className="flex-row items-center justify-between py-1 border-b border-border/20">
                    <Text className="text-xs text-muted-foreground">Ngân hàng</Text>
                    <Text className="text-xs font-bold text-foreground">
                      {parsedBank.bankName}
                    </Text>
                  </View>

                  {/* Account Number */}
                  <View className="flex-row items-center justify-between py-1 border-b border-border/20">
                    <Text className="text-xs text-muted-foreground">Số tài khoản</Text>
                    <View className="flex-row items-center gap-2">
                      <Text className="text-sm font-black text-foreground">
                        {parsedBank.accountNumber}
                      </Text>
                      <Pressable
                        onPress={() => handleCopy(parsedBank.accountNumber, "account")}
                        className="flex-row items-center gap-1 rounded-md bg-secondary px-2 py-1 active:opacity-70"
                        accessibilityLabel="Sao chép số tài khoản"
                      >
                        <Icon
                          as={copiedField === "account" ? Check : Copy}
                          size={12}
                          className={
                            copiedField === "account"
                              ? "text-emerald-500"
                              : "text-muted-foreground"
                          }
                        />
                        <Text
                          className={`text-[10px] font-bold ${
                            copiedField === "account"
                              ? "text-emerald-500"
                              : "text-foreground"
                          }`}
                        >
                          {copiedField === "account" ? "Đã chép" : "Chép"}
                        </Text>
                      </Pressable>
                    </View>
                  </View>

                  {/* Account Holder */}
                  <View className="flex-row items-center justify-between py-1 border-b border-border/20">
                    <Text className="text-xs text-muted-foreground">Chủ tài khoản</Text>
                    <Text className="text-xs font-bold uppercase text-foreground">
                      {parsedBank.accountHolder}
                    </Text>
                  </View>

                  {/* Amount */}
                  <View className="flex-row items-center justify-between py-1 border-b border-border/20">
                    <Text className="text-xs text-muted-foreground">Số tiền</Text>
                    <View className="flex-row items-center gap-2">
                      <Text className="text-sm font-black text-primary">
                        {formatVND(order.amount)}
                      </Text>
                      <Pressable
                        onPress={() => handleCopy(String(order.amount), "amount")}
                        className="flex-row items-center gap-1 rounded-md bg-secondary px-2 py-1 active:opacity-70"
                        accessibilityLabel="Sao chép số tiền"
                      >
                        <Icon
                          as={copiedField === "amount" ? Check : Copy}
                          size={12}
                          className={
                            copiedField === "amount"
                              ? "text-emerald-500"
                              : "text-muted-foreground"
                          }
                        />
                        <Text
                          className={`text-[10px] font-bold ${
                            copiedField === "amount"
                              ? "text-emerald-500"
                              : "text-foreground"
                          }`}
                        >
                          {copiedField === "amount" ? "Đã chép" : "Chép"}
                        </Text>
                      </Pressable>
                    </View>
                  </View>

                  {/* Transfer Memo */}
                  <View className="flex-row items-center justify-between py-1">
                    <View>
                      <Text className="text-xs text-muted-foreground">Nội dung CK</Text>
                      <Text className="text-[10px] text-amber-500">
                        (Bắt buộc chính xác)
                      </Text>
                    </View>
                    <View className="flex-row items-center gap-2">
                      <View className="rounded-lg border border-primary/40 bg-primary/10 px-2 py-1">
                        <Text className="text-sm font-black tracking-wider text-primary">
                          {order.payment_code}
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => handleCopy(order.payment_code, "memo")}
                        className="flex-row items-center gap-1 rounded-md bg-secondary px-2 py-1 active:opacity-70"
                        accessibilityLabel="Sao chép nội dung chuyển khoản"
                      >
                        <Icon
                          as={copiedField === "memo" ? Check : Copy}
                          size={12}
                          className={
                            copiedField === "memo"
                              ? "text-emerald-500"
                              : "text-muted-foreground"
                          }
                        />
                        <Text
                          className={`text-[10px] font-bold ${
                            copiedField === "memo"
                              ? "text-emerald-500"
                              : "text-foreground"
                          }`}
                        >
                          {copiedField === "memo" ? "Đã chép" : "Chép"}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              ) : null}

              {/* Status Polling Indicator */}
              <View className="flex-row items-center justify-center gap-2 py-3">
                <ActivityIndicator size="small" color="#e11d48" />
                <Text className="text-xs text-muted-foreground">
                  Hệ thống đang tự động kiểm tra giao dịch mỗi 3s...
                </Text>
              </View>

              {/* Action Buttons */}
              <View className="gap-2 pt-1 pb-2">
                <Button
                  onPress={() => void checkStatusNow()}
                  disabled={isCheckingStatus}
                  className="h-12 w-full rounded-full bg-primary shadow-sm active:opacity-90"
                >
                  <View className="flex-row items-center gap-2">
                    <Icon
                      as={RefreshCw}
                      size={16}
                      className={
                        isCheckingStatus
                          ? "animate-spin text-primary-foreground"
                          : "text-primary-foreground"
                      }
                    />
                    <Text className="text-sm font-bold text-primary-foreground">
                      {isCheckingStatus
                        ? "Đang kiểm tra..."
                        : "Tôi đã chuyển khoản / Kiểm tra ngay"}
                    </Text>
                  </View>
                </Button>

                <Button
                  variant="outline"
                  onPress={onClose}
                  className="h-11 w-full rounded-full border-border/60"
                >
                  <Text className="text-sm font-semibold text-muted-foreground">
                    Hủy bỏ / Thanh toán sau
                  </Text>
                </Button>
              </View>
            </ScrollView>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}
