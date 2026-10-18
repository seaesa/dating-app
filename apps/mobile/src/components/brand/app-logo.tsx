import * as React from "react";
import { View } from "react-native";
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient,
  Path,
  RadialGradient,
  Stop,
} from "react-native-svg";

export function AppLogo({
  size = 40,
  showAura = false,
}: {
  size?: number;
  showAura?: boolean;
}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Svg width={size} height={size} viewBox="0 0 1024 1024" fill="none">
        <Defs>
          {/* Hào quang phía sau */}
          <RadialGradient id="mHaloGlow" cx="50%" cy="48%" r="48%">
            <Stop offset="0%" stopColor="#FF2E7E" stopOpacity="0.45" />
            <Stop offset="45%" stopColor="#7928CA" stopOpacity="0.25" />
            <Stop offset="100%" stopColor="#08040E" stopOpacity="0" />
          </RadialGradient>

          {/* Dải lụa trái: Hồng Neon sang Đỏ Ruby */}
          <LinearGradient
            id="mRibbonLeft"
            x1="220"
            y1="220"
            x2="520"
            y2="820"
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0%" stopColor="#FF4392" />
            <Stop offset="35%" stopColor="#FF1E56" />
            <Stop offset="80%" stopColor="#D9044D" />
            <Stop offset="100%" stopColor="#9E0038" />
          </LinearGradient>

          {/* Dải lụa phải: Tím Hoàng Gia sang Ultraviolet */}
          <LinearGradient
            id="mRibbonRight"
            x1="804"
            y1="220"
            x2="504"
            y2="820"
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0%" stopColor="#C084FC" />
            <Stop offset="35%" stopColor="#9333EA" />
            <Stop offset="75%" stopColor="#6B21A8" />
            <Stop offset="100%" stopColor="#4C1D95" />
          </LinearGradient>

          {/* Vòm kết nối mặt nạ bí mật */}
          <LinearGradient
            id="mRevealArch"
            x1="260"
            y1="260"
            x2="764"
            y2="260"
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0%" stopColor="#FF65A3" />
            <Stop offset="50%" stopColor="#FA26A0" />
            <Stop offset="100%" stopColor="#A855F7" />
          </LinearGradient>

          {/* Cạnh ánh sáng phản chiếu */}
          <LinearGradient
            id="mSpecLeft"
            x1="240"
            y1="230"
            x2="480"
            y2="520"
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.6" />
            <Stop offset="40%" stopColor="#FFFFFF" stopOpacity="0.15" />
            <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </LinearGradient>

          <LinearGradient
            id="mSpecRight"
            x1="784"
            y1="230"
            x2="544"
            y2="520"
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.5" />
            <Stop offset="40%" stopColor="#FFFFFF" stopOpacity="0.1" />
            <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </LinearGradient>

          {/* Trái tim lõi tâm */}
          <LinearGradient
            id="mInnerGem"
            x1="512"
            y1="360"
            x2="512"
            y2="650"
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0%" stopColor="#FFFFFF" />
            <Stop offset="60%" stopColor="#FFE4EE" />
            <Stop offset="100%" stopColor="#FECDD3" />
          </LinearGradient>

          {/* Flare tinh tú */}
          <RadialGradient id="mStarGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#FFFFFF" />
            <Stop offset="35%" stopColor="#FF8EB4" stopOpacity="0.9" />
            <Stop offset="70%" stopColor="#E11D48" stopOpacity="0.3" />
            <Stop offset="100%" stopColor="#E11D48" stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {showAura && <Circle cx="512" cy="490" r="370" fill="url(#mHaloGlow)" />}

        <G>
          {/* Cánh Trái */}
          <Path
            d="M512 345C450 240 330 205 235 255C140 305 130 440 190 550C250 660 410 760 512 825C485 750 430 670 380 600C315 510 305 435 345 375C385 315 460 315 512 345Z"
            fill="url(#mRibbonLeft)"
          />

          {/* Cánh Phải */}
          <Path
            d="M512 345C574 240 694 205 789 255C884 305 894 440 834 550C774 660 614 760 512 825C539 750 594 670 644 600C709 510 719 435 679 375C639 315 564 315 512 345Z"
            fill="url(#mRibbonRight)"
          />

          {/* Vòm kết nối Masquerade */}
          <Path
            d="M512 355C440 270 340 245 255 285C215 305 185 340 170 385C195 340 245 305 315 295C405 280 480 320 512 355C544 320 619 280 709 295C779 305 829 340 854 385C839 340 809 305 769 285C684 245 584 270 512 355Z"
            fill="url(#mRevealArch)"
          />

          {/* Highlight Trái */}
          <Path
            d="M255 285C340 245 440 270 512 355C470 320 405 290 325 300C245 310 195 350 175 400C170 365 195 320 255 285Z"
            fill="url(#mSpecLeft)"
          />

          {/* Highlight Phải */}
          <Path
            d="M769 285C684 245 584 270 512 355C554 320 619 290 699 300C779 310 829 350 849 400C854 365 829 320 769 285Z"
            fill="url(#mSpecRight)"
          />

          {/* Trái Tim Lõi */}
          <Path
            d="M512 430C485 390 435 395 410 430C385 465 410 520 512 590C614 520 639 465 614 430C589 395 539 390 512 430Z"
            fill="url(#mInnerGem)"
          />

          {/* Ngôi sao 4 cánh */}
          <G x={512} y={490}>
            <Circle cx={0} cy={0} r={70} fill="url(#mStarGlow)" />
            <Path d="M0 -65L8 -15L15 0L8 15L0 65L-8 15L-15 0L-8 -15Z" fill="#FFFFFF" />
            <Path d="M-65 0L-15 -8L0 -15L15 -8L65 0L15 8L0 15L-15 8Z" fill="#FFFFFF" />
            <Path d="M-28 -28L-8 -4L0 0L-4 -8Z" fill="#FFFFFF" opacity={0.8} />
            <Path d="M28 -28L8 -4L0 0L4 -8Z" fill="#FFFFFF" opacity={0.8} />
            <Path d="M28 28L8 4L0 0L4 8Z" fill="#FFFFFF" opacity={0.8} />
            <Path d="M-28 28L-8 4L0 0L-4 8Z" fill="#FFFFFF" opacity={0.8} />
            <Circle cx={0} cy={0} r={6} fill="#FFF1F2" />
          </G>
        </G>
      </Svg>
    </View>
  );
}
