import { useState } from "react";

import useEscapeClose from "../../hooks/useEscapeClose";

import ImportDialogProps from "./ImportDialogProps";
import * as styles from "./ImportDialog.module.css";

function ImportDialog({ onImport, onClose }: ImportDialogProps) {
    const [ pgn, setPgn ] = useState("");
    const [ error, setError ] = useState("");

    useEscapeClose(onClose);

    function submit() {
        const problem = onImport(pgn);
        if (problem) setError(problem);
    }

    return <div
        className={styles.backdrop}
        onPointerDown={event => {
            if (event.target == event.currentTarget) onClose();
        }}
    >
        <div
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="import-game-title"
        >
            <div className={styles.header}>
                <h2 className={styles.title} id="import-game-title">
                    Import a game
                </h2>
            </div>

            <p className={styles.hint}>
                Paste a PGN from Chess.com, Lichess or any other site
            </p>

            <textarea
                className={styles.textarea}
                autoFocus
                spellCheck={false}
                value={pgn}
                placeholder={`[Event "Casual Game"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bb5 ...`}
                onChange={event => {
                    setPgn(event.target.value);
                    setError("");
                }}
            />

            {error && <p className={styles.error}>{error}</p>}

            <div className={styles.actions}>
                <button className={styles.secondary} onClick={onClose}>
                    Cancel
                </button>

                <button className={styles.primary} onClick={submit}>
                    Import game
                </button>
            </div>
        </div>
    </div>;
}

export default ImportDialog;
