import { Classification } from "../types";

export const classificationOrder: Classification[] = [
    "book", "best", "great", "brilliant", "good", "mistake", "blunder"
];

export const classificationColours: Record<Classification, string> = {
    book: "#a88764",
    best: "#98bc49",
    great: "#5b8baf",
    brilliant: "#1baaa6",
    good: "#97af8b",
    mistake: "#e28c28",
    blunder: "#c93230"
};

export const classificationImages: Record<Classification, string> = {
    book: "/img/classifications/theory.png",
    best: "/img/classifications/best.png",
    great: "/img/classifications/critical.png",
    brilliant: "/img/classifications/brilliant.png",
    good: "/img/classifications/excellent.png",
    mistake: "/img/classifications/mistake.png",
    blunder: "/img/classifications/blunder.png"
};

export const classificationLabels: Record<Classification, string> = {
    book: "Book",
    best: "Best",
    great: "Great",
    brilliant: "Brilliant",
    good: "Good",
    mistake: "Mistake",
    blunder: "Blunder"
};
