"use client";

import CircleAlert from "lucide-react-native/icons/circle-alert";
import Eye from "lucide-react-native/icons/eye";
import EyeOff from "lucide-react-native/icons/eye-off";
import Lock from "lucide-react-native/icons/lock";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { ActivityIndicator, Pressable, View } from "react-native";

import { adminLogin, getAdminMe } from "@repo/api-contract";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Icon,
  Input,
  Label,
  Text,
} from "@repo/ui";

import { TerdinLogo } from "../../../src/components/terdin-logo";
import { useAdminAuthStore } from "../../../src/stores/admin-auth";

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "/";

  const { adminToken, hydrated, login } = useAdminAuthStore();

  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (hydrated && adminToken) {
      router.replace(redirectUrl);
    }
  }, [hydrated, adminToken, router, redirectUrl]);

  const handleSubmit = async () => {
    if (!username.trim() || !password.trim()) {
      setError("Vui lòng điền đầy đủ tên đăng nhập và mật khẩu.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const tokenRes = await adminLogin({
        username: username.trim(),
        password: password.trim(),
      });

      const userRes = await getAdminMe(tokenRes.accessToken);

      login(tokenRes.accessToken, userRes);
      router.replace(redirectUrl);
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "response" in err
          ? ((err as { response?: { data?: { detail?: string } } }).response?.data
              ?.detail ?? "Tên đăng nhập hoặc mật khẩu không chính xác.")
          : "Không thể kết nối đến máy chủ. Vui lòng thử lại sau.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (!hydrated) {
    return (
      <View className="bg-background flex min-h-screen items-center justify-center">
        <ActivityIndicator size="large" className="text-primary" />
      </View>
    );
  }

  return (
    <View className="bg-background flex min-h-screen items-center justify-center p-4">
      <View className="w-full max-w-md">
        <Card className="border-border bg-card shadow-lg">
          <CardHeader className="items-center text-center">
            <div className="mb-2 flex justify-center">
              <TerdinLogo size={52} showText={false} />
            </div>
            <div className="mb-1 flex flex-row items-center gap-2">
              <CardTitle className="text-2xl font-black tracking-tight">Terdin</CardTitle>
              <span className="bg-gradient-to-r from-rose-500 to-purple-600 text-white text-xs font-extrabold uppercase px-2 py-0.5 rounded tracking-wider shadow-xs">
                Admin
              </span>
            </div>
            <CardDescription className="text-muted-foreground text-center text-sm">
              Cổng Quản Trị Hệ Thống Terdin Date
            </CardDescription>
          </CardHeader>

          <CardContent className="gap-4">
            {error ? (
              <View className="border-destructive/30 bg-destructive/10 flex-row items-center gap-2.5 rounded-lg border p-3">
                <Icon as={CircleAlert} className="text-destructive" size={18} />
                <Text className="text-destructive flex-1 text-sm">{error}</Text>
              </View>
            ) : null}

            <View className="gap-1.5">
              <Label nativeID="username-label">Tên đăng nhập</Label>
              <View className="relative justify-center">
                <Input
                  accessibilityLabel="Tên đăng nhập"
                  accessibilityLabelledBy="username-label"
                  placeholder="Nhập tên đăng nhập"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
              </View>
            </View>

            <View className="gap-1.5">
              <Label nativeID="password-label">Mật khẩu</Label>
              <View className="relative justify-center">
                <Input
                  accessibilityLabel="Mật khẩu"
                  accessibilityLabelledBy="password-label"
                  placeholder="Nhập mật khẩu"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  editable={!loading}
                />
                <Pressable
                  className="absolute right-3 top-2.5"
                  onPress={() => setShowPassword(!showPassword)}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  <Icon
                    as={showPassword ? EyeOff : Eye}
                    size={18}
                    className="text-muted-foreground"
                  />
                </Pressable>
              </View>
            </View>

            <Button
              className="mt-2 w-full"
              size="lg"
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <View className="flex-row items-center gap-2">
                  <Icon as={Lock} size={16} className="text-primary-foreground" />
                  <Text className="text-primary-foreground font-semibold">Đăng nhập</Text>
                </View>
              )}
            </Button>
          </CardContent>
        </Card>
      </View>
    </View>
  );
}

export default function AdminLoginPage() {
  return (
    <React.Suspense
      fallback={
        <View className="bg-background flex min-h-screen items-center justify-center">
          <ActivityIndicator size="large" className="text-primary" />
        </View>
      }
    >
      <AdminLoginForm />
    </React.Suspense>
  );
}
