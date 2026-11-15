export default interface PromotionPickerProps {
    colour: "w" | "b";
    onSelect: (piece: string) => void;
    onCancel: () => void;
}
