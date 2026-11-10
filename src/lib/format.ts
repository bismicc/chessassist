export function formatGames(games: number) {
    if (games >= 1_000_000) return `${(games / 1_000_000).toFixed(1)}m`;
    if (games >= 1000) return `${Math.round(games / 1000)}k`;
    return String(games);
}

export function formatPercent(value: number) {
    return `${Math.round(value * 100)}%`;
}
