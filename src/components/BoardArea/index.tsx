import { useEffect, useMemo, useState } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import { Arrow, CustomSquareStyles, Square } from "react-chessboard/dist/chessboard/types";

import EvaluationBar from "../EvaluationBar";
import PlayerCard from "../PlayerCard";

import { classificationColours, classificationImages } from "../../constants/classifications";
import BoardAreaProps from "./BoardAreaProps";
import * as styles from "./BoardArea.module.css";

function classificationIconStyle(
    square: Square, flipped: boolean, boardSize: number
) {
    const file = square.charCodeAt(0) - 97;
    const rank = Number(square[1]) - 1;
    const x = flipped ? 7 - file : file;
    const y = flipped ? rank : 7 - rank;
    const squareSize = boardSize / 8;

    return {
        left: (x + 0.66) * squareSize,
        top: (y + 0.04) * squareSize,
        width: squareSize * 0.3
    };
}

function BoardArea({
    position, white, black, flipped, evaluation, classification, size, onMove
}: BoardAreaProps) {
    const [ selected, setSelected ] = useState<Square>();
    const [ highlights, setHighlights ] = useState<Square[]>([]);
    const [ annotationVersion, setAnnotationVersion ] = useState(0);

    const game = useMemo(() => new Chess(position.fen), [ position.fen ]);

    const customArrows = useMemo<Arrow[]>(() => [], [
        annotationVersion, position.fen
    ]);

    const moveTargets = useMemo(() => {
        if (!selected) return [];

        return game.moves({ square: selected, verbose: true });
    }, [ game, selected ]);

    useEffect(() => {
        setSelected(undefined);
        setHighlights([]);
        setAnnotationVersion(version => version + 1);
    }, [ position.fen ]);

    function clearAnnotations() {
        setHighlights([]);
        setAnnotationVersion(version => version + 1);
    }

    function toggleHighlight(square: Square) {
        setHighlights(previous => previous.includes(square)
            ? previous.filter(item => item != square)
            : [ ...previous, square ]
        );
    }

    function tryMove(from: Square, to: Square) {
        const board = new Chess(position.fen);

        try {
            const move = board.move({ from, to, promotion: "q" });
            onMove(move);

            return true;
        } catch {
            return false;
        }
    }

    function onSquareClick(square: Square) {
        clearAnnotations();

        if (game.get(square)) return;

        if (selected && tryMove(selected, square)) {
            setSelected(undefined);
            return;
        }

        setSelected(undefined);
    }

    function onPieceClick(square: Square) {
        clearAnnotations();

        if (selected == square) {
            setSelected(undefined);
            return;
        }

        if (selected && tryMove(selected, square)) {
            setSelected(undefined);
            return;
        }

        const piece = game.get(square);

        if (piece && piece.color == game.turn()) {
            setSelected(square);
        } else {
            setSelected(undefined);
        }
    }

    function onPieceDrop(from: Square, to: Square) {
        clearAnnotations();
        setSelected(undefined);

        return tryMove(from, to);
    }

    const squareStyles: CustomSquareStyles = {};

    if (position.from && position.to) {
        const highlightColour = classification
            ? classificationColours[classification.classification]
            : "#ffff33";
        const playedStyle = { backgroundColor: `${highlightColour}80` };

        squareStyles[position.from] = playedStyle;
        squareStyles[position.to] = playedStyle;
    }

    for (const square of highlights) {
        squareStyles[square] = { backgroundColor: "rgba(235, 97, 80, 0.8)" };
    }

    if (selected) {
        squareStyles[selected] = {
            backgroundColor: "rgba(255, 255, 51, 0.45)"
        };
    }

    for (const move of moveTargets) {
        squareStyles[move.to] = move.captured
            ? {
                backgroundImage: "radial-gradient(circle, transparent 58%, rgba(0, 0, 0, 0.16) 59%)"
            }
            : {
                backgroundImage: "radial-gradient(circle, rgba(0, 0, 0, 0.16) 19%, transparent 20%)"
            };
    }

    if (!size) return <div className={styles.area} />;

    const topPlayer = flipped ? white : black;
    const bottomPlayer = flipped ? black : white;

    return <div className={styles.area} style={{ width: size + 38 }}>
        <div className={styles.topPlayer}>
            <PlayerCard player={topPlayer} />
        </div>

        <div className={styles.row}>
            <EvaluationBar evaluation={evaluation} flipped={flipped} height={size} />

            <div
                className={styles.board}
                style={{ width: size, height: size }}
                data-selected={selected ?? ""}
                onContextMenu={event => event.preventDefault()}
            >
                <Chessboard
                    position={position.fen}
                    boardWidth={size}
                    boardOrientation={flipped ? "black" : "white"}
                    arePiecesDraggable={true}
                    areArrowsAllowed={true}
                    customArrows={customArrows}
                    animationDuration={150}
                    customBoardStyle={{ cursor: "pointer" }}
                    onSquareClick={onSquareClick}
                    onPieceClick={(_piece, square) => onPieceClick(square)}
                    onSquareRightClick={toggleHighlight}
                    onPieceDragBegin={() => {
                        clearAnnotations();
                    }}
                    onPieceDrop={onPieceDrop}
                    customLightSquareStyle={{ backgroundColor: "#f0dfc0" }}
                    customDarkSquareStyle={{ backgroundColor: "#c9a178" }}
                    customNotationStyle={{
                        color: "#6b5335",
                        fontSize: "11px",
                        fontWeight: "700"
                    }}
                    customSquareStyles={squareStyles}
                />

                {classification && position.to && <img
                    className={styles.classificationIcon}
                    src={classificationImages[classification.classification]}
                    alt=""
                    style={classificationIconStyle(position.to, flipped, size)}
                />}
            </div>
        </div>

        <div className={styles.bottomPlayer}>
            <PlayerCard player={bottomPlayer} />
        </div>
    </div>;
}

export default BoardArea;
