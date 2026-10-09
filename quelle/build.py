import re
#!/usr/bin/env python3
"""Baut die Lewolux-Studio-Website.

   python3 build.py   ->  dist/          Hosting-Paket (alles in den Webspace hochladen)
                          preview.html   Einzeldatei-Vorschau

   Anpassen: SITE, EMAIL, LINKS hier oben; Texte in data.py."""
import base64, html, json, os, shutil, datetime, asyncio, io
from PIL import Image
from data import GAMES, SOFTWARE, FAQ, ICONS, PLAY, DL, SEO, TEASERS
from data import NEWS, KIDS, KIDS_PHRASES
from manuals import MANUALS, SOFTWARE_PAGES

SITE = "https://lewolux.de/"      # <- eigene Domain eintragen (mit / am Ende)
API = os.environ.get("LWX_API", "https://api.lewolux.de/")         # Umfrage & Feedback (Cloudflare Worker, siehe feedback-worker/ANLEITUNG.md)
EMAIL = "hallo@lewolux.de"
# DeskBoard-Download: entweder Datei nach software-dateien/deskboard/DeskBoard-Setup.exe legen (max. 25 MB)
# oder hier den Link eintragen, z. B. GitHub Releases: "https://github.com/NAME/deskboard/releases/latest/download/DeskBoard-Setup.exe"
DESKBOARD_URL = ""            # <- eigene Adresse eintragen
# Social-Media-Adressen: leer = Symbol wird nicht angezeigt
LINKS = dict(INSTAGRAM="", FACEBOOK="", TIKTOK="", YOUTUBE="", DISCORD="", ITCH="")
LINKS_RL = dict(INSTAGRAM="", FACEBOOK="", TIKTOK="")
HERE = os.path.dirname(os.path.abspath(__file__))
# Echte Spiele: Web-Export jedes Spiels in  spiele-dateien/<id>/  ablegen (mit index.html darin).
# Echte Screenshots (optional):            screenshots-echt/<id>-1.png (bzw. .jpg), -2, -3 ersetzen die gezeichneten.
P = lambda *a: os.path.join(HERE, *a)
e = html.escape
part = lambda n: open(P("parts", n), encoding="utf-8").read()
FONTS = [("Orbitron","orbitron",[600,800,900]),("Plus Jakarta Sans","plus-jakarta-sans",[400,500,600,700,800]),("JetBrains Mono","jetbrains-mono",[500,700])]
GFONTS = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Orbitron:wght@600;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap">'
SHOTS = [(g["scene"], v, f'{g["id"]}-{v+1}') for g in GAMES for v in range(3)] + [(s["scene"], 0, f'software-{s["id"]}') for s in SOFTWARE]
GAME_BY_ID = {g["id"]: g for g in GAMES}
import hashlib as _h
VER=_h.md5("".join(open(os.path.join(os.path.dirname(os.path.abspath(__file__)),"parts",f),encoding="utf-8").read() for f in ("style.css","app.js","install.js","kids.css","kids.js")).encode()).hexdigest()[:8]
KIDS_IDS = {k["id"] for k in KIDS}
# Kids-Modus-Sperre: steht ganz oben im <head> jeder Seite außerhalb von /kids/ (und in jedem Nicht-Kinder-Spiel unter /games/).
# Ist der Kids-Modus aktiv (localStorage lxKids=1), wird sofort und ohne Aufblitzen nach /kids/ umgeleitet.
# Impressum und Datenschutz bleiben erreichbar (Pflichtangaben); jeder Klick von dort führt wieder in den Kinderbereich.
KIDS_GUARD = "<script>try{if(localStorage.getItem('lxKids')==='1'&&!/^\\/(kids|impressum|datenschutz)\\//.test(location.pathname)){document.documentElement.style.display='none';location.replace('/kids/')}}catch(e){}</script>"
def app_js(): return part("install.js") + "\n" + part("app.js")
SW_JS = """// Lewolux Studio – Service Worker: macht die Seite installierbar und offline nutzbar.
// Seiten: erst Netz, sonst Zwischenspeicher. Bilder/Schriften/CSS: Zwischenspeicher zuerst. Spiele und Downloads werden nicht gespeichert.
const C = "lx-__VER__";
self.addEventListener("install", e => { e.waitUntil(caches.open(C).then(c => c.addAll(["/", "/site.webmanifest", "/assets/img/icon-192.png", "/kids/", "/kids/kids.webmanifest"])).catch(() => {})); self.skipWaiting(); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== "GET" || u.origin !== location.origin || /^\\/(downloads|games|api|admin)\\//.test(u.pathname)) return;
  if (u.pathname.startsWith("/assets/")) { e.respondWith(caches.match(r).then(m => m || fetch(r).then(res => { if (res.ok) { const cl = res.clone(); caches.open(C).then(c => c.put(r, cl)); } return res; }))); return; }
  if (r.mode === "navigate") e.respondWith(fetch(r).then(res => { const cl = res.clone(); caches.open(C).then(c => c.put(r, cl)); return res; }).catch(() => caches.match(r).then(m => m || caches.match(u.pathname.startsWith("/kids/") ? "/kids/" : "/"))));
});
"""

def standalone(g):
    """Spiel als eine einzige HTML-Datei (lokale Bibliotheken/Schriften eingebettet), damit der Download offline läuft."""
    d = P("spiele-dateien", g["id"]); s = open(os.path.join(d, "index.html"), encoding="utf-8").read()
    def inline_js(m):
        f = os.path.join(d, m.group(1))
        return "<script>" + open(f, encoding="utf-8").read().replace("</script", "<\\/script") + "</script>" if os.path.isfile(f) else m.group(0)
    s = re.sub(r'<script src="((?!https?:)[^"]+)"></script>', inline_js, s)
    def inline_css(m):
        f = os.path.join(d, m.group(1))
        if not os.path.isfile(f): return m.group(0)
        css = open(f, encoding="utf-8").read(); base = os.path.dirname(f)
        css = re.sub(r'url\(([^)]+\.woff2)\)', lambda u: "url(data:font/woff2;base64," + base64.b64encode(open(os.path.join(base, u.group(1)), "rb").read()).decode() + ")", css)
        return "<style>" + css + "</style>"
    s = re.sub(r'<link href="((?!https?:)[^"]+\.css)" rel="stylesheet">', inline_css, s)
    return s

def has_game(g): return os.path.isfile(P("spiele-dateien", g["id"], "index.html"))
def rnum(r): a, b_ = r.split("/"); return f"{float(a)/float(b_):.4f}"
def real_shot(name):
    for ext in ("png", "jpg", "jpeg", "webp"):
        f = P("screenshots-echt", f"{name}.{ext}")
        if os.path.isfile(f): return f
    return None

# ---------------------------------------------------------------- screenshots
def font_face(prefix):
    out = []
    for fam, slug, ws in FONTS:
        for w in ws:
            out.append(f"@font-face{{font-family:'{fam}';font-style:normal;font-weight:{w};font-display:swap;src:url({prefix}{slug}-latin-{w}-normal.woff2) format('woff2')}}")
    return "\n".join(out)

async def render_shots(out_dir):
    from playwright.async_api import async_playwright
    src = P("fontsrc/node_modules/@fontsource")
    ff = []
    for fam, slug, ws in FONTS:
        for w in ws: ff.append(f"@font-face{{font-family:'{fam}';font-weight:{w};src:url(file://{src}/{slug}/files/{slug}-latin-{w}-normal.woff2)}}")
    page_html = f"""<!doctype html><html><head><meta charset=utf-8><style>{''.join(ff)}</style></head><body>
<script id="game-data" type="application/json">{{"games":[]}}</script><script>window.LGS_RENDER_ONLY=true</script><script>{part('app.js')}</script></body></html>"""
    tmp = P("render.html"); open(tmp, "w", encoding="utf-8").write(page_html)
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page()
        await pg.goto("file://" + tmp)
        await pg.evaluate("Promise.all([...document.fonts].map(f=>f.load())).catch(()=>{})")
        await pg.evaluate("document.fonts.ready")
        for scene, v, name in SHOTS:
            url = await pg.evaluate("""([s,v])=>{const c=document.createElement('canvas');c.dataset.scene=s;c.dataset.v=v;c.dataset.w=1280;c.dataset.h=720;LGS.draw(c,4000);return c.toDataURL('image/png')}""", [scene, v])
            im = Image.open(io.BytesIO(base64.b64decode(url.split(",")[1]))).convert("RGB")
            rs = real_shot(name)
            if rs:  # echter Screenshot: auf 16:9 zuschneiden
                im = Image.open(rs).convert("RGB"); w, h = im.size; th = int(w * 9 / 16)
                if th <= h: im = im.crop((0, (h - th) // 2, w, (h - th) // 2 + th))
                else: tw = int(h * 16 / 9); im = im.crop(((w - tw) // 2, 0, (w - tw) // 2 + tw, h))
                im = im.resize((1280, 720), Image.LANCZOS)
            im.save(os.path.join(out_dir, name + ".jpg"), quality=84, optimize=True, progressive=True)
            im.save(os.path.join(out_dir, name + ".webp"), quality=80, method=6)
            sm = im.resize((640, 360), Image.LANCZOS)
            sm.save(os.path.join(out_dir, name + "-640.jpg"), quality=82, optimize=True, progressive=True)
            sm.save(os.path.join(out_dir, name + "-640.webp"), quality=78, method=6)
        await b.close()
    os.remove(tmp)

def og_image(src, dst):
    im = Image.open(src); w, h = im.size; nh = int(w * 630 / 1200)
    im.crop((0, (h - nh) // 2, w, (h - nh) // 2 + nh)).resize((1200, 630), Image.LANCZOS).save(dst, quality=85, optimize=True)

# ---------------------------------------------------------------- context
class Ctx:
    """preview=True -> alles eingebettet (data:-URIs), Links auf Spielseiten werden zu Modal-Ankern"""
    def __init__(self, root, preview=False):
        self.root, self.preview, self._cache = root, preview, {}
    def shot(self, name, small=False, fmt="webp"):
        if self.preview:
            key = (name, fmt)
            if key not in self._cache:
                data = open(P("dist/assets/screenshots", f"{name}-640.{fmt}"), "rb").read()
                self._cache[key] = f"data:image/{fmt};base64," + base64.b64encode(data).decode()
            return self._cache[key]
        return f"{self.root}assets/screenshots/{name}{'-640' if small else ''}.{fmt}"
    def img(self, file):
        if self.preview:
            ext = file.rsplit(".", 1)[1]; mime = "jpeg" if ext == "jpg" else ext
            return f"data:image/{mime};base64," + base64.b64encode(open(P("dist/assets/img", file), "rb").read()).decode()
        return f"{self.root}assets/img/{file}"
    def page(self, g): return f"#spiel-{g['id']}" if self.preview else f"{self.root}spiele/{g['id']}/"
    def dl(self, g): return f"{self.root}{g['download']['file']}" if has_game(g) and not g.get("online") else None

G_TIP = '''<div class="dl-tip slim"><div><p class="rec-k">★ Empfohlen: der Download</p><ul class="tip-list"><li><b>Startet sofort</b>, ohne Ladezeit</li><li><b>Läuft offline</b>, überall, auch ohne Internet</li><li><b>Eine Datei</b>: nichts installieren, kein Account, keine Werbung</li><li><b>Deine Version gehört dir</b>, dein Spielstand bleibt auf deinem Gerät</li></ul><p class="tip-how">Am PC per Doppelklick öffnen, auf Android über „Downloads“ mit Chrome. Auf dem iPhone spielst du am besten direkt im Browser.</p></div></div>'''

def dl_btn(c, g, label, aria=False):
    if g.get("online"): return f'<a class="btn btn-dl" href="{c.root}ring-legends/tester/">{DL}Android-Tester werden</a>'
    if not c.dl(g): return f'<span class="btn btn-dl is-off" aria-disabled="true">{DL}Download bald</span>'
    fn = g["download"]["file"].split("/")[-1]; a = f' aria-label="{e(g["short"])} kostenlos herunterladen"' if aria else ""
    return f'<a class="btn btn-dl rec" href="{c.dl(g)}" download="{fn}"{a}>{DL}{label}<span class="rec-b">Empfohlen</span></a>'

def pic(c, name, alt, sizes="(max-width:680px) 100vw, 640px", lazy=True, cls=""):
    la = 'loading="lazy" ' if lazy else 'fetchpriority="high" '
    if c.preview:
        return f'<img{cls} src="{c.shot(name)}" alt="{e(alt)}" width="1280" height="720" {la}decoding="async">'
    return (f'<picture><source type="image/webp" srcset="{c.shot(name,True)} 640w, {c.shot(name)} 1280w" sizes="{sizes}">'
            f'<img{cls} src="{c.shot(name,False,"jpg")}" srcset="{c.shot(name,True,"jpg")} 640w, {c.shot(name,False,"jpg")} 1280w" sizes="{sizes}" alt="{e(alt)}" width="1280" height="720" {la}decoding="async"></picture>')

# ---------------------------------------------------------------- blocks
def is_real(g): return bool(real_shot(g["id"] + "-1"))
def scene_attr(g): return "" if is_real(g) else f' data-scene="{g["scene"]}"'

def card(c, g, i):
    plats = "".join(f'<li>{ICONS[p][0]}{ICONS[p][1]}</li>' for p in g["plats"])
    genres = "".join(f'<span class="genre">{e(x)}</span>' for x in g["genres"])
    tech = "".join(f'<li>{e(t)}</li>' for t in g["tech"])
    return f'''        <article class="card{' wide' if g.get('wide') else ''}" id="spiel-{g['id']}" data-cats="{g['cats']}" style="--accent:{g['accent']};--glow:{g['accent']}99">
          <div class="media" data-open="{g['id']}" data-mode="shots"{scene_attr(g)} data-v="0">{pic(c, g['id']+'-1', 'Screenshot aus '+g['short']+': '+g['shots'][0], '(max-width:680px) 100vw, (max-width:1100px) 50vw, 640px', lazy=i>1)}<span class="pill status">{e(g['status'])}</span><span class="pill free">Free</span><span class="preview-hint">Screenshots ansehen</span></div>
          <div class="body">
            <div class="genres">{genres}</div>
            <h3><a href="{c.page(g)}">{e(g['title'])}</a></h3>
            <p class="tagline">{e(g['tagline'])}</p>
            <p class="desc">{e(g['desc'])}</p>
            <ul class="plats" aria-label="Plattformen">{plats}</ul>
            <ul class="techs" aria-label="Technik">{tech}</ul>
            <div class="actions">
              <button class="btn btn-play" data-open="{g['id']}" data-mode="demo">{PLAY}Jetzt spielen</button>
              {dl_btn(c, g, "Download", True)}
              <a class="more-link" href="{c.page(g)}">Handbuch &amp; Details →</a>
            </div>
          </div>
        </article>'''

def reel(c, g):
    k, cap, sub = g["reel"]; v = 1 if g["id"] in ("mandat", "sternenwurf", "wrestling-tcg") else 0
    return f'''        <figure class="shot"><div class="shot-media" data-open="{g['id']}" data-mode="shots"{scene_attr(g)} data-v="{v}" style="cursor:pointer">{pic(c, f"{g['id']}-{v+1}", 'Screenshot aus '+g['short']+': '+g['shots'][v], '(max-width:680px) 88vw, 760px')}</div><figcaption><span class="kicker">{e(k)} · {e(g['short'])}</span><span class="cap">{e(cap)}</span><span class="sub">{e(sub)}</span></figcaption></figure>'''

def sw_actions(c, s):
    more = f'<a class="btn btn-play" href="{"#sw-" + s["id"] if c.preview else c.root + "software/" + s["id"] + "/"}">Mehr erfahren</a>'
    if s["id"] == "pdf":
        return more + f'<a class="btn btn-dl rec" href="{c.root}pdf/" target="_blank" rel="noopener">Jetzt öffnen<span class="rec-b">Gratis</span></a>'
    if s["id"] == "deskboard":
        dl = deskboard_dl(c)
        return more + (f'<a class="btn btn-dl rec" href="{dl}">{DL}Kostenlos laden<span class="rec-b">Gratis</span></a>' if dl else f'<span class="btn btn-dl is-off" aria-disabled="true">{DL}Download bald</span>')
    return more + f'<a class="btn btn-dl" href="{"#mitmachen" if c.preview else c.root + "#mitmachen"}">Feedback geben</a>'

def sw(c, s):
    feats = "".join(f"<li>{e(f)}</li>" for f in s["feats"]); tech = "".join(f'<li>{e(t)}</li>' for t in s["tech"])
    return f'''        <article class="sw" id="sw-{s['id']}">
          <div class="media">{pic(c, 'software-'+s['id'], 'Oberfläche von '+s['title'], '(max-width:1000px) 100vw, 420px')}</div>
          <div class="body"><span class="sw-cat">{e(s['cat'])}</span><h3>{e(s['title'])}</h3><p class="desc">{e(s['desc'])}</p><ul class="feat">{feats}</ul><ul class="techs">{tech}</ul>
            <div class="actions">{sw_actions(c, s)}</div></div>
        </article>'''

def game_data(c):
    return json.dumps({"games": [dict({k: g[k] for k in ("id","scene","demo","title","short","tagline","genres","story","controls","features","shots","accent")},
        download=dict(format=g["download"]["format"], href=c.dl(g)), page=c.page(g),
        play=(None if c.preview or not has_game(g) else f"{c.root}games/{g['id']}/index.html"), ratio=g["ratio"].replace("/", " / "), real=is_real(g), orient=g.get("orient","auto"), rnum=rnum(g["ratio"]),
        shotImgs=[c.shot(f"{g['id']}-{i+1}", True) for i in range(3)]) for g in GAMES]}, ensure_ascii=False).replace("</", "<\\/")

def ld(obj): return '<script type="application/ld+json">' + json.dumps(obj, ensure_ascii=False).replace("</", "<\\/") + "</script>"

ORG = {"@type": "Organization", "@id": SITE + "#studio", "name": "Lewolux Studio", "url": SITE,
       "logo": SITE + "assets/img/lewolux-studio-logo.jpg", "image": SITE + "assets/img/lewolux-studio-banner.jpg",
       "slogan": "Shaping the Future of Play", "email": EMAIL, "areaServed": "DE",
       "sameAs": [u for u in LINKS.values() if u.startswith("http")]}

def head(c, title, desc, path, og, jsonld, robots="index, follow, max-image-preview:large", preload=""):
    url = SITE + path
    css = f'<style>{part("style.css")}</style>' if c.preview else f'<link rel="stylesheet" href="{c.root}assets/css/site.css?v={VER}">'
    fonts = GFONTS if c.preview else f'<link rel="preload" href="{c.root}assets/fonts/orbitron-latin-900-normal.woff2" as="font" type="font/woff2" crossorigin><link rel="preload" href="{c.root}assets/fonts/plus-jakarta-sans-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>'
    return f'''<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
{"" if c.preview else KIDS_GUARD}
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{e(title)}</title>
<meta name="description" content="{e(desc)}">
<meta name="robots" content="{robots}">
<meta name="author" content="Lewolux Studio">
<meta name="theme-color" content="#0a0b10">
<link rel="canonical" href="{url}">
<link rel="alternate" hreflang="de" href="{url}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Lewolux Studio">
<meta property="og:locale" content="de_DE">
<meta property="og:title" content="{e(title)}">
<meta property="og:description" content="{e(desc)}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{SITE}{og}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{e(title)}">
<meta name="twitter:description" content="{e(desc)}">
<meta name="twitter:image" content="{SITE}{og}">
<link rel="icon" href="{c.root}favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="48x48" href="{c.root}favicon-48.png">
<link rel="icon" type="image/png" sizes="96x96" href="{c.root}favicon-96.png">
<link rel="icon" type="image/png" sizes="144x144" href="{c.root}favicon-144.png">
<link rel="icon" type="image/png" sizes="192x192" href="{c.img('icon-192.png') if not c.preview else c.img('icon-192.png')}">
<link rel="apple-touch-icon" href="{c.root}apple-touch-icon.png">
<link rel="manifest" href="{c.root}site.webmanifest">
{fonts}
{preload}
{css}
{''.join(ld(j) for j in jsonld)}
</head>
<body>
<div class="mesh" aria-hidden="true"></div>
<canvas id="ambient" aria-hidden="true"></canvas>
'''

def news_items(c):
    li = lambda hidden: "".join(f'<li{" aria-hidden=\"true\"" if hidden else ""}><a href="{c.root}{u}"{" tabindex=\"-1\"" if hidden else ""}><b>{e(k)}</b>{e(t)}</a></li>' for k, t, u in NEWS)
    return li(False) + li(True)   # zweimal für eine nahtlose Endlosschleife

IG_SVG = '<a href="{{INSTAGRAM}}" aria-label="Instagram" rel="noopener" target="_blank"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg></a>'
FB_SVG = '<a href="{{FACEBOOK}}" aria-label="Facebook" rel="noopener" target="_blank"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 8h3V4h-3c-2.8 0-4.5 1.8-4.5 4.6V11H7v4h2.5v8h4v-8h3l.5-4h-3.5V8.8c0-.5.3-.8.5-.8z"/></svg></a>'
def social_icons():
    icons = json.load(open(P("parts/social-icons.json"), encoding="utf-8")); icons["INSTAGRAM"] = IG_SVG; icons["FACEBOOK"] = FB_SVG
    out = "".join(icons[k].replace("{{%s}}" % k, v).replace('rel="noopener">', 'rel="noopener" target="_blank">') for k, v in LINKS.items() if v and k in icons)
    return f'<div class="socials">{out}</div>' if out else ""

def links_page(c):
    """Link-Seite für Instagram/Facebook/TikTok-Profile (lewolux.de/links)."""
    rl = GAME_BY_ID["wrestling-tcg"]
    items = [("🥊", "Ring Legends spielen", "Sammelkarten online – kostenlos im Browser", f"{c.root}games/wrestling-tcg/index.html", True),
             ("🎬", "Großes Update: Trailer & Neuerungen", "Markt, Ring-Duelle, Tausch, Wochen-Events", f"{c.root}spiele/wrestling-tcg/#update", False),
             ("🎮", "Alle Spiele von Lewolux", "7 kostenlose Spiele, direkt im Browser", f"{c.root}#spiele", False),
             ("📱", "Android-Tester werden", "Spiel die App vor allen anderen – Plätze frei", f"{c.root}ring-legends/tester/", True),
             ("💡", "Wünsch dir was", "Ideen, Fehler, Lob – direkt ans Studio", f"{c.root}#mitmachen", False)]
    li = "".join(f'<a class="lk{" hot" if hot else ""}" href="{u}"><span class="lk-i">{i}</span><span class="lk-t"><b>{e(t)}</b><small>{e(s)}</small></span><span class="lk-a">›</span></a>' for i, t, s, u, hot in items)
    soc = social_icons()
    body = f'''<main class="links-page"><img class="lk-logo" src="{c.root}assets/img/lewolux-studio-logo.jpg" alt="Lewolux Studio" width="112" height="112">
<h1>Lewolux Studio</h1><p class="lk-sub">Kostenlose Indie-Games aus Schleswig-Holstein 🦁</p>
<div class="lk-list">{li}</div>{soc}<p class="lk-foot"><a href="{c.root}">lewolux.de</a> · <a href="{c.root}impressum/">Impressum</a> · <a href="{c.root}datenschutz/">Datenschutz</a></p></main>'''
    h = head(c, "Lewolux Studio – Links", "Alle Links von Lewolux Studio: Ring Legends spielen, Trailer, alle kostenlosen Spiele.", "links/", "assets/img/og-lewolux-studio.jpg", [], robots="noindex, follow")
    return common(c, h + body + "\n" + tail(c))

TESTER_MAIL = "mailto:hallo@lewolux.de?subject=" + "Ring%20Legends%20Tester" + "&body=" + "Hallo%20Lewolux%2C%0A%0Aich%20m%C3%B6chte%20Ring%20Legends%20vorab%20auf%20Android%20testen.%0A%0AMeine%20Gmail-Adresse%20f%C3%BCr%20den%20Play%20Store%3A%20%0A%0AViele%20Gr%C3%BC%C3%9Fe"
def tester_page(c):
    steps = [("✉️", "Melde dich", "Schick uns kurz deine Gmail-Adresse – das ist die Adresse, mit der du im Play Store angemeldet bist."),
             ("🔗", "Link bekommen", "Sobald der Test startet, bekommst du von uns einen Einladungslink. Antippen, „Tester werden“, fertig."),
             ("📲", "App installieren", "Ring Legends ganz normal aus dem Play Store installieren – vor allen anderen."),
             ("🗓️", "14 Tage dabei bleiben", "Google verlangt, dass Tester die App 14 Tage behalten. Am besten jeden Tag kurz rein – das Gratis-Pack wartet sowieso.")]
    li = "".join(f'<li><span class="ts-i" aria-hidden="true">{i}</span><b>{e(t)}</b><span>{e(d)}</span></li>' for i, t, d in steps)
    faq = [("Kostet das etwas?", "Nein. Ring Legends ist kostenlos, auch im Test."),
           ("Was brauche ich?", "Ein Android-Handy und ein Google-Konto (Gmail). Für iPhone gibt es die Browser-Version auf lewolux.de."),
           ("Was passiert mit meiner Adresse?", "Wir tragen sie nur in die Testerliste in der Google Play Console ein und nutzen sie für die Einladung. Danach löschen wir die Mail. Mehr dazu in der Datenschutzerklärung."),
           ("Muss ich Feedback geben?", "Musst du nicht, freut uns aber riesig. Fehler, Ideen und Lob einfach über das Feedback-Formular auf der Spielseite.")]
    faqh = "".join(f"<details><summary>{e(q)}</summary><p>{e(a)}</p></details>" for q, a in faq)
    body = f'''<main class="wrap tester-page">
  <nav aria-label="Breadcrumb"><ol class="crumbs"><li><a href="{c.root}">Start</a></li><li><a href="{c.root}spiele/wrestling-tcg/">Ring Legends</a></li><li aria-current="page">Tester werden</li></ol></nav>
  <section class="ts-hero"><span class="eyebrow">Android-Vorabtest</span><h1>Werde Ring-Legends-Tester</h1>
  <p class="up-lead">Ring Legends kommt in den Play Store – und du kannst es vor allen anderen auf deinem Handy spielen. Für den Start brauchen wir Tester, die 14 Tage dabei sind.</p>
  <div class="g-actions"><a class="btn btn-play" id="testerBtn" href="{TESTER_MAIL}">✉️ Jetzt als Tester melden</a><a class="btn" href="{c.root}games/wrestling-tcg/index.html">Schon mal im Browser spielen</a></div>
  <p class="up-note">Kein Mailprogramm? Schreib einfach an <b>{EMAIL}</b> mit dem Betreff „Ring Legends Tester“ und deiner Gmail-Adresse.</p></section>
  <section aria-labelledby="ts-h"><h2 id="ts-h">So läuft der Test</h2><ol class="ts-steps">{li}</ol></section>
  <section aria-labelledby="tf-h"><h2 id="tf-h">Fragen</h2><div class="faq">{faqh}</div></section>
</main>
'''
    jsonld = [{"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Start", "item": SITE},
        {"@type": "ListItem", "position": 2, "name": "Ring Legends", "item": SITE + "spiele/wrestling-tcg/"}, {"@type": "ListItem", "position": 3, "name": "Tester werden", "item": SITE + "ring-legends/tester/"}]}]
    h = head(c, "Ring Legends Tester werden – Android-Vorabtest | Lewolux", "Spiel Ring Legends vor allen anderen auf Android: Melde dich als Tester für den Play-Store-Test – kostenlos, 14 Tage, nur ein Google-Konto nötig.", "ring-legends/tester/", "assets/og/og-wrestling-tcg.jpg", jsonld)
    return common(c, h + part("header.html") + "\n" + body + part("footer.html") + "\n" + tail(c))

def _thumb(c, g): return c.shot(g["id"] + "-1", True)
def games_rail(c):
    """Spieleliste: am großen Bildschirm links eingeblendet, sonst als Knopf „Spiele“ unten links (Schublade)."""
    items = "".join(f'<li><a href="{c.page(g)}" data-gid="{g["id"]}"><img src="{_thumb(c, g)}" alt="" width="64" height="36" loading="lazy" decoding="async"><span><b>{e(g["short"])}</b><small>{e(" · ".join(g["genres"][:2]))}</small></span></a></li>' for g in GAMES)
    soon = "".join(f'<li class="gr-soon"><a href="{c.root}spiele/{t["id"]}/"><img src="{c.root}assets/teaser/{t["id"]}-1.jpg" alt="" width="64" height="36" loading="lazy" decoding="async"><span><b>{e(t["short"])}</b><small>bald</small></span></a></li>' for t in TEASERS)
    return f'''<aside class="game-rail" id="gameRail" aria-label="Alle Spiele"><div class="gr-head"><span>🎮 Spiele</span><button type="button" class="gr-close" aria-label="Spieleliste schließen">✕</button></div><ul>{items}{soon}</ul><a class="gr-kids" href="{c.root}kids/">🦉 Lewolux Kids</a></aside>
<button type="button" class="gr-toggle" id="gameRailBtn" aria-controls="gameRail" aria-expanded="false"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="3" y="4" width="7" height="7" rx="1.5"/><rect x="14" y="4" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>Spiele</button>'''
def game_marquee(c):
    """Laufband mit allen Spielen (Bild + Name), anklickbar – ersetzt die Technik-Liste."""
    chip = lambda g, h: f'<a class="gm-chip" href="{c.page(g)}" style="--acc:{g["accent"]}"{h}><img src="{_thumb(c, g)}" alt="" width="72" height="40" loading="lazy" decoding="async"><b>{e(g["short"])}</b><small>{e(g["genres"][0])}</small></a>'
    row = "".join(chip(g, "") for g in GAMES) + "".join(chip(g, ' tabindex="-1" aria-hidden="true"') for g in GAMES)
    return f'<div class="game-marquee" aria-label="Alle Spiele"><div class="gm-track">{row}</div></div>'

def common(c, t):
    rep = {"{{ROOT}}": c.root, "{{EMAIL}}": EMAIL, "{{GAMECOUNT}}": str(len(GAMES)),
           "{{FOOTGAMES}}": "".join(f'<li><a href="{c.page(g)}">{e(g["short"])}</a></li>' for g in GAMES) + "".join(f'<li><a href="{c.root}spiele/{t["id"]}/">{e(t["short"])} <small>(bald)</small></a></li>' for t in TEASERS),
           "{{NEWS}}": news_items(c), "{{IMPRESSUM}}": f"{c.root}impressum/", "{{DATENSCHUTZ}}": f"{c.root}datenschutz/"}
    rep["{{SOCIAL}}"] = social_icons()
    rep["{{RAIL}}"] = games_rail(c); rep["{{GAMEMARQUEE}}"] = game_marquee(c)
    for k, v in rep.items(): t = t.replace(k, v)
    if c.preview:
        t = t.replace(f'src="{c.root}assets/img/lewolux-studio-logo.jpg"', f'src="{c.img("lewolux-studio-logo.jpg")}"')
    assert "{{" not in t, t[t.index("{{"):t.index("{{") + 60]
    return t

def tail(c):
    js = f"<script>{app_js()}</script>" if c.preview else f'<script src="{c.root}assets/js/app.js?v={VER}" defer></script>'
    return f'{part("modal.html")}\n<script id="game-data" type="application/json">{game_data(c)}</script>\n<script id="lux-data" type="application/json">{lux_data(c)}</script>\n{js}\n{TRAILER_JS if not c.preview else ""}\n</body>\n</html>\n'

# ---------------------------------------------------------------- community
KIND_OPTS = [("wunsch", "Wunsch"), ("idee", "Idee"), ("bug", "Fehler gefunden"), ("lob", "Lob")]
def feedback_form(c, game=None):
    opts = "".join(f'<option value="{g["id"]}"{" selected" if game == g["id"] else ""}>{e(g["short"])}</option>' for g in GAMES + TEASERS)
    kinds = "".join(f'<label class="kind"><input type="radio" name="kind" value="{k}"{" checked" if i == 0 else ""}><span>{e(t)}</span></label>' for i, (k, t) in enumerate(KIND_OPTS))
    gsel = (f'<input type="hidden" name="game" value="{game}">' if game else
            f'<label class="fld"><span>Worum geht es?</span><select name="game"><option value="allgemein">Allgemein / Website</option>{opts}</select></label>')
    return f'''        <form class="cm-card fb-form" novalidate>
          <p class="cm-k">Feedback</p>
          <h3>{("Deine Meinung zu " + e(next(g["short"] for g in GAMES + TEASERS if g["id"] == game))) if game else "Wünsche, Ideen, Fehler? Her damit!"}</h3>
          <div class="kinds" role="radiogroup" aria-label="Art des Beitrags">{kinds}</div>
          {gsel}
          <label class="fld"><span>Dein Beitrag</span><textarea name="text" rows="4" maxlength="1000" required placeholder="Was wünschst du dir? Was ist dir aufgefallen?"></textarea></label>
          <label class="fld"><span>Name <em>(optional, gern ein Spitzname)</em></span><input name="name" maxlength="40" autocomplete="nickname" placeholder="Anonym"></label>
          <label class="hp" aria-hidden="true">Website<input name="website" tabindex="-1" autocomplete="off"></label>
          <button class="btn btn-primary" type="submit">Absenden</button>
          <p class="cm-note" aria-live="polite"></p>
          <p class="cm-legal">Beiträge erscheinen nach kurzer Prüfung öffentlich auf dieser Seite. Bitte keine persönlichen Daten eintragen. Mehr dazu im <a href="{c.root}datenschutz/">Datenschutz</a>.</p>
        </form>'''

def poll_items(c):
    return "\n".join(f'''            <li><button type="button" class="poll-opt" data-choice="{g['id']}" style="--accent:{g['accent']}"><span class="po-img"><img src="{c.shot(g['id']+'-1', True)}" alt="" loading="lazy" width="96" height="54"></span><span class="po-name">{e(g['short'])}</span><span class="po-bar"><i></i></span><span class="po-pct"></span></button></li>''' for g in GAMES) + "\n" + "\n".join(f'''            <li><button type="button" class="poll-opt" data-choice="{t['id']}" style="--accent:{t['accent']}"><span class="po-img"><img src="{c.root if not c.preview else './'}assets/teaser/{t['id']}-1-640.webp" alt="" loading="lazy" width="96" height="54"></span><span class="po-name">{e(t['short'])} <em class="po-tag">ab {t['age']} · bald</em></span><span class="po-bar"><i></i></span><span class="po-pct"></span></button></li>''' for t in TEASERS)

def game_feedback(c, g):
    return f'''  <section class="community" aria-labelledby="fb-h" data-api="{API}" style="padding-bottom:0"><div class="sec-head"><div><span class="eyebrow">Community</span><h2 id="fb-h">Wünsche &amp; Feedback zu {e(g['short'])}</h2><p>{e(g['short'])} ist in Entwicklung. Sag uns, was rein soll, was dich stört und was du feierst.</p></div></div>
    <div class="cm-grid">
{feedback_form(c, g['id'])}
      <div class="cm-list" id="cmList" data-game="{g['id']}" aria-live="polite"><p class="cm-empty">Noch keine Beiträge zu {e(g['short'])}. Schreib den ersten!</p></div>
    </div>
  </section>
'''


# ---------------------------------------------------------------- Handbuch & Software
def deskboard_setup():
    d = P("software-dateien", "deskboard")
    exes = sorted(f for f in os.listdir(d) if f.endswith(".exe")) if os.path.isdir(d) else []
    return exes[-1] if exes else None

def deskboard_dl(c):
    exe = deskboard_setup()
    if exe: return f"{c.root}downloads/{exe}"
    return DESKBOARD_URL or None

def deskboard_parts():
    """Setup-Datei in Teile < 25 MB zerlegen (Cloudflare-Grenze); der Worker (worker.js) setzt sie beim Download wieder zusammen."""
    exe = deskboard_setup()
    if not exe: return
    out = P("dist/downloads/teile"); os.makedirs(out, exist_ok=True)
    data = open(P("software-dateien", "deskboard", exe), "rb").read(); n = 24_000_000; parts = []
    for i in range(0, len(data), n):
        name = f"{exe.rsplit('.',1)[0]}.teil{i//n}.bin"; open(os.path.join(out, name), "wb").write(data[i:i+n]); parts.append(name)
    json.dump({exe: {"size": len(data), "parts": parts}}, open(os.path.join(out, "manifest.json"), "w"))

SICO = {k: f'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">{v}</svg>' for k, v in {
 "mic": '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
 "folder": '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
 "users": '<circle cx="9" cy="8" r="3.2"/><path d="M3 20a6 6 0 0 1 12 0M16 4.5a3.2 3.2 0 0 1 0 6.3M21 20a6 6 0 0 0-3.5-5.4"/>',
 "file": '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
 "eye": '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
 "win": '<path d="M3 5.5l7.5-1v7H3zM12.5 4.2L21 3v8.5h-8.5zM3 12.5h7.5v7L3 18.5zM12.5 12.5H21V21l-8.5-1.2z"/>',
 "grid": '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
 "widget": '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 10h18M10 10v11"/>',
 "note": '<path d="M5 3h14v14l-4 4H5z"/><path d="M15 21v-4h4M8 8h8M8 12h5"/>',
 "toggle": '<rect x="2" y="7" width="20" height="10" rx="5"/><circle cx="16" cy="12" r="3"/>',
 "book": '<path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M4 19.5V4.5M8 7h8"/>',
 "print": '<path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="7"/>',
 "brand": '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 0 0 18M3.5 9h17M3.5 15h17"/>',
 "clock": '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
}.items()}
ICO_BULB = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/></svg>'

def manual_section(c, g):
    m = MANUALS.get(g["id"])
    if not m: return ""
    sid = g["id"]
    quick = "".join(f'<li><span class="mn-no">{i+1}</span><p>{e(t)}</p></li>' for i, t in enumerate(m["quick"]))
    core = "".join(f'<div class="mn-tile"><h4>{e(t)}</h4><p>{e(d)}</p></div>' for t, d in m["core"])
    ctl = lambda rows: "".join(f'<li><span>{e(a)}</span><kbd>{e(k)}</kbd></li>' for a, k in rows)
    tips = "".join(f'<li>{ICO_BULB}<p>{e(t)}</p></li>' for t in m["tips"])
    facts = "".join(f'<div class="mn-fact"><b>{e(n)}</b><span>{e(l)}</span></div>' for n, l in m["facts"])
    table = ""
    if m.get("table"):
        cap, head_, rows = m["table"]
        table = f'<div class="mn-table"><p class="mn-cap">{e(cap)}</p><table><thead><tr>{"".join(f"<th>{e(h)}</th>" for h in head_)}</tr></thead><tbody>{"".join("<tr>" + "".join(f"<td>{e(x)}</td>" for x in r) + "</tr>" for r in rows)}</tbody></table></div>'
    tabs = [("start", "Schnellstart"), ("prinzip", "Spielprinzip"), ("steuerung", "Steuerung"), ("tipps", "Profi-Tipps"), ("fakten", "Zahlen & Fakten")]
    tabbar = "".join(f'<button role="tab" id="tab-{sid}-{k}" aria-controls="mn-{sid}-{k}" aria-selected="{"true" if i == 0 else "false"}" tabindex="{0 if i == 0 else -1}">{t}</button>' for i, (k, t) in enumerate(tabs))
    panels = {
      "start": f'<ol class="mn-steps">{quick}</ol>',
      "prinzip": f'<div class="mn-tiles">{core}</div>',
      "steuerung": f'<div class="mn-ctl"><div><p class="mn-cap">PC</p><ul class="keys">{ctl(m["pc"])}</ul></div><div><p class="mn-cap">Handy &amp; Tablet</p><ul class="keys">{ctl(m["mobile"])}</ul></div></div><p class="mn-save"><b>Speichern:</b> {e(m["save"])}</p>',
      "tipps": f'<ul class="mn-tips">{tips}</ul>',
      "fakten": f'<div class="mn-facts">{facts}</div>{table}',
    }
    pan = "".join(f'<div class="mn-panel" role="tabpanel" id="mn-{sid}-{k}" aria-labelledby="tab-{sid}-{k}"{"" if i == 0 else " data-off"}><h3 class="mn-ph">{t}</h3>{panels[k]}</div>' for i, (k, t) in enumerate(tabs))
    return f'''  <section id="handbuch" class="manual" aria-labelledby="mn-h" style="--accent:{g['accent']}">
    <div class="sec-head"><div><span class="eyebrow">Handbuch</span><h2 id="mn-h">So spielst du {e(g['short'])}</h2><p>{e(m['intro'])}</p></div></div>
    <div class="mn-box"><div class="mn-tabs" role="tablist" aria-label="Kapitel">{tabbar}</div>{pan}</div>
  </section>
'''

def software_page(c, sw_):
    sp = SOFTWARE_PAGES[sw_["id"]]; sid = sw_["id"]; url = f"software/{sid}/"
    dl = deskboard_dl(c) if sid == "deskboard" else None
    if sp["cta"] == "download":
        cta = (f'<a class="btn btn-primary btn-lg" href="{dl}"{" download" if dl.startswith(c.root) else ""}>{DL}Kostenlos herunterladen</a><span class="sw-note">Für Windows 10 und 11 · kostenlos, ohne Werbung</span>' if dl
               else f'<span class="btn btn-primary btn-lg is-off" aria-disabled="true">{DL}Download in Kürze</span><span class="sw-note">Kostenlos für Windows · die Setup-Datei folgt in Kürze</span>')
    elif sp["cta"] == "app":
        cta = f'<a class="btn btn-primary btn-lg" href="{c.root}pdf/">Lewolux PDF öffnen</a><span class="sw-note">Kostenlos für Android, iPhone und Windows · dort „App installieren“ wählen</span>'
    else:
        cta = f'<a class="btn btn-primary btn-lg" href="{c.root}#mitmachen">Feedback geben</a><span class="sw-note">Privates Hobbyprojekt · nicht käuflich</span>'
    why = "".join(f'<div class="sp-why"><h3>{e(t)}</h3><p>{e(d)}</p></div>' for t, d in sp["why"])
    steps = "".join(f'<li><span class="mn-no">{i+1}</span><h3>{e(t)}</h3><p>{e(d)}</p></li>' for i, (t, d) in enumerate(sp["steps"]))
    feats = "".join(f'<details class="sp-feat"><summary><span class="sp-ico">{SICO[ic]}</span><span class="sp-ft"><b>{e(t)}</b><span>{e(st)}</span></span><span class="sp-plus" aria-hidden="true"></span></summary><p>{e(d)}</p></details>' for ic, t, st, d in sp["feats"])
    gal = ""
    if sp.get("gallery"):
        figs = "".join(f'<figure class="sp-fig"><a href="{c.root}assets/software/{sid}/{f.rsplit(".",1)[0]}.webp" target="_blank" rel="noopener"><img src="{c.root}assets/software/{sid}/{f.rsplit(".",1)[0]}.webp" alt="{e(cap)}" loading="lazy" decoding="async"></a><figcaption>{e(cap)}</figcaption></figure>' for f, cap in sp["gallery"])
        gal = f'<section aria-labelledby="ga-h"><div class="sec-head"><div><span class="eyebrow">Einblicke</span><h2 id="ga-h">So sieht {e(sw_["title"])} aus</h2></div></div><div class="sp-gal">{figs}</div></section>'
    road = ""
    if sp.get("roadmap"):
        road = f'''<section aria-labelledby="rm-h"><div class="sec-head"><div><span class="eyebrow">Roadmap</span><h2 id="rm-h">Was als Nächstes kommt</h2><p>DeskBoard wächst mit euren Wünschen. Diese Funktionen sind geplant, alle wieder optional.</p></div></div>
    <ul class="sp-road">{"".join(f"<li>{e(r)}</li>" for r in sp["roadmap"])}</ul></section>'''
    man = "".join(f"<details><summary>{e(q)}</summary><p>{e(a)}</p></details>" for q, a in sp["manual"])
    others = "".join(f'<a class="sp-other" href="{c.root}software/{o["id"]}/"><span class="sw-cat">{e(o["cat"])}</span><b>{e(o["title"])}</b><span>{e(SOFTWARE_PAGES[o["id"]]["claim"])}</span></a>' for o in SOFTWARE if o["id"] != sid)
    app = {"@type": "SoftwareApplication", "name": sw_["title"], "description": sp["meta"], "url": SITE + url, "image": f"{SITE}assets/screenshots/software-{sid}.jpg",
           "applicationCategory": "BusinessApplication" if sid != "deskboard" else "UtilitiesApplication", "operatingSystem": "Windows" if "Windows" in sw_["cat"] else "Web",
           "author": {"@id": SITE + "#studio"}, "inLanguage": "de"}
    if sid == "pdf": app.update({"applicationCategory": "UtilitiesApplication", "operatingSystem": "Android, iOS, Windows, Web", "offers": {"@type": "Offer", "price": "0", "priceCurrency": "EUR"}, "installUrl": SITE + "pdf/"})
    if sid == "deskboard": app["offers"] = {"@type": "Offer", "price": "0", "priceCurrency": "EUR"}
    if dl and sid == "deskboard": app["downloadUrl"] = dl if dl.startswith("http") else SITE + "downloads/" + deskboard_setup()
    jsonld = [{"@context": "https://schema.org", "@graph": [ORG, app,
        {"@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Start", "item": SITE}, {"@type": "ListItem", "position": 2, "name": "Software", "item": SITE + "#software"}, {"@type": "ListItem", "position": 3, "name": sw_["title"], "item": SITE + url}]},
        {"@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in sp["manual"]]}]}]
    h = head(c, f'{sw_["title"]} – {sp["claim"].rstrip(".")} | Lewolux Studio', sp["meta"], url, f"assets/og/og-software-{sid}.jpg", jsonld)
    body = f'''<main class="sp wrap">
  <nav aria-label="Brotkrumen"><ol class="crumbs"><li><a href="{c.root}">Start</a></li><li><a href="{c.root}#software">Software</a></li><li aria-current="page">{e(sw_["title"])}</li></ol></nav>
  <header class="sp-hero">
    <div class="sp-copy"><span class="sw-cat">{e(sw_["cat"])} · {e(sp["status"])}</span><h1>{e(sw_["title"])}</h1><p class="sp-claim">{e(sp["claim"])}</p><p class="sp-sub">{e(sp["sub"])}</p><div class="sp-cta">{cta}</div></div>
    <div class="sp-shot">{pic(c, "software-" + sid, "Oberfläche von " + sw_["title"], "(max-width:900px) 100vw, 640px", lazy=False)}</div>
  </header>
  <div class="sp-whys">{why}</div>
  <section aria-labelledby="st-h"><div class="sec-head"><div><span class="eyebrow">So funktioniert's</span><h2 id="st-h">In {len(sp["steps"])} Schritten zum Ziel</h2></div></div><ol class="sp-steps">{steps}</ol></section>
  <section aria-labelledby="ft-h"><div class="sec-head"><div><span class="eyebrow">Funktionen</span><h2 id="ft-h">Was {e(sw_["title"])} kann</h2><p>Tippe auf eine Funktion für Details.</p></div></div><div class="sp-feats">{feats}</div></section>
  {gal}
  {road}
  <section aria-labelledby="hb-h"><div class="sec-head"><div><span class="eyebrow">Kurz-Handbuch</span><h2 id="hb-h">Gut zu wissen</h2></div></div><div class="faq">{man}</div></section>
  <section class="sp-end"><h2>{e(sp["claim"])}</h2><div class="sp-cta">{cta}</div></section>
  <section aria-labelledby="ot-h"><div class="sec-head"><div><span class="eyebrow">Mehr Software</span><h2 id="ot-h">Auch von Lewolux Studio</h2></div></div><div class="sp-others">{others}</div></section>
</main>
'''
    return common(c, h + part("header.html") + "\n" + body + part("footer.html") + "\n" + tail(c))


# ---------------------------------------------------------------- Vorschau (angekündigte Spiele)
def teaser_img(c, t, n, small=False):
    return f"{c.root}assets/teaser/{t['id']}-{n}{'-640' if small else ''}.webp"

def age_badge(t): return f'<span class="age-badge" title="Empfohlen ab {t["age"]} Jahren"><b>{t["age"]}</b><small>Empfohlen</small></span>'

def teaser_card(c, t):
    genres = "".join(f'<span class="genre">{e(x)}</span>' for x in t["genres"])
    return f'''        <article class="card wide teaser" id="spiel-{t['id']}" data-cats="exp" style="--accent:{t['accent']};--glow:{t['accent']}99">
          <a class="media" href="{c.root}spiele/{t['id']}/" aria-label="Vorschau: {e(t['title'])}"><img src="{teaser_img(c, t, 1, True)}" srcset="{teaser_img(c, t, 1, True)} 640w, {teaser_img(c, t, 1)} 1280w" sizes="(max-width:680px) 100vw, 640px" alt="Titelbild von {e(t['title'])}: rote Sonne über einem Haus in der Wüste" width="1280" height="720" loading="lazy" decoding="async"><span class="pill status">{e(t['status'])}</span>{age_badge(t)}</a>
          <div class="body">
            <div class="genres">{genres}</div>
            <h3><a href="{c.root}spiele/{t['id']}/">{e(t['title'])}</a></h3>
            <p class="tagline">{e(t['tagline'])}</p>
            <p class="desc">{e(t['desc'])}</p>
            <p class="teaser-note">Empfohlen ab {t['age']} · noch nicht spielbar</p>
            <div class="actions"><a class="btn btn-play" href="{c.root}spiele/{t['id']}/">Vorschau ansehen</a><a class="btn btn-dl" href="{c.root}#mitmachen">Dafür abstimmen</a></div>
          </div>
        </article>'''

def teaser_trailer(c, t):
    """Trailer auf der Teaser-Seite: normale Fassung frei, ungeschnittene Fassung (Jumpscare) nur nach Altersabfrage."""
    if t["id"] != "house-in-the-desert" or not os.path.isfile(P("video/house-trailer.mp4")): return ""
    v = f"{c.root}assets/video/"
    return f'''  <section class="tp-trailer" aria-labelledby="tr-h"><h2 id="tr-h">Trailer</h2>
    <video src="{v}house-trailer.mp4?v=2" poster="{v}house-trailer-poster.jpg?v=2" controls playsinline preload="metadata"></video>
    <h3 class="tp-tr18">Uncut-Trailer <small>ab 18 · mit Jumpscare</small></h3>
    <div class="age-gate" data-age="18" data-title="Uncut-Trailer: House in the Desert"><template><video src="{v}house-trailer-18.mp4?v=2" controls playsinline preload="metadata"></video></template></div>
  </section>
'''

def teaser_page(c, t):
    url = f"spiele/{t['id']}/"
    feats = "".join(f"<li>{e(f)}</li>" for f in t["features"]); long = "".join(f"<p>{e(x)}</p>" for x in t["long"])
    jsonld = [{"@context": "https://schema.org", "@graph": [ORG,
        {"@type": "VideoGame", "name": t["title"], "description": t["desc"], "url": SITE + url, "image": SITE + f"assets/teaser/{t['id']}-1.jpg", "genre": t["genres"], "author": {"@id": SITE + "#studio"}, "contentRating": f"Empfohlen ab {t['age']} (ohne offizielle Einstufung)", "inLanguage": "de"},
        {"@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Start", "item": SITE}, {"@type": "ListItem", "position": 2, "name": "Spiele", "item": SITE + "#spiele"}, {"@type": "ListItem", "position": 3, "name": t["title"], "item": SITE + url}]}]}]
    h = head(c, f"{t['title']} – Survival-Horror, erscheint bald | Lewolux Studio", f"{t['title']}: {t['desc']} Empfohlen ab {t['age']}.", url, f"assets/teaser/{t['id']}-og.jpg", jsonld)
    body = f'''<main class="wrap teaser-page" style="--accent:{t['accent']}">
  <nav aria-label="Brotkrumen"><ol class="crumbs"><li><a href="{c.root}">Start</a></li><li><a href="{c.root}#spiele">Spiele</a></li><li aria-current="page">{e(t['title'])}</li></ol></nav>
  <header class="tp-hero">
    <img src="{teaser_img(c, t, 1)}" alt="Titelbild von {e(t['title'])}" width="1280" height="720" fetchpriority="high">
    <div class="tp-over"><span class="eyebrow">{e(t['part'])} · {e(t['status'])}</span><h1>{e(t['title'])}</h1><p class="tp-tag">{e(t['tagline'])}</p><div class="tp-badges">{age_badge(t)}<span class="tp-soon">Noch nicht spielbar</span></div></div>
  </header>
  <div class="tp-notice" role="note"><b>Inhaltshinweis:</b> {e(t['notice'])}</div>
  <div class="g-cols">
    <article class="prose"><h2>Worum geht es?</h2>{long}</article>
    <aside class="g-box"><p class="m-h">Das erwartet dich</p><ul class="feats">{feats}</ul><p class="m-h">Status</p><p style="margin:0;color:var(--muted)">In Entwicklung. Sobald das Spiel fertig ist, erscheint es hier mit Download und „Jetzt spielen“.</p></aside>
  </div>
{teaser_trailer(c, t)}
  <figure class="tp-shot"><img src="{teaser_img(c, t, 2)}" alt="Szene aus {e(t['title'])}: Silhouette eines Hauses vor einer riesigen roten Sonne" width="1280" height="720" loading="lazy"><figcaption>Die Sonne ist hier dein größter Feind.</figcaption></figure>
{game_feedback(c, t)}</main>
'''
    return common(c, h + part("header.html") + "\n" + body + part("footer.html") + "\n" + tail(c))

def teaser_assets():
    out = P("dist/assets/teaser"); os.makedirs(out, exist_ok=True)
    for t in TEASERS:
        d = P("teaser-bilder", t["id"])
        for f in sorted(os.listdir(d)):
            n = f.rsplit(".", 1)[0]; im = Image.open(os.path.join(d, f)).convert("RGB")
            w, h_ = im.size; th = int(w * 9 / 16)
            if th <= h_: im = im.crop((0, (h_ - th) // 2, w, (h_ - th) // 2 + th))
            im = im.resize((1280, 720), Image.LANCZOS)
            im.save(os.path.join(out, f"{t['id']}-{n}.webp"), quality=82, method=6); im.save(os.path.join(out, f"{t['id']}-{n}.jpg"), quality=84, optimize=True)
            sm = im.resize((640, 360), Image.LANCZOS); sm.save(os.path.join(out, f"{t['id']}-{n}-640.webp"), quality=78, method=6)
        og_image(os.path.join(out, f"{t['id']}-1.jpg"), os.path.join(out, f"{t['id']}-og.jpg"))
        os.makedirs(P(f"dist/spiele/{t['id']}"), exist_ok=True)
        open(P(f"dist/spiele/{t['id']}/index.html"), "w", encoding="utf-8").write(teaser_page(Ctx("../../"), t))


# ---------------------------------------------------------------- Chat-Begleiter „Lux“
def lux_data(c):
    R = c.root
    link = lambda u, t: f'<a href="{R}{u}">{e(t)}</a>'
    games = []
    for g in GAMES:
        m = MANUALS.get(g["id"], {})
        keys = {g["short"].lower(), g["title"].lower(), g["id"].replace("-", " ")} | {w for w in g["short"].lower().split() if len(w) > 4}
        if g["id"] == "wrestling-tcg": keys |= {"wrestling", "karten", "tcg", "packs", "sammelkarten"}
        if g["id"] == "kasse-oder-zettel": keys |= {"kasse", "zettel", "kellner", "pizzeria", "restaurant"}
        if g["id"] == "kritzelheld": keys |= {"kinder", "schreiben lernen", "eule", "buchstaben"}
        if g["id"] == "mandat": keys |= {"politik", "wahl", "partei", "bürgermeister"}
        if g["id"] == "sternenwurf": keys |= {"rng", "altar", "pets", "sterne"}
        if g["id"] == "idle-legenden": keys |= {"idle", "goldhafen", "gold"}
        playable = has_game(g)
        games.append(dict(id=g["id"], name=g["short"], keys=sorted(keys), tag=g["tagline"], desc=g["desc"], url=f"spiele/{g['id']}/",
            play=playable, dl=bool(c.dl(g)), pc=[f"{a}: {k}" for a, k in m.get("pc", g["controls"])], mobile=[f"{a}: {k}" for a, k in m.get("mobile", [])],
            tips=m.get("tips", [])[:3], quick=m.get("quick", [])[:2], save=m.get("save", "")))
    for t in TEASERS:
        games.append(dict(id=t["id"], name=t["short"], keys=[t["short"].lower(), "horror", "wüste", "house", "desert", "ab 18"], tag=t["tagline"], desc=t["desc"],
            url=f"spiele/{t['id']}/", play=False, dl=False, teaser=True, age=t["age"], pc=[], mobile=[], tips=[], quick=[], save=""))
    lst = ", ".join(link(f"spiele/{g['id']}/", g["short"]) for g in GAMES if has_game(g))
    intents = [
        (["hallo", "hi", "hey", "moin", "servus", "guten tag", "na du", "huhu", "grüß"], [f"Rawr! 🦁 Ich bin Lux, der Studio-Löwe von Lewolux. Frag mich alles über unsere Spiele, Downloads oder Software!", "Moin! Lux hier. Suchst du ein Spiel, einen Tipp oder einen Download?"]),
        (["wer bist du", "dein name", "was bist du", "bist du ein bot", "bist du echt", "ki"], ["Ich bin Lux, ein kleiner Neon-Löwe und der Helfer dieser Seite. Ich bin kein Mensch und keine große KI, sondern kenne mich einfach richtig gut mit allem hier aus. Und ich verrate nichts weiter, was du mir schreibst bleibt in deinem Browser."]),
        (["kostenlos", "kostet", "preis", "geld", "bezahlen", "gratis", "umsonst", "abo"], ["Alles hier ist kostenlos: alle Spiele, alle Downloads, DeskBoard. Keine Werbung, keine Käufe, kein Abo. Lewolux Studio ist ein privates Hobbyprojekt. 🦁"]),
        (["download", "herunterladen", "runterladen", "offline", "installieren", "datei"], [f"Fast jedes Spiel gibt es als Download: eine einzige HTML-Datei. Herunterladen, öffnen, spielen, auch offline. Den Knopf „Download“ findest du bei jedem Spiel unter {link('#spiele', 'Spiele')}. Ring Legends ist ein Online-Spiel und läuft direkt im Browser, die Android-App folgt."]),
        (["handy", "smartphone", "mobil", "iphone", "android", "tablet", "ipad", "hochkant", "quer"], ["Alle Spiele laufen auch am Handy. „Jetzt spielen“ öffnet sie im Vollbild. Die RPG-Maker-Spiele wollen quer gehalten werden, Ring Legends spielt man hochkant."]),
        (["account", "anmelden", "registrieren", "konto", "login", "einloggen", "google"], ["Kein Account nötig! Einfach auf „Jetzt spielen“ tippen und los geht's. Nur bei Ring Legends kannst du dich freiwillig mit Google anmelden, dann gibt es Markt und Ranglisten, und du spielst auf jedem Gerät weiter."]),
        (["spielstand", "speichern", "gespeichert", "save", "fortschritt verloren", "spielstand weg"], ["Die meisten Spielstände bleiben nur in deinem Browser auf deinem Gerät. Wenn du die Browserdaten löschst, ist auch der Spielstand weg. Ausnahme ist Ring Legends: Da liegt deine Sammlung sicher auf unserem Server."]),
        (["markt", "handeln", "tauschen", "rangliste", "online", "großes update", "update", "pop-report"], [f"Großes Update bei {link('spiele/wrestling-tcg/', 'Ring Legends')}: Das Spiel ist jetzt online! Auf dem Markt handelst du Karten mit anderen Spielern, dazu gibt es Ranglisten und den Pop-Report. Losspielen geht ohne Anmeldung, für Markt und Ranglisten meldest du dich mit Google an."]),
        (["controller", "gamepad", "xbox", "playstation", "joystick"], ["Die RPG-Maker-Spiele (Mandat, Sternenwurf, Idle Legenden, Kasse oder Zettel) lassen sich auch mit Gamepad steuern."]),
        (["welche spiele", "was gibt es", "alle spiele", "spiele liste", "was kann ich spielen", "übersicht"], [f"Spielbar sind: {lst}. Und in Arbeit: {link('spiele/house-in-the-desert/', 'House in the Desert')} (empfohlen ab 18)."]),
        (["empfehl", "was soll ich", "langweilig", "tipp für ein spiel", "überrasch", "zufall", "irgendein spiel"], ["__random__"]),
        (["software", "programm", "programme", "tools", "app"], [f"Neben Spielen entstehen hier auch Programme: {link('software/deskboard/', 'DeskBoard')} (kostenlos für Windows), {link('software/diktakte/', 'Diktakte')} (Diktierprogramm für Kanzleien) und der {link('software/speisekarte/', 'Speisekarten-Konfigurator')}."]),
        (["deskboard", "desktop", "startoberfläche", "widgets", "notizblock"], [f"DeskBoard ist eine kostenlose Startoberfläche für Windows: Kacheln, Widgets, Notizblock zum Abreißen. {link('software/deskboard/', 'Hier gibt es den Download')} (Windows 10/11). Falls Windows warnt: „Weitere Informationen“ → „Trotzdem ausführen“."]),
        (["diktakte", "diktat", "diktier", "anwalt", "kanzlei", "jurist"], [f"Diktakte ist ein Diktierprogramm für Anwälte: Die Spracherkennung läuft lokal, aus „Paragraph 823 Absatz 1 BGB“ wird „§ 823 Abs. 1 BGB“, dazu Akten, Fristen und beA. {link('software/diktakte/', 'Alle Funktionen ansehen')}"]),
        (["speisekarte", "menükarte", "tageskarte", "gastronomie", "allergene"], [f"Der {link('software/speisekarte/', 'Speisekarten-Konfigurator')} gestaltet Speise-, Tages- und Aktionskarten mit Logo, Allergenen und QR-Code."]),
        (["horror", "ab 18", "gruselig", "house in the desert", "wüste", "desert", "neues spiel", "was kommt"], [f"Psst… {link('spiele/house-in-the-desert/', 'House in the Desert')} ist in Arbeit: Survival-Horror, bei dem die Sonne dein größter Feind ist. Empfohlen ab 18 und noch nicht spielbar. Du kannst aber schon dafür abstimmen!"]),
        (["feedback", "wunsch", "idee", "vorschlag", "bug", "fehler", "kaputt", "funktioniert nicht", "geht nicht", "problem"], [f"Ab damit ins {link('#mitmachen', 'Feedback-Formular')}! Wünsche, Ideen und Fehler landen direkt beim Studio. Zu jedem Spiel gibt es auf seiner Seite auch ein eigenes Formular."]),
        (["umfrage", "abstimmen", "stimme", "vote", "voten", "welches spiel als nächstes"], [f"In der {link('#mitmachen', 'Umfrage')} entscheidest du mit, welches Spiel als Nächstes weiterentwickelt wird. Eine Stimme pro Person, änderbar."]),
        (["kontakt", "email", "e-mail", "mail", "schreiben", "erreichen"], [f'Schreib einfach an <a href="mailto:{EMAIL}">{EMAIL}</a>. Oder nutze das {link("#mitmachen", "Feedback-Formular")}.']),
        (["impressum"], [f"Hier entlang: {link('impressum/', 'Impressum')}."]),
        (["datenschutz", "cookies", "tracking", "daten", "dsgvo"], [f"Keine Cookies, kein Tracking, keine Werbung. Details stehen im {link('datenschutz/', 'Datenschutz')}. Und ich, Lux, laufe komplett in deinem Browser. Für das Online-Spiel Ring Legends gibt es eine {link('ring-legends/datenschutz/', 'eigene Datenschutzerklärung')}."]),
        (["wer steckt", "wer macht", "wer hat", "entwickler", "studio", "hinter der seite", "martin"], ["Lewolux Studio ist ein privates Hobbyprojekt aus Schleswig-Holstein. Hier entstehen in der Freizeit Spiele und kleine Programme, alles kostenlos."]),
        (["lewolux", "name bedeutet", "bedeutung", "warum löwe", "warum heißt"], ["„Lew“ heißt Löwe, „Lux“ heißt Licht. Ein leuchtender Löwe also, genau wie ich! 🦁✨"]),
        (["witz", "joke", "lustig", "lach", "erzähl was"], ["Warum spielen Löwen nie Karten in der Savanne? Zu viele Geparden. 🐆", "Was macht ein Löwe am Computer? Er klickt auf die Maus. Und frisst sie dann.", "Mein Lieblingsspiel? Natürlich „Brüllen-Simulator“. Gibt's leider noch nicht. Schreib's ins Feedback!", "Ich habe versucht, in Sternenwurf die Krone des Alls zu finden. Nach 10 Millionen Drehs habe ich aufgegeben und ein Nickerchen gemacht."]),
        (["danke", "dankeschön", "super", "cool", "top", "nice", "geil", "klasse"], ["Gern geschehen! *schnurrt zufrieden* 🦁", "Immer wieder gern. Viel Spaß beim Spielen!"]),
        (["tschüss", "bye", "ciao", "bis dann", "gute nacht"], ["Bis bald! Ich halte hier die Stellung. 🦁"]),
    ]
    voice = sorted(f[:-4] for f in os.listdir(P("lux-voice")) if f.endswith(".mp3")) if os.path.isdir(P("lux-voice")) else []
    return json.dumps({"root": R, "voice": voice, "games": games, "intents": [{"k": k, "a": a, "w": (0.5 if k[0] in ("kostenlos", "download", "handy", "account", "spielstand", "feedback", "kontakt", "danke", "software") else 2.5 if k[0] in ("deskboard", "diktakte", "speisekarte", "horror", "umfrage") else 1)} for k, a in intents],
        "vv": "th2", "chips": ["Ich will mit dir zusammen spielen 🎲", "Was ist das große Update?", "Welche Spiele gibt es?", "Was soll ich spielen?", "Kostet das was?", "DeskBoard herunterladen", "Erzähl einen Witz"]}, ensure_ascii=False).replace("</", "<\\/")

# ---------------------------------------------------------------- pages
def index_page(c):
    feat = GAMES[0]
    faq = "\n".join(f'        <details><summary>{e(q)}</summary><p>{e(a)}</p></details>' for q, a in FAQ)
    main = part("index-main.html")
    if c.preview:
        main = main.replace('<picture><source type="image/webp" srcset="{{ROOT}}assets/img/lewolux-studio-banner.webp"><img src="{{ROOT}}assets/img/lewolux-studio-banner.jpg"', f'<picture><img src="{c.img("lewolux-studio-banner.webp")}"')
        main = main.replace('src="{{ROOT}}assets/screenshots/{{FEAT}}-1.jpg"', f'src="{c.shot(feat["id"]+"-1")}"')
    main = (main.replace("{{CARDS}}", "\n".join(card(c, g, i) for i, g in enumerate(GAMES)) + "\n" + "\n".join(teaser_card(c, t) for t in TEASERS))
                .replace("{{REEL}}", "\n".join(reel(c, g) for g in GAMES))
                .replace("{{SOFTWARE}}", "\n".join(sw(c, s) for s in SOFTWARE)).replace("{{FAQ}}", faq)
                .replace("{{POLL}}", poll_items(c)).replace("{{FEEDBACKFORM}}", feedback_form(c)).replace("{{API}}", API)
                .replace("{{FEAT}}", feat["id"]).replace("{{FEATNAME}}", e(feat["short"])).replace("{{PROMO}}", promo(c)))
    jsonld = [{"@context": "https://schema.org", "@graph": [ORG,
        {"@type": "WebSite", "@id": SITE + "#website", "name": "Lewolux Studio", "url": SITE, "inLanguage": "de-DE", "publisher": {"@id": SITE + "#studio"}},
        {"@type": "ItemList", "name": "Kostenlose Spiele von Lewolux Studio", "itemListElement": [{"@type": "ListItem", "position": i + 1, "url": f"{SITE}spiele/{g['id']}/", "name": g["title"]} for i, g in enumerate(GAMES)]},
        {"@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in FAQ]}]
        + [{"@type": "SoftwareApplication", "name": s["title"], "description": s["desc"], "applicationCategory": "BusinessApplication", "operatingSystem": "Windows" if "Windows" in s["cat"] else "Web", "author": {"@id": SITE + "#studio"}, "url": f"{SITE}#sw-{s['id']}"} for s in SOFTWARE]}]
    preload = "" if c.preview else f'<link rel="preload" as="image" href="{c.root}assets/img/lewolux-studio-banner.webp" type="image/webp" fetchpriority="high">'
    h = head(c, "Lewolux Studio – Kostenlose Browserspiele & Indie-Games",
             "Kostenlose Browserspiele und Indie-Games von Lewolux Studio: Polit-RPG, Idle-RPG, Sammelkarten und Lern-App. Direkt online spielen oder gratis herunterladen.",
             "", "assets/img/og-lewolux-studio.jpg", jsonld, preload=preload)
    return common(c, h + part("header.html") + "\n" + main + "\n" + part("footer.html") + "\n" + tail(c))

def trailer(c, cls=""):
    """Ring-Legends-Trailer: Querformat am PC, Hochformat am Handy, stumm mit Ton-Knopf."""
    if c.preview: return ""
    v = _h.md5(open(P("video/ring-legends-trailer-l.mp4"), "rb").read()).hexdigest()[:8]
    b = f"{c.root}assets/video/ring-legends-trailer"
    return (f'<div class="trailer {cls}"><video muted loop playsinline preload="metadata" poster="{b}-l.jpg?v={v}" data-l="{b}-l.mp4?v={v}" data-p="{b}-p.mp4?v={v}" data-pl="{b}-l.jpg?v={v}" data-pp="{b}-p.jpg?v={v}" aria-label="Trailer zu Ring Legends"></video>'
            f'<button class="tr-sound" type="button" aria-pressed="false">🔇 Ton an</button></div>')

TRAILER_JS = """<script>(function(){document.querySelectorAll('.trailer').forEach(function(w){var v=w.querySelector('video'),b=w.querySelector('.tr-sound');var p=matchMedia('(max-width:680px)').matches;v.poster=p?v.dataset.pp:v.dataset.pl;v.src=p?v.dataset.p:v.dataset.l;w.classList.toggle('is-p',p);
var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){var r=v.play();if(r&&r.catch)r.catch(function(){})}else v.pause()})},{threshold:.35});io.observe(v);
b.onclick=function(){v.muted=!v.muted;if(!v.muted){v.currentTime=0;v.play()}b.textContent=v.muted?'🔇 Ton an':'🔊 Ton aus';b.setAttribute('aria-pressed',String(!v.muted))}})})();</script>"""

def promo(c):
    g = GAME_BY_ID["wrestling-tcg"]
    return f'''  <section class="promo" id="ring-legends-update" aria-labelledby="promo-h" style="--accent:{g['accent']}">
    <div class="wrap promo-in">
      {trailer(c)}
      <div class="promo-copy">
        <span class="eyebrow">Großes Update · Jetzt live</span>
        <h2 id="promo-h">Ring Legends ist jetzt online!</h2>
        <p>Packs aufreißen, 316 Wrestler-Karten sammeln und zum ersten Mal mit echten Spielern handeln. Mit Markt, Ranglisten und weltweitem Pop-Report. Kostenlos im Browser, ohne Pflicht-Anmeldung.</p>
        <ul class="promo-feats"><li>🛒 Markt</li><li>🏆 Ranglisten</li><li>📊 Pop-Report</li><li>🛡️ Fair & sicher</li></ul>
        <div class="promo-actions"><button class="btn btn-play" data-open="{g['id']}" data-mode="demo">{PLAY}Jetzt spielen</button><a class="btn btn-dl" href="{c.page(g)}#update">Alle Neuerungen</a></div>
        <p class="promo-soon"><span class="soon-badge">📱 Bald im Play Store</span> Die Android-App ist in Vorbereitung.</p>
      </div>
    </div>
  </section>
'''

def update_section(c, g):
    u = g.get("update")
    if not u: return ""
    items = "".join(f'<li><span class="up-i" aria-hidden="true">{i}</span><b>{e(t)}</b><span>{e(d)}</span></li>' for i, t, d in u["items"])
    return f'''  <section class="g-update" id="update" aria-labelledby="up-h"><span class="eyebrow">{e(u["kicker"])}</span><h2 id="up-h">{e(u["title"])}</h2><p class="up-lead">{e(u["lead"])}</p>{trailer(c, "in-update")}<ul class="up-list">{items}</ul><div class="g-actions"><button class="btn btn-play" data-open="{g['id']}" data-mode="demo">{PLAY}Jetzt online spielen</button></div><p class="up-note">{e(u["note"])}</p></section>
'''

def game_page(c, g):
    s = SEO[g["id"]]; url = f"spiele/{g['id']}/"
    genres = "".join(f'<span class="genre">{e(x)}</span>' for x in g["genres"])
    plats = ", ".join(ICONS[p][1] for p in g["plats"])
    keys = "".join(f"<li><span>{e(a)}</span><kbd>{e(k)}</kbd></li>" for a, k in g["controls"])
    feats = "".join(f"<li>{e(f)}</li>" for f in g["features"])
    gallery = "".join(f'<li><figure>{pic(c, g["id"]+"-"+str(i+1), "Screenshot aus "+g["short"]+": "+cap)}<figcaption>{e(cap)}</figcaption></figure></li>' for i, cap in enumerate(g["shots"]))
    faq = [(f"Ist {g['short']} kostenlos?", f"Ja. {g['short']} ist während der Entwicklung komplett kostenlos, im Browser und als Early-Access-Download."),
           (f"Kann ich {g['short']} auf dem Handy spielen?", f"Ja. {g['short']} läuft im Browser auf Smartphone, Tablet und PC" + (" und ist als Android-App verfügbar." if "android" in g["plats"] else ".")),
           (f"Wie lade ich {g['short']} herunter?", (f"Über den Button „Kostenlos herunterladen“ erhältst du das komplette Spiel als eine einzige HTML-Datei. Einfach öffnen, schon läuft es im Browser, auch offline, am PC und am Handy. Ein Account ist nicht nötig." if has_game(g) else f"Der Download von {g['short']} folgt, sobald die erste spielbare Version fertig ist."))]
    if g.get("online"):
        faq = [(f"Ist {g['short']} kostenlos?", f"Ja. {g['short']} ist kostenlos und kein Pay-to-Win. Alle Packs gibt es mit Münzen aus dem Spiel."),
               (f"Kann ich {g['short']} auf dem Handy spielen?", f"Ja. {g['short']} läuft im Browser auf Smartphone, Tablet und PC. Die Android-App für Google Play ist in Vorbereitung."),
               (f"Brauche ich ein Konto für {g['short']}?", "Nein. Du kannst sofort ohne Anmeldung spielen, deine Sammlung wird trotzdem sicher auf dem Server gespeichert. Für Markt und Ranglisten und zum Spielen auf mehreren Geräten meldest du dich freiwillig mit Google an."),
               (f"Warum ist {g['short']} jetzt online?", "Damit Handeln und Ranglisten fair sind: Jedes Pack wird auf dem Server gezogen, so kann niemand seine Sammlung fälschen.")]
    faqh = "".join(f"<details><summary>{e(q)}</summary><p>{e(a)}</p></details>" for q, a in faq)
    more = "".join(f'<a class="mg" href="{c.page(o)}">{pic(c, o["id"]+"-1", "Screenshot aus "+o["short"], "260px")}<span>{e(o["short"])}</span></a>' for o in GAMES if o["id"] != g["id"])
    long = "".join(f"<p>{p}</p>" for p in s["long"])
    shots_abs = [f"{SITE}assets/screenshots/{g['id']}-{i+1}.jpg" for i in range(3)]
    jsonld = [{"@context": "https://schema.org", "@graph": [ORG,
        {"@type": "VideoGame", "@id": SITE + url + "#game", "name": g["title"], "url": SITE + url, "description": s["meta"], "genre": g["genres"],
         "gamePlatform": ["Web-Browser"] + (["Android"] if "android" in g["plats"] else []) + (["Smartphone"] if "mobile" in g["plats"] else []),
         "applicationCategory": "Game", "operatingSystem": "Web, Windows, macOS, Android", "playMode": ["SinglePlayer", "MultiPlayer"] if g.get("online") else "SinglePlayer", "inLanguage": "de",
         "isAccessibleForFree": True, "image": shots_abs[0], "screenshot": [{"@type": "ImageObject", "url": u, "caption": cap} for u, cap in zip(shots_abs, g["shots"])],
         "author": {"@id": SITE + "#studio"}, "publisher": {"@id": SITE + "#studio"},
         "offers": {"@type": "Offer", "price": "0", "priceCurrency": "EUR", "availability": "https://schema.org/InStock", "url": SITE + url}},
        {"@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Start", "item": SITE},
            {"@type": "ListItem", "position": 2, "name": "Spiele", "item": SITE + "#spiele"}, {"@type": "ListItem", "position": 3, "name": g["short"], "item": SITE + url}]},
        {"@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faq]}]
        + ([{"@type": "VideoObject", "name": g["short"] + " – Trailer zum großen Update", "description": "15 Sekunden Ring Legends: Packs öffnen, Karten graden, Ring-Duelle, Markt und Tausch. Kostenlos im Browser, bald im Play Store.",
             "thumbnailUrl": SITE + "assets/video/ring-legends-trailer-l.jpg", "contentUrl": SITE + "assets/video/ring-legends-trailer-l.mp4", "uploadDate": "2026-10-08", "duration": "PT15S", "inLanguage": "de",
             "publisher": {"@id": SITE + "#studio"}, "embedUrl": SITE + url + "#update"}] if g.get("update") and os.path.isfile(P("video/ring-legends-trailer-l.mp4")) else [])}]
    preload = f'<link rel="preload" as="image" href="{c.shot(g["id"]+"-1")}" type="image/webp" fetchpriority="high">'
    h = head(c, s["title"] + " | Lewolux Studio" if len(s["title"]) < 44 else s["title"], s["meta"], url, f"assets/og/og-{g['id']}.jpg", jsonld, preload=preload)
    body = f'''<main class="wrap" style="--accent:{g['accent']}">
  <nav aria-label="Breadcrumb"><ol class="crumbs"><li><a href="{c.root}">Start</a></li><li><a href="{c.root}#spiele">Spiele</a></li><li aria-current="page">{e(g['short'])}</li></ol></nav>
  <div class="g-hero">
    <div class="g-shot">{pic(c, g['id']+'-1', 'Screenshot aus '+g['short']+': '+g['shots'][0], '(max-width:900px) 100vw, 720px', lazy=False)}</div>
    <div>
      <div class="genres">{genres}</div>
      <h1>{e(g['title'])}</h1>
      <p class="g-tag">{e(g['tagline'])}</p>
      <p class="desc" style="font-size:16px">{e(g['desc'])}</p>
      <dl class="g-meta"><dt>Preis</dt><dd>Kostenlos (Early Access)</dd><dt>Status</dt><dd>{e(g['status'])}</dd><dt>Plattform</dt><dd>{e(plats)}</dd><dt>Technik</dt><dd>{e(', '.join(g['tech']))}</dd><dt>Download</dt><dd>{e(g['download']['format'])}</dd></dl>
      <div class="g-actions"><button class="btn btn-play" data-open="{g['id']}" data-mode="demo">{PLAY}Jetzt im Browser spielen</button>{dl_btn(c, g, "Kostenlos herunterladen")}</div>
      {G_TIP if c.dl(g) else ""}
    </div>
  </div>
{update_section(c, g)}  <div class="g-cols">
    <article class="prose"><h2>Worum geht es in {e(g['short'])}?</h2>{long}<h2>Story</h2><p>{e(g['story'])}</p></article>
    <aside class="g-box"><p class="m-h">Features</p><ul class="feats">{feats}</ul><p class="m-h">Steuerung</p><ul class="keys">{keys}</ul></aside>
  </div>
{manual_section(c, g)}  <section aria-labelledby="sh-h" style="padding-bottom:0"><div class="sec-head"><div><span class="eyebrow">Screenshots</span><h2 id="sh-h">{e(g['short'])} in Bildern</h2></div></div><ul class="gallery">{gallery}</ul></section>
{game_feedback(c, g)}  <section aria-labelledby="faq-h" style="padding-bottom:0"><div class="sec-head"><div><span class="eyebrow">FAQ</span><h2 id="faq-h">Fragen zu {e(g['short'])}</h2></div></div><div class="faq">{faqh}</div></section>
  <section aria-labelledby="more-h"><div class="sec-head"><div><span class="eyebrow">Mehr spielen</span><h2 id="more-h">Weitere kostenlose Spiele</h2></div></div><div class="more-games">{more}</div></section>
</main>
'''
    return common(c, h + part("header.html") + "\n" + body + part("footer.html") + "\n" + tail(c))

def simple_page(c, path, title, body_html):
    h = head(c, title + " | Lewolux Studio", title + " von Lewolux Studio.", path, "assets/img/og-lewolux-studio.jpg", [], robots="noindex, follow")
    return common(c, h + part("header.html") + f'\n<main class="wrap legal-page"><h1>{e(title)}</h1>{body_html}</main>\n' + part("footer.html") + "\n" + tail(c))

# ---------------------------------------------------------------- Lewolux Kids
def guard_game(f):
    """Kids-Modus-Sperre in ein (Erwachsenen-)Spiel unter /games/ einbauen: direkt nach <head>, sonst ganz an den Anfang."""
    if not os.path.isfile(f): return
    s = open(f, encoding="utf-8").read()
    if "lxKids" in s[:3000]: return
    m = re.search(r"<head[^>]*>", s, re.I)
    s = s[:m.end()] + KIDS_GUARD + s[m.end():] if m else KIDS_GUARD + s
    open(f, "w", encoding="utf-8").write(s)

KIDS_OWL = '''<svg class="k-owl" viewBox="0 0 120 120" aria-hidden="true"><ellipse cx="60" cy="112" rx="34" ry="6" fill="rgba(29,35,80,.15)"/>
<path d="M22 40 L30 14 L46 30 Z M98 40 L90 14 L74 30 Z" fill="#7a4fd6"/><ellipse cx="60" cy="66" rx="42" ry="44" fill="#8b5cf6"/>
<ellipse cx="60" cy="80" rx="27" ry="27" fill="#d9c8ff"/><path d="M42 80q6 4 12 0M56 90q6 4 12 0M66 80q6 4 12 0" stroke="#a98bf0" stroke-width="3" fill="none" stroke-linecap="round"/>
<circle cx="42" cy="50" r="17" fill="#fff"/><circle cx="78" cy="50" r="17" fill="#fff"/><circle cx="44" cy="52" r="8" fill="#1d2350"/><circle cx="76" cy="52" r="8" fill="#1d2350"/>
<circle cx="47" cy="49" r="3" fill="#fff"/><circle cx="79" cy="49" r="3" fill="#fff"/><path d="M54 62 L66 62 L60 72 Z" fill="#ffb02e"/>
<path d="M18 70q-10 14 4 28q4-16-4-28zM102 70q10 14-4 28q-4-16 4-28z" fill="#7a4fd6"/><path d="M48 108l-4 6M54 109v6M66 109v6M72 108l4 6" stroke="#ffb02e" stroke-width="4" stroke-linecap="round"/></svg>'''
SPEAK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="#1d2350" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9z" fill="#1d2350"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>'
PLAY_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.4-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z" fill="#fff"/></svg>'

def kids_icons():
    """Icons für die Kinder-App: Löwengesicht im weißen Kreis auf buntem Sonnen-Hintergrund (normal + maskable)."""
    face = Image.open(P("logo-face.png")).convert("RGB")
    from PIL import ImageDraw
    def bg(n, rounded):
        im = Image.new("RGB", (n, n)); px = im.load()
        cols = [(255, 111, 174), (255, 138, 61), (255, 210, 63), (62, 201, 122), (25, 167, 224)]
        for y in range(n):
            for x in range(n):
                t = (x + y) / (2 * (n - 1)) * (len(cols) - 1); i = min(int(t), len(cols) - 2); f = t - i
                a, b = cols[i], cols[i + 1]; px[x, y] = tuple(int(a[k] + (b[k] - a[k]) * f) for k in range(3))
        if rounded:
            out = Image.new("RGBA", (n, n), (0, 0, 0, 0)); m = Image.new("L", (n, n), 0)
            ImageDraw.Draw(m).rounded_rectangle((0, 0, n - 1, n - 1), radius=int(n * .22), fill=255); out.paste(im, (0, 0), m); return out
        return im.convert("RGBA")
    def put(im, frac):
        n = im.width; d = int(n * frac); ring = int(d * .07); o = (n - d) // 2
        dr = ImageDraw.Draw(im); dr.ellipse((o, o, o + d, o + d), fill=(255, 255, 255, 255))
        inner = d - 2 * ring; m = Image.new("L", (inner * 4, inner * 4), 0); ImageDraw.Draw(m).ellipse((0, 0, inner * 4 - 1, inner * 4 - 1), fill=255)
        im.paste(face.resize((inner, inner), Image.LANCZOS), (o + ring, o + ring), m.resize((inner, inner), Image.LANCZOS)); return im
    for n in (192, 512):
        put(bg(n, True), .8).save(P(f"dist/assets/img/kids-icon-{n}.png"))
        put(bg(n, False), .62).convert("RGB").save(P(f"dist/assets/img/kids-icon-maskable-{n}.png"))
    put(bg(180, False), .78).convert("RGB").save(P("dist/assets/img/kids-apple-touch-icon.png"))
    # Vorschaubild für Messenger/Suchmaschinen
    og = bg(1200, False).resize((1200, 630)).convert("RGB")
    if KIDS and os.path.isfile(P(f"dist/assets/screenshots/{KIDS[0]['id']}-1.jpg")):
        sh = Image.open(P(f"dist/assets/screenshots/{KIDS[0]['id']}-1.jpg")).convert("RGB").resize((720, 405), Image.LANCZOS)
        m = Image.new("L", (720, 405), 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, 719, 404), radius=36, fill=255)
        ImageDraw.Draw(og).rounded_rectangle((424, 103, 1156, 520), radius=42, fill=(255, 255, 255)); og.paste(sh, (430, 109), m)
    ic = Image.open(P("dist/assets/img/kids-icon-512.png")).resize((320, 320), Image.LANCZOS); og.paste(ic, (60, 155), ic)
    og.save(P("dist/assets/img/og-kids.jpg"), quality=86, optimize=True)

# Vorlese-Stimme für Lewolux Kids: Piper „Kerstin“ (CC0), mit ffmpeg etwas höher/kindlicher gemacht.
# Aufnahmen landen im Cache kids-voice/<hash>.mp3 (nur neue Texte werden aufgenommen) und werden nach dist/kids/voice/ kopiert.
KIDS_VOICE_MODEL = os.environ.get("KIDS_VOICE_MODEL", "/home/claude/tts/de-kerstin-low/de-kerstin-low.onnx")
KIDS_VOICE_AF = "asetrate=16000*1.10,aresample=44100,atempo=0.909,highpass=f=90,loudnorm=I=-13:TP=-1"
KIDS_VOICE_SYN = dict(length_scale=1.3, noise_scale=0.5, noise_w_scale=0.6)   # langsamer und deutlicher
def kids_voice(texts):
    """Gibt {Text: URL} zurück. Fehlt Piper/ffmpeg, bleibt die Liste leer -> die Seite liest dann mit der Browserstimme vor."""
    import subprocess, tempfile, wave
    cache = P("kids-voice"); os.makedirs(cache, exist_ok=True); os.makedirs(P("dist/kids/voice"), exist_ok=True)
    out, voice = {}, None
    for t in dict.fromkeys(x.strip() for x in texts if x and x.strip()):
        h = _h.md5((os.path.basename(KIDS_VOICE_MODEL) + KIDS_VOICE_AF + json.dumps(KIDS_VOICE_SYN) + t).encode()).hexdigest()[:12]; f = os.path.join(cache, h + ".mp3")
        if not os.path.isfile(f):
            try:
                if voice is None:
                    from piper import PiperVoice
                    import piper_fix  # „ç“-Korrektur (ich, nicht …)
                    voice = PiperVoice.load(KIDS_VOICE_MODEL)
                    from piper.config import SynthesisConfig
                    syn = SynthesisConfig(**KIDS_VOICE_SYN)
                with tempfile.NamedTemporaryFile(suffix=".wav") as tmp:
                    with wave.open(tmp.name, "wb") as w: voice.synthesize_wav(t, w, syn_config=syn)
                    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", tmp.name, "-af", KIDS_VOICE_AF, "-ac", "1", "-b:a", "64k", f], check=True)
            except Exception as ex:
                print("Kids-Stimme: keine Aufnahme für", repr(t), "-", ex); continue
        shutil.copy(f, P("dist/kids/voice", h + ".mp3")); out[t] = f"/kids/voice/{h}.mp3"
    used = {u.rsplit("/", 1)[1] for u in out.values()}
    for f in os.listdir(cache):
        if f.endswith(".mp3") and f not in used: os.remove(os.path.join(cache, f))   # alte Aufnahmen aufräumen
    return out

KIDS_SUN = '''<svg viewBox="0 0 200 200" aria-hidden="true"><g class="ks-rays">''' + "".join(
    f'<path d="M100 8 L110 34 L90 34 Z" transform="rotate({i * 30} 100 100)"/>' for i in range(12)) + '''</g>
<circle cx="100" cy="100" r="58" fill="url(#ksg)"/><defs><radialGradient id="ksg" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#fff6b0"/><stop offset=".6" stop-color="#ffd23f"/><stop offset="1" stop-color="#ffb52e"/></radialGradient></defs>
<g class="ks-eyes"><ellipse cx="80" cy="90" rx="7" ry="9" fill="#1d2350"/><ellipse cx="120" cy="90" rx="7" ry="9" fill="#1d2350"/><circle cx="82.5" cy="86.5" r="2.6" fill="#fff"/><circle cx="122.5" cy="86.5" r="2.6" fill="#fff"/></g>
<g fill="#ff8fa3" opacity=".75"><ellipse cx="66" cy="110" rx="9" ry="6"/><ellipse cx="134" cy="110" rx="9" ry="6"/></g>
<path class="ks-smile" d="M82 114 Q100 128 118 114" stroke="#1d2350" stroke-width="5" fill="none" stroke-linecap="round"/>
<path class="ks-grin" d="M76 110 Q100 148 124 110 Z" fill="#c2324d" stroke="#1d2350" stroke-width="4" stroke-linejoin="round"/></svg>'''

def kids_page(c):
    title = "Lewolux Kids – kostenlose Kinderspiele ohne Werbung"
    desc = "Lewolux Kids: kostenlose Lernspiele für Kinder, ohne Werbung, ohne Käufe, ohne Anmeldung. Große Knöpfe, Vorlesefunktion und Elternsperre. Mit Kritzelheld, Pandi und Schulhofkicker."
    url = SITE + "kids/"
    games, cards = [], []
    for k in KIDS:
        g = GAME_BY_ID.get(k["id"]); play = f"/games/{k['id']}/index.html" if g and has_game(g) else None
        games.append({"id": k["id"], "title": k["title"], "play": play, "mascot": k.get("mascot"), "crowd": k.get("crowd", 1), "emoji": k["emoji"], "say": f"Los geht's! {k['title']}"})
        img = (f'<canvas class="k-prev" data-preview="{k["preview"]}" aria-hidden="true"></canvas>' if k.get("preview")
               else pic(c, f"{k['id']}-1", f"Bild aus {k['title']}", "(max-width:900px) 100vw, 540px", lazy=False) if g else "")
        style = f"--c1:{k['c1']};--c2:{k['c2']}"
        btn = (f'<button class="k-play" type="button" data-play="{k["id"]}" data-say="Los geht\'s! {e(k["title"])}">{PLAY_SVG}Spielen</button>' if play
               else f'<button class="k-play is-off" type="button" disabled data-say="{e(k["title"])} kommt bald">Bald</button>')
        cards.append(f'''<li class="k-card" style="{style}">
  <button class="k-pic" type="button" {f'data-play="{k["id"]}" ' if play else ''}data-say="{e(k['say'])}" aria-label="{e(k['title'])} spielen">{img or f'<span class="k-emoji" aria-hidden="true">{k["emoji"]}</span>'}<span class="k-age">{e(k['age'])}</span></button>
  <div class="k-name"><h2>{e(k['title'])}</h2><button class="k-say" type="button" data-say="{e(k['say'])}" aria-label="Vorlesen">{SPEAK_SVG}</button></div>
  <p class="k-line">{e(k['line'])}</p>
  {btn}
</li>''')
    cards.append(f'<li class="k-card k-soon" data-say="{e(KIDS_PHRASES["soon"])}"><span class="k-big" aria-hidden="true">🎁</span><p>Bald kommt ein neues Spiel!</p><small>Schau bald wieder vorbei.</small></li>')
    jsonld = [{"@context": "https://schema.org", "@graph": [ORG, {"@type": "CollectionPage", "@id": url, "url": url, "name": title, "description": desc, "inLanguage": "de", "isPartOf": {"@type": "WebSite", "url": SITE, "name": "Lewolux Studio"},
        "audience": {"@type": "PeopleAudience", "suggestedMinAge": 4, "suggestedMaxAge": 9},
        "mainEntity": {"@type": "ItemList", "itemListElement": [{"@type": "ListItem", "position": i + 1, "name": k["title"], "url": f"{SITE}spiele/{k['id']}/"} for i, k in enumerate(KIDS)]}}]}]
    out = f'''<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<script>try{{if(localStorage.getItem('lxKids')!=='1'){{localStorage.setItem('lxKids','1');window.__lxKidsNew=1}}}}catch(e){{}}</script>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{e(title)}</title>
<meta name="description" content="{e(desc)}">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta name="author" content="Lewolux Studio">
<meta name="theme-color" content="#6fd0ff">
<link rel="canonical" href="{url}">
<link rel="alternate" hreflang="de" href="{url}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Lewolux Kids">
<meta property="og:locale" content="de_DE">
<meta property="og:title" content="{e(title)}">
<meta property="og:description" content="{e(desc)}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{SITE}assets/img/og-kids.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="{SITE}assets/img/og-kids.jpg">
<link rel="icon" type="image/png" sizes="192x192" href="{c.root}assets/img/kids-icon-192.png">
<link rel="apple-touch-icon" href="{c.root}assets/img/kids-apple-touch-icon.png">
<meta name="apple-mobile-web-app-title" content="Lewolux Kids">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<link rel="manifest" href="/kids/kids.webmanifest">
<link rel="preload" href="{c.root}assets/fonts/fredoka-latin-700-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="{c.root}assets/css/kids.css?v={VER}">
{ld(jsonld[0])}
</head>
<body class="kids">
<div class="k-sky" aria-hidden="true"><div class="k-cloud c1"></div><div class="k-cloud c2"></div><div class="k-cloud c3"></div></div>
<button class="k-sunb" id="kSun" type="button" aria-label="Sonne" data-say="{e(KIDS_PHRASES['sun'])}">{KIDS_SUN}</button>
<div class="k-wrap">
  <header class="k-top">
    <div class="k-brand" data-say="{e(KIDS_PHRASES['brand'])}"><img src="{c.root}assets/img/kids-icon-192.png" alt="" width="54" height="54"><span class="k-logo">Lewolux<b>Kids</b></span></div>
    <button class="k-parents" id="kParents" type="button"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg><span><span class="k-pl">Zurück zum </span>Erwachsenen&shy;bereich</span></button>
  </header>
  <main>
    <div class="k-hello">{KIDS_OWL}<div class="k-bubble"><h1>Hallo! <span>Was spielen wir?</span></h1><button class="k-say" type="button" data-say="{e(KIDS_PHRASES['hello'])}" aria-label="Vorlesen">{SPEAK_SVG}</button></div></div>
    <ul class="k-games">
{chr(10).join(cards)}
    </ul>
  </main>
</div>
<section class="k-lawn" id="kLawn" aria-label="Wiese mit Spielfiguren"><div class="k-grass" aria-hidden="true"></div></section>
<div class="k-under">
  <footer class="k-foot">
    <button class="k-install" id="kInstall" type="button"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12M7 10l5 5 5-5"/><rect x="4" y="17" width="16" height="4" rx="1.5"/></svg>Als App installieren</button>
    <span>Kostenlos · ohne Werbung · ohne Käufe</span>
  </footer>
</div>

<div class="k-player" id="kPlayer" hidden>
  <div class="k-bar">
    <button class="k-close" id="kClose" type="button" data-say="{e(KIDS_PHRASES['quit'])}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>Beenden</button>
    <span class="k-bar-t" id="kTitle"></span>
  </div>
  <div class="k-stage" id="kStage"><div class="k-loading">Lädt …</div></div>
  <div class="k-quit" id="kQuit" hidden role="alertdialog" aria-labelledby="kQuitH">
    <div class="k-quit-in"><p id="kQuitH">Spiel beenden?</p>
      <div class="k-quit-btns"><button type="button" class="k-yes" id="kYes" data-say="{e(KIDS_PHRASES['bye'])}">Ja</button><button type="button" class="k-no" id="kNo" data-say="{e(KIDS_PHRASES['no'])}">Nein</button></div></div>
  </div>
</div>

<dialog class="k-gate" id="kGate" aria-labelledby="kGateH">
  <div class="k-gate-in">
    <h2 id="kGateH">Für Eltern</h2>
    <p>Kids-Modus beenden? Bitte diese Aufgabe lösen:</p>
    <form id="kGateForm" autocomplete="off">
      <label class="k-q" id="kQ" for="kAns">Wie viel ist 7 × 8?</label>
      <div class="k-row"><input id="kAns" type="number" inputmode="numeric" pattern="[0-9]*" min="0" max="999" required aria-describedby="kErr"><button class="k-ok" type="submit">OK</button></div>
      <p class="k-err" id="kErr" aria-live="polite"></p>
    </form>
    <button class="k-back" id="kBack" type="button" data-say="{e(KIDS_PHRASES['back'])}">Weiter spielen</button>
    <p class="k-note"><b>Gut zu wissen:</b> Der Kids-Modus sperrt nur die anderen Seiten von lewolux.de in diesem Browser. Er ist keine echte Kindersicherung: Andere Apps, Webseiten oder ein neuer Tab bleiben erreichbar. Um das Gerät wirklich abzusichern, nutzen Sie <b>Google Family Link</b> (Android) oder auf iPhone/iPad <b>Bildschirmzeit</b> bzw. <b>Geführter Zugriff</b>.</p>
    <p class="k-legal"><a href="/impressum/">Impressum</a> · <a href="/datenschutz/">Datenschutz</a></p>
  </div>
</dialog>
<script id="kids-data" type="application/json">__KIDSDATA__</script>
<script src="{c.root}assets/js/kids.js?v={VER}" defer></script>
</body>
</html>
'''
    # Vorlesen: jeder Text mit data-say plus die festen Sätze aus data.py wird als MP3 aufgenommen
    texts = [html.unescape(t) for t in re.findall(r'data-say="([^"]*)"', out)] + list(KIDS_PHRASES.values()) + [g["say"] for g in games]
    voice = kids_voice(texts)
    data = json.dumps({"games": games, "phrases": KIDS_PHRASES, "voice": voice}, ensure_ascii=False).replace("</", "<\\/")
    return out.replace("__KIDSDATA__", data)

def kids_build():
    os.makedirs(P("dist/kids"), exist_ok=True)
    for f in os.listdir(P("parts/kids-fonts")):
        shutil.copy(P("parts/kids-fonts", f), P("dist/assets/fonts", "Fredoka-OFL-LICENSE.txt" if f.endswith(".txt") else f))
    ff = "\n".join(f"@font-face{{font-family:'Fredoka';font-style:normal;font-weight:{w};font-display:swap;src:url(../fonts/fredoka-latin-{w}-normal.woff2) format('woff2')}}" for w in (500, 700))
    open(P("dist/assets/css/kids.css"), "w", encoding="utf-8").write(ff + "\n" + part("kids.css"))
    open(P("dist/assets/js/kids.js"), "w", encoding="utf-8").write(part("install.js") + "\n" + part("kids.js"))
    kids_icons()
    open(P("dist/kids/index.html"), "w", encoding="utf-8").write(kids_page(Ctx("../")))
    open(P("dist/kids/kids.webmanifest"), "w").write(json.dumps({"id": "/kids/", "name": "Lewolux Kids", "short_name": "Lewolux Kids",
        "description": "Kostenlose Kinderspiele ohne Werbung von Lewolux Studio – mit Vorlesefunktion und Elternsperre.",
        "lang": "de", "start_url": "/kids/?app=1", "scope": "/kids/", "display": "standalone", "orientation": "any",
        "background_color": "#6fd0ff", "theme_color": "#6fd0ff", "categories": ["kids", "education", "games"],
        "icons": [{"src": f"/assets/img/kids-icon-{n}.png", "sizes": f"{n}x{n}", "type": "image/png", "purpose": "any"} for n in (192, 512)]
               + [{"src": f"/assets/img/kids-icon-maskable-{n}.png", "sizes": f"{n}x{n}", "type": "image/png", "purpose": "maskable"} for n in (192, 512)]}, indent=1, ensure_ascii=False))

# ---------------------------------------------------------------- build
def main():
    d = P("dist"); shutil.rmtree(d, ignore_errors=True)
    for sub in ("assets/screenshots", "assets/img", "assets/og", "assets/css", "assets/js", "assets/fonts", "downloads"): os.makedirs(os.path.join(d, sub))
    asyncio.run(render_shots(os.path.join(d, "assets/screenshots")))
    # images
    ban = Image.open(P("banner.jpg")).convert("RGB")
    ban.save(P("dist/assets/img/lewolux-studio-banner.jpg"), quality=86, optimize=True, progressive=True)
    ban.save(P("dist/assets/img/lewolux-studio-banner.webp"), quality=82, method=6)
    og_image(P("banner.jpg"), P("dist/assets/img/og-lewolux-studio.jpg"))
    Image.open(P("logo-lion.png")).convert("RGB").resize((256, 256), Image.LANCZOS).save(P("dist/assets/img/lewolux-studio-logo.jpg"), quality=88)
    # Icons aus dem großen Löwen im Banner (schärfer als das kleine Logo); fürs Favicon nur das Gesicht, damit es klein lesbar bleibt
    lion = Image.open(P("logo-lion.png")).convert("RGB"); face = Image.open(P("logo-face.png")).convert("RGB")
    lion.resize((192, 192), Image.LANCZOS).save(P("dist/assets/img/icon-192.png")); lion.resize((512, 512), Image.LANCZOS).save(P("dist/assets/img/icon-512.png"))
    lion.resize((180, 180), Image.LANCZOS).save(P("dist/apple-touch-icon.png"))
    for n in (48, 96, 144): face.resize((n, n), Image.LANCZOS).save(P(f"dist/favicon-{n}.png"))
    face.save(P("dist/favicon.ico"), sizes=[(16, 16), (32, 32), (48, 48)])
    for g in GAMES: og_image(P(f"dist/assets/screenshots/{g['id']}-1.jpg"), P(f"dist/assets/og/og-{g['id']}.jpg"))
    # fonts, css, js
    for fam, slug, ws in FONTS:
        for w in ws: shutil.copy(P(f"fontsrc/node_modules/@fontsource/{slug}/files/{slug}-latin-{w}-normal.woff2"), P("dist/assets/fonts"))
    open(P("dist/assets/css/site.css"), "w", encoding="utf-8").write(font_face("../fonts/") + "\n" + part("style.css"))
    open(P("dist/assets/js/app.js"), "w", encoding="utf-8").write(app_js())
    if os.path.isdir(P("pdf-leser-app")):
        shutil.copytree(P("pdf-leser-app"), P("dist/pdf"), dirs_exist_ok=True)
    if os.path.isdir(P("video")):
        shutil.copytree(P("video"), P("dist/assets/video"), dirs_exist_ok=True)
    if os.path.isdir(P("lux-voice")):
        os.makedirs(P("dist/assets/voice"), exist_ok=True)
        for f in os.listdir(P("lux-voice")):
            if f.endswith(".mp3"): shutil.copy(P("lux-voice/" + f), P("dist/assets/voice/" + f))
    # echte Spiele kopieren
    for g in GAMES:
        if has_game(g):
            shutil.copytree(P("spiele-dateien", g["id"]), P("dist/games", g["id"]))
            if g["id"] not in KIDS_IDS: guard_game(P("dist/games", g["id"], "index.html"))
            if not g.get("online"): open(P("dist", g["download"]["file"]), "w", encoding="utf-8").write(standalone(g))
    for g in GAMES:
        os.makedirs(P("dist/games", g["id"]), exist_ok=True)
        if not has_game(g): open(P("dist/games", g["id"], "HIER-WEB-EXPORT-REIN.txt"), "w", encoding="utf-8").write(f"Den Web-Export von {g['title']} hier hineinkopieren (index.html muss direkt in diesem Ordner liegen). Danach ist das Spiel auf der Website sofort spielbar.\n")
    print("Spiele im Browser:", [g["id"] for g in GAMES if has_game(g)] or "noch keine (Ordner spiele-dateien/ füllen)")
    # pages
    open(P("dist/index.html"), "w", encoding="utf-8").write(index_page(Ctx("./")))
    for g in GAMES:
        os.makedirs(P(f"dist/spiele/{g['id']}"), exist_ok=True)
        open(P(f"dist/spiele/{g['id']}/index.html"), "w", encoding="utf-8").write(game_page(Ctx("../../"), g))
    for sw_ in SOFTWARE:
        gd = P("software-bilder", sw_["id"])
        if os.path.isdir(gd):
            os.makedirs(P(f"dist/assets/software/{sw_['id']}"), exist_ok=True)
            for f in os.listdir(gd):
                im = Image.open(os.path.join(gd, f)).convert("RGB")
                if im.width > 1400: im = im.resize((1400, int(im.height * 1400 / im.width)), Image.LANCZOS)
                im.save(P(f"dist/assets/software/{sw_['id']}/{f.rsplit('.',1)[0]}.webp"), quality=84, method=6)
        os.makedirs(P(f"dist/software/{sw_['id']}"), exist_ok=True)
        og_image(P(f"dist/assets/screenshots/software-{sw_['id']}.jpg"), P(f"dist/assets/og/og-software-{sw_['id']}.jpg"))
        open(P(f"dist/software/{sw_['id']}/index.html"), "w", encoding="utf-8").write(software_page(Ctx("../../"), sw_))
    deskboard_parts()
    teaser_assets()
    kids_build()
    todo = '<p class="todo">Platzhalter: Hier müssen die Pflichtangaben eingetragen werden. Bitte mit einem Generator (z. B. e-recht24.de) oder anwaltlich erstellen lassen.</p>'
    for slug, title in (("impressum", "Impressum"), ("datenschutz", "Datenschutzerklärung")):
        os.makedirs(P(f"dist/{slug}"), exist_ok=True)
        open(P(f"dist/{slug}/index.html"), "w", encoding="utf-8").write(simple_page(Ctx("../"), slug + "/", title, part(f"{slug}.html")))
    os.makedirs(P("dist/ring-legends/datenschutz"), exist_ok=True)
    os.makedirs(P("dist/links"), exist_ok=True)
    open(P("dist/links/index.html"), "w", encoding="utf-8").write(links_page(Ctx("../")))
    os.makedirs(P("dist/ring-legends/tester"), exist_ok=True)
    open(P("dist/ring-legends/tester/index.html"), "w", encoding="utf-8").write(tester_page(Ctx("../../")))
    open(P("dist/ring-legends/datenschutz/index.html"), "w", encoding="utf-8").write(simple_page(Ctx("../../"), "ring-legends/datenschutz/", "Datenschutz – Ring Legends (App und Browser)", part("ring-legends-datenschutz.html")))
    os.makedirs(P("dist/admin"), exist_ok=True)
    open(P("dist/admin/index.html"), "w", encoding="utf-8").write(part("admin.html").replace('<meta charset="utf-8">', '<meta charset="utf-8">' + KIDS_GUARD, 1).replace("{{API}}", API).replace("{{GAMES}}", json.dumps({g["id"]: g["short"] for g in GAMES}, ensure_ascii=False)))
    open(P("dist/404.html"), "w", encoding="utf-8").write(simple_page(Ctx("/"), "404", "Seite nicht gefunden", '<p class="prose">Diese Seite gibt es nicht. <a href="/">Zur Startseite</a> oder direkt zu den <a href="/#spiele">Spielen</a>.</p>').replace('content="noindex, follow"', 'content="noindex"'))
    # seo files
    today = datetime.date.today().isoformat()
    def u(loc, imgs, prio):
        im = "".join(f"<image:image><image:loc>{SITE}{i}</image:loc></image:image>" for i in imgs)
        return f"  <url><loc>{SITE}{loc}</loc><lastmod>{today}</lastmod><changefreq>weekly</changefreq><priority>{prio}</priority>{im}</url>\n"
    sm = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n'
    sm += u("", ["assets/img/lewolux-studio-banner.jpg"] + [f"assets/screenshots/{g['id']}-1.jpg" for g in GAMES], "1.0")
    sm += "".join(u(f"spiele/{g['id']}/", [f"assets/screenshots/{g['id']}-{i+1}.jpg" for i in range(3)], "0.8") for g in GAMES)
    sm += "".join(u(f"spiele/{t['id']}/", [f"assets/teaser/{t['id']}-1.jpg"], "0.6") for t in TEASERS)
    sm += u("ring-legends/tester/", [], "0.6")
    sm += u("kids/", ["assets/img/og-kids.jpg"] + [f"assets/screenshots/{k['id']}-1.jpg" for k in KIDS], "0.8")
    sm += "".join(u(f"software/{x['id']}/", [f"assets/screenshots/software-{x['id']}.jpg"], "0.7") for x in SOFTWARE)
    open(P("dist/sitemap.xml"), "w").write(sm + "</urlset>\n")
    open(P("dist/robots.txt"), "w").write(f"User-agent: *\nAllow: /\nDisallow: /downloads/\nDisallow: /admin/\n\nSitemap: {SITE}sitemap.xml\n")
    # Web-App: Manifest mit normalen und "maskable" Icons (Android schneidet die Form selbst zu), Service Worker, IndexNow-Schlüssel
    lionM = Image.open(P("logo-lion.png")).convert("RGB")
    for n in (192, 512):
        bg = Image.new("RGB", (n, n), (10, 11, 16)); k = int(n * 0.72); bg.paste(lionM.resize((k, k), Image.LANCZOS), ((n - k) // 2, (n - k) // 2)); bg.save(P(f"dist/assets/img/icon-maskable-{n}.png"))
    open(P("dist/site.webmanifest"), "w").write(json.dumps({"id": "/", "name": "Lewolux Studio", "short_name": "Lewolux", "description": "Kostenlose Indie-Games und kleine Programme von Lewolux Studio – direkt im Browser spielbar.",
        "lang": "de", "start_url": "/?app=1", "scope": "/", "display": "standalone", "orientation": "any", "background_color": "#0a0b10", "theme_color": "#0a0b10", "categories": ["games", "entertainment"],
        "icons": [{"src": "/assets/img/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any"}, {"src": "/assets/img/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any"},
                  {"src": "/assets/img/icon-maskable-192.png", "sizes": "192x192", "type": "image/png", "purpose": "maskable"}, {"src": "/assets/img/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"}],
        "shortcuts": [{"name": "Alle Spiele", "url": "/#spiele", "icons": [{"src": "/assets/img/icon-192.png", "sizes": "192x192"}]}, {"name": "Ring Legends", "url": "/spiele/ring-legends/", "icons": [{"src": "/assets/img/icon-192.png", "sizes": "192x192"}]}]}, indent=1))
    open(P("dist/sw.js"), "w").write(SW_JS.replace("__VER__", VER))
    open(P("dist/ca25d78b861b4a1aab26dff52d8faf9c.txt"), "w").write("ca25d78b861b4a1aab26dff52d8faf9c")
    open(P("dist/.htaccess"), "w").write("""# Apache: Kompression, Caching, HTTPS, 404
ErrorDocument 404 /404.html
<IfModule mod_rewrite.c>
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
</IfModule>
<IfModule mod_deflate.c>
AddOutputFilterByType DEFLATE text/html text/css application/javascript application/json image/svg+xml text/xml application/xml
</IfModule>
<IfModule mod_expires.c>
ExpiresActive On
ExpiresByType image/webp "access plus 1 year"
ExpiresByType image/jpeg "access plus 1 year"
ExpiresByType image/png "access plus 1 year"
ExpiresByType font/woff2 "access plus 1 year"
ExpiresByType text/css "access plus 1 month"
ExpiresByType application/javascript "access plus 1 month"
</IfModule>
AddType font/woff2 .woff2
AddType application/manifest+json .webmanifest
""")
    # Cloudflare Pages: Caching-Regeln (ersetzt .htaccess)
    open(P("dist/_headers"), "w").write("""/assets/*
  Cache-Control: public, max-age=31536000, immutable
/assets/css/*
  Cache-Control: public, max-age=86400
/assets/js/*
  Cache-Control: public, max-age=86400
/downloads/*
  Content-Disposition: attachment
  X-Robots-Tag: noindex
/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
""")
    # preview (single file for the artifact)
    full = index_page(Ctx("./", preview=True))
    body = full[full.index("<title>"):full.index("</head>")] + full[full.index("<body>") + 6:full.index("</body>")]
    body = "\n".join(l for l in body.split("\n") if not l.startswith(('<link rel="canonical"', '<link rel="alternate"', '<link rel="manifest"', '<link rel="apple-touch-icon"', '<link rel="icon" href')))
    open(P("preview.html"), "w", encoding="utf-8").write(body)
    print("ok", sum(os.path.getsize(os.path.join(r, f)) for r, _, fs in os.walk(d) for f in fs) // 1024, "KB dist;", os.path.getsize(P("preview.html")) // 1024, "KB preview")

if __name__ == "__main__":
    main()
