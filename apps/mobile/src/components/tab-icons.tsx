import * as React from "react";
import type { ColorValue } from "react-native";
import Svg, { Path } from "react-native-svg";

export interface IconProps {
  color?: ColorValue;
  size?: number;
}

/** 1. Trang chủ: Outline Fire / Flame */
export function HomeIcon({ color = "#8E8E93", size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 22C6.5 22 4 18 4 13.5C4 9.5 7 5.5 12 2C13 5 15.5 7 15.5 9.5C15.5 11 14.5 12 13.5 12C12.5 12 12 11 12 9.5C10 11.5 8 13.5 8 16C8 18.5 9.8 20 12 20C14.2 20 16 18.5 16 16C16 15 15.5 14.2 15 13.5C17.5 14.5 20 16.5 20 18.5C20 20.5 16.5 22 12 22Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** 2. Ghép đôi: Outline Heart */
export function MatchesIcon({ color = "#8E8E93", size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** 3. Chat: Outline Speech Bubble */
export function ChatIcon({ color = "#8E8E93", size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** 4. Cá nhân: Outline User in Circle */
export function ProfileIcon({ color = "#8E8E93", size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"
        stroke={color}
        strokeWidth={1.8}
      />
      <Path d="M12 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" stroke={color} strokeWidth={1.8} />
      <Path
        d="M6.168 18.849A4 4 0 0 1 10 16h4a4 4 0 0 1 3.834 2.855"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}
