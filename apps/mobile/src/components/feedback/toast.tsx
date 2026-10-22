import * as Haptics from "expo-haptics";
import CircleAlert from "lucide-react-native/icons/circle-alert";
import CircleCheck from "lucide-react-native/icons/circle-check";
import Info from "lucide-react-native/icons/info";
import X from "lucide-react-native/icons/x";
import * as React from "react";
import { Platform, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon, Text } from "@repo/ui";

export type ToastType = "success" | "error" | "info";

export interface ToastOptions {
  title?: string;
  message: string;
  type?: ToastType;
  duration?: number;
}

interface ToastItem extends ToastOptions {
  id: string;
  type: ToastType;
}

export interface ToastContextValue {
  show: (options: ToastOptions) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  hide: () => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = React.useState<ToastItem | null>(null);
  const insets = useSafeAreaInsets();
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = React.useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setToast(null);
  }, []);

  const show = React.useCallback(
    ({ title, message, type = "info", duration = 2800 }: ToastOptions) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      if (Platform.OS !== "web") {
        if (type === "error") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(
            () => {},
          );
        } else if (type === "success") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
            () => {},
          );
        } else {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        }
      }

      setToast({
        id: Math.random().toString(),
        title,
        message,
        type,
        duration,
      });

      timerRef.current = setTimeout(() => {
        setToast(null);
        timerRef.current = null;
      }, duration);
    },
    [],
  );

  const success = React.useCallback(
    (message: string, title?: string) => show({ type: "success", title, message }),
    [show],
  );

  const error = React.useCallback(
    (message: string, title?: string) => show({ type: "error", title, message }),
    [show],
  );

  const info = React.useCallback(
    (message: string, title?: string) => show({ type: "info", title, message }),
    [show],
  );

  const contextValue = React.useMemo(
    () => ({ show, success, error, info, hide }),
    [show, success, error, info, hide],
  );

  const getToastStyles = (type: ToastType) => {
    switch (type) {
      case "success":
        return {
          container: "bg-emerald-950/95 border-emerald-500/40",
          iconColor: "text-emerald-400",
          textColor: "text-emerald-100",
          icon: CircleCheck,
        };
      case "error":
        return {
          container: "bg-rose-950/95 border-rose-500/40",
          iconColor: "text-rose-400",
          textColor: "text-rose-100",
          icon: CircleAlert,
        };
      case "info":
      default:
        return {
          container: "bg-slate-900/95 border-slate-700/60",
          iconColor: "text-primary",
          textColor: "text-slate-100",
          icon: Info,
        };
    }
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {toast ? (
        <View
          style={{ top: Math.max(insets.top, 16) + 6, left: 16, right: 16 }}
          className="absolute z-50 pointer-events-box-none items-center"
        >
          {(() => {
            const styles = getToastStyles(toast.type);
            return (
              <Pressable
                onPress={hide}
                className={`w-full max-w-md flex-row items-center gap-3 rounded-2xl border p-3.5 shadow-2xl backdrop-blur-md active:opacity-90 ${styles.container}`}
              >
                <View className="h-8 w-8 items-center justify-center rounded-full bg-white/10 shrink-0">
                  <Icon as={styles.icon} size={18} className={styles.iconColor} />
                </View>

                <View className="flex-1 pr-1">
                  {toast.title ? (
                    <Text className={`text-xs font-bold ${styles.textColor}`}>
                      {toast.title}
                    </Text>
                  ) : null}
                  <Text
                    className={`text-xs leading-4 ${styles.textColor} ${toast.title ? "opacity-90" : "font-medium"}`}
                    numberOfLines={2}
                  >
                    {toast.message}
                  </Text>
                </View>

                <Pressable
                  onPress={hide}
                  hitSlop={8}
                  className="h-7 w-7 items-center justify-center rounded-full bg-white/5 active:opacity-60 shrink-0"
                  accessibilityLabel="Đóng thông báo"
                >
                  <Icon as={X} size={14} className="text-white/70" />
                </Pressable>
              </Pressable>
            );
          })()}
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}
