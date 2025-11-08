import { extractLinkedNoteTitles, type TipTapJSON } from './notes.utils';

describe('extractLinkedNoteTitles', () => {
  it('returns empty array for null/undefined', () => {
    expect(extractLinkedNoteTitles(null as unknown as TipTapJSON)).toEqual([]);
    expect(extractLinkedNoteTitles(undefined as unknown as TipTapJSON)).toEqual(
      [],
    );
  });

  it('extracts from node-form wikilink with attrs.title', () => {
    const doc: TipTapJSON = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] },
        { type: 'wikilink', attrs: { title: 'Linear Algebra' } },
      ],
    };
    expect(extractLinkedNoteTitles(doc)).toEqual(['Linear Algebra']);
  });

  it('extracts from marks-form wikilink on text nodes', () => {
    const doc: TipTapJSON = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Read this',
              marks: [{ type: 'wikilink', attrs: { title: 'Calculus I' } }],
            },
          ],
        },
      ],
    };
    expect(extractLinkedNoteTitles(doc)).toEqual(['Calculus I']);
  });

  it('deduplicates and normalizes titles', () => {
    const doc: TipTapJSON = {
      type: 'doc',
      content: [
        { type: 'wikilink', attrs: { title: '  Physics 101  ' } },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'again',
              marks: [{ type: 'wikilink', attrs: { title: 'Physics 101' } }],
            },
          ],
        },
      ],
    };
    expect(extractLinkedNoteTitles(doc)).toEqual(['Physics 101']);
  });

  it('descends nested content to find links', () => {
    const doc: TipTapJSON = {
      type: 'doc',
      content: [
        {
          type: 'bullet_list',
          content: [
            {
              type: 'list_item',
              content: [
                {
                  type: 'paragraph',
                  content: [
                    { type: 'wikilink', attrs: { title: 'Chemistry' } },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
    expect(extractLinkedNoteTitles(doc)).toEqual(['Chemistry']);
  });

  it('ignores incidental [[text]] if not a wikilink node/mark', () => {
    const doc: TipTapJSON = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: '[[Not a link]]' }],
        },
      ],
    };
    expect(extractLinkedNoteTitles(doc)).toEqual([]);
  });
});
