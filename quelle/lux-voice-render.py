"""Nimmt alle Antworten von Lux mit der Piper-Stimme "Thorsten" high (CC0) auf.
Aufruf: python3 lux-voice-render.py lines.json   (lines.json: [{h,t,s}] aus /#luxlines)"""
import json, os, subprocess, sys, wave, tempfile
from piper import PiperVoice
import sys as _s, os as _o; _s.path.insert(0, _o.path.dirname(_o.path.abspath(__file__))); import piper_fix
from piper.config import SynthesisConfig
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, "lux-voice")
MODEL = os.environ.get("LUX_MODEL", "/home/claude/tts/thorsten-high/de_DE-thorsten-high.onnx")
lines = json.load(open(sys.argv[1], encoding="utf-8"))
voice = PiperVoice.load(MODEL)
cfg = SynthesisConfig(length_scale=0.93, noise_scale=0.6, noise_w_scale=0.75)
keep = {x["h"] for x in lines}
for f in os.listdir(OUT):
    if f.endswith(".mp3") and f[:-4] not in keep: os.remove(os.path.join(OUT, f))
for x in lines:
    dst = os.path.join(OUT, x["h"] + ".mp3")
    if os.path.exists(dst): continue
    with tempfile.NamedTemporaryFile(suffix=".wav") as tmp:
        with wave.open(tmp.name, "wb") as w: voice.synthesize_wav(x["s"], w, syn_config=cfg)
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", tmp.name, "-af",
            "highpass=f=80,equalizer=f=3500:t=q:w=1.2:g=3,acompressor=threshold=-20dB:ratio=3:attack=5:release=80,loudnorm=I=-16:TP=-1.5",
            "-ar", "22050", "-ac", "1", "-b:a", "64k", dst], check=True)
print(len(lines), "Zeilen,", sum(os.path.getsize(os.path.join(OUT, f)) for f in os.listdir(OUT)) // 1024, "KB")
