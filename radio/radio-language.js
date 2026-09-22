import {
  getIdesussLanguage,
  setIdesussLanguage,
  subscribeIdesussLanguage,
  normalizeIdesussLanguage
} from "../js/shared/language-preference.js";

const TEXT = {
  hu: {
    savedPresetReady:"{station} betöltve az 1-es mentett presetből.",
    login:"👤 Bejelentkezés", profile:"👤 Profil",
    directoryTitle:"Rádióválasztó — {slot}. preset", directorySearch:"Állomás neve", directoryCountry:"Ország", directoryLanguage:"Nyelv", directoryGenre:"Műfaj / címke", directorySearchPlaceholder:"Pl. Petőfi, jazz, BBC…", directoryGenrePlaceholder:"Pl. rock, news, dance", directorySearchButton:"Keresés", directoryAllCountries:"Minden ország", directoryAllLanguages:"Minden nyelv", directoryLoading:"Rádióállomások betöltése…", directoryNoResults:"Nincs találat ezekkel a szűrőkkel.", directoryResultCount:"{count} állomás betöltve.", directoryPreview:"▶ Próba", directorySave:"Mentés a presetre", directorySignInSave:"A preset mentéséhez bejelentkezés szükséges.", directorySaved:"{station} elmentve a(z) {slot}. presetre.", directorySaveError:"A rádió mentése nem sikerült.", directoryLoadError:"A külső rádiókatalógus most nem érhető el.", directoryClose:"Rádióválasztó bezárása", directoryPreviewing:"{station} próbahallgatása…",
   
    registeredOnly:"Regisztrált felhasználóknak", recommended:"Idesüss ajánlott élő rádió", saveLogin:"A presetek mentéséhez bejelentkezés szükséges.", saveCount:"A csomagodban {count} menthető rádiópreset érhető el.", recommendedSelected:"Ajánlott kezdőállomás kiválasztva.", readyStation:"{station} készen áll. Nyomd meg a Lejátszás gombot az élő adáshoz.", playbackError:"Lejátszási hiba: {error}", streamPlaybackFailed:"A rádió stream lejátszása nem sikerült.",
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
    savedPresetReady:"{station} loaded from saved preset 1.",
    login:"👤 Sign in", profile:"👤 Profile",
    directoryTitle:"Radio picker — preset {slot}", directorySearch:"Station name", directoryCountry:"Country", directoryLanguage:"Language", directoryGenre:"Genre / tag", directorySearchPlaceholder:"E.g. BBC, jazz, Heart…", directoryGenrePlaceholder:"E.g. rock, news, dance", directorySearchButton:"Search", directoryAllCountries:"All countries", directoryAllLanguages:"All languages", directoryLoading:"Loading radio stations…", directoryNoResults:"No stations match these filters.", directoryResultCount:"{count} stations loaded.", directoryPreview:"▶ Preview", directorySave:"Save to preset", directorySignInSave:"Sign in to save this preset.", directorySaved:"{station} saved to preset {slot}.", directorySaveError:"The station could not be saved.", directoryLoadError:"The external radio directory is unavailable right now.", directoryClose:"Close radio picker", directoryPreviewing:"Previewing {station}…",
   
    registeredOnly:"Registered users only", recommended:"Idesüss recommended live radio", saveLogin:"Sign in to save presets.", saveCount:"Your plan includes {count} savable radio presets.", recommendedSelected:"Recommended starter station selected.", readyStation:"{station} is ready. Press Play for the live broadcast.", playbackError:"Playback error: {error}", streamPlaybackFailed:"The radio stream could not be played.",
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
    savedPresetReady:"{station} geladen uit opgeslagen preset 1.",
    login:"👤 Inloggen", profile:"👤 Profiel",
    directoryTitle:"Radio kiezen — preset {slot}", directorySearch:"Stationsnaam", directoryCountry:"Land", directoryLanguage:"Taal", directoryGenre:"Genre / tag", directorySearchPlaceholder:"Bijv. NPO, jazz, SLAM…", directoryGenrePlaceholder:"Bijv. rock, nieuws, dance", directorySearchButton:"Zoeken", directoryAllCountries:"Alle landen", directoryAllLanguages:"Alle talen", directoryLoading:"Radiostations laden…", directoryNoResults:"Geen stations gevonden met deze filters.", directoryResultCount:"{count} stations geladen.", directoryPreview:"▶ Proberen", directorySave:"Opslaan in preset", directorySignInSave:"Log in om deze preset op te slaan.", directorySaved:"{station} opgeslagen in preset {slot}.", directorySaveError:"Het station kon niet worden opgeslagen.", directoryLoadError:"De externe radiogids is nu niet beschikbaar.", directoryClose:"Radiokiezer sluiten", directoryPreviewing:"Voorbeeld van {station}…",
   
    registeredOnly:"Alleen voor geregistreerde gebruikers", recommended:"Idesüss aanbevolen live radio", saveLogin:"Log in om presets op te slaan.", saveCount:"Je abonnement bevat {count} opslagbare radiopresets.", recommendedSelected:"Aanbevolen startstation geselecteerd.", readyStation:"{station} is klaar. Druk op Afspelen voor de live-uitzending.", playbackError:"Afspeelfout: {error}", streamPlaybackFailed:"De radiostream kon niet worden afgespeeld.",
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
    savedPresetReady:"{station} încărcat din presetul 1 salvat.",
    login:"👤 Autentificare", profile:"👤 Profil",
    directoryTitle:"Selector radio — presetarea {slot}", directorySearch:"Numele postului", directoryCountry:"Țară", directoryLanguage:"Limbă", directoryGenre:"Gen / etichetă", directorySearchPlaceholder:"Ex. Kiss FM, jazz, BBC…", directoryGenrePlaceholder:"Ex. rock, știri, dance", directorySearchButton:"Caută", directoryAllCountries:"Toate țările", directoryAllLanguages:"Toate limbile", directoryLoading:"Se încarcă posturile radio…", directoryNoResults:"Niciun post nu corespunde filtrelor.", directoryResultCount:"{count} posturi încărcate.", directoryPreview:"▶ Ascultă", directorySave:"Salvează în presetare", directorySignInSave:"Autentifică-te pentru a salva presetarea.", directorySaved:"{station} a fost salvat în presetarea {slot}.", directorySaveError:"Postul nu a putut fi salvat.", directoryLoadError:"Catalogul radio extern nu este disponibil acum.", directoryClose:"Închide selectorul radio", directoryPreviewing:"Previzualizare {station}…",
   
    registeredOnly:"Doar pentru utilizatori înregistrați", recommended:"Radio live recomandat de Idesüss", saveLogin:"Autentifică-te pentru a salva presetările.", saveCount:"Planul tău include {count} presetări radio salvabile.", recommendedSelected:"Postul recomandat a fost selectat.", readyStation:"{station} este gata. Apasă Redare pentru transmisia live.", playbackError:"Eroare de redare: {error}", streamPlaybackFailed:"Streamul radio nu a putut fi redat.",
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
    savedPresetReady:"{station} wczytano z zapisanego presetu 1.",
    login:"👤 Zaloguj się", profile:"👤 Profil",
    directoryTitle:"Wybór radia — preset {slot}", directorySearch:"Nazwa stacji", directoryCountry:"Kraj", directoryLanguage:"Język", directoryGenre:"Gatunek / tag", directorySearchPlaceholder:"Np. RMF, jazz, BBC…", directoryGenrePlaceholder:"Np. rock, wiadomości, dance", directorySearchButton:"Szukaj", directoryAllCountries:"Wszystkie kraje", directoryAllLanguages:"Wszystkie języki", directoryLoading:"Ładowanie stacji radiowych…", directoryNoResults:"Brak stacji dla tych filtrów.", directoryResultCount:"Załadowano {count} stacji.", directoryPreview:"▶ Posłuchaj", directorySave:"Zapisz w presecie", directorySignInSave:"Zaloguj się, aby zapisać preset.", directorySaved:"{station} zapisano w presecie {slot}.", directorySaveError:"Nie udało się zapisać stacji.", directoryLoadError:"Zewnętrzny katalog radia jest teraz niedostępny.", directoryClose:"Zamknij wybór radia", directoryPreviewing:"Odsłuch {station}…",
   
    registeredOnly:"Tylko dla zarejestrowanych użytkowników", recommended:"Polecane radio na żywo Idesüss", saveLogin:"Zaloguj się, aby zapisywać presety.", saveCount:"Twój pakiet obejmuje {count} zapisywalnych presetów radiowych.", recommendedSelected:"Wybrano polecaną stację startową.", readyStation:"{station} jest gotowe. Naciśnij Odtwórz, aby słuchać na żywo.", playbackError:"Błąd odtwarzania: {error}", streamPlaybackFailed:"Nie udało się odtworzyć strumienia radiowego.",
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
    savedPresetReady:"{station} učitan iz spremljenog preseta 1.",
    login:"👤 Prijava", profile:"👤 Profil",
    directoryTitle:"Odabir radija — preset {slot}", directorySearch:"Naziv postaje", directoryCountry:"Država", directoryLanguage:"Jezik", directoryGenre:"Žanr / oznaka", directorySearchPlaceholder:"Npr. bravo, jazz, BBC…", directoryGenrePlaceholder:"Npr. rock, vijesti, dance", directorySearchButton:"Traži", directoryAllCountries:"Sve države", directoryAllLanguages:"Svi jezici", directoryLoading:"Učitavanje radijskih postaja…", directoryNoResults:"Nema postaja za ove filtre.", directoryResultCount:"Učitano je {count} postaja.", directoryPreview:"▶ Poslušaj", directorySave:"Spremi u preset", directorySignInSave:"Prijavi se za spremanje preseta.", directorySaved:"{station} je spremljen u preset {slot}.", directorySaveError:"Postaju nije moguće spremiti.", directoryLoadError:"Vanjski radijski katalog trenutačno nije dostupan.", directoryClose:"Zatvori odabir radija", directoryPreviewing:"Preslušavanje {station}…",
   
    registeredOnly:"Samo za registrirane korisnike", recommended:"Idesüss preporučeni radio uživo", saveLogin:"Prijavi se za spremanje preseta.", saveCount:"Tvoj paket uključuje {count} radijskih preseta za spremanje.", recommendedSelected:"Odabrana je preporučena početna postaja.", readyStation:"{station} je spreman. Pritisni Reproduciraj za prijenos uživo.", playbackError:"Pogreška reprodukcije: {error}", streamPlaybackFailed:"Radijski stream nije moguće reproducirati.",
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
    savedPresetReady:"{station} загружана з захаванага прэсэта 1.",
    login:"👤 Увайсці", profile:"👤 Профіль",
    directoryTitle:"Выбар радыё — прэсэт {slot}", directorySearch:"Назва станцыі", directoryCountry:"Краіна", directoryLanguage:"Мова", directoryGenre:"Жанр / тэг", directorySearchPlaceholder:"Напр. Radius, jazz, BBC…", directoryGenrePlaceholder:"Напр. rock, навіны, dance", directorySearchButton:"Пошук", directoryAllCountries:"Усе краіны", directoryAllLanguages:"Усе мовы", directoryLoading:"Загрузка радыёстанцый…", directoryNoResults:"Па гэтых фільтрах нічога не знойдзена.", directoryResultCount:"Загружана станцый: {count}.", directoryPreview:"▶ Паслухаць", directorySave:"Захаваць у прэсэт", directorySignInSave:"Увайдзі, каб захаваць прэсэт.", directorySaved:"{station} захавана ў прэсэт {slot}.", directorySaveError:"Не ўдалося захаваць станцыю.", directoryLoadError:"Знешні радыёкаталог зараз недаступны.", directoryClose:"Закрыць выбар радыё", directoryPreviewing:"Праслухоўванне {station}…",
   
    registeredOnly:"Толькі для зарэгістраваных карыстальнікаў", recommended:"Рэкамендаванае Idesüss жывое радыё", saveLogin:"Увайдзі, каб захоўваць прэсэты.", saveCount:"Твой тарыф дазваляе захоўваць {count} радыёпрэсэтаў.", recommendedSelected:"Выбрана рэкамендаваная пачатковая станцыя.", readyStation:"{station} гатовая. Націсні Прайграць для жывога эфіру.", playbackError:"Памылка прайгравання: {error}", streamPlaybackFailed:"Не ўдалося прайграць радыёпаток.",
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

export function radioT(key, values = {}) {
  const template = TEXT[currentLanguage]?.[key] ?? TEXT.en[key] ?? key;
  return Object.entries(values).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
    template
  );
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
