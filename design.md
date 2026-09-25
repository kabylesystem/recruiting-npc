# YOU ARE THE BUG

## Vision
Une voiture volée dans un centre d'essai nocturne. Le directeur modifie les lois physiques pour contenir le joueur. Le correctif apparaît d'abord comme une menace dans la scène, puis comme une occasion à exploiter.

Kusaila autorise le choix visuel et l'implémentation (« go code tout ça, surprends-moi »). Physique du véhicule Sketchbook déjà accepté ; carrosserie Ferrari détaillée sous CC BY 4.0, maillage allégé avec Blender. Aucun personnage figurine ajouté.

## Références
- Control, https://legacy.controlgame.com/ : béton monumental, lumière directionnelle, système hostile. Capture officielle consultée, aucun asset copié.
- SUPERHOT, https://superhotgame.com/presskit/ : contraste, menace lisible, titre direct. Palette blanche non reprise ; scène sombre demandée.
- Sketchbook, https://github.com/swift502/Sketchbook : véhicule et physique existants réellement intégrés.

## Couleurs et matière
Fond --ink #101316 ; texte --paper #f0f0e9 ; accent --red #ff4338 ; sortie --mint #a9f4d0 ; secondaire --muted #b0b9bd. Béton gris, asphalte texturé, métal, bandes lumineuses rouges. Aucun jaune/doré/pastel.

## Typographie
Barlow Condensed 700/800 (titre et chiffres), Barlow 400/500/600 (interface), polices locales Fontsource. Titre monumental jusqu'à 150 px, HUD 16–18 px, touches 14 px. Pas de petites étiquettes espacées décoratives.

## Composition
Monde 3D plein écran ; lancement en bas à gauche, véhicule à droite. En partie : objectif en haut à gauche, chrono au centre, directeur à droite, mini-plan en bas à gauche et vitesse en bas à droite. Un correctif à la fois, effet concret et contrepartie explicite. Desktop clavier ; contrôles tactiles en paysage et portrait adaptés.

## Mouvement et son
Caméra de poursuite amortie, éclair d'impact, projection de particules, apparition des correctifs. Réduction des secousses si prefers-reduced-motion. Audio synthétique activé seulement par un geste ; interrupteur mute coupe la sortie.

## Intégration
Conduite/roues/collisions : Car et Cannon de Sketchbook ; rendu : Three.js existant. Arène, règles, HUD : spécifiques au concept. Directeur : petit serveur local + Codex CLI sur abonnement ChatGPT (Claude sélectionnable), aucun secret dans le navigateur. Mode local explicite si l'IA est indisponible.

## Monétisation
Aucune dans cette démo de hackathon.
