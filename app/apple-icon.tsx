import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180
};

export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0d736b"
        }}
      >
        <div
          style={{
            width: 126,
            height: 126,
            borderRadius: 28,
            background: "#fff7dd",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "24px 22px",
            boxSizing: "border-box"
          }}
        >
          <div style={{ height: 10, borderRadius: 999, background: "#0d736b", marginBottom: 12 }} />
          <div style={{ height: 10, borderRadius: 999, background: "#0d736b", marginBottom: 12 }} />
          <div style={{ height: 10, width: "72%", borderRadius: 999, background: "#0d736b" }} />
        </div>
      </div>
    ),
    size
  );
}
