import PlayerCardProps from "./PlayerCardProps";
import * as styles from "./PlayerCard.module.css";

function PlayerCard({ player }: PlayerCardProps) {
    return <div className={styles.card}>
        <span className={styles.name}>{player.name}</span>
        {player.elo && <span className={styles.elo}>({player.elo})</span>}
    </div>;
}

export default PlayerCard;
