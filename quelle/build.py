import re
#!/usr/bin/env python3
"""Baut die Lewolux-Studio-Website.

   python3 build.py   ->  dist/          Hosting-Paket (alles in den Webspace hochladen)
                          preview.html   Einzeldatei-Vorschau

   Anpassen: SITE, EMAIL, LINKS hier oben; Texte in data.py."""
import base64, html, json, os, shutil, datetime, asyncio, io
from PIL import Image
from data import GAMES, SOFTWARE, FAQ, ICONS, PLAY, DL, SEO
from manuals import MANUALS, SOFTWARE_PAGES

SITE = "https://lewolux.de/"      # <- eigene Domain eintragen (mit / am Ende)
API = os.environ.get("LWX_API", "https://api.lewolux.de/")         # Umfrage & Feedback (Cloudflare Worker, siehe feedback-worker/ANLEITUNG.md)
EMAIL = "hallo@lewolux.de"
# DeskBoard-Download: entweder Datei nach software-dateien/deskboard/DeskBoard-Setup.exe legen (max. 25 MB)
# oder hier den Link eintragen, z. B. GitHub Releases: "https://github.com/NAME/deskboard/releases/latest/download/DeskBoard-Setup.exe"
DESKBOARD_URL = ""            # <- eigene Adresse eintragen
LINKS = dict(DISCORD="#", TIKTOK="#", YOUTUBE="#", ITCH="#")
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
    def dl(self, g): return f"{self.root}{g['download']['file']}" if has_game(g) else None

G_TIP = '''<div class="dl-tip slim"><div><p class="rec-k">★ Empfohlen: der Download</p><ul class="tip-list"><li><b>Startet sofort</b>, ohne Ladezeit</li><li><b>Läuft offline</b>, überall, auch ohne Internet</li><li><b>Eine Datei</b>: nichts installieren, kein Account, keine Werbung</li><li><b>Deine Version gehört dir</b>, dein Spielstand bleibt auf deinem Gerät</li></ul><p class="tip-how">Am PC per Doppelklick öffnen, auf Android über „Downloads“ mit Chrome. Auf dem iPhone spielst du am besten direkt im Browser.</p></div></div>'''

def dl_btn(c, g, label, aria=False):
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
    css = f'<style>{part("style.css")}</style>' if c.preview else f'<link rel="stylesheet" href="{c.root}assets/css/site.css">'
    fonts = GFONTS if c.preview else f'<link rel="preload" href="{c.root}assets/fonts/orbitron-latin-900-normal.woff2" as="font" type="font/woff2" crossorigin><link rel="preload" href="{c.root}assets/fonts/plus-jakarta-sans-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>'
    return f'''<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
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

def common(c, t):
    rep = {"{{ROOT}}": c.root, "{{EMAIL}}": EMAIL, "{{GAMECOUNT}}": str(len(GAMES)),
           "{{FOOTGAMES}}": "".join(f'<li><a href="{c.page(g)}">{e(g["short"])}</a></li>' for g in GAMES),
           "{{IMPRESSUM}}": f"{c.root}impressum/", "{{DATENSCHUTZ}}": f"{c.root}datenschutz/"}
    rep.update({"{{%s}}" % k: v for k, v in LINKS.items()})
    for k, v in rep.items(): t = t.replace(k, v)
    if c.preview:
        t = t.replace(f'src="{c.root}assets/img/lewolux-studio-logo.jpg"', f'src="{c.img("lewolux-studio-logo.jpg")}"')
    assert "{{" not in t, t[t.index("{{"):t.index("{{") + 60]
    return t

def tail(c):
    js = f"<script>{part('app.js')}</script>" if c.preview else f'<script src="{c.root}assets/js/app.js" defer></script>'
    return f'{part("modal.html")}\n<script id="game-data" type="application/json">{game_data(c)}</script>\n{js}\n</body>\n</html>\n'

# ---------------------------------------------------------------- community
KIND_OPTS = [("wunsch", "Wunsch"), ("idee", "Idee"), ("bug", "Fehler gefunden"), ("lob", "Lob")]
def feedback_form(c, game=None):
    opts = "".join(f'<option value="{g["id"]}"{" selected" if game == g["id"] else ""}>{e(g["short"])}</option>' for g in GAMES)
    kinds = "".join(f'<label class="kind"><input type="radio" name="kind" value="{k}"{" checked" if i == 0 else ""}><span>{e(t)}</span></label>' for i, (k, t) in enumerate(KIND_OPTS))
    gsel = (f'<input type="hidden" name="game" value="{game}">' if game else
            f'<label class="fld"><span>Worum geht es?</span><select name="game"><option value="allgemein">Allgemein / Website</option>{opts}</select></label>')
    return f'''        <form class="cm-card fb-form" novalidate>
          <p class="cm-k">Feedback</p>
          <h3>{("Deine Meinung zu " + e(next(g["short"] for g in GAMES if g["id"] == game))) if game else "Wünsche, Ideen, Fehler? Her damit!"}</h3>
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
    return "\n".join(f'''            <li><button type="button" class="poll-opt" data-choice="{g['id']}" style="--accent:{g['accent']}"><span class="po-img"><img src="{c.shot(g['id']+'-1', True)}" alt="" loading="lazy" width="96" height="54"></span><span class="po-name">{e(g['short'])}</span><span class="po-bar"><i></i></span><span class="po-pct"></span></button></li>''' for g in GAMES)

def game_feedback(c, g):
    return f'''  <section class="community" aria-labelledby="fb-h" data-api="{API}" style="padding-bottom:0"><div class="sec-head"><div><span class="eyebrow">Community</span><h2 id="fb-h">Wünsche &amp; Feedback zu {e(g['short'])}</h2><p>{e(g['short'])} ist in Entwicklung. Sag uns, was rein soll, was dich stört und was du feierst.</p></div></div>
    <div class="cm-grid">
{feedback_form(c, g['id'])}
      <div class="cm-list" id="cmList" data-game="{g['id']}" aria-live="polite"><p class="cm-empty">Noch keine Beiträge zu {e(g['short'])}. Schreib den ersten!</p></div>
    </div>
  </section>
'''


# ---------------------------------------------------------------- Handbuch & Software
def deskboard_dl(c):
    f = P("software-dateien", "deskboard", "DeskBoard-Setup.exe")
    if os.path.isfile(f) and os.path.getsize(f) < 25 * 1024 * 1024: return f"{c.root}downloads/DeskBoard-Setup.exe"
    return DESKBOARD_URL or None

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
    if sid == "deskboard": app["offers"] = {"@type": "Offer", "price": "0", "priceCurrency": "EUR"}
    if dl and sid == "deskboard": app["downloadUrl"] = dl if dl.startswith("http") else SITE + "downloads/DeskBoard-Setup.exe"
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

# ---------------------------------------------------------------- pages
def index_page(c):
    feat = GAMES[0]
    faq = "\n".join(f'        <details><summary>{e(q)}</summary><p>{e(a)}</p></details>' for q, a in FAQ)
    main = part("index-main.html")
    if c.preview:
        main = main.replace('<picture><source type="image/webp" srcset="{{ROOT}}assets/img/lewolux-studio-banner.webp"><img src="{{ROOT}}assets/img/lewolux-studio-banner.jpg"', f'<picture><img src="{c.img("lewolux-studio-banner.webp")}"')
        main = main.replace('src="{{ROOT}}assets/screenshots/{{FEAT}}-1.jpg"', f'src="{c.shot(feat["id"]+"-1")}"')
    main = (main.replace("{{CARDS}}", "\n".join(card(c, g, i) for i, g in enumerate(GAMES)))
                .replace("{{REEL}}", "\n".join(reel(c, g) for g in GAMES))
                .replace("{{SOFTWARE}}", "\n".join(sw(c, s) for s in SOFTWARE)).replace("{{FAQ}}", faq)
                .replace("{{POLL}}", poll_items(c)).replace("{{FEEDBACKFORM}}", feedback_form(c)).replace("{{API}}", API)
                .replace("{{FEAT}}", feat["id"]).replace("{{FEATNAME}}", e(feat["short"])))
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
    faqh = "".join(f"<details><summary>{e(q)}</summary><p>{e(a)}</p></details>" for q, a in faq)
    more = "".join(f'<a class="mg" href="{c.page(o)}">{pic(c, o["id"]+"-1", "Screenshot aus "+o["short"], "260px")}<span>{e(o["short"])}</span></a>' for o in GAMES if o["id"] != g["id"])
    long = "".join(f"<p>{p}</p>" for p in s["long"])
    shots_abs = [f"{SITE}assets/screenshots/{g['id']}-{i+1}.jpg" for i in range(3)]
    jsonld = [{"@context": "https://schema.org", "@graph": [ORG,
        {"@type": "VideoGame", "@id": SITE + url + "#game", "name": g["title"], "url": SITE + url, "description": s["meta"], "genre": g["genres"],
         "gamePlatform": ["Web-Browser"] + (["Android"] if "android" in g["plats"] else []) + (["Smartphone"] if "mobile" in g["plats"] else []),
         "applicationCategory": "Game", "operatingSystem": "Web, Windows, macOS, Android", "playMode": "SinglePlayer", "inLanguage": "de",
         "isAccessibleForFree": True, "image": shots_abs[0], "screenshot": [{"@type": "ImageObject", "url": u, "caption": cap} for u, cap in zip(shots_abs, g["shots"])],
         "author": {"@id": SITE + "#studio"}, "publisher": {"@id": SITE + "#studio"},
         "offers": {"@type": "Offer", "price": "0", "priceCurrency": "EUR", "availability": "https://schema.org/InStock", "url": SITE + url}},
        {"@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Start", "item": SITE},
            {"@type": "ListItem", "position": 2, "name": "Spiele", "item": SITE + "#spiele"}, {"@type": "ListItem", "position": 3, "name": g["short"], "item": SITE + url}]},
        {"@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faq]}]}]
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
  <div class="g-cols">
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
    logo = Image.open(P("logo.jpg")).convert("RGB")
    logo.save(P("dist/assets/img/lewolux-studio-logo.jpg"), quality=88)
    logo.resize((192, 192)).save(P("dist/assets/img/icon-192.png")); logo.resize((512, 512), Image.LANCZOS).save(P("dist/assets/img/icon-512.png"))
    logo.resize((180, 180), Image.LANCZOS).save(P("dist/apple-touch-icon.png")); logo.save(P("dist/favicon.ico"), sizes=[(32, 32), (48, 48)])
    for g in GAMES: og_image(P(f"dist/assets/screenshots/{g['id']}-1.jpg"), P(f"dist/assets/og/og-{g['id']}.jpg"))
    # fonts, css, js
    for fam, slug, ws in FONTS:
        for w in ws: shutil.copy(P(f"fontsrc/node_modules/@fontsource/{slug}/files/{slug}-latin-{w}-normal.woff2"), P("dist/assets/fonts"))
    open(P("dist/assets/css/site.css"), "w", encoding="utf-8").write(font_face("../fonts/") + "\n" + part("style.css"))
    open(P("dist/assets/js/app.js"), "w", encoding="utf-8").write(part("app.js"))
    # echte Spiele kopieren
    for g in GAMES:
        if has_game(g):
            shutil.copytree(P("spiele-dateien", g["id"]), P("dist/games", g["id"]))
            open(P("dist", g["download"]["file"]), "w", encoding="utf-8").write(standalone(g))
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
    _f = P("software-dateien", "deskboard", "DeskBoard-Setup.exe")
    if os.path.isfile(_f) and os.path.getsize(_f) < 25 * 1024 * 1024: shutil.copy(_f, P("dist/downloads/DeskBoard-Setup.exe"))
    todo = '<p class="todo">Platzhalter: Hier müssen die Pflichtangaben eingetragen werden. Bitte mit einem Generator (z. B. e-recht24.de) oder anwaltlich erstellen lassen.</p>'
    for slug, title in (("impressum", "Impressum"), ("datenschutz", "Datenschutzerklärung")):
        os.makedirs(P(f"dist/{slug}"), exist_ok=True)
        open(P(f"dist/{slug}/index.html"), "w", encoding="utf-8").write(simple_page(Ctx("../"), slug + "/", title, part(f"{slug}.html")))
    os.makedirs(P("dist/admin"), exist_ok=True)
    open(P("dist/admin/index.html"), "w", encoding="utf-8").write(part("admin.html").replace("{{API}}", API).replace("{{GAMES}}", json.dumps({g["id"]: g["short"] for g in GAMES}, ensure_ascii=False)))
    open(P("dist/404.html"), "w", encoding="utf-8").write(simple_page(Ctx("/"), "404", "Seite nicht gefunden", '<p class="prose">Diese Seite gibt es nicht. <a href="/">Zur Startseite</a> oder direkt zu den <a href="/#spiele">Spielen</a>.</p>').replace('content="noindex, follow"', 'content="noindex"'))
    # seo files
    today = datetime.date.today().isoformat()
    def u(loc, imgs, prio):
        im = "".join(f"<image:image><image:loc>{SITE}{i}</image:loc></image:image>" for i in imgs)
        return f"  <url><loc>{SITE}{loc}</loc><lastmod>{today}</lastmod><changefreq>weekly</changefreq><priority>{prio}</priority>{im}</url>\n"
    sm = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n'
    sm += u("", ["assets/img/lewolux-studio-banner.jpg"] + [f"assets/screenshots/{g['id']}-1.jpg" for g in GAMES], "1.0")
    sm += "".join(u(f"spiele/{g['id']}/", [f"assets/screenshots/{g['id']}-{i+1}.jpg" for i in range(3)], "0.8") for g in GAMES)
    sm += "".join(u(f"software/{x['id']}/", [f"assets/screenshots/software-{x['id']}.jpg"], "0.7") for x in SOFTWARE)
    open(P("dist/sitemap.xml"), "w").write(sm + "</urlset>\n")
    open(P("dist/robots.txt"), "w").write(f"User-agent: *\nAllow: /\nDisallow: /downloads/\nDisallow: /admin/\n\nSitemap: {SITE}sitemap.xml\n")
    open(P("dist/site.webmanifest"), "w").write(json.dumps({"name": "Lewolux Studio", "short_name": "Lewolux", "start_url": "/", "display": "standalone", "background_color": "#0a0b10", "theme_color": "#0a0b10",
        "icons": [{"src": "/assets/img/icon-192.png", "sizes": "192x192", "type": "image/png"}, {"src": "/assets/img/icon-512.png", "sizes": "512x512", "type": "image/png"}]}, indent=1))
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
