import { Classification } from "../types";

export const classificationOrder: Classification[] = [
    "best", "good", "mistake", "blunder"
];

export const classificationColours: Record<Classification, string> = {
    best: "#98bc49",
    good: "#97af8b",
    mistake: "#e28c28",
    blunder: "#c93230"
};

export const classificationImages: Record<Classification, string> = {
    best: "/img/classifications/best.png",
    good: "/img/classifications/excellent.png",
    mistake: "/img/classifications/mistake.png",
    blunder: "/img/classifications/blunder.png"
};

export const classificationLabels: Record<Classification, string> = {
    best: "Best",
    good: "Good",
    mistake: "Mistake",
    blunder: "Blunder"
};
