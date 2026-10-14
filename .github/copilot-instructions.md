# Scrap Swarm project instructions

- This is an original PC browser arena game using Phaser, TypeScript, and Vite.
- Preserve the bounded MVP: one arena, one character, three weapons, three common enemies, and one boss. Do not add a backend, online play, mobile scope, or large content system.
- Keep authoritative rules in `src/game/`; Phaser scenes adapt input and render state. Tests, developer tools, bots, and player mode must share the same damage, movement, wave, upgrade, and economy implementation.
- Gameplay changes must remain seeded and fixed-tick. Never use `Math.random()` or wall-clock time in authoritative rules.
- Keep programmatic art original and readable by shape as well as color.
- Developer controls must be guarded by `import.meta.env.DEV`, must not alter production play, and must not leak into `dist`.
- Page exceptions, invalid states, bot errors, and timeouts must be explicit failures. Never report an unrun command as passing.
- For gameplay/input/visual changes, run the relevant Vitest and Playwright checks; inspect the affected screenshot. For simulation changes, verify three-run determinism and render/headless parity.
- Do not push, deploy, add analytics, or change model configuration.
