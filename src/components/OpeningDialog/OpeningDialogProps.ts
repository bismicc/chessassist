import { OpeningContext, OpeningMove } from "../../lib/openings";

export default interface OpeningDialogProps {
    opening: OpeningContext;
    onPlay: (move: OpeningMove) => void;
    onClose: () => void;
}
