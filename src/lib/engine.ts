import { Chess, PieceSymbol } from "chess.js";

import { EngineLine, Evaluation } from "../types";

interface AnalyseOptions {
    depth: number;
    lines: number;
    hash: number;
    san?: boolean;
}

interface AnalyseHandlers {
    onUpdate?: (lines: EngineLine[]) => void;
}

export default class Engine {
    private worker: Worker;
    private ready: Promise<void>;
    private resolveReady?: () => void;
    private rejectReady?: (error: Error) => void;
    private onError?: (message: string) => void;
    private searching = false;
    private waiters: (() => void)[] = [];
    private lines = new Map<number, EngineLine>();
    private fen = "";
    private generation = 0;
    private handlers?: AnalyseHandlers;
    private convertSan = true;
    private updateTimer?: number;

    constructor(onError?: (message: string) => void) {
        this.onError = onError;
        this.worker = new Worker("/engines/stockfish-17.1-lite-single-03e3232.js");

        this.worker.addEventListener("message", this.handleMessage);
        this.worker.addEventListener("error", this.handleWorkerError);

        this.ready = new Promise((resolve, reject) => {
            this.resolveReady = resolve;
            this.rejectReady = reject;
        });

        this.worker.postMessage("uci");
    }

    async analyse(
        fen: string, options: AnalyseOptions,
        handlers: AnalyseHandlers = {}
    ): Promise<EngineLine[]> {
        const generation = ++this.generation;

        this.clearUpdate();

        await this.ready;
        if (generation != this.generation) return [];

        await this.stopCurrentSearch();
        if (generation != this.generation) return [];

        this.lines.clear();
        this.fen = fen;
        this.handlers = handlers;
        this.convertSan = options.san ?? true;

        this.worker.postMessage(
            `setoption name MultiPV value ${Math.max(1, options.lines)}`
        );
        this.worker.postMessage(`setoption name Hash value ${options.hash}`);
        this.worker.postMessage(`position fen ${fen}`);

        this.searching = true;
        this.worker.postMessage(`go depth ${options.depth}`);

        return new Promise(resolve => {
            this.waiters.push(() => resolve(this.getLines()));
        });
    }

    stop() {
        this.generation++;

        if (this.searching) this.worker.postMessage("stop");
    }

    destroy() {
        this.generation++;
        this.clearUpdate();
        this.finishSearch();
        this.worker.postMessage("quit");
        this.worker.terminate();
    }

    private handleMessage = (event: MessageEvent) => {
        const message = String(event.data);

        if (message == "uciok") {
            this.resolveReady?.();
            return;
        }

        if (message.startsWith("info ")) {
            this.handleInfo(message);
            return;
        }

        if (message.startsWith("bestmove")) this.finishSearch();
    };

    private handleInfo(message: string) {
        if (message.includes(" currmove ")) return;
        if (message.includes(" lowerbound ") || message.includes(" upperbound ")) return;

        const depth = Number(message.match(/ depth (\d+)/)?.[1]);
        const multipv = Number(message.match(/ multipv (\d+)/)?.[1] ?? 1);
        const score = message.match(/ score (cp|mate) (-?\d+)/);
        const pv = message.match(/ pv (.+)$/)?.[1]?.split(" ");

        if (!depth || !score || !pv?.length) return;

        const turn = this.fen.split(" ")[1];
        const sign = turn == "b" ? -1 : 1;

        const evaluation: Evaluation = {
            type: score[1] == "mate" ? "mate" : "centipawn",
            value: Number(score[2]) * sign
        };

        const sanMoves = this.convertSan
            ? this.getSanMoves(multipv, pv)
            : [];

        this.lines.set(multipv, {
            multipv,
            depth,
            evaluation,
            uciMoves: pv,
            sanMoves
        });

        this.scheduleUpdate();
    }

    private getSanMoves(multipv: number, pv: string[]) {
        const line = this.lines.get(multipv);

        if (line && line.uciMoves.join(" ") == pv.join(" ")) {
            return line.sanMoves;
        }

        return this.toSanMoves(pv);
    }

    private toSanMoves(uciMoves: string[]): string[] {
        const board = new Chess(this.fen);
        const sanMoves: string[] = [];

        for (const uci of uciMoves) {
            try {
                const move = board.move({
                    from: uci.slice(0, 2),
                    to: uci.slice(2, 4),
                    promotion: uci[4] as PieceSymbol | undefined
                });

                sanMoves.push(move.san);
            } catch {
                break;
            }
        }

        return sanMoves;
    }

    private getLines(): EngineLine[] {
        return [ ...this.lines.values() ]
            .sort((a, b) => a.multipv - b.multipv);
    }

    private stopCurrentSearch(): Promise<void> {
        if (!this.searching) return Promise.resolve();

        return new Promise(resolve => {
            this.waiters.push(resolve);
            this.worker.postMessage("stop");
        });
    }

    private finishSearch() {
        this.flushUpdate();
        this.searching = false;

        const waiters = this.waiters;
        this.waiters = [];

        for (const resolve of waiters) resolve();
    }

    private scheduleUpdate() {
        if (!this.handlers?.onUpdate || this.updateTimer != undefined) return;

        this.updateTimer = window.setTimeout(() => {
            this.updateTimer = undefined;
            this.handlers?.onUpdate?.(this.getLines());
        }, 60);
    }

    private flushUpdate() {
        if (this.updateTimer == undefined) return;

        window.clearTimeout(this.updateTimer);
        this.updateTimer = undefined;
        this.handlers?.onUpdate?.(this.getLines());
    }

    private clearUpdate() {
        if (this.updateTimer == undefined) return;

        window.clearTimeout(this.updateTimer);
        this.updateTimer = undefined;
    }

    private handleWorkerError = (event: ErrorEvent) => {
        const message = event.message || "Failed to load Stockfish";

        this.onError?.(message);
        this.rejectReady?.(new Error(message));
        this.finishSearch();
    };
}
