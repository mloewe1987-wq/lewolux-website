"""Hilfen für Controller-Tests mit Playwright (simulierter Xbox-Controller).
Beispiel:
    from pad import *
    with session() as s:
        pg = s.page("pandi", "tv")          # Größen: phone, phoneL, pc, tv, tv4k
        connect(pg); press(pg, "down"); press(pg, "a"); shot(pg, "pandi-test")
"""
import contextlib, time, os
from playwright.sync_api import sync_playwright
OUT = os.environ.get("PADTEST_OUT", "/tmp/padtest")
os.makedirs(OUT, exist_ok=True)
SIZES = {"phone": (390, 844, 2, True), "phoneL": (844, 390, 2, True), "pc": (1366, 768, 1, False),
         "tv": (960, 540, 1, False), "tv1080": (1920, 1080, 1, False)}
BTN = {n: i for i, n in enumerate(['a','b','x','y','lb','rb','lt','rt','back','start','ls','rs','up','down','left','right','home'])}
MOCK = """
(()=>{const mk=()=>({pressed:false,touched:false,value:0});
window.__gp={id:'Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e)',index:0,connected:false,mapping:'standard',
 buttons:Array.from({length:17},mk),axes:[0,0,0,0],timestamp:0};
const real=navigator.getGamepads&&navigator.getGamepads.bind(navigator);
navigator.getGamepads=()=>window.__gp.connected?[window.__gp,null,null,null]:[null,null,null,null];
window.__padSet=(i,on)=>{const b=window.__gp.buttons[i];b.pressed=on;b.value=on?1:0;window.__gp.timestamp++;
  for(const f of document.querySelectorAll('iframe'))try{f.contentWindow.__padSet&&f.contentWindow.__padSet(i,on)}catch(e){}};
window.__padAx=(i,v)=>{window.__gp.axes[i]=v;window.__gp.timestamp++;for(const f of document.querySelectorAll('iframe'))try{f.contentWindow.__padAx&&f.contentWindow.__padAx(i,v)}catch(e){}};
window.__padConnect=()=>{window.__gp.connected=true;const e=new Event('gamepadconnected');e.gamepad=window.__gp;window.dispatchEvent(e);
  for(const f of document.querySelectorAll('iframe'))try{f.contentWindow.__padConnect&&f.contentWindow.__padConnect()}catch(e){}};
})();"""
class S:
    def __init__(self, p, port):
        self.b = p.chromium.launch(args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--autoplay-policy=no-user-gesture-required"])
        self.port = port; self.errs = []
    def page(self, game, size="tv", path=None):
        w, h, d, m = SIZES[size]
        ctx = self.b.new_context(viewport={"width": w, "height": h}, device_scale_factor=d, is_mobile=m, has_touch=m)
        ctx.add_init_script(MOCK)
        pg = ctx.new_page(); pg.on("pageerror", lambda e: self.errs.append(f"{game}/{size}: {str(e)[:300]}"))
        url = path or f"http://127.0.0.1:{self.port}/{game}/index.html"
        pg.goto(url); pg.wait_for_timeout(1500)
        return pg
@contextlib.contextmanager
def session(port=8770):
    with sync_playwright() as p:
        s = S(p, port)
        try: yield s
        finally:
            if s.errs: print("JS-FEHLER:", *s.errs, sep="\n  ")
            s.b.close()
def connect(pg): pg.evaluate("__padConnect()"); pg.wait_for_timeout(300)
def press(pg, name, hold=450, after=450):
    i = BTN[name]; pg.evaluate(f"__padSet({i},true)"); pg.wait_for_timeout(hold); pg.evaluate(f"__padSet({i},false)"); pg.wait_for_timeout(after)
def hold(pg, name, on=True): pg.evaluate(f"__padSet({BTN[name]},{'true' if on else 'false'})")
def stick(pg, x=0, y=0, ms=0, right=False):
    o = 2 if right else 0
    pg.evaluate(f"__padAx({o},{x});__padAx({o+1},{y})")
    if ms: pg.wait_for_timeout(ms); pg.evaluate(f"__padAx({o},0);__padAx({o+1},0)")
def focused(pg):
    return pg.evaluate("(()=>{const f=window.LXPAD&&LXPAD.focused;if(!f)return null;return (f.getAttribute('aria-label')||f.textContent||f.tagName).replace(/\\s+/g,' ').trim().slice(0,60)})()")
def shot(pg, name): f = os.path.join(OUT, name + ".png"); pg.screenshot(path=f, timeout=60000); return f
