"""Korrektur für die älteren Piper-Stimmen (kerstin, thorsten-low …): espeak liefert „ç“ (ich, nicht, Mädchen)
als „c“ + Cedille. Die Stimme kennt nur das fertige „ç“ – ohne Korrektur wird aus „ich“ ein Kauderwelsch.
Einfach `import piper_fix` vor PiperVoice.load(...)."""
import unicodedata
from piper import PiperVoice
_orig = PiperVoice.phonemize
def _fixed(self, text):
    return [list(unicodedata.normalize("NFC", "".join(sent))) for sent in _orig(self, text)]
PiperVoice.phonemize = _fixed
