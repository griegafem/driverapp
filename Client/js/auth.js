import { hide, show } from "./dom.js";

export function initAuth({
  endpoint,
  postRequest,
  get,
  onAuthorized,
}) {
  const loading = get("loading");

  const goLogin = () => {
    try { localStorage.removeItem("session"); } catch {}
    window.location.replace("/login");
  };

  const tryAuthorize = () => {
    const session = localStorage.getItem("session");
    if (!session) { goLogin(); return; }

    show(loading);

    postRequest(endpoint + "/api/authorize", JSON.stringify({ session }), goLogin)
      .then((response) => {
        if (response?.status !== "ok") { goLogin(); return; }
        hide(loading);
        try { onAuthorized?.(response); } catch (e) { console.error("Post-authorize UI error:", e); }
      })
      .catch(goLogin);
  };

  tryAuthorize();
}

