import { useLayoutEffect, useRef } from "react";

import * as styles from "./FloatingCat.module.css";

const catSize = 120;
const speed = 1.6;

function FloatingCat() {
    const imageRef = useRef<HTMLImageElement>(null);

    useLayoutEffect(() => {
        const image = imageRef.current;
        if (!image) return;

        const element = image;

        let x = Math.random() * Math.max(0, window.innerWidth - catSize);
        let y = Math.random() * Math.max(0, window.innerHeight - catSize);
        let velocityX = speed * (Math.random() > 0.5 ? 1 : -1);
        let velocityY = speed * (Math.random() > 0.5 ? 1 : -1);
        let frame = 0;

        element.style.transform = `translate3d(${x}px, ${y}px, 0)`;

        function animate() {
            x += velocityX;
            y += velocityY;

            if (x <= 0 || x + catSize >= window.innerWidth) {
                velocityX *= -1;
                x = Math.max(0, Math.min(window.innerWidth - catSize, x));
            }

            if (y <= 0 || y + catSize >= window.innerHeight) {
                velocityY *= -1;
                y = Math.max(0, Math.min(window.innerHeight - catSize, y));
            }

            element.style.transform = `translate3d(${x}px, ${y}px, 0)`;
            frame = requestAnimationFrame(animate);
        }

        frame = requestAnimationFrame(animate);

        return () => cancelAnimationFrame(frame);
    }, []);

    return <img
        ref={imageRef}
        className={styles.cat}
        src="/assets/cat.gif"
        alt=""
        aria-hidden="true"
    />;
}

export default FloatingCat;
