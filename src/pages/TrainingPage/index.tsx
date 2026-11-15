import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

import AiSettingsDialog from "../../components/AiSettingsDialog";
import TrainingShell from "../../components/TrainingShell";
import Markdown from "../../components/CoachPanel/Markdown";
import { SettingsIcon } from "../../components/Icons";

import useTrainingAi from "../../hooks/useTrainingAi";
import useSettingsStore from "../../stores/SettingsStore";
import useTrainingStore from "../../stores/TrainingStore";

import { analyseGameBatch } from "../../lib/batchAnalysis";
import Engine from "../../lib/engine";
import { fetchChessComGames, fetchLichessGames } from "../../lib/gameImport";
import { buildOpeningStudies, getRepertoireScore } from "../../lib/openingTraining";
import { parsePgn } from "../../lib/pgn";
import { buildTrainingGame, getTrainingGameId } from "../../lib/weaknesses";
import { getPuzzleStats } from "../../lib/puzzles";
import { getTacticDefinition } from "../../lib/tactics";

import * as styles from "./TrainingPage.module.css";

function formatPercent(value: number) {
    return `${Math.round(value * 100)}%`;
}

export default function TrainingPage() {
    const playerName = useTrainingStore(state => state.playerName);
    const setPlayerName = useTrainingStore(state => state.setPlayerName);
    const games = useTrainingStore(state => state.games);
    const weaknesses = useTrainingStore(state => state.weaknesses);
    const puzzleProgress = useTrainingStore(state => state.puzzleProgress);
    const puzzleRating = useTrainingStore(state => state.puzzleRating);
    const openings = useTrainingStore(state => state.openings);
    const importedGames = useTrainingStore(state => state.importedGames);
    const importedGameCount = useTrainingStore(state => state.importedGameCount);
    const importedGameSource = useTrainingStore(state => state.importedGameSource);
    const replaceOpenings = useTrainingStore(state => state.replaceOpenings);
    const setImportedGames = useTrainingStore(state => state.setImportedGames);
    const setOpeningLearning = useTrainingStore(state => state.setOpeningLearning);
    const recordGame = useTrainingStore(state => state.recordGame);
    const resetTraining = useTrainingStore(state => state.resetTraining);

    const engineSettings = useSettingsStore(state => state.settings);
    const engineRef = useRef<Engine | null>(null);
    const [ engineError, setEngineError ] = useState("");

    const [ showSettings, setShowSettings ] = useState(false);
    const [ nameDraft, setNameDraft ] = useState(playerName);
    const [ confirmReset, setConfirmReset ] = useState(false);
    const [ importSource, setImportSource ] = useState<"lichess" | "chesscom">("chesscom");
    const [ importName, setImportName ] = useState(playerName);
    const [ importLimit, setImportLimit ] = useState(24);
    const [ showImport, setShowImport ] = useState(() => !Object.keys(openings).length);
    const [ importing, setImporting ] = useState(false);
    const [ importMessage, setImportMessage ] = useState("");
    const [ importError, setImportError ] = useState("");

    const [ batchDepth, setBatchDepth ] = useState(12);
    const [ batchLines, setBatchLines ] = useState(2);
    const [ batchHash, setBatchHash ] = useState(
        engineSettings.hash <= 128 ? engineSettings.hash : 64
    );
    const [ fullCount, setFullCount ] = useState(3);
    const [ openingCount, setOpeningCount ] = useState(10);
    const [ batchRunning, setBatchRunning ] = useState(false);
    const [ batchMessage, setBatchMessage ] = useState("");
    const [ batchError, setBatchError ] = useState("");
    const [ batchGame, setBatchGame ] = useState("");
    const [ batchPly, setBatchPly ] = useState(0);
    const [ batchTotalPlies, setBatchTotalPlies ] = useState(0);

    const batchCancelled = useRef(false);

    useEffect(() => {
        setNameDraft(playerName);
        setImportName(playerName);
    }, [ playerName ]);

    useEffect(() => {
        if (!Object.keys(openings).length) setShowImport(true);
    }, [ openings ]);

    useEffect(() => {
        return () => {
            batchCancelled.current = true;
            engineRef.current?.destroy();
            engineRef.current = null;
        };
    }, []);

    useEffect(() => {
        const total = importedGames.length;

        if (!total) return;

        setFullCount(current => current || Math.min(3, total));
        setOpeningCount(current => current || Math.min(10, total));
    }, [ importedGames.length ]);

    const ai = useTrainingAi();
    const puzzleStats = getPuzzleStats(puzzleProgress);
    const repertoire = getRepertoireScore(Object.values(openings));
    const topWeaknesses = Object.values(weaknesses)
        .sort((a, b) => b.score - a.score)
        .slice(0, 6);
    const maxScore = topWeaknesses[0]?.score ?? 1;
    const hasOpenings = Object.keys(openings).length > 0;

    const facts = useMemo(() => {
        const lines = [
            `Player: ${playerName || "unknown"}`,
            `Imported games: ${importedGameCount}${
                importedGameSource ? ` from ${importedGameSource == "chesscom" ? "Chess.com" : "Lichess"}` : ""
            }. Imported games provide opening data only and are not analysed for weaknesses.`,
            `Analysed games: ${games.length}. Only these games provide weakness evidence.`,
            `Puzzle rating: ${puzzleRating}, accuracy ${formatPercent(puzzleStats.accuracy)}, ${puzzleStats.attempts} attempts`,
            `Opening record: ${repertoire.games} games, score ${formatPercent(repertoire.score)}`,
            "Weakness ranking:"
        ];

        if (topWeaknesses.length) {
            for (const weakness of topWeaknesses) {
                const definition = getTacticDefinition(weakness.theme);
                lines.push(
                    `- ${definition?.name ?? weakness.theme}: score ${weakness.score.toFixed(1)}, `
                    + `${weakness.occurrences} occurrences. ${definition?.summary ?? ""}`
                );
            }
        } else {
            lines.push("- No weaknesses recorded yet. Analyse a game first.");
        }

        return lines.join("\n");
    }, [
        playerName, games.length, importedGameCount, importedGameSource,
        puzzleRating, puzzleStats, repertoire, topWeaknesses
    ]);

    function saveName() {
        setPlayerName(nameDraft.trim());
    }

    function reset() {
        resetTraining();
        setConfirmReset(false);
        setBatchMessage("");
        setImportMessage("");
    }

    async function analyseImportedGames() {
        if (batchRunning) return;
        if (!importedGames.length) {
            setBatchError("Import some games first.");
            return;
        }

        if (!engineRef.current) {
            engineRef.current = new Engine(setEngineError);
        }

        const engine = engineRef.current;

        const total = Math.min(
            importedGames.length,
            fullCount + openingCount
        );

        if (!total) {
            setBatchError("Choose at least one game to analyse.");
            return;
        }

        batchCancelled.current = false;
        setBatchRunning(true);
        setBatchError("");
        setBatchMessage("");
        setBatchPly(0);
        setBatchTotalPlies(0);

        let analysed = 0;

        try {
            for (let index = 0; index < total; index++) {
                if (batchCancelled.current) break;

                const imported = importedGames[index];
                let game;

                try {
                    game = parsePgn(imported.pgn);
                } catch {
                    continue;
                }

                const id = getTrainingGameId(game);

                if (games.some(item => item.id == id)) continue;
                if (game.positions.length < 2) continue;

                const full = index < fullCount;
                setBatchGame(
                    `Game ${index + 1} of ${total} · ${full ? "full game" : "opening only"}`
                );

                const result = await analyseGameBatch(engine, game.positions, {
                    full,
                    settings: {
                        depth: batchDepth,
                        lines: batchLines,
                        hash: batchHash
                    },
                    isCancelled: () => batchCancelled.current,
                    onProgress: (ply, totalPlies) => {
                        setBatchPly(ply);
                        setBatchTotalPlies(totalPlies);
                    }
                });

                if (!result || batchCancelled.current) break;

                const training = buildTrainingGame(
                    game,
                    result.classifications,
                    result.bestMoves,
                    playerName
                );

                recordGame(training.game, training.contributions);
                analysed++;
            }

            setBatchMessage(batchCancelled.current
                ? `Stopped after ${analysed} game${analysed == 1 ? "" : "s"}.`
                : `Analysed ${analysed} game${analysed == 1 ? "" : "s"} and updated the weakness profile.`
            );
        } catch (error) {
            setBatchError(error instanceof Error
                ? error.message
                : "The batch analysis failed"
            );
        } finally {
            setBatchRunning(false);
            setBatchGame("");
        }
    }

    function stopBatch() {
        batchCancelled.current = true;
        engineRef.current?.stop();
        setBatchRunning(false);
        setBatchGame("");
    }

    async function importGames() {
        const name = importName.trim();
        if (!name || importing) return;

        const limit = Math.max(1, Math.min(1000, importLimit || 24));

        setImporting(true);
        setImportError("");
        setImportMessage("");

        try {
            const games = importSource == "chesscom"
                ? await fetchChessComGames(name, limit)
                : await fetchLichessGames(name, limit);

            if (!games.length) throw new Error("No public games were returned");

            const studies = buildOpeningStudies(games, name);

            if (!studies.length) {
                throw new Error(
                    "No opening was recognised. Check that the username matches the players in those games."
                );
            }

            replaceOpenings(studies);
            setImportedGames(
                games.map(game => ({ id: game.id, pgn: game.pgn })),
                importSource
            );
            setOpeningLearning(studies[0].key, true);
            setPlayerName(name);
            setShowImport(false);
            setImportMessage(
                `Imported ${games.length} ${importSource == "chesscom" ? "Chess.com" : "Lichess"} `
                + "games and saved your opening repertoire."
            );
        } catch (requestError) {
            setImportError(requestError instanceof Error
                ? requestError.message
                : "Could not import games"
            );
        } finally {
            setImporting(false);
        }
    }

    return <TrainingShell
        eyebrow="Training dashboard"
        title={"YOUR GAME,\nMEASURED."}
        intro="Weaknesses come from your analysed games. Puzzles come from a preset Lichess database tagged by motif. Openings and game reviews turn both into practice."
    >
        {showImport && <section className={styles.importCard}>
            <div className={styles.importHead}>
                <span className={styles.cardLabel}>Import your games</span>
                <span className={styles.cardMeta}>Chess.com or Lichess</span>
            </div>

            <p className={styles.importCopy}>
                Bring in your recent public games. Your openings and profile
                will be saved for every training tab.
            </p>

            <div className={styles.sourceTabs} role="group" aria-label="Game source">
                <button
                    className={importSource == "chesscom"
                        ? `${styles.source} ${styles.activeSource}`
                        : styles.source
                    }
                    aria-pressed={importSource == "chesscom"}
                    onClick={() => setImportSource("chesscom")}
                >
                    Chess.com
                </button>
                <button
                    className={importSource == "lichess"
                        ? `${styles.source} ${styles.activeSource}`
                        : styles.source
                    }
                    aria-pressed={importSource == "lichess"}
                    onClick={() => setImportSource("lichess")}
                >
                    Lichess
                </button>
            </div>

            <div className={styles.limitRow}>
                <label className={styles.limitLabel} htmlFor="import-limit">
                    Games
                </label>
                <input
                    id="import-limit"
                    className={styles.limitInput}
                    type="number"
                    min={1}
                    max={1000}
                    value={importLimit}
                    onChange={event => setImportLimit(Number(event.target.value))}
                />
                {[ 24, 50, 100 ].map(limit => <button
                    key={limit}
                    className={importLimit == limit
                        ? `${styles.limitButton} ${styles.activeLimit}`
                        : styles.limitButton
                    }
                    onClick={() => setImportLimit(limit)}
                >
                    {limit}
                </button>)}
                <button
                    className={importLimit >= 1000
                        ? `${styles.limitButton} ${styles.activeLimit}`
                        : styles.limitButton
                    }
                    onClick={() => setImportLimit(1000)}
                    title="Import up to 1000 games"
                >
                    All
                </button>
            </div>

            <div className={styles.importForm}>
                <input
                    className={styles.input}
                    value={importName}
                    placeholder={importSource == "chesscom" ? "Chess.com username" : "Lichess username"}
                    onChange={event => setImportName(event.target.value)}
                    onKeyDown={event => {
                        if (event.key == "Enter") void importGames();
                    }}
                />
                <button
                    className={styles.primary}
                    disabled={importing || !importName.trim()}
                    onClick={() => void importGames()}
                >
                    {importing ? "Importing..." : "Import games"}
                </button>
            </div>

            {importError && <p className={styles.error}>{importError}</p>}
        </section>}

        {importMessage && <p className={styles.importMessage}>{importMessage}</p>}

        <section className={styles.stats}>
            <div className={styles.stat}>
                <span className={styles.statLabel}>Games analysed</span>
                <strong>{games.length}</strong>
                <span className={styles.statNote}>
                    {games.length ? "saved to this browser" : ""}
                </span>
            </div>
            <div className={styles.stat}>
                <span className={styles.statLabel}>Puzzle rating</span>
                <strong>{puzzleStats.attempts ? puzzleRating : "—"}</strong>
                <span className={styles.statNote}>
                    {puzzleStats.attempts
                        ? `${puzzleStats.due} due · ${formatPercent(puzzleStats.accuracy)} accuracy`
                        : "No puzzles attempted"
                    }
                </span>
            </div>
            <div className={styles.stat}>
                <span className={styles.statLabel}>Weakest pattern</span>
                <strong className={styles.statText}>
                    {topWeaknesses[0]
                        ? getTacticDefinition(topWeaknesses[0].theme)?.name ?? topWeaknesses[0].theme
                        : "—"
                    }
                </strong>
                <span className={styles.statNote}>
                    {topWeaknesses[0]
                        ? `${topWeaknesses[0].occurrences} appearances`
                        : ""
                    }
                </span>
            </div>
            <div className={styles.stat}>
                <span className={styles.statLabel}>Opening score</span>
                <strong>{repertoire.games ? formatPercent(repertoire.score) : "—"}</strong>
                <span className={styles.statNote}>
                    {importedGameCount
                        ? `${importedGameCount} imported · ${repertoire.games} in repertoire`
                        : "No games imported"
                    }
                </span>
            </div>
        </section>

        {importedGames.length > 0 && <section className={styles.batchCard}>
            <div className={styles.importHead}>
                <span className={styles.cardLabel}>Analyse imported games</span>
                <span className={styles.cardMeta}>
                    {importedGames.length} imported · {games.length} analysed
                </span>
            </div>

            <p className={styles.importCopy}>
                Stockfish runs locally. Choose how many games get a full move-by-move
                analysis and how many only get the opening checked.
            </p>

            <div className={styles.batchSettings}>
                <label className={styles.batchField}>
                    <span>Depth</span>
                    <input
                        className={styles.batchInput}
                        type="number"
                        min={8}
                        max={20}
                        value={batchDepth}
                        onChange={event => setBatchDepth(Math.max(8, Math.min(20, Number(event.target.value) || 12)))}
                    />
                </label>
                <label className={styles.batchField}>
                    <span>Lines</span>
                    <select
                        className={styles.batchInput}
                        value={batchLines}
                        onChange={event => setBatchLines(Number(event.target.value))}
                    >
                        {[ 2, 3 ].map(lines => <option key={lines} value={lines}>
                            {lines}
                        </option>)}
                    </select>
                </label>
                <label className={styles.batchField}>
                    <span>Hash</span>
                    <select
                        className={styles.batchInput}
                        value={batchHash}
                        onChange={event => setBatchHash(Number(event.target.value))}
                    >
                        {[ 16, 32, 64, 128 ].map(hash => <option key={hash} value={hash}>
                            {hash} MB
                        </option>)}
                    </select>
                </label>
            </div>

            <div className={styles.batchCounts}>
                <label className={styles.batchField}>
                    <span>Full games</span>
                    <input
                        className={styles.batchInput}
                        type="number"
                        min={0}
                        max={importedGames.length}
                        value={fullCount}
                        onChange={event => setFullCount(Math.max(0, Math.min(importedGames.length, Number(event.target.value) || 0)))}
                    />
                </label>
                <label className={styles.batchField}>
                    <span>Opening only</span>
                    <input
                        className={styles.batchInput}
                        type="number"
                        min={0}
                        max={importedGames.length}
                        value={openingCount}
                        onChange={event => setOpeningCount(Math.max(0, Math.min(importedGames.length, Number(event.target.value) || 0)))}
                    />
                </label>
                <button
                    className={styles.limitButton}
                    onClick={() => {
                        setFullCount(importedGames.length);
                        setOpeningCount(0);
                    }}
                >
                    All full
                </button>
                <button
                    className={styles.limitButton}
                    onClick={() => {
                        setFullCount(0);
                        setOpeningCount(importedGames.length);
                    }}
                >
                    All opening
                </button>
            </div>

            <p className={styles.batchSummary}>
                {Math.min(importedGames.length, fullCount + openingCount)} games selected.
                Full games use more time than opening-only games.
            </p>

            <div className={styles.batchActions}>
                <button
                    className={styles.primary}
                    disabled={batchRunning}
                    onClick={() => void analyseImportedGames()}
                >
                    {batchRunning ? "Analysing..." : "Analyse games"}
                </button>
                {batchRunning && <button
                    className={styles.smallButton}
                    onClick={stopBatch}
                >
                    Stop
                </button>}
            </div>

            {engineError && <p className={styles.error}>Engine error: {engineError}</p>}
            {batchError && <p className={styles.error}>{batchError}</p>}
            {batchMessage && <p className={styles.importMessage}>{batchMessage}</p>}

            {batchRunning && <div className={styles.batchProgress}>
                <div className={styles.batchProgressHead}>
                    <span>{batchGame || "Starting Stockfish..."}</span>
                    <span>{batchPly} / {batchTotalPlies || "?"}</span>
                </div>
                <div className={styles.batchBar}>
                    <span style={{
                        width: `${batchTotalPlies
                            ? (batchPly / batchTotalPlies) * 100
                            : 0
                        }%`
                    }}/>
                </div>
            </div>}
        </section>}

        <div className={styles.grid}>
            <section className={styles.card}>
                <div className={styles.cardHead}>
                    <span className={styles.cardLabel}>Weakness profile</span>
                    <Link className={styles.textLink} to="/glossary">
                        All definitions
                        <ArrowRight size={12} aria-hidden="true"/>
                    </Link>
                </div>

                {topWeaknesses.length
                    ? <div className={styles.weaknessList}>
                        <p className={styles.detectionNote}>
                            Each mistake is tagged from the engine's best move in
                            that position. Blunders weigh more than mistakes.
                            {importedGameCount > 0 && ` ${importedGameCount} imported games are used for openings only.`}
                        </p>
                        {topWeaknesses.map(weakness => {
                            const definition = getTacticDefinition(weakness.theme);

                            return <div className={styles.weakness} key={weakness.theme}>
                                <div className={styles.weaknessTop}>
                                    <Link
                                        className={styles.weaknessName}
                                        to={`/glossary?term=${encodeURIComponent(weakness.theme)}`}
                                    >
                                        {definition?.name ?? weakness.theme}
                                    </Link>
                                    <span className={styles.weaknessCount}>
                                        {weakness.occurrences}×
                                    </span>
                                </div>
                                <div className={styles.bar}>
                                    <span style={{ width: `${(weakness.score / maxScore) * 100}%` }}/>
                                </div>
                                <p className={styles.weaknessCopy}>
                                    {definition?.summary ?? "Review the pattern and practise it."}
                                </p>
                                <Link
                                    className={styles.practice}
                                    to={`/puzzles?theme=${encodeURIComponent(weakness.theme)}`}
                                >
                                    Practise this motif
                                    <ArrowRight size={11} aria-hidden="true"/>
                                </Link>
                            </div>;
                        })}
                    </div>
                    : <div className={styles.empty}>
                        <p>
                            {!games.length && !hasOpenings
                                ? "No games found, try importing some games or connecting your profile"
                                : !games.length
                                    ? "Your games are imported. Open one of them and run the analysis to build a weakness profile."
                                    : "No tactical weaknesses were found in your analysed games."
                            }
                        </p>
                        {games.length > 0 && <Link className={styles.primary} to="/analysis">
                            Analyse a game
                            <ArrowRight size={16} aria-hidden="true"/>
                        </Link>}
                    </div>
                }
            </section>

            <section className={styles.card}>
                <div className={styles.cardHead}>
                    <span className={styles.cardLabel}>Player profile</span>
                    <span className={styles.cardMeta}>Local only</span>
                </div>

                <label className={styles.fieldLabel} htmlFor="training-name">
                    Your Chess.com or Lichess username
                </label>
                <div className={styles.nameRow}>
                    <input
                        id="training-name"
                        className={styles.input}
                        value={nameDraft}
                        placeholder="e.g. DrNykterstein"
                        onChange={event => setNameDraft(event.target.value)}
                        onKeyDown={event => {
                            if (event.key == "Enter") saveName();
                        }}
                    />
                    <button className={styles.smallButton} onClick={saveName}>
                        Save
                    </button>
                </div>
                <p className={styles.help}>
                    Used to decide which side of an imported game is yours.
                    Without it, both sides are measured.
                </p>

                {games.length > 0 && <div className={styles.profileStats}>
                    <div>
                        <span>Mistakes</span>
                        <strong>{games.reduce((sum, game) => sum + game.mistakes, 0)}</strong>
                    </div>
                    <div>
                        <span>Blunders</span>
                        <strong>{games.reduce((sum, game) => sum + game.blunders, 0)}</strong>
                    </div>
                </div>}

                <div className={styles.profileActions}>
                    {hasOpenings && !showImport && <button
                        className={styles.secondary}
                        onClick={() => setShowImport(true)}
                    >
                        Import more games
                    </button>}
                    <button
                        className={styles.danger}
                        onClick={() => setConfirmReset(true)}
                    >
                        Reset training
                    </button>
                </div>

                {confirmReset && <div className={styles.confirm}>
                    <p>Delete every saved game, weakness, puzzle result and opening?</p>
                    <div className={styles.confirmActions}>
                        <button className={styles.danger} onClick={reset}>
                            Delete everything
                        </button>
                        <button
                            className={styles.smallButton}
                            onClick={() => setConfirmReset(false)}
                        >
                            Cancel
                        </button>
                    </div>
                </div>}
            </section>
        </div>

        {topWeaknesses.length > 0 && <section className={`${styles.card} ${styles.reviewCard}`}>
            <div className={styles.cardHead}>
                <span className={styles.cardLabel}>AI weakness review</span>
                <button
                    className={styles.iconButton}
                    title="Training AI settings"
                    aria-label="Training AI settings"
                    onClick={() => setShowSettings(true)}
                >
                    <SettingsIcon/>
                </button>
            </div>

            {ai.content
                ? <div className={styles.narrative}>
                    <Markdown text={ai.content}/>
                </div>
                : <div className={styles.aiEmpty}>
                    <p>
                        Turn the numbers into a short, human explanation.
                        Uses your configured coach provider and key.
                    </p>
                    <button
                        className={styles.primary}
                        disabled={ai.busy}
                        onClick={() => ai.configured
                            ? void ai.generate("weakness", facts)
                            : setShowSettings(true)
                        }
                    >
                        {ai.busy ? ai.status : ai.configured
                            ? "Explain my weaknesses"
                            : "Connect a model"
                        }
                    </button>
                </div>
            }

            {ai.error && <p className={styles.error}>{ai.error}</p>}

            {ai.busy && <button className={styles.smallButton} onClick={ai.stop}>
                Stop
            </button>}
        </section>}

        {showSettings && <AiSettingsDialog
            settings={ai.settings}
            onChange={ai.setSettings}
            onClose={() => setShowSettings(false)}
        />}
    </TrainingShell>;
}
