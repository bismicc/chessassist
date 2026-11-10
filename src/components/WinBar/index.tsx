import { formatPercent } from "../../lib/format";

import WinBarProps from "./WinBarProps";
import * as styles from "./WinBar.module.css";

function WinBar({ white, draw, black }: WinBarProps) {
    return <div
        className={styles.winBar}
        title={`White ${formatPercent(white)} · Draw ${formatPercent(draw)} · Black ${formatPercent(black)}`}
    >
        <span className={styles.white} style={{ width: `${white * 100}%` }} />
        <span className={styles.draw} style={{ width: `${draw * 100}%` }} />
        <span className={styles.black} style={{ width: `${black * 100}%` }} />
    </div>;
}

export default WinBar;
