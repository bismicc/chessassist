import EngineLines from "../EngineLines";
import MoveList from "../MoveList";
import {
    FirstIcon, FlipIcon, ImportIcon, LastIcon,
    NextIcon, PreviousIcon, SettingsIcon
} from "../Icons";

import AnalysisPanelProps from "./AnalysisPanelProps";
import * as styles from "./AnalysisPanel.module.css";

function AnalysisPanel({
    game, currentPly, lines, settings, analysing, progress, error,
    variationMoves, onImport, onSettings, onFlip, onSelectPly,
    onExitVariation, onAnalyseGame, onStopAnalysis
}: AnalysisPanelProps) {
    const lastPly = game.positions.length - 1;
    const result = game.headers.Result || "*";
    const event = game.headers.Event || "Imported game";

    return <section className={styles.panel}>
        <header className={styles.header}>
            <h1 className={styles.title}>Game Analysis</h1>
        </header>

        <div className={styles.toolbar}>
            <button className={styles.importButton} onClick={onImport}>
                <ImportIcon/>
                Import PGN
            </button>

            <button className={styles.iconButton} title="Flip board" onClick={onFlip}>
                <FlipIcon/>
            </button>

            <button className={styles.iconButton} title="Engine settings" onClick={onSettings}>
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

        <EngineLines lines={lines} />

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
                    ? `Stop ${progress}/${lastPly}`
                    : "Analyse game"
                }
            </button>
        </div>

        {analysing && <div className={styles.progressTrack}>
            <div
                className={styles.progressBar}
                style={{ width: `${(progress / Math.max(1, lastPly)) * 100}%` }}
            />
        </div>}

        <MoveList
            positions={game.positions}
            currentPly={currentPly}
            onSelect={onSelectPly}
        />

        <footer className={styles.footer}>
            <button
                className={styles.navButton}
                title="Start"
                disabled={currentPly == 0}
                onClick={() => onSelectPly(0)}
            >
                <FirstIcon/>
            </button>

            <button
                className={styles.navButton}
                title="Previous move"
                disabled={currentPly == 0}
                onClick={() => onSelectPly(currentPly - 1)}
            >
                <PreviousIcon/>
            </button>

            <span className={styles.counter}>{currentPly} / {lastPly}</span>

            <button
                className={styles.navButton}
                title="Next move"
                disabled={currentPly == lastPly}
                onClick={() => onSelectPly(currentPly + 1)}
            >
                <NextIcon/>
            </button>

            <button
                className={styles.navButton}
                title="End"
                disabled={currentPly == lastPly}
                onClick={() => onSelectPly(lastPly)}
            >
                <LastIcon/>
            </button>
        </footer>
    </section>;
}

export default AnalysisPanel;
