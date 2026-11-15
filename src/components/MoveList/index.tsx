import { useEffect, useRef } from "react";

import {
    classificationImages, classificationLabels
} from "../../constants/classifications";
import {
    GameVariation, MoveClassification, Position
} from "../../types";

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

function getClassification(
    position: Position,
    ply: number,
    classifications: MoveListProps["classifications"]
) {
    const engine = classifications[ply];

    if (engine) return engine;
    if (!position.annotation) return;

    return {
        classification: position.annotation,
        pointLoss: 0
    };
}

function MoveList({
    positions, currentPly, classifications, variations,
    activeVariationId, activeVariationIndex, onSelect, onSelectVariation
}: MoveListProps) {
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

    function renderMove(
        cell: MoveCell, classification: MoveClassification | undefined
    ) {
        return <button
            className={moveClass(cell.ply)}
            data-ply={cell.ply}
            onClick={() => onSelect(cell.ply)}
        >
            {classification && <img
                className={styles.classification}
                src={classificationImages[classification.classification]}
                alt=""
                title={`${classificationLabels[classification.classification]}${
                    cell.position.annotationMark
                        ? ` (PGN ${cell.position.annotationMark})`
                        : ""
                }`}
            />}

            {cell.position.san}
        </button>;
    }

    function renderComment(cell: MoveCell) {
        if (!cell.position.comment) return;

        return <div className={styles.comment}>
            {cell.position.comment}
        </div>;
    }

    function renderVariation(variation: GameVariation) {
        const active = variation.id == activeVariationId;
        const comments = [
            variation.comment,
            ...variation.positions.map(position => position.comment)
        ].filter((comment, index, list): comment is string => (
            !!comment && list.indexOf(comment) == index
        ));

        return <div className={styles.variation} key={variation.id}>
            <div className={styles.variationRail}/>

            <div className={styles.variationContent}>
                <div className={styles.variationMoves}>
                    {variation.positions.map((position, index) => {
                        const showNumber = index == 0 || position.colour == "w";
                        const played = active
                            && index == (activeVariationIndex ?? 0) - 1;

                        return <button
                            key={`${variation.id}-${index}`}
                            className={played
                                ? `${styles.variationMove} ${styles.activeVariationMove}`
                                : styles.variationMove
                            }
                            onClick={() => onSelectVariation(variation, index + 1)}
                        >
                            {showNumber && <span className={styles.variationNumber}>
                                {position.moveNumber}{position.colour == "b" ? "..." : "."}
                            </span>}
                            {position.san}
                        </button>;
                    })}
                </div>

                {comments.map(comment => <p
                    className={styles.variationComment}
                    key={comment}
                >
                    {comment}
                </p>)}
            </div>
        </div>;
    }

    return <div className={styles.list} ref={listRef}>

        {rows.map(row => {
            const white = row.white;
            const black = row.black;
            const whiteClassification = white
                ? getClassification(white.position, white.ply, classifications)
                : undefined;
            const blackClassification = black
                ? getClassification(black.position, black.ply, classifications)
                : undefined;
            const split = !!white?.position.comment && !!black;

            return <div className={styles.entry} key={`${row.number}-${white?.ply ?? "b"}`}>
                <div className={styles.row}>
                    <span className={styles.number}>{row.number}.</span>

                    {white
                        ? renderMove(white, whiteClassification)
                        : <span className={styles.move} />
                    }

                    {split
                        ? <span className={styles.placeholder}>...</span>
                        : black
                            ? renderMove(black, blackClassification)
                            : <span className={styles.move} />
                    }
                </div>

                {white && renderComment(white)}

                {split && black && <>
                    <div className={styles.row}>
                        <span className={styles.number}/>
                        <span className={styles.placeholder}>...</span>
                        {renderMove(black, blackClassification)}
                    </div>

                    {renderComment(black)}
                </>}

                {!split && black && renderComment(black)}

                {variations
                    .filter(variation => {
                        const start = white?.ply ?? black?.ply ?? 0;
                        const end = black?.ply ?? white?.ply ?? start;

                        return variation.rootPly >= start - 1
                            && variation.rootPly <= end;
                    })
                    .map(renderVariation)}
            </div>;
        })}
    </div>;
}

export default MoveList;
