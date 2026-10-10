# Baut das Controller-Modul (parts/lx-pad.js) in Spiele-HTML ein.
# Wird von build.py benutzt (Website und Download-Dateien) und vom Test-Server (werkzeuge/padtest/serve.py).
import os, re
HERE = os.path.dirname(os.path.abspath(__file__))
MARK = "<!--lx-pad-->"

def pad_js():
    return open(os.path.join(HERE, "parts", "lx-pad.js"), encoding="utf-8").read()

def extras(gid):
    """Spielspezifische Ergänzungen aus spiele-extras/<id>.html (z. B. für Spiele, die aus einem eigenen Repo kommen)."""
    f = os.path.join(HERE, "spiele-extras", (gid or "") + ".html")
    return open(f, encoding="utf-8").read() if gid and os.path.isfile(f) else ""

def inject(html_text, gid=None):
    """Hängt Spiel-Extras und das Modul ans Ende des <body> (einmalig)."""
    if MARK in html_text: return html_text
    tag = MARK + extras(gid) + "<script>" + pad_js().replace("</script", "<\\/script") + "</script>"
    i = html_text.lower().rfind("</body>")
    if i < 0: i = html_text.lower().rfind("</html>")
    if i < 0: return html_text + tag
    return html_text[:i] + tag + html_text[i:]

def inject_file(path, gid=None):
    s = open(path, encoding="utf-8").read()
    open(path, "w", encoding="utf-8").write(inject(s, gid or os.path.basename(os.path.dirname(path))))
