# Legocraft

<p align="center">
[English](README.md) · [Français](README.fr.md) · [Español](README.es.md) · [Português](README.pt.md) · [العربية](README.ar.md) · [简体中文](README.zh-CN.md) · [日本語](README.ja.md) · [हिन्दी](README.hi.md) · [한국어](README.ko.md)
</p>

<p align="center">
  <img src="docs/screenshots/Brick%20XR%20Builder%20App%20Showcase.png" alt="Legocraft browser 3D brick-building sandbox showcase" width="100%">
</p>

[![CI](https://github.com/Joenasriani/legocraft/actions/workflows/ci.yml/badge.svg)](https://github.com/Joenasriani/legocraft/actions/workflows/ci.yml)

Bac à sable 3D de construction par briques dans le navigateur, développé avec React Three Fiber, Three.js et WebXR.

Construisez et modifiez des structures numériques en briques directement dans le navigateur avec des commandes desktop ou tactiles, enregistrez et rechargez vos projets, exportez vos créations et expérimentez le même espace de travail en WebXR.

> **État du projet :** Expérimental. Les interactions desktop et tactiles sont implémentées. Les fonctionnalités WebXR sont présentes, mais les tests sur matériel Meta Quest réel n'ont pas encore été effectués. Voir `docs/QUEST_QA.md`.

## Essayer

Application en ligne : https://legocraftvr.vercel.app/

## Pour les développeurs

Legocraft est aussi un exemple inspectable de système de construction 3D dans le navigateur : placement aligné sur une grille, géométrie de briques générée, sélection d'objets connectés, persistance locale, export GLB et interaction expérimentale avec contrôleurs WebXR vivent dans la même base de code React Three Fiber.

- [Explorer l'architecture](docs/ARCHITECTURE.md)
- [Contribuer](CONTRIBUTING.md)
- [Consulter la matrice QA WebXR / Quest](docs/QUEST_QA.md)

## Fonctionnalités

- Placer, déplacer, faire pivoter, recolorer et supprimer des briques sur une grille 3D avec accrochage
- Plusieurs tailles de briques rectangulaires, plus des formes rondes, cônes, dômes, pentes, courbes, coins, triangles et arches
- Sélection individuelle, multiple et par groupe connecté
- Copier/coller, annuler et rétablir
- Préréglages intégrés : Cheval, Mouton, Voiture, Route, Montagne, Arbre, Cabane, Puits, Pin et Château
- Persistance locale dans le navigateur
- Enregistrement et import des données de projet en `.json`
- Export de la structure actuelle en `.glb`
- Export de captures d'écran en `.png`
- Interaction desktop et tactile
- Modes caméra orbite, panoramique et zoom
- Raccourcis clavier pour enregistrer, copier/coller, supprimer et modifier
- Restauration automatique des constructions enregistrées localement au démarrage
- Mode WebXR expérimental avec contrôleurs, retour haptique, locomotion, rotation par incréments et menus VR

## Exécuter localement

### Prérequis

- Node.js 22 recommandé
- npm
- Un navigateur compatible WebGL

### Installation

```bash
git clone https://github.com/Joenasriani/legocraft.git
cd legocraft
npm install
```

### Démarrer le serveur de développement

```bash
npm run dev
```

Le serveur de développement Vite est configuré sur le port `3000`.

Un premier lancement réussi doit charger l'espace de construction 3D dans le navigateur et permettre de placer et manipuler des briques.

### Vérifier le projet

```bash
npm run test
npm run lint
npm run build
```

Ces commandes sont définies dans `package.json` et vérifiées par GitHub Actions avec Node.js 22.

## Fichiers de projet et export

- Enregistrement/import de projet `.json`
- Export 3D `.glb`
- Captures d'écran `.png`
- Persistance locale automatique dans le navigateur

La capture d'écran est fournie au mieux et peut dépendre du comportement WebGL du navigateur.

## Vérification et compatibilité

GitHub Actions vérifie actuellement le dépôt avec Node.js 22 via :

- `npm ci`
- `npm run test`
- `npm run lint`
- `npm run build`

État actuel de compatibilité :

| Environnement | État |
| --- | --- |
| Build de production | Vérifié par CI |
| Tests automatisés | Vérifiés par CI |
| Vérification TypeScript | Vérifiée par CI |
| Interaction navigateur desktop | Implémentée ; pas encore de matrice multi-navigateurs formelle |
| Interaction tactile | Implémentée ; pas encore de matrice d'appareils formelle |
| WebXR | Expérimental |
| Matériel Meta Quest | Pas encore testé sur matériel réel |

## État WebXR

L'interaction WebXR est implémentée, notamment les entrées contrôleur, le retour haptique, les menus VR, les contrôles de locomotion et la rotation par incréments.

Les tests sur matériel Meta Quest réel n'ont **pas encore** été réalisés ; la compatibilité et les performances spécifiques à Quest doivent donc être considérées comme expérimentales et non garanties.

Voir [`docs/QUEST_QA.md`](docs/QUEST_QA.md) pour la matrice QA matérielle actuelle.

## Construire sur Legocraft

Toute idée est bienvenue si elle peut produire une amélioration réelle, une expérimentation, une fonctionnalité, un design, un outil, un gain de performance, un gain d'accessibilité ou une extension utile.

Le jeu actuel est le point de départ, pas la limite.

Façons concrètes d'explorer ou d'étendre le projet :

- **Jouer :** tester le constructeur existant et identifier une interaction ou un flux à améliorer.
- **Explorer le code :** utiliser [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) pour trouver le sous-système concerné.
- **Ajouter une brique :** étendre les définitions de briques et la géométrie générée.
- **Créer un préréglage :** ajouter et valider une structure réutilisable avec le système de préréglages existant.
- **Améliorer l'interaction :** travailler sur le desktop, le tactile, la sélection, l'édition ou la caméra.
- **Tester WebXR :** exécuter la procédure QA Quest et rapporter des résultats matériels réels.
- **Améliorer XR :** travailler sur la compatibilité des contrôleurs, la locomotion, l'haptique, l'interface VR ou les performances.
- **Améliorer la fiabilité :** ajouter des tests ciblés pour le placement, la sélection, les préréglages ou la logique partagée.
- **Ouvrir une issue :** discuter des changements importants ou limitations reproductibles avant implémentation.
- **Soumettre une pull request :** garder la modification ciblée et exécuter les commandes CI existantes.

Legocraft est open source sous licence MIT. Vous pouvez le forker, le modifier, l'étendre et le redistribuer selon les termes de [`LICENSE`](LICENSE). Voir [`CONTRIBUTING.md`](CONTRIBUTING.md) pour le flux de contribution.

### Points d'entrée actuels pour contribuer

- [Validation et extension WebXR / Meta Quest](https://github.com/Joenasriani/legocraft/issues/1)
- [Déplacer la validation des préréglages vers la couverture Vitest automatisée](https://github.com/Joenasriani/legocraft/issues/2)
- [Étendre la couverture automatisée des règles de placement et de sélection](https://github.com/Joenasriani/legocraft/issues/3)

### Contributions créatives et spatiales

Le code n'est pas obligatoire pour toute contribution utile. Les designers et artistes techniques peuvent proposer, via une issue GitHub, des structures prédéfinies, compositions spatiales, nouveaux concepts de formes, flux d'interaction, défis de construction ou améliorations d'accessibilité. Des croquis, diagrammes, plans de référence et notes de comportement clairs sont utiles lorsqu'ils décrivent quelque chose de compatible avec le constructeur existant.

Les contributions acceptées sont créditées dans l'historique Git et l'enregistrement des pull requests ; les auteurs de propositions doivent être mentionnés dans la discussion d'implémentation si quelqu'un d'autre transforme un concept accepté en code.

### Frontière WebXR / Quest

Legocraft inclut déjà une interaction WebXR expérimentale, les entrées contrôleur, la locomotion, l'haptique, des menus VR et des flux de construction spécifiques à XR. La validation sur matériel Meta Quest réel reste ouverte. La couche XR est documentée et volontairement extensible pour les développeurs qui souhaitent la tester, l'améliorer, l'optimiser ou la pousser plus loin.

## Stack

- React
- TypeScript
- Three.js
- React Three Fiber
- `@react-three/drei`
- `@react-three/xr`
- Zustand
- Vite
- Vitest

**Créé par Joe Nasr** — Expériences interactives, 3D et WebXR.

https://joe-nasr-signals.vercel.app/
