import { formatEvaluation } from "../../lib/evaluation";

import EngineLinesProps from "./EngineLinesProps";
import * as styles from "./EngineLines.module.css";

function EngineLines({ lines, gameOver, onPlayLine }: EngineLinesProps) {
    const depth = lines[0]?.depth;

    return <section className={styles.section}>
        <div className={styles.header}>
            <span className={styles.title}>Stockfish</span>
            <span className={styles.depth}>
                {depth ? `Depth ${depth}` : gameOver ? "Game over" : "Thinking"}
            </span>
        </div>

        <div className={styles.lines}>
            {lines.length
                ? lines.map(line => <button
                    className={styles.line}
                    key={line.multipv}
                    title="Play this move"
                    onClick={() => onPlayLine(line)}
                >
                    <span className={styles.evaluation}>
                        {formatEvaluation(line.evaluation)}
                    </span>

                    <span className={styles.moves}>
                        {line.sanMoves.slice(0, 8).join(" ")}
                        {line.sanMoves.length > 8 ? " ..." : ""}
                    </span>
                </button>)
                : <div className={styles.empty}>
                    {gameOver
                        ? <span>Final position</span>
                        : <>
                            <span className={styles.pulse} />
                            <span>Calculating lines</span>
                        </>
                    }
                </div>
            }
        </div>
    </section>;
}

export default EngineLines;
