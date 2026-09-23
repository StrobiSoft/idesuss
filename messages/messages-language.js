import {
  getIdesussLanguage,
  setIdesussLanguage,
  subscribeIdesussLanguage,
  IDESUSS_SUPPORTED_LANGUAGES
} from "../js/shared/language-preference.js";

const STRINGS = {
  hu: {
    title:"Üzenetek", messages:"Üzenetek", friends:"Barátok", home:"Főoldal", webapp:"Webapp", radio:"Rádió",
    chooseConversation:"Válassz beszélgetést", emptyConversation:"Itt jelennek meg a privát és rendszerüzenetek.",
    messagePlaceholder:"Üzenet…", send:"Küldés", sending:"Küldés…", retry:"Újrapróbálás",
    authRequired:"Az üzenetekhez jelentkezz be.", login:"Bejelentkezés", register:"Regisztráció",
    noMessages:"Még nincs üzeneted.", threadsLoadError:"A beszélgetések nem tölthetők be.",
    conversationLoadError:"A beszélgetés nem tölthető be.", user:"Felhasználó", friendRequest:"Barátkozási kérés",
    friendRequestSent:"Barátkozási kérést küldtél.", friendRequestIncoming:"Barátlistára szeretne felvenni.",
    pending:"Válaszra vár.", later:"Talán — későbbi döntésre vár.", accepted:"Elfogadva.", declined:"Elutasítva.",
    yes:"Igen", no:"Nem", maybe:"Talán", responseSaveError:"A válasz mentése nem sikerült",
    premiumRequired:"Privát üzenet küldéséhez Premium tagság szükséges.",
    friendshipRequired:"Ezzel a tagsági szinttel csak barátoknak küldhetsz privát üzenetet.",
    sendError:"Az üzenet nem küldhető el", friendsHeading:"Barátok",
    searchHelp:"Keress becenév alapján. E-mail címre itt szándékosan nem lehet keresni.",
    nickname:"Becenév…", search:"Keresés", minSearch:"Írj be legalább 2 karaktert.", searching:"Keresés…",
    searchError:"A keresés nem sikerült.", noResults:"Nincs találat.", resultCount:n=>`${n} találat.`,
    addFriend:"Barátnak jelölés", alreadyConnected:"Már van kapcsolat vagy függő kérés ezzel a felhasználóval.",
    requestSendError:"A kérés nem küldhető el", requestSent:"Barátkozási kérés elküldve.",
    myConnections:"Kapcsolataim", friendshipsLoadError:"A barátlista nem tölthető be.", noConnections:"Még nincs kapcsolatod.",
    friend:"Barát", incomingRequest:"Beérkező kérés", outgoingRequest:"Elküldött kérés",
    laterIncoming:"Talán — későbbi döntés", laterOutgoing:"A másik fél később dönt",
    message:"Üzenet", removeFriendship:"Barátság megszüntetése", removeRequest:"Kérés törlése",
    removeConfirm:"Biztosan törlöd ezt a kapcsolatot?", back:"Vissza", roleOwner:"Platform Owner",
    roleAdmin:"Admin", roleModerator:"Moderátor", notifications:"Értesítések",
    pushEnabled:"Üzenetértesítések", previewEnabled:"Üzenet előnézete", saveSettings:"Mentés",
    settingsSaved:"Értesítési beállítások elmentve.", settingsError:"Az értesítési beállítások nem menthetők.",
    language:"Nyelv", delivered:"Elküldve", failed:"Sikertelen küldés"
  },
  en: {
    title:"Messages", messages:"Messages", friends:"Friends", home:"Home", webapp:"Webapp", radio:"Radio",
    chooseConversation:"Choose a conversation", emptyConversation:"Private and system messages appear here.",
    messagePlaceholder:"Message…", send:"Send", sending:"Sending…", retry:"Retry",
    authRequired:"Sign in to use messages.", login:"Sign in", register:"Register",
    noMessages:"No messages yet.", threadsLoadError:"Conversations could not be loaded.",
    conversationLoadError:"Conversation could not be loaded.", user:"User", friendRequest:"Friend request",
    friendRequestSent:"You sent a friend request.", friendRequestIncoming:"Wants to add you as a friend.",
    pending:"Waiting for reply.", later:"Maybe — waiting for a later decision.", accepted:"Accepted.", declined:"Declined.",
    yes:"Yes", no:"No", maybe:"Maybe", responseSaveError:"Could not save the response",
    premiumRequired:"Premium is required to send private messages.",
    friendshipRequired:"With this tier you can only message accepted friends.",
    sendError:"Message could not be sent", friendsHeading:"Friends",
    searchHelp:"Search by nickname. Email addresses are intentionally not searchable here.",
    nickname:"Nickname…", search:"Search", minSearch:"Enter at least 2 characters.", searching:"Searching…",
    searchError:"Search failed.", noResults:"No results.", resultCount:n=>`${n} results.`,
    addFriend:"Add friend", alreadyConnected:"There is already a friendship or pending request with this user.",
    requestSendError:"Request could not be sent", requestSent:"Friend request sent.",
    myConnections:"My connections", friendshipsLoadError:"Friends list could not be loaded.", noConnections:"No connections yet.",
    friend:"Friend", incomingRequest:"Incoming request", outgoingRequest:"Sent request",
    laterIncoming:"Maybe — decide later", laterOutgoing:"The other user will decide later",
    message:"Message", removeFriendship:"Remove friendship", removeRequest:"Delete request",
    removeConfirm:"Delete this connection?", back:"Back", roleOwner:"Platform Owner", roleAdmin:"Admin",
    roleModerator:"Moderator", notifications:"Notifications", pushEnabled:"Message notifications",
    previewEnabled:"Message preview", saveSettings:"Save", settingsSaved:"Notification settings saved.",
    settingsError:"Notification settings could not be saved.", language:"Language", delivered:"Sent", failed:"Send failed"
  },
  nl: {
    title:"Berichten", messages:"Berichten", friends:"Vrienden", home:"Start", webapp:"Webapp", radio:"Radio",
    chooseConversation:"Kies een gesprek", emptyConversation:"Privé- en systeemberichten verschijnen hier.",
    messagePlaceholder:"Bericht…", send:"Verzenden", sending:"Verzenden…", retry:"Opnieuw",
    authRequired:"Log in om berichten te gebruiken.", login:"Inloggen", register:"Registreren",
    noMessages:"Nog geen berichten.", threadsLoadError:"Gesprekken konden niet worden geladen.",
    conversationLoadError:"Gesprek kon niet worden geladen.", user:"Gebruiker", friendRequest:"Vriendschapsverzoek",
    friendRequestSent:"Je hebt een vriendschapsverzoek gestuurd.", friendRequestIncoming:"Wil je als vriend toevoegen.",
    pending:"Wacht op antwoord.", later:"Misschien — later beslissen.", accepted:"Geaccepteerd.", declined:"Afgewezen.",
    yes:"Ja", no:"Nee", maybe:"Misschien", responseSaveError:"Antwoord kon niet worden opgeslagen",
    premiumRequired:"Premium is vereist om privéberichten te sturen.",
    friendshipRequired:"Met dit niveau kun je alleen geaccepteerde vrienden berichten.",
    sendError:"Bericht kon niet worden verzonden", friendsHeading:"Vrienden",
    searchHelp:"Zoek op bijnaam. E-mailadressen zijn hier bewust niet doorzoekbaar.",
    nickname:"Bijnaam…", search:"Zoeken", minSearch:"Voer minstens 2 tekens in.", searching:"Zoeken…",
    searchError:"Zoeken mislukt.", noResults:"Geen resultaten.", resultCount:n=>`${n} resultaten.`,
    addFriend:"Vriend toevoegen", alreadyConnected:"Er bestaat al een verbinding of openstaand verzoek.",
    requestSendError:"Verzoek kon niet worden verzonden", requestSent:"Vriendschapsverzoek verzonden.",
    myConnections:"Mijn contacten", friendshipsLoadError:"Vriendenlijst kon niet worden geladen.", noConnections:"Nog geen contacten.",
    friend:"Vriend", incomingRequest:"Inkomend verzoek", outgoingRequest:"Verzonden verzoek",
    laterIncoming:"Misschien — later beslissen", laterOutgoing:"De andere gebruiker beslist later",
    message:"Bericht", removeFriendship:"Vriendschap verwijderen", removeRequest:"Verzoek verwijderen",
    removeConfirm:"Deze verbinding verwijderen?", back:"Terug", roleOwner:"Platform Owner", roleAdmin:"Admin",
    roleModerator:"Moderator", notifications:"Meldingen", pushEnabled:"Berichtmeldingen",
    previewEnabled:"Berichtvoorbeeld", saveSettings:"Opslaan", settingsSaved:"Meldingsinstellingen opgeslagen.",
    settingsError:"Meldingsinstellingen konden niet worden opgeslagen.", language:"Taal", delivered:"Verzonden", failed:"Verzenden mislukt"
  },
  ro: {
    title:"Mesaje", messages:"Mesaje", friends:"Prieteni", home:"Acasă", webapp:"Webapp", radio:"Radio",
    chooseConversation:"Alege o conversație", emptyConversation:"Mesajele private și de sistem apar aici.",
    messagePlaceholder:"Mesaj…", send:"Trimite", sending:"Se trimite…", retry:"Reîncearcă",
    authRequired:"Autentifică-te pentru mesaje.", login:"Autentificare", register:"Înregistrare",
    noMessages:"Nu ai mesaje încă.", threadsLoadError:"Conversațiile nu pot fi încărcate.",
    conversationLoadError:"Conversația nu poate fi încărcată.", user:"Utilizator", friendRequest:"Cerere de prietenie",
    friendRequestSent:"Ai trimis o cerere de prietenie.", friendRequestIncoming:"Vrea să te adauge ca prieten.",
    pending:"Așteaptă răspuns.", later:"Poate — decizie mai târziu.", accepted:"Acceptată.", declined:"Respinsă.",
    yes:"Da", no:"Nu", maybe:"Poate", responseSaveError:"Răspunsul nu a putut fi salvat",
    premiumRequired:"Este necesar Premium pentru mesaje private.",
    friendshipRequired:"Cu acest nivel poți scrie doar prietenilor acceptați.",
    sendError:"Mesajul nu a putut fi trimis", friendsHeading:"Prieteni",
    searchHelp:"Caută după poreclă. Adresele de e-mail nu sunt căutabile aici.",
    nickname:"Poreclă…", search:"Caută", minSearch:"Introdu cel puțin 2 caractere.", searching:"Se caută…",
    searchError:"Căutarea a eșuat.", noResults:"Niciun rezultat.", resultCount:n=>`${n} rezultate.`,
    addFriend:"Adaugă prieten", alreadyConnected:"Există deja o relație sau o cerere în așteptare.",
    requestSendError:"Cererea nu a putut fi trimisă", requestSent:"Cerere de prietenie trimisă.",
    myConnections:"Relațiile mele", friendshipsLoadError:"Lista de prieteni nu poate fi încărcată.", noConnections:"Nu ai relații încă.",
    friend:"Prieten", incomingRequest:"Cerere primită", outgoingRequest:"Cerere trimisă",
    laterIncoming:"Poate — decizie mai târziu", laterOutgoing:"Celălalt utilizator va decide mai târziu",
    message:"Mesaj", removeFriendship:"Șterge prietenia", removeRequest:"Șterge cererea",
    removeConfirm:"Ștergi această relație?", back:"Înapoi", roleOwner:"Platform Owner", roleAdmin:"Admin",
    roleModerator:"Moderator", notifications:"Notificări", pushEnabled:"Notificări mesaje",
    previewEnabled:"Previzualizare mesaj", saveSettings:"Salvează", settingsSaved:"Setările de notificare au fost salvate.",
    settingsError:"Setările de notificare nu pot fi salvate.", language:"Limbă", delivered:"Trimis", failed:"Trimitere eșuată"
  },
  pl: {
    title:"Wiadomości", messages:"Wiadomości", friends:"Znajomi", home:"Start", webapp:"Webapp", radio:"Radio",
    chooseConversation:"Wybierz rozmowę", emptyConversation:"Tutaj pojawią się wiadomości prywatne i systemowe.",
    messagePlaceholder:"Wiadomość…", send:"Wyślij", sending:"Wysyłanie…", retry:"Ponów",
    authRequired:"Zaloguj się, aby korzystać z wiadomości.", login:"Zaloguj", register:"Rejestracja",
    noMessages:"Brak wiadomości.", threadsLoadError:"Nie udało się wczytać rozmów.",
    conversationLoadError:"Nie udało się wczytać rozmowy.", user:"Użytkownik", friendRequest:"Zaproszenie",
    friendRequestSent:"Wysłano zaproszenie do znajomych.", friendRequestIncoming:"Chce dodać Cię do znajomych.",
    pending:"Oczekuje na odpowiedź.", later:"Może — decyzja później.", accepted:"Zaakceptowano.", declined:"Odrzucono.",
    yes:"Tak", no:"Nie", maybe:"Może", responseSaveError:"Nie udało się zapisać odpowiedzi",
    premiumRequired:"Premium jest wymagane do wysyłania prywatnych wiadomości.",
    friendshipRequired:"Na tym poziomie możesz pisać tylko do zaakceptowanych znajomych.",
    sendError:"Nie udało się wysłać wiadomości", friendsHeading:"Znajomi",
    searchHelp:"Szukaj po pseudonimie. Adresy e-mail nie są tutaj wyszukiwane.",
    nickname:"Pseudonim…", search:"Szukaj", minSearch:"Wpisz co najmniej 2 znaki.", searching:"Szukanie…",
    searchError:"Wyszukiwanie nie powiodło się.", noResults:"Brak wyników.", resultCount:n=>`${n} wyników.`,
    addFriend:"Dodaj znajomego", alreadyConnected:"Istnieje już relacja lub oczekujące zaproszenie.",
    requestSendError:"Nie udało się wysłać zaproszenia", requestSent:"Zaproszenie wysłane.",
    myConnections:"Moje kontakty", friendshipsLoadError:"Nie udało się wczytać listy znajomych.", noConnections:"Brak kontaktów.",
    friend:"Znajomy", incomingRequest:"Otrzymane zaproszenie", outgoingRequest:"Wysłane zaproszenie",
    laterIncoming:"Może — decyzja później", laterOutgoing:"Drugi użytkownik zdecyduje później",
    message:"Wiadomość", removeFriendship:"Usuń znajomość", removeRequest:"Usuń zaproszenie",
    removeConfirm:"Usunąć tę relację?", back:"Wstecz", roleOwner:"Platform Owner", roleAdmin:"Admin",
    roleModerator:"Moderator", notifications:"Powiadomienia", pushEnabled:"Powiadomienia o wiadomościach",
    previewEnabled:"Podgląd wiadomości", saveSettings:"Zapisz", settingsSaved:"Ustawienia powiadomień zapisane.",
    settingsError:"Nie udało się zapisać ustawień powiadomień.", language:"Język", delivered:"Wysłano", failed:"Wysyłanie nieudane"
  },
  hr: {
    title:"Poruke", messages:"Poruke", friends:"Prijatelji", home:"Početna", webapp:"Webapp", radio:"Radio",
    chooseConversation:"Odaberi razgovor", emptyConversation:"Privatne i sistemske poruke pojavljuju se ovdje.",
    messagePlaceholder:"Poruka…", send:"Pošalji", sending:"Slanje…", retry:"Pokušaj ponovno",
    authRequired:"Prijavi se za korištenje poruka.", login:"Prijava", register:"Registracija",
    noMessages:"Još nema poruka.", threadsLoadError:"Razgovori se ne mogu učitati.",
    conversationLoadError:"Razgovor se ne može učitati.", user:"Korisnik", friendRequest:"Zahtjev za prijateljstvo",
    friendRequestSent:"Poslao/la si zahtjev za prijateljstvo.", friendRequestIncoming:"Želi te dodati za prijatelja.",
    pending:"Čeka odgovor.", later:"Možda — odluka kasnije.", accepted:"Prihvaćeno.", declined:"Odbijeno.",
    yes:"Da", no:"Ne", maybe:"Možda", responseSaveError:"Odgovor se ne može spremiti",
    premiumRequired:"Premium je potreban za privatne poruke.",
    friendshipRequired:"S ovom razinom možeš pisati samo prihvaćenim prijateljima.",
    sendError:"Poruka se ne može poslati", friendsHeading:"Prijatelji",
    searchHelp:"Traži po nadimku. E-mail adrese se ovdje namjerno ne pretražuju.",
    nickname:"Nadimak…", search:"Traži", minSearch:"Unesi najmanje 2 znaka.", searching:"Traženje…",
    searchError:"Pretraga nije uspjela.", noResults:"Nema rezultata.", resultCount:n=>`${n} rezultata.`,
    addFriend:"Dodaj prijatelja", alreadyConnected:"Već postoji veza ili zahtjev na čekanju.",
    requestSendError:"Zahtjev se ne može poslati", requestSent:"Zahtjev za prijateljstvo poslan.",
    myConnections:"Moje veze", friendshipsLoadError:"Popis prijatelja se ne može učitati.", noConnections:"Još nema veza.",
    friend:"Prijatelj", incomingRequest:"Dolazni zahtjev", outgoingRequest:"Poslani zahtjev",
    laterIncoming:"Možda — odluka kasnije", laterOutgoing:"Drugi korisnik će odlučiti kasnije",
    message:"Poruka", removeFriendship:"Prekini prijateljstvo", removeRequest:"Izbriši zahtjev",
    removeConfirm:"Izbrisati ovu vezu?", back:"Natrag", roleOwner:"Platform Owner", roleAdmin:"Admin",
    roleModerator:"Moderator", notifications:"Obavijesti", pushEnabled:"Obavijesti o porukama",
    previewEnabled:"Pregled poruke", saveSettings:"Spremi", settingsSaved:"Postavke obavijesti spremljene.",
    settingsError:"Postavke obavijesti se ne mogu spremiti.", language:"Jezik", delivered:"Poslano", failed:"Slanje nije uspjelo"
  },
  be: {
    title:"Паведамленні", messages:"Паведамленні", friends:"Сябры", home:"Галоўная", webapp:"Webapp", radio:"Радыё",
    chooseConversation:"Выберы размову", emptyConversation:"Тут будуць прыватныя і сістэмныя паведамленні.",
    messagePlaceholder:"Паведамленне…", send:"Адправіць", sending:"Адпраўка…", retry:"Паўтарыць",
    authRequired:"Увайдзі, каб карыстацца паведамленнямі.", login:"Увайсці", register:"Рэгістрацыя",
    noMessages:"Паведамленняў пакуль няма.", threadsLoadError:"Немагчыма загрузіць размовы.",
    conversationLoadError:"Немагчыма загрузіць размову.", user:"Карыстальнік", friendRequest:"Запыт у сябры",
    friendRequestSent:"Ты адправіў запыт у сябры.", friendRequestIncoming:"Хоча дадаць цябе ў сябры.",
    pending:"Чакае адказу.", later:"Магчыма — рашэнне пазней.", accepted:"Прынята.", declined:"Адхілена.",
    yes:"Так", no:"Не", maybe:"Магчыма", responseSaveError:"Немагчыма захаваць адказ",
    premiumRequired:"Для прыватных паведамленняў патрэбны Premium.",
    friendshipRequired:"З гэтым узроўнем можна пісаць толькі прынятым сябрам.",
    sendError:"Немагчыма адправіць паведамленне", friendsHeading:"Сябры",
    searchHelp:"Пошук па ніку. E-mail тут наўмысна не шукаецца.",
    nickname:"Нік…", search:"Пошук", minSearch:"Увядзі не менш за 2 сімвалы.", searching:"Пошук…",
    searchError:"Пошук не атрымаўся.", noResults:"Няма вынікаў.", resultCount:n=>`${n} вынікаў.`,
    addFriend:"Дадаць у сябры", alreadyConnected:"Ужо ёсць сувязь або запыт у чаканні.",
    requestSendError:"Немагчыма адправіць запыт", requestSent:"Запыт у сябры адпраўлены.",
    myConnections:"Мае сувязі", friendshipsLoadError:"Немагчыма загрузіць спіс сяброў.", noConnections:"Сувязяў пакуль няма.",
    friend:"Сябар", incomingRequest:"Уваходны запыт", outgoingRequest:"Адпраўлены запыт",
    laterIncoming:"Магчыма — рашэнне пазней", laterOutgoing:"Іншы карыстальнік вырашыць пазней",
    message:"Паведамленне", removeFriendship:"Спыніць сяброўства", removeRequest:"Выдаліць запыт",
    removeConfirm:"Выдаліць гэтую сувязь?", back:"Назад", roleOwner:"Platform Owner", roleAdmin:"Admin",
    roleModerator:"Мадэратар", notifications:"Апавяшчэнні", pushEnabled:"Апавяшчэнні аб паведамленнях",
    previewEnabled:"Папярэдні прагляд", saveSettings:"Захаваць", settingsSaved:"Налады апавяшчэнняў захаваны.",
    settingsError:"Немагчыма захаваць налады апавяшчэнняў.", language:"Мова", delivered:"Адпраўлена", failed:"Адпраўка не ўдалася"
  }
};

let language = getIdesussLanguage();
let unsubscribe = null;

export function t(key, ...args) {
  const table = STRINGS[language] || STRINGS.en;
  const value = table[key] ?? STRINGS.en[key] ?? key;
  return typeof value === "function" ? value(...args) : value;
}

export function getMessagesLanguage() {
  return language;
}

export function setMessagesLanguage(next) {
  language = setIdesussLanguage(next);
  applyMessagesLanguage();
  return language;
}

export function applyMessagesLanguage() {
  language = getIdesussLanguage();
  document.documentElement.lang = language;
  document.title = `Idesüss™ — ${t("title")}`;

  document.querySelectorAll("[data-msg-i18n]").forEach((el) => {
    const key = el.dataset.msgI18n;
    if (key) el.textContent = t(key);
  });
  document.querySelectorAll("[data-msg-placeholder]").forEach((el) => {
    const key = el.dataset.msgPlaceholder;
    if (key) el.setAttribute("placeholder", t(key));
  });

  const select = document.getElementById("messagesLanguageSelect");
  if (select && select.value !== language) select.value = language;

  window.dispatchEvent(new CustomEvent("idesuss:messages-language-applied", { detail:{ language } }));
}

export function initMessagesLanguage() {
  const select = document.getElementById("messagesLanguageSelect");
  if (select) {
    select.replaceChildren();
    for (const code of IDESUSS_SUPPORTED_LANGUAGES) {
      const option = document.createElement("option");
      option.value = code;
      option.textContent = code.toUpperCase();
      select.append(option);
    }
    select.addEventListener("change", () => setMessagesLanguage(select.value));
  }

  unsubscribe?.();
  unsubscribe = subscribeIdesussLanguage(() => applyMessagesLanguage());
  applyMessagesLanguage();
  return () => unsubscribe?.();
}
