import { ReactNode } from "react";

import * as styles from "./CoachPanel.module.css";

const linePattern = /\[\[([^\]]+)\]\]/g;

function renderLines(
    text: string,
    key: string,
    onLine?: (startPly: number | undefined, moves: string[]) => void
): ReactNode[] {
    if (!onLine) return [ text ];

    const nodes: ReactNode[] = [];
    let last = 0;

    for (const match of text.matchAll(linePattern)) {
        const index = match.index ?? 0;

        if (index > last) nodes.push(text.slice(last, index));

        const content = match[1].trim();
        const start = content.match(/^ply:(\d+)\s+(.+)$/);
        const startPly = start ? Number(start[1]) : undefined;
        const moves = (start ? start[2] : content)
            .replace(/,/g, " ")
            .trim()
            .split(/\s+/)
            .map(move => move.replace(/^\d+\.+/, ""))
            .filter(Boolean);

        if (moves.length) {
            nodes.push(<button
                key={`${key}-line-${index}`}
                className={styles.moveLine}
                type="button"
                title={startPly != undefined
                    ? `Play ${moves.join(" ")} from ply ${startPly}`
                    : `Play ${moves.join(" ")}`
                }
                onClick={() => onLine(startPly, moves)}
            >
                {moves.map((move, moveIndex) => <span
                    className={styles.moveChip}
                    key={`${key}-line-${index}-${moveIndex}`}
                >
                    {move}
                </span>)}
            </button>);
        }

        last = index + match[0].length;
    }

    if (last < text.length) nodes.push(text.slice(last));

    return nodes;
}

function renderInline(
    text: string,
    key: string,
    onLine?: (startPly: number | undefined, moves: string[]) => void
): ReactNode[] {
    const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);

    return parts.map((part, index) => {
        if (part.startsWith("**") && part.endsWith("**")) {
            return <strong key={`${key}-${index}`}>
                {renderLines(part.slice(2, -2), `${key}-${index}`, onLine)}
            </strong>;
        }

        if (part.startsWith("`") && part.endsWith("`")) {
            return <code key={`${key}-${index}`}>{part.slice(1, -1)}</code>;
        }

        return <span key={`${key}-${index}`}>
            {renderLines(part, `${key}-${index}`, onLine)}
        </span>;
    });
}

export default function Markdown({
    text, onLine
}: {
    text: string;
    onLine?: (startPly: number | undefined, moves: string[]) => void;
}) {
    const lines = text.split("\n");
    const blocks: ReactNode[] = [];
    let list: ReactNode[] = [];

    function flushList() {
        if (!list.length) return;

        blocks.push(<ul className={styles.list} key={`list-${blocks.length}`}>
            {list}
        </ul>);

        list = [];
    }

    for (const [ index, line ] of lines.entries()) {
        const trimmed = line.trim();

        if (!trimmed) {
            flushList();
            continue;
        }

        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
            list.push(<li key={`item-${index}`}>
                {renderInline(trimmed.slice(2), `inline-${index}`, onLine)}
            </li>);

            continue;
        }

        flushList();

        if (trimmed.startsWith("### ")) {
            blocks.push(<h4 className={styles.subheading} key={`h-${index}`}>
                {renderInline(trimmed.slice(4), `inline-${index}`, onLine)}
            </h4>);

            continue;
        }

        if (trimmed.startsWith("## ")) {
            blocks.push(<h3 className={styles.heading} key={`h-${index}`}>
                {renderInline(trimmed.slice(3), `inline-${index}`, onLine)}
            </h3>);

            continue;
        }

        blocks.push(<p className={styles.paragraph} key={`p-${index}`}>
            {renderInline(trimmed, `inline-${index}`, onLine)}
        </p>);
    }

    flushList();

    return <div className={styles.markdown}>{blocks}</div>;
}
