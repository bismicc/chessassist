export default interface ImportDialogProps {
    onImport: (pgn: string) => string | undefined;
    onClose: () => void;
}
