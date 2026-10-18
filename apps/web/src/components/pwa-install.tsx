"use client";

import Download from "lucide-react-native/icons/download";
import Plus from "lucide-react-native/icons/plus";
import Share from "lucide-react-native/icons/share";
import Smartphone from "lucide-react-native/icons/smartphone";
import X from "lucide-react-native/icons/x";
import * as React from "react";

import { Icon } from "@repo/ui";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

declare global {
  interface Window {
    __pwaInstallPrompt?: BeforeInstallPromptEvent | null;
  }
}

export function PwaInstallButton({
  variant = "header",
  onInstalled,
}: {
  variant?: "header" | "sidebar" | "drawer";
  onInstalled?: () => void;
}) {
  const [deferredPrompt, setDeferredPrompt] =
    React.useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = React.useState(false);
  const [isStandalone, setIsStandalone] = React.useState(false);
  const [showModal, setShowModal] = React.useState(false);

  React.useEffect(() => {
    // 1. Kiểm tra standalone
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      Boolean((window.navigator as unknown as { standalone?: boolean }).standalone);
    setIsStandalone(standalone);

    // 2. Kiểm tra iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice =
      /iphone|ipad|ipod/.test(userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    setIsIos(isIosDevice);

    // 3. Lấy prompt được lưu sớm từ <head> nếu có
    if (window.__pwaInstallPrompt) {
      setDeferredPrompt(window.__pwaInstallPrompt);
    }

    const handlePromptReady = () => {
      if (window.__pwaInstallPrompt) {
        setDeferredPrompt(window.__pwaInstallPrompt);
      }
    };

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      window.__pwaInstallPrompt = promptEvent;
      setDeferredPrompt(promptEvent);
    };

    window.addEventListener("pwa-prompt-ready", handlePromptReady);
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    return () => {
      window.removeEventListener("pwa-prompt-ready", handlePromptReady);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isStandalone) {
      return;
    }

    // Lấy prompt khả dụng
    const activePrompt = deferredPrompt || window.__pwaInstallPrompt;

    if (activePrompt) {
      try {
        await activePrompt.prompt();
        const { outcome } = await activePrompt.userChoice;
        if (outcome === "accepted") {
          setIsStandalone(true);
          setDeferredPrompt(null);
          window.__pwaInstallPrompt = null;
          onInstalled?.();
        }
      } catch (err) {
        console.error("Lỗi khi mở prompt cài đặt:", err);
      }
      return;
    }

    // Nếu không bắt được prompt native (iOS Safari hoặc chưa sẵn sàng)
    setShowModal(true);
  };

  // Đã cài rồi thì ẩn nút
  if (isStandalone) {
    return null;
  }

  return (
    <>
      {variant === "header" ? (
        <button
          type="button"
          onClick={handleInstallClick}
          title="Cài đặt app"
          className="border-primary/40 bg-primary/10 hover:bg-primary/20 text-primary flex flex-row items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
        >
          <Icon as={Download} size={14} className="text-primary" />
          <span>Cài đặt app</span>
        </button>
      ) : variant === "sidebar" ? (
        <button
          type="button"
          onClick={handleInstallClick}
          className="border-border bg-muted/40 hover:bg-muted text-foreground flex w-full flex-row items-center justify-center gap-2 rounded-xl border py-2.5 px-3 text-xs font-semibold transition-colors active:scale-98 cursor-pointer"
        >
          <Icon as={Download} size={15} className="text-primary" />
          <span>Cài đặt app</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={handleInstallClick}
          className="border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary flex w-full flex-row items-center justify-between rounded-xl border p-3.5 transition-colors active:scale-98 cursor-pointer"
        >
          <div className="flex flex-row items-center gap-3">
            <div className="bg-primary/20 flex h-9 w-9 items-center justify-center rounded-lg">
              <Icon as={Download} size={18} className="text-primary" />
            </div>
            <span className="text-foreground text-sm font-bold">Cài đặt app</span>
          </div>
          <span className="bg-primary text-primary-foreground rounded-lg px-2.5 py-1 text-xs font-bold shadow-sm">
            Cài đặt
          </span>
        </button>
      )}

      {/* Modal Hướng Dẫn Cài Đặt (Cho iOS hoặc khi trình duyệt Chrome chưa kích hoạt prompt) */}
      {showModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setShowModal(false)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setShowModal(false);
            }}
            role="button"
            tabIndex={0}
            aria-label="Đóng hướng dẫn"
          />

          <div className="relative z-50 bg-card rounded-2xl border border-border p-6 shadow-2xl max-w-md w-full flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex flex-row items-center justify-between border-b border-border pb-3">
              <div className="flex flex-row items-center gap-2.5">
                <div className="bg-primary/10 flex h-9 w-9 items-center justify-center rounded-xl">
                  <Icon as={Smartphone} size={18} className="text-primary" />
                </div>
                <div className="flex flex-col">
                  <span className="text-foreground text-base font-bold">
                    Cài Đặt Terdin Admin
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {isIos
                      ? "Hướng dẫn thêm vào Màn hình chính (iOS)"
                      : "Cài đặt ứng dụng"}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="bg-muted text-muted-foreground hover:text-foreground flex h-8 w-8 items-center justify-center rounded-full transition-colors"
              >
                <Icon as={X} size={16} />
              </button>
            </div>

            {/* Modal Body */}
            {isIos ? (
              <div className="flex flex-col gap-4 text-xs text-foreground">
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Safari trên iPhone / iPad yêu cầu thêm thủ công qua 3 bước:
                </p>

                <div className="flex flex-col gap-3">
                  <div className="bg-muted/50 rounded-xl p-3 flex flex-row items-start gap-3 border border-border">
                    <span className="bg-primary text-primary-foreground flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold">
                      1
                    </span>
                    <div className="flex flex-col gap-1">
                      <span className="font-semibold text-foreground">
                        Nhấn vào nút Chia sẻ (Share)
                      </span>
                      <span className="text-muted-foreground leading-normal flex flex-row items-center gap-1.5 flex-wrap">
                        Biểu tượng ô vuông có mũi tên
                        <span className="inline-flex items-center gap-1 bg-card border border-border px-1.5 py-0.5 rounded text-foreground font-mono">
                          <Icon as={Share} size={12} className="text-primary" /> Share
                        </span>
                        dưới đáy Safari.
                      </span>
                    </div>
                  </div>

                  <div className="bg-muted/50 rounded-xl p-3 flex flex-row items-start gap-3 border border-border">
                    <span className="bg-primary text-primary-foreground flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold">
                      2
                    </span>
                    <div className="flex flex-col gap-1">
                      <span className="font-semibold text-foreground">
                        Chọn &quot;Thêm vào MH chính&quot;
                      </span>
                      <span className="text-muted-foreground leading-normal flex flex-row items-center gap-1.5 flex-wrap">
                        Nhấn vào dòng
                        <span className="inline-flex items-center gap-1 bg-card border border-border px-1.5 py-0.5 rounded text-foreground font-medium">
                          <Icon as={Plus} size={12} className="text-primary" /> Thêm vào
                          MH chính
                        </span>
                      </span>
                    </div>
                  </div>

                  <div className="bg-muted/50 rounded-xl p-3 flex flex-row items-start gap-3 border border-border">
                    <span className="bg-primary text-primary-foreground flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold">
                      3
                    </span>
                    <div className="flex flex-col gap-1">
                      <span className="font-semibold text-foreground">Xác nhận Thêm</span>
                      <span className="text-muted-foreground leading-normal">
                        Nhấn nút <b>&quot;Thêm&quot;</b> ở góc trên bên phải màn hình để
                        hoàn tất.
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3 text-xs text-foreground">
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Để cài đặt nhanh trên trình duyệt Chrome hoặc Edge:
                </p>

                <div className="bg-muted/50 rounded-xl p-3.5 flex flex-col gap-2 border border-border">
                  <span className="font-semibold text-foreground text-sm">
                    Cài đặt trực tiếp từ thanh địa chỉ (1 Click)
                  </span>
                  <span className="text-muted-foreground leading-relaxed">
                    Nhấn vào biểu tượng <b>Cài đặt ⊞ (màn hình có mũi tên xuống)</b> ở góc
                    phải của thanh địa chỉ URL trình duyệt, sau đó bấm{" "}
                    <b>&quot;Cài đặt&quot;</b>.
                  </span>
                </div>

                <div className="bg-muted/50 rounded-xl p-3.5 flex flex-col gap-2 border border-border">
                  <span className="font-semibold text-foreground text-sm">
                    Hoặc từ Menu trình duyệt
                  </span>
                  <span className="text-muted-foreground leading-relaxed">
                    Nhấn vào dấu 3 chấm <b>(⋮)</b> ở góc trên bên phải trình duyệt → chọn{" "}
                    <b>&quot;Cài đặt Terdin Admin...&quot;</b>.
                  </span>
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex justify-end pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl px-5 py-2.5 text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
