(() => {
  const SESSION_KEY = "semper-cantantes-member-session";
  const LEGACY_ACCOUNT_KEY = "semper-cantantes-demo-account";
  const MEMBER_ID = "sibylle";

  // Prototype only: production member data must be delivered by a backend with
  // real server-side authentication. Client-side code cannot protect embedded data.
  const DEMO_ACCOUNT = {
    name: "Sibylle",
    username: "Sibylle",
    password: "Knechtshuis2024?!",
  };

  const loginDialog = document.querySelector("#login-demo");
  const loginForm = loginDialog?.querySelector("[data-login-form]");
  const registrationPanel = loginDialog?.querySelector("[data-register-panel]");
  const loginMessage = loginDialog?.querySelector("[data-login-message]");
  const feedback = document.querySelector("[data-site-feedback]");
  let loginTrigger = null;
  let feedbackTimer = null;
  let memorySession = null;

  const readStoredValue = (key) => {
    try {
      const value = window.localStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch {
      return null;
    }
  };

  const storeValue = (key, value) => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  };

  const removeStoredValue = (key) => {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // The page can still use the in-memory session fallback.
    }
  };

  const getSession = () => {
    const storedSession = readStoredValue(SESSION_KEY) || memorySession;
    const isCurrentSession = storedSession?.member === MEMBER_ID;
    const isLegacySession = storedSession?.name === "Sibylle"
      && storedSession?.email === "sibylle@sempercantantes.nl";

    if (!isCurrentSession && !isLegacySession) return null;

    if (!isCurrentSession) {
      memorySession = { member: MEMBER_ID };
      storeValue(SESSION_KEY, memorySession);
    }

    return { member: MEMBER_ID, name: DEMO_ACCOUNT.name };
  };

  const saveSession = () => {
    memorySession = { member: MEMBER_ID };
    return storeValue(SESSION_KEY, memorySession);
  };

  const clearSession = () => {
    memorySession = null;
    removeStoredValue(SESSION_KEY);
    removeStoredValue(LEGACY_ACCOUNT_KEY);
  };

  const showFeedback = (message) => {
    if (!feedback) return;
    window.clearTimeout(feedbackTimer);
    feedback.textContent = message;
    feedback.removeAttribute("hidden");
    feedbackTimer = window.setTimeout(() => feedback.setAttribute("hidden", ""), 4500);
  };

  const hideFeedback = () => {
    if (!feedback) return;
    window.clearTimeout(feedbackTimer);
    feedback.setAttribute("hidden", "");
  };

  const setAuthMessage = (message) => {
    if (loginMessage) loginMessage.textContent = message;
  };

  const updateMemberPage = (session) => {
    const content = document.querySelector("[data-member-content]");
    const accessMessage = document.querySelector("[data-member-access]");
    if (!content || !accessMessage) return;

    content.toggleAttribute("hidden", !session);
    accessMessage.toggleAttribute("hidden", Boolean(session));
  };

  const updateNavigation = () => {
    const session = getSession();

    document.querySelectorAll("[data-member-logged-out]").forEach((element) => {
      element.toggleAttribute("hidden", Boolean(session));
    });
    document.querySelectorAll("[data-member-profile]").forEach((profile) => {
      profile.toggleAttribute("hidden", !session);
      if (!session) profile.removeAttribute("open");
    });
    document.querySelectorAll("[data-member-display-name]").forEach((element) => {
      element.textContent = session ? DEMO_ACCOUNT.name : "lid";
    });

    updateMemberPage(session);
    return session;
  };

  const setAuthMode = (mode) => {
    const showLogin = mode === "login";
    loginForm?.toggleAttribute("hidden", !showLogin);
    registrationPanel?.toggleAttribute("hidden", showLogin);
    loginDialog?.querySelectorAll("[data-auth-mode]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.authMode === mode));
    });
    setAuthMessage("");

    window.setTimeout(() => {
      const target = showLogin
        ? loginDialog?.querySelector("#member-username")
        : loginDialog?.querySelector("#registration-title");
      target?.focus();
    });
  };

  const resetDialog = () => {
    loginForm?.reset();
    setAuthMode("login");
  };

  const openLogin = (trigger) => {
    if (!loginDialog || getSession()) return;
    hideFeedback();
    loginTrigger = trigger;
    loginDialog.removeAttribute("hidden");
    document.body.classList.add("has-open-dialog");
    loginDialog.querySelector("#member-username")?.focus();
  };

  const closeLogin = ({ restoreFocus = true } = {}) => {
    if (!loginDialog) return;
    loginDialog.setAttribute("hidden", "");
    document.body.classList.remove("has-open-dialog");
    resetDialog();
    if (restoreFocus) loginTrigger?.focus();
  };

  const focusMemberControl = () => {
    const visibleProfile = [...document.querySelectorAll("[data-member-profile] summary")]
      .find((element) => element.offsetParent !== null);
    const visibleMobileMenu = [...document.querySelectorAll(".mobile-nav > summary")]
      .find((element) => element.offsetParent !== null);
    (visibleProfile || visibleMobileMenu)?.focus();
  };

  const finishAuthentication = () => {
    if (!saveSession()) {
      setAuthMessage(
        "Uw browser kan de inlogstatus niet bewaren. Controleer de privacy-instellingen en probeer opnieuw."
      );
      return;
    }

    closeLogin({ restoreFocus: false });
    updateNavigation();
    showFeedback("U bent ingelogd. Welkom Sibylle.");
    focusMemberControl();
  };

  document.querySelectorAll("[data-login-demo]").forEach((button) => {
    button.addEventListener("click", () => {
      button.closest(".mobile-nav")?.removeAttribute("open");
      openLogin(button);
    });
  });

  document.querySelectorAll("[data-close-login]").forEach((button) => {
    button.addEventListener("click", () => closeLogin());
  });

  loginDialog?.querySelectorAll("[data-auth-mode]").forEach((button) => {
    button.addEventListener("click", () => setAuthMode(button.dataset.authMode));
  });

  loginForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    setAuthMessage("");

    if (!loginForm.checkValidity()) {
      setAuthMessage("Vul uw gebruikersnaam en wachtwoord in.");
      loginForm.reportValidity();
      return;
    }

    const formData = new FormData(loginForm);
    const username = String(formData.get("username") || "").trim();
    const password = String(formData.get("password") || "");
    const isDemoAccount = username.toLocaleLowerCase("nl") === DEMO_ACCOUNT.username.toLocaleLowerCase("nl")
      && password === DEMO_ACCOUNT.password;

    if (!isDemoAccount) {
      setAuthMessage("De gebruikersnaam of het wachtwoord klopt niet. Probeer het opnieuw.");
      return;
    }

    finishAuthentication();
  });

  document.querySelectorAll("[data-member-logout]").forEach((button) => {
    button.addEventListener("click", () => {
      clearSession();
      document.querySelectorAll("[data-member-profile]").forEach((profile) => {
        profile.removeAttribute("open");
      });
      document.querySelectorAll(".mobile-nav").forEach((menu) => menu.removeAttribute("open"));
      updateNavigation();

      if (document.body.matches("[data-member-page]")) {
        window.location.assign("index.html");
        return;
      }

      showFeedback("U bent uitgelogd.");
      const visibleLogin = [...document.querySelectorAll("[data-member-logged-out]")]
        .find((element) => element.offsetParent !== null);
      visibleLogin?.focus();
    });
  });

  document.querySelectorAll("details[data-member-profile]").forEach((profile) => {
    profile.addEventListener("toggle", () => {
      if (!profile.open) return;
      document.querySelectorAll("details[data-member-profile]").forEach((otherProfile) => {
        if (otherProfile !== profile) otherProfile.removeAttribute("open");
      });
    });
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest("details[data-member-profile]")) {
      document.querySelectorAll("details[data-member-profile]").forEach((profile) => {
        profile.removeAttribute("open");
      });
    }
  });

  loginDialog?.addEventListener("click", (event) => {
    if (event.target === loginDialog) closeLogin();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && loginDialog && !loginDialog.hidden) closeLogin();

    if (event.key === "Tab" && loginDialog && !loginDialog.hidden) {
      const focusableElements = [...loginDialog.querySelectorAll("button:not([disabled]), input:not([disabled])")]
        .filter((element) => element.offsetParent !== null);
      const firstElement = focusableElements[0];
      const lastElement = focusableElements.at(-1);

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement?.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement?.focus();
      }
    }
  });

  removeStoredValue(LEGACY_ACCOUNT_KEY);
  updateNavigation();
})();
