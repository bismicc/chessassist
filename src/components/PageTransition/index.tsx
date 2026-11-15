import { useEffect, useRef } from "react";
import { flushSync } from "react-dom";
import { useNavigate } from "react-router-dom";

const CELL = 14;
const DURATION = 720;
const SVG_NS = "http://www.w3.org/2000/svg";
const TRAINING_ROUTES = [
    "/training", "/puzzles", "/openings", "/glossary"
];

interface TransitionMask {
    width: number;
    height: number;
    thresholds: Float32Array;
    order: number[];
    segments: string[];
}

function buildMask(width: number, height: number): TransitionMask {
    const columns = Math.ceil(width / CELL);
    const rows = Math.ceil(height / CELL);
    const count = columns * rows;
    const thresholds = new Float32Array(count);
    const order = new Array<number>(count);
    const segments = new Array<string>(count);

    for (let index = 0; index < count; index++) {
        const column = index % columns;
        const bias = column / Math.max(1, columns);

        thresholds[index] = Math.min(
            1,
            bias * 0.85 + Math.random() * 0.15
        );
        order[index] = index;

        const x = column * CELL;
        const y = Math.floor(index / columns) * CELL;

        segments[index] = `M${x} ${y}h${CELL}v${CELL}h-${CELL}z`;
    }

    order.sort((a, b) => thresholds[a] - thresholds[b]);

    return { width, height, thresholds, order, segments };
}

function isTrainingRoute(pathname: string) {
    const clean = pathname.replace(/\/+$/, "") || "/";

    return TRAINING_ROUTES.includes(clean);
}

function getRoute(url: URL) {
    if (!url.hash.startsWith("#/")) return url.pathname;

    return url.hash.slice(1).split("?")[0] || "/";
}

function easeInOut(value: number) {
    return value < 0.5
        ? 4 * value * value * value
        : 1 - Math.pow(-2 * value + 2, 3) / 2;
}

export default function PageTransition() {
    const navigate = useNavigate();
    const busy = useRef(false);
    const navigateRef = useRef(navigate);
    const overlay = useRef<HTMLDivElement>();
    const clipSvg = useRef<SVGSVGElement>();
    const mask = useRef<TransitionMask>();
    const frame = useRef(0);

    useEffect(() => {
        navigateRef.current = navigate;
    }, [ navigate ]);

    useEffect(() => {
        let prepareTimer = window.setTimeout(() => {
            mask.current = buildMask(window.innerWidth, window.innerHeight);
        }, 60);
        let resizeTimer = 0;

        function onResize() {
            window.clearTimeout(resizeTimer);
            resizeTimer = window.setTimeout(() => {
                mask.current = buildMask(window.innerWidth, window.innerHeight);
            }, 180);
        }

        window.addEventListener("resize", onResize);

        return () => {
            window.clearTimeout(prepareTimer);
            window.clearTimeout(resizeTimer);
            window.removeEventListener("resize", onResize);
        };
    }, []);

    useEffect(() => {
        function onClick(event: MouseEvent) {
            if (event.defaultPrevented || event.button != 0) return;
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

            const anchor = (event.target as Element | null)?.closest("a");

            if (!anchor) return;
            if (anchor.target && anchor.target != "_self") return;
            if (anchor.hasAttribute("download")) return;

            const url = new URL(anchor.href, window.location.href);

            if (url.origin != window.location.origin) return;
            if (
                url.pathname == window.location.pathname
                && url.search == window.location.search
                && url.hash == window.location.hash
            ) return;

            const hashMode = url.hash.startsWith("#/");

            if (
                isTrainingRoute(getRoute(url))
                && isTrainingRoute(getRoute(new URL(window.location.href)))
            ) return;

            event.preventDefault();

            if (busy.current) return;

            const to = hashMode
                ? url.hash.slice(1) || "/"
                : url.pathname + url.search + url.hash;
            const source = document.getElementById("root");
            if (!source) return;

            busy.current = true;

            const width = window.innerWidth;
            const height = window.innerHeight;
            const scrollX = window.scrollX;
            const scrollY = window.scrollY;
            const body = getComputedStyle(document.body);
            const layer = document.createElement("div");
            const clone = source.cloneNode(true) as HTMLElement;
            const svg = document.createElementNS(SVG_NS, "svg");
            const clip = document.createElementNS(SVG_NS, "clipPath");
            const path = document.createElementNS(SVG_NS, "path");
            const id = `chessassist-wipe-${Date.now()}`;
            const currentMask = mask.current?.width == width
                && mask.current.height == height
                ? mask.current
                : buildMask(width, height);

            mask.current = currentMask;

            svg.setAttribute("aria-hidden", "true");
            svg.style.cssText = "position:absolute;width:0;height:0;overflow:hidden";
            clip.setAttribute("id", id);
            clip.setAttribute("clipPathUnits", "userSpaceOnUse");
            path.setAttribute("clip-rule", "evenodd");

            let revealPath = `M0 0H${width}V${height}H0Z`;

            path.setAttribute("d", revealPath);
            clip.appendChild(path);
            svg.appendChild(clip);
            document.body.appendChild(svg);
            clipSvg.current = svg;

            layer.setAttribute("aria-hidden", "true");
            layer.style.cssText = [
                "position: fixed",
                "inset: 0",
                "z-index: 9999",
                "overflow: hidden",
                "pointer-events: all",
                `background-color: ${body.backgroundColor}`,
                `background-image: ${body.backgroundImage}`,
                `background-size: ${body.backgroundSize}`,
                `background-attachment: ${body.backgroundAttachment}`,
                `clip-path: url(#${id})`,
                `-webkit-clip-path: url(#${id})`
            ].join(";");

            clone.removeAttribute("id");
            clone.style.cssText = [
                "position: absolute",
                `top: ${-scrollY}px`,
                `left: ${-scrollX}px`,
                `width: ${width}px`,
                "min-height: 100vh"
            ].join(";");

            layer.appendChild(clone);
            document.body.appendChild(layer);
            overlay.current = layer;

            flushSync(() => navigateRef.current(to));

            const start = performance.now();
            let next = 0;
            let finished = false;

            function finish() {
                if (finished) return;

                finished = true;
                window.cancelAnimationFrame(frame.current);
                window.clearTimeout(failSafe);
                layer.remove();
                svg.remove();
                overlay.current = undefined;
                clipSvg.current = undefined;
                busy.current = false;
            }

            function animate(now: number) {
                const progress = Math.min(1, (now - start) / DURATION);
                const reveal = easeInOut(progress);
                let changed = false;

                while (
                    next < currentMask.order.length
                    && currentMask.thresholds[currentMask.order[next]] <= reveal
                ) {
                    revealPath += currentMask.segments[currentMask.order[next]];
                    next++;
                    changed = true;
                }

                if (changed) path.setAttribute("d", revealPath);

                if (progress < 1) {
                    frame.current = window.requestAnimationFrame(animate);
                    return;
                }

                finish();
            }

            const failSafe = window.setTimeout(finish, DURATION + 300);

            frame.current = window.requestAnimationFrame(animate);
        }

        document.addEventListener("click", onClick, true);

        return () => {
            document.removeEventListener("click", onClick, true);
            window.cancelAnimationFrame(frame.current);
            overlay.current?.remove();
            clipSvg.current?.remove();
            busy.current = false;
        };
    }, []);

    return null;
}
