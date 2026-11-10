import WinBar from "../WinBar";

import useEscapeClose from "../../hooks/useEscapeClose";
import { formatGames, formatPercent } from "../../lib/format";

import OpeningDialogProps from "./OpeningDialogProps";
import * as styles from "./OpeningDialog.module.css";

function OpeningDialog({ opening, onPlay, onClose }: OpeningDialogProps) {
    useEscapeClose(onClose);

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
            aria-labelledby="opening-book-title"
        >
            <div className={styles.header}>
                <div className={styles.titleArea}>
                    <h2 className={styles.title} id="opening-book-title">
                        Opening book
                    </h2>
                    <span className={styles.subtitle}>
                        {opening.name ?? "Starting position"}
                    </span>
                </div>

                <button className={styles.close} onClick={onClose}>
                    Close
                </button>
            </div>

            {opening.stats && <div className={styles.summary}>
                <div className={styles.summaryRow}>
                    <span>{formatGames(opening.stats.games)} games</span>
                    <span>Avg rating {Math.round(opening.stats.avgRating)}</span>
                </div>

                <WinBar
                    white={opening.stats.whiteWin}
                    draw={opening.stats.draw}
                    black={opening.stats.blackWin}
                />

                <div className={styles.summaryRow}>
                    <span>White {formatPercent(opening.stats.whiteWin)}</span>
                    <span>Draw {formatPercent(opening.stats.draw)}</span>
                    <span>Black {formatPercent(opening.stats.blackWin)}</span>
                </div>
            </div>}

            <div className={styles.tableHeader}>
                <span>Move</span>
                <span>Games</span>
                <span>Share</span>
                <span>White</span>
                <span>Draw</span>
                <span>Black</span>
                <span>Avg</span>
            </div>

            <div className={styles.table}>
                {opening.bookMoves.map(move => {
                    const share = opening.stats?.games
                        ? move.games / opening.stats.games
                        : 0;

                    return <button
                        className={styles.row}
                        key={move.san}
                        onClick={() => onPlay(move)}
                    >
                        <span className={styles.move}>
                            <span className={styles.san}>{move.san}</span>
                            <span className={styles.name}>{move.name ?? "Unnamed line"}</span>
                        </span>
                        <span className={styles.number}>{move.games ? formatGames(move.games) : "-"}</span>
                        <span className={styles.number}>{move.games ? formatPercent(share) : "-"}</span>
                        <span className={styles.number}>{move.games ? formatPercent(move.whiteWin) : "-"}</span>
                        <span className={styles.number}>{move.games ? formatPercent(move.draw) : "-"}</span>
                        <span className={styles.number}>{move.games ? formatPercent(move.blackWin) : "-"}</span>
                        <span className={styles.number}>{move.avgRating ? Math.round(move.avgRating) : "-"}</span>
                    </button>;
                })}
            </div>
        </div>
    </div>;
}

export default OpeningDialog;
