# Attribution — règles de détection CMP

Les sélecteurs de `consent-o-matic-rules.json` sont dérivés du projet
open-source **Consent-O-Matic** (CAVI, Aarhus University) :
https://github.com/cavi-au/Consent-O-Matic

Licence : MIT (texte original ci-dessous). Nous ne redistribuons pas leur
moteur d'automatisation complet, seulement les sélecteurs `presentMatcher`
et `OPEN_OPTIONS` (simples), pour la détection de présence CMP et le
repérage de la zone DOM à mesurer. Voir
docs/tracking-score/CAHIER-DES-CHARGES.md (Module A) pour le détail.

Régénération : `node scripts/build-cmp-rules.mjs` (2026-08-27).

---

MIT License

Copyright (c) 2019,2020,2021,2022 Janus Bager Kristensen and Rolf Bagge,
CAVI - Center for Advanced Visualization and Interaction, Aarhus University

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
