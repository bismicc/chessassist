import { useEffect, useRef } from "react";

import PixelDividerProps from "./PixelDividerProps";

import * as styles from "./PixelDivider.module.css";

const CELL = 9;
const CHANGE_CHANCE = 0.16;

export default function PixelDivider({
    colour, flip = false
}: PixelDividerProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const element = canvasRef.current;
        if (!element) return;

        const canvas: HTMLCanvasElement = element;
        const context = canvas.getContext("2d");
        if (!context) return;

        const ctx: CanvasRenderingContext2D = context;
        let cells = new Uint8Array(0);
        let columns = 0;
        let rows = 0;
        let width = 0;
        let height = 0;
        let ratio = 1;

        function getDarkChance(row: number) {
            const progress = row / Math.max(1, rows - 1);
            return flip ? progress : 1 - progress;
        }

        function build() {
            const rect = canvas.getBoundingClientRect();
            const nextWidth = Math.floor(rect.width);
            const nextHeight = Math.floor(rect.height) || 81;
            const nextRatio = window.devicePixelRatio || 1;

            if (!nextWidth) return false;
            if (
                nextWidth == width
                && nextHeight == height
                && nextRatio == ratio
                && cells.length
            ) return false;

            width = nextWidth;
            height = nextHeight;
            ratio = nextRatio;
            canvas.width = Math.floor(width * ratio);
            canvas.height = Math.floor(height * ratio);
            ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

            columns = Math.ceil(width / CELL);
            rows = Math.ceil(height / CELL);
            cells = new Uint8Array(columns * rows);

            for (let row = 0; row < rows; row++) {
                const chance = getDarkChance(row);

                for (let column = 0; column < columns; column++) {
                    cells[row * columns + column] = Math.random() < chance ? 1 : 0;
                }
            }

            return true;
        }

        function render() {
            ctx.fillStyle = "#e9edf1";
            ctx.fillRect(0, 0, width, height);
            ctx.fillStyle = colour;

            for (let row = 0; row < rows; row++) {
                for (let column = 0; column < columns; column++) {
                    if (!cells[row * columns + column]) continue;

                    ctx.fillRect(
                        column * CELL,
                        row * CELL,
                        CELL,
                        CELL
                    );
                }
            }
        }

        function step() {
            build();

            for (let row = 0; row < rows; row++) {
                const chance = getDarkChance(row);

                for (let column = 0; column < columns; column++) {
                    if (Math.random() > CHANGE_CHANCE) continue;

                    const index = row * columns + column;
                    cells[index] = Math.random() < chance ? 1 : 0;
                }
            }

            render();
        }

        build();
        render();

        const timer = window.setInterval(step, 1000);
        const observer = new ResizeObserver(() => {
            build();
            render();
        });

        observer.observe(canvas);

        return () => {
            window.clearInterval(timer);
            observer.disconnect();
        };
    }, [ colour, flip ]);

    return <canvas
        className={styles.divider}
        ref={canvasRef}
        aria-hidden="true"
    />;
}
