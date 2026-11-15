import { useEffect } from "react";

const DRAGGING_ATTRIBUTE = "data-dragging-piece";

export default function useBoardDragCursor() {
    useEffect(() => {
        return () => document.body.removeAttribute(DRAGGING_ATTRIBUTE);
    }, []);

    function onDragBegin() {
        document.body.setAttribute(DRAGGING_ATTRIBUTE, "true");
    }

    function onDragEnd() {
        document.body.removeAttribute(DRAGGING_ATTRIBUTE);
    }

    return { onDragBegin, onDragEnd };
}
