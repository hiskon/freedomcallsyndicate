# Freedom Call: Syndicate — Prototype 0.5

HTML/CSS/JavaScript Canvas 2D game prototype. No build step or external dependencies.

## Run
Keep `index.html`, `style.css`, and `game.js` in the same folder. Open `index.html`; if ES/browser local restrictions apply, run `python -m http.server 8000` and open `http://localhost:8000`.

## Controls
- A/D or arrows: move; Shift: sprint; Space/W/Up: jump
- G or right-click: grappling hook; hold F: pull; X: release
- J: 3-hit light combo; K: heavy attack; I: parry
- E: interact, or Eleanor stealth takedown when behind a nearby unaware enemy
- Q: switch Arthur/Eleanor
- Mobile: touch movement/actions, plus Light/Heavy/Parry buttons

## Systems
- CombatSystem: active attack windows, forward hitboxes, enemy hurtboxes, damage, knockback, hit-stop, parry/counter, stealth takedown
- Boss phase AI: phase transition at 50%, warning telegraph, AOE, stamina/health UI
- Canvas procedural attack poses, weapon arcs, particles, AOE ring, camera shake
- Existing world/quest/dialogue architecture retained. Combat logic is a first playable pass, not final frame-perfect balancing.
