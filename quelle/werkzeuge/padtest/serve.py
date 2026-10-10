#!/usr/bin/env python3
"""Test-Server: liefert quelle/spiele-dateien aus und baut dabei das Controller-Modul ein (wie build.py).
Aufruf: python3 serve.py [port]   ->  http://localhost:PORT/<spiel>/index.html"""
import sys, os, http.server, functools
Q = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, Q)
import pad_inject
ROOT = os.path.join(Q, "spiele-dateien")
class H(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
    def do_GET(self):
        p = self.path.split("?")[0]
        if p.endswith("/"): p += "index.html"
        f = os.path.join(ROOT, p.lstrip("/"))
        if p.endswith(".html") and os.path.isfile(f):
            b = pad_inject.inject(open(f, encoding="utf-8").read(), p.strip('/').split('/')[0]).encode("utf-8")
            self.send_response(200); self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(b))); self.send_header("Cache-Control", "no-store"); self.end_headers(); self.wfile.write(b); return
        return super().do_GET()
port = int(sys.argv[1]) if len(sys.argv) > 1 else 8770
http.server.ThreadingHTTPServer(("127.0.0.1", port), functools.partial(H, directory=ROOT)).serve_forever()
