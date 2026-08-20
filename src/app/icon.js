import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #818cf8 0%, #4338ca 100%)",
          borderRadius: 7,
        }}
      >
        <div
          style={{
            width: 13,
            height: 7,
            marginTop: -2,
            borderLeft: "3px solid white",
            borderBottom: "3px solid white",
            transform: "rotate(-45deg)",
          }}
        />
      </div>
    ),
    { ...size }
  );
}
