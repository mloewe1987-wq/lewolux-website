# Lewolux Community – Anleitung für den Betreiber

Freiwilliges Konto für den Erwachsenen-Bereich von lewolux.de: **Login mit Google, Spielername + Profilbild, Freunde, Chat, Online-Status („spielt gerade …“), Favoriten mit Sortieren, Spielzeit-Statistik („Zuletzt gespielt von“, „Meiste Spielzeit“), Einladungen „Zusammen spielen“, Newsletter-Anmeldung, Datenexport und Konto löschen.**

Der Kinderbereich bleibt komplett ohne Konto: `/kids/`, die Seiten der Kinderspiele (Kritzelheld, Pandi, Schulhofkicker) und `/kinderspiele-kostenlos/` laden den Community-Code gar nicht. Ist der Kids-Modus aktiv, wird er auch auf Impressum/Datenschutz nicht geladen. Kinderspiele werden nie gezählt, nie als Favorit oder Einladung angenommen.

## Was du tun musst

**Nichts Pflichtiges.** Nach dem Push legt Cloudflare das neue Durable Object `Community` automatisch an (Migration `v2` in `wrangler.jsonc`). Es wird **kein Geheimschlüssel** gebraucht: Sitzungen sind zufällige Tokens, gespeichert wird nur ihr Hash.

Bitte einmal prüfen:

1. **Google Cloud Console → APIs & Dienste → Anmeldedaten → OAuth-Client** (`876811824743-…`): Unter „Autorisierte JavaScript-Quellen“ sollten `https://lewolux.de` **und** `https://www.lewolux.de` stehen.
2. **Datenschutzerklärung** (`quelle/parts/datenschutz.html`, Punkt 8 „Freiwilliges Lewolux-Konto“) einmal lesen. Sie beschreibt ehrlich, was gespeichert wird. Sie ersetzt keine Rechtsberatung.
3. Altersgrenze: Texte sagen „ab 16 Jahren“. Technisch wird das Alter nicht geprüft.

## Optional: Secret `ADMIN_TOKEN` (Newsletter-Liste, Meldungen, Moderation)

Ohne dieses Secret sind alle Admin-Funktionen abgeschaltet (Antwort 404 „disabled“).

Anlegen (langes, zufälliges Passwort, z. B. 40 Zeichen):

```bash
npx wrangler secret put ADMIN_TOKEN
```

oder im Cloudflare-Dashboard: **Workers & Pages → lewolux → Einstellungen → Variablen und Geheimnisse → Hinzufügen → Typ „Secret“, Name `ADMIN_TOKEN`**.

Dann (Token nie in Links oder Chats teilen):

```bash
# Newsletter-Liste als CSV (E-Mail, Spielername, Zeitpunkt der Einwilligung, Textversion, Status)
curl -H "Authorization: Bearer DEIN_TOKEN" "https://lewolux.de/api/c/admin/newsletter?format=csv" -o newsletter.csv

# dasselbe als JSON
curl -H "Authorization: Bearer DEIN_TOKEN" https://lewolux.de/api/c/admin/newsletter

# gemeldete Nachrichten/Spieler (die letzten 200)
curl -H "Authorization: Bearer DEIN_TOKEN" https://lewolux.de/api/c/admin/reports

# Moderation: Konto eines Spielers löschen (alles wird entfernt, wie bei "Konto löschen")
curl -X POST -H "Authorization: Bearer DEIN_TOKEN" -d '{"nick":"Spielername"}' https://lewolux.de/api/c/admin/delete-user
```

## Newsletter: was später noch fehlt

Gespeichert wird bisher nur die Anmeldung: E-Mail (von Google bestätigt), Zeitpunkt, Textversion (`nl-2026-10-v1`), Status **„Bestätigung ausstehend“**. Es wird noch keine E-Mail verschickt. Vor dem ersten Newsletter:

1. E-Mail-Dienst wählen (z. B. Brevo, Mailjet oder Resend; am besten mit Servern in der EU) und einen Auftragsverarbeitungsvertrag abschließen.
2. API-Schlüssel als Secret hinterlegen, z. B. `npx wrangler secret put MAIL_API_KEY` (nie in `wrangler.jsonc`).
3. Double-Opt-in ergänzen: Bestätigungs-Mail mit Link schicken, beim Klick `nl_state` auf `confirmed` setzen. Nur bestätigte Adressen anschreiben.
4. Den Dienst in der Datenschutzerklärung (Punkt 8, Absatz „Newsletter“) nennen.

## Technik in Kürze

| Teil | Datei |
|---|---|
| Server (Durable Object `Community`, SQLite, WebSockets mit Hibernation) | `community.js` |
| Weiterleitung `/api/c/*` an das Durable Object, Spieleliste | `worker.js` |
| Bindings, Migration `v2`, `GOOGLE_CLIENT_ID` | `wrangler.jsonc` |
| Oberfläche (lädt verzögert, holt ihr CSS selbst) | `quelle/parts/community.js`, `quelle/parts/community.css` |
| Kleine Ereignisse „Spiel offen/läuft“ | `quelle/parts/app.js` (`lxEv`) |
| Einbindung nur außerhalb des Kinderbereichs, `assets/community-games.json` | `quelle/build.py` (`cx_js`, `tail(c, cx=…)`) |
| Datenschutz Punkt 8, FAQ „Lewolux-Konto“ | `quelle/parts/datenschutz.html`, `quelle/data.py` |
| Integrationstest | `test/community-test.mjs` |

- **Sicherheit:** Cookie `lxs` (HttpOnly, Secure, SameSite=Lax, nur Pfad `/api/c`), jede Änderung braucht POST + Header `X-Lwx: 1` + passenden Origin; WebSocket prüft Cookie und Origin. Ratenbegrenzung pro Nutzer und pro IP (IP nur im Arbeitsspeicher). Größenlimits, Namensfilter (u. a. „admin“, „lewolux“, „moderator“, Schimpfwörter), Wortfilter im Chat, Melden und Blockieren. Die Oberfläche setzt Nutzertexte nur als Text ein (kein `innerHTML`).
- **Spielzeit:** Der Browser meldet sich alle 30 s, solange ein Spiel offen und sichtbar ist. Der Server schreibt höchstens die echte Zeit seit dem letzten Signal gut (max. 30 s pro Signal, max. 16 Std. pro Tag).
- **Aufräumen (stündlich):** abgelaufene Sitzungen, alte Benachrichtigungen, Meldungen nach 12 Monaten, Konten nach 24 Monaten ohne Nutzung. Chat: pro Unterhaltung höchstens 200 Nachrichten.
- Neue Spiele machen automatisch mit (Liste kommt aus `build.py`). Kinderspiele (`KIDS` in `data.py`) sind automatisch ausgeschlossen.

## Lokal testen

```bash
npx wrangler dev --local --var DEV_FAKE_LOGIN:1 --var ADMIN_TOKEN:testadmin123 --persist-to /tmp/lx-test
# zweites Terminal (Node 22, Paket "ws" nötig, z. B. aus dem node_modules von wrangler):
BASE=http://127.0.0.1:8787 WS_MODULE=/pfad/zu/node_modules/ws node test/community-test.mjs
```

`DEV_FAKE_LOGIN=1` erlaubt Test-Logins ohne Google (im Anmelde-Fenster erscheint dann „Test-Login (nur lokal)“). **Niemals in `wrangler.jsonc` oder im Dashboard setzen.**

## Bekannte Grenzen

- Alles läuft in **einem** Durable Object („global“). Für eine kleine Seite genug (einige tausend gleichzeitige Verbindungen); wird es viel größer, müsste man aufteilen.
- „Zusammen spielen“ ist eine Einladung zum gleichzeitigen Starten, noch kein echter Mehrspieler-Modus.
- Chat ist nicht Ende-zu-Ende-verschlüsselt (steht so im Datenschutz).
- Ring Legends hat weiterhin seine eigene Google-Anmeldung; beide Konten sind getrennt.
