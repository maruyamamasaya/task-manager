import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        alignItems: "center",
        background: "linear-gradient(145deg, #6366f1 0%, #4338ca 100%)",
        borderRadius: 42,
        display: "flex",
        height: "100%",
        justifyContent: "center",
        position: "relative",
        width: "100%",
      }}
    >
      <svg width="138" height="138" viewBox="0 0 64 64">
        <path d="M10 9C21 2 43 2 54 9" fill="none" stroke="white" strokeOpacity="0.15" strokeWidth="3" strokeLinecap="round" />
        <path d="M13 16.5H42" stroke="white" strokeWidth="7" strokeLinecap="round" />
        <path d="M27.5 17V46" stroke="white" strokeWidth="7" strokeLinecap="round" />
        <path d="M37 43L44 50L56 35" fill="none" stroke="#C7D2FE" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>,
    size,
  );
}
