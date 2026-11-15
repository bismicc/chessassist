import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight } from "lucide-react";

import TrainingShell from "../../components/TrainingShell";

import {
    tacticDefinitions, tacticGroups, TacticCategory
} from "../../lib/tactics";

import * as styles from "./GlossaryPage.module.css";

const groupTitles: Record<TacticCategory, string> = {
    tactics: "Tactical motifs",
    mates: "Mating patterns",
    calculation: "Calculation and defence",
    positional: "Positional concepts",
    endgames: "Endgame technique"
};

const groupOrder: TacticCategory[] = [
    "tactics", "mates", "calculation", "positional", "endgames"
];

export default function GlossaryPage() {
    const [ params ] = useSearchParams();
    const [ query, setQuery ] = useState(params.get("term") ?? "");
    const requested = params.get("term") ?? "";

    useEffect(() => {
        setQuery(requested);
    }, [ requested ]);

    useEffect(() => {
        if (!requested) return;

        const element = document.getElementById(requested);
        if (element) element.scrollIntoView({ block: "center" });
    }, [ requested ]);

    const filtered = useMemo(() => {
        const term = query.trim().toLowerCase();

        if (!term) return tacticGroups;

        return Object.fromEntries(
            groupOrder.map(category => [
                category,
                tacticGroups[category].filter(definition => (
                    definition.name.toLowerCase().includes(term)
                    || definition.id.toLowerCase().includes(term)
                    || definition.summary.toLowerCase().includes(term)
                    || definition.definition.toLowerCase().includes(term)
                ))
            ])
        ) as Record<TacticCategory, typeof tacticGroups.tactics>;
    }, [ query ]);

    const total = Object.values(filtered)
        .reduce((sum, definitions) => sum + definitions.length, 0);

    return <TrainingShell
        eyebrow="Chess glossary"
        title={"NAME THE\nPATTERN."}
        intro="Every tactic, mating pattern, endgame idea and positional term the game analysis and coach use. The same definitions are given to every AI in the app."
    >
        <section className={styles.searchBar}>
            <div>
                <label className={styles.label} htmlFor="glossary-search">
                    Search {Object.keys(tacticDefinitions).length} definitions
                </label>
                <input
                    id="glossary-search"
                    className={styles.input}
                    value={query}
                    placeholder="pin, x-ray, clearance, zugzwang…"
                    onChange={event => setQuery(event.target.value)}
                />
            </div>
            <span className={styles.count}>{total} shown</span>
        </section>

        <div className={styles.layout}>
            <nav className={styles.index} aria-label="Glossary sections">
                {groupOrder.map(category => <a
                    key={category}
                    className={styles.indexLink}
                    href={`#group-${category}`}
                >
                    {groupTitles[category]}
                    <span>{filtered[category].length}</span>
                </a>)}
            </nav>

            <div className={styles.groups}>
                {groupOrder.map(category => {
                    const definitions = filtered[category];
                    if (!definitions.length) return null;

                    return <section className={styles.group} key={category} id={`group-${category}`}>
                        <div className={styles.groupHead}>
                            <h2>{groupTitles[category]}</h2>
                            <span>{definitions.length}</span>
                        </div>

                        <div className={styles.cards}>
                            {definitions.map(definition => <article
                                className={definition.id == requested
                                    ? `${styles.card} ${styles.highlight}`
                                    : styles.card
                                }
                                id={definition.id}
                                key={definition.id}
                            >
                                <div className={styles.cardTop}>
                                    <h3>{definition.name}</h3>
                                    <span className={styles.id}>{definition.id}</span>
                                </div>
                                <p className={styles.summary}>{definition.summary}</p>
                                <p className={styles.definition}>{definition.definition}</p>
                                <Link
                                    className={styles.practice}
                                    to={`/puzzles?theme=${encodeURIComponent(definition.id)}`}
                                >
                                    Practise
                                    <ArrowRight size={11} aria-hidden="true"/>
                                </Link>
                            </article>)}
                        </div>
                    </section>;
                })}
            </div>
        </div>
    </TrainingShell>;
}
