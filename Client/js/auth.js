import { hide, show, setInactive } from "./dom.js";

export function initAuth({
  endpoint,
  postRequest,
  get,
  onAuthorized,
}) {
  const loginForm = get("login-form");
  const loading = get("loading");

  const tryAuthorize = () => {
    const session = localStorage.getItem("session");
    if (!session) {
      // Login form is visible by default — nothing to do.
      return;
    }

    // Has saved session: show loading overlay while we validate it.
    hide(loginForm);
    show(loading);

    postRequest(endpoint + "/api/authorize", JSON.stringify({ session }), () => {
      hide(loading);
      show(loginForm);
    })
      .then((response) => {
        if (response?.status === "error") {
          hide(loading);
          show(loginForm);
          return;
        }
        hide(loginForm);
        hide(loading);
        try {
          onAuthorized?.(response);
        } catch (e) {
          console.error("Post-authorize UI error:", e);
        }
      })
      .catch(() => {
        hide(loading);
        show(loginForm);
      });
  };

  const initLoginButton = () => {
    const loginBtn = get("login_button");
    if (!loginBtn) return;

    const loginInput = get("login");
    const passwordInput = get("password");
    const attention = get("login_attention");

    const updateEnabledState = () => {
      const login = (loginInput?.value || "").trim();
      const password = (passwordInput?.value || "");
      const shouldDisable = login.length === 0 || password.length === 0;
      setInactive(loginBtn, shouldDisable);
    };

    const resetLoginUi = () => {
      loginBtn.innerText = "Войти";
      setInactive(loginInput, false);
      setInactive(passwordInput, false);
      updateEnabledState();
    };

    loginInput?.addEventListener("input", updateEnabledState);
    passwordInput?.addEventListener("input", updateEnabledState);
    updateEnabledState();

    loginBtn.onclick = async () => {
      if (loginBtn.classList.contains("inactive")) return;

      setInactive(loginBtn, true);
      setInactive(loginInput, true);
      setInactive(passwordInput, true);
      loginBtn.innerText = "Авторизация...";
      attention?.classList.add("hidden");

      try {
        const response = await postRequest(
          endpoint + "/api/login",
          JSON.stringify({ login: loginInput?.value, password: passwordInput?.value }),
          () => {
            attention?.classList.remove("hidden");
          },
        );

        if (response?.status === "error") {
          attention?.classList.remove("hidden");
          return;
        }

        const session = response?.session;
        if (session) localStorage.setItem("session", session);

        // Ensure overlays are definitely gone on success.
        hide(loginForm);
        hide(loading);

        try {
          onAuthorized?.(response);
        } catch (e) {
          console.error("Post-login UI error:", e);
          // If post-login UI failed, restore login UI instead of leaving user stuck.
          show(loginForm);
          attention?.classList?.remove?.("hidden");
        }
      } catch {
        attention?.classList.remove("hidden");
      } finally {
        // If we didn't navigate away (login form still visible), restore UI state.
        if (loginForm && !loginForm.classList.contains("hidden")) {
          resetLoginUi();
        }
      }
    };
  };

  initLoginButton();
  tryAuthorize();
}

