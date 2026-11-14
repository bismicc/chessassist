import { useState } from "react";

import EngineLines from "../EngineLines";
import MoveList from "../MoveList";
import OpeningDialog from "../OpeningDialog";
import WinBar from "../WinBar";
import {
    FirstIcon, FlipIcon, ImportIcon, LastIcon,
    NextIcon, PreviousIcon, SettingsIcon
} from "../Icons";

import { classificationImages } from "../../constants/classifications";
import { formatGames, formatPercent } from "../../lib/format";
import { OpeningStats } from "../../lib/openings";

import AnalysisPanelProps from "./AnalysisPanelProps";
import * as styles from "./AnalysisPanel.module.css";

function OpeningStatsBlock({ stats }: { stats: OpeningStats }) {
    return <div className={styles.openingStats}>
        <div className={styles.openingNumbers}>
            <span>{formatGames(stats.games)} games</span>
            <span>Avg {Math.round(stats.avgRating)}</span>
        </div>

        <WinBar
            white={stats.whiteWin}
            draw={stats.draw}
            black={stats.blackWin}
        />

        <div className={styles.winLabels}>
            <span>W {formatPercent(stats.whiteWin)}</span>
            <span>D {formatPercent(stats.draw)}</span>
            <span>B {formatPercent(stats.blackWin)}</span>
        </div>
    </div>;
}

function AnalysisPanel({
    game, currentPly, lines, settings, classifications, opening, gameOver,
    analysing, progress, error, variationMoves, variationDepth, canGoBack,
    canGoForward, onBack, onForward, onStart, onEnd, onImport, onSettings,
    onFlip, onSelectPly, onPlayBookMove, onPlayLine, onExitVariation,
    onAnalyseGame, onStopAnalysis
}: AnalysisPanelProps) {
    const [ showBook, setShowBook ] = useState(false);

    const lastPly = game.positions.length - 1;
    const result = game.headers.Result || "*";
    const event = game.headers.Event || "Imported game";

    return <section className={styles.panel}>
        <header className={styles.header}>
            <h1 className={styles.title}>Game Analysis</h1>
        </header>

        <div className={styles.view}>
            <div className={styles.toolbar}>
                <button className={styles.importButton} onClick={onImport}>
                    <ImportIcon/>
                    Import game
                </button>

                <button
                    className={styles.iconButton}
                    title="Flip board"
                    aria-label="Flip board"
                    onClick={onFlip}
                >
                    <FlipIcon/>
                </button>

                <button
                    className={styles.iconButton}
                    title="Engine settings"
                    aria-label="Engine settings"
                    onClick={onSettings}
                >
                    <SettingsIcon/>
                </button>
            </div>

            <div className={styles.meta}>
                <span className={styles.event}>{event}</span>
                <span className={styles.result}>{result}</span>
                <span className={styles.depth}>Depth {settings.depth}</span>
            </div>

            {error && <div className={styles.error}>Engine error: {error}</div>}

            {variationMoves.length > 0 && <div className={styles.variation}>
                <span className={styles.variationLabel}>Exploring</span>
                <span className={styles.variationMoves}>{variationMoves.join(" ")}</span>
                <button className={styles.backButton} onClick={onExitVariation}>
                    Back to game
                </button>
            </div>}

            <EngineLines
                lines={lines}
                gameOver={gameOver}
                onPlayLine={onPlayLine}
            />

            {(opening.name || opening.bookMoves.length > 0 || opening.stats) && <section className={styles.opening}>
                <div className={styles.openingHeader}>
                    <span className={styles.openingLabel}>
                        <img
                            className={styles.openingIcon}
                            src={classificationImages.book}
                            alt=""
                        />
                        Opening
                    </span>
                    <span className={styles.openingName}>
                        {opening.name ?? (currentPly == 0 ? "Starting position" : "Out of book")}
                    </span>
                    {opening.lastKnown && <span className={styles.lastKnown}>last known</span>}
                </div>

                {opening.stats && <OpeningStatsBlock stats={opening.stats} />}

                {opening.bookMoves.length > 0 && <div className={styles.openingFooter}>
                    <span className={styles.mostPlayed}>
                        Most played: {opening.bookMoves[0].san}
                        {opening.bookMoves[0].games
                            ? ` (${formatGames(opening.bookMoves[0].games)})`
                            : ""
                        }
                    </span>

                    <button
                        className={styles.bookButton}
                        onClick={() => setShowBook(true)}
                    >
                        Book moves ({opening.bookMoves.length})
                    </button>
                </div>}
            </section>}

            {showBook && <OpeningDialog
                opening={opening}
                onPlay={move => {
                    onPlayBookMove(move.san);
                    setShowBook(false);
                }}
                onClose={() => setShowBook(false)}
            />}

            <div className={styles.movesHeader}>
                <span className={styles.movesTitle}>Moves</span>

                <button
                    className={analysing
                        ? `${styles.analyseButton} ${styles.stopButton}`
                        : styles.analyseButton
                    }
                    onClick={analysing ? onStopAnalysis : onAnalyseGame}
                >
                    {analysing
                        ? `Stop ${progress}/${game.positions.length}`
                        : "Analyse game"
                    }
                </button>
            </div>

            {analysing && <div className={styles.progressTrack}>
                <div
                    className={styles.progressBar}
                    style={{ width: `${(progress / Math.max(1, game.positions.length)) * 100}%` }}
                />
            </div>}

            <MoveList
                positions={game.positions}
                currentPly={currentPly}
                classifications={classifications}
                onSelect={onSelectPly}
            />

            <footer className={styles.footer}>
                <button
                    className={styles.navButton}
                    title="Start"
                    aria-label="Start"
                    disabled={!canGoBack}
                    onClick={onStart}
                >
                    <FirstIcon/>
                </button>

                <button
                    className={styles.navButton}
                    title="Previous move"
                    aria-label="Previous move"
                    disabled={!canGoBack}
                    onClick={onBack}
                >
                    <PreviousIcon/>
                </button>

                <span className={styles.counter}>
                    {currentPly} / {lastPly}{variationDepth ? ` +${variationDepth}` : ""}
                </span>

                <button
                    className={styles.navButton}
                    title="Next move"
                    aria-label="Next move"
                    disabled={!canGoForward}
                    onClick={onForward}
                >
                    <NextIcon/>
                </button>

                <button
                    className={styles.navButton}
                    title="End"
                    aria-label="End"
                    disabled={!canGoForward}
                    onClick={onEnd}
                >
                    <LastIcon/>
                </button>
            </footer>
        </div>
    </section>;
}

export default AnalysisPanel;
