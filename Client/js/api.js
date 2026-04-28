function resolveEndpoint() {
  const override = (typeof window !== "undefined" && window.__API_BASE__ && String(window.__API_BASE__).trim())
    ? String(window.__API_BASE__).trim().replace(/\/+$/, "")
    : null;
  if (override) return override;

  const origin = (typeof window !== "undefined" && window.location && typeof window.location.origin === "string")
    ? window.location.origin
    : "";
  return origin.startsWith("http") ? origin : "";
}

export const endpoint = resolveEndpoint();

export function postRequest(url, data, onError) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 25000);

  return new Promise((resolve, reject) => {
    const safeOnError = (typeof onError === "function") ? onError : () => { };

    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=UTF-8" },
      body: data,
      signal: controller.signal,
    })
      .then(async (response) => {
        const contentType = (response.headers.get("content-type") || "").toLowerCase();
        const isJson = contentType.includes("application/json");

        if (!response.ok) {
          const payload = isJson ? await response.json().catch(() => null) : await response.text().catch(() => "");
          throw { httpStatus: response.status, payload };
        }

        if (isJson) return await response.json();
        const text = await response.text();
        try { return JSON.parse(text); } catch { return { status: "error", error: "NON_JSON_RESPONSE", raw: text }; }
      })
      .then((payload) => resolve(payload))
      .catch((error) => { console.error("Ошибка:", error); reject(error); safeOnError(); });
  }).finally(() => clearTimeout(id));
}

