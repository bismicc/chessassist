import { Timer } from "lucide-react";

import PlayerCardProps from "./PlayerCardProps";
import * as styles from "./PlayerCard.module.css";

function PlayerCard({ player, clock }: PlayerCardProps) {
    return <div className={styles.card}>
        <span className={styles.name}>{player.name}</span>
        {player.elo && <span className={styles.elo}>({player.elo})</span>}

        {clock && <span className={styles.clock}>
            <Timer size={20} aria-hidden="true"/>
            <span>{clock}</span>
        </span>}
    </div>;
}

export default PlayerCard;
