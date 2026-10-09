#!/bin/bash
# Baut die Website und überträgt dist + Quelle ins GitHub-Repo
set -e
cd /home/claude/site && python3 build.py | tail -1
R=/home/claude/lewolux-website
rm -rf $R/public && cp -r dist $R/public
printf ".htaccess\n.assetsignore\n" > $R/public/.assetsignore
cp -r build.py data.py manuals.py parts feedback-worker banner.jpg logo.jpg logo-lion.png logo-face.png screenshots-echt software-bilder teaser-bilder lux-voice lux-voice-render.py video spiele-dateien kids-voice-el kritzel-voice-render.py kritzel-voice-phrases.json piper_fix.py $R/quelle/
cd $R && git add -A && git status --short | wc -l
