# Inhalte der Website: Spiele, Software, FAQ
# ratio = Seitenverhältnis des Spiels im Browser (RPG Maker MZ Standard: 816/624). Hochkant-Spiele z. B. 9/16.
GAMES = [
 dict(id="mandat", ratio="816/624", scene="mandat", demo="mandat", wide=True, accent="#3be8ff",
  title="Mandat – Vom Dorf ins Kanzleramt", short="Mandat", tagline="Vom Gemeinderat bis in den Bundestag.",
  desc="Starte mit 18 im Dorf, gründe deine eigene Partei oder tritt einer bei. Tägliche Umfragen, Wahlprognosen, Bürgerwünsche in Prozent und Entscheidungen, die wehtun.",
  genres=["Polit-RPG","Strategie"], cats="rpg retro", status="In Entwicklung",
  plats=["web","mobile","pad"], tech=["RPG Maker MZ","HTML5","Fullscreen Mobile"],
  story="Du bist 18, wohnst in Lindenbrück, und ganz unten in einem Karton liegt eine Mappe: „Neubaugebiet Sonnenhang – vertraulich“. Gewinne das Dorf, dann die Kreisstadt, dann das Land.",
  controls=[["Laufen","Pfeiltasten"],["Sprechen, Bestätigen","Enter / Leertaste"],["Menü / Karte","Esc / M"],["Tag beenden","N"]],
  features=["Tägliche Umfragen und Wahlprognosen mit Diagrammen","Wahlprogramm zum Durchklicken","Aktuelle Themen: Klima, Migration, Infrastruktur","Events mit harten Entscheidungen"],
  shots=["Eine vertrauliche Akte: Neubaugebiet Sonnenhang","Wer bist du? Deine Figur für den Weg in die Politik","Lindenbrück: hier beginnt deine Karriere"],
  reel=["Innovation","Politik als Rollenspiel","Jeder Tag bringt neue Umfragen und Schlagzeilen."],
  download=dict(file="downloads/mandat.html", format="HTML · 1 Datei, offline spielbar (PC & Handy)")),
 dict(id="sternenwurf", ratio="816/624", scene="stern", demo="stern", accent="#ffcf4a",
  title="Sternenwurf", short="Sternenwurf", tagline="Ein Wurf kann alles ändern.",
  desc="Dreh am Altar der Sterne und jage 120 Ausrüstungsteile bis 1 zu 10.000.000. Verschmelze, bezwinge den Prüfungsturm, brüte 50 Pets aus und erobere 5 Welten.",
  genres=["RNG","Idle"], cats="arcade exp", status="In Entwicklung",
  plats=["web","mobile","pad"], tech=["RPG Maker MZ","Custom UI","Statistiken"],
  story="Im Sternenfall-Tal fiel einst ein Stern vom Himmel und wurde zum Altar. Wer an ihm dreht, kann alles gewinnen. Sogar die Krone des Alls, die noch niemand gesehen hat.",
  controls=[["Laufen, Ansprechen","Pfeile / Klick / Tippen"],["Auto-Drehen","R"],["Auto-Brüten","T"],["Menü","Esc"]],
  features=["5 Seltenheiten von Gewöhnlich bis Kosmisch","Verschmelzen bis ★4 und 30 Turm-Etagen","50 Pets und ein eigener Sternengarten","Auto-Roll, Kodex und Statistiken"],
  shots=["Das Glück fällt vom Himmel","Sternseherin Lyra im Sternenfall-Tal","Sternenwurf: das Titelbild"],
  reel=["Neu","1 zu 10.000.000","Die Krone des Alls wurde noch nie gefunden. Noch nicht."],
  download=dict(file="downloads/sternenwurf.html", format="HTML · 1 Datei, offline spielbar (PC & Handy)")),
 dict(id="idle-legenden", ratio="816/624", scene="idle", demo="idle", accent="#ff8a3d",
  title="Idle Legenden", short="Idle Legenden", tagline="Die Loot-Spirale dreht sich auch, wenn du schläfst.",
  desc="Düsteres Idle-RPG mit Loot, Charakter-Progression und Base-Building. Baue Goldhafen vom Lager zur Handelsstadt aus und schick deine Helden immer tiefer.",
  genres=["Idle-RPG","Dark Fantasy"], cats="rpg retro", status="In Entwicklung",
  plats=["web","mobile","pad"], tech=["RPG Maker MZ","Incremental"],
  story="Goldhafen war einmal reich. Dann kamen die Schatten aus der Tiefe. Du hast ein Schwert, eine leere Schmiede und sehr viel Zeit.",
  controls=[["Laufen","Pfeile / Klick / Tippen"],["Aktion, Ansprechen","Enter / Leertaste"],["Menü","Esc"],["Handy","Querformat, Vollbild-Knopf"]],
  features=["Loot in 4 Seltenheiten bis Legendär","5 Stadtstufen für Goldhafen","Bis zu 8 Stunden Offline-Ertrag","Goldene Wiedergeburt mit Seelentalern"],
  shots=["Ratgeberin Elara: Bring Goldhafen zum Leuchten","Goldhafen unter dem Grauen Schleier","Idle Legenden: das Titelbild"],
  reel=["Gameplay","Zahlen, die explodieren","Von 10 Gold bis 47 Milliarden."],
  download=dict(file="downloads/idle-legenden.html", format="HTML · 1 Datei, offline spielbar (PC & Handy)")),
 dict(id="wrestling-tcg", ratio="9/16", scene="wrestle", demo="wrestle", accent="#ff5ad1",
  title="Ring Legends", short="Ring Legends", tagline="Reiß das Pack auf. Hol dir den Titel.",
  desc="Online-Sammelkartenspiel mit fiktiven Wrestlern: Packs aufreißen, 316 Karten sammeln, graden und auf dem Markt mit anderen Spielern handeln. Kein Pay-to-Win.",
  genres=["Sammelkarten","Online","Pack-Opening"], cats="arcade", status="Großes Update", online=True,
  plats=["web","mobile","android"], tech=["Online-Server","Anti-Cheat","React"],
  story="250 Karten im Hauptset, dazu Season- und Pay-per-View-Karten, jede mit eigenem Wrestler. Manche gibt es tausendfach. Eine davon gibt es fast gar nicht. Und jetzt weißt du auch, wer sie hat.",
  controls=[["Pack aufreißen","Über den Rand wischen"],["Karte aufdecken","Tippen / Enter"],["Einmarsch","Karte gedrückt halten"],["Holo-Glanz","Handy neigen"]],
  features=["Ring-Duelle gegen echte Spieler mit eigener Liga","Markt und Karten-Tausch mit anderen Spielern","Ranglisten, Umlauf-Liste und Live-Ticker","Ohne Anmeldung spielbar, mit Google auf jedem Gerät"],
  shots=["Pack-Opening: Gary Gutbuster, Karte 025/250","Starkes Pack: fünf neue Karten","Willkommen bei Ring Legends"],
  reel=["Großes Update","Jetzt online: Markt und Ranglisten","Handeln, vergleichen, sammeln, im Browser und bald als App."],
  download=dict(file="downloads/wrestling-tcg.html", format="Online-Spiel, kein Download nötig (Android-App folgt)"),
  update=dict(kicker="Großes Update · Oktober 2026", title="Ring Legends ist jetzt online",
   lead="Das bisher größte Update macht aus Ring Legends ein echtes Online-Spiel. Deine Sammlung liegt sicher auf unserem Server, und zum ersten Mal spielst du nicht mehr allein.",
   items=[("🛒", "Markt", "Biete doppelte Karten zu deinem Wunschpreis an und kauf dir die, die dir fehlen. 8 % Gebühr, Angebote laufen 7 Tage."),
          ("🏆", "Ranglisten", "Wer hat das vollste Album, die meisten Gem Mint 10, die meisten Packs? Drei Ranglisten, jeden Tag neu."),
          ("📊", "Umlauf-Liste", "Wie viele Exemplare jeder Karte gibt es, roh und je Note? So findest du im Markt den richtigen Preis – den legst du selbst fest."),
          ("🛡️", "Fair und sicher", "Jedes Pack wird auf dem Server gezogen. Schummeln ist ausgeschlossen, die Drop-Raten stimmen mit den angezeigten überein."),
          ("⚔️", "Ring-Duell & Liga", "Deine Ring-Aufstellung kämpft gegen echte Spieler. 3 Duelle am Tag, Münzen für Siege und eine eigene Duell-Liga."),
          ("🔁", "Karten tauschen", "Karte gegen Karte mit anderen Spielern – fair abgesichert: Treuhand beim Server, nur Duplikate, keine Abzocke."),
          ("🎯", "Wochen-Events", "Jede Woche ein neues Event – Duell-Woche, Sammel-Jagd oder Grading-Fieber – mit eigener Rangliste und bis zu 10.000 W$ Belohnung."),
          ("🔴", "Live-Ticker", "Sieh live, wer gerade eine Legende zieht oder eine Gem Mint 10 bekommt."),
          ("🔑", "Ohne Pflicht-Anmeldung", "Sofort losspielen, ganz ohne Konto. Mit „Weiter mit Google“ schaltest du Markt und Ranglisten frei und spielst auf jedem Gerät weiter."),
          ("📱", "Bald bei Google Play", "Die Android-App ist in Vorbereitung. Mit Google angemeldet nimmst du deine Sammlung einfach mit.")],
   note="Wichtig für alle, die schon gespielt haben: Die neue Version startet mit einer frischen Sammlung auf dem Server. Alte Spielstände aus dem Browser lassen sich nicht übernehmen, weil sie nicht fälschungssicher sind.")),
 dict(id="kritzelheld", orient="any", ratio="16/10", scene="kritzel", demo="kritzel", accent="#7dff9e",
  title="Kritzelheld", short="Kritzelheld", tagline="Schreiben lernen mit Eule Kritzel.",
  desc="Werbefreie Lern-App für Kinder: Buchstaben und Zahlen nachfahren, Federn sammeln und die Eule im Shop einkleiden. Mit Schatzkarte, Minispielen und Elternsperre.",
  genres=["Lernen","Kinder"], cats="family exp", status="Beta",
  plats=["web","android"], tech=["HTML5 Canvas","Expo","Offline"],
  story="Eule Kritzel hat ihre Federn verloren. Jeder Buchstabe, den du schön nachfährst, bringt eine zurück. Schaffst du alle 96?",
  controls=[["Nachfahren","Finger / Stift / Maus"],["Radieren","Knopf ⌫"],["Nochmal vormachen","Knopf ★"],["Elternbereich","Zahnrad gedrückt halten"]],
  features=["96 Buchstaben und Zahlen","Auswertung in Prozent, Schwelle einstellbar","14 Minispiele und 78 Eulen-Outfits","Werbefrei, ohne Internet nutzbar"],
  shots=["Wer spielt heute? Karl und Michel","Buchstaben nachspuren und Torschuss","Lernspiele mit Eule Kritzel"],
  reel=["Family","Lernen, das sich wie Spielen anfühlt","Kinder sehen sofort, wie viel sie geschafft haben."],
  download=dict(file="downloads/kritzelheld.html", format="HTML · 1 Datei, offline spielbar (PC & Handy)")),
 dict(id="kasse-oder-zettel", ratio="816/624", scene="kasse", demo="kasse", accent="#3be8ff",
  title="Kasse oder Zettel?", short="Kasse oder Zettel", tagline="Zettel gegen Kasse: Wer schafft den Freitagabend?",
  desc="Bediene ein volles Restaurant und spüre den Unterschied: mobile Kasse gegen Zettelwirtschaft. 8 Level, vom Mittagstisch bis Silvester.",
  genres=["Simulation","Arcade"], cats="arcade retro", status="Spielbar",
  plats=["web","mobile","pad"], tech=["RPG Maker MZ","Web-Embed"],
  story="Freitagabend, alle Tische voll, die Küche ruft. Mit dem Block in der Hand rennst du. Mit der mobilen Kasse lächelst du.",
  controls=[["Tisch bedienen","Klick / Tippen / 1–8"],["Küche / Tresen","K / T"],["Pause","Esc / P"],["Vollbild","F"]],
  features=["8 Level, 48 Sterne","Jedes Level zweimal: Zettel, dann Kasse","QR-Bestellung und Kartenzahlung am Tisch","Echtes Vollbild auf dem Handy"],
  shots=["Schicht in der Pizzeria: Tisch 1 will bestellen","Kasse oder Zettel? Das Titelbild","8 Level von Mittagstisch bis Silvester"],
  reel=["Simulation","Spielend verstehen","Zeigt, was eine Kasse im Service verändert."],
  download=dict(file="downloads/kasse-oder-zettel.html", format="HTML · 1 Datei, offline spielbar (PC & Handy)")),
 dict(id="ordnungsgilde", ratio="9/16", scene="ordnung", demo="ordnung", wide=True, accent="#9b5cff",
  title="Ordnungsgilde", short="Ordnungsgilde", tagline="Aufräumen als Rollenspiel.",
  desc="Die Wohnung als Abenteuer: tägliche Quests, XP, Level, Streaks und ein Shop für deinen Avatar. Plötzlich macht Staubsaugen Spaß.",
  genres=["Gamification","Lifestyle"], cats="family exp", status="Prototyp",
  plats=["web","mobile"], tech=["React","PWA-ready"],
  story="Die Gilde sucht neue Mitglieder. Aufnahmeprüfung: die Spülmaschine. Belohnung: Ruhm, XP und ein sauberes Zuhause.",
  controls=[["Quest abhaken","Klick / Tippen"],["Avatar","A"],["Shop","S"]],
  features=["Tägliche Quests mit XP","Level, Titel und Avatar","Shop mit Belohnungen","Streak-Tracking"],
  shots=["Wohnzimmer-Quest","Level-Up zum Ordnungsritter","Serie: 17 Tage"],
  reel=["Experimental","Haushalt mit Levelsystem","Gamification für den Alltag."],
  download=dict(file="downloads/ordnungsgilde.html", format="HTML · 1 Datei, offline spielbar (PC & Handy)")),
]

SOFTWARE = [
 dict(id="diktakte", scene="kanzlei", title="Diktakte", cat="Kanzlei-Software · Windows",
  desc="Diktieren. Ablegen. Erledigt. Diktierprogramm für Anwälte mit juristischer Schreibweise, Aktenverwaltung, Fristen und E-Mail-Versand. Die Spracherkennung läuft komplett lokal.",
  feats=["Spracherkennung lokal, ohne Cloud","§ 823 Abs. 1 BGB statt „Paragraph achthundert…“","Fristen nach BGB und ZPO mit Vorfrist","Briefe, PDF/A, E-Mail und beA-Versand"], tech=["Windows",".NET 8","Whisper"]),
 dict(id="deskboard", scene="desk", title="DeskBoard", cat="Desktop-Oberfläche · Windows · Kostenlos",
  desc="Eine eigene Startoberfläche für Windows: Programm- und Webseiten-Kacheln, Reiter für Privat und Arbeit, Widgets und ein Notizblock zum Abreißen.",
  feats=["Kacheln für Programme, Webseiten und Ordner","Widgets: Wetter, Kalender, Musik, Weltzeit …","Notizblock zum Abreißen, Sticky Notes","Kostenlos für alle, dauerhaft"], tech=["Electron","React","TypeScript"]),
 dict(id="speisekarte", scene="speise", title="Speisekarten-Konfigurator", cat="Gastronomie · Web-App",
  desc="Speise-, Getränke-, Tages-, Menü- und Aktionskarten selbst gestalten und drucken. 9 Vorlagen, Allergene, Logo-Werkstatt und QR-Code.",
  feats=["6 Kartenarten, 9 Vorlagen","Allergene mit automatischer Legende","Logo-Werkstatt und QR-Code","Drucken oder als PDF speichern"], tech=["Web","Druck-Layout"]),
]

FAQ = [
 ("Sind die Spiele von Lewolux Studio kostenlos?","Ja. Solange sich ein Spiel in Entwicklung befindet, kannst du es kostenlos im Browser spielen oder als Early Access herunterladen."),
 ("Brauche ich einen Account oder eine Installation?","Nein. Die Browser-Versionen starten direkt per Klick. Die Downloads sind jeweils eine einzige Datei: herunterladen, öffnen, spielen."),
 ("Auf welchen Geräten laufen die Spiele?","Auf PC, Laptop, Tablet und Smartphone in aktuellen Browsern. Die RPG-Maker-Titel unterstützen zusätzlich Gamepads."),
 ("Was bedeutet Early Access?","Die Spiele sind spielbar, aber noch nicht fertig. Inhalte, Balancing und Grafik ändern sich mit jedem Update. Dein Feedback fließt direkt in die Entwicklung ein."),
 ("Ist Lewolux Studio ein Unternehmen?","Nein. Lewolux Studio ist ein privates Hobbyprojekt. Alle Spiele und Programme sind kostenlos, es gibt keine Werbung und nichts zu kaufen."),
 ("Gibt es auch Software?","Ja. Neben den Spielen entstehen in der Freizeit kleine Programme, zum Beispiel DeskBoard, eine kostenlose Startoberfläche für Windows. Auch das sind Hobbyprojekte."),
]

ICONS = {
 "web":('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></svg>',"Web / Browser"),
 "mobile":('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/></svg>',"Mobile Ready"),
 "android":('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/></svg>',"Android"),
 "pad":('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="2" y="6" width="20" height="12" rx="4"/><path d="M6 12h4M8 10v4M15 11h.01M18 13h.01"/></svg>',"Gamepad Support"),
}
PLAY = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>'
DL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12m0 0l-5-5m5 5l5-5M5 21h14"/></svg>'

# SEO: Seitentitel (max. ~60 Zeichen), Meta-Beschreibung (~150 Zeichen), Langtext für die Spielseite
SEO = {
 "mandat": dict(
  title="Mandat – Polit-RPG kostenlos im Browser spielen",
  meta="Mandat: Vom Dorf ins Kanzleramt. Gründe deine Partei, gewinne Wahlen und triff harte Entscheidungen. Kostenloses Polit-RPG für PC und Handy.",
  long=["<strong>Mandat – Vom Dorf ins Kanzleramt</strong> ist ein Polit-Rollenspiel, in dem du mit 18 Jahren in einem kleinen Dorf startest und dich bis in den Bundestag hocharbeitest. Du gründest deine eigene Partei oder trittst einer bestehenden bei, führst Wahlkampf, sprichst mit Bürgerinnen und Bürgern und baust dir Schritt für Schritt eine politische Karriere auf: vom Gemeinderat über die Kreisstadt bis nach Berlin.",
        "Jeden Tag gibt es neue <strong>Umfragen und Wahlprognosen</strong> mit Diagrammen, Nachrichten über die anderen Parteien und Bürgerwünsche in Prozent. Aktuelle Themen wie Klimaschutz, Migration und Infrastruktur sorgen für Events mit harten Entscheidungen, bei denen es selten eine Lösung gibt, die alle glücklich macht. Das Spiel erklärt dabei viel und führt dich verständlich durch das politische System.",
        "Mandat läuft kostenlos direkt im Browser, auf dem Handy im Vollbild und unterstützt Gamepads. Während der Entwicklung kannst du das Spiel außerdem gratis als Early Access herunterladen."]),
 "sternenwurf": dict(
  title="Sternenwurf – RNG-Spiel kostenlos im Browser",
  meta="Sternenwurf: Dreh am Altar, jage 120 Teile bis 1 zu 10.000.000, brüte 50 Pets aus und erobere 5 Welten. Kostenloses RNG- und Idle-Spiel.",
  long=["<strong>Sternenwurf</strong> ist ein RNG-Sammelspiel im Stil beliebter Glücksspiele ohne echtes Geld: Am Altar der Sterne drehst du um Ausrüstung und hoffst auf die seltensten Funde. 120 Teile in fünf Seltenheiten von Gewöhnlich bis Kosmisch warten, das seltenste ist die <strong>Krone des Alls mit 1 zu 10.000.000</strong>.",
        "Gleiche Teile verschmilzt du zu stärkeren Versionen, mit deinem Gearscore bezwingst du die 30 Etagen des Prüfungsturms und schaltest fünf Welten mit immer mehr Glück frei. Im Sternengarten brütest du <strong>50 Pets</strong> aus, Holzfäller und Bergleute bringen Gold, auch während Auto-Roll für dich dreht. Die Dreh-Animation lässt sich jederzeit überspringen.",
        "Sternenwurf ist kostenlos, braucht keinen Account und läuft im Browser auf PC, Tablet und Smartphone."]),
 "idle-legenden": dict(
  title="Idle Legenden – Idle-RPG kostenlos spielen",
  meta="Idle Legenden: düsteres Idle-RPG mit Loot-Spirale, Charakter-Progression und Base-Building. Kostenlos im Browser oder als Early Access.",
  long=["<strong>Idle Legenden</strong> ist ein Idle- und Incremental-RPG mit düsterer Fantasy-Welt. Deine Helden kämpfen auch dann weiter, wenn du gerade nicht spielst, sammeln Gold und finden immer bessere Ausrüstung. Die Loot-Spirale sorgt dafür, dass jeder Kampf ein bisschen stärker macht.",
        "Neben den Kämpfen in vier Portalen bis zum Boss baust du die Stadt <strong>Goldhafen</strong> aus: Minenarbeiter, Farmen, Goldgolems und Bankiers bringen Gold pro Sekunde, jede der fünf Stadtstufen vertreibt ein Stück des Grauen Schleiers. Mit der Goldenen Wiedergeburt startest du neu und wirst mit jedem Durchlauf dauerhaft stärker.",
        "Idle Legenden ist in Entwicklung und kostenlos spielbar, direkt im Browser oder als Download."]),
 "wrestling-tcg": dict(
  title="Ring Legends – Wrestling-Sammelkartenspiel online",
  meta="Ring Legends: kostenloses Online-Sammelkartenspiel mit Pack-Opening, 316 Wrestler-Karten, Grading, Markt und Ranglisten. Im Browser spielen, kein Pay-to-Win.",
  long=["<strong>Ring Legends</strong> ist ein Online-Sammelkartenspiel mit fiktiven Wrestlern. Jeden Tag gibt es kostenlose Packs, die du aufreißt. Ziel ist es, das Album mit allen <strong>250 Karten</strong> im Hauptset zu füllen, dazu kommen Season- und Pay-per-View-Karten.",
        "Mit dem <strong>großen Update</strong> ist Ring Legends ein echtes Online-Spiel: Deine Sammlung liegt sicher auf unserem Server, jedes Pack wird dort gezogen, Schummeln ist ausgeschlossen. Auf dem <strong>Markt</strong> handelst du Karten mit anderen Spielern um W$, in den <strong>Ranglisten</strong> vergleichst du dein Album, und der <strong>Pop-Report</strong> zeigt, wie oft eine Karte weltweit die Traumnote 10 bekommen hat.",
        "Du kannst sofort ohne Anmeldung losspielen. Markt und Ranglisten schaltest du mit „Weiter mit Google“ frei, dann spielst du auch auf jedem Gerät weiter. Ring Legends ist fair und kein Pay-to-Win. Die Android-App für Google Play ist in Vorbereitung."]),
 "kritzelheld": dict(
  title="Kritzelheld – Schreiben lernen App für Kinder",
  meta="Kritzelheld: werbefreie Lern-App, mit der Kinder Buchstaben und Zahlen schreiben lernen. Mit Eule Kritzel, Federn, Shop und Minispielen.",
  long=["<strong>Kritzelheld</strong> ist eine werbefreie Lern-App, mit der Kinder spielerisch <strong>Buchstaben und Zahlen schreiben lernen</strong>. Das Kind fährt die Zeichen mit dem Finger nach, die App zeigt in Prozent, wie genau es war. Die Schwelle lässt sich für jedes Alter passend einstellen.",
        "Für jede gelungene Übung gibt es Federn. Damit kann die Eule Kritzel im Shop neue Outfits und Accessoires bekommen. Eine Schatzkarte, Erfolge und Minispiele wie Malen nach Zahlen sorgen für Motivation. Mehrere Kinderprofile und eine Elternsperre sind eingebaut.",
        "Kritzelheld funktioniert ohne Internet, sammelt keine Daten und ist kostenlos im Browser und als Download verfügbar."]),
 "kasse-oder-zettel": dict(
  title="Kasse oder Zettel? – Gastro-Spiel im Browser",
  meta="Kasse oder Zettel? Schichtsimulator in der Pizzeria: Erlebe spielerisch, wie viel Zeit eine mobile Kasse gegenüber dem Bestellblock spart.",
  long=["<strong>Kasse oder Zettel?</strong> ist ein Schichtsimulator in der Gastronomie. Du bedienst ein volles Restaurant und erlebst direkt den Unterschied zwischen dem klassischen Bestellblock und einer <strong>mobilen Kasse</strong>, die Bestellungen sofort in die Küche schickt.",
        "8 Level mit steigendem Tempo, vom ruhigen Mittagstisch bis zur Silvesternacht, machen den Vergleich greifbar. Jedes Level spielst du zweimal mit denselben Gästen, erst mit Zettel, dann mit Kasse, und siehst am Ende Umsatz, Trinkgeld und Sterne im direkten Vergleich. Auf dem Handy läuft das Spiel im echten Vollbild.",
        "Kasse oder Zettel ist kostenlos im Browser spielbar."]),
 "ordnungsgilde": dict(
  title="Ordnungsgilde – Aufräumen als Rollenspiel",
  meta="Ordnungsgilde: Haushalt mit Levelsystem. Tägliche Quests, XP, Streaks und ein Avatar machen Aufräumen zum Spiel. Kostenlos als Web-App.",
  long=["<strong>Ordnungsgilde</strong> macht aus Haushaltsaufgaben ein Rollenspiel. Spülmaschine ausräumen, staubsaugen oder Wäsche zusammenlegen werden zu <strong>täglichen Quests</strong>, für die es Erfahrungspunkte gibt.",
        "Mit genug XP steigt dein Held im Level auf und bekommt neue Titel, vom Staubschubser bis zum Glanzgeneral. Streaks belohnen dich, wenn du dranbleibst, und im Shop gibt es Belohnungen für deinen Avatar. So wird Ordnung zur Gewohnheit.",
        "Ordnungsgilde ist ein Prototyp und kostenlos als Web-App für Handy und PC nutzbar."]),
}

# Angekündigte Spiele (nur Vorschau, nicht spielbar). age = empfohlenes Mindestalter
TEASERS = [
 dict(id="house-in-the-desert", title="House in the Desert", short="House in the Desert", age=18, accent="#ff3b3b",
  tagline="Ein Spiel über Schuld, Durst und das, was die Sonne sieht.",
  desc="Survival-Horror in der Wüste: Tagsüber ist es zu heiß, um das dunkle Herrenhaus zu verlassen. Nachts gehst du mit der Taschenlampe hinaus.",
  genres=["Survival-Horror","Story"], status="Erscheint bald", part="Teil 1: Die Glut",
  long=["Die Sonne ist hier dein größter Feind. Wer am Tag nach draußen geht, verbrennt. Also wartest du im Halbdunkel eines alten Herrenhauses, rationierst Wasser und Licht und lauschst auf das, was durch die Gänge schleicht.",
        "Erst wenn es dunkel wird, ziehst du mit der Taschenlampe hinaus in die Wüste. Eine große, offene Welt, eine düstere Geschichte mit wenig Worten und viele Stunden Spielzeit."],
  features=["Tag-und-Nacht-Wechsel: Hitze am Tag, Gefahr in der Nacht","Taschenlampe, Brennstoff und Wasser als knappe Ressourcen","Große Wüstenwelt mit verlassenem Herrenhaus","Erzählt mit Atmosphäre statt langer Texte"],
  notice="Empfohlen ab 18 Jahren. Horrorspiel mit düsteren, belastenden Themen, Gewalt sowie plötzlichen lauten Geräuschen und Lichteffekten. Ohne offizielle Alterseinstufung."),
]

# News-Laufleiste oben auf jeder Seite: (Etikett, Text, Link relativ zur Startseite)
NEWS = [
 ("Großes Update", "Ring Legends ist jetzt online: Markt, Ranglisten, Pop-Report", "#ring-legends-update"),
 ("Bald", "Ring Legends kommt als App in den Play Store", "spiele/wrestling-tcg/#update"),
 ("Neu", "DeskBoard 1.7 jetzt kostenlos zum Download", "software/deskboard/"),
 ("Angekündigt", "House in the Desert – Survival-Horror, empfohlen ab 18", "spiele/house-in-the-desert/"),
 ("Mitmachen", "Stimm ab, welches Spiel als Nächstes wächst", "#mitmachen"),
 ("Neu", "Handbücher für alle Spiele: Schnellstart, Steuerung, Profi-Tipps", "spiele/sternenwurf/#handbuch"),
 ("Software", "Diktakte: Diktieren, ablegen, erledigt. Alle Funktionen im Überblick", "software/diktakte/"),
 ("Tipp", "Lade dir die Spiele kostenlos herunter. Läuft auch offline", "#spiele"),
]

# Lewolux Kids (/kids/): Spiele für Kinder. Neues Kinderspiel = einfach hier einen Eintrag ergänzen.
# id    = Ordner in spiele-dateien/<id>/ (das Spiel läuft im Kinderbereich unter /games/<id>/index.html)
# say   = Satz, der beim Antippen vorgelesen wird (für Kinder, die noch nicht lesen können)
# c1/c2 = Farben der Karte, emoji = großes Symbol, age = Altersempfehlung
# Spiele in dieser Liste werden im Kids-Modus NICHT gesperrt; alle anderen Spiele schon.
KIDS = [
 dict(id="kritzelheld", title="Kritzelheld", emoji="🦉", c1="#3ec97a", c2="#19a7e0", age="ab 4 Jahren",
  line="Buchstaben und Zahlen malen mit Eule Kritzel",
  say="Kritzelheld! Male Buchstaben und Zahlen mit Eule Kritzel und sammle Federn."),
]
