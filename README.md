# Sigilblade

**Deflect the blow. Break the guard. Inscribe your blade.**

A fast, aggressive roguelite duel game that runs in your browser. Sekiro-style deflects and posture breaks meet Noita-style sigil chains you inscribe on your blade, with Brotato-style builds that change every run.

▶ **Play it here: https://averageasher1-creator.github.io/Sigilblade/**

No install, no account. It's a single HTML file, so you can also download `index.html` and open it offline.

## Controls

Trackpad friendly; no right click needed.

| Action | Keys |
| --- | --- |
| Move | WASD or arrow keys |
| Strike | Click (or J) |
| Deflect / guard | Space (or K) |
| Dash | Shift (or L) |
| Art | E |
| Focus | Q |
| Gourd (heal) | R or F |
| Auto-strike toggle | C |
| Pause | Esc or P |
| Mute | M |

## What's in it

- **Deflect, don't run.** Perfect deflects, clashes, ripostes and posture breaks beat dodging. Aggressive play is rewarded and passive play is punished.
- **Build the perfect blade.** Six elemental schools, 128 sigils, 45 blades with engravings, tempering and imprints, 77 relics and 19 very different vessels, including a luck character.
- **18 bosses**, each with its own signature mechanics: teleport chains, flash-steps, lightning steps, mirrored cuts, tidal walls, counter stances and a chimera that changes body mid-fight.
- **Boss Rush.** Four gauntlets, from the Wandering Ronin to the Sword Saint. Each one unlocks when you clear the one before, and you tune your kit at the Forge between duels.

## Building from source

The game is plain JavaScript split into modules in `src/`. To rebuild `index.html` after editing:

```
python3 tools/build.py
```
