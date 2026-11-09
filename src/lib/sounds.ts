import { Chess, Move } from "chess.js";

const soundFiles = {
    move: "/audio/move.mp3",
    capture: "/audio/capture.mp3",
    castle: "/audio/castle.mp3",
    check: "/audio/check.mp3",
    promote: "/audio/promote.mp3",
    gameEnd: "/audio/gameend.mp3"
};

type SoundName = keyof typeof soundFiles;

const players = new Map<SoundName, HTMLAudioElement>();

function getPlayer(name: SoundName) {
    let player = players.get(name);
    if (!player) {
        player = new Audio(soundFiles[name]);
        player.preload = "auto";
        player.volume = 0.6;
        players.set(name, player);
    }

    return player;
}

function playSound(name: SoundName) {
    const player = getPlayer(name);

    player.currentTime = 0;
    player.play().catch(() => {});
}

for (const name of Object.keys(soundFiles) as SoundName[]) getPlayer(name);

export function playMoveSound(move: Move) {
    const board = new Chess(move.after);

    if (board.isGameOver()) playSound("gameEnd");

    if (board.isCheck()) {
        playSound("check");
    } else if (move.isKingsideCastle() || move.isQueensideCastle()) {
        playSound("castle");
    } else if (move.isPromotion()) {
        playSound("promote");
    } else if (move.isCapture()) {
        playSound("capture");
    } else {
        playSound("move");
    }
}
