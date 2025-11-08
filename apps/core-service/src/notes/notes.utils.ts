// Minimal TipTap JSON shape types used by the extractor
export type TipTapMark = {
  type?: string;
  attrs?: Record<string, unknown>;
};

export type TipTapNode = {
  type?: string;
  attrs?: Record<string, unknown>;
  text?: string;
  marks?: TipTapMark[];
  content?: TipTapNode[];
};

export type TipTapJSON =
  | TipTapNode
  | { type?: string; content?: TipTapNode[] }
  | null
  | undefined;

/**
 * Extract unique note titles referenced via wikilinks from a TipTap JSON AST.
 *
 * Supported representations:
 * - Node form: node.type === 'wikilink' with attrs.title or child text.
 * - Mark form: text nodes with marks including { type: 'wikilink', attrs: { title } }.
 *
 * Non-goals for this extractor:
 * - Do not regex raw JSON strings.
 * - Ignore incidental strings like "[[foo]]" unless represented as a wikilink node/mark.
 */
export function extractLinkedNoteTitles(content: TipTapJSON): string[] {
  if (!content) return [];

  const titles: string[] = [];
  const seen = new Set<string>(); // case-insensitive uniqueness

  const pushTitle = (raw: unknown) => {
    if (typeof raw !== 'string') return;
    const cleaned = normalizeTitle(raw);
    if (!cleaned) return;
    const key = cleaned.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      titles.push(cleaned);
    }
  };

  const getTitle = (attrs: unknown): string | undefined => {
    if (attrs && typeof attrs === 'object') {
      const rec = attrs as Record<string, unknown>;
      const v = rec['title'];
      if (typeof v === 'string') return v;
    }
    return undefined;
  };

  const stack: TipTapNode[] = [];
  const root = content as TipTapNode;
  if (root) stack.push(root);

  while (stack.length) {
    const node = stack.pop()!;

    // Node-form wikilink
    if (node.type === 'wikilink') {
      const t = getTitle(node.attrs) ?? node.text;
      if (typeof t === 'string') pushTitle(t);
      // Also inspect child content if any
      if (Array.isArray(node.content)) {
        for (let i = node.content.length - 1; i >= 0; i--) {
          stack.push(node.content[i]);
        }
      }
      continue;
    }

    // Marks-form wikilink on text nodes
    if (node.text && Array.isArray(node.marks)) {
      const mark = node.marks.find((m) => m?.type === 'wikilink');
      if (mark) {
        const t = getTitle(mark.attrs) ?? node.text;
        if (typeof t === 'string') pushTitle(t);
      }
    }

    // Traverse children generically
    if (Array.isArray(node.content)) {
      for (let i = node.content.length - 1; i >= 0; i--) {
        stack.push(node.content[i]);
      }
    }
  }

  return titles;
}

function normalizeTitle(s: string): string {
  let out = s.trim();
  // Remove surrounding [[...]] defensively, if the extension encoded raw brackets
  if (out.startsWith('[[') && out.endsWith(']]') && out.length >= 4) {
    out = out.slice(2, -2);
  }
  // Collapse internal whitespace
  out = out.replace(/\s+/g, ' ');
  return out;
}
