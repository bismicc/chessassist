import { Link, useLocation } from "react-router-dom";

import SiteHeaderProps from "./SiteHeaderProps";
import * as styles from "./SiteHeader.module.css";

const GITHUB_URL = "https://github.com/bismicc/chessassist";

export default function SiteHeader({
    compact = false, variant = "light"
}: SiteHeaderProps) {
    const location = useLocation();
    const onAnalysis = location.pathname.startsWith("/analysis");
    const className = variant == "dark"
        ? `${styles.header} ${styles.dark}`
        : styles.header;

    return <header className={className}>
        <div className={styles.inner}>
            <Link className={styles.brand} to="/" aria-label="Chessassist home">
                <span className={styles.mark} aria-hidden="true">
                    <span/>
                    <span/>
                    <span/>
                    <span/>
                </span>
                <span className={styles.wordmark}>CHESSASSIST</span>
            </Link>

            {!compact && <nav className={styles.nav} aria-label="Main navigation">
                <Link
                    className={onAnalysis ? styles.active : styles.link}
                    to="/analysis"
                >
                    Analysis
                </Link>
                <Link className={styles.link} to="/#toolbox">Tools</Link>
                <Link className={styles.link} to="/#how">How it works</Link>
                <a
                    className={styles.link}
                    href={GITHUB_URL}
                    target="_blank"
                    rel="noreferrer"
                >
                    GitHub
                </a>
            </nav>}

            <Link className={styles.cta} to={compact ? "/" : "/analysis"}>
                {compact ? "Home" : "Open board"} <span aria-hidden="true">→</span>
            </Link>
        </div>
    </header>;
}
