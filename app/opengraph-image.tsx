import { ImageResponse } from "next/og";

export const dynamic = "force-static";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #fff7ed 0%, #ffedd5 60%, #fed7aa 100%)",
          fontFamily: "sans-serif",
        }}
      >
        {/* Icon */}
        <div
          style={{
            display: "flex",
            width: 160,
            height: 160,
            borderRadius: 44,
            background: "linear-gradient(140deg, #fcd34d 0%, #f97316 55%, #ea580c 100%)",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 40,
            boxShadow: "0 24px 64px -12px rgba(234,88,12,0.55)",
          }}
        >
          <svg width="110" height="110" viewBox="0 0 40 40" fill="none">
            <g stroke="white" strokeWidth="1.9" strokeLinecap="round" opacity="0.95">
              <line x1="20" y1="8" x2="20" y2="12.5" />
              <line x1="11" y1="11.5" x2="13.6" y2="14.1" />
              <line x1="29" y1="11.5" x2="26.4" y2="14.1" />
            </g>
            <circle cx="20" cy="25" r="7" fill="white" opacity="0.96" />
            <rect x="6.5" y="27" width="27" height="2.4" rx="1.2" fill="white" opacity="0.96" />
            <rect x="11" y="31.4" width="18" height="2" rx="1" fill="white" opacity="0.62" />
          </svg>
        </div>

        {/* Wordmark */}
        <div style={{ display: "flex", fontSize: 80, fontWeight: 800, color: "#1c1917", letterSpacing: "-2px" }}>
          <span>climatize</span>
          <span style={{ color: "#f97316" }}>.now</span>
        </div>

        {/* Tagline */}
        <div style={{ display: "flex", fontSize: 34, color: "#78716c", marginTop: 16 }}>
          Your daily heat-adaptation plan
        </div>

        {/* Badges */}
        <div style={{ display: "flex", gap: 12, marginTop: 44 }}>
          {(["No accounts", "No tracking", "Science-based", "Safety first"] as const).map((t) => (
            <div
              key={t}
              style={{
                display: "flex",
                background: "rgba(234,88,12,0.1)",
                border: "1px solid rgba(234,88,12,0.25)",
                borderRadius: 999,
                padding: "8px 20px",
                fontSize: 22,
                color: "#ea580c",
                fontWeight: 600,
              }}
            >
              {t}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
