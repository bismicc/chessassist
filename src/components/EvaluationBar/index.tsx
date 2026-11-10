import { formatEvaluation, toWhiteShare } from "../../lib/evaluation";

import EvaluationBarProps from "./EvaluationBarProps";
import * as styles from "./EvaluationBar.module.css";

function EvaluationBar({ evaluation, flipped, height }: EvaluationBarProps) {
    const rawShare = evaluation ? toWhiteShare(evaluation) : 0.5;
    const share = evaluation?.type == "mate"
        ? rawShare
        : Math.min(0.97, Math.max(0.03, rawShare));
    const labelOnBlack = flipped || share == 0;

    return <div className={styles.bar} style={{ height }}>
        <div
            className={styles.white}
            style={{
                height: `${share * 100}%`,
                ...(flipped ? { top: 0 } : { bottom: 0 })
            }}
        />

        <span className={`${styles.label} ${labelOnBlack ? styles.light : styles.dark}`}>
            {formatEvaluation(evaluation)}
        </span>
    </div>;
}

export default EvaluationBar;
