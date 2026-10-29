export const date = (s) =>
  new Date(s.replace(" ", "T") + (s.includes("Z") ? "" : "Z")).toLocaleString(
    "pt-BR",
  );
