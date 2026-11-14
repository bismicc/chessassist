import { useEffect, useState } from "react";

export default function useBoardSize() {
    const [ size, setSize ] = useState(0);

    useEffect(() => {
        function update() {
            const stacked = window.innerWidth <= 1180;
            const compact = window.innerWidth <= 1400;
            const panels = compact ? 600 : 730;
            const widthLimit = stacked
                ? window.innerWidth - 64
                : window.innerWidth - panels - 96;
            const heightLimit = window.innerHeight - 228;

            setSize(Math.max(260, Math.min(widthLimit, heightLimit, 700)));
        }

        update();
        window.addEventListener("resize", update);

        return () => window.removeEventListener("resize", update);
    }, []);

    return size;
}
