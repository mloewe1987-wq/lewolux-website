"""Erzeugt aus echten Spielszenen packende Vorschaubilder (1280x720) nach ../screenshots-echt/<id>-1..3.png"""
import asyncio, os, base64, html
from playwright.async_api import async_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "screenshots-echt"); os.makedirs(OUT, exist_ok=True)
FS = os.path.join(HERE, "..", "fontsrc", "node_modules", "@fontsource")

def font(fam, slug, w, style="normal"):
    f = os.path.join(FS, slug, "files", f"{slug}-latin-{w}-{style}.woff2")
    return f"@font-face{{font-family:'{fam}';font-weight:{w};font-style:{style};src:url(data:font/woff2;base64,{base64.b64encode(open(f,'rb').read()).decode()})}}"
FONTS = "".join([font("Anton","anton",400), font("Bungee","bungee",400), font("Orbitron","orbitron",900),
                 font("Jakarta","plus-jakarta-sans",700), font("Jakarta","plus-jakarta-sans",800)])

def img(name): return "data:image/png;base64," + base64.b64encode(open(os.path.join(HERE, "src", name + ".png"), "rb").read()).decode()

BASE = """*{margin:0;box-sizing:border-box}html,body{width:1280px;height:720px;overflow:hidden;background:#05060c}
.bg{position:absolute;inset:-40px;background-size:cover;background-position:center;filter:blur(18px) saturate(1.3) brightness(.55)}
.grain{position:absolute;inset:0;background:radial-gradient(ellipse at 70% 40%,transparent 30%,rgba(0,0,0,.65) 100%)}
.glow{position:absolute;width:900px;height:900px;border-radius:50%;filter:blur(90px);opacity:.38}
.streak{position:absolute;top:-200px;left:520px;width:120px;height:1200px;transform:rotate(28deg);background:linear-gradient(90deg,transparent,rgba(255,255,255,.07),transparent)}
"""

def capsule(g):
    a = g["accent"]
    hook = "".join(f"<div>{l.replace('*', '<em>', 1).replace('*', '</em>', 1)}</div>" for l in g["hook"])
    if g.get("phones"):
        ph = g["phones"]
        visual = "".join(f'<div class="phone p{i}"><img src="{img(n)}"></div>' for i, n in enumerate(ph))
    else:
        visual = f'<div class="screen"><img src="{img(g["hero"])}"></div>'
    hf = g.get("hfont", "Anton")
    return f"""<html><head><style>{FONTS}{BASE}
.glow.a{{background:{a};right:-260px;top:-220px}}.glow.b{{background:{g.get('accent2','#3be8ff')};left:-420px;bottom:-520px;opacity:.22}}
.shade{{position:absolute;inset:0;background:linear-gradient(90deg,rgba(5,6,12,.96) 0%,rgba(5,6,12,.82) 34%,rgba(5,6,12,.15) 62%,transparent 80%)}}
.text{{position:absolute;left:64px;top:0;bottom:0;width:640px;display:flex;flex-direction:column;justify-content:center;z-index:5}}
.name{{font:900 22px/1 Orbitron;letter-spacing:.32em;color:{a};text-shadow:0 0 18px {a}aa}}
.hook{{font:400 {g.get('hsize',92)}px/0.98 '{hf}';color:#fff;text-transform:uppercase;margin-top:22px;letter-spacing:.005em;text-shadow:0 6px 30px rgba(0,0,0,.8)}}
.hook em{{font-style:normal;color:{a};text-shadow:0 0 34px {a}cc,0 6px 30px rgba(0,0,0,.6)}}
.sub{{font:700 23px/1.4 Jakarta;color:#d6dbea;margin-top:24px;max-width:540px}}
.badges{{display:flex;gap:10px;margin-top:30px}}
.b{{font:800 15px/1 Jakarta;letter-spacing:.12em;text-transform:uppercase;padding:12px 16px;border-radius:8px;border:2px solid rgba(255,255,255,.25);color:#fff;background:rgba(255,255,255,.06)}}
.b.k{{background:{a};border-color:{a};color:#0b0b12;box-shadow:0 0 28px {a}99}}
.screen{{position:absolute;right:-70px;top:50%;width:760px;transform:translateY(-50%) perspective(1600px) rotateY(-16deg) rotateZ(1.5deg);border-radius:14px;overflow:hidden;
  box-shadow:0 0 0 2px {a}88,0 0 80px {a}55,0 40px 90px rgba(0,0,0,.8)}}
.screen img{{display:block;width:100%}}
.phone{{position:absolute;width:300px;border-radius:34px;padding:10px;background:#0c0d16;box-shadow:0 0 0 2px {a}99,0 0 70px {a}55,0 40px 80px rgba(0,0,0,.85)}}
.phone img{{display:block;width:100%;border-radius:25px}}
.phone.p0{{right:250px;top:50%;transform:translateY(-50%) rotate(-5deg);z-index:3}}
.phone.p1{{right:-20px;top:50%;transform:translateY(-46%) rotate(7deg) scale(.9);z-index:2;opacity:.95}}
</style></head><body>
<div class="bg" style="background-image:url({img(g['bgimg'])})"></div><div class="glow a"></div><div class="glow b"></div><div class="streak"></div>
{visual}<div class="shade"></div><div class="grain"></div>
<div class="text"><div class="name">{html.escape(g['name'])}</div><div class="hook">{hook}</div><div class="sub">{html.escape(g['sub'])}</div>
<div class="badges"><span class="b k">Kostenlos spielen</span><span class="b">Early Access</span><span class="b">PC &amp; Handy</span></div></div>
</body></html>"""

def scene(g, shot):
    a = g["accent"]
    if isinstance(shot, list):  # Handy-Screens
        inner = "".join(f'<div class="phone" style="transform:rotate({(i-(len(shot)-1)/2)*4}deg)"><img src="{img(n)}"></div>' for i, n in enumerate(shot))
        vis = f'<div class="row">{inner}</div>'; bgimg = shot[0]
    else:
        vis = f'<div class="screen"><img src="{img(shot)}"></div>'; bgimg = shot
    return f"""<html><head><style>{BASE}
.glow.a{{background:{a};left:50%;top:50%;transform:translate(-50%,-50%);opacity:.25}}
.screen{{position:absolute;inset:34px 0;display:flex;justify-content:center;align-items:center}}
.screen img{{max-width:1212px;max-height:652px;border-radius:12px;box-shadow:0 0 0 2px {a}66,0 0 70px {a}44,0 30px 80px rgba(0,0,0,.8);filter:saturate(1.15) contrast(1.06)}}
.row{{position:absolute;inset:0;display:flex;justify-content:center;align-items:center;gap:56px}}
.phone{{width:300px;border-radius:34px;padding:10px;background:#0c0d16;box-shadow:0 0 0 2px {a}88,0 0 60px {a}44,0 30px 70px rgba(0,0,0,.85)}}
.phone img{{display:block;width:100%;border-radius:25px}}
</style></head><body><div class="bg" style="background-image:url({img(bgimg)})"></div><div class="glow a"></div><div class="grain"></div>{vis}</body></html>"""

GAMES = {
 "mandat": dict(name="MANDAT", accent="#f5b82e", hook=["Wie weit", "kommst *du*?"],
   sub="Vom Dorf ins Kanzleramt. Eine vertrauliche Akte. Jede Entscheidung zählt.",
   hero="mandat-akte", bgimg="mandat-title", shots=["mandat-char", "mandat-room"]),
 "sternenwurf": dict(name="STERNENWURF", accent="#b48cff", accent2="#ffcf5a", hook=["Das Glück", "fällt vom", "*Himmel*."],
   sub="Wirf nach den Sternen und jag die seltensten Würfe. Wie viel Glück hast du?",
   hero="stern-title", bgimg="stern-title", shots=["stern-tal2", "stern-title"]),
 "idle-legenden": dict(name="IDLE LEGENDEN", accent="#ffcf5a", accent2="#7ef0ff", hook=["Bring die Stadt", "zum *Leuchten*."], hsize=84,
   sub="Der Graue Schleier liegt über Goldhafen. Nur du kannst ihn vertreiben.",
   hero="idle-dialog2", bgimg="idle-map", shots=["idle-map", "idle-title"]),
 "wrestling-tcg": dict(name="RING LEGENDS", accent="#ff3b5c", accent2="#3b7bff", hook=["Reiß das", "Pack *auf*!"], hfont="Bungee", hsize=78,
   sub="250 Karten, Holo-Raritäten und jeden Tag Gratis-Packs. Wer wird deine Legende?",
   phones=["ring-card", "ring-pack"], bgimg="ring-pack", shots=[["ring-pack", "ring-back"], ["ring-intro", "ring-card"]]),
 "kritzelheld": dict(name="KRITZELHELD", accent="#38bdf8", accent2="#ff8a3d", hook=["Schreiben", "lernen wie", "ein *Held*."],
   sub="15 Lernspiele für Kinder, mit Eule Kritzel und Federn zum Sammeln.",
   phones=["kritzelheld-k0", "kritzelheld-k3"], bgimg="kritzelheld-k2", shots=[["kritzelheld-k3", "kritzelheld-k2"], ["kritzelheld-k0", "kritzelheld-k2"]]),
 "kasse-oder-zettel": dict(name="KASSE ODER ZETTEL?", accent="#ff8a1f", accent2="#22c55e", hook=["Volles Haus.", "Nur ein", "*Block*."],
   sub="Pizzeria, Freitagabend, Zettel und Stift. Schaffst du die Schicht, oder gewinnt das Chaos?",
   hero="kasse-play", bgimg="kasse-play", shots=["kasse-title", "kasse-level"]),
}

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={"width": 1280, "height": 720})
        for gid, g in GAMES.items():
            for i, doc in enumerate([capsule(g)] + [scene(g, s) for s in g["shots"]]):
                await pg.set_content(doc); await pg.wait_for_timeout(250)
                await pg.screenshot(path=os.path.join(OUT, f"{gid}-{i+1}.png")); print(gid, i + 1)
        await b.close()
asyncio.run(main())
