export function timems(start: number) {
    return `${(performance.now() - start).toFixed(3)} ms`;
}
