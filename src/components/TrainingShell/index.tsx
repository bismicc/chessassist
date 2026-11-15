import { Link, useLocation } from "react-router-dom";

import SiteHeader from "../SiteHeader";

import TrainingShellProps from "./TrainingShellProps";
import * as styles from "./TrainingShell.module.css";

const tabs = [
    { href: "/training", label: "Overview" },
    { href: "/puzzles", label: "Puzzles" },
    { href: "/openings", label: "Openings" },
    { href: "/glossary", label: "Glossary" }
];

export default function TrainingShell({
    eyebrow, title, intro, children
}: TrainingShellProps) {
    const location = useLocation();

    return <div className={styles.page}>
        <SiteHeader variant="dark"/>

        <main className={styles.main}>
            <header className={styles.header}>
                <div>
                    <span className={styles.eyebrow}>{eyebrow}</span>
                    <h1 className={styles.title}>{title}</h1>
                </div>
                <p className={styles.intro}>{intro}</p>
            </header>

            <nav className={styles.tabs} aria-label="Training sections">
                {tabs.map(tab => {
                    const active = location.pathname == tab.href;

                    return <Link
                        key={tab.href}
                        className={active ? styles.activeTab : styles.tab}
                        to={tab.href}
                    >
                        {tab.label}
                    </Link>;
                })}
            </nav>

            {children}
        </main>

        <footer className={styles.footer}>
            <span>Chessassist training</span>
            <span>Puzzles: Lichess database, CC0</span>
        </footer>
    </div>;
}
