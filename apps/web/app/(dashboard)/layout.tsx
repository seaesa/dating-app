"use client";

import CreditCard from "lucide-react-native/icons/credit-card";
import Crown from "lucide-react-native/icons/crown";
import LayoutDashboard from "lucide-react-native/icons/layout-dashboard";
import LogOut from "lucide-react-native/icons/log-out";
import Menu from "lucide-react-native/icons/menu";
import Settings from "lucide-react-native/icons/settings";
import Shield from "lucide-react-native/icons/shield";
import User from "lucide-react-native/icons/user";
import Users from "lucide-react-native/icons/users";
import X from "lucide-react-native/icons/x";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import { ActivityIndicator, View } from "react-native";

import { Badge, Icon, Text } from "@repo/ui";

import { PwaInstallButton } from "../../src/components/pwa-install";
import { TerdinLogo } from "../../src/components/terdin-logo";
import { useAdminAuthStore } from "../../src/stores/admin-auth";

interface NavItem {
  name: string;
  href: string;
  icon: typeof LayoutDashboard;
}

const DESKTOP_NAV_ITEMS: NavItem[] = [
  { name: "Tổng quan", href: "/", icon: LayoutDashboard },
  { name: "Quản lý Người dùng", href: "/users", icon: Users },
  { name: "Gói Hội viên VIP", href: "/members", icon: Crown },
  { name: "Đơn hàng & Doanh thu", href: "/payments", icon: CreditCard },
  { name: "Cấu hình Hệ thống", href: "/settings", icon: Settings },
  { name: "Nhật ký Kiểm toán", href: "/audit-logs", icon: Shield },
];

const MOBILE_PRIMARY_TABS: NavItem[] = [
  { name: "Tổng quan", href: "/", icon: LayoutDashboard },
  { name: "Người dùng", href: "/users", icon: Users },
  { name: "Đơn hàng", href: "/payments", icon: CreditCard },
  { name: "Gói VIP", href: "/members", icon: Crown },
];

const MOBILE_DRAWER_ITEMS: NavItem[] = [
  { name: "Cấu hình Hệ thống", href: "/settings", icon: Settings },
  { name: "Nhật ký Kiểm toán", href: "/audit-logs", icon: Shield },
];

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { adminToken, adminUser, hydrated, logout } = useAdminAuthStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  React.useEffect(() => {
    if (hydrated && !adminToken) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [hydrated, adminToken, router, pathname]);

  // Tự động đóng Bottom Sheet Menu khi chuyển trang
  React.useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  if (!hydrated || !adminToken) {
    return (
      <View className="bg-background flex min-h-screen items-center justify-center">
        <ActivityIndicator size="large" className="text-primary" />
      </View>
    );
  }

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  const getPageTitle = () => {
    if (pathname === "/") return "Tổng quan Hệ thống";
    const found = DESKTOP_NAV_ITEMS.find(
      (item) => item.href !== "/" && pathname.startsWith(item.href),
    );
    return found ? found.name : "Quản trị";
  };

  const isDrawerActive = MOBILE_DRAWER_ITEMS.some((item) =>
    pathname.startsWith(item.href),
  );

  return (
    <div className="bg-background flex h-screen w-screen overflow-hidden flex-row">
      {/* ======================================================== */}
      {/* 1. DESKTOP SIDEBAR (Ẩn trên mobile, cố định h-screen)    */}
      {/* ======================================================== */}
      <aside className="border-border bg-card hidden md:flex w-[260px] h-screen shrink-0 flex-col justify-between border-r">
        <div className="flex flex-col flex-1 min-h-0">
          {/* Logo & Portal Branding (Cố định ở đỉnh) */}
          <div className="border-border flex h-16 shrink-0 flex-row items-center border-b px-5">
            <TerdinLogo size={36} showText={true} />
          </div>

          {/* Navigation Links: Cuộn độc lập khi danh sách dài */}
          <nav className="flex-1 overflow-y-auto min-h-0 flex flex-col gap-1 p-3">
            {DESKTOP_NAV_ITEMS.map((item) => {
              const isActive =
                item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-row items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  }`}
                >
                  <Icon
                    as={item.icon}
                    size={18}
                    className={isActive ? "text-primary" : "text-muted-foreground"}
                  />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer: Thông tin Admin & Đăng xuất (Cố định ở đáy) */}
        <div className="border-border shrink-0 flex flex-col gap-3 border-t p-4">
          <PwaInstallButton variant="sidebar" />

          <div className="flex flex-row items-center justify-between">
            <div className="flex flex-row items-center gap-2.5">
              <div className="bg-muted flex h-8 w-8 items-center justify-center rounded-full">
                <Icon as={User} size={16} className="text-muted-foreground" />
              </div>
              <div className="flex flex-col">
                <span className="text-foreground text-sm font-semibold leading-none">
                  {adminUser?.username ?? "Admin"}
                </span>
                <span className="text-muted-foreground mt-0.5 text-xs capitalize">
                  {adminUser?.role ?? "moderator"}
                </span>
              </div>
            </div>
            <Badge
              variant={adminUser?.role === "superadmin" ? "default" : "secondary"}
              className="px-2 py-0.5"
            >
              <Text className="text-[11px] font-semibold uppercase">
                {adminUser?.role === "superadmin" ? "Root" : "Mod"}
              </Text>
            </Badge>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="border-border text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 flex w-full flex-row items-center justify-center gap-2 rounded-lg border py-2 text-xs font-semibold transition-colors"
          >
            <Icon as={LogOut} size={14} className="text-current" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* ======================================================== */}
      {/* 2. MAIN WORKSPACE (Cuộn riêng rẽ không trôi sidebar)     */}
      {/* ======================================================== */}
      <div className="flex flex-1 flex-col h-screen min-w-0 overflow-hidden bg-background">
        {/* Header Bar cố định */}
        <header className="border-border bg-card flex h-16 shrink-0 flex-row items-center justify-between border-b px-4 md:px-8">
          <div className="flex flex-row items-center gap-2.5">
            {/* Logo thu nhỏ trên Mobile */}
            <div className="flex md:hidden items-center shrink-0">
              <TerdinLogo size={28} showText={false} />
            </div>
            <h1 className="text-foreground text-base md:text-lg font-bold truncate">
              {getPageTitle()}
            </h1>
          </div>

          <div className="flex flex-row items-center gap-2.5 sm:gap-3">
            <PwaInstallButton variant="header" />
            <div className="hidden sm:flex flex-row items-center gap-2">
              <span className="text-muted-foreground text-xs">Đang đăng nhập:</span>
              <span className="text-foreground text-xs font-semibold">
                {adminUser?.username}
              </span>
            </div>
            <Badge
              variant={adminUser?.role === "superadmin" ? "default" : "secondary"}
              className="px-2 py-0.5 text-[10px] font-semibold uppercase"
            >
              <Text>{adminUser?.role === "superadmin" ? "Root" : "Mod"}</Text>
            </Badge>
          </div>
        </header>

        {/* Nội dung trang: Cuộn độc lập, có pb-24 trên mobile để không đè bottom nav */}
        <main className="bg-background flex-1 overflow-y-auto min-h-0 p-4 md:p-8 pb-24 md:pb-8">
          {children}
        </main>
      </div>

      {/* ======================================================== */}
      {/* 3. MOBILE BOTTOM NAVIGATION (Chuẩn Mobile App PWA)       */}
      {/* ======================================================== */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border flex flex-row items-center justify-around h-16 px-1 safe-bottom shadow-lg"
      >
        {MOBILE_PRIMARY_TABS.map((tab) => {
          const isActive =
            tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center justify-center flex-1 py-1 gap-1 transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon
                as={tab.icon}
                size={20}
                className={isActive ? "text-primary" : "text-muted-foreground"}
              />
              <span
                className={`text-[11px] font-medium leading-none ${
                  isActive ? "text-primary font-semibold" : "text-muted-foreground"
                }`}
              >
                {tab.name}
              </span>
            </Link>
          );
        })}

        {/* Nút Menu bên phải ngoài cùng */}
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(true)}
          className={`flex flex-col items-center justify-center flex-1 py-1 gap-1 transition-colors ${
            isDrawerActive || isMobileMenuOpen
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Icon
            as={Menu}
            size={20}
            className={
              isDrawerActive || isMobileMenuOpen
                ? "text-primary"
                : "text-muted-foreground"
            }
          />
          <span
            className={`text-[11px] font-medium leading-none ${
              isDrawerActive || isMobileMenuOpen
                ? "text-primary font-semibold"
                : "text-muted-foreground"
            }`}
          >
            Menu
          </span>
        </button>
      </nav>

      {/* ======================================================== */}
      {/* 4. MOBILE MENU DRAWER / BOTTOM SHEET                     */}
      {/* ======================================================== */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop mờ */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setIsMobileMenuOpen(false);
            }}
            role="button"
            tabIndex={0}
            aria-label="Đóng menu"
          />

          {/* Sheet trượt từ đáy lên */}
          <div className="relative z-50 bg-card rounded-t-3xl border-t border-border p-5 pb-8 shadow-2xl flex flex-col gap-4 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
            {/* Thanh gạt drag handle */}
            <div className="mx-auto h-1 w-12 rounded-full bg-muted-foreground/30 mb-1" />

            {/* Header của Sheet */}
            <div className="flex flex-row items-center justify-between pb-2 border-b border-border">
              <TerdinLogo size={32} showText={true} />
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="bg-muted text-muted-foreground hover:text-foreground flex h-8 w-8 items-center justify-center rounded-full transition-colors cursor-pointer"
              >
                <Icon as={X} size={16} />
              </button>
            </div>

            {/* Profile Card */}
            <div className="bg-muted/50 rounded-xl p-3 flex flex-row items-center justify-between">
              <div className="flex flex-row items-center gap-3">
                <div className="bg-card flex h-10 w-10 items-center justify-center rounded-full border border-border">
                  <Icon as={User} size={18} className="text-muted-foreground" />
                </div>
                <div className="flex flex-col">
                  <span className="text-foreground text-sm font-semibold">
                    {adminUser?.username ?? "Administrator"}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {adminUser?.email ?? "admin@terdindate.vn"}
                  </span>
                </div>
              </div>
              <Badge
                variant={adminUser?.role === "superadmin" ? "default" : "secondary"}
                className="px-2 py-0.5"
              >
                <Text className="text-[10px] font-semibold uppercase">
                  {adminUser?.role === "superadmin" ? "Root" : "Mod"}
                </Text>
              </Badge>
            </div>

            {/* Menu Links trong Drawer */}
            <div className="flex flex-col gap-1.5 py-1">
              <span className="text-muted-foreground text-xs font-semibold px-1 mb-1 uppercase tracking-wider">
                Quản trị nâng cao
              </span>
              {MOBILE_DRAWER_ITEMS.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex flex-row items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-primary/10 text-primary font-semibold"
                        : "text-foreground hover:bg-muted/60"
                    }`}
                  >
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                        isActive
                          ? "bg-primary/20 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <Icon as={item.icon} size={18} className="text-current" />
                    </div>
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>

            {/* Nút Cài đặt PWA */}
            <div className="pt-1">
              <PwaInstallButton
                variant="drawer"
                onInstalled={() => setIsMobileMenuOpen(false)}
              />
            </div>

            {/* Nút Đăng xuất */}
            <div className="pt-2 border-t border-border">
              <button
                type="button"
                onClick={handleLogout}
                className="bg-destructive/10 text-destructive hover:bg-destructive/20 flex w-full flex-row items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-colors"
              >
                <Icon as={LogOut} size={16} className="text-destructive" />
                <span>Đăng xuất tài khoản</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
