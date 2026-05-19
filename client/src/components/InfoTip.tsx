// Shared InfoTip component — reusable (i) tooltip for all charts and KPI sections

import { useState } from "react";
import { Info } from "lucide-react";

const NAVY = "#1A1A2E";

interface InfoTipProps {
  text: string;
  width?: number;
  position?: "top" | "bottom" | "left" | "right";
}

export default function InfoTip({ text, width = 260, position = "top" }: InfoTipProps) {
  const [open, setOpen] = useState(false);

  const positionStyles: Record<string, React.CSSProperties> = {
    top: { bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)" },
    bottom: { top: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)" },
    left: { right: "calc(100% + 8px)", top: "50%", transform: "translateY(-50%)" },
    right: { left: "calc(100% + 8px)", top: "50%", transform: "translateY(-50%)" },
  };

  const arrowStyles: Record<string, React.CSSProperties> = {
    top: { position: "absolute", bottom: -4, left: "50%", transform: "translateX(-50%) rotate(45deg)", width: 8, height: 8, background: NAVY },
    bottom: { position: "absolute", top: -4, left: "50%", transform: "translateX(-50%) rotate(45deg)", width: 8, height: 8, background: NAVY },
    left: { position: "absolute", right: -4, top: "50%", transform: "translateY(-50%) rotate(45deg)", width: 8, height: 8, background: NAVY },
    right: { position: "absolute", left: -4, top: "50%", transform: "translateY(-50%) rotate(45deg)", width: 8, height: 8, background: NAVY },
  };

  return (
    <div className="relative inline-flex items-center" style={{ verticalAlign: "middle" }}>
      <button
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={() => setOpen(v => !v)}
        className="flex items-center justify-center rounded-full transition-colors"
        style={{
          width: 16,
          height: 16,
          background: "#F3F4F6",
          border: "1px solid #E8E9EC",
          cursor: "help",
          flexShrink: 0,
        }}
        aria-label="More information"
      >
        <Info size={9} style={{ color: "#9CA3AF" }} />
      </button>
      {open && (
        <div
          className="absolute z-50 rounded-xl p-3 text-xs shadow-xl"
          style={{
            background: NAVY,
            color: "white",
            fontFamily: "DM Sans, sans-serif",
            width,
            lineHeight: 1.6,
            pointerEvents: "none",
            ...positionStyles[position],
          }}
        >
          {text}
          <div style={arrowStyles[position]} />
        </div>
      )}
    </div>
  );
}
