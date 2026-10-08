"""Nimmt alle Ansagen von Kritzelheld mit der Piper-Stimme "Kerstin" (low, CC0) auf.

Aufruf:  python3 kritzel-voice-render.py [kritzel-voice-phrases.json]

kritzel-voice-phrases.json: [{"t": Text wie im Spiel, "s": was gesprochen wird}]
  Die Liste kommt aus dem Spiel selbst: voicePhrases() + alle Knopf-Beschriftungen
  (Sammel-Skript: node kritzel-voice-collect.js, siehe dort).
Ergebnis:
  spiele-dateien/kritzelheld/voice/<id>.mp3   (id = sha1("v3|" + Text)[:10], Text genau wie im Spiel, z. B. "Spielen!")
  VOICE_MAP in spiele-dateien/kritzelheld/index.html wird neu eingetragen.
Vorhandene Dateien werden übersprungen, nicht mehr gebrauchte gelöscht.
Umgebung: KRITZEL_BITRATE (Standard 24k), KRITZEL_RATE (Standard 16000 Hz, das Modell hat 16 kHz), KRITZEL_MODEL.
"""
import hashlib, json, os, re, subprocess, sys, tempfile, wave
from piper import PiperVoice
import sys as _s, os as _o; _s.path.insert(0, _o.path.dirname(_o.path.abspath(__file__))); import piper_fix
from piper.config import SynthesisConfig

HERE = os.path.dirname(os.path.abspath(__file__))
GAME = os.path.join(HERE, "spiele-dateien", "kritzelheld")
OUT = os.path.join(GAME, "voice")
HTML = os.path.join(GAME, "index.html")
MODEL = os.environ.get("KRITZEL_MODEL", "/home/claude/tts/de-kerstin-low/de-kerstin-low.onnx")
BITRATE = os.environ.get("KRITZEL_BITRATE", "24k")
FILTER = ("silenceremove=start_periods=1:start_threshold=-60dB,areverse,"
          "silenceremove=start_periods=1:start_threshold=-60dB,areverse,"
          "asetrate=16000*1.10,aresample=44100,atempo=0.909,highpass=f=90,loudnorm=I=-13:TP=-1,"
          "apad=pad_dur=0.12")  # höher (niedlich), aber nicht schneller; 120 ms Luft am Ende

src = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "kritzel-voice-phrases.json")
lines = json.load(open(src, encoding="utf-8"))
lines = [x for x in lines if re.search(r"[0-9A-Za-zÄÖÜäöüß]", x["t"])]  # nur Sprechbares
ident = lambda t: hashlib.sha1(("v3|" + t).encode("utf-8")).hexdigest()[:10]  # v3: neue Namen, damit Handys keine alten Aufnahmen aus dem Zwischenspeicher spielen
os.makedirs(OUT, exist_ok=True)
want = {ident(x["t"]): x for x in lines}

for f in os.listdir(OUT):
    if f.endswith(".mp3") and f[:-4] not in want:
        os.remove(os.path.join(OUT, f))

# Prüfen: kennt die Stimme alle Laute? (sonst klingt es nach Kauderwelsch)
voice = PiperVoice.load(MODEL)
idmap = voice.config.phoneme_id_map
missing = {}
for x in lines:
    for sent in voice.phonemize(x.get("s") or x["t"]):
        for ph in sent:
            if ph not in idmap:
                missing.setdefault(x["t"], set()).add(ph)
for t, phs in missing.items():
    print("FEHLENDE LAUTE", sorted(phs), "in:", t)
if missing:
    sys.exit("Bitte diese Texte umschreiben (Feld s in der Phrasenliste).")
cfg = SynthesisConfig(length_scale=1.3, noise_scale=0.5, noise_w_scale=0.6)  # langsam und deutlich
done = 0
for h, x in want.items():
    dst = os.path.join(OUT, h + ".mp3")
    if os.path.exists(dst):
        continue
    if voice is None:
        voice = PiperVoice.load(MODEL)
    with tempfile.NamedTemporaryFile(suffix=".wav") as tmp:
        with wave.open(tmp.name, "wb") as w:
            voice.synthesize_wav(x.get("s") or x["t"], w, syn_config=cfg)
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", tmp.name, "-af", FILTER,
                        "-ar", os.environ.get("KRITZEL_RATE", "16000"), "-ac", "1", "-b:a", BITRATE, dst], check=True)
    done += 1
    if done % 100 == 0:
        print(done, "neu …", flush=True)

# Zuordnung Text → Datei ins Spiel schreiben
manifest = json.dumps({x["t"]: h for h, x in sorted(want.items(), key=lambda kv: kv[1]["t"])}, ensure_ascii=False, separators=(",", ":"))
html = open(HTML, encoding="utf-8").read()
html, n = re.subn(r"/\*@@VOICE-MANIFEST\*/.*?/\*@@VOICE-END\*/", lambda m: "/*@@VOICE-MANIFEST*/" + manifest + "/*@@VOICE-END*/", html, flags=re.S)
if n != 1:
    sys.exit("VOICE-Marker nicht gefunden")
open(HTML, "w", encoding="utf-8").write(html)
size = sum(os.path.getsize(os.path.join(OUT, f)) for f in os.listdir(OUT))
print(len(want), "Ansagen,", done, "neu aufgenommen,", size // 1024, "KB")
