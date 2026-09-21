import {
  getIdesussLanguage,
  setIdesussLanguage,
  subscribeIdesussLanguage,
  normalizeIdesussLanguage
} from "../js/shared/language-preference.js";

const TEXT = {
  hu: {
    home:"← Főoldal", webapp:"▶ Webapp", title:"📻 Rádió",
    subtitle:"Élő rádióállomások, gyors csatornaváltás és személyes presetek egy helyen.",
    live:"Élő rádió", none:"Nincs kiválasztott állomás",
    choose:"Válassz egy állomást a listából, vagy indíts hangtesztet.",
    volume:"Hangerő", play:"▶ Lejátszás", pause:"⏸ Szünet", stop:"■ Leállítás", test:"🔊 Hangteszt",
    stations:"Állomások", presets:"Csatornagombok / presetek",
    note:"Az 1-es preset induláskor egy, a választott nyelvhez illő népszerű állomást ajánl. Ez csak kezdőbeállítás: bejelentkezés után bármikor lecserélheted a saját választásodra.",
    guest:"Vendég", empty:"üres", savedStation:"Mentett állomás", radioStation:"Rádióállomás",
    selectFirst:"Előbb válassz állomást.", streamMissing:"Ehhez az állomáshoz még nincs streamforrás bekötve.",
    loading:"Streamforrás betöltése…", ready:"A stream készen áll a lejátszásra.", buffering:"Pufferelés…",
    stalled:"A stream nem küld adatot; várakozás az újracsatlakozásra…", playing:"Élő adás lejátszása folyamatban.",
    paused:"Lejátszás szüneteltetve.", stopped:"Lejátszás leállítva.", ended:"A stream véget ért.",
    unavailable:"Jelenleg nincs elérhető rádióállomás.", language:"Nyelv"
  },
  en: {
    home:"← Home", webapp:"▶ Webapp", title:"📻 Radio",
    subtitle:"Live radio stations, fast channel switching and personal presets in one place.",
    live:"Live radio", none:"No station selected", choose:"Choose a station from the list or start the audio test.",
    volume:"Volume", play:"▶ Play", pause:"⏸ Pause", stop:"■ Stop", test:"🔊 Audio test",
    stations:"Stations", presets:"Channel buttons / presets",
    note:"Preset 1 starts with a popular station matching the selected language. This is only a default: after signing in, you can replace it with your own choice at any time.",
    guest:"Guest", empty:"empty", savedStation:"Saved station", radioStation:"Radio station",
    selectFirst:"Choose a station first.", streamMissing:"This station does not have a stream source configured yet.",
    loading:"Loading stream source…", ready:"The stream is ready to play.", buffering:"Buffering…",
    stalled:"The stream is not sending data; waiting to reconnect…", playing:"Live broadcast is playing.",
    paused:"Playback paused.", stopped:"Playback stopped.", ended:"The stream has ended.",
    unavailable:"No radio station is currently available.", language:"Language"
  },
  nl: {
    home:"← Startpagina", webapp:"▶ Webapp", title:"📻 Radio",
    subtitle:"Live radiostations, snel zappen en persoonlijke presets op één plek.",
    live:"Live radio", none:"Geen station geselecteerd", choose:"Kies een station uit de lijst of start de audiotest.",
    volume:"Volume", play:"▶ Afspelen", pause:"⏸ Pauze", stop:"■ Stoppen", test:"🔊 Audiotest",
    stations:"Stations", presets:"Kanaalknoppen / presets",
    note:"Preset 1 stelt bij het starten een populair station voor dat bij de gekozen taal past. Dit is alleen een begininstelling: na het inloggen kun je het altijd vervangen.",
    guest:"Gast", empty:"leeg", savedStation:"Opgeslagen station", radioStation:"Radiostation",
    selectFirst:"Kies eerst een station.", streamMissing:"Voor dit station is nog geen streambron ingesteld.",
    loading:"Streambron laden…", ready:"De stream is klaar om af te spelen.", buffering:"Bufferen…",
    stalled:"De stream stuurt geen gegevens; wachten op opnieuw verbinden…", playing:"Live-uitzending wordt afgespeeld.",
    paused:"Afspelen gepauzeerd.", stopped:"Afspelen gestopt.", ended:"De stream is beëindigd.",
    unavailable:"Er is momenteel geen radiostation beschikbaar.", language:"Taal"
  },
  ro: {
    home:"← Pagina principală", webapp:"▶ Webapp", title:"📻 Radio",
    subtitle:"Posturi radio live, schimbare rapidă a canalelor și presetări personale într-un singur loc.",
    live:"Radio live", none:"Niciun post selectat", choose:"Alege un post din listă sau pornește testul audio.",
    volume:"Volum", play:"▶ Redare", pause:"⏸ Pauză", stop:"■ Oprire", test:"🔊 Test audio",
    stations:"Posturi", presets:"Butoane de canal / presetări",
    note:"Presetarea 1 recomandă la pornire un post popular potrivit limbii selectate. Este doar o setare inițială: după autentificare îl poți înlocui oricând.",
    guest:"Vizitator", empty:"gol", savedStation:"Post salvat", radioStation:"Post radio",
    selectFirst:"Alege mai întâi un post.", streamMissing:"Acest post nu are încă o sursă de stream configurată.",
    loading:"Se încarcă sursa streamului…", ready:"Streamul este gata pentru redare.", buffering:"Se încarcă…",
    stalled:"Streamul nu trimite date; se așteaptă reconectarea…", playing:"Transmisiunea live este redată.",
    paused:"Redarea este în pauză.", stopped:"Redarea a fost oprită.", ended:"Streamul s-a încheiat.",
    unavailable:"Momentan nu este disponibil niciun post radio.", language:"Limbă"
  },
  pl: {
    home:"← Strona główna", webapp:"▶ Webapp", title:"📻 Radio",
    subtitle:"Stacje radiowe na żywo, szybkie przełączanie kanałów i osobiste presety w jednym miejscu.",
    live:"Radio na żywo", none:"Nie wybrano stacji", choose:"Wybierz stację z listy albo uruchom test dźwięku.",
    volume:"Głośność", play:"▶ Odtwórz", pause:"⏸ Pauza", stop:"■ Zatrzymaj", test:"🔊 Test dźwięku",
    stations:"Stacje", presets:"Przyciski kanałów / presety",
    note:"Preset 1 przy starcie proponuje popularną stację pasującą do wybranego języka. To tylko ustawienie początkowe: po zalogowaniu możesz je w każdej chwili zmienić.",
    guest:"Gość", empty:"pusty", savedStation:"Zapisana stacja", radioStation:"Stacja radiowa",
    selectFirst:"Najpierw wybierz stację.", streamMissing:"Dla tej stacji nie skonfigurowano jeszcze źródła streamu.",
    loading:"Ładowanie źródła streamu…", ready:"Stream jest gotowy do odtwarzania.", buffering:"Buforowanie…",
    stalled:"Stream nie przesyła danych; oczekiwanie na ponowne połączenie…", playing:"Trwa odtwarzanie transmisji na żywo.",
    paused:"Odtwarzanie wstrzymane.", stopped:"Odtwarzanie zatrzymane.", ended:"Stream się zakończył.",
    unavailable:"Obecnie żadna stacja radiowa nie jest dostępna.", language:"Język"
  },
  hr: {
    home:"← Početna", webapp:"▶ Webapp", title:"📻 Radio",
    subtitle:"Radijske postaje uživo, brzo mijenjanje kanala i osobni preseti na jednom mjestu.",
    live:"Radio uživo", none:"Nije odabrana postaja", choose:"Odaberi postaju s popisa ili pokreni test zvuka.",
    volume:"Glasnoća", play:"▶ Reproduciraj", pause:"⏸ Pauza", stop:"■ Zaustavi", test:"🔊 Test zvuka",
    stations:"Postaje", presets:"Gumbi kanala / preseti",
    note:"Preset 1 pri pokretanju predlaže popularnu postaju koja odgovara odabranom jeziku. To je samo početna postavka: nakon prijave možeš je bilo kada zamijeniti.",
    guest:"Gost", empty:"prazno", savedStation:"Spremljena postaja", radioStation:"Radijska postaja",
    selectFirst:"Najprije odaberi postaju.", streamMissing:"Za ovu postaju još nije postavljen izvor streama.",
    loading:"Učitavanje izvora streama…", ready:"Stream je spreman za reprodukciju.", buffering:"Međuspremanje…",
    stalled:"Stream ne šalje podatke; čeka se ponovno povezivanje…", playing:"Reproducira se prijenos uživo.",
    paused:"Reprodukcija je pauzirana.", stopped:"Reprodukcija je zaustavljena.", ended:"Stream je završio.",
    unavailable:"Trenutno nema dostupnih radijskih postaja.", language:"Jezik"
  },
  be: {
    home:"← Галоўная", webapp:"▶ Webapp", title:"📻 Радыё",
    subtitle:"Жывыя радыёстанцыі, хуткае пераключэнне каналаў і асабістыя прэсэты ў адным месцы.",
    live:"Жывое радыё", none:"Станцыя не выбрана", choose:"Выберы станцыю са спісу або запусці аўдыятэст.",
    volume:"Гучнасць", play:"▶ Прайграць", pause:"⏸ Паўза", stop:"■ Спыніць", test:"🔊 Аўдыятэст",
    stations:"Станцыі", presets:"Кнопкі каналаў / прэсэты",
    note:"Прэсэт 1 пры запуску прапануе папулярную станцыю, якая адпавядае выбранай мове. Гэта толькі пачатковая налада: пасля ўваходу яе можна змяніць у любы час.",
    guest:"Госць", empty:"пуста", savedStation:"Захаваная станцыя", radioStation:"Радыёстанцыя",
    selectFirst:"Спачатку выберы станцыю.", streamMissing:"Для гэтай станцыі яшчэ не наладжана крыніца патоку.",
    loading:"Загрузка крыніцы патоку…", ready:"Паток гатовы да прайгравання.", buffering:"Буферызацыя…",
    stalled:"Паток не перадае даныя; чакаем паўторнага падключэння…", playing:"Жывы эфір прайграецца.",
    paused:"Прайграванне прыпынена.", stopped:"Прайграванне спынена.", ended:"Паток скончыўся.",
    unavailable:"Зараз няма даступных радыёстанцый.", language:"Мова"
  }
};

let currentLanguage = normalizeIdesussLanguage(getIdesussLanguage());

export function radioT(key) {
  return TEXT[currentLanguage]?.[key] ?? TEXT.en[key] ?? key;
}

function applyRadioLanguage() {
  document.documentElement.lang = currentLanguage;
  document.querySelectorAll("[data-radio-i18n]").forEach((element) => {
    const value = radioT(element.dataset.radioI18n);
    if (value) element.textContent = value;
  });

  const select = document.getElementById("radioLangSelect");
  if (select) select.value = currentLanguage;
}

export function getRadioLanguage() {
  return currentLanguage;
}

export function initRadioLanguage() {
  currentLanguage = normalizeIdesussLanguage(getIdesussLanguage());
  applyRadioLanguage();

  const select = document.getElementById("radioLangSelect");
  select?.addEventListener("change", (event) => {
    currentLanguage = setIdesussLanguage(event.target.value);
    applyRadioLanguage();
    window.dispatchEvent(new CustomEvent("idesuss:radio-languagechange", {
      detail: { language: currentLanguage }
    }));
  });

  subscribeIdesussLanguage((language) => {
    const next = normalizeIdesussLanguage(language);
    if (next === currentLanguage) return;
    currentLanguage = next;
    applyRadioLanguage();
    window.dispatchEvent(new CustomEvent("idesuss:radio-languagechange", {
      detail: { language: currentLanguage }
    }));
  });

  return currentLanguage;
}
