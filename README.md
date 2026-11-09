# Chessasist

An open-source chess learning platform that analyses your games with Stockfish and AI, finds the weaknesses behind your results, and turns them into a training plan with adaptive puzzles, an AI coach, and opening study.

## The problem

Good chess learning tools are either closed and expensive, or powerful but impersonal. Chessasist is an attempt to build the missing open-source option: a coach that watches how you actually play, explains what keeps costing you games, and gives you something specific to work on each week.

## Planned features

- **AI game analysis** - evaluate every game locally with Stockfish and explain the mistakes in plain language.
- **Weakness detection** - find patterns across your game history: missed tactics, poor positional decisions, weak endgame technique, opening knowledge gaps, and time-management problems.
- **Adaptive puzzle trainer** - build puzzles from your own mistakes and adjust the difficulty as you improve.
- **Opening learner** - study openings with AI explanations, backed by the Lichess games database.
- **Interactive AI coach** - ask questions about positions and get answers aimed at your level.
- **Personal learning roadmap** - a weekly training plan based on your weaknesses, available practice time, and progress.

## Current prototype

The first slice is the game analysis page needed to feed all of the above:

- PGN import with player names, ratings, result, and a clickable move list
- Stockfish 17 (WASM) evaluation in a Web Worker, with configurable depth, engine lines, and hash size
- Evaluation bar, engine lines, and move navigation
- Interactive board: play moves, explore variations, right-click to highlight, right-click-drag to draw arrows
- Move, capture, castle, promotion, check, and game-end sounds

Everything runs client-side. There is no backend, account system, game-history import, or AI coach yet.

## Stack

React 18 + TypeScript, webpack 5 + Babel, CSS Modules with style-loader, React Router 6, Zustand 4, chess.js, react-chessboard, and Stockfish 17 WASM.

## Run the prototype

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

## Inspiration

Chessasist borrows ideas from novachess.ai (AI coaching and player stats), Chess.com (personalised insights and an opening library), and Lichess (open source and the games database), while aiming to stay free and open source.
The core framework of the chess analysis board and move classifications are heavily inspired by another open source chess analysis website called Wintrchess (https://github.com/WintrCat/wintrchess)

## Licence

MIT - see [LICENSE](LICENSE).
