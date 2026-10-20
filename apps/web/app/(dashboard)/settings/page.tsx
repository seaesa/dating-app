"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Check from "lucide-react-native/icons/check";
import CircleAlert from "lucide-react-native/icons/circle-alert";
import Clock from "lucide-react-native/icons/clock";
import Crown from "lucide-react-native/icons/crown";
import ExternalLink from "lucide-react-native/icons/external-link";
import Eye from "lucide-react-native/icons/eye";
import EyeOff from "lucide-react-native/icons/eye-off";
import Landmark from "lucide-react-native/icons/landmark";
import RefreshCw from "lucide-react-native/icons/refresh-cw";
import Save from "lucide-react-native/icons/save";
import ShieldAlert from "lucide-react-native/icons/shield-alert";
import Zap from "lucide-react-native/icons/zap";
import * as React from "react";

import {
  adminSystemConfigQuery,
  testAdminWeb2MConnection,
  updateAdminSystemConfig,
  type AdminSystemConfigUpdate,
} from "@repo/api-contract";
import { Badge, Icon, Input, Label, Text } from "@repo/ui";

const formatDate = (dateStr?: string) => {
  if (!dateStr) return "Chưa cập nhật";
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

export default function AdminSettingsPage() {
  const queryClient = useQueryClient();

  const {
    data: config,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery(adminSystemConfigQuery());

  // Form states
  const [bankName, setBankName] = React.useState("");
  const [bankNumber, setBankNumber] = React.useState("");
  const [accountHolder, setAccountHolder] = React.useState("");
  const [bankPassword, setBankPassword] = React.useState("");
  const [bankToken, setBankToken] = React.useState("");
  const [apiGetTransaction, setApiGetTransaction] = React.useState("");
  const [apiGetQr, setApiGetQr] = React.useState("");
  const [qrTtlMinutes, setQrTtlMinutes] = React.useState("15");
  const [supportZaloUrl, setSupportZaloUrl] = React.useState("");

  // Visibility toggle states
  const [showBankPassword, setShowBankPassword] = React.useState(false);
  const [showBankToken, setShowBankToken] = React.useState(false);

  // Test connection states
  const [isTesting, setIsTesting] = React.useState(false);
  const [testFeedback, setTestFeedback] = React.useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Feedback states
  const [feedback, setFeedback] = React.useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Safety confirmation modal state for Free Mode
  const [isFreeModeModalOpen, setIsFreeModeModalOpen] = React.useState(false);
  const [pendingFreeModeValue, setPendingFreeModeValue] = React.useState<boolean>(false);

  // Sync form when config loads
  React.useEffect(() => {
    if (config) {
      setBankName(config.web2MBankName ?? "");
      setBankNumber(config.web2MBankNumber ?? "");
      setAccountHolder(config.web2MAccountHolder ?? "");
      setBankPassword(config.web2MBankPassword ?? "");
      setBankToken(config.web2MBankToken ?? "");
      setApiGetTransaction(config.web2MApiGetTransaction ?? "");
      setApiGetQr(config.web2MApiGetQr ?? "");
      setQrTtlMinutes(String(config.qrTtlMinutes ?? 15));
      setSupportZaloUrl(config.supportZaloUrl ?? "");
    }
  }, [config]);

  const updateMutation = useMutation({
    mutationFn: (body: AdminSystemConfigUpdate) => updateAdminSystemConfig(body),
    onSuccess: (updated) => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "system-config"] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "dashboard", "stats"] });
      setFeedback({
        type: "success",
        message: "Cấu hình hệ thống đã được lưu thành công!",
      });
      if (updated) {
        setBankName(updated.web2MBankName ?? "");
        setBankNumber(updated.web2MBankNumber ?? "");
        setAccountHolder(updated.web2MAccountHolder ?? "");
        setBankPassword(updated.web2MBankPassword ?? "");
        setBankToken(updated.web2MBankToken ?? "");
        setApiGetTransaction(updated.web2MApiGetTransaction ?? "");
        setApiGetQr(updated.web2MApiGetQr ?? "");
        setQrTtlMinutes(String(updated.qrTtlMinutes ?? 15));
        setSupportZaloUrl(updated.supportZaloUrl ?? "");
      }
    },
    onError: (err: unknown) => {
      const msg =
        err && typeof err === "object" && "response" in err
          ? ((err as { response?: { data?: { detail?: string } } }).response?.data
              ?.detail ?? "Không thể lưu cấu hình. Vui lòng thử lại sau.")
          : "Đã xảy ra lỗi khi kết nối đến máy chủ.";
      setFeedback({ type: "error", message: msg });
    },
  });

  const handleSaveForm = async () => {
    const ttl = parseInt(qrTtlMinutes, 10);
    if (isNaN(ttl) || ttl <= 0) {
      setFeedback({
        type: "error",
        message: "Thời gian hiệu lực mã QR phải là một số nguyên dương hợp lệ.",
      });
      return;
    }

    setFeedback(null);
    await updateMutation.mutateAsync({
      web2MBankName: bankName.trim(),
      web2MBankNumber: bankNumber.trim(),
      web2MAccountHolder: accountHolder.trim(),
      web2MBankPassword: bankPassword.trim(),
      web2MBankToken: bankToken.trim(),
      web2MApiGetTransaction: apiGetTransaction.trim(),
      web2MApiGetQr: apiGetQr.trim(),
      qrTtlMinutes: ttl,
      supportZaloUrl: supportZaloUrl.trim(),
    });
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestFeedback(null);
    try {
      const res = await testAdminWeb2MConnection({
        bankName: bankName.trim() || undefined,
        bankNumber: bankNumber.trim() || undefined,
        bankPassword: bankPassword.trim() || undefined,
        bankToken: bankToken.trim() || undefined,
        apiGetTransaction: apiGetTransaction.trim() || undefined,
      });
      if (res.success) {
        setTestFeedback({
          type: "success",
          message: res.message,
        });
      } else {
        setTestFeedback({
          type: "error",
          message: res.message || "Kiểm tra kết nối thất bại.",
        });
      }
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? ((err as { response?: { data?: { detail?: string } } }).response?.data
              ?.detail ?? "Lỗi kiểm tra kết nối Web2M.")
          : "Không thể kết nối đến máy chủ để thử nghiệm.";
      setTestFeedback({
        type: "error",
        message: msg,
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleToggleFreeModeClick = () => {
    const nextVal = !config?.freeModeEnabled;
    setPendingFreeModeValue(nextVal);
    setIsFreeModeModalOpen(true);
  };

  const handleConfirmFreeModeToggle = async () => {
    setIsFreeModeModalOpen(false);
    setFeedback(null);
    await updateMutation.mutateAsync({
      freeModeEnabled: pendingFreeModeValue,
    });
  };

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      {/* Header Bar */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="flex flex-col gap-1">
          <h2 className="text-foreground text-2xl font-bold tracking-tight">
            Cấu Hình Hệ Thống & Cổng Thanh Toán
          </h2>
          <p className="text-muted-foreground text-sm">
            Tùy chỉnh thông số vận hành toàn hệ thống, chế độ dùng thử miễn phí và tài
            khoản nhận tiền VietQR.
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
          <span>Tải lại</span>
        </button>
      </div>

      {/* Feedback Banner */}
      {feedback ? (
        <div
          className={`flex flex-row items-center gap-3 rounded-xl border p-4 ${
            feedback.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "border-destructive/30 bg-destructive/10 text-destructive"
          }`}
        >
          <Icon
            as={feedback.type === "success" ? Check : CircleAlert}
            size={18}
            className="text-current shrink-0"
          />
          <span className="flex-1 text-sm font-medium">{feedback.message}</span>
        </div>
      ) : null}

      {/* SECTION 1: FREE MODE CONFIGURATION */}
      <div className="border-border bg-card flex flex-col gap-5 rounded-2xl border p-6 shadow-sm">
        <div className="flex flex-row items-center justify-between border-b border-border pb-4">
          <div className="flex flex-row items-center gap-3">
            <div className="bg-amber-500/10 flex h-10 w-10 items-center justify-center rounded-xl">
              <Icon as={Crown} size={20} className="text-amber-500" />
            </div>
            <div className="flex flex-col">
              <span className="text-foreground text-base font-bold">
                Chế Độ Dùng Thử Miễn Phí (Free Mode)
              </span>
              <span className="text-muted-foreground text-xs">
                Mở khóa toàn bộ đặc quyền VIP cho tất cả người dùng ứng dụng di động
              </span>
            </div>
          </div>

          <Badge
            variant={config?.freeModeEnabled ? "default" : "secondary"}
            className="px-2.5 py-1"
          >
            <Text className="text-xs font-semibold">
              {config?.freeModeEnabled ? "ĐANG BẬT" : "ĐANG TẮT"}
            </Text>
          </Badge>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-muted-foreground max-w-xl text-xs leading-relaxed">
            Khi <strong className="text-foreground">BẬT</strong>, người dùng app không
            phải nạp tiền hay mua gói VIP. Khi{" "}
            <strong className="text-foreground">TẮT</strong>, toàn bộ quy trình mua gói
            VietQR và giới hạn quẹt thẻ, mở danh tính hoạt động bình thường.
          </div>

          <button
            type="button"
            onClick={handleToggleFreeModeClick}
            disabled={updateMutation.isPending || isLoading}
            className={`flex shrink-0 flex-row items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold transition-all shadow-sm ${
              config?.freeModeEnabled
                ? "border-destructive/30 bg-destructive/10 hover:bg-destructive/20 text-destructive border"
                : "bg-primary hover:bg-primary/90 text-primary-foreground"
            }`}
          >
            <span>
              {config?.freeModeEnabled ? "Tắt Chế Độ Free Mode" : "Bật Chế Độ Free Mode"}
            </span>
          </button>
        </div>
      </div>

      {/* SECTION 2: VIETQR GATEWAY CONFIGURATION */}
      <div className="border-border bg-card flex flex-col gap-6 rounded-2xl border p-6 shadow-sm">
        <div className="flex flex-row items-center gap-3 border-b border-border pb-4">
          <div className="bg-emerald-500/10 flex h-10 w-10 items-center justify-center rounded-xl">
            <Icon as={Landmark} size={20} className="text-emerald-500" />
          </div>
          <div className="flex flex-col">
            <span className="text-foreground text-base font-bold">
              Cổng Thanh Toán VietQR (Web2M Gateway)
            </span>
            <span className="text-muted-foreground text-xs">
              Thông tin tài khoản thụ hưởng hiển thị khi khách hàng quét mã thanh toán
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label nativeID="bank-name">Tên Ngân Hàng</Label>
            <Input
              accessibilityLabel="Tên Ngân Hàng"
              accessibilityLabelledBy="bank-name"
              placeholder="vd: MBBank, Vietcombank, ACB"
              value={bankName}
              onChangeText={setBankName}
              editable={!updateMutation.isPending}
            />
            <span className="text-muted-foreground text-[11px]">
              Mã ngân hàng chuẩn VietQR (vd: MBBank, ACB, VCB)
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label nativeID="bank-number">Số Tài Khoản Nhận Tiền</Label>
            <Input
              accessibilityLabel="Số Tài Khoản"
              accessibilityLabelledBy="bank-number"
              placeholder="vd: 0987654321"
              value={bankNumber}
              onChangeText={setBankNumber}
              editable={!updateMutation.isPending}
            />
            <span className="text-muted-foreground text-[11px]">
              Số tài khoản ngân hàng nhận tiền thanh toán
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label nativeID="account-holder">Tên Chủ Tài Khoản</Label>
            <Input
              accessibilityLabel="Tên Chủ Tài Khoản"
              accessibilityLabelledBy="account-holder"
              placeholder="vd: NGUYEN VAN A"
              value={accountHolder}
              onChangeText={setAccountHolder}
              autoCapitalize="characters"
              editable={!updateMutation.isPending}
            />
            <span className="text-muted-foreground text-[11px]">
              Tên chủ tài khoản không dấu in hoa
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label nativeID="qr-ttl">Thời Gian Hiệu Lực Mã QR (Phút)</Label>
            <Input
              accessibilityLabel="Thời Gian Hiệu Lực"
              accessibilityLabelledBy="qr-ttl"
              placeholder="15"
              value={qrTtlMinutes}
              onChangeText={setQrTtlMinutes}
              keyboardType="numeric"
              editable={!updateMutation.isPending}
            />
            <span className="text-muted-foreground text-[11px]">
              Thời gian tối đa trước khi mã QR hết hạn (mặc định 15 phút)
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label nativeID="bank-password">Mật Khẩu Ngân Hàng (Web2M)</Label>
            <div className="relative flex items-center justify-center">
              <Input
                accessibilityLabel="Mật Khẩu Ngân Hàng Web2M"
                accessibilityLabelledBy="bank-password"
                placeholder="Nhập mật khẩu Web2M / iBanking"
                value={bankPassword}
                onChangeText={setBankPassword}
                secureTextEntry={!showBankPassword}
                editable={!updateMutation.isPending}
              />
              <button
                type="button"
                onClick={() => setShowBankPassword(!showBankPassword)}
                className="hover:text-foreground text-muted-foreground absolute right-3 flex items-center justify-center"
                title={showBankPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              >
                <Icon as={showBankPassword ? EyeOff : Eye} size={16} />
              </button>
            </div>
            <span className="text-muted-foreground text-[11px]">
              Mật khẩu cấu hình trên Web2M để truy vấn biến động số dư
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label nativeID="bank-token">Web2M Bank Token</Label>
            <div className="relative flex items-center justify-center">
              <Input
                accessibilityLabel="Web2M Bank Token"
                accessibilityLabelledBy="bank-token"
                placeholder="Nhập Token được Web2M cấp"
                value={bankToken}
                onChangeText={setBankToken}
                secureTextEntry={!showBankToken}
                editable={!updateMutation.isPending}
              />
              <button
                type="button"
                onClick={() => setShowBankToken(!showBankToken)}
                className="hover:text-foreground text-muted-foreground absolute right-3 flex items-center justify-center"
                title={showBankToken ? "Ẩn Token" : "Hiện Token"}
              >
                <Icon as={showBankToken ? EyeOff : Eye} size={16} />
              </button>
            </div>
            <span className="text-muted-foreground text-[11px]">
              Token bảo mật của ngân hàng lấy từ cổng Web2M
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label nativeID="api-transaction">URL API Lịch Sử Giao Dịch</Label>
            <Input
              accessibilityLabel="URL API Transaction"
              accessibilityLabelledBy="api-transaction"
              placeholder="vd: https://api.web2m.com/historyapiacbv3"
              value={apiGetTransaction}
              onChangeText={setApiGetTransaction}
              autoCapitalize="none"
              editable={!updateMutation.isPending}
            />
            <span className="text-muted-foreground text-[11px]">
              Đường dẫn API lấy transaction (vd: ACB v3, MB v3 hoặc API chung)
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label nativeID="api-qr">URL API QuickLink QR</Label>
            <Input
              accessibilityLabel="URL API QuickLink QR"
              accessibilityLabelledBy="api-qr"
              placeholder="https://api.web2m.com/quicklink"
              value={apiGetQr}
              onChangeText={setApiGetQr}
              autoCapitalize="none"
              editable={!updateMutation.isPending}
            />
            <span className="text-muted-foreground text-[11px]">
              Endpoint sinh ảnh QR tự động (mặc định: https://api.web2m.com/quicklink)
            </span>
          </div>
        </div>

        {/* Test Connection Action Box */}
        <div className="border-border/60 bg-muted/30 flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col">
            <span className="text-foreground text-xs font-semibold">
              Kiểm Tra Xác Thực Web2M
            </span>
            <span className="text-muted-foreground text-[11px]">
              Gửi yêu cầu thử nghiệm tới API lịch sử giao dịch để kiểm tra tính hợp lệ của
              STK, mật khẩu và token.
            </span>
          </div>

          <button
            type="button"
            onClick={handleTestConnection}
            disabled={isTesting || updateMutation.isPending}
            className="border-primary/20 bg-primary/10 hover:bg-primary/20 text-primary flex shrink-0 flex-row items-center justify-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-semibold transition-colors disabled:opacity-50"
          >
            <Icon
              as={isTesting ? RefreshCw : Zap}
              size={14}
              className={isTesting ? "animate-spin" : ""}
            />
            <span>{isTesting ? "Đang kiểm tra..." : "Kiểm Tra Kết Nối Web2M"}</span>
          </button>
        </div>

        {testFeedback ? (
          <div
            className={`flex flex-row items-start gap-2.5 rounded-xl border p-3.5 ${
              testFeedback.type === "success"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "border-destructive/30 bg-destructive/10 text-destructive"
            }`}
          >
            <Icon
              as={testFeedback.type === "success" ? Check : CircleAlert}
              size={16}
              className="mt-0.5 shrink-0"
            />
            <span className="text-xs font-medium leading-relaxed">
              {testFeedback.message}
            </span>
          </div>
        ) : null}
      </div>

      {/* SECTION 3: CSKH & SUPPORT */}
      <div className="border-border bg-card flex flex-col gap-6 rounded-2xl border p-6 shadow-sm">
        <div className="flex flex-row items-center gap-3 border-b border-border pb-4">
          <div className="bg-blue-500/10 flex h-10 w-10 items-center justify-center rounded-xl">
            <Icon as={ExternalLink} size={20} className="text-blue-500" />
          </div>
          <div className="flex flex-col">
            <span className="text-foreground text-base font-bold">
              Kênh Chăm Sóc Khách Hàng (Hỗ Trợ Thanh Toán)
            </span>
            <span className="text-muted-foreground text-xs">
              Đường link CSKH hiển thị trên trang thanh toán khi người dùng cần hỗ trợ
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label nativeID="zalo-url">Đường Dẫn Zalo Hỗ Trợ</Label>
          <Input
            accessibilityLabel="Đường Dẫn Zalo"
            accessibilityLabelledBy="zalo-url"
            placeholder="vd: https://zalo.me/g/xxxxxx"
            value={supportZaloUrl}
            onChangeText={setSupportZaloUrl}
            autoCapitalize="none"
            editable={!updateMutation.isPending}
          />
        </div>
      </div>

      {/* SAVE ACTION & AUDIT INFO */}
      <div className="border-border bg-card flex flex-col justify-between gap-4 rounded-2xl border p-6 shadow-sm sm:flex-row sm:items-center">
        <div className="flex flex-row items-center gap-2 text-xs text-muted-foreground">
          <Icon as={Clock} size={14} className="text-muted-foreground" />
          <span>
            Cập nhật lần cuối:{" "}
            <strong className="text-foreground">{formatDate(config?.updatedAt)}</strong>{" "}
            bởi{" "}
            <strong className="text-foreground">{config?.updatedBy ?? "Hệ thống"}</strong>
          </span>
        </div>

        <button
          type="button"
          onClick={handleSaveForm}
          disabled={updateMutation.isPending || isLoading}
          className="bg-primary hover:bg-primary/90 text-primary-foreground flex flex-row items-center justify-center gap-2 rounded-lg px-6 py-2.5 text-xs font-bold transition-all shadow-sm disabled:opacity-50"
        >
          {updateMutation.isPending ? (
            <Icon
              as={RefreshCw}
              size={14}
              className="text-primary-foreground animate-spin"
            />
          ) : (
            <Icon as={Save} size={14} className="text-primary-foreground" />
          )}
          <span>{updateMutation.isPending ? "Đang lưu..." : "Lưu Cấu Hình"}</span>
        </button>
      </div>

      {/* SAFETY CONFIRMATION MODAL */}
      {isFreeModeModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="border-border bg-card w-full max-w-md rounded-2xl border p-6 shadow-2xl">
            <div className="flex flex-col items-center text-center">
              <div
                className={`mb-3 flex h-14 w-14 items-center justify-center rounded-2xl ${
                  pendingFreeModeValue
                    ? "bg-amber-500/10 text-amber-500"
                    : "bg-blue-500/10 text-blue-500"
                }`}
              >
                <Icon
                  as={pendingFreeModeValue ? ShieldAlert : Crown}
                  size={32}
                  className="text-current"
                />
              </div>

              <h3 className="text-foreground text-lg font-bold">
                {pendingFreeModeValue
                  ? "Bật Chế Độ Miễn Phí (Free Mode)?"
                  : "Tắt Chế Độ Miễn Phí?"}
              </h3>

              <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
                {pendingFreeModeValue
                  ? "CẢNH BÁO: Khi bật Chế độ Miễn phí, mọi tài khoản người dùng trên app di động sẽ lập tức được dùng toàn bộ tính năng VIP mà không cần nạp tiền. Doanh thu phát sinh sẽ bằng 0."
                  : "Khi tắt Chế độ Miễn phí, hệ thống sẽ khôi phục lại quy trình thu phí gói VIP. Người dùng hết hạn VIP sẽ phải mua gói qua VietQR như bình thường."}
              </p>
            </div>

            <div className="mt-6 flex flex-row gap-3">
              <button
                type="button"
                onClick={() => setIsFreeModeModalOpen(false)}
                className="border-border bg-background hover:bg-muted text-foreground flex-1 rounded-lg border py-2.5 text-xs font-semibold transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmFreeModeToggle}
                disabled={updateMutation.isPending}
                className={`flex-1 rounded-lg py-2.5 text-xs font-bold text-white transition-all shadow-sm ${
                  pendingFreeModeValue
                    ? "bg-amber-600 hover:bg-amber-700"
                    : "bg-primary hover:bg-primary/90"
                }`}
              >
                {updateMutation.isPending ? "Đang xử lý..." : "Xác nhận & Cập nhật"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
