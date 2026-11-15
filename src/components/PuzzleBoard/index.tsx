import { useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import { TouchBackend } from "react-dnd-touch-backend";
import { Square } from "react-chessboard/dist/chessboard/types";

import PromotionPicker from "../PromotionPicker";
import useBoardDragCursor from "../../hooks/useBoardDragCursor";

import PuzzleBoardProps from "./PuzzleBoardProps";
import * as styles from "./PuzzleBoard.module.css";

export default function PuzzleBoard({
    fen, orientation, size, lastMove, onMove, disabled
}: PuzzleBoardProps) {
    const [ selected, setSelected ] = useState<Square>();
    const [ promotion, setPromotion ] = useState<{ from: Square; to: Square }>();
    const promotionPiece = useRef("q");
    const dragCursor = useBoardDragCursor();

    const game = useMemo(() => new Chess(fen), [ fen ]);

    useEffect(() => {
        setSelected(undefined);
        setPromotion(undefined);
    }, [ fen ]);

    useEffect(() => {
        if (disabled) dragCursor.onDragEnd();
    }, [ disabled ]);

    const targets = useMemo(() => {
        if (!selected) return [];

        return game.moves({ square: selected, verbose: true });
    }, [ game, selected ]);

    function isPromotion(from: Square, to: Square) {
        const piece = game.get(from);

        return piece?.type == "p"
            ? (to[1] == "8" || to[1] == "1")
            : false;
    }

    function tryMove(from: Square, to: Square, promotionPiece = "q") {
        if (disabled) return false;

        const board = new Chess(fen);

        try {
            board.move({ from, to, promotion: promotionPiece });
        } catch {
            return false;
        }

        setSelected(undefined);
        setPromotion(undefined);
        onMove(from, to, promotionPiece);

        return true;
    }

    function attempt(from: Square, to: Square) {
        if (disabled) return false;

        if (isPromotion(from, to)) {
            return tryMove(from, to, promotionPiece.current);
        }

        return tryMove(from, to);
    }

    function onSquareClick(square: Square) {
        if (disabled) return;

        if (selected && isPromotion(selected, square)) {
            setPromotion({ from: selected, to: square });
            return;
        }

        if (selected && tryMove(selected, square)) return;

        const piece = game.get(square);
        if (piece && piece.color == game.turn()) {
            setSelected(square);
            return;
        }

        setSelected(undefined);
    }

    function onPieceClick(square: Square) {
        if (disabled) return;

        if (selected == square) {
            setSelected(undefined);
            return;
        }

        if (selected && isPromotion(selected, square)) {
            setPromotion({ from: selected, to: square });
            return;
        }

        if (selected && tryMove(selected, square)) return;

        const piece = game.get(square);
        if (piece && piece.color == game.turn()) setSelected(square);
    }

    const squareStyles: Record<string, { backgroundColor?: string }> = {};

    if (lastMove) {
        squareStyles[lastMove.from] = { backgroundColor: "rgba(75, 105, 255, 0.35)" };
        squareStyles[lastMove.to] = { backgroundColor: "rgba(75, 105, 255, 0.5)" };
    }

    if (selected) {
        squareStyles[selected] = { backgroundColor: "rgba(235, 75, 75, 0.35)" };
    }

    for (const move of targets) {
        squareStyles[move.to] = move.captured
            ? { backgroundColor: "rgba(235, 75, 75, 0.22)" }
            : { backgroundColor: "rgba(233, 237, 241, 0.14)" };
    }

    return <div
        className={styles.board}
        style={{ width: size, height: size }}
        data-draggable={disabled ? undefined : "true"}
        onDragStartCapture={event => event.preventDefault()}
        onDragStart={event => event.preventDefault()}
    >
        <Chessboard
            position={fen}
            boardWidth={size}
            boardOrientation={orientation}
            arePiecesDraggable={!disabled}
            areArrowsAllowed={false}
            animationDuration={140}
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
            onPieceDragBegin={dragCursor.onDragBegin}
            onPieceDragEnd={dragCursor.onDragEnd}
            onPieceDrop={(from, to) => {
                dragCursor.onDragEnd();
                return attempt(from, to);
            }}
            onPromotionPieceSelect={piece => {
                if (!piece) return false;

                promotionPiece.current = piece[1].toLowerCase();

                return true;
            }}
            customBoardStyle={{ borderRadius: 0 }}
            customLightSquareStyle={{ backgroundColor: "#e9e2d2" }}
            customDarkSquareStyle={{ backgroundColor: "#a7a094" }}
            customNotationStyle={{
                color: "#6b6458",
                fontSize: "10px",
                fontWeight: "700"
            }}
            customSquareStyles={squareStyles}
        />

        {promotion && <PromotionPicker
            colour={game.get(promotion.from)?.color == "b" ? "b" : "w"}
            onSelect={piece => tryMove(promotion.from, promotion.to, piece)}
            onCancel={() => setPromotion(undefined)}
        />}
    </div>;
}
