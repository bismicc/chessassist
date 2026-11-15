# Chessassist

An open-source chess learning app. Import a game, let Stockfish find the truth, and ask an AI coach to explain the position, the threats, and the plan.

Everything runs in the browser. There is no backend or account system.

## What it does

- **Game analysis** - import a PGN and review every move with local Stockfish 17 analysis.
- **Flexible import** - paste a PGN, open a `.pgn` file, or fetch recent public games by Chess.com or Lichess username. Comments, line breaks, NAGs and `!`/`?` annotations are read from the movetext and shown with the moves.
- **Move classification** - book, brilliant, best, great, good, mistake, and blunder labels.
- **AI coach** - a permanent right-hand sidebar that can inspect the board, run Stockfish, check threats, verify lines, and answer follow-up questions.
- **Opening explorer** - opening names, book moves, win rates, average rating, and a full book-move table.
- **Interactive board** - play moves, explore variations, right-click to highlight, and right-click-drag to draw arrows.
- **Clickable analysis lines** - the coach marks replayable moves and sequences; clicking one plays it at one move per second from the correct position.
- **Position-by-position reports** - key-moment, brief, and full-game reviews written from deterministic chess facts.
- **Weakness detection** - every analysed game is saved locally and its mistakes are tagged by tactical motif.
- **Adaptive puzzle trainer** - a preset Lichess puzzle database, curated by motif and rating, with spaced review and an Elo-style puzzle rating.
- **Opening learner** - fetch recent Chess.com or Lichess games, group them by opening, colour and result, and ask the AI for a grounded lesson on the line you actually play.
- **Chess glossary** - definitions for every tactic, mating pattern, endgame idea and positional term used by the AIs.

## Status

This is a working prototype, not a finished training platform. Game analysis, the AI coach, weakness detection, the puzzle trainer, the opening learner and the glossary work. There is still no account system or backend: training data lives in this browser.

## Run it

```sh
npm install
npm run dev
```

Open http://localhost:8080.

Routes:

- `/` - homepage
- `/analysis` - the analysis board
- `/training` - training dashboard and weakness profile
- `/puzzles` - adaptive puzzle trainer
- `/openings` - Chess.com and Lichess opening learner
- `/glossary` - complete tactic and positional glossary

```sh
npm run build   # type-check and bundle into dist/
npm run check   # type-check only
```

`npm run dev` and `npm run build` copy the pinned Stockfish build from `node_modules/stockfish/src` into `public/engines` before bundling.

## Stack

React 18 + TypeScript, webpack 5 + Babel, CSS Modules, React Router 6, Zustand 4, chess.js, react-chessboard, and Stockfish 17 WASM.

## Importing games

The import dialog has four sources:

- **Paste PGN** - paste a game from any site.
- **Chess.com** - enter a public username and pick from the most recent games across the latest three monthly archives.
- **Lichess** - enter a public username and pick from the 24 most recent games.
- **PGN file** - choose or drop a `.pgn` file containing one game.

Chess.com and Lichess imports use their public APIs. No account, API key, or upload is involved; the browser fetches the games directly.

## AI coach

The coach is bring-your-own-key. Choose a provider in Coach settings, paste a key, and select a model. Keys are stored in this browser's local storage and sent only to the provider. Game data and questions go to that provider when you use the coach.

Supported providers:

- OpenRouter (recommended, covers most models through one key)
- Anthropic, OpenAI, Google Gemini
- DeepSeek, Groq, Mistral, xAI, Together
- Ollama and any custom OpenAI-compatible endpoint

There are four modes:

- **Ask** - only explains when you send a message
- **Key** - analyses the game, then explains the opening and each key moment in a position-by-position review
- **Brief** - one line for every move
- **Full** - a short paragraph for every move, generated in chunks

The coach can call local Stockfish, read the board, derive hanging pieces and capture threats, verify multi-move lines, do arithmetic, look up the opening database, query the Lichess cloud evaluation and Syzygy tablebase, search the web, and look up player profiles. Chat keeps the conversation history, so follow-up questions work.

Coach replies use explicit move markup such as `[[ply:47 Nxd3+ Rxd3 Rxe1+]]`. The interface turns those into clickable sequence buttons. A declared ply is the position before the first move, so a line can be replayed even when the board is somewhere else. Bare square names are never made clickable.

Reports are grounded in deterministic facts: evaluation swings, piece movement, captures, material, threats, and opening book status. Report output is checked against the game's actual moves, and an invented capture or check triggers one repair pass.

The Lichess opening explorer requires an account token for game and master statistics. Add one in Coach settings if you want those numbers; cloud evaluations and the tablebase work without it.

Reports and chat calls cost money at the provider. A typical key-moment report is a few cents with a mid-tier model. Full-game reports cost more because they produce far more text.

## Training

Run a full analysis on a game and it is saved to the local training profile automatically. If you enter your Chess.com or Lichess username in the training dashboard, only your moves are measured; otherwise both sides are measured. Mistakes and blunders are tagged with the tactical motifs that the engine's best move would have used.

The puzzle pack is a curated subset of the public Lichess puzzle database. It is stored in `public/puzzles/puzzles.json` and grouped by motif, rating, popularity and plays. Puzzles are selected by the weakest motifs first, then by rating closeness, then by spaced review. Rebuild the pack with:

```sh
pip install zstandard
python scripts/build-puzzles.py
```

The training overview can import your recent public Chess.com or Lichess games. Once saved, the profile and opening repertoire are available across every training tab, and the import box disappears. The opening learner reads the deepest named book position in each game and groups the results by opening and colour.

Imported games can then be analysed in bulk with local Stockfish. Choose the depth, MultiPV lines and hash size, then split the batch between full move-by-move games and opening-only games. Full analysis updates the weakness profile; opening-only analysis stops after the first 24 plies. The AI lesson uses that record plus the local opening database, not an invented repertoire.

Every AI in the app is given the same chess glossary: the coach, the game reports, the weakness review and the opening lesson. The coach can also call `get_tactic_definition` for any term. The full glossary is browsable at `/glossary`.

## Data and classification

Opening names and book positions come from WintrChess's `openings.json`.

Great and Brilliant classification uses MultiPV 2 plus sacrifice and material-safety checks. Brilliant requires the engine's best move to leave a new piece en prise for less material than it is worth, while still holding the evaluation. The classifier is deliberately strict, so famous practical brilliancies that are not the engine's first choice are not marked Brilliant.

Opening statistics come from the **Chess Multiverse Opening Intelligence Database (20M Lichess subset)** by Sparsh Varshney, licensed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/), DOI [10.5281/zenodo.19307100](https://doi.org/10.5281/zenodo.19307100). This app aggregates those lines into a position index; the generated statistics index is shared under the same licence.

Puzzle data is a curated subset of the [Lichess puzzle database](https://database.lichess.org/#puzzles), released under CC0. See `public/puzzles/LICENSE.txt` for the curation rules and source attribution.

## Design

The interface uses:

- **Tiny5 Duo** for display and pixel headings
- **DM Sans** for body text
- **Silkscreen** for labels and metadata
- A dithered pixel transition between light and dark sections

The visual direction references [ohnyfans.com](https://ohnyfans.com) for its pixel typography and section transitions, and [cloudflare.com](https://www.cloudflare.com) for its large-scale editorial layout.

## Roadmap

- Personal puzzles from your own games, marked separately from the preset deck.
- Repertoire trees with spaced repetition for opening lines.
- IndexedDB storage for larger game archives and offline puzzle packs.
- More detailed phase and opening weakness reports.

## Inspiration

Chessassist borrows ideas from novachess.ai (AI coaching and player stats), Chess.com (personalised insights and an opening library), and Lichess (open source and the games database), while aiming to stay free and open source.

The core framework of the chess analysis board, the board sounds, and the named-openings database are taken from another open source chess analysis website called WintrChess (https://github.com/WintrCat/wintrchess).

## Licence

MIT - see [LICENSE](LICENSE).
