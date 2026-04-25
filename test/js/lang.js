const LANG = {
  hu: {
    title: "Idesüss",
    continue: "Folytatás",
    continueText: "Válaszd ki, hogy már van fiókod, vagy most szeretnél regisztrálni.",
    haveAccount: "Van már fiókom",
    newUser: "Új vagyok itt",

    login: "Belépés",
    register: "Regisztráció",
    back: "Vissza",
    logout: "Kilépés",
    forgotPassword: "Elfelejtett jelszó",

    email: "Email cím",
    password: "Jelszó",
    passwordAgain: "Jelszó megerősítése",
    newPassword: "Új jelszó",
    saveNewPassword: "Új jelszó mentése",

    nickname: "Nicknév",
    profile: "Profil",
    saveProfile: "Profil mentése",
    chooseAvatar: "Válassz avatart:",
    chooseDefaultAvatar: "Válassz alap avatart:",
    avatarUrl: "Avatar kép URL (opcionális)",

    writeSomething: "Írj valamit...",
    send: "Küldés",

    welcomeDear: "Üdv, kedves {name} 👋",
    welcomeUser: "Üdv, kedves Felhasználó 👋",

    profileSaved: "Profil mentve",
    profileError: "Profil hiba",
    loginNeeded: "Belépés szükséges"
  },

  en: {
    title: "Idesüss",
    continue: "Continue",
    continueText: "Choose whether you already have an account or want to register.",
    haveAccount: "I already have an account",
    newUser: "I’m new here",

    login: "Login",
    register: "Register",
    back: "Back",
    logout: "Logout",
    forgotPassword: "Forgot password",

    email: "Email address",
    password: "Password",
    passwordAgain: "Confirm password",
    newPassword: "New password",
    saveNewPassword: "Save new password",

    nickname: "Nickname",
    profile: "Profile",
    saveProfile: "Save profile",
    chooseAvatar: "Choose avatar:",
    chooseDefaultAvatar: "Choose default avatar:",
    avatarUrl: "Avatar image URL (optional)",

    writeSomething: "Write something...",
    send: "Send",

    welcomeDear: "Welcome dear {name} 👋",
    welcomeUser: "Welcome dear User 👋",

    profileSaved: "Profile saved",
    profileError: "Profile error",
    loginNeeded: "Login required"
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

function welcomeText(name) {
  if (name) {
    return t("welcomeDear").replace("{name}", name);
  }

  return t("welcomeUser");
}