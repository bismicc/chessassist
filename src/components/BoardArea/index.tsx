import { useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import { TouchBackend } from "react-dnd-touch-backend";
import { Arrow, CustomSquareStyles, Square } from "react-chessboard/dist/chessboard/types";

import EvaluationBar from "../EvaluationBar";
import PlayerCard from "../PlayerCard";
import PromotionPicker from "../PromotionPicker";

import useBoardDragCursor from "../../hooks/useBoardDragCursor";

import { classificationColours, classificationImages } from "../../constants/classifications";
import BoardAreaProps from "./BoardAreaProps";
import * as styles from "./BoardArea.module.css";

const NO_ARROWS: Arrow[] = [];

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
    position, white, black, whiteClock, blackClock,
    flipped, evaluation, classification, size, onMove
}: BoardAreaProps) {
    const [ selected, setSelected ] = useState<Square>();
    const [ highlights, setHighlights ] = useState<Square[]>([]);
    const [ promotion, setPromotion ] = useState<{ from: Square; to: Square }>();
    const promotionPiece = useRef("q");
    const dragCursor = useBoardDragCursor();

    const game = useMemo(() => new Chess(position.fen), [ position.fen ]);

    const moveTargets = useMemo(() => {
        if (!selected) return [];

        return game.moves({ square: selected, verbose: true });
    }, [ game, selected ]);

    useEffect(() => {
        setSelected(undefined);
        setHighlights([]);
        setPromotion(undefined);
    }, [ position.fen ]);

    function clearAnnotations() {
        setHighlights([]);
    }

    function toggleHighlight(square: Square) {
        setHighlights(previous => previous.includes(square)
            ? previous.filter(item => item != square)
            : [ ...previous, square ]
        );
    }

    function isPromotion(from: Square, to: Square) {
        const piece = game.get(from);

        return piece?.type == "p"
            ? (to[1] == "8" || to[1] == "1")
            : false;
    }

    function tryMove(from: Square, to: Square, promotionPiece = "q") {
        const board = new Chess(position.fen);

        try {
            const move = board.move({ from, to, promotion: promotionPiece });
            setPromotion(undefined);
            onMove(move);

            return true;
        } catch {
            return false;
        }
    }

    function onSquareClick(square: Square) {
        clearAnnotations();

        const piece = game.get(square);

        if (piece && piece.color == game.turn()) {
            setSelected(square);
            return;
        }

        if (selected && isPromotion(selected, square)) {
            setPromotion({ from: selected, to: square });
            return;
        }

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

        if (selected && isPromotion(selected, square)) {
            setPromotion({ from: selected, to: square });
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

        if (isPromotion(from, to)) {
            return tryMove(from, to, promotionPiece.current);
        }

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
            <PlayerCard
                player={topPlayer}
                clock={flipped ? whiteClock : blackClock}
            />
        </div>

        <div className={styles.row}>
            <EvaluationBar evaluation={evaluation} flipped={flipped} height={size} />

            <div
                className={styles.board}
                style={{ width: size, height: size }}
                data-selected={selected ?? ""}
                data-draggable="true"
                onContextMenu={event => event.preventDefault()}
                onDragStartCapture={event => event.preventDefault()}
                onDragStart={event => event.preventDefault()}
            >
                <Chessboard
                    position={position.fen}
                    boardWidth={size}
                    boardOrientation={flipped ? "black" : "white"}
                    arePiecesDraggable={true}
                    areArrowsAllowed={true}
                    customArrows={NO_ARROWS}
                    animationDuration={150}
                    autoPromoteToQueen={false}
                    customDndBackend={TouchBackend}
                    customDndBackendOptions={{
                        enableMouseEvents: true,
                        delayMouseStart: 0,
                        delayTouchStart: 0,
                        touchSlop: 0
                    }}
                    onSquareClick={onSquareClick}
                    onPieceClick={(_piece, square) => onPieceClick(square)}
                    onSquareRightClick={toggleHighlight}
                    onPieceDragBegin={() => {
                        clearAnnotations();
                        dragCursor.onDragBegin();
                    }}
                    onPieceDragEnd={dragCursor.onDragEnd}
                    onPieceDrop={(from, to) => {
                        dragCursor.onDragEnd();
                        return onPieceDrop(from, to);
                    }}
                    onPromotionPieceSelect={piece => {
                        if (!piece) return false;

                        promotionPiece.current = piece[1].toLowerCase();

                        return true;
                    }}
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

                {promotion && <PromotionPicker
                    colour={game.get(promotion.from)?.color == "b" ? "b" : "w"}
                    onSelect={piece => tryMove(promotion.from, promotion.to, piece)}
                    onCancel={() => setPromotion(undefined)}
                />}
            </div>
        </div>

        <div className={styles.bottomPlayer}>
            <PlayerCard
                player={bottomPlayer}
                clock={flipped ? blackClock : whiteClock}
            />
        </div>
    </div>;
}

export default BoardArea;
