const functions: Record<string, (...args: number[]) => number> = {
    sqrt: Math.sqrt,
    abs: Math.abs,
    round: Math.round,
    floor: Math.floor,
    ceil: Math.ceil,
    min: Math.min,
    max: Math.max,
    pow: Math.pow,
    log: Math.log,
    exp: Math.exp
};

const constants: Record<string, number> = {
    pi: Math.PI,
    e: Math.E
};

function tokenise(expression: string) {
    const tokens: string[] = [];
    let index = 0;

    while (index < expression.length) {
        const character = expression[index];

        if (/\s/.test(character)) {
            index++;
            continue;
        }

        if (/[0-9.]/.test(character)) {
            let number = "";

            while (index < expression.length && /[0-9.]/.test(expression[index])) {
                number += expression[index];
                index++;
            }

            if ((number.match(/\./g) ?? []).length > 1) {
                throw new Error(`Invalid number: ${number}`);
            }

            tokens.push(number);
            continue;
        }

        if (/[A-Za-z]/.test(character)) {
            let name = "";

            while (index < expression.length && /[A-Za-z]/.test(expression[index])) {
                name += expression[index];
                index++;
            }

            tokens.push(name.toLowerCase());
            continue;
        }

        if ("+-*/%^(),".includes(character)) {
            tokens.push(character);
            index++;
            continue;
        }

        throw new Error(`Unexpected character: ${character}`);
    }

    return tokens;
}

export function calculate(expression: string): number {
    const tokens = tokenise(expression);
    let index = 0;

    function peek() {
        return tokens[index];
    }

    function consume(value?: string) {
        const token = tokens[index];

        if (value != undefined && token != value) {
            throw new Error(`Expected ${value}, got ${token ?? "end of expression"}`);
        }

        index++;

        return token;
    }

    function parseExpression(): number {
        let value = parseTerm();

        while (peek() == "+" || peek() == "-") {
            const operator = consume();
            const right = parseTerm();
            value = operator == "+" ? value + right : value - right;
        }

        return value;
    }

    function parseTerm(): number {
        let value = parsePower();

        while ([ "*", "/", "%" ].includes(peek())) {
            const operator = consume();
            const right = parsePower();

            if (operator == "*") value *= right;
            if (operator == "/") value /= right;
            if (operator == "%") value %= right;
        }

        return value;
    }

    function parsePower(): number {
        const value = parseUnary();

        if (peek() != "^") return value;

        consume("^");

        return Math.pow(value, parsePower());
    }

    function parseUnary(): number {
        if (peek() == "+") {
            consume("+");
            return parseUnary();
        }

        if (peek() == "-") {
            consume("-");
            return -parseUnary();
        }

        return parsePrimary();
    }

    function parsePrimary(): number {
        const token = peek();

        if (token == undefined) throw new Error("Unexpected end of expression");

        if (token == "(") {
            consume("(");
            const value = parseExpression();
            consume(")");
            return value;
        }

        const numeric = Number(token);

        if (!Number.isNaN(numeric) && token != "") {
            consume();
            return numeric;
        }

        if (token in constants) {
            consume();
            return constants[token];
        }

        const fn = functions[token];

        if (!fn) throw new Error(`Unknown name: ${token}`);

        consume();
        consume("(");

        const args: number[] = [];

        if (peek() != ")") {
            args.push(parseExpression());

            while (peek() == ",") {
                consume(",");
                args.push(parseExpression());
            }
        }

        consume(")");

        return fn(...args);
    }

    const result = parseExpression();

    if (index != tokens.length) {
        throw new Error(`Unexpected token: ${tokens[index]}`);
    }

    if (!Number.isFinite(result)) {
        throw new Error("Expression did not produce a finite number");
    }

    return result;
}
