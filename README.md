# Chessasist

A browser-based chess game analysis page: import a PGN, step through the game, play moves on the board, and analyse positions with Stockfish running locally in a Web Worker.

## Stack

- React 18 + TypeScript
- webpack 5 + Babel, CSS Modules with style-loader
- React Router 6
- Zustand 4 for persisted engine settings
- chess.js + react-chessboard
- Stockfish 17 WASM (lite, single-threaded) in a Web Worker

## Run

```sh
npm install
npm run dev
```

Open http://localhost:8080.

```sh
npm run build   # type-check and bundle into dist/
npm run check   # type-check only
```

`npm run dev` and `npm run build` copy the pinned Stockfish build from `node_modules/stockfish/src` into `public/engines` before bundling.

## Controls

- Left click a piece to select it, then click a target square to move; click the piece again to unselect.
- Drag pieces to move them. Promotions auto-queen for now.
- Right click a square to toggle a red highlight.
- Right click and drag between squares to draw an arrow.
- Left click anywhere on the board clears all highlights and arrows.
- Moves play sounds for moving, capturing, castling, promoting, check, and game end.
- Move list rows jump to that position; arrow keys step through the game.
- "Analyse game" evaluates every position and fills the evaluation bar; "Import PGN" replaces the current game.

## Notes

Board sounds are the mp3 files from the reference WintrChess project.

The engine settings panel controls search depth, the number of engine lines, and the hash size. Everything runs client-side; there is no backend yet.
