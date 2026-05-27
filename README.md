# 🛠️ StruXtor

**StruXtor** est un outil web minimaliste, ultra-moderne et performant conçu pour analyser instantanément vos répertoires locaux et générer une arborescence textuelle épurée au format ASCII/Unicode. C'est l'assistant idéal pour documenter vos projets, enrichir vos fichiers `README.md` ou fournir instantanément un contexte d'architecture propre à des intelligences artificielles (LLM).

Dites adieu aux saisies manuelles ou aux commandes complexes du terminal (`tree`) : déposez simplement votre dossier pour obtenir son architecture colorisée en quelques millisecondes.

---

## ✨ Fonctionnalités & Points Forts du Site

L'application a été entièrement développée pour offrir une expérience utilisateur (UX) fluide, rapide et esthétique sans aucune friction :

* **📂 Analyse instantanée via Drag & Drop** : Déposez directement un dossier complet ou parcourez vos fichiers à l'aide de l'explorateur natif (propulsé par l'API native `webkitdirectory`).
* **⚙️ Filtre d'exclusion intelligent** : Un commutateur vous permet d'ignorer automatiquement les fichiers et dossiers lourds ou non pertinents liés au développement (`node_modules`, `.git`, `dist`, `build`, etc.) pour un rendu propre et immédiat.
* **🎨 Coloration syntaxique adaptative** : L'outil identifie les extensions de vos fichiers (JavaScript, TypeScript, HTML, CSS, Python, JSON, Markdown...) afin de leur attribuer un code couleur dynamique et ergonomique directement dans l'arborescence textuelle.
* **📋 Copie Automatique & Export** : Le résultat généré est automatiquement copié dans votre presse-papiers dès la fin de l'analyse, avec la possibilité supplémentaire de l'exporter en un clic dans un fichier `.txt`.
* **⏳ Suivi de progression asynchrone** : Une barre de chargement fluide avec affichage du ratio et du pourcentage de progression évite le gel du navigateur (*Main Thread*) lors de la lecture de très grands répertoires.
* **📜 Historique Local Persistant** : Sauvegarde automatiquement vos 10 dernières analyses dans le `localStorage` de votre navigateur. Vous pouvez ainsi basculer d'un projet à un autre en un instant sans avoir à ré-importer vos dossiers.
* **🔮 Interface Ultra-Moderne & Immersive** : Design responsive au style résolument *Glassmorphism* (effets de transparence floutés et vitrés), enrichi d'orbes lumineux animés en arrière-plan et d'icônes vectorielles dynamiques.

---

## 🎨 Aperçu de l'Interface

Voici l'identité visuelle de **StruXtor** représentée par son logo officiel :

<p align="center">
  <img src="logo.jpg" alt="StruXtor Logo" width="300px" style="border-radius: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.5);"/>
</p>

---

## 👨‍💻 À propos du Développeur : Pyro

Ce projet a été entièrement pensé, designé et développé par **Pyro** ([Pyronixus](https://github.com/Pyronixus)).

En tant qu'adepte du mouvement *Vanilla* et passionné d'interfaces minimalistes, j'attache une importance cruciale à la performance brute et à la légèreté du code. **StruXtor** est né d'un besoin quotidien : simplifier la génération d'arborescences de projets sans dépendances lourdes, sans aucun framework, tout en conservant une fluidité maximale et une exécution 100% côté client.

N'hésitez pas à explorer mes autres projets ou à venir échanger sur mon profil GitHub !

---

## 🚀 Lancement & Utilisation

Aucune installation, aucun serveur ni aucune dépendance système requis. L'application s'exécute intégralement dans le bac à sable (*sandbox*) de votre navigateur (100% local, respectueux de la confidentialité de vos projets).

### Option 1 : Lancement local rapide
1. Téléchargez ou clonez ce dépôt sur votre machine.
2. Ouvrez simplement le fichier `index.html` dans le navigateur de votre choix.

### Option 2 : Déploiement en ligne
Vous pouvez l'héberger instantanément sur **GitHub Pages**, **Vercel** ou **Netlify** en poussant simplement les fichiers à la racine de votre dépôt :
- `index.html`
- `script.js`
- `style.css`
- `logo.jpg`

---

## 📁 Structure du Projet

L'architecture du projet respecte les principes de simplicité et de modularité du développement web moderne :

```text
├── 📄 index.html  # Structure HTML5, conteneurs et intégration des icônes Lucide
├── 📄 script.js    # Logique métier, traitement récursif des fichiers et gestion du localStorage
├── 📄 style.css    # Design complet (Variables CSS, Glassmorphism, Animations d'orbes et Responsive)
└── 🖼️ logo.jpg     # Logo graphique officiel de l'application
```
---

## Exemple d'arborescence générée
```text
├── src/
│   ├── components/
│   │   ├── Button.js
│   │   └── Sidebar.css
│   ├── App.tsx
│   └── index.html
├── .gitignore
├── package.json
└── README.md
```
