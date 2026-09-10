---
title: 'CM360 : les ID de vos rapports Path to Conversion changent en septembre'
description: 'Dès septembre, Campaign Manager 360 fait coexister anciens et nouveaux ID dans les rapports Path to Conversion et CFV, avant de supprimer les anciens.'
publishedAt: 2026-09-05
status: published
rubrique: mesure
format: text
featured: false
hook: 'Un ID de navigateur ou de système dans votre rapport Path to Conversion ne va plus désigner la même chose à partir de ce mois-ci — la fenêtre de transition dure environ un mois, et personne ne vous enverra de deuxième rappel.'
tags: ['Campaign Manager 360', 'CM360', 'Path to Conversion', 'Floodlight', 'tracking', 'mesure']
sources:
  - label: 'Google — Coming soon: Campaign Manager 360 updates in Q3 2026'
    url: 'https://support.google.com/campaignmanager/answer/17598939?hl=en'
  - label: 'Google — Coming soon: Display & Video 360 updates in Q3 2026'
    url: 'https://support.google.com/displayvideo/answer/17598940?hl=en'
  - label: 'Louder — Why Campaign Manager 360 is becoming Google''s measurement platform for cross-channel marketing'
    url: 'https://louder.com.au/2026/08/04/campaign-manager-360-measurement-platform/'
---

## Campaign Manager 360 change les ID de ses rapports Path to Conversion — sans bruit

**Depuis septembre 2026, Google fait migrer les rapports Path to Conversion (P2C) et Custom Floodlight Variable (CFV) de Campaign Manager 360 vers de nouveaux criterion ID pour le navigateur, l'OS, le modèle mobile et l'ISP, alignés sur un standard cross-plateforme.** Pendant environ un mois, anciens et nouveaux ID coexistent dans les exports ; ensuite, seuls les nouveaux subsistent. Toute jointure, tout dashboard ou tout script qui résout ces ID vers un référentiel interne casse silencieusement si personne ne le met à jour avant la fin de la fenêtre.

## Ce qui change concrètement

Les rapports P2C et CFV de Campaign Manager 360 encodent chaque dimension (navigateur, système d'exploitation, marque et modèle de mobile, fournisseur d'accès) sous forme de criterion ID numérique, que chaque outil de reporting ou d'ETL doit résoudre via un référentiel Google pour l'afficher en clair. Google annonce, dans sa page "Coming soon: Campaign Manager 360 updates in Q3 2026", que ces ID sont remplacés pour s'aligner sur un standard commun aux plateformes du groupe (Data Transfer v2.0 est concerné par le même changement). Motif affiché : améliorer l'efficacité du système, pas corriger un bug.

La bascule ne se fait pas d'un coup. Pendant une période de transition d'environ un mois à partir de septembre, les fichiers P2C et CFV contiennent à la fois les anciens et les nouveaux ID. Une fois la fenêtre passée, les anciens ID disparaissent des exports — sans distinction ni avertissement supplémentaire ligne par ligne.

## Pourquoi une fenêtre d'un mois est plus courte qu'elle n'y paraît

Sur le papier, un mois de coexistence semble confortable. En pratique, c'est le temps qu'il faut à beaucoup d'organisations juste pour repérer que le changement les concerne : la page d'annonce est une note produit générique parmi une longue liste de mises à jour trimestrielles, pas une alerte ciblée dans l'outil. Un dashboard alimenté par un ETL qui résout ces ID vers un référentiel fige souvent ce référentiel côté client — si personne ne surveille l'apparition des nouveaux ID pendant la fenêtre de transition, la mise à jour du mapping arrive après coup, une fois les anciens ID déjà retirés des exports. Résultat le plus probable : pas une erreur qui remonte, mais des lignes classées "inconnu" ou des doublons de dimension dans un rapport qui continue, en apparence, de tourner normalement.

## Deux autres changements Q3 2026 sur la même chaîne de mesure

Le même trimestre porte deux évolutions connexes, documentées sur les pages "Coming soon" Q3 2026 de Campaign Manager 360 et Display & Video 360 :

- **Les tags Floodlight utilisent désormais le local storage du navigateur, en plus des cookies**, pour attribuer les conversions par clic (CTC) sur Campaign Manager 360, Display & Video 360 et Search Ads 360 — un signal plus durable que le cookie seul, mais qui déplace une partie du recollement d'attribution vers une source de données que les outils de mesure existants ne lisent pas forcément encore.
- **Les rapports CFV qui ne demandent pas explicitement les conversions non attribuées incluent désormais par défaut les conversions modélisées.** Concrètement, un rapport CFV configuré comme avant peut afficher un total de conversions plus élevé qu'auparavant, sans qu'aucun changement de campagne ne l'explique — un historique comparé mois sur mois risque de se lire, à tort, comme une amélioration de performance.

Pris ensemble, ces trois changements déplacent une partie de la définition de "ce qu'est une conversion" et de "ce que désigne un ID" hors du contrôle direct de l'annonceur, au même moment.

## Ce qu'il faut vérifier avant la fin de la fenêtre de transition

- **Identifier tous les rapports P2C et CFV en production** — dashboard interne, outil BI, export automatisé — qui résolvent des criterion ID vers un référentiel navigateur / OS / mobile / ISP.
- **Confirmer que le référentiel utilisé est mis à jour pour inclure les nouveaux ID**, pas seulement les anciens, avant la fin de la période de transition.
- **Documenter un export "avant" pendant la fenêtre de coexistence**, pendant que les deux jeux d'ID sont encore visibles côte à côte — c'est la seule période où l'ancien et le nouveau mapping peuvent être vérifiés l'un contre l'autre.
- **Vérifier si les rapports CFV suivis dans le temps demandent explicitement les conversions non attribuées** ; sinon, s'attendre à une hausse de volume liée à l'inclusion par défaut des conversions modélisées, à ne pas confondre avec un gain de performance réel.
- **Repérer les dashboards qui consomment du local storage Floodlight** pour l'attribution CTC, et vérifier qu'ils ne reposent pas uniquement sur une lecture cookie déjà partiellement dépréciée dans les navigateurs.

## Et pour la mesure, le tracking, le CRO ?

C'est le type de changement que le contrat dataLayer de Studio Jannah est justement conçu pour absorber sans surprise : un schéma d'événements versionné, avec une checklist de vérification à chaque évolution d'un fournisseur, transforme une note produit noyée dans une page "Coming soon" en un test de non-régression daté et suivi — plutôt qu'en un dashboard qui continue de tourner en silence, avec des chiffres qui ne veulent plus dire ce qu'ils disaient un mois plus tôt.

## FAQ

**Le changement d'ID Campaign Manager 360 est-il obligatoire ?**
Oui. Il n'y a pas d'option pour rester sur l'ancien système d'ID au-delà de la période de transition annoncée par Google — les anciens ID disparaissent des rapports P2C et CFV une fois la fenêtre d'environ un mois écoulée.

**Qu'est-ce qu'un criterion ID dans un rapport Path to Conversion ?**
C'est l'identifiant numérique que Campaign Manager 360 utilise pour coder une dimension (navigateur, système d'exploitation, marque et modèle de mobile, fournisseur d'accès) dans les exports bruts — un référentiel externe est nécessaire pour le traduire en libellé lisible.

**Pourquoi mes totaux de conversions CFV vont-ils changer sans changement de campagne ?**
Parce que les rapports CFV qui ne demandent pas explicitement les conversions non attribuées incluent désormais par défaut les conversions modélisées, ce qui augmente mécaniquement le total affiché sans lien avec une évolution réelle de la performance.

**Le passage au local storage pour Floodlight remplace-t-il les cookies ?**
Non, il s'ajoute aux cookies comme signal complémentaire pour l'attribution des conversions par clic (CTC), sur Campaign Manager 360, Display & Video 360 et Search Ads 360.

---

*Sources : [Google — Campaign Manager 360, Q3 2026](https://support.google.com/campaignmanager/answer/17598939?hl=en), [Google — Display & Video 360, Q3 2026](https://support.google.com/displayvideo/answer/17598940?hl=en), [Louder](https://louder.com.au/2026/08/04/campaign-manager-360-measurement-platform/) — traitement éditorial et angle mesure/tracking par Studio Jannah.*

*Studio Jannah — Mohamed Atrari.*
