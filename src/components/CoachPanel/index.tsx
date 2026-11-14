import { useEffect, useRef, useState } from "react";

import AiSettingsDialog from "../AiSettingsDialog";
import { SettingsIcon } from "../Icons";

import useCoach from "../../hooks/useCoach";
import { CoachMode } from "../../ai/types";

import Markdown from "./Markdown";

import CoachPanelProps from "./CoachPanelProps";
import * as styles from "./CoachPanel.module.css";

const modeLabels: Record<CoachMode, string> = {
    manual: "Ask",
    key: "Key",
    brief: "Brief",
    full: "Full"
};

const modeTitles: Record<CoachMode, string> = {
    manual: "Only explain when you ask",
    key: "Explain key moments and mistakes",
    brief: "Explain every move in one line",
    full: "Explain every move in full — uses the most tokens"
};

function formatTokens(count: number) {
    if (count < 1000) return String(count);
    return `${(count / 1000).toFixed(1)}k`;
}

function CoachPanel({
    game, currentPly, position, history, isVariation, classifications,
    evaluations, bestMoves, opening, settings, analysing, progress,
    onAnalyseGame, onStopAnalysis, onPlayLine
}: CoachPanelProps) {
    const [ showSettings, setShowSettings ] = useState(false);

    const {
        aiSettings, setAiSettings, setMode, messages, input, setInput, busy,
        status, error, engineError, pendingMode, usage, configured, hasKey,
        provider, send, generate, stop, clearChat, explainCurrent
    } = useCoach({
        game,
        currentPly,
        position,
        history,
        isVariation,
        classifications,
        evaluations,
        bestMoves,
        settings,
        analysing,
        onAnalyseGame
    });

    const listRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const list = listRef.current;
        if (list) list.scrollTop = list.scrollHeight;
    }, [ messages, status ]);

    const totalTokens = usage.inputTokens + usage.outputTokens;
    const reportMode = aiSettings.mode != "manual";

    return <section className={styles.coach}>
        <header className={styles.header}>
            <div className={styles.headingGroup}>
                <span className={styles.badge}>AI Coach</span>
                <span className={styles.model} title={aiSettings.model}>
                    {aiSettings.model || "No model"}
                </span>
            </div>

            <div className={styles.headerActions}>
                <button
                    className={styles.clearButton}
                    title="Explain the move on the board"
                    disabled={!configured || busy || !position.san}
                    onClick={explainCurrent}
                >
                    Explain
                </button>

                <button
                    className={styles.clearButton}
                    title="Clear the conversation"
                    aria-label="Clear the conversation"
                    onClick={clearChat}
                >
                    Clear
                </button>

                <button
                    className={styles.settingsButton}
                    title="Coach settings"
                    aria-label="Coach settings"
                    onClick={() => setShowSettings(true)}
                >
                    <SettingsIcon/>
                </button>
            </div>
        </header>

        <div className={styles.position}>
            <span>{opening.name ?? "Starting position"}</span>
            <span>{isVariation ? "Variation" : `Ply ${currentPly}`}</span>
        </div>

        <div className={styles.modes}>
            {(Object.keys(modeLabels) as CoachMode[]).map(mode => <button
                key={mode}
                className={mode == aiSettings.mode
                    ? `${styles.mode} ${styles.activeMode}`
                    : styles.mode
                }
                title={modeTitles[mode]}
                disabled={busy}
                onClick={() => setMode(mode)}
            >
                {modeLabels[mode]}
            </button>)}
        </div>

        {reportMode && <div className={styles.reportRow}>
            <button
                className={analysing ? `${styles.generate} ${styles.stopGenerate}` : styles.generate}
                disabled={busy}
                onClick={analysing
                    ? onStopAnalysis
                    : configured
                        ? () => void generate(aiSettings.mode)
                        : () => setShowSettings(true)
                }
            >
                {analysing
                    ? `Stop ${progress}/${game.positions.length}`
                    : pendingMode
                        ? "Starting report"
                        : "Generate report"
                }
            </button>

            <span className={styles.reportHint}>
                {isVariation
                    ? "Reports cover the main game"
                    : analysing
                        ? "Stockfish is checking the game"
                        : modeTitles[aiSettings.mode]
                }
            </span>
        </div>}

        <div className={styles.messages} ref={listRef}>
            {messages.length == 0 && <div className={styles.empty}>
                {configured
                    ? <p className={styles.emptyText}>
                        Ask about the current position, a specific move, or the
                        whole game. The coach can read the board, run Stockfish,
                        check openings and databases, and search online.
                    </p>
                    : <div className={styles.setup}>
                        <p className={styles.setupTitle}>
                            {hasKey ? "Choose a model" : "Connect a model"}
                        </p>
                        <p className={styles.setupText}>
                            {hasKey
                                ? "Add a model identifier in Coach settings before sending a question."
                                : "Bring your own API key. Choose a provider, paste a key, and the coach can start analysing. Keys stay in this browser."
                            }
                        </p>
                        <button
                            className={styles.setupButton}
                            onClick={() => setShowSettings(true)}
                        >
                            {hasKey ? "Choose a model" : "Add API key"}
                        </button>
                    </div>
                }

                <div className={styles.suggestions}>
                    {[
                        "Why was my last move bad?",
                        "What is the plan in this position?",
                        "Show me a better move."
                    ].map(prompt => <button
                        key={prompt}
                        className={styles.suggestion}
                        disabled={!configured || busy}
                        onClick={() => void send(prompt)}
                    >
                        {prompt}
                    </button>)}
                </div>
            </div>}

            {messages.map(message => <div
                key={message.id}
                className={message.role == "user"
                    ? `${styles.message} ${styles.userMessage}`
                    : `${styles.message} ${styles.coachMessage}`
                }
            >
                {message.role == "user"
                    ? <p className={styles.userText}>{message.content}</p>
                    : <Markdown text={message.content} onLine={onPlayLine}/>
                }

                {message.role == "assistant" && message.tools?.length
                    ? <p className={styles.tools}>
                        Used: {message.tools.join(", ")}
                    </p>
                    : undefined
                }

                {message.note && <p className={styles.note}>{message.note}</p>}
            </div>)}
        </div>

        {(status || error || engineError) && <div className={styles.statusRow} aria-live="polite">
            {error
                ? <span className={styles.error}>{error}</span>
                : engineError
                    ? <span className={styles.error}>Engine: {engineError}</span>
                    : <span className={styles.status}>
                        <span className={styles.dot}/>
                        {status}
                    </span>
            }
        </div>}

        <form
            className={styles.composer}
            onSubmit={event => {
                event.preventDefault();
                void send();
            }}
        >
            <textarea
                className={styles.input}
                rows={2}
                value={input}
                placeholder={configured
                    ? "Ask the coach about this position..."
                    : "Add an API key to start"
                }
                disabled={!configured || busy}
                onChange={event => setInput(event.target.value)}
                onKeyDown={event => {
                    if (event.key == "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        void send();
                    }
                }}
            />

            {busy
                ? <button
                    className={styles.stop}
                    type="button"
                    onClick={stop}
                >
                    Stop
                </button>
                : <button
                    className={styles.send}
                    type="submit"
                    disabled={!configured || !input.trim()}
                >
                    Send
                </button>
            }
        </form>

        <footer className={styles.footer}>
            <span>
                {provider.name} · {reportMode ? "Reports and chat" : "Chat only"}
            </span>
            <span>{totalTokens ? `${formatTokens(totalTokens)} tokens` : ""}</span>
        </footer>

        {showSettings && <AiSettingsDialog
            settings={aiSettings}
            onChange={setAiSettings}
            onClose={() => setShowSettings(false)}
        />}
    </section>;
}

export default CoachPanel;
