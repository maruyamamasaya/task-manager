export type ImportedTask = { title: string; depth: number; done: boolean; parentIndex: number | null };

export function parseMarkdown(input: string): ImportedTask[] {
  const result: ImportedTask[] = []; const parents: number[] = [];
  for (const line of input.split(/\r?\n/)) {
    const match = line.match(/^(\s*)[-*+]\s+(?:\[([ xX])\]\s*)?(.+?)\s*$/);
    if (!match) continue;
    const rawDepth = Math.floor(match[1].replace(/\t/g, "  ").length / 2);
    const depth = Math.min(2, rawDepth); const title = match[3].trim(); if (!title) continue;
    const parentIndex = depth ? parents[depth - 1] ?? null : null;
    result.push({ title, depth: parentIndex === null ? 0 : depth, done: match[2]?.toLowerCase() === "x", parentIndex });
    parents[result.at(-1)!.depth] = result.length - 1; parents.length = result.at(-1)!.depth + 1;
  }
  return result;
}

export function toMarkdown<T extends { title: string; status: string; children: T[] }>(nodes: T[], depth = 0): string {
  return nodes.flatMap(node => [`${"  ".repeat(depth)}- [${node.status === "done" ? "x" : " "}] ${node.title}`, ...(node.children.length ? [toMarkdown(node.children, depth + 1)] : [])]).join("\n");
}
