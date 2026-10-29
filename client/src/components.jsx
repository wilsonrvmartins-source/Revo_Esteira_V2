import React from "react";
export function Field({ label, ...props }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input {...props} />
    </label>
  );
}
export function Stat({ label, value, detail, icon }) {
  return (
    <div className="stat">
      <div>
        <span>{label}</span>
        <b>{value}</b>
        <small>{detail}</small>
      </div>
      <i>{icon}</i>
    </div>
  );
}
