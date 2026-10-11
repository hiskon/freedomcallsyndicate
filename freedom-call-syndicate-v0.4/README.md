# Freedom Call: Syndicate — Prototype 0.4

A dependency-free HTML/CSS/JavaScript Canvas 2D prototype for a Victorian London side-scroller.

## Run

1. Keep `index.html`, `style.css`, and `game.js` in the same folder.
2. Open `index.html` in a modern browser. If local-file restrictions interfere, run `python -m http.server 8000` in the folder and open `http://localhost:8000`.

## Controls

- `A` / `D` or arrow keys: move
- `Shift`: run
- `Space`, `W`, or Up: jump
- `G` or right-click: launch grappling hook toward an anchor
- Hold `F`: pull toward an attached anchor
- `X`: release the rope
- `Q`: switch Arthur / Eleanor
- `E`: interact with a nearby person or objective on the same physical layer
- Mobile: use the on-screen controls; hold Pull to reel in

## Prototype 0.4 changes

- Each of four districts spans four connected world sectors (5040 world units per district).
- Camera follows the player across the extended world.
- Street and rooftop targets are separate, and interactions require proximity plus the correct physical level.
- Buildings have traversable roof platforms, variable gaps, and grapple anchor points.
- Full-height human silhouettes represent street/rooftop guards, civilians, quest contacts and bosses.
- Movement states include walking, running, jumping, falling, hooking, swinging and pulling.
- Grappling is retained: it launches, attaches, swings/pulls, lands on roofs and has a cooldown.
- Quest interactions no longer teleport the player to a district start.

## Status

`node --check game.js` passes. A mocked-DOM runtime smoke test covers initialization, world sizes, movement/camera following, distant interaction rejection, nearby same-level interaction, no-teleport quest progression, and grappling to a roof. Visual interaction should still be checked in a real browser/device.
