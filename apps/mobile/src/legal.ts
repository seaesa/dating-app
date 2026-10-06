import { Alert, Linking } from "react-native";

// Read directly so Expo inlines them at build time.
const TERMS_URL = process.env.EXPO_PUBLIC_TERMS_URL;
const PRIVACY_URL = process.env.EXPO_PUBLIC_PRIVACY_URL;

function open(url: string | undefined) {
  if (url) {
    void Linking.openURL(url);
  } else {
    Alert.alert("Đang cập nhật", "Tài liệu này sẽ sớm có mặt.");
  }
}

export const openTerms = () => open(TERMS_URL);
export const openPrivacy = () => open(PRIVACY_URL);
