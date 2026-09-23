import {
  getIdesussLanguage,
  subscribeIdesussLanguage
} from "./language-preference.js";

const EN = {
  close:"Close", loginTitle:"Log in", registerTitle:"Register", resetTitle:"Set a new password",
  email:"Email address", password:"Password", newPassword:"New password", repeatPassword:"Repeat password",
  login:"Log in", register:"Register", savePassword:"Save new password",
  forgot:"Forgot your password?", toRegister:"No account yet? Register", toLogin:"Already have an account? Log in",
  resetHelp:"Enter the new password twice, then save it.", showPassword:"Show password", hidePassword:"Hide password",
  profileTitle:"Profile", profileIntro:"The same profile is used on the homepage, webapp and native clients.",
  account:"Account", avatar:"Avatar", serviceAvatar:"Staff avatar", chooseAvatar:"Choose avatar",
  avatarsLabel:"Available avatars", staffAvatarRule:"Moderators and admins use the fixed staff avatar; another avatar or custom image cannot be selected.",
  uploadOwnImage:"Upload your own image", cropPosition:"Position avatar image", avatarPreview:"Avatar preview",
  cropHelp:"Drag the image into position. Use the slider to zoom.", zoom:"Zoom", acceptImage:"Accept image", cancel:"Cancel",
  avatarRule:"A custom image becomes public only after review. Pornographic, sexually explicit, or intentionally revealing intimate images are not allowed.",
  houseRules:"House rules", nickname:"Nickname",
  nicknameLocked:"The nickname is permanent for this account. A new nickname requires a new account.",
  nicknameFirst:"You can choose the nickname only once. After the first profile save it is permanently tied to this account.",
  emailVisibility:"Email visibility", hidden:"Hidden", masked:"Masked", public:"Public",
  presenceVisibility:"Online status visibility", nobody:"Nobody", friendsOnly:"Friends only", everyone:"Everyone",
  friendsMessages:"Friends and messages", saveProfile:"Save profile", loading:"Loading…",
  profileLoginRequired:"Log in first to open the profile.", profileLoadFailed:"The profile could not be loaded.",
  submissionPending:"Your latest custom image is waiting for review.", submissionApproved:"Your latest custom image was approved.",
  submissionRejected:"Your latest custom image was not approved.", avatarMaxSize:"The image may be at most 2 MB.",
  avatarType:"Only JPEG, PNG or WebP images can be uploaded.", avatarAuth:"Log in to submit an image.",
  avatarSubmitFailed:"Image submission failed.", avatarSubmitFailedDetail:"Image submission failed: {detail}",
  nicknameTaken:"This nickname is already in use.", nicknameEmpty:"The nickname cannot be empty.",
  nicknameReservedSuffix:"This nickname ending is reserved.", nicknameReserved:"This nickname is reserved; choose another one.",
  staffAvatarReserved:"This avatar is reserved for moderators and admins.", staffAvatarLocked:"For moderator or admin roles the avatar is fixed.",
  avatarRequired:"Choose an avatar before saving the profile.", invalidEmailVisibility:"Invalid email visibility setting.",
  profileAuth:"Log in again to save the profile.", profileSaveFailed:"Profile save failed.",
  profileSaveFailedDetail:"Profile save failed: {detail}", cropUnavailable:"The image cropper could not start.",
  imagePrepareFailed:"The image could not be prepared.", imageSelectFailed:"The image could not be selected.",
  imagePending:"The image has not been submitted yet. Position it, then accept it.",
  imageAccepted:"Image accepted. It will be sent for review only when you save the Profile.",
  saving:"Saving…", profileSaved:"Profile saved.", profileSavedSubmitted:"Profile saved. Image sent for review.",
  profileSavedImageFailed:"Profile saved, but the image was not sent for review. {detail}"
};

const DICT = {
  en: EN,
  hu: {
    close:"Bezárás", loginTitle:"Bejelentkezés", registerTitle:"Regisztráció", resetTitle:"Új jelszó beállítása",
    email:"E-mail cím", password:"Jelszó", newPassword:"Új jelszó", repeatPassword:"Jelszó újra",
    login:"Bejelentkezés", register:"Regisztráció", savePassword:"Új jelszó mentése",
    forgot:"Elfelejtetted a jelszavad?", toRegister:"Nincs még fiókod? Regisztráció", toLogin:"Már van fiókod? Bejelentkezés",
    resetHelp:"Add meg az új jelszót kétszer, majd mentsd el.", showPassword:"Jelszó megjelenítése", hidePassword:"Jelszó elrejtése",
    profileTitle:"Profil", profileIntro:"Ugyanez a profil használható a főoldalon, a webappban és a natív kliensekben is.",
    account:"Fiók", avatar:"Avatar", serviceAvatar:"Szolgálati avatar", chooseAvatar:"Avatar választása",
    avatarsLabel:"Választható avatárok", staffAvatarRule:"Moderátori vagy admin szerepkörben a szolgálati avatar rögzített; más avatar vagy saját kép nem választható.",
    uploadOwnImage:"Saját kép feltöltése", cropPosition:"Avatar kép pozicionálása", avatarPreview:"Avatar előnézet",
    cropHelp:"Húzd a képet a kívánt helyre. A csúszkával nagyíthatsz vagy kicsinyíthetsz.", zoom:"Nagyítás", acceptImage:"Kép elfogadása", cancel:"Mégse",
    avatarRule:"Saját kép csak ellenőrzés után válhat nyilvános avatárrá. Pornográf, szexuálisan explicit vagy intim testrészeket szándékosan feltáró kép nem engedélyezett.",
    houseRules:"Házirend", nickname:"Becenév",
    nicknameLocked:"A becenév végleges és ehhez a fiókhoz tartozik. Új becenévhez új fiók szükséges.",
    nicknameFirst:"A becenevet csak egyszer választhatod meg. Az első profilmentés után végleg ehhez a fiókhoz kötődik.",
    emailVisibility:"E-mail láthatóság", hidden:"Rejtett", masked:"Maszkolt", public:"Nyilvános",
    presenceVisibility:"Online állapot láthatósága", nobody:"Senki", friendsOnly:"Csak barátok", everyone:"Mindenki",
    friendsMessages:"Barátok és üzenetek", saveProfile:"Profil mentése", loading:"Betöltés…",
    profileLoginRequired:"A profil megnyitásához előbb jelentkezz be.", profileLoadFailed:"A profil betöltése nem sikerült.",
    submissionPending:"A legutóbbi saját képed ellenőrzésre vár.", submissionApproved:"A legutóbbi saját képed jóváhagyva.",
    submissionRejected:"A legutóbbi saját kép nem került jóváhagyásra.", avatarMaxSize:"A kép legfeljebb 2 MB lehet.",
    avatarType:"Csak JPEG, PNG vagy WebP kép tölthető fel.", avatarAuth:"A kép beküldéséhez be kell jelentkezni.",
    avatarSubmitFailed:"A kép beküldése nem sikerült.", avatarSubmitFailedDetail:"A kép beküldése nem sikerült: {detail}",
    nicknameTaken:"Ez a becenév már használatban van.", nicknameEmpty:"A becenév nem lehet üres.",
    nicknameReservedSuffix:"Ez a becenév-végződés fenntartott.", nicknameReserved:"Ez a becenév fenntartott, válassz másikat.",
    staffAvatarReserved:"Ez az avatar kizárólag moderátorok és adminok számára van fenntartva.", staffAvatarLocked:"Moderátori vagy admin szerepkörben az avatar rögzített.",
    avatarRequired:"Válassz avatart a profil mentéséhez.", invalidEmailVisibility:"Érvénytelen e-mail láthatósági beállítás.",
    profileAuth:"A profil mentéséhez újra be kell jelentkezni.", profileSaveFailed:"A profil mentése nem sikerült.",
    profileSaveFailedDetail:"A profil mentése nem sikerült: {detail}", cropUnavailable:"A képvágó nem indítható.",
    imagePrepareFailed:"A kép előkészítése nem sikerült.", imageSelectFailed:"Nem sikerült kiválasztani a képet.",
    imagePending:"A kép még nincs beküldve. Állítsd be, majd fogadd el.",
    imageAccepted:"A kép elfogadva. Csak a Profil mentése gombbal kerül elővizsgálatra.",
    saving:"Mentés…", profileSaved:"Profil mentve.", profileSavedSubmitted:"Profil mentve. A kép elővizsgálatra elküldve.",
    profileSavedImageFailed:"A profil mentve, de a kép nem került elővizsgálatra. {detail}"
  },
  nl: {
    ...EN, close:"Sluiten", loginTitle:"Inloggen", registerTitle:"Registreren", resetTitle:"Nieuw wachtwoord instellen",
    email:"E-mailadres", password:"Wachtwoord", newPassword:"Nieuw wachtwoord", repeatPassword:"Wachtwoord herhalen",
    login:"Inloggen", register:"Registreren", savePassword:"Nieuw wachtwoord opslaan", forgot:"Wachtwoord vergeten?",
    toRegister:"Nog geen account? Registreren", toLogin:"Al een account? Inloggen",
    resetHelp:"Voer het nieuwe wachtwoord twee keer in en sla het op.", showPassword:"Wachtwoord tonen", hidePassword:"Wachtwoord verbergen",
    profileTitle:"Profiel", profileIntro:"Hetzelfde profiel wordt gebruikt op de startpagina, webapp en native clients.",
    account:"Account", avatar:"Avatar", serviceAvatar:"Dienstavatar", chooseAvatar:"Avatar kiezen", avatarsLabel:"Beschikbare avatars",
    uploadOwnImage:"Eigen afbeelding uploaden", cropPosition:"Avatar positioneren", avatarPreview:"Avatarvoorbeeld",
    cropHelp:"Sleep de afbeelding naar de gewenste positie. Gebruik de schuifregelaar om te zoomen.", zoom:"Zoom", acceptImage:"Afbeelding accepteren", cancel:"Annuleren",
    houseRules:"Huisregels", nickname:"Bijnaam", emailVisibility:"Zichtbaarheid e-mail", hidden:"Verborgen", masked:"Gemaskeerd", public:"Openbaar",
    presenceVisibility:"Zichtbaarheid online status", nobody:"Niemand", friendsOnly:"Alleen vrienden", everyone:"Iedereen",
    friendsMessages:"Vrienden en berichten", saveProfile:"Profiel opslaan", loading:"Laden…",
    profileLoginRequired:"Log eerst in om het profiel te openen.", profileLoadFailed:"Het profiel kon niet worden geladen.",
    avatarMaxSize:"De afbeelding mag maximaal 2 MB zijn.", avatarType:"Alleen JPEG-, PNG- of WebP-afbeeldingen zijn toegestaan.",
    imageSelectFailed:"De afbeelding kon niet worden geselecteerd.", imagePending:"De afbeelding is nog niet ingediend. Positioneer en accepteer deze eerst.",
    imageAccepted:"Afbeelding geaccepteerd. Deze wordt pas bij Profiel opslaan ter controle verzonden.", saving:"Opslaan…",
    profileSaved:"Profiel opgeslagen.", profileSavedSubmitted:"Profiel opgeslagen. Afbeelding ter controle verzonden."
  },
  ro: {
    ...EN, close:"Închide", loginTitle:"Autentificare", registerTitle:"Înregistrare", resetTitle:"Setează o parolă nouă",
    email:"Adresă de e-mail", password:"Parolă", newPassword:"Parolă nouă", repeatPassword:"Repetă parola",
    login:"Autentificare", register:"Înregistrare", savePassword:"Salvează parola nouă", forgot:"Ai uitat parola?",
    toRegister:"Nu ai cont? Înregistrare", toLogin:"Ai deja cont? Autentificare",
    resetHelp:"Introdu parola nouă de două ori, apoi salveaz-o.", showPassword:"Arată parola", hidePassword:"Ascunde parola",
    profileTitle:"Profil", profileIntro:"Același profil este folosit pe pagina principală, în webapp și în clienții nativi.",
    account:"Cont", avatar:"Avatar", serviceAvatar:"Avatar de serviciu", chooseAvatar:"Alege avatar", avatarsLabel:"Avatare disponibile",
    uploadOwnImage:"Încarcă imagine proprie", cropPosition:"Poziționare avatar", avatarPreview:"Previzualizare avatar",
    cropHelp:"Trage imaginea în poziția dorită. Folosește glisorul pentru zoom.", zoom:"Zoom", acceptImage:"Acceptă imaginea", cancel:"Anulează",
    houseRules:"Regulament", nickname:"Poreclă", emailVisibility:"Vizibilitate e-mail", hidden:"Ascuns", masked:"Mascat", public:"Public",
    presenceVisibility:"Vizibilitate stare online", nobody:"Nimeni", friendsOnly:"Doar prieteni", everyone:"Toată lumea",
    friendsMessages:"Prieteni și mesaje", saveProfile:"Salvează profilul", loading:"Se încarcă…",
    profileLoginRequired:"Autentifică-te înainte de a deschide profilul.", profileLoadFailed:"Profilul nu a putut fi încărcat.",
    avatarMaxSize:"Imaginea poate avea maximum 2 MB.", avatarType:"Se pot încărca doar imagini JPEG, PNG sau WebP.",
    imageSelectFailed:"Imaginea nu a putut fi selectată.", imagePending:"Imaginea nu a fost încă trimisă. Poziționeaz-o și apoi accept-o.",
    imageAccepted:"Imagine acceptată. Va fi trimisă la verificare doar când salvezi profilul.", saving:"Se salvează…",
    profileSaved:"Profil salvat.", profileSavedSubmitted:"Profil salvat. Imagine trimisă la verificare."
  },
  pl: {
    ...EN, close:"Zamknij", loginTitle:"Logowanie", registerTitle:"Rejestracja", resetTitle:"Ustaw nowe hasło",
    email:"Adres e-mail", password:"Hasło", newPassword:"Nowe hasło", repeatPassword:"Powtórz hasło",
    login:"Zaloguj", register:"Zarejestruj", savePassword:"Zapisz nowe hasło", forgot:"Nie pamiętasz hasła?",
    toRegister:"Nie masz konta? Rejestracja", toLogin:"Masz już konto? Zaloguj się",
    resetHelp:"Wpisz nowe hasło dwa razy, a następnie je zapisz.", showPassword:"Pokaż hasło", hidePassword:"Ukryj hasło",
    profileTitle:"Profil", profileIntro:"Ten sam profil jest używany na stronie głównej, w webappie i klientach natywnych.",
    account:"Konto", avatar:"Awatar", serviceAvatar:"Awatar służbowy", chooseAvatar:"Wybierz awatar", avatarsLabel:"Dostępne awatary",
    uploadOwnImage:"Prześlij własny obraz", cropPosition:"Pozycjonowanie awatara", avatarPreview:"Podgląd awatara",
    cropHelp:"Przeciągnij obraz w odpowiednie miejsce. Użyj suwaka, aby powiększyć.", zoom:"Powiększenie", acceptImage:"Akceptuj obraz", cancel:"Anuluj",
    houseRules:"Regulamin", nickname:"Pseudonim", emailVisibility:"Widoczność e-maila", hidden:"Ukryty", masked:"Maskowany", public:"Publiczny",
    presenceVisibility:"Widoczność statusu online", nobody:"Nikt", friendsOnly:"Tylko znajomi", everyone:"Wszyscy",
    friendsMessages:"Znajomi i wiadomości", saveProfile:"Zapisz profil", loading:"Ładowanie…",
    profileLoginRequired:"Najpierw się zaloguj, aby otworzyć profil.", profileLoadFailed:"Nie udało się wczytać profilu.",
    avatarMaxSize:"Obraz może mieć maksymalnie 2 MB.", avatarType:"Można przesyłać tylko obrazy JPEG, PNG lub WebP.",
    imageSelectFailed:"Nie udało się wybrać obrazu.", imagePending:"Obraz nie został jeszcze wysłany. Ustaw go i zaakceptuj.",
    imageAccepted:"Obraz zaakceptowany. Zostanie wysłany do weryfikacji dopiero po zapisaniu profilu.", saving:"Zapisywanie…",
    profileSaved:"Profil zapisany.", profileSavedSubmitted:"Profil zapisany. Obraz wysłany do weryfikacji."
  },
  hr: {
    ...EN, close:"Zatvori", loginTitle:"Prijava", registerTitle:"Registracija", resetTitle:"Postavi novu lozinku",
    email:"E-mail adresa", password:"Lozinka", newPassword:"Nova lozinka", repeatPassword:"Ponovi lozinku",
    login:"Prijava", register:"Registracija", savePassword:"Spremi novu lozinku", forgot:"Zaboravljena lozinka?",
    toRegister:"Nemaš račun? Registracija", toLogin:"Već imaš račun? Prijava",
    resetHelp:"Unesi novu lozinku dvaput, zatim je spremi.", showPassword:"Prikaži lozinku", hidePassword:"Sakrij lozinku",
    profileTitle:"Profil", profileIntro:"Isti profil koristi se na početnoj stranici, webappu i izvornim klijentima.",
    account:"Račun", avatar:"Avatar", serviceAvatar:"Službeni avatar", chooseAvatar:"Odaberi avatar", avatarsLabel:"Dostupni avatari",
    uploadOwnImage:"Prenesi vlastitu sliku", cropPosition:"Pozicioniranje avatara", avatarPreview:"Pregled avatara",
    cropHelp:"Povuci sliku na željeno mjesto. Klizačem povećaj ili smanji.", zoom:"Povećanje", acceptImage:"Prihvati sliku", cancel:"Odustani",
    houseRules:"Kućni red", nickname:"Nadimak", emailVisibility:"Vidljivost e-pošte", hidden:"Skriveno", masked:"Maskirano", public:"Javno",
    presenceVisibility:"Vidljivost online statusa", nobody:"Nitko", friendsOnly:"Samo prijatelji", everyone:"Svi",
    friendsMessages:"Prijatelji i poruke", saveProfile:"Spremi profil", loading:"Učitavanje…",
    profileLoginRequired:"Prvo se prijavi za otvaranje profila.", profileLoadFailed:"Profil se ne može učitati.",
    avatarMaxSize:"Slika može imati najviše 2 MB.", avatarType:"Mogu se prenijeti samo JPEG, PNG ili WebP slike.",
    imageSelectFailed:"Slika se ne može odabrati.", imagePending:"Slika još nije poslana. Namjesti je i prihvati.",
    imageAccepted:"Slika je prihvaćena. Na provjeru se šalje tek kad spremiš profil.", saving:"Spremanje…",
    profileSaved:"Profil spremljen.", profileSavedSubmitted:"Profil spremljen. Slika je poslana na provjeru."
  },
  be: {
    ...EN, close:"Закрыць", loginTitle:"Уваход", registerTitle:"Рэгістрацыя", resetTitle:"Задаць новы пароль",
    email:"Электронная пошта", password:"Пароль", newPassword:"Новы пароль", repeatPassword:"Паўтарыць пароль",
    login:"Увайсці", register:"Зарэгістравацца", savePassword:"Захаваць новы пароль", forgot:"Забылі пароль?",
    toRegister:"Няма акаўнта? Рэгістрацыя", toLogin:"Ужо ёсць акаўнт? Увайсці",
    resetHelp:"Увядзіце новы пароль двойчы і захавайце.", showPassword:"Паказаць пароль", hidePassword:"Схаваць пароль",
    profileTitle:"Профіль", profileIntro:"Адзін профіль выкарыстоўваецца на галоўнай старонцы, у webapp і натыўных кліентах.",
    account:"Акаўнт", avatar:"Аватар", serviceAvatar:"Службовы аватар", chooseAvatar:"Выбраць аватар", avatarsLabel:"Даступныя аватары",
    uploadOwnImage:"Загрузіць сваю выяву", cropPosition:"Размяшчэнне аватара", avatarPreview:"Папярэдні прагляд аватара",
    cropHelp:"Перацягніце выяву ў патрэбнае месца. Выкарыстоўвайце паўзунок для маштабавання.", zoom:"Маштаб", acceptImage:"Прыняць выяву", cancel:"Адмена",
    houseRules:"Правілы", nickname:"Нік", emailVisibility:"Бачнасць e-mail", hidden:"Схавана", masked:"Замаскіравана", public:"Публічна",
    presenceVisibility:"Бачнасць онлайн-стану", nobody:"Ніхто", friendsOnly:"Толькі сябры", everyone:"Усе",
    friendsMessages:"Сябры і паведамленні", saveProfile:"Захаваць профіль", loading:"Загрузка…",
    profileLoginRequired:"Спачатку ўвайдзіце, каб адкрыць профіль.", profileLoadFailed:"Не ўдалося загрузіць профіль.",
    avatarMaxSize:"Выява можа быць не больш за 2 МБ.", avatarType:"Можна загружаць толькі JPEG, PNG або WebP.",
    imageSelectFailed:"Не ўдалося выбраць выяву.", imagePending:"Выява яшчэ не адпраўлена. Размясціце і прыміце яе.",
    imageAccepted:"Выява прынята. Яна будзе адпраўлена на праверку толькі пасля захавання профілю.", saving:"Захаванне…",
    profileSaved:"Профіль захаваны.", profileSavedSubmitted:"Профіль захаваны. Выява адпраўлена на праверку."
  }
};

function interpolate(text, vars = {}) {
  return String(text).replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`);
}

export function shellT(key, vars) {
  const language = getIdesussLanguage();
  const table = DICT[language] || EN;
  return interpolate(table[key] ?? EN[key] ?? key, vars);
}

export function subscribeShellLanguage(callback) {
  return subscribeIdesussLanguage(callback);
}
