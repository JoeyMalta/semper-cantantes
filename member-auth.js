(() => {
  const SESSION_KEY = "semper-cantantes-member-session";
  const ACCOUNT_KEY = "semper-cantantes-demo-account";
  const LEGACY_DEMO_EMAIL = "cybille@sempercantantes.nl";
  const DEMO_ACCOUNT = {
    name: "Sibylle",
    email: "sibylle@sempercantantes.nl",
    password: "semper1957",
  };

  const loginDialog = document.querySelector("#login-demo");
  const loginForm = loginDialog?.querySelector("[data-login-form]");
  const registerForm = loginDialog?.querySelector("[data-register-form]");
  const loginMessage = loginDialog?.querySelector("[data-login-message]");
  const registerMessage = loginDialog?.querySelector("[data-register-message]");
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
      // The current page still logs out through the in-memory fallback.
    }
  };

  const getSession = () => {
    const session = readStoredValue(SESSION_KEY) || memorySession;
    if (!session || typeof session.name !== "string" || typeof session.email !== "string") {
      return null;
    }
    if (session.email === LEGACY_DEMO_EMAIL) {
      const correctedSession = { name: DEMO_ACCOUNT.name, email: DEMO_ACCOUNT.email };
      memorySession = correctedSession;
      storeValue(SESSION_KEY, correctedSession);
      return correctedSession;
    }
    return session;
  };

  const saveSession = (session) => {
    memorySession = session;
    return storeValue(SESSION_KEY, session);
  };

  const clearSession = () => {
    memorySession = null;
    removeStoredValue(SESSION_KEY);
  };

  const hashPassword = async (password) => {
    if (!window.crypto?.subtle) return `demo-${password}`;
    const bytes = new TextEncoder().encode(password);
    const digest = await window.crypto.subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(digest)]
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  };

  const firstName = (name) => name.trim().split(/\s+/)[0] || "lid";

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

  const setAuthMessage = (element, message) => {
    if (element) element.textContent = message;
  };

  const setButtonBusy = (button, busy, busyLabel, defaultLabel) => {
    if (!button) return;
    button.disabled = busy;
    button.textContent = busy ? busyLabel : defaultLabel;
  };

  const updateMemberPage = (session) => {
    const content = document.querySelector("[data-member-content]");
    const accessMessage = document.querySelector("[data-member-access]");
    if (!content || !accessMessage) return;

    content.toggleAttribute("hidden", !session);
    accessMessage.toggleAttribute("hidden", Boolean(session));
    document.querySelectorAll("[data-birthday-name]").forEach((element) => {
      element.textContent = session ? firstName(session.name) : "lid";
    });
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
      element.textContent = session ? firstName(session.name) : "lid";
    });
    updateMemberPage(session);
    return session;
  };

  const setAuthMode = (mode) => {
    const showLogin = mode === "login";
    loginForm?.toggleAttribute("hidden", !showLogin);
    registerForm?.toggleAttribute("hidden", showLogin);
    loginDialog?.querySelectorAll("[data-auth-mode]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.authMode === mode));
    });
    setAuthMessage(loginMessage, "");
    setAuthMessage(registerMessage, "");

    window.setTimeout(() => {
      const target = showLogin
        ? loginDialog?.querySelector("#member-email")
        : loginDialog?.querySelector("#register-name");
      target?.focus();
    });
  };

  const resetDialog = () => {
    loginForm?.reset();
    registerForm?.reset();
    setAuthMode("login");
  };

  const openLogin = (trigger) => {
    if (!loginDialog || getSession()) return;
    hideFeedback();
    loginTrigger = trigger;
    loginDialog.removeAttribute("hidden");
    document.body.classList.add("has-open-dialog");
    loginDialog.querySelector("#member-email")?.focus();
  };

  const closeLogin = ({ restoreFocus = true } = {}) => {
    if (!loginDialog) return;
    loginDialog.setAttribute("hidden", "");
    document.body.classList.remove("has-open-dialog");
    resetDialog();
    if (restoreFocus) loginTrigger?.focus();
  };

  const focusVisibleProfile = () => {
    const visibleProfile = [...document.querySelectorAll("[data-member-profile] summary")]
      .find((element) => element.offsetParent !== null);
    visibleProfile?.focus();
  };

  const finishAuthentication = (session, message, errorTarget) => {
    if (!saveSession(session)) {
      setAuthMessage(
        errorTarget,
        "Uw browser kan de inlogstatus niet bewaren. Controleer de privacy-instellingen en probeer opnieuw."
      );
      return false;
    }
    closeLogin({ restoreFocus: false });
    updateNavigation();
    showFeedback(message);
    focusVisibleProfile();
    return true;
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

  loginForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    setAuthMessage(loginMessage, "");

    if (!loginForm.checkValidity()) {
      setAuthMessage(loginMessage, "Vul uw e-mailadres en wachtwoord in.");
      loginForm.reportValidity();
      return;
    }

    const submitButton = loginForm.querySelector("button[type='submit']");
    const formData = new FormData(loginForm);
    const email = String(formData.get("email") || "").trim().toLowerCase();
    const password = String(formData.get("password") || "");
    setButtonBusy(submitButton, true, "Controleren...", "Inloggen");

    const registeredAccount = readStoredValue(ACCOUNT_KEY);
    const passwordHash = await hashPassword(password);
    const isDemoAccount = email === DEMO_ACCOUNT.email && password === DEMO_ACCOUNT.password;
    const isRegisteredAccount = registeredAccount
      && email === registeredAccount.email
      && passwordHash === registeredAccount.passwordHash;

    if (isDemoAccount) {
      finishAuthentication(
        { name: DEMO_ACCOUNT.name, email: DEMO_ACCOUNT.email },
        "U bent ingelogd. Welkom Sibylle.",
        loginMessage
      );
    } else if (isRegisteredAccount) {
      finishAuthentication(
        { name: registeredAccount.name, email: registeredAccount.email },
        `U bent ingelogd. Welkom ${firstName(registeredAccount.name)}.`,
        loginMessage
      );
    } else {
      setAuthMessage(loginMessage, "Het e-mailadres of wachtwoord klopt niet. Probeer het opnieuw.");
    }

    setButtonBusy(submitButton, false, "Controleren...", "Inloggen");
  });

  registerForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    setAuthMessage(registerMessage, "");

    if (!registerForm.checkValidity()) {
      setAuthMessage(registerMessage, "Vul alle velden volledig in. Gebruik minimaal 8 tekens voor het wachtwoord.");
      registerForm.reportValidity();
      return;
    }

    const submitButton = registerForm.querySelector("button[type='submit']");
    const formData = new FormData(registerForm);
    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim().toLowerCase();
    const password = String(formData.get("password") || "");
    const passwordConfirm = String(formData.get("password-confirm") || "");

    if (name.length < 2) {
      setAuthMessage(registerMessage, "Vul een naam van minimaal 2 tekens in.");
      return;
    }
    if (password !== passwordConfirm) {
      setAuthMessage(registerMessage, "De twee wachtwoorden zijn niet hetzelfde.");
      return;
    }
    if (email === DEMO_ACCOUNT.email) {
      setAuthMessage(registerMessage, "Dit e-mailadres hoort al bij het demo-account van Sibylle.");
      return;
    }

    setButtonBusy(submitButton, true, "Account aanmaken...", "Account aanmaken");
    const account = { name, email, passwordHash: await hashPassword(password) };

    if (!storeValue(ACCOUNT_KEY, account)) {
      setAuthMessage(registerMessage, "Uw browser kan dit demo-account niet bewaren. Controleer de privacy-instellingen.");
      setButtonBusy(submitButton, false, "Account aanmaken...", "Account aanmaken");
      return;
    }

    finishAuthentication(
      { name: account.name, email: account.email },
      `Uw demo-account is aangemaakt. Welkom ${firstName(account.name)}.`,
      registerMessage
    );
    setButtonBusy(submitButton, false, "Account aanmaken...", "Account aanmaken");
  });

  document.querySelectorAll("[data-member-logout]").forEach((button) => {
    button.addEventListener("click", () => {
      clearSession();
      document.querySelectorAll("[data-member-profile]").forEach((profile) => profile.removeAttribute("open"));
      document.querySelectorAll(".mobile-nav").forEach((menu) => menu.removeAttribute("open"));
      updateNavigation();
      showFeedback("U bent uitgelogd.");
      const visibleLogin = [...document.querySelectorAll("[data-member-logged-out]")]
        .find((element) => element.offsetParent !== null);
      visibleLogin?.focus();
    });
  });

  document.querySelectorAll("[data-member-profile]").forEach((profile) => {
    profile.addEventListener("toggle", () => {
      if (!profile.open) return;
      document.querySelectorAll("[data-member-profile]").forEach((otherProfile) => {
        if (otherProfile !== profile) otherProfile.removeAttribute("open");
      });
    });
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest("[data-member-profile]")) {
      document.querySelectorAll("[data-member-profile]").forEach((profile) => profile.removeAttribute("open"));
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

  updateNavigation();
})();
