import { useEffect, useRef, useState } from "react";

import RevealProps from "./RevealProps";

import * as styles from "./Reveal.module.css";

export default function Reveal({ children, delay = 0 }: RevealProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [ visible, setVisible ] = useState(false);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        if (!("IntersectionObserver" in window)) {
            setVisible(true);
            return;
        }

        const observer = new IntersectionObserver(entries => {
            if (!entries[0]?.isIntersecting) return;

            setVisible(true);
            observer.disconnect();
        }, {
            threshold: 0.12,
            rootMargin: "0px 0px -8% 0px"
        });

        observer.observe(element);

        return () => observer.disconnect();
    }, []);

    return <div
        className={visible
            ? `${styles.reveal} ${styles.visible}`
            : styles.reveal
        }
        ref={ref}
        style={{ transitionDelay: `${delay}ms` }}
    >
        {children}
    </div>;
}
