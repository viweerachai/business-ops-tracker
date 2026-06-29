import { ImageResponse } from "next/og";

export const size = {
  width: 512,
  height: 512
};

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
          background: "linear-gradient(180deg, #0d736b 0%, #0f8e83 100%)"
        }}
      >
        <div
          style={{
            width: 360,
            height: 360,
            borderRadius: 72,
            background: "#fff7dd",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "72px 66px",
            boxSizing: "border-box",
            position: "relative"
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 72,
              boxShadow: "inset 0 0 0 14px rgba(13,115,107,0.08)"
            }}
          />
          <div style={{ height: 28, borderRadius: 999, background: "#0d736b", marginBottom: 38 }} />
          <div style={{ height: 28, borderRadius: 999, background: "#0d736b", marginBottom: 38 }} />
          <div style={{ height: 28, width: "72%", borderRadius: 999, background: "#0d736b" }} />
        </div>
      </div>
    ),
    size
  );
}
