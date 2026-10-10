# Lewolux – Übergabe für neue Chats

Stand: 9. Oktober 2026. Diese Datei fasst zusammen, was ein neuer Chat wissen muss, um nahtlos weiterzuarbeiten.
**Bitte im neuen Chat zuerst diese Datei lesen lassen.**

---

## 1. Wer und wie

- **Martin Löwe**, Lewolux Studio (privates Hobby-Spielestudio aus Schleswig-Holstein), Website **lewolux.de**.
- **Sprache:** immer Deutsch. Kurz, einfach, pragmatisch. Martin diktiert oft per Sprache, also Tippfehler wohlwollend lesen („Levolux“ = Lewolux).
- **Arbeitsweise:** Martin will maximale Selbstständigkeit. Kurze Zwischenstände mit Zeitschätzung, eine Aufgabe nach der anderen fertig machen. Technische Details nur wenn nötig, er sagt selbst: „Ich verstehe es eh nicht, mach einfach.“
- **Websites immer in seinem Chrome öffnen** (Claude-in-Chrome-Erweiterung), nicht im eingebauten Browser.

### Feste Sicherheitsregeln (gelten weiter)
- Keine Passwörter, API-Keys, Tokens, Schlüssel oder PINs in Felder eintragen, auch nicht über Remote Desktop. **GitHub-Secrets trägt Martin selbst ein.**
- Nicht mit Passwörtern einloggen, keine Konten anlegen, keine Zahlungen. Einwilligungen/AGB/OAuth klickt Martin.
- Downloads auf seinen PC nur mit Erlaubnis. Nichts endgültig löschen (nur Papierkorb).
- Keine Passwörter in Dateien sammeln. Martins Gmail-Adresse nicht auf die Website.

---

## 2. Website lewolux.de

- **Repo:** `github.com/mloewe1987-wq/lewolux-website` (privat). Cloudflare Pages baut automatisch bei jedem Push auf `main`.
  - `public/` = fertige Website (wird ausgeliefert)
  - `quelle/` = Quellcode: `build.py` (Generator), `data.py` (Spiele-Daten), `parts/` (HTML/CSS/JS), `spiele-dateien/` (die Browser-Spiele), Stimmen, Videos
  - `quelle/werkzeuge/sync.sh` = baut und kopiert alles ins Repo (Pfade ggf. anpassen)
- **Bauen:** Inhalt von `quelle/` in einen Ordner (früher `/home/claude/site`), dort `python3 build.py` → erzeugt `dist/`. Dann `dist/` nach `public/` kopieren, committen, pushen.
- **Commits** als `Martin Löwe <hallo@lewolux.de>`.
- **Spiele auf der Seite:** Mandat, Sternenwurf, Idle Legenden, Ring Legends (online), Kritzelheld, Nervbert, Pandi, Schulhofkicker, Kasse oder Zettel. In Arbeit: House in the Desert (ab 18), Ordnungsgilde.
- **Kids-Bereich** `/kids/` mit Kritzelheld, Pandi, Schulhofkicker und Elternsperre.
- **Startseite:** neuer 30-Sekunden-Trailer „Das ist Lewolux“ (16:9, dazu eine 9:16-Story-Version).
- **Feedback/Umfrage:** Cloudflare Worker `api.lewolux.de` mit D1-Datenbank (`quelle/feedback-worker/worker.js`). Er speichert nur, verschickt keine Mails.

## 3. Stimmen (ElevenLabs), seit 9.10. online

| Figur | Stimme (ElevenLabs) | Wo |
|---|---|---|
| Eule Kritzel | Axel Jones – Cute little stuffed animal | Kritzelheld (1.035 Ansagen), Kids-Bereich (16) |
| Löwe Lux | Jones – Children's audiobook narrator | Chatbot auf lewolux.de (137 Sätze) |
| Pandi | Lumi – Tiny & Sweet | Pandi (134) |
| Schulhofkicker | DiMario – Energetic and Fun | Schulhofkicker (864) |

- **Modell:** Eleven v4, Sprache Deutsch. Ton-Tags `[cheerful]`, `[friendly]`, `[excited]`.
- **Ablauf:** Viele Sätze pro Generierung, getrennt durch `[long pause] [long pause]`. Ausgabe als ZIP aus dem ElevenLabs-Tab, dann an Pausen schneiden. Skripte in `quelle/werkzeuge/stimmen/`:
  - `split.py` / `proc.py`: schneiden. Prüft, ob die Anzahl der Stücke stimmt und ob ihre Längen zur Textlänge passen, damit kein Satz falsch zugeordnet wird.
  - `integrate.py`: Kritzelheld/Kids/Lux. `integrate2.py`: Pandi/Schulhofkicker (`VOX`-Map im Spiel).
- **Im Spiel:** Pandi und Schulhofkicker zerlegen Sätze in Teile (z. B. „Geschafft!“ + „3 Tore!“) und spielen sie nacheinander ab. Fehlt ein Teil, springt die Handy-Stimme ein. Meter werden ab 100 m gerundet.
- **Bekannte Lücke:** Spielstände ab „8 zu …“ im Kopfball-Duell sind nicht vertont.
- **Abos:** ElevenLabs (Creator) und Epidemic Sound (Creator) sind gebucht. Epidemic: Posten auf Social Media/Website erlaubt, keine eigenständigen Werbeanzeigen, keine Kundenarbeiten.

## 4. E-Mail

- **hallo@lewolux.de** → Cloudflare Email Routing → **lewolux.studio@gmail.com** (neues Studio-Postfach) → automatische Kopie an Martins Hauptpostfach m.loewe1987@gmail.com.
- **Gmail-Konnektor** in Claude ist mit dem Hauptpostfach verbunden.
- **Geplante Aufgabe „Lewolux-Postfach prüfen“:** täglich 8:51 Uhr, fasst Lewolux-Mails zusammen und listet Tester-Anmeldungen. Läuft ohne Rückfragen und liest nur.
- **Offen bei Martin:** Profilbild (Lewolux-Löwe) im neuen Google-Konto hochladen.

## 5. Ring Legends (Wrestling-Sammelkartenspiel)

- **Repo:** `github.com/mloewe1987-wq/ring-legends`. Online-Spiel, API `rl-api.lewolux.de`, Google-Anmeldung für Markt und Ranglisten.
- **Android-App:** GitHub Action „Android-App bauen“ (`.github/workflows/android.yml`) baut Test-APK und signiertes AAB für Google Play.
- **Stand 9.10. abends:**
  - Secret `RL_KEYSTORE_B64` ist jetzt korrekt.
  - Secret **`RL_KEYSTORE_PASSWORD` stimmt noch nicht**, Martin muss es neu eintragen (Passwort hat Martin im Chat bekommen).
  - Danach den Build neu starten, z. B. mit einem leeren Commit auf `main`.
- **Google Play Console** ist angelegt (Konto „Lewolux Studio“). Nächste Schritte:
  1. Interner Test.
  2. Geschlossener Test mit **mindestens 12 Testern, 14 Tage am Stück**.
  3. Formular zur Datensicherheit ausfüllen.
  4. Danach Antrag auf Veröffentlichung.
- **Tester-Anmeldung:** lewolux.de/ring-legends/tester/ → Mail an hallo@lewolux.de mit Gmail-Adresse → in die Play-Console-Testerliste eintragen → Einladungslink schicken.

## 6. Weitere Ideen / später mit Martin

- Instagram-Profil für Lewolux anlegen, Kanäle bei Epidemic eintragen, Facebook, Reddit, Tester für Ring Legends finden.
- Crowdfunding/Ko-fi erst später, zuerst Reichweite.
- Vision: Kinderspiele bleiben kostenlos und werbefrei. Später freiwillige Premium-Spiele.
- Förderung Schleswig-Holstein: WTSH „Förderung digitaler Spiele“ (Module bis 20.000 / 100.000 / 200.000 €, Betrieb in SH nötig). Vorher bei der WTSH anrufen: 0431 666660.

---

## 7. Neues Projekt: **Lewolux Turbo** (Kart-Rennspiel)

**Ziel:** Kart-Rennspiel im Stil von Mario Kart, auf Augenhöhe beim Spielgefühl, aber komplett eigenständig (nichts von Nintendo übernehmen). Läuft im Browser auf lewolux.de, später ggf. als App.

### Vorgaben von Martin
- Sehr hohes Niveau, detailverliebte Umgebung, geile Sounds und Texte, nicht „0815“.
- **Steuerung:**
  - Controller (Xbox u. a., Bluetooth oder Kabel) und Tastatur.
  - Am Handy wählbar: Neigen (Handy als Lenkrad) oder Daumen-Steuerkreuz/Stick.
- **Mindestens 10 Fahrer**, möglichst aus unseren Spielen. Figuren aus dem Horrorspiel nur kinderfreundlich und lustig, sonst weglassen. Fehlen Figuren, neue coole erfinden.
- **Fahrzeuge:** Karts, Motorräder, Fahrräder, Autos, gern besondere und eigenständige.
- **Inhalte:** Items, Grand Prix mit mehreren Strecken, ein Kampfmodus (Prinzip Ballonkampf, aber anders gelöst).
- **Ton:** Figuren mit passenden Geräuschen und Sprüchen bei Ereignissen, keine Sprachsteuerung.
- **Werkzeuge:** Gemini (Bilder), ElevenLabs (Stimmen, Geräusche), Epidemic (Musik, Effekte).

### Abgrenzung zu Nintendo (keine Kopie)
- **Tabu:** Namen, Figuren, Panzer, Bananen, Fragezeichen-Boxen, Regenbogen-Strecke, „blauer Panzer“-Mechanik, Nintendo-Musik und -Sounds, Menü-Look.
- **Erlaubt sind Spielprinzipien:** Rennen, Driften, Items, Cups. Alles mit eigenen Ideen umsetzen.

### Konzept (Entwurf)
- **Fahrer (12):**
  1. Nervbert (nerviger Onkel aus dem Box-Spiel)
  2. Kritzel (Eule)
  3. Lux (Neon-Löwe)
  4. Pandi (Panda)
  5. Kicker-Kid (Schulhofkicker)
  6. Bürgermeisterin (Mandat)
  7. Sternenwerfer (Sternenwurf)
  8. Wrestler (Ring Legends)
  9. Elara (Idle Legenden)
  10. Kellner mit Einkaufswagen (Kasse oder Zettel)
  11. Sonni (lustiger Wüstenwanderer mit Riesen-Sonnenhut, kinderfreundlich aus House in the Desert)
  12. Goldfuchs (freischaltbar)
- **Fahrzeuge:**
  - Klassen: Karts, Motorräder/Roller, Spaßfahrzeuge (Einkaufswagen, Badewanne, Sofa, Rasenmäher).
  - Bausatz aus Rahmen, Rädern und einem **Gimmick**: Turbo-Tröte, Sprungfedern oder Propellermütze.
- **Items:**
  - Tintenklecks
  - Seifenblasen-Falle
  - Boxhandschuh-Rakete
  - Wahlplakat-Wand
  - Fußball (prallt ab)
  - Löwengebrüll
  - Sternschnuppe (unverwundbar und schnell)
  - Gewitterwolke: zieht langsam zum Ersten, man kann ihr ausweichen
- **Modi:**
  - Grand Prix: 3 Cups mit je 4 Strecken, 3 Geschwindigkeitsstufen.
  - Zeitfahren mit Geist und Bestenliste.
  - **Kronenjagd** (statt Ballons): Jeder trägt 3 Kronen. Wer getroffen wird, verliert eine, und der Angreifer kann sie aufsammeln.
  - Lokaler Mehrspieler mit 2–4 Controllern im geteilten Bildschirm, online später.
- **Strecken (12):**
  - Schulhof-Stadion
  - Neon-Dschungel
  - Kritzels Federwald
  - Pandis Seerosenteich
  - Wüsten-Hitze (sonnig, fröhlich)
  - Goldhafen-Markt
  - Sternenturm
  - Supermarkt-Chaos
  - Rathaus-Rallye
  - Wrestling-Arena
  - Schneehügel
  - Wolken-Finale
- **Look:** stilisiert, knallbunt, Comic-Kanten, auch auf dem Handy flüssig.
- **Technik:** Three.js (WebGL), Gamepad-API, DeviceOrientation (Neigen; iPhone braucht Erlaubnis), Touch-Steuerung, eigene Arcade-Fahrphysik, KI-Gegner.

### Fortschritt (Martins Wunsch, 9.10.)
- **Fahrer-Level 1–30** (XP aus Platzierung, Überholen, Treffern, Tricks, Münzen). Level schalten nur frei, machen **nicht stärker**: Outfits/Farben, 3 Fahrzeuge pro Fahrer, Räder, Flammen-/Spurfarben, Hupen, Siegerposen, Sprüche.
- **Balancing:** Fahrzeuge/Teile sind Seitwärts-Upgrades (Summe der Werte bleibt gleich).
- **Quests** (täglich/wöchentlich) → XP + **Lewolux-Taler** für den **Shop** (nur Spielwährung).
- **Grand Prix:** 3 Cups × 4 Strecken, Punkte 15-12-10-8-7-6, Gesamtwertung, Pokal-Zeremonie, Cups nacheinander freischalten.
- **Speichern:** erst localStorage, später über den Login auf lewolux.de.
- **Reihenfolge:** 1. Sounds/Stimmen/Musik → 2. Grand Prix + Strecke 2 → 3. Level/Quests/Shop → 4. weitere Strecken; Balancing laufend.
- **Items (Stand 9.10.):** Turbo-Tröte (auch 3×), Boxhandschuh-Rakete, Fußball, Seifenblase, Tintenklecks, Wahlplakat, Sonnencreme-Pfütze, Löwengebrüll, Karten-Schild, Sternschnuppe, Gewitterwolke. Wundertüten statt Kisten, Lewolux-Münzen, 2 Schanzen mit Trick-Turbo.

### Zeitplan (korrigierte Schätzung)
1. Entwürfe (Look der Fahrer und einer Strecke, mit Gemini). **erledigt 9.10.**
   - **Prototyp läuft (9.10.):** https://lewolux.de/turbo/ (nicht verlinkt, noindex). Quelle: `quelle/spiele-intern/lewolux-turbo/` (Three.js, Module in `js/`: track, karts, scenery, audio, input, main). build.py kopiert nach `dist/turbo/`.
   - Inhalt: Strecke Neon-Dschungel, 6 Fahrer (Nervbert, Kritzel, Pandi, Lux, Kicker-Kid, Sonni), Driften mit 3 Turbo-Stufen, 6 Items, KI, 3 Tempoklassen, Grafik-Einstellung (Auto/Hoch/Mittel/Niedrig), Tastatur, Xbox-Controller, Handy (Stick oder Neigen). Test-Modus: `?auto=1&sim=8`.
   - Noch Platzhalter: Musik/Sounds per WebAudio erzeugt (später Epidemic/ElevenLabs), Stimmen als Plapperlaute.
2. Spielbarer Prototyp (1 Strecke, 4 Fahrer, Driften, Items, alle Steuerungen): ca. 3–5 Stunden.
3. Version 1.0 (12 Fahrer, 12 Strecken, alle Modi, Sounds und Stimmen): ca. 1–2 Wochen in mehreren Sitzungen.
4. Später: mehr Cups, Online-Rennen.

### Stand Nacht 9./10.10. (Nachtschicht bis 7 Uhr)
- **12 Strecken, 3 Cups:** Lewolux-Cup (Dschungel, Schulhof, Teich, Wüste), Sternen-Cup (Supermarkt-Chaos, Schulhof bei Nacht, Wüsten-Sonnenuntergang, Sternenturm), Legenden-Cup (Tempel-Ruinen, Laternenfest, Supermarkt-Nachtschicht, Regenbogen-Allee). Strecken in `js/tracks.js` (`cp`, `scale`, Stil), Umgebung je Thema in `js/scenery_<thema>.js` mit Varianten über `night`, `sunset`, `temple`; Fahrbahn-Stile in `track.js` (u. a. `rainbow`, `tiles`, `planks`, `glass`).
- **11 Fahrer** (+ Berta, Brecher, Elara, Kellner Karl, Goldfuchs zum Freischalten), Modi Grand Prix / Einzelrennen / Zeitfahren mit Geist, Garage (Fahrzeuge, Räder, Lack, Outfits), Aufgaben, Erfolge, Level 1–20 pro Fahrer.
- **Fahrgefühl:** Windschatten (dicht hinter Gegnern → kurzer Schub), **Lenkhilfe** (Fahrerauswahl/Pause, für Kinder).
- **Audio:** Code für echte Dateien ist fertig (`assets/sfx/<name>.mp3`, `assets/voice/<fahrer>_<n>.mp3`, `assets/music/<thema>.mp3`). Geladen wird nur, was in `assets/audio.json` (`{"files":["sfx/coin.mp3", …]}`) steht – sonst Synth-Ersatz. Die Stimmen (ElevenLabs, `turbo_voices_1.zip`) und Epidemic-Musik/SFX liegen in Martins Downloads; einbauen, sobald die Rechner-Verbindung steht (Stimmen-Stapel per Pausen in Einzelclips schneiden, Reihenfolge wie `SAY_IDX`).
- Tests: `?auto=1&sim=40&gp=1&cup=0|1|2` (GP-Simulation), `?track=<id>&nobloom`, `window.__qa(i, seite)`.

**Token sparen:** viele kleine Dateien, automatisch im Hintergrund testen statt vieler Screenshots, in klaren Etappen arbeiten.
