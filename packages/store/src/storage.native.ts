import * as SecureStore from "expo-secure-store";

import type { Storage } from "./storage";

/** Keychain on iOS, Keystore on Android — encrypted at rest, unlike MMKV. */
export const storage: Storage = {
  get: async (key) => {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  set: async (key, value) => {
    await SecureStore.setItemAsync(key, value);
  },
  remove: async (key) => {
    await SecureStore.deleteItemAsync(key);
  },
};
