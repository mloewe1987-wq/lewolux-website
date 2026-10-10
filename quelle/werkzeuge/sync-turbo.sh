#!/bin/bash
# Nur Lewolux Turbo hochladen: holt erst den aktuellen Stand, kopiert die Turbo-Quelle,
# baut die Website in einem Wegwerf-Ordner und übernimmt NUR public/games/lewolux-turbo.
set -e
R=/home/claude/lewolux-website; S=/home/claude/site/spiele-intern/lewolux-turbo; T=/tmp/turbo-build
cd $R && git pull -q --rebase
rm -rf $R/quelle/spiele-intern/lewolux-turbo && cp -r $S $R/quelle/spiele-intern/
rm -rf $T && cp -r $R/quelle $T && ln -s /home/claude/site/fontsrc $T/fontsrc
(cd $T && python3 build.py | tail -1)
rm -rf $R/public/games/lewolux-turbo && cp -r $T/dist/games/lewolux-turbo $R/public/games/lewolux-turbo
git add quelle/spiele-intern/lewolux-turbo public/games/lewolux-turbo
git status --short | grep -v "lewolux-turbo" && echo "ACHTUNG: andere Dateien geändert – nicht committen" || echo "nur Turbo geändert"
