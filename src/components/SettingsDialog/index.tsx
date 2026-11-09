import SettingsDialogProps from "./SettingsDialogProps";
import * as styles from "./SettingsDialog.module.css";

function SettingsDialog({ settings, onChange, onClose }: SettingsDialogProps) {
    return <div
        className={styles.backdrop}
        onPointerDown={event => {
            if (event.target == event.currentTarget) onClose();
        }}
    >
        <div className={styles.dialog}>
            <div className={styles.header}>
                <h2 className={styles.title}>Stockfish settings</h2>
                <button className={styles.done} onClick={onClose}>Done</button>
            </div>

            <div className={styles.field}>
                <div className={styles.labelRow}>
                    <label htmlFor="depth">Search depth</label>
                    <span className={styles.value}>{settings.depth}</span>
                </div>

                <input
                    id="depth"
                    className={styles.range}
                    type="range"
                    min={6}
                    max={24}
                    step={1}
                    value={settings.depth}
                    onChange={event => onChange({
                        ...settings,
                        depth: Number(event.target.value)
                    })}
                />

                <span className={styles.hint}>
                    Deeper searches are stronger but slower
                </span>
            </div>

            <div className={styles.field}>
                <div className={styles.labelRow}>
                    <span>Engine lines</span>
                </div>

                <div className={styles.segments}>
                    {[ 1, 2, 3 ].map(count => <button
                        key={count}
                        className={count == settings.lines
                            ? `${styles.segment} ${styles.selected}`
                            : styles.segment
                        }
                        onClick={() => onChange({ ...settings, lines: count })}
                    >
                        {count}
                    </button>)}
                </div>
            </div>

            <div className={styles.field}>
                <div className={styles.labelRow}>
                    <label htmlFor="hash">Hash size</label>
                </div>

                <select
                    id="hash"
                    className={styles.select}
                    value={settings.hash}
                    onChange={event => onChange({
                        ...settings,
                        hash: Number(event.target.value)
                    })}
                >
                    {[ 16, 32, 64, 128, 256 ].map(size => <option key={size} value={size}>
                        {size} MB
                    </option>)}
                </select>
            </div>

            <p className={styles.note}>
                Analysis runs locally in your browser. Nothing is uploaded.
            </p>
        </div>
    </div>;
}

export default SettingsDialog;
