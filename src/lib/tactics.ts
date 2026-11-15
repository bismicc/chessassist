import { Chess, PieceSymbol, Square } from "chess.js";

export type TacticCategory =
    "tactics" | "mates" | "endgames" | "positional" | "calculation";

export interface TacticDefinition {
    id: string;
    name: string;
    category: TacticCategory;
    summary: string;
    definition: string;
}

const definitions: TacticDefinition[] = [
    {
        id: "fork",
        name: "Fork",
        category: "tactics",
        summary: "One piece attacks two or more valuable targets at once.",
        definition: "A fork is a single move that attacks two or more enemy units at the same time, so the opponent cannot save them all. Knights are the most common forking piece because their attacks are hard to see, but pawns, bishops, rooks, queens and kings can all fork."
    },
    {
        id: "pin",
        name: "Pin",
        category: "tactics",
        summary: "A piece cannot move because a more valuable piece stands behind it.",
        definition: "A pin is a line attack in which a piece is attacked and cannot move without exposing a more valuable piece behind it. In an absolute pin the piece behind is the king, so moving is illegal. In a relative pin the piece behind is the queen or a rook, so moving is legal but usually bad."
    },
    {
        id: "skewer",
        name: "Skewer",
        category: "tactics",
        summary: "A line attack through a valuable piece to one behind it.",
        definition: "A skewer is the reverse of a pin: a line piece attacks a valuable piece, usually the king or queen, and when it moves the attacker captures a less valuable piece behind it on the same line."
    },
    {
        id: "xRayAttack",
        name: "X-ray attack",
        category: "tactics",
        summary: "A line piece attacks a square or piece through another piece.",
        definition: "An x-ray attack is an attack along a line that passes through one piece to reach a target behind it. The nearer piece may be an enemy piece that cannot move, or a friendly piece that will move away. X-ray attacks are common on files, ranks and long diagonals and often decide whether a defence actually holds."
    },
    {
        id: "discoveredAttack",
        name: "Discovered attack",
        category: "tactics",
        summary: "Moving one piece uncovers an attack from another.",
        definition: "A discovered attack happens when moving one piece opens a line for a friendly piece behind it, creating a new attack. The moving piece can often make a threat of its own, so the opponent has to answer two problems at once."
    },
    {
        id: "discoveredCheck",
        name: "Discovered check",
        category: "tactics",
        summary: "A move uncovers check from a line piece behind it.",
        definition: "A discovered check is a discovered attack in which the newly opened line gives check. The moving piece is free to capture or threaten something else because the opponent must first answer the check."
    },
    {
        id: "doubleCheck",
        name: "Double check",
        category: "tactics",
        summary: "Two pieces give check at the same time.",
        definition: "Double check means two pieces give check simultaneously. Only a king move can answer it, because capturing or blocking one attacker leaves the other still giving check. Double check is one of the strongest tactical patterns."
    },
    {
        id: "backRankMate",
        name: "Back-rank mate",
        category: "mates",
        summary: "A rook or queen mates along the back rank behind trapped pawns.",
        definition: "A back-rank mate is a checkmate on the first or eighth rank against a king whose own pawns block its escape squares. The pattern usually appears after the defender weakens the pawn shield or leaves the back rank undefended."
    },
    {
        id: "smotheredMate",
        name: "Smothered mate",
        category: "mates",
        summary: "A knight mates a king surrounded by its own pieces.",
        definition: "A smothered mate is a checkmate delivered by a knight against a king that is completely surrounded by its own pieces and has no legal square. The classic pattern uses a queen sacrifice to force the king into the corner before the knight delivers mate."
    },
    {
        id: "arabianMate",
        name: "Arabian mate",
        category: "mates",
        summary: "A knight and rook trap the king in a corner.",
        definition: "The Arabian mate uses a knight to cover escape squares and a rook or queen to deliver check along the edge or corner. The king is usually trapped in the corner with the knight protecting the mating piece."
    },
    {
        id: "bodensMate",
        name: "Boden's mate",
        category: "mates",
        summary: "Two bishops mate a castled king on intersecting diagonals.",
        definition: "Boden's mate is delivered by two bishops attacking a castled king along crossed diagonals. The king cannot escape because its own pieces and pawns block the flight squares."
    },
    {
        id: "anastasiaMate",
        name: "Anastasia's mate",
        category: "mates",
        summary: "A knight and rook trap the king against the edge.",
        definition: "Anastasia's mate uses a knight to cover the king's escape squares while a rook or queen delivers mate on the edge file or rank. The king is usually trapped between the knight and the edge of the board."
    },
    {
        id: "damianoMate",
        name: "Damiano's mate",
        category: "mates",
        summary: "A queen or rook mates a cornered king behind a pawn.",
        definition: "Damiano's mate is a corner mate delivered by a queen or rook, often supported by a pawn or bishop, after the defender's own pawn blocks the final escape square."
    },
    {
        id: "grecoMate",
        name: "Greco's mate",
        category: "mates",
        summary: "A bishop and rook or queen mate a castled king.",
        definition: "Greco's mate uses a bishop on a long diagonal to cut off escape squares while a rook or queen mates on the side. It is a common pattern against a castled king with a weakened pawn shield."
    },
    {
        id: "legalMate",
        name: "Legal's mate",
        category: "mates",
        summary: "A queen sacrifice sets up a bishop and knight mate.",
        definition: "Legal's mate is a pattern in which a queen sacrifice on the board draws the king forward, then two minor pieces deliver checkmate. It usually arises from an early queen sortie or a pinned knight."
    },
    {
        id: "suffocationMate",
        name: "Suffocation mate",
        category: "mates",
        summary: "A knight and queen mate a king boxed in by its own pieces.",
        definition: "The suffocation mate uses a knight to cover escape squares while a queen delivers check to a king that is hemmed in by its own pieces. It is closely related to the smothered mate."
    },
    {
        id: "epauletteMate",
        name: "Epaulette mate",
        category: "mates",
        summary: "The king is flanked by two own pieces that block escape.",
        definition: "An epaulette mate is a queen checkmate in which the king's own pieces stand on either side of it like epaulettes, blocking both escape squares."
    },
    {
        id: "ladderMate",
        name: "Ladder mate",
        category: "mates",
        summary: "Two rooks or a rook and queen drive the king to the edge.",
        definition: "A ladder mate uses two heavy pieces to cut off ranks or files one at a time, driving the king to the edge. The two pieces protect each other and alternate checks."
    },
    {
        id: "mateIn1",
        name: "Mate in one",
        category: "mates",
        summary: "A forcing move checkmates immediately.",
        definition: "A mate in one is a position where the side to move can checkmate with a single move. Finding it requires checking the opponent's legal replies, not just finding a strong-looking check."
    },
    {
        id: "mateIn2",
        name: "Mate in two",
        category: "mates",
        summary: "A forced checkmate in two moves.",
        definition: "A mate in two is a forced checkmate that takes two moves by the attacking side. Every possible reply by the defender must be answered by mate."
    },
    {
        id: "mateIn3",
        name: "Mate in three",
        category: "mates",
        summary: "A forced checkmate in three moves.",
        definition: "A mate in three is a forced checkmate that takes three moves by the attacking side. It usually starts with a forcing check or a quiet threat that creates an unavoidable mating net."
    },
    {
        id: "hookMate",
        name: "Hook mate",
        category: "mates",
        summary: "A knight and rook trap the king with a pawn as cover.",
        definition: "The hook mate uses a knight to cover escape squares and a rook or queen to deliver check, usually with the king trapped against the edge. The knight's hook-shaped control of the king's flight squares is the defining feature."
    },
    {
        id: "mateIn4",
        name: "Mate in four",
        category: "mates",
        summary: "A forced checkmate in four moves.",
        definition: "A mate in four is a forced checkmate that takes four moves by the attacking side. It usually requires a forcing sequence of checks or an unavoidable mating net rather than a single tactical motif."
    },
    {
        id: "mateIn5",
        name: "Mate in five",
        category: "mates",
        summary: "A forced checkmate in five moves.",
        definition: "A mate in five is a forced checkmate that takes five moves by the attacking side. Long mates often combine several patterns, such as clearance, deflection and a mating net."
    },
    {
        id: "doubleAttack",
        name: "Double attack",
        category: "tactics",
        summary: "One move creates two separate threats.",
        definition: "A double attack is a move that creates two threats at once, not necessarily with the same piece. A fork is a double attack by one piece, while a discovered attack is a double attack created by moving one piece out of the way."
    },
    {
        id: "windmill",
        name: "Windmill",
        category: "tactics",
        summary: "A rook and bishop repeat discovered checks to win material.",
        definition: "A windmill is a repeating discovered-check pattern, usually with a rook and bishop. The rook checks, the king moves, the rook captures something, and the bishop's discovered check repeats the process."
    },
    {
        id: "greekGift",
        name: "Greek gift sacrifice",
        category: "tactics",
        summary: "A bishop sacrifice on h7 or h2 opens the king.",
        definition: "The Greek gift is a bishop sacrifice on h7, or h2 for Black, against a castled king. The aim is to drag the king out, follow with a knight or queen, and mate before the material deficit matters."
    },
    {
        id: "absolutePin",
        name: "Absolute pin",
        category: "tactics",
        summary: "A pinned piece cannot legally move because the king is behind it.",
        definition: "An absolute pin is a pin where the piece behind the pinned piece is the king. Moving the pinned piece would expose the king to check, so the move is illegal."
    },
    {
        id: "relativePin",
        name: "Relative pin",
        category: "tactics",
        summary: "A pinned piece can move, but doing so loses a more valuable piece.",
        definition: "A relative pin is a pin where the piece behind the pinned piece is not the king. Moving is legal, but it usually allows the attacker to win the more valuable piece behind it."
    },
    {
        id: "exchangeSacrifice",
        name: "Exchange sacrifice",
        category: "tactics",
        summary: "Give up a rook for a knight or bishop for positional gain.",
        definition: "An exchange sacrifice gives up a rook for a minor piece. It is justified when the sacrifice removes a key defender, opens lines, or creates a lasting positional bind that is worth more than the material difference."
    },
    {
        id: "discoveredDefence",
        name: "Discovered defence",
        category: "tactics",
        summary: "Moving one piece uncovers a defence from another.",
        definition: "A discovered defence is the defensive counterpart of a discovered attack. Moving one piece opens a line so a piece behind it can defend a key square, piece or king."
    },
    {
        id: "matingNet",
        name: "Mating net",
        category: "mates",
        summary: "A combination of controlled squares that makes mate unavoidable.",
        definition: "A mating net is a set of controlled escape squares and mating threats that leaves the king with no adequate defence. The final check may be several moves away, but every reply already loses."
    },
    {
        id: "pawnFork",
        name: "Pawn fork",
        category: "tactics",
        summary: "A pawn attacks two pieces at the same time.",
        definition: "A pawn fork is a pawn move that attacks two enemy pieces at once. Pawn forks are especially effective against knights and bishops because the pawn is worth less than either target."
    },
    {
        id: "familyFork",
        name: "Family fork",
        category: "tactics",
        summary: "A knight forks the king, queen and rook.",
        definition: "A family fork is a knight fork that attacks the king together with the queen and often a rook. The king must move, so the knight wins the other piece."
    },
    {
        id: "capturingDefender",
        name: "Capturing the defender",
        category: "tactics",
        summary: "Remove a piece that guards another target.",
        definition: "Capturing the defender means taking or driving away a piece that protects a key enemy unit. Once the defender is gone, the target can be captured or attacked profitably. It is also called removing the defender."
    },
    {
        id: "deflection",
        name: "Deflection",
        category: "tactics",
        summary: "Force a defender away from the square or piece it guards.",
        definition: "A deflection is a forcing move, often a check, capture or threat, that pulls a defender away from an important duty. The defender cannot stay on its defensive square, so the original target falls."
    },
    {
        id: "attraction",
        name: "Attraction",
        category: "tactics",
        summary: "Lure a piece to a square where it can be exploited.",
        definition: "Attraction sacrifices material or offers a threat to draw an enemy piece, especially the king, onto a square where it blocks its own defence or becomes a target for a follow-up tactic."
    },
    {
        id: "clearance",
        name: "Clearance",
        category: "tactics",
        summary: "Move a piece out of the way to open a line or square.",
        definition: "A clearance move vacates a square, rank, file or diagonal so another piece can use it. The moving piece may sacrifice itself or make a threat, but its main purpose is to clear the path."
    },
    {
        id: "interference",
        name: "Interference",
        category: "tactics",
        summary: "Place a piece between two enemy pieces to break their line.",
        definition: "Interference means putting a piece on the line between two enemy pieces, usually to stop a defender from reaching a key square. The interfering piece can be a sacrifice, and the tactic is closely related to blocking and clearance."
    },
    {
        id: "overloading",
        name: "Overloading",
        category: "tactics",
        summary: "Give a defender more jobs than it can handle.",
        definition: "Overloading exploits a piece that is defending two or more important things at once. Once the overloaded piece is forced to abandon one duty, the other target falls."
    },
    {
        id: "hangingPiece",
        name: "Hanging piece",
        category: "tactics",
        summary: "A piece is attacked and not defended.",
        definition: "A hanging piece is an undefended or insufficiently defended piece that can be captured for free or for a favourable exchange. Loose-piece awareness is the habit of checking every attack and defence before moving."
    },
    {
        id: "trappedPiece",
        name: "Trapped piece",
        category: "tactics",
        summary: "A piece has no safe square and can be won.",
        definition: "A trapped piece has limited or no safe squares, often because its escape routes are blocked by its own pieces or controlled by the opponent. Trapping is a way to win material without a direct capture."
    },
    {
        id: "sacrifice",
        name: "Sacrifice",
        category: "tactics",
        summary: "Give up material to gain a stronger concrete advantage.",
        definition: "A sacrifice is a deliberate exchange of material for something more valuable: checkmate, a winning attack, a promotion, or a decisive positional concession. A sacrifice is only sound when the follow-up is forcing or the compensation is real."
    },
    {
        id: "promotion",
        name: "Promotion",
        category: "tactics",
        summary: "A pawn reaches the last rank and becomes a new piece.",
        definition: "Promotion turns a pawn that reaches the eighth rank into a queen, rook, bishop or knight. Most promotions are to a queen, but underpromotion to a knight can give check or avoid stalemate, and promotion to a rook or bishop can avoid an immediate draw."
    },
    {
        id: "underPromotion",
        name: "Underpromotion",
        category: "tactics",
        summary: "Promote to a knight, rook or bishop instead of a queen.",
        definition: "Underpromotion is promotion to a piece other than a queen. Knight promotion is used for forks and checks, while rook or bishop promotion can avoid stalemate or a lost queen after promotion."
    },
    {
        id: "enPassant",
        name: "En passant",
        category: "tactics",
        summary: "Capture a pawn that has just advanced two squares.",
        definition: "En passant is a special pawn capture available immediately after an enemy pawn moves two squares and lands beside your pawn. Your pawn captures as if the enemy pawn had moved only one square."
    },
    {
        id: "zwischenzug",
        name: "Zwischenzug",
        category: "tactics",
        summary: "Insert a forcing move before completing an expected sequence.",
        definition: "A zwischenzug, or intermediate move, is a forcing check, capture or threat played before the expected recapture or continuation. It changes the position so the original plan works better or the opponent runs out of time."
    },
    {
        id: "zugzwang",
        name: "Zugzwang",
        category: "endgames",
        summary: "A player is forced to move and every move makes things worse.",
        definition: "Zugzwang is a position where the side to move would prefer to pass, because every legal move weakens its position. It is most common in king and pawn endgames, where having the move can be a disadvantage."
    },
    {
        id: "fortress",
        name: "Fortress",
        category: "endgames",
        summary: "A drawn setup that cannot be broken down.",
        definition: "A fortress is a defensive setup that holds a draw even though the opponent has more material, because there is no way to make progress without allowing a draw or losing the advantage."
    },
    {
        id: "stalemate",
        name: "Stalemate",
        category: "endgames",
        summary: "The side to move has no legal move and is not in check.",
        definition: "Stalemate is an immediate draw: the side to move is not in check but has no legal move. It often saves a lost game and is a key calculation check when promoting a pawn."
    },
    {
        id: "opposition",
        name: "Opposition",
        category: "endgames",
        summary: "Kings face each other and the side to move must give way.",
        definition: "Opposition is a king and pawn endgame concept where the kings face each other with one square between them. The side that does not have to move can often force the opposing king away and win."
    },
    {
        id: "triangulation",
        name: "Triangulation",
        category: "endgames",
        summary: "Lose a tempo with the king to put the opponent in zugzwang.",
        definition: "Triangulation is a king manoeuvre that takes three moves to return to the same file or rank, losing a tempo and handing the move to the opponent. It is used to win opposition or force zugzwang."
    },
    {
        id: "lucena",
        name: "Lucena position",
        category: "endgames",
        summary: "A winning rook endgame with the king cut off.",
        definition: "The Lucena position is a standard winning rook and pawn endgame. The stronger side uses the rook to build a bridge and shield the king from checks, then promotes the pawn."
    },
    {
        id: "philidor",
        name: "Philidor position",
        category: "endgames",
        summary: "A standard drawing rook endgame.",
        definition: "The Philidor position is a drawing technique in rook and pawn endgames. The defender keeps the rook on the third rank to stop the king advancing, then checks from behind once the pawn moves."
    },
    {
        id: "passedPawn",
        name: "Passed pawn",
        category: "endgames",
        summary: "A pawn with no enemy pawns able to stop it.",
        definition: "A passed pawn has no enemy pawn on its file or adjacent files ahead of it. Passed pawns are valuable because they can advance to promotion and often tie down enemy pieces."
    },
    {
        id: "isolatedPawn",
        name: "Isolated pawn",
        category: "positional",
        summary: "A pawn with no friendly pawns on adjacent files.",
        definition: "An isolated pawn has no friendly pawns on the files next to it. It cannot be defended by another pawn, so it can become a target, especially in the endgame, and the square in front of it may become a strong outpost."
    },
    {
        id: "doubledPawns",
        name: "Doubled pawns",
        category: "positional",
        summary: "Two friendly pawns on the same file.",
        definition: "Doubled pawns are two pawns of the same colour on one file. They cannot defend each other and block each other's advance, although they can sometimes provide extra control of adjacent squares or open a file for a rook."
    },
    {
        id: "backwardPawn",
        name: "Backward pawn",
        category: "positional",
        summary: "A pawn behind its neighbours that cannot be defended by pawns.",
        definition: "A backward pawn is behind the pawns on adjacent files and cannot be protected by another pawn. It is a common target because the square in front of it can be occupied by an enemy piece."
    },
    {
        id: "outpost",
        name: "Outpost",
        category: "positional",
        summary: "A square protected by a pawn where an enemy pawn cannot attack.",
        definition: "An outpost is a square, usually in enemy territory, that is protected by your pawn and cannot be attacked by an enemy pawn. A knight on an outpost is especially strong because it cannot be driven away easily."
    },
    {
        id: "weakSquare",
        name: "Weak square",
        category: "positional",
        summary: "A square that cannot be defended by a pawn.",
        definition: "A weak square is one that your pawns can no longer protect, often because the relevant pawn has advanced or been traded. Pieces, especially knights, can occupy it permanently."
    },
    {
        id: "openFile",
        name: "Open file",
        category: "positional",
        summary: "A file with no pawns on it.",
        definition: "An open file has no pawns of either colour on it. Rooks and queens are strongest on open files because they can reach the seventh rank or attack the enemy king without obstruction."
    },
    {
        id: "halfOpenFile",
        name: "Half-open file",
        category: "positional",
        summary: "A file with no friendly pawns but at least one enemy pawn.",
        definition: "A half-open file has no pawns of your colour, but the opponent still has at least one pawn on it. It is a natural file for your rooks because they can pressure the enemy pawn without facing one of your own."
    },
    {
        id: "seventhRank",
        name: "Rook on the seventh",
        category: "positional",
        summary: "A rook on the seventh rank attacks pawns and traps the king.",
        definition: "A rook on the seventh rank is powerful because it attacks the enemy pawns on their starting squares and restricts the king. Two rooks on the seventh rank are often decisive."
    },
    {
        id: "kingSafety",
        name: "King safety",
        category: "positional",
        summary: "Keep the king protected behind a sound pawn shield.",
        definition: "King safety is the balance between keeping the king shielded and using pieces actively. A weakened pawn shield, open files near the king and a queen exchange that exposes the king are common warning signs."
    },
    {
        id: "initiative",
        name: "Initiative",
        category: "positional",
        summary: "The ability to keep forcing the opponent to react.",
        definition: "The initiative means you are making the threats and the opponent is responding. It is not the same as a material advantage; it is a temporary asset that must be used before the opponent consolidates."
    },
    {
        id: "tempo",
        name: "Tempo",
        category: "calculation",
        summary: "One move of time, especially in development or forcing lines.",
        definition: "A tempo is one move's worth of time. Gaining a tempo means making progress while forcing the opponent to respond, and losing a tempo means spending a move on something that does not help."
    },
    {
        id: "prophylaxis",
        name: "Prophylaxis",
        category: "positional",
        summary: "Prevent the opponent's plan before it starts.",
        definition: "Prophylaxis is a move that stops or slows the opponent's idea rather than pursuing your own immediate plan. Strong players often make quiet prophylactic moves that remove counterplay."
    },
    {
        id: "bishopPair",
        name: "Bishop pair",
        category: "positional",
        summary: "Two bishops working together on open diagonals.",
        definition: "The bishop pair is the advantage of having both bishops against a bishop and knight or two knights. Bishops become stronger as the position opens and they can control both colours of squares."
    },
    {
        id: "goodBishop",
        name: "Good bishop",
        category: "positional",
        summary: "A bishop whose pawns do not block its diagonals.",
        definition: "A good bishop is one whose own pawns are mostly on the opposite colour, leaving its diagonals free. A bad bishop is restricted by its own pawn structure."
    },
    {
        id: "badBishop",
        name: "Bad bishop",
        category: "positional",
        summary: "A bishop blocked by its own pawns.",
        definition: "A bad bishop is restricted by its own pawns, especially when many of them sit on the same colour as the bishop. Improving it usually means changing the pawn structure or trading it for a better piece."
    },
    {
        id: "space",
        name: "Space",
        category: "positional",
        summary: "More room to manoeuvre behind your pawns.",
        definition: "Space is the amount of territory your pieces can use without being attacked. More space lets you switch pieces between wings and makes it harder for the opponent to find good squares."
    },
    {
        id: "pawnChain",
        name: "Pawn chain",
        category: "positional",
        summary: "Pawns protecting each other on a diagonal.",
        definition: "A pawn chain is a diagonal line of pawns that defend one another. The base of the chain is the key target because capturing it can collapse the whole structure."
    },
    {
        id: "blockade",
        name: "Blockade",
        category: "positional",
        summary: "Stop a passed pawn by placing a piece in front of it.",
        definition: "A blockade stops a passed pawn by placing a piece, ideally a knight, on the square directly in front of it. The blockading piece is protected by a pawn and controls the pawn's advance."
    },
    {
        id: "minorityAttack",
        name: "Minority attack",
        category: "positional",
        summary: "Advance fewer pawns to create a weakness in the enemy structure.",
        definition: "A minority attack uses fewer pawns on one wing to provoke a pawn advance or create an isolated or backward pawn. It is a long-term positional plan rather than an immediate tactic."
    },
    {
        id: "pawnMajority",
        name: "Pawn majority",
        category: "endgames",
        summary: "More pawns on one wing, aiming to create a passed pawn.",
        definition: "A pawn majority is having more pawns than the opponent on a wing. The majority is valuable because it can create a passed pawn, especially in the endgame."
    },
    {
        id: "oppositeCastling",
        name: "Opposite-side castling",
        category: "positional",
        summary: "Kings castled on different wings, inviting pawn storms.",
        definition: "Opposite-side castling means the kings are on different wings. Both sides often attack with pawn storms, so the game becomes a race where tempos and king safety matter more than material."
    },
    {
        id: "queensideAttack",
        name: "Queenside attack",
        category: "tactics",
        summary: "Attack the enemy king or structure on the queenside.",
        definition: "A queenside attack targets the enemy king or pawn structure on the a-d files. It often uses rooks on open files, a pawn storm, or a minority attack rather than direct checks."
    },
    {
        id: "kingsideAttack",
        name: "Kingside attack",
        category: "tactics",
        summary: "Attack the enemy king on the kingside.",
        definition: "A kingside attack targets the enemy king on the e-h files. It usually involves a pawn storm, piece sacrifices, open files and mating patterns against a castled king."
    },
    {
        id: "exposedKing",
        name: "Exposed king",
        category: "tactics",
        summary: "A king without a pawn shield or with open lines around it.",
        definition: "An exposed king has little pawn cover or faces open files and diagonals. Checks and sacrifices become much stronger because the king has fewer safe squares."
    },
    {
        id: "attackingF2F7",
        name: "Attacking f2 or f7",
        category: "tactics",
        summary: "Target the weakest square near the uncastled king.",
        definition: "The f2 and f7 squares are weak in the starting position because only the king defends them. Early queen and bishop attacks against these squares can win a pawn or force the king to move."
    },
    {
        id: "quietMove",
        name: "Quiet move",
        category: "calculation",
        summary: "A strong move that makes a threat without check or capture.",
        definition: "A quiet move is a move that does not give check or capture but creates an unavoidable threat. Quiet moves are often the hardest tactic to calculate because they do not force the opponent's reply directly."
    },
    {
        id: "defensiveMove",
        name: "Defensive move",
        category: "calculation",
        summary: "The precise move that holds a difficult position.",
        definition: "A defensive move is the best resource in a bad position, often a quiet king move, a block, or a counterattack. Finding it requires checking the opponent's threats before choosing a natural move."
    },
    {
        id: "perpetualCheck",
        name: "Perpetual check",
        category: "tactics",
        summary: "Repeat checks to force a draw.",
        definition: "Perpetual check is a sequence of checks that the opponent cannot escape without allowing a draw by repetition. It is a common saving resource in a lost position."
    },
    {
        id: "castling",
        name: "Castling",
        category: "tactics",
        summary: "Move the king to safety and activate a rook in one move.",
        definition: "Castling moves the king two squares towards a rook and places the rook on the square the king crossed. It is legal only if neither piece has moved, the squares between them are empty, the king is not in check, and it does not pass through an attacked square."
    },
    {
        id: "advancedPawn",
        name: "Advanced pawn",
        category: "tactics",
        summary: "A pawn far up the board that creates threats or promotion chances.",
        definition: "An advanced pawn is a pawn that has pushed deep into enemy territory. It can restrict pieces, create mating threats, or run for promotion, but it can also become weak if it outruns its support."
    },
    {
        id: "pawnEndgame",
        name: "Pawn endgame",
        category: "endgames",
        summary: "A king and pawn endgame where every tempo matters.",
        definition: "A pawn endgame is an endgame with only kings and pawns. Opposition, triangulation, key squares and the race to promote are the core techniques, and calculation is usually exact."
    },
    {
        id: "rookEndgame",
        name: "Rook endgame",
        category: "endgames",
        summary: "An endgame with rooks and pawns.",
        definition: "Rook endgames are the most common endgame. The Lucena and Philidor positions, cutting off the king, active rooks and checking from behind are the core techniques."
    },
    {
        id: "bishopEndgame",
        name: "Bishop endgame",
        category: "endgames",
        summary: "An endgame with bishops and pawns.",
        definition: "Bishop endgames depend on the colour of the squares controlled by the bishops and the pawns. Bishops of opposite colours often draw even with an extra pawn, while same-coloured bishops can be winning."
    },
    {
        id: "knightEndgame",
        name: "Knight endgame",
        category: "endgames",
        summary: "An endgame with knights and pawns.",
        definition: "Knight endgames favour closed positions and outposts. Knights are short-range pieces, so the king and passed pawns become especially important."
    },
    {
        id: "queenEndgame",
        name: "Queen endgame",
        category: "endgames",
        summary: "An endgame with queens and pawns.",
        definition: "Queen endgames are tactical and dangerous because checks can continue for a long time. King safety and perpetual-check possibilities matter as much as material."
    },
    {
        id: "queenRookEndgame",
        name: "Queen and rook endgame",
        category: "endgames",
        summary: "An endgame with queens and rooks still on the board.",
        definition: "Queen and rook endgames are highly tactical. The king must be protected from checks, and the side with the initiative can often force mate or win material before the pawns matter."
    },
    {
        id: "pawnlessEndgame",
        name: "Pawnless endgame",
        category: "endgames",
        summary: "An endgame without pawns, decided by mate or a theoretical draw.",
        definition: "A pawnless endgame has no pawns, so the result depends on piece coordination and mating technique. Many material imbalances are theoretical draws, while some are forced mates."
    },
    {
        id: "connectedPawns",
        name: "Connected passed pawns",
        category: "endgames",
        summary: "Two passed pawns on adjacent files that protect each other.",
        definition: "Connected passed pawns are passed pawns on adjacent files. They are extremely strong because they defend each other and can advance together, often overwhelming a defence."
    },
    {
        id: "oppositionEndgame",
        name: "Key squares",
        category: "endgames",
        summary: "Squares that decide whether a pawn promotes.",
        definition: "Key squares are squares in front of a pawn that guarantee promotion if the attacking king reaches them. In king and pawn endgames, controlling the key squares is often more important than winning the pawn."
    },
    {
        id: "calculation",
        name: "Calculation",
        category: "calculation",
        summary: "The ability to work out forcing lines accurately.",
        definition: "Calculation is the skill of working through candidate moves, replies and recaptures without moving the pieces. A calculation error means the player missed a stronger continuation, a defensive resource, or the tactical point of the position."
    },
    {
        id: "positionalPlay",
        name: "Positional play",
        category: "positional",
        summary: "Improving pieces and structure without an immediate tactic.",
        definition: "Positional play is the long-term improvement of pieces, pawn structure, king safety and squares. A positional error usually does not lose material at once, but it leaves a permanent weakness, a bad piece, or a plan for the opponent."
    },
    {
        id: "openingGap",
        name: "Opening gap",
        category: "calculation",
        summary: "A recurring problem in the first phase of the game.",
        definition: "An opening gap is a mistake or repeated uncertainty in the opening: an inaccurate move order, a forgotten line, a plan that does not fit the structure, or a development move that ignores the opponent's threat. It is different from a tactical blunder because the cost is often positional and appears later."
    },
    {
        id: "endgameTechnique",
        name: "Endgame technique",
        category: "endgames",
        summary: "Converting or saving a simplified position accurately.",
        definition: "Endgame technique is the ability to use the king, pawns and remaining pieces accurately after the middlegame. It includes opposition, key squares, rook activity, the Lucena and Philidor positions, and knowing which simplified positions are drawn or won."
    }
];

const aliases: Record<string, string> = {
    xray: "xRayAttack",
    "x-ray": "xRayAttack",
    xrayattack: "xRayAttack",
    backrank: "backRankMate",
    "back-rank": "backRankMate",
    backrankmate: "backRankMate",
    discovered: "discoveredAttack",
    discoveredattack: "discoveredAttack",
    discoveredcheck: "discoveredCheck",
    doublecheck: "doubleCheck",
    hanging: "hangingPiece",
    hangingpiece: "hangingPiece",
    trapped: "trappedPiece",
    trappedpiece: "trappedPiece",
    removingdefender: "capturingDefender",
    removingtheddefender: "capturingDefender",
    capturingtheddefender: "capturingDefender",
    underpromotion: "underPromotion",
    enpassant: "enPassant",
    bishoppair: "bishopPair",
    goodbishop: "goodBishop",
    badbishop: "badBishop",
    rookseventh: "seventhRank",
    seventrank: "seventhRank",
    keySquares: "oppositionEndgame"
};

export const tacticDefinitions = Object.fromEntries(
    definitions.map(definition => [ definition.id, definition ])
) as Record<string, TacticDefinition>;

export const tacticGroups: Record<TacticCategory, TacticDefinition[]> = {
    tactics: definitions.filter(definition => definition.category == "tactics"),
    mates: definitions.filter(definition => definition.category == "mates"),
    endgames: definitions.filter(definition => definition.category == "endgames"),
    positional: definitions.filter(definition => definition.category == "positional"),
    calculation: definitions.filter(definition => definition.category == "calculation")
};

export function getTacticDefinition(term: string) {
    const clean = term.trim().toLowerCase().replace(/\s+/g, "");
    const id = aliases[clean] ?? Object.keys(tacticDefinitions).find(key => (
        key.toLowerCase() == clean
        || tacticDefinitions[key].name.toLowerCase().replace(/\s+/g, "") == clean
    ));

    return id ? tacticDefinitions[id] : undefined;
}

export function getGlossaryPrompt() {
    const lines = definitions.map(definition => (
        `- ${definition.name} (${definition.id}): ${definition.definition}`
    ));

    return `CHESS GLOSSARY
Use these definitions exactly. When you name a tactic, make sure the position matches the definition.
${lines.join("\n")}`;
}

export interface DetectedTactic {
    id: string;
    evidence: string;
}

const pieceValues: Record<PieceSymbol, number> = {
    p: 1,
    n: 3,
    b: 3,
    r: 5,
    q: 9,
    k: 0
};

const files = "abcdefgh";

function squareCoords(square: Square) {
    return {
        x: files.indexOf(square[0]),
        y: Number(square[1]) - 1
    };
}

function coordsSquare(x: number, y: number) {
    if (x < 0 || x > 7 || y < 0 || y > 7) return;

    return `${files[x]}${y + 1}` as Square;
}

function getKingSquare(board: Chess, colour: "w" | "b") {
    for (const row of board.board()) {
        for (const piece of row) {
            if (piece?.type == "k" && piece.color == colour) return piece.square;
        }
    }
}

function isSlider(type: PieceSymbol) {
    return type == "q" || type == "r" || type == "b";
}

function sliderMatches(type: PieceSymbol, dx: number, dy: number) {
    if (type == "q") return true;
    if (type == "r") return dx == 0 || dy == 0;
    if (type == "b") return Math.abs(dx) == Math.abs(dy);
    return false;
}

function getRayTargets(
    board: Chess, from: Square, colour: "w" | "b", type: PieceSymbol
) {
    const { x, y } = squareCoords(from);
    const targets: { square: Square; piece: ReturnType<Chess["get"]>; distance: number }[] = [];

    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            if ((!dx && !dy) || (!sliderMatches(type, dx, dy))) continue;

            for (let step = 1; step < 8; step++) {
                const square = coordsSquare(x + dx * step, y + dy * step);
                if (!square) break;

                const piece = board.get(square);
                if (!piece) continue;
                if (piece.color != colour) {
                    targets.push({ square, piece, distance: step });
                }

                break;
            }
        }
    }

    return targets;
}

function getFirstPieceOnRays(
    board: Chess, from: Square, type: PieceSymbol
) {
    const { x, y } = squareCoords(from);
    const pieces: { square: Square; piece: NonNullable<ReturnType<Chess["get"]>> }[] = [];

    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            if ((!dx && !dy) || !sliderMatches(type, dx, dy)) continue;

            for (let step = 1; step < 8; step++) {
                const square = coordsSquare(x + dx * step, y + dy * step);
                if (!square) break;

                const piece = board.get(square);
                if (!piece) continue;

                pieces.push({ square, piece });
                break;
            }
        }
    }

    return pieces;
}

function getPinnedPieces(fen: string) {
    const board = new Chess(fen);
    const pinned: { square: Square; attacker: Square; king: Square }[] = [];

    for (const colour of [ "w", "b" ] as const) {
        const king = getKingSquare(board, colour);
        if (!king) continue;

        const { x, y } = squareCoords(king);
        const enemy = colour == "w" ? "b" : "w";

        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                if (!dx && !dy) continue;

                let first: { square: Square; type: PieceSymbol; colour: "w" | "b" } | undefined;

                for (let step = 1; step < 8; step++) {
                    const square = coordsSquare(x + dx * step, y + dy * step);
                    if (!square) break;

                    const piece = board.get(square);
                    if (!piece) continue;

                    if (!first) {
                        if (piece.color == colour && piece.type != "k") {
                            first = { square, type: piece.type, colour: piece.color };
                        }

                        continue;
                    }

                    if (
                        piece.color == enemy
                        && isSlider(piece.type)
                        && sliderMatches(piece.type, dx, dy)
                    ) {
                        pinned.push({
                            square: first.square,
                            attacker: square,
                            king
                        });
                    }

                    break;
                }
            }
        }
    }

    return pinned;
}

function getDiscoveredLines(
    before: Chess, after: Chess, from: Square, colour: "w" | "b"
) {
    const discovered: { slider: Square; target: Square }[] = [];
    const enemy = colour == "w" ? "b" : "w";

    for (const row of before.board()) {
        for (const piece of row) {
            if (!piece || piece.color != colour || !isSlider(piece.type)) continue;
            if (piece.square == from) continue;

            const blocker = getFirstPieceOnRays(before, piece.square, piece.type)
                .find(item => item.square == from);

            if (!blocker) continue;

            const next = getFirstPieceOnRays(after, piece.square, piece.type)
                .find(item => item.piece.color == enemy);

            if (
                next
                && (next.piece.type == "k" || next.piece.type == "q")
            ) {
                discovered.push({ slider: piece.square, target: next.square });
            }
        }
    }

    return discovered;
}

function getXrayAttacks(fen: string, colour: "w" | "b") {
    const board = new Chess(fen);
    const attacks: { slider: Square; target: Square }[] = [];
    const enemy = colour == "w" ? "b" : "w";

    for (const row of board.board()) {
        for (const piece of row) {
            if (!piece || piece.color != colour || !isSlider(piece.type)) continue;

            const ray = getRayTargets(board, piece.square, colour, piece.type);
            const first = ray[0];
            const second = ray[1];

            if (
                first?.piece?.color == enemy
                && second?.piece?.color == enemy
                && (second.piece.type == "k" || second.piece.type == "q"
                    || pieceValues[second.piece.type] >= 5)
            ) {
                attacks.push({ slider: piece.square, target: second.square });
            }
        }
    }

    return attacks;
}

function getSkewers(fen: string, colour: "w" | "b") {
    const board = new Chess(fen);
    const skewers: { slider: Square; target: Square }[] = [];
    const enemy = colour == "w" ? "b" : "w";

    for (const row of board.board()) {
        for (const piece of row) {
            if (!piece || piece.color != colour || !isSlider(piece.type)) continue;

            const ray = getRayTargets(board, piece.square, colour, piece.type);
            const first = ray[0];
            const second = ray[1];

            if (
                first?.piece?.color == enemy
                && (first.piece.type == "k" || first.piece.type == "q")
                && second?.piece?.color == enemy
            ) {
                skewers.push({ slider: piece.square, target: second.square });
            }
        }
    }

    return skewers;
}

function getHangingPieces(fen: string, colour: "w" | "b") {
    const board = new Chess(fen);
    const enemy = colour == "w" ? "b" : "w";
    const hanging: { square: Square; type: PieceSymbol }[] = [];

    for (const row of board.board()) {
        for (const piece of row) {
            if (!piece || piece.color != enemy || piece.type == "k") continue;

            const attackers = board.attackers(piece.square, colour);
            if (!attackers.length) continue;

            const defenders = board.attackers(piece.square, enemy);
            if (defenders.length) continue;

            hanging.push({ square: piece.square, type: piece.type });
        }
    }

    return hanging;
}

function getAttackedTargets(
    board: Chess, from: Square, colour: "w" | "b"
) {
    const targets: { square: Square; type: PieceSymbol }[] = [];
    const enemy = colour == "w" ? "b" : "w";

    for (const row of board.board()) {
        for (const piece of row) {
            if (!piece || piece.color != enemy) continue;
            if (!board.attackers(piece.square, colour).includes(from)) continue;

            targets.push({ square: piece.square, type: piece.type });
        }
    }

    return targets;
}

function getDefendedTargets(fen: string, defender: Square, colour: "w" | "b") {
    const board = new Chess(fen);
    const targets: Square[] = [];

    for (const row of board.board()) {
        for (const piece of row) {
            if (!piece || piece.color != colour) continue;
            if (!board.attackers(piece.square, colour).includes(defender)) continue;

            targets.push(piece.square);
        }
    }

    return targets;
}

export function detectMoveTactics(fen: string, san: string): DetectedTactic[] {
    const before = new Chess(fen);
    let after: Chess;
    let move;

    try {
        move = before.move(san);
        after = new Chess(move.after);
    } catch {
        return [];
    }

    const found = new Map<string, string>();
    const colour = move.color;
    const enemy = colour == "w" ? "b" : "w";
    const enemyKing = getKingSquare(after, enemy);
    const checks = after.isCheck();
    const mate = after.isCheckmate();
    const captured = move.captured ? pieceValues[move.captured] : 0;
    const moved = pieceValues[move.piece];
    const destinationAttackers = after.attackers(move.to, enemy);
    const attackersOnKing = enemyKing
        ? after.attackers(enemyKing, colour)
        : [];

    if (mate) {
        found.set("mateIn1", "the move delivers checkmate");
    }

    if (mate && enemyKing && (enemyKing[1] == "1" || enemyKing[1] == "8")) {
        found.set("backRankMate", "the mate is delivered on the back rank");
    }

    if (mate && move.piece == "n") {
        const kingMoves = after.moves({ square: enemyKing, verbose: true });
        if (!kingMoves.length) {
            found.set("smotheredMate", "the knight mates a king with no escape");
        }
    }

    if (checks && attackersOnKing.length > 1) {
        found.set("doubleCheck", "two pieces give check at once");
    }

    if (move.promotion) {
        found.set("promotion", "the move promotes a pawn");

        if (move.promotion != "q") {
            found.set("underPromotion", "the move promotes to a minor piece or rook");
        }
    }

    if (move.isEnPassant()) {
        found.set("enPassant", "the move captures en passant");
    }

    if (move.isKingsideCastle() || move.isQueensideCastle()) {
        found.set("castling", "the move castles the king to safety");
    }

    if (move.piece == "p" && (move.to[1] == "7" || move.to[1] == "2")) {
        found.set("advancedPawn", "the pawn reaches the seventh rank");
    }

    const targets = getAttackedTargets(after, move.to, colour);
    const valuableTargets = targets.filter(target => (
        target.type == "k" || pieceValues[target.type] >= 3
    ));

    if (valuableTargets.length >= 2) {
        found.set(
            "fork",
            `the ${move.piece} attacks ${valuableTargets.map(target => target.square).join(" and ")}`
        );
    }

    const pinned = getPinnedPieces(move.after).filter(item => (
        after.get(item.attacker)?.color == colour
    ));

    if (pinned.length) {
        found.set("pin", `a piece is pinned on ${pinned[0].square}`);
    }

    const discovered = getDiscoveredLines(before, after, move.from, colour);

    if (discovered.length) {
        found.set("discoveredAttack", `the move opens a line from ${discovered[0].slider}`);

        if (checks) found.set("discoveredCheck", "the opened line gives check");
        if (checks) found.set("clearance", "the move clears a line for the discovered check");
    }

    const xrays = getXrayAttacks(move.after, colour).filter(item => (
        item.slider == move.to || item.slider == move.from
    ));

    if (xrays.length) {
        found.set("xRayAttack", `the line attacks through to ${xrays[0].target}`);
    }

    const skewers = getSkewers(move.after, colour).filter(item => (
        item.slider == move.to || item.slider == move.from
    ));

    if (skewers.length) {
        found.set("skewer", `the line attacks a valuable piece and wins ${skewers[0].target}`);
    }

    if (captured) {
        const defended = getDefendedTargets(move.after, move.to, enemy);

        if (defended.length) {
            found.set("capturingDefender", "the captured piece was defending another target");
        }
    }

    if (captured && moved > captured && destinationAttackers.length) {
        found.set("sacrifice", "the move gives up material for the follow-up");
    }

    if (
        checks
        && captured
        && moved > captured
        && destinationAttackers.length
    ) {
        found.set("attraction", "a sacrifice draws the king into the attack");
    }

    const hanging = getHangingPieces(move.after, colour);

    if (hanging.length) {
        found.set(
            "hangingPiece",
            `${hanging[0].type} on ${hanging[0].square} is undefended`
        );
    }

    if (checks && enemyKing) {
        const file = files.indexOf(enemyKing[0]);
        found.set(
            file >= 4 ? "kingsideAttack" : "queensideAttack",
            "the move attacks the enemy king"
        );

        if (!after.moves({ square: enemyKing, verbose: true }).length) {
            found.set("exposedKing", "the king has no safe flight square");
        }
    }

    if (!captured && !checks && targets.length) {
        found.set("quietMove", "the move makes a threat without check or capture");
    }

    if (move.piece == "n" && valuableTargets.length >= 2) {
        found.set("fork", `the knight forks ${valuableTargets.length} targets`);
    }

    return [ ...found.entries() ].map(([ id, evidence ]) => ({ id, evidence }));
}

export function detectPositionTactics(fen: string) {
    const board = new Chess(fen);
    const found: DetectedTactic[] = [];
    const colour = board.turn();
    const enemy = colour == "w" ? "b" : "w";
    const pinned = getPinnedPieces(fen).filter(item => (
        board.get(item.attacker)?.color == colour
    ));
    const hanging = getHangingPieces(fen, colour);
    const xrays = getXrayAttacks(fen, colour);
    const skewers = getSkewers(fen, colour);

    if (pinned.length) {
        found.push({
            id: "pin",
            evidence: `${pinned[0].square} is pinned to the king`
        });
    }

    if (hanging.length) {
        found.push({
            id: "hangingPiece",
            evidence: `${hanging[0].type} on ${hanging[0].square} is undefended`
        });
    }

    if (xrays.length) {
        found.push({
            id: "xRayAttack",
            evidence: `${xrays[0].slider} attacks through to ${xrays[0].target}`
        });
    }

    if (skewers.length) {
        found.push({
            id: "skewer",
            evidence: `${skewers[0].slider} skewers a piece on ${skewers[0].target}`
        });
    }

    const enemyKing = getKingSquare(board, enemy);
    if (enemyKing) {
        const file = files.indexOf(enemyKing[0]);
        found.push({
            id: file >= 4 ? "kingsideAttack" : "queensideAttack",
            evidence: "the enemy king is the target"
        });
    }

    return found;
}

export function detectGameTactics(fen: string, bestSan?: string) {
    const found = new Map<string, DetectedTactic>();

    if (bestSan) {
        for (const tactic of detectMoveTactics(fen, bestSan)) {
            found.set(tactic.id, tactic);
        }
    }

    for (const tactic of detectPositionTactics(fen)) {
        if (!found.has(tactic.id)) found.set(tactic.id, tactic);
    }

    return [ ...found.values() ];
}
