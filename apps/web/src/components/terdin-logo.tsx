import * as React from "react";

export function TerdinLogo({
  size = 36,
  showText = true,
  className = "",
}: {
  size?: number;
  showText?: boolean;
  className?: string;
}) {
  return (
    <div className={`flex flex-row items-center gap-3 select-none ${className}`}>
      {/* Biểu tượng Logo Vector Cách Điệu Cao Cấp */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 transition-transform hover:scale-105 duration-200"
      >
        <defs>
          {/* Gradient Nền Khiên */}
          <linearGradient id="shieldBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF2E7E" />
            <stop offset="50%" stopColor="#E11D48" />
            <stop offset="100%" stopColor="#7928CA" />
          </linearGradient>

          {/* Gradient Cạnh Kim Cương Phản Chiếu */}
          <linearGradient id="facetLight" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.05" />
          </linearGradient>

          {/* Gradient Chữ T và Trái Tim */}
          <linearGradient id="heartGrad" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#FFE4E6" />
          </linearGradient>

          {/* Shadow phát sáng tinh tế */}
          <filter id="logoGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow
              dx="0"
              dy="4"
              stdDeviation="4"
              floodColor="#E11D48"
              floodOpacity="0.3"
            />
          </filter>
        </defs>

        {/* Khung Khiên Bảo Mật (Rule Zero Privacy Shield) */}
        <path
          d="M24 3L8 9V22C8 32.5 14.8 42.1 24 45C33.2 42.1 40 32.5 40 22V9L24 3Z"
          fill="url(#shieldBg)"
          filter="url(#logoGlow)"
        />

        {/* Lớp bóng vát kim cương bên trái */}
        <path
          d="M24 3.5L8.5 9.3V22C8.5 32.2 15.1 41.5 24 44.4V3.5Z"
          fill="url(#facetLight)"
        />

        {/* Cặp Đôi Trái Tim Đan Lồng Cách Điệu (Dating & Connection) */}
        <path
          d="M24 15.5C21.8 12.8 17.5 13.2 15.8 16.2C14.2 19.1 16.2 23.2 24 28.5C31.8 23.2 33.8 19.1 32.2 16.2C30.5 13.2 26.2 12.8 24 15.5Z"
          fill="url(#heartGrad)"
          fillOpacity="0.95"
        />

        {/* Chữ 'T' Quyền Lực & Vương Miện Trung Tâm (Terdin Authority) */}
        <path d="M19 18H29V21H25.5V30H22.5V21H19V18Z" fill="#BE123C" />

        {/* Ngôi sao 4 cánh lấp lánh (Sparkle of Match) */}
        <path
          d="M24 8L25.2 11.2L28.4 12.4L25.2 13.6L24 16.8L22.8 13.6L19.6 12.4L22.8 11.2L24 8Z"
          fill="#FFFFFF"
        />
      </svg>

      {/* Chữ Thương Hiệu & Huy Hiệu ADMIN */}
      {showText && (
        <div className="flex flex-col">
          <div className="flex flex-row items-center gap-1.5">
            <span className="text-foreground text-lg font-black tracking-tight leading-none">
              Terdin
            </span>
            <span className="bg-gradient-to-r from-rose-500 to-purple-600 text-white text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded tracking-wider shadow-xs">
              Admin
            </span>
          </div>
          <span className="text-muted-foreground text-[10px] font-medium tracking-wide mt-0.5">
            Portal Vận Hành
          </span>
        </div>
      )}
    </div>
  );
}
