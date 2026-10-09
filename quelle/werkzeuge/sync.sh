#!/bin/bash
# Baut die Website und überträgt dist + Quelle ins GitHub-Repo
set -e
cd /home/claude/site && python3 build.py | tail -1
R=/home/claude/lewolux-website
rm -rf $R/public && cp -r dist $R/public
printf ".htaccess\n.assetsignore\n" > $R/public/.assetsignore
cp -r build.py data.py manuals.py parts feedback-worker banner.jpg logo.jpg logo-lion.png logo-face.png screenshots-echt software-bilder teaser-bilder lux-voice lux-voice-render.py video spiele-dateien kids-voice-el kritzel-voice-render.py kritzel-voice-phrases.json piper_fix.py $R/quelle/
mkdir -p $R/quelle/spiele-intern && rm -rf $R/quelle/spiele-intern/lewolux-turbo && cp -r /home/claude/site/spiele-intern/lewolux-turbo $R/quelle/spiele-intern/
cd $R && git add -A && git status --short | wc -l
