#!/bin/bash
# Nur Lewolux Turbo hochladen: holt erst den aktuellen Stand, kopiert dann NUR die Turbo-Dateien
# (quelle/spiele-intern/lewolux-turbo und public/turbo). Andere Dateien bleiben unberührt.
set -e
R=/home/claude/lewolux-website; S=/home/claude/site/spiele-intern/lewolux-turbo
cd $R && git pull -q --rebase
rm -rf $R/quelle/spiele-intern/lewolux-turbo && cp -r $S $R/quelle/spiele-intern/
rm -rf $R/public/turbo && cp -r $S $R/public/turbo
git add quelle/spiele-intern/lewolux-turbo public/turbo
git status --short | grep -v "lewolux-turbo\|public/turbo" && echo "ACHTUNG: andere Dateien geändert – nicht committen" || echo "nur Turbo geändert"
