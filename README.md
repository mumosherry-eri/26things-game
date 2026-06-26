# 26things-game

Standalone version of the mobile narrative game.

## Structure

- `index.html`: static entrypoint and shared DOM shell.
- `css/app.css`: visual styling and mobile layout.
- `js/runtime.js`: passage engine, save/load, macro parsing, and menu wiring.
- `js/story/*.js`: chapter passage data.
- `js/story/catalog.js`: Navigate chapter metadata.
- `js/ui/*.js`: phone chat, SNS, panels, and visual effects.
