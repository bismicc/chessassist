import { useEffect, useState } from "react";

export default function useBoardSize(panelWidth: number) {
    const [ size, setSize ] = useState(0);

    useEffect(() => {
        function update() {
            const widthLimit = window.innerWidth - panelWidth - 96;
            const heightLimit = window.innerHeight - 168;

            setSize(Math.max(260, Math.min(widthLimit, heightLimit, 700)));
        }

        update();
        window.addEventListener("resize", update);

        return () => window.removeEventListener("resize", update);
    }, [ panelWidth ]);

    return size;
}
