import { formatEvaluation } from "../../lib/evaluation";

import EngineLinesProps from "./EngineLinesProps";
import * as styles from "./EngineLines.module.css";

function EngineLines({ lines }: EngineLinesProps) {
    const depth = lines[0]?.depth;

    return <section className={styles.section}>
        <div className={styles.header}>
            <span className={styles.title}>Stockfish</span>
            <span className={styles.depth}>
                {depth ? `Depth ${depth}` : "Thinking"}
            </span>
        </div>

        <div className={styles.lines}>
            {lines.length
                ? lines.map(line => <div key={line.multipv} className={styles.line}>
                    <span className={styles.evaluation}>
                        {formatEvaluation(line.evaluation)}
                    </span>

                    <span className={styles.moves}>
                        {line.sanMoves.slice(0, 8).join(" ")}
                        {line.sanMoves.length > 8 ? " ..." : ""}
                    </span>
                </div>)
                : <div className={styles.empty}>
                    <span className={styles.pulse} />
                    <span>Calculating lines</span>
                </div>
            }
        </div>
    </section>;
}

export default EngineLines;
