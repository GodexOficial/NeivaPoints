export function normalizePersonName(name: string): string {
  return name
    .trim()
    .replace(/\s+/gu, " ")
    .toLocaleLowerCase("pt-BR")
    .replace(/(^|[\s'’-])(\p{L})/gu, (_, separator: string, letter: string) =>
      separator + letter.toLocaleUpperCase("pt-BR"),
    );
}