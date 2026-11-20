/* NEO ABC – słowniczek pojęć Drogi Neokatechumenalnej i liturgii (opracowanie własne, uproszczone). */
(function () {
  'use strict';
  // [hasło, wyjaśnienie, grupa]  grupy: c – celebracja, f – funkcje, d – Droga i etapy, s – słowa wiary
  const ABC = [
    ['Monicja', 'Krótkie wprowadzenie przed czytaniem albo częścią celebracji. Nie streszcza tekstu, tylko pomaga go usłyszeć: mówi, w jakim miejscu historii zbawienia jesteśmy i dlaczego to Słowo jest dziś dla nas. Zwykle 1–2 minuty.', 'c'],
    ['Echo Słowa', 'Po czytaniach bracia dzielą się tym, co Słowo powiedziało do ich życia – nie komentarz ani wykład, ale świadectwo: „to Słowo dotknęło mnie, bo…”. Potem homilię mówi prezbiter.', 'c'],
    ['Modlitwa wiernych swobodna', 'Każdy może wypowiedzieć własną, spontaniczną prośbę lub dziękczynienie, często wychodzącą z usłyszanego Słowa. Wspólnota odpowiada wezwaniem, np. „Wysłuchaj nas, Panie”.', 'c'],
    ['Pocałunek pokoju', 'Znak pokoju przekazywany sobie nawzajem przez wszystkich. Wyraża pojednanie i komunię: nie mogę stanąć przed ołtarzem, nie będąc w pokoju z bratem (por. Mt 5,23-24). We wspólnocie przekazuje się go każdemu, nie tylko sąsiadom.', 'c'],
    ['Amen', 'Hebrajskie „tak, niech się stanie, to pewne”. Wyznanie wiary całym sobą – szczególnie wielkie Amen na zakończenie Modlitwy Eucharystycznej śpiewane przez całe zgromadzenie.', 'c'],
    ['Maranatha', 'Aramejskie wezwanie pierwszych chrześcijan: „Marana tha” – „Przyjdź, Panie!” albo „Maran atha” – „Pan przychodzi”. Wołanie o powtórne przyjście Chrystusa (1 Kor 16,22; Ap 22,20).', 'c'],
    ['Eucharystia', 'Z greckiego „dziękczynienie”. Pamiątka śmierci i zmartwychwstania Chrystusa – centrum życia wspólnoty. We wspólnocie celebrowana w sobotę wieczorem jako Eucharystia niedzielna, przygotowywana kolejno przez grupy braci.', 'c'],
    ['Pascha', 'Z hebrajskiego „przejście”. Przejście Pana, który wyprowadza z niewoli – w Starym Testamencie z Egiptu, w Nowym ze śmierci do życia przez Chrystusa. Wigilia Paschalna to „matka wszystkich wigilii”, celebrowana całą noc.', 'c'],
    ['Wigilia Paschalna', 'Nocne czuwanie z Wielkiej Soboty na Niedzielę Zmartwychwstania: liturgia światła, wiele czytań historii zbawienia, liturgia chrzcielna i Eucharystia, często do świtu, zakończone agapą.', 'c'],
    ['Agapa', 'Z greckiego „miłość”. Braterski posiłek wspólnoty po celebracji, np. po Wigilii Paschalnej czy na konwiwencji – przedłużenie komunii przy stole.', 'c'],
    ['Konwiwencja', 'Z łaciny „wspólne przebywanie”. Comiesięczne spotkanie wspólnoty (zwykle niedziela): jutrznia, krąg doświadczeń, w którym każdy mówi o swoim życiu w świetle Słowa, często wspólny posiłek.', 'c'],
    ['Liturgia Słowa', 'Cotygodniowa celebracja wspólnoty (zwykle wtorek lub środa) z kilkoma czytaniami na jedno hasło, monicjami, pieśniami, echem i homilią. Przygotowuje ją kolejno grupa braci.', 'c'],
    ['Liturgia pokutna', 'Celebracja sakramentu pojednania we wspólnocie: Słowo, rachunek sumienia, indywidualna spowiedź u prezbitera, wspólne dziękczynienie.', 'c'],
    ['Homilia', 'Wyjaśnienie Słowa przez prezbitera po echach braci – aktualizacja Słowa dla wspólnoty dzisiaj.', 'c'],
    ['Jutrznia (Laudes)', 'Poranna modlitwa Kościoła z psalmami. Na Drodze wspólnota uczy się modlić psalmami – w domu, w rodzinie i na konwiwencji.', 'c'],
    ['Epikleza', 'Wezwanie Ducha Świętego w Modlitwie Eucharystycznej, by uświęcił dary chleba i wina oraz zgromadzenie.', 'c'],
    ['Anamneza', 'Uobecniająca pamiątka: „czyńcie to na moją pamiątkę”. Nie samo wspomnienie, ale wejście w wydarzenie zbawienia, które staje się teraźniejsze.', 'c'],
    ['Skrutacja', 'Osobiste, codzienne badanie Pisma: od jednego wersetu przez odnośniki (marginalia) do kolejnych miejsc, aż Słowo zacznie mówić do mojego życia. Zapisuje się to, „co Bóg mi powiedział”.', 'c'],
    ['Odpowiedzialny', 'Brat wybrany przez wspólnotę i potwierdzony przez katechistów, który z pomocą współodpowiedzialnych służy jedności wspólnoty, prowadzi ją i czuwa nad przygotowaniami.', 'f'],
    ['Kantor', 'Brat lub siostra prowadzący śpiew wspólnoty (zwykle z gitarą). Kantor główny dba o śpiew na celebracjach i uczy pieśni.', 'f'],
    ['Didaskal', 'Z greckiego „nauczyciel”. Brat, który na celebracji pomaga wspólnocie w przebiegu liturgii – zapowiada, czuwa nad porządkiem, prowadzi części, które nie należą do prezbitera.', 'f'],
    ['Ostiariusz', 'Z łaciny „odźwierny”. Posługa przy drzwiach: wita, dba o miejsce, porządek i ciszę, by celebracja mogła przebiegać spokojnie.', 'f'],
    ['Prezbiter', 'Z greckiego „starszy” – kapłan. Przewodniczy Eucharystii, głosi homilię, udziela sakramentów; we wspólnocie jest bratem, który idzie tą samą drogą wiary.', 'f'],
    ['Katechista', 'Ten, kto głosi katechezy. Ekipa katechistów (małżeństwo, prezbiter, brat lub siostra) prowadzi wspólnotę przez etapy Drogi.', 'f'],
    ['Ekipa', 'Grupa braci przygotowująca celebrację (Słowo, Eucharystię, konwiwencję). Przygotowanie zaczyna się od modlitwy i wspólnego czytania Słowa.', 'f'],
    ['Kerygmat', 'Z greckiego „ogłoszenie, przepowiadanie”. Podstawowe orędzie: Jezus Chrystus umarł za twoje grzechy i zmartwychwstał, żeby dać ci życie wieczne – Bóg kocha cię takim, jakim jesteś. Od kerygmatu zaczynają się katechezy.', 's'],
    ['Zmartwychwstanie', 'Centrum wiary: Chrystus pokonał śmierć i żyje. Dla nas oznacza możliwość życia nowym życiem już teraz – kochać „w wymiarze krzyża”, także nieprzyjaciela.', 's'],
    ['Metanoia', 'Z greckiego „przemiana myślenia” – nawrócenie. Nie zmiana zasad moralnych z własnych sił, lecz zwrócenie się do Boga, który przemienia.', 's'],
    ['Koinonia', 'Z greckiego „komunia, wspólnota”. Jedność braci, która rodzi się nie z sympatii, ale z wiary – znak dla świata (J 17,21).', 's'],
    ['Kenoza', 'Z greckiego „ogołocenie”. Chrystus „ogołocił samego siebie, przyjąwszy postać sługi” (Flp 2,7). Droga uczy schodzenia w dół, uniżenia.', 's'],
    ['Shema', 'Hebrajskie „Słuchaj”. Wyznanie wiary Izraela: „Słuchaj, Izraelu, Pan jest naszym Bogiem – Pan jedynie! Będziesz miłował Pana, Boga twego, z całego serca…” (Pwt 6,4-5). Także nazwa etapu Drogi.', 's'],
    ['Krzyż chwalebny', 'Krzyż nie jako przekleństwo, ale miejsce, gdzie Bóg objawia swoją miłość i gdzie spotykam Chrystusa w moim cierpieniu i historii.', 's'],
    ['Trójnóg', 'Obraz życia chrześcijańskiego opartego na trzech „nogach”: Słowo Boże, Liturgia (Eucharystia) i Wspólnota. Bez jednej z nich nie da się ustać.', 's'],
    ['Neokatechumenat', 'Droga Neokatechumenalna – itinerarium chrześcijańskiej formacji (katechumenat pochrzcielny) w parafii, w małych wspólnotach. Zapoczątkowana w 1964 r. w Madrycie przez Kiko Argüello i Carmen Hernández; jej Statut zatwierdziła Stolica Apostolska.', 'd'],
    ['Katechumenat', 'W starożytnym Kościele czas przygotowania dorosłych do chrztu. Na Drodze – odkrywanie bogactwa chrztu przyjętego w dzieciństwie, etapami, jak dawni katechumeni.', 'd'],
    ['Katechezy początkowe', 'Seria katechez (kilka tygodni) głoszonych w parafii, zakończona konwiwencją. Z tych, którzy chcą iść dalej, powstaje nowa wspólnota.', 'd'],
    ['Prekatechumenat', 'Pierwszy okres Drogi (zwykle ok. 2 lat): Słowo, Eucharystia, konwiwencje; wspólnota uczy się kenozy i pokory. Kończy go pierwsze skrutynium.', 'd'],
    ['Skrutynium', 'Z łaciny „badanie”. Etap przejścia, na którym Kościół bada wiarę i pragnienie dalszej drogi. Pierwsze skrutynium otwiera katechumenat; drugie (po ok. 2 latach) zamyka okres przejścia.', 'd'],
    ['Okres przejścia', 'Czas między I a II skrutynium: celebracje na podstawie haseł biblijnych, a potem „duże tematy” – historia zbawienia w etapach (Abraham, Wyjście, Przymierze…).', 'd'],
    ['Inicjacja do modlitwy', 'Etap, na którym wspólnota otrzymuje Psałterz i uczy się modlitwy Kościoła – jutrzni, psalmów, skrutacji – jako codziennego oddechu.', 'd'],
    ['Traditio symboli', 'Z łaciny „przekazanie Credo”. Kościół przekazuje wspólnocie Wyznanie wiary; bracia głoszą je potem w parach w domach parafii.', 'd'],
    ['Redditio symboli', '„Oddanie Credo” – publiczne wyznanie wiary przed biskupem/Kościołem, poprzedzone osobistą drogą i świadectwem.', 'd'],
    ['Ojcze nasz', 'Etap, na którym wspólnota otrzymuje Modlitwę Pańską i uczy się żyć jako dzieci Ojca – czas pogłębienia modlitwy i jutrzni.', 'd'],
    ['Wybranie', 'Ostatni etap Drogi, zakończony odnowieniem przyrzeczeń chrzcielnych w Wigilię Paschalną – w białych szatach, jako znak dojrzałej wiary.', 'd'],
    ['Biblia wspólnotowa', 'Biblia, do której wpisuje się imiona braci wspólnoty. Odpowiedzialny modli się z niej za nieobecnych.', 'd'],
    ['Missio ad gentes', 'Rodziny i prezbiterzy z Drogi posłani na misję – zakładać obecność Kościoła tam, gdzie go brakuje.', 'd'],
    ['Redemptoris Mater', 'Seminaria misyjne przy Drodze, w których formują się prezbiterzy dla całego Kościoła.', 'd'],
    ['Dziesięcina', 'Oddawanie Bogu części dochodu (np. jednej dziesiątej) jako znak, że wszystko jest od Niego – przekazywane na potrzeby Kościoła i ubogich.', 'd']
  ];
  const GR = { c: 'Celebracja', f: 'Funkcje', d: 'Droga i etapy', s: 'Słowa wiary' };
  function view() {
    const q = (UI.abcQ || '').trim().toLowerCase(), g = UI.abcG || '';
    const L = ABC.filter(x => (!g || x[2] === g) && (!q || (x[0] + ' ' + x[1]).toLowerCase().indexOf(q) >= 0)).sort((a, b) => a[0].localeCompare(b[0], 'pl'));
    return '<div class="card"><h2>Neo ABC</h2><div class="muted">Słowniczek pojęć Drogi i liturgii – krótko i prosto.</div>' +
      '<input type="search" id="abcQ" class="mt" placeholder="Szukaj, np. monicja" value="' + esc(UI.abcQ || '') + '" data-in="abc">' +
      '<div class="chips mt"><button class="chip sm' + (g ? '' : ' on') + '" data-act="abc-g" data-a="">Wszystko</button>' + Object.keys(GR).map(k => '<button class="chip sm' + (g === k ? ' on' : '') + '" data-act="abc-g" data-a="' + k + '">' + GR[k] + '</button>').join('') + '</div></div>' +
      '<div class="card abc">' + (L.length ? L.map(x => '<div class="abci"><b>' + esc(x[0]) + '</b><div>' + esc(x[1]) + '</div></div>').join('') : '<div class="muted">Nic nie znaleziono.</div>') + '</div>';
  }
  function act(a, v) {
    if (a !== 'abc-g') return false;
    UI.abcG = v; render(); return true;
  }
  function input(el) {
    UI.abcQ = el.value;
    const pos = el.selectionStart; render();
    const n = document.getElementById('abcQ'); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) { /* */ } }
  }
  window.ABC = { view: view, act: act, input: input };
})();
