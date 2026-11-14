import { ChangeEvent, useRef, useState } from "react";

import useEscapeClose from "../../hooks/useEscapeClose";

import {
    fetchChessComGames, fetchLichessGames, ImportedGame
} from "../../lib/gameImport";

import ImportDialogProps from "./ImportDialogProps";
import * as styles from "./ImportDialog.module.css";

type Source = "paste" | "chesscom" | "lichess" | "file";

const sources: { id: Source; label: string }[] = [
    { id: "paste", label: "Paste PGN" },
    { id: "chesscom", label: "Chess.com" },
    { id: "lichess", label: "Lichess" },
    { id: "file", label: "PGN file" }
];

function ImportDialog({ onImport, onClose }: ImportDialogProps) {
    const [ source, setSource ] = useState<Source>("paste");
    const [ pgn, setPgn ] = useState("");
    const [ username, setUsername ] = useState("");
    const [ games, setGames ] = useState<ImportedGame[]>([]);
    const [ loading, setLoading ] = useState(false);
    const [ error, setError ] = useState("");
    const fileInput = useRef<HTMLInputElement>(null);

    useEscapeClose(onClose);

    function changeSource(next: Source) {
        setSource(next);
        setGames([]);
        setError("");
        setLoading(false);
    }

    function submit() {
        const problem = onImport(pgn);
        if (problem) setError(problem);
    }

    async function search() {
        const name = username.trim();
        if (!name) {
            setError("Enter a username first");
            return;
        }

        setLoading(true);
        setError("");
        setGames([]);

        try {
            const found = source == "chesscom"
                ? await fetchChessComGames(name)
                : await fetchLichessGames(name);

            if (!found.length) {
                setError("No recent public games found for that username");
                return;
            }

            setGames(found);
        } catch (fetchError) {
            setError(fetchError instanceof Error
                ? fetchError.message
                : "Could not fetch games"
            );
        } finally {
            setLoading(false);
        }
    }

    function importGame(game: ImportedGame) {
        const problem = onImport(game.pgn);
        if (problem) setError(problem);
    }

    async function importFile(file: File) {
        setError("");

        try {
            const text = await file.text();
            const problem = onImport(text);
            if (problem) setError(problem);
        } catch {
            setError("Could not read that file");
        }
    }

    async function handleFile(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        if (!file) return;

        await importFile(file);
        event.target.value = "";
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

            <div className={styles.tabs} role="tablist" aria-label="Import source">
                {sources.map(item => <button
                    className={source == item.id ? styles.activeTab : styles.tab}
                    type="button"
                    role="tab"
                    aria-selected={source == item.id}
                    key={item.id}
                    onClick={() => changeSource(item.id)}
                >
                    {item.label}
                </button>)}
            </div>

            {source == "paste" && <>
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
            </>}

            {(source == "chesscom" || source == "lichess") && <>
                <p className={styles.hint}>
                    Enter a public {source == "chesscom" ? "Chess.com" : "Lichess"}
                    {" "}username to load their recent games
                </p>

                <div className={styles.searchRow}>
                    <span className={styles.at}>@</span>
                    <input
                        className={styles.input}
                        value={username}
                        autoFocus
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        placeholder={source == "chesscom" ? "hikaru" : "DrNykterstein"}
                        onChange={event => {
                            setUsername(event.target.value);
                            setError("");
                        }}
                        onKeyDown={event => {
                            if (event.key == "Enter") void search();
                        }}
                    />
                    <button
                        className={styles.primary}
                        type="button"
                        disabled={loading}
                        onClick={() => void search()}
                    >
                        {loading ? "Loading..." : "Find games"}
                    </button>
                </div>
            </>}

            {source == "file" && <>
                <p className={styles.hint}>
                    Choose a .pgn file from your computer. A single game per file
                    is supported.
                </p>

                <div
                    className={styles.fileArea}
                    onDragOver={event => event.preventDefault()}
                    onDrop={event => {
                        event.preventDefault();
                        const file = event.dataTransfer.files[0];
                        if (file) void importFile(file);
                    }}
                >
                    <span className={styles.fileMark}>PGN</span>
                    <p>Drop a game file here, or choose one from your computer.</p>
                    <button
                        className={styles.primary}
                        type="button"
                        onClick={() => fileInput.current?.click()}
                    >
                        Choose .pgn file
                    </button>
                    <input
                        ref={fileInput}
                        className={styles.fileInput}
                        type="file"
                        accept=".pgn,application/x-chess-pgn,text/plain"
                        onChange={handleFile}
                    />
                </div>
            </>}

            {error && <p className={styles.error}>{error}</p>}

            {games.length > 0 && <div className={styles.gameList}>
                {games.map(game => <button
                    className={styles.gameRow}
                    type="button"
                    key={game.id}
                    onClick={() => importGame(game)}
                >
                    <span className={styles.gamePlayers}>
                        <strong>{game.white}</strong>
                        {game.whiteElo && <em>{game.whiteElo}</em>}
                        <span className={styles.versus}>vs</span>
                        <strong>{game.black}</strong>
                        {game.blackElo && <em>{game.blackElo}</em>}
                    </span>

                    <span className={styles.gameMeta}>
                        <span className={styles.result}>{game.result}</span>
                        <span>{game.date}</span>
                        <span className={styles.timeClass}>{game.timeClass}</span>
                        <span className={styles.arrow}>→</span>
                    </span>
                </button>)}
            </div>}

            <div className={styles.actions}>
                <button className={styles.secondary} onClick={onClose}>
                    Cancel
                </button>

                {source == "paste" && <button className={styles.primary} onClick={submit}>
                    Import game
                </button>}
            </div>
        </div>
    </div>;
}

export default ImportDialog;
