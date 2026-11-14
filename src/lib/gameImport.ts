export interface ImportedGame {
    id: string;
    white: string;
    black: string;
    whiteElo?: string;
    blackElo?: string;
    result: string;
    date: string;
    timeClass: string;
    url: string;
    pgn: string;
}

function cleanUsername(username: string) {
    return username.trim().replace(/^@/, "");
}

function formatDate(value: number) {
    return new Date(value).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

function readResult(pgn: string, fallback: string) {
    return pgn.match(/\[Result\s+"([^"]+)"\]/)?.[1] ?? fallback;
}

async function readError(response: Response) {
    if (response.status == 404) return "Player not found";
    if (response.status == 429) return "Rate limited by the site. Try again shortly";
    return `Request failed (${response.status})`;
}

export async function fetchChessComGames(username: string): Promise<ImportedGame[]> {
    const name = cleanUsername(username);
    const archiveUrl = "https://api.chess.com/pub/player/"
        + `${encodeURIComponent(name)}/games/archives`;
    const response = await fetch(archiveUrl, {
        headers: { Accept: "application/json" }
    });

    if (!response.ok) throw new Error(await readError(response));

    const data = await response.json() as { archives?: string[] };
    const archives = (data.archives ?? []).slice(-3).reverse();
    const months = await Promise.all(archives.map(async url => {
        const month = await fetch(url, { headers: { Accept: "application/json" } });
        if (!month.ok) return [];

        const payload = await month.json() as { games?: ChessComGame[] };
        return payload.games ?? [];
    }));

    const games = months.flat()
        .filter(game => game.pgn)
        .sort((a, b) => (b.end_time ?? 0) - (a.end_time ?? 0))
        .slice(0, 24);

    return games.map(game => ({
        id: game.url,
        white: game.white?.username ?? "White",
        black: game.black?.username ?? "Black",
        whiteElo: game.white?.rating ? String(game.white.rating) : undefined,
        blackElo: game.black?.rating ? String(game.black.rating) : undefined,
        result: readResult(game.pgn, "*"),
        date: formatDate((game.end_time ?? 0) * 1000),
        timeClass: game.time_class ?? "chess",
        url: game.url,
        pgn: game.pgn
    }));
}

export async function fetchLichessGames(username: string): Promise<ImportedGame[]> {
    const name = cleanUsername(username);
    const url = "https://lichess.org/api/games/user/"
        + `${encodeURIComponent(name)}?max=24&pgnInJson=true&clocks=false`
        + "&evals=false&opening=false";
    const response = await fetch(url, {
        headers: { Accept: "application/x-ndjson" }
    });

    if (!response.ok) throw new Error(await readError(response));

    const body = await response.text();
    const games: LichessGame[] = [];

    for (const line of body.split("\n")) {
        if (!line.trim()) continue;

        try {
            games.push(JSON.parse(line) as LichessGame);
        } catch {
            continue;
        }
    }

    return games
        .filter(game => game.pgn)
        .map(game => ({
            id: game.id,
            white: game.players?.white?.user?.name ?? "White",
            black: game.players?.black?.user?.name ?? "Black",
            whiteElo: game.players?.white?.rating
                ? String(game.players.white.rating)
                : undefined,
            blackElo: game.players?.black?.rating
                ? String(game.players.black.rating)
                : undefined,
            result: readResult(
                game.pgn,
                game.winner == "white"
                    ? "1-0"
                    : game.winner == "black" ? "0-1" : "1/2-1/2"
            ),
            date: formatDate(game.createdAt),
            timeClass: game.speed ?? "chess",
            url: `https://lichess.org/${game.id}`,
            pgn: game.pgn
        }));
}

interface ChessComGame {
    url: string;
    pgn: string;
    time_class?: string;
    end_time?: number;
    white?: { username?: string; rating?: number };
    black?: { username?: string; rating?: number };
}

interface LichessGame {
    id: string;
    pgn: string;
    createdAt: number;
    speed?: string;
    winner?: "white" | "black";
    players?: {
        white?: { user?: { name?: string }; rating?: number };
        black?: { user?: { name?: string }; rating?: number };
    };
}
