import React from "react";

// Keep the supplied artwork intact. Clip only its former subtitle in the layout
// and render the requested application name as live text below the REVO mark.
export function Brand({ className = "", decorative = false }) {
  return (
    <span
      className={`brand-lockup ${className}`.trim()}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : "REVO Processos"}
      aria-hidden={decorative ? "true" : undefined}
    >
      <span className="brand-art">
        <img src="/brand.svg" alt="" aria-hidden="true" draggable="false" />
      </span>
      <span className="brand-subtitle" aria-hidden="true">
        PROCESSOS
      </span>
    </span>
  );
}
