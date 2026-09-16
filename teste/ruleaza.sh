#!/bin/sh
# Rulează toate testele:  sh teste/ruleaza.sh
cd "$(dirname "$0")/.." || exit 1
set -e
node teste/01-echivalenta-si-securitate.js teste
node teste/02-sincronizare.js            teste
node teste/03-doget.js                   teste
node teste/05-faza4.js               teste
node teste/04-performanta.js             teste
echo "════ TOATE TESTELE AU TRECUT ════"
