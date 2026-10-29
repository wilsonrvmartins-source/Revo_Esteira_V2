export async function api(url, options = {}) {
  const res = await fetch("/api" + url, {
    ...options,
    headers:
      options.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" },
    body:
      options.body instanceof FormData
        ? options.body
        : options.body
          ? JSON.stringify(options.body)
          : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Falha na solicitação");
  return data;
}
