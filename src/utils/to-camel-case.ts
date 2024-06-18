export function toCamelCase(input: string): string {
    return input
        .replace(/([:._-])(\w)/g, (_, __, char) => char.toUpperCase())
        .replace(/[:._-]/g, '')
        .replace(/^\w/, char => char.toLowerCase())
}
