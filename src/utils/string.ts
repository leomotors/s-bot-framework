export function trim(str: string): string {
    return str.replace(/^\s+/, "").toLowerCase();
}

export function checkPrefix(main: string, prefixes: string[]): boolean {
    for (const prefix of prefixes) if (main.startsWith(prefix)) return true;
    return false;
}
