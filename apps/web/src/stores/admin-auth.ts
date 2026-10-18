import { create } from "zustand";

import type { AdminMeRead } from "@repo/api-contract";

const ADMIN_TOKEN_KEY = "terdin.adminToken";
const ADMIN_USER_KEY = "terdin.adminUser";

export interface AdminAuthState {
  adminToken: string | null;
  adminUser: AdminMeRead | null;
  hydrated: boolean;
  hydrate: () => void;
  login: (token: string, user: AdminMeRead) => void;
  logout: () => void;
}

export const useAdminAuthStore = create<AdminAuthState>((set) => ({
  adminToken: null,
  adminUser: null,
  hydrated: false,

  hydrate: () => {
    if (typeof window === "undefined") {
      set({ hydrated: true });
      return;
    }
    try {
      const adminToken = localStorage.getItem(ADMIN_TOKEN_KEY);
      const rawUser = localStorage.getItem(ADMIN_USER_KEY);
      const adminUser = rawUser ? (JSON.parse(rawUser) as AdminMeRead) : null;
      set({ adminToken, adminUser, hydrated: true });
    } catch {
      set({ adminToken: null, adminUser: null, hydrated: true });
    }
  },

  login: (token: string, user: AdminMeRead) => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(ADMIN_TOKEN_KEY, token);
        localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(user));
      } catch {
        // ignore quota / storage errors
      }
    }
    set({ adminToken: token, adminUser: user, hydrated: true });
  },

  logout: () => {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(ADMIN_TOKEN_KEY);
        localStorage.removeItem(ADMIN_USER_KEY);
      } catch {
        // ignore quota / storage errors
      }
    }
    set({ adminToken: null, adminUser: null, hydrated: true });
  },
}));
