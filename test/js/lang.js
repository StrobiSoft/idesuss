const LANG = {
  hu: {
    title: "/test – auth + profile + posts + comments",
    login: "Belépés",
    register: "Regisztráció",
    logout: "Kilépés",
    forgotPassword: "Elfelejtett jelszó",
    newUser: "Új vagyok itt",
    haveAccount: "Van már fiókom",
    profile: "Profil",
    saveProfile: "Profil mentése",
    writeSomething: "Írj valamit...",
    send: "Küldés"
  },
  en: {
    title: "/test – auth + profile + posts + comments",
    login: "Login",
    register: "Register",
    logout: "Logout",
    forgotPassword: "Forgot password",
    newUser: "I’m new here",
    haveAccount: "I already have an account",
    profile: "Profile",
    saveProfile: "Save profile",
    writeSomething: "Write something...",
    send: "Send"
  }
};

let currentLang = localStorage.getItem("idesuss_lang") || "hu";

function t(key) {
  return LANG[currentLang]?.[key] || LANG.hu[key] || key;
}

function setLang(lang) {
  currentLang = LANG[lang] ? lang : "hu";
  localStorage.setItem("idesuss_lang", currentLang);
  applyLang();
}

function applyLang() {
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    el.textContent = t(key);
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
    const key = el.getAttribute("data-i18n-placeholder");
    el.placeholder = t(key);
  });
}