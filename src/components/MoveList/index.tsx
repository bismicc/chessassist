import { useEffect, useRef } from "react";

import { Position } from "../../types";

import MoveListProps from "./MoveListProps";
import * as styles from "./MoveList.module.css";

interface MoveCell {
    ply: number;
    position: Position;
}

interface MoveRow {
    number: number;
    white?: MoveCell;
    black?: MoveCell;
}

function MoveList({ positions, currentPly, onSelect }: MoveListProps) {
    const listRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const active = listRef.current?.querySelector(`[data-ply="${currentPly}"]`);
        active?.scrollIntoView({ block: "nearest" });
    }, [ currentPly ]);

    const rows: MoveRow[] = [];

    for (let ply = 1; ply < positions.length; ply++) {
        const position = positions[ply];
        const cell = { ply, position };

        if (position.colour == "w") {
            rows.push({ number: position.moveNumber, white: cell });
            continue;
        }

        const last = rows.at(-1);

        if (last && !last.black && last.number == position.moveNumber) {
            last.black = cell;
        } else {
            rows.push({ number: position.moveNumber, black: cell });
        }
    }

    function moveClass(ply: number) {
        return ply == currentPly
            ? `${styles.move} ${styles.active}`
            : styles.move;
    }

    return <div className={styles.list} ref={listRef}>
        {rows.map(row => {
            const white = row.white;
            const black = row.black;

            return <div className={styles.row} key={`${row.number}-${white?.ply ?? "b"}`}>
                <span className={styles.number}>{row.number}.</span>

                {white
                    ? <button
                        className={moveClass(white.ply)}
                        data-ply={white.ply}
                        onClick={() => onSelect(white.ply)}
                    >
                        {white.position.san}
                    </button>
                    : <span className={styles.move} />
                }

                {black
                    ? <button
                        className={moveClass(black.ply)}
                        data-ply={black.ply}
                        onClick={() => onSelect(black.ply)}
                    >
                        {black.position.san}
                    </button>
                    : <span className={styles.move} />
                }
            </div>;
        })}
    </div>;
}

export default MoveList;
