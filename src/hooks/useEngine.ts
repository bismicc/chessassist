import { useEffect, useRef, useState } from "react";

import Engine from "../lib/engine";

export default function useEngine() {
    const engineRef = useRef<Engine | null>(null);
    const [ error, setError ] = useState("");

    useEffect(() => {
        const engine = new Engine(setError);
        engineRef.current = engine;

        return () => {
            engine.destroy();
            engineRef.current = null;
        };
    }, []);

    return { engineRef, error };
}
