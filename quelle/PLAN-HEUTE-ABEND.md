# Plan für heute Abend (Start, sobald Martin „go“ sagt)

## 0. Vorbereitung (Martin, ca. 5 Min.)
- Claude-Desktop-App auf dem PC öffnen, diesen Chat öffnen, „Link to this computer“ wählen
- Ordner freigeben: C:\DESKBOARD, Ordner des Kanzlei-Programms, Ordner mit den Spiel-ZIPs/Projekten
- Im Browser selbst einloggen: Cloudflare, GitHub (falls vorhanden), Google (für Search Console)
- Rechner nicht in den Ruhezustand gehen lassen

## 1. Daten einsammeln (Claude, automatisch)
- [ ] Handbücher/READMEs von DeskBoard und KanzleiDiktat lesen; Programmnamen klären (KanzleiDiktat oder DiktAkte?)
- [ ] DeskBoard-Setup finden (dist/*.exe) oder per `npm run build:win` bauen
- [ ] Echte Screenshots von DeskBoard und KanzleiDiktat aufnehmen (statt gezeichneter Bilder)
- [ ] Prüfen, ob es neuere Spielstände/ZIPs gibt (Mandat, Sternenwurf, Idle Legenden, Kasse, Ring Legends, Kritzelheld, Ordnungsgilde, Bargeld oder Karte)

## 2. Website aktualisieren (Claude)
- [ ] Software-Seiten DeskBoard und KanzleiDiktat nach den echten Handbüchern neu schreiben
- [ ] Echte Software-Screenshots einbauen
- [ ] Neuere Spielversionen übernehmen, Handbücher prüfen
- [ ] Bauen, auf Handy- und PC-Ansicht testen

## 3. DeskBoard-Download dauerhaft bereitstellen
- [ ] GitHub-Repo „deskboard“ + Release mit DeskBoard-Setup.exe (über Martins GitHub-Konto; Konto anlegen muss Martin selbst)
- [ ] Download-Link auf der Website eintragen

## 4. Cloudflare (jede Änderung mit kurzer Bestätigung von Martin)
- [ ] Website veröffentlichen, bevorzugt per Wrangler direkt vom PC (Martin bestätigt einmal den Cloudflare-Login), sonst per „New deployment“
- [ ] Feedback-Server: D1-Datenbank „lewolux-feedback“, Worker „lewolux-feedback“, Domain api.lewolux.de
- [ ] Admin-Passwort (ADMIN_KEY) tippt Martin selbst ein
- [ ] E-Mail-Weiterleitung hallo@lewolux.de → Martins Gmail (Cloudflare Email Routing, Bestätigungsmail in Gmail anklicken)

## 5. INWX
- [ ] Nur prüfen: Nameserver zeigen auf Cloudflare, Domain aktiv, Auto-Verlängerung an. Sonst nichts ändern.

## 6. Google
- [ ] Search Console: Domain lewolux.de bestätigen (TXT-Eintrag in Cloudflare), Sitemap einreichen

## 7. Abschluss
- [ ] Live-Test: Startseite, alle 6 Spiele (Handy + PC), Downloads, Umfrage, Feedback, Admin, Impressum/Datenschutz
- [ ] Kurze Übersicht für Martin: was live ist, Admin-Link, was offen bleibt

Offene Punkte für später: Mandat-WASD-Tasten, Ordnungsgilde-Build, „Bargeld oder Karte?“ als weiteres Spiel.
