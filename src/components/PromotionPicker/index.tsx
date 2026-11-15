import { COLOURS } from "./PromotionPicker.constants";

import PromotionPickerProps from "./PromotionPickerProps";
import * as styles from "./PromotionPicker.module.css";

export default function PromotionPicker({
    colour, onSelect, onCancel
}: PromotionPickerProps) {
    return <div className={styles.overlay} onClick={onCancel}>
        <div className={styles.picker} onClick={event => event.stopPropagation()}>
            {COLOURS.map(piece => <button
                key={piece}
                className={styles.option}
                aria-label={`Promote to ${piece}`}
                onClick={() => onSelect(piece)}
            >
                {colour == "w" ? {
                    q: "♕",
                    r: "♖",
                    b: "♗",
                    n: "♘"
                }[piece] : {
                    q: "♛",
                    r: "♜",
                    b: "♝",
                    n: "♞"
                }[piece]}
            </button>)}
        </div>
    </div>;
}
