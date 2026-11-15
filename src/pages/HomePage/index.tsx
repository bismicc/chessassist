import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Chessboard } from "react-chessboard";
import {
    ArrowRight, ArrowUp, ArrowUpRight, ExternalLink, Star
} from "lucide-react";

import PixelDivider from "../../components/PixelDivider";
import Reveal from "../../components/Reveal";
import SiteHeader from "../../components/SiteHeader";

import * as styles from "./HomePage.module.css";

const GITHUB_URL = "https://github.com/bismicc/chessassist";

const previewFen = "r2qkbnr/ppp2ppp/2np4/4p3/2B1P1b1/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 4 5";

function MiniBoard() {
    const ref = useRef<HTMLDivElement>(null);
    const [ width, setWidth ] = useState(480);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        const observer = new ResizeObserver(entries => {
            const next = Math.floor(entries[0].contentRect.width);
            if (next > 0) setWidth(next);
        });

        observer.observe(element);

        return () => observer.disconnect();
    }, []);

    return <div className={styles.board} ref={ref}>
        <Chessboard
            position={previewFen}
            boardWidth={width}
            boardOrientation="white"
            showBoardNotation={false}
            arePiecesDraggable={false}
            areArrowsAllowed={false}
            animationDuration={0}
            customBoardStyle={{ borderRadius: 0 }}
            customLightSquareStyle={{ backgroundColor: "#e9e2d2" }}
            customDarkSquareStyle={{ backgroundColor: "#a7a094" }}
        />
    </div>;
}

const tools = [
    {
        colour: "blue",
        title: "AI Coach",
        copy: "Ask why a move failed. Get an answer grounded in Stockfish lines, threats, and opening data.",
        preview: <div className={styles.chatPreview}>
            <span className={styles.question}>Why is 18...Nxa5 bad?</span>
            <span className={styles.answer}>The knight is loose, and 19.Nd5 wins the initiative.</span>
        </div>
    },
    {
        colour: "purple",
        title: "Stockfish 17",
        copy: "Local WASM analysis with depth, MultiPV, an evaluation bar, and clickable engine lines.",
        preview: <div className={styles.evalPreview}>
            <span className={styles.evalScore}>+1.54</span>
            <span className={styles.evalBar}><span/></span>
            <span className={styles.evalLine}>18...Qxa5 19.f5 Nc6 20.a4</span>
        </div>
    },
    {
        colour: "gold",
        title: "Openings",
        copy: "Names, ECO codes, book moves, win rates, and average rating from 15,000 opening lines.",
        preview: <div className={styles.openingPreview}>
            <span className={styles.openingName}>Sicilian Defence</span>
            <span className={styles.openingStats}>5.0m games · Avg 1701</span>
            <span className={styles.winBar}><span/><span/><span/></span>
        </div>
    },
    {
        colour: "red",
        title: "PGN Import",
        copy: "Paste a game from anywhere. Explore variations, annotations, keyboard navigation, and sounds.",
        preview: <div className={styles.pgnPreview}>
            <span>1. e4 e5 2. Nf3 Nc6</span>
            <span>3. Bc4 d6 4. Nc3 Bg4</span>
            <span>5. Nxe5 Bxd1 6. Bxf7+ Ke7</span>
        </div>
    },
    {
        colour: "red",
        title: "Weakness training",
        copy: "Every analysed game is tagged by motif. The trainer pulls preset Lichess puzzles for the patterns you actually miss.",
        preview: <div className={styles.trainingPreview}>
            <span className={styles.trainingTag}>PIN · 1420</span>
            <span className={styles.trainingLine}>Back-rank mate · 1,197</span>
            <span className={styles.trainingMeter}><span/></span>
            <span className={styles.trainingNote}>Weakness score · 8.4</span>
        </div>
    },
    {
        colour: "blue",
        title: "Opening learner",
        copy: "Fetch your Chess.com or Lichess games, see the openings you really play, and get an AI lesson grounded in the line.",
        preview: <div className={styles.openingPreview}>
            <span className={styles.openingName}>Queen's Indian</span>
            <span className={styles.openingStats}>12 games · 58% score</span>
            <span className={styles.openingLine}>1.d4 Nf6 2.c4 e6 3.Nf3 b6</span>
            <span className={styles.openingPlan}>Plan: pressure e4 and the long diagonal.</span>
        </div>
    }
];

export default function HomePage() {
    const location = useLocation();

    function scrollToTop() {
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    useEffect(() => {
        if (!location.hash) return;

        document.querySelector(location.hash)?.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }, [ location ]);

    return <div className={styles.page}>
        <SiteHeader/>

        <main>
            <section className={styles.heroSection}>
                <div className={styles.hero}>
                    <div className={styles.heroTop}>
                        <span className={styles.eyebrow}>Open source chess coach</span>
                        <span className={styles.status}>Local engine / BYOK</span>
                    </div>

                    <h1 className={styles.headline}>
                        You ready<br/>
                        to improve?
                    </h1>

                    <p className={styles.lede}>
                        Import a PGN. Stockfish finds the truth. An AI coach turns it
                        into a plan you can actually use.
                    </p>

                    <div className={styles.actions}>
                        <Link className={styles.primary} to="/analysis">
                            Analyse a game
                            <ArrowRight size={16} aria-hidden="true"/>
                        </Link>
                        <a
                            className={styles.secondary}
                            href={GITHUB_URL}
                            target="_blank"
                            rel="noreferrer"
                        >
                            View source
                            <ArrowUpRight size={16} aria-hidden="true"/>
                        </a>
                    </div>

                    <div className={styles.heroMeta}>
                        <span>01 / Stockfish 17</span>
                        <span>02 / Bring your own AI</span>
                        <span>03 / No account</span>
                    </div>
                </div>
            </section>

            <div className={styles.lightToDark}>
                <PixelDivider colour="#1c1d1f" flip/>
            </div>

            <section className={styles.darkSection} id="toolbox">
                <div className={styles.sectionInner}>
                    <Reveal>
                        <div className={styles.sectionHead}>
                            <span className={styles.sectionLabel}>The toolbox</span>
                            <h2 className={styles.sectionTitle}>
                                EVERYTHING YOU NEED<br/>
                                TO GET BETTER.
                            </h2>
                        </div>
                    </Reveal>

                    <div className={styles.toolGrid}>
                        {tools.map((tool, index) => <Reveal
                            key={tool.title}
                            delay={index * 80}
                        >
                            <article className={`${styles.tool} ${styles[tool.colour]}`}>
                                <span className={styles.rule}/>
                                <h3 className={styles.toolTitle}>{tool.title}</h3>
                                <p className={styles.toolCopy}>{tool.copy}</p>
                                <div className={styles.preview}>{tool.preview}</div>
                            </article>
                        </Reveal>)}
                    </div>
                </div>
            </section>

            <section className={styles.lightSection} id="how">
                <PixelDivider colour="#1c1d1f"/>

                <div className={styles.sectionInner}>
                    <div className={styles.howGrid}>
                        <Reveal>
                            <div>
                                <h2 className={styles.howTitle}>
                                    ANALYZE YOUR GAMES
                                </h2>

                                <ol className={styles.steps}>
                                    <li>
                                        <span className={styles.stepNumber}>01</span>
                                        <div>
                                            <h3>Import</h3>
                                            <p>Paste any PGN. Players, ratings, result, and every move are read instantly.</p>
                                        </div>
                                    </li>
                                    <li>
                                        <span className={styles.stepNumber}>02</span>
                                        <div>
                                            <h3>Analyse</h3>
                                            <p>Stockfish runs locally. Every move is scored, classified, and explained.</p>
                                        </div>
                                    </li>
                                    <li>
                                        <span className={styles.stepNumber}>03</span>
                                        <div>
                                            <h3>Ask</h3>
                                            <p>The coach can inspect the board, check threats, and walk through the line with you.</p>
                                        </div>
                                    </li>
                                </ol>
                            </div>
                        </Reveal>

                        <Reveal delay={120}>
                            <div className={styles.boardCard}>
                                <div className={styles.boardHeader}>
                                    <span className={styles.boardLabel}>Position review</span>
                                    <span className={styles.boardEval}>+0.4</span>
                                </div>
                                <MiniBoard/>
                                <div className={styles.boardNote}>
                                    <span className={styles.boardTag}>AI coach</span>
                                    <p>Book move. The coach explains the plan behind it, and why it is still playable.</p>
                                </div>
                            </div>
                        </Reveal>
                    </div>
                </div>
            </section>

            <div className={styles.lightToDark}>
                <PixelDivider colour="#1c1d1f" flip/>
            </div>

            <section className={styles.finalSection}>
                <Reveal>
                    <div className={styles.finalInner}>
                        <span className={styles.sectionLabel}>No account. No upload.</span>
                        <h2 className={styles.finalTitle}>
                            READY TO SEE<br/>
                            WHAT YOU MISSED?
                        </h2>
                        <div className={styles.actions}>
                            <Link className={styles.primaryLight} to="/analysis">
                                Open the board
                                <ArrowRight size={16} aria-hidden="true"/>
                            </Link>
                            <a
                                className={styles.secondaryDark}
                                href={GITHUB_URL}
                                target="_blank"
                                rel="noreferrer"
                            >
                                <Star size={16} aria-hidden="true"/>
                                Star on GitHub
                            </a>
                        </div>
                        <p className={styles.finalNote}>
                            Chessassist is open source. The engine runs in your browser.
                            The coach uses your own API key.
                        </p>
                    </div>
                </Reveal>
            </section>
        </main>

        <footer className={styles.footer}>
            <span>CHESSASSIST © 2026</span>
            <span>Built in the open</span>
            <a href={GITHUB_URL} target="_blank" rel="noreferrer">
                GitHub
                <ExternalLink size={11} aria-hidden="true"/>
            </a>
        </footer>

        <button
            className={styles.topButton}
            type="button"
            onClick={scrollToTop}
            aria-label="Back to top"
            title="Back to top"
        >
            <ArrowUp
                className={styles.topArrow}
                size={16}
                aria-hidden="true"
            />
            <span>Back to top</span>
        </button>
    </div>;
}
