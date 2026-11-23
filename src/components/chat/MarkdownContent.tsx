import React from 'react';
import ReactMarkdown from 'react-markdown';

interface ParsedTable {
  headers: string[];
  alignments: ('left' | 'center' | 'right')[];
  rows: string[][];
}

interface MarkdownContentSegment {
  type: 'markdown' | 'table';
  content: string;
  table?: ParsedTable;
}

/**
 * Splits a line by pipes (|), preserving escaped pipes (\|) as literal pipes.
 */
function splitPipes(line: string): string[] {
  let trimmed = line.trim();
  if (trimmed.startsWith('|')) trimmed = trimmed.slice(1);
  if (trimmed.endsWith('|') && !trimmed.endsWith('\\|')) trimmed = trimmed.slice(0, -1);

  const cells: string[] = [];
  let current = '';
  let i = 0;
  while (i < trimmed.length) {
    if (trimmed[i] === '\\' && i + 1 < trimmed.length && trimmed[i + 1] === '|') {
      current += '|';
      i += 2;
    } else if (trimmed[i] === '|') {
      cells.push(current.trim());
      current = '';
      i++;
    } else {
      current += trimmed[i];
      i++;
    }
  }
  cells.push(current.trim());
  return cells;
}

/**
 * Validates whether a line is a valid GFM table delimiter row.
 * E.g. `| :--- | :---: | ---: |` or `:--- | :---:`
 */
function parseDelimiterRow(line: string): ('left' | 'center' | 'right')[] | null {
  if (!line.includes('-')) return null;
  const cells = splitPipes(line);
  if (cells.length === 0) return null;

  const alignments: ('left' | 'center' | 'right')[] = [];
  for (const cell of cells) {
    // Must contain only colons and dashes, with at least one dash
    if (!/^:?-+:?$/.test(cell)) {
      return null;
    }
    const leftColon = cell.startsWith(':');
    const rightColon = cell.endsWith(':');
    if (leftColon && rightColon) {
      alignments.push('center');
    } else if (rightColon) {
      alignments.push('right');
    } else {
      alignments.push('left');
    }
  }
  return alignments;
}

/**
 * CommonMark / GFM code fence parser:
 * - A code fence line has up to 3 spaces of indentation followed by at least three backticks (`) or tildes (~).
 * - For an opening fence, an optional info string may follow.
 * - For a closing fence:
 *   1. Must use the exact same fence character (` or ~).
 *   2. Must have a length >= the opening fence length.
 *   3. Cannot contain any characters other than whitespace after the fence characters.
 */
function parseCodeFence(line: string): { char: '`' | '~'; length: number; isClosingCandidate: boolean } | null {
  const match = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
  if (!match) return null;
  const fenceStr = match[1];
  const char = fenceStr[0] as '`' | '~';
  const length = fenceStr.length;
  const rest = match[2].trim();
  const isClosingCandidate = rest.length === 0;
  return { char, length, isClosingCandidate };
}

/**
 * Parses markdown text into segments of regular markdown and GFM tables.
 * Lines inside code blocks (``` or ~~~) are protected and never parsed as tables.
 */
function parseMarkdownSegments(text: string): MarkdownContentSegment[] {
  if (!text) return [];

  const lines = text.split(/\r?\n/);
  const segments: MarkdownContentSegment[] = [];
  let currentMarkdownLines: string[] = [];
  let inCodeBlock = false;
  let codeFenceChar: '`' | '~' | null = null;
  let codeFenceLength = 0;

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const fence = parseCodeFence(line);

    // Track code fence boundaries
    if (!inCodeBlock) {
      if (fence) {
        inCodeBlock = true;
        codeFenceChar = fence.char;
        codeFenceLength = fence.length;
        currentMarkdownLines.push(line);
        i++;
        continue;
      }
    } else {
      // Inside code block: can only be closed if same char, length >= codeFenceLength,
      // and no non-whitespace characters follow
      if (
        fence &&
        fence.char === codeFenceChar &&
        fence.length >= codeFenceLength &&
        fence.isClosingCandidate
      ) {
        inCodeBlock = false;
        codeFenceChar = null;
        codeFenceLength = 0;
        currentMarkdownLines.push(line);
        i++;
        continue;
      }

      currentMarkdownLines.push(line);
      i++;
      continue;
    }

    // Check if line could be start of a table
    // A table requires a header line followed immediately by a valid delimiter line
    if (line.includes('|') && i + 1 < lines.length) {
      const delimiterAlignments = parseDelimiterRow(lines[i + 1]);
      if (delimiterAlignments) {
        const headerCells = splitPipes(line);
        if (headerCells.length > 0) {
          // Flush existing markdown lines
          if (currentMarkdownLines.length > 0) {
            segments.push({
              type: 'markdown',
              content: currentMarkdownLines.join('\n'),
            });
            currentMarkdownLines = [];
          }

          const colCount = Math.max(headerCells.length, delimiterAlignments.length);
          while (headerCells.length < colCount) headerCells.push('');
          while (delimiterAlignments.length < colCount) delimiterAlignments.push('left');

          // Collect table rows
          const rows: string[][] = [];
          i += 2; // skip header and delimiter

          while (i < lines.length) {
            const rowLine = lines[i];
            const trimmedRow = rowLine.trim();
            // End of table on blank line or line without pipe
            if (!trimmedRow || !rowLine.includes('|')) {
              break;
            }
            const rowCells = splitPipes(rowLine);
            while (rowCells.length < colCount) rowCells.push('');
            rows.push(rowCells.slice(0, colCount));
            i++;
          }

          segments.push({
            type: 'table',
            content: '',
            table: {
              headers: headerCells.slice(0, colCount),
              alignments: delimiterAlignments.slice(0, colCount),
              rows,
            },
          });
          continue;
        }
      }
    }

    currentMarkdownLines.push(line);
    i++;
  }

  if (currentMarkdownLines.length > 0) {
    segments.push({
      type: 'markdown',
      content: currentMarkdownLines.join('\n'),
    });
  }

  return segments;
}

interface MarkdownContentProps {
  content: string;
  className?: string;
}

export default function MarkdownContent({ content, className = '' }: MarkdownContentProps) {
  const segments = React.useMemo(() => parseMarkdownSegments(content), [content]);

  return (
    <div className={`space-y-2 leading-relaxed text-[#1e293b] dark:text-slate-200 ${className}`}>
      {segments.map((segment, index) => {
        if (segment.type === 'table' && segment.table) {
          const { headers, alignments, rows } = segment.table;
          return (
            <div
              key={index}
              data-testid="chat-table-wrapper"
              tabIndex={0}
              role="region"
              aria-label="Bảng dữ liệu"
              className="w-full my-3 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 shadow-2xs min-w-0 focus:outline-none focus:ring-1 focus:ring-[#1f5ca9]"
            >
              <table
                data-testid="chat-table"
                className="min-w-full text-xs text-left divide-y divide-slate-200 dark:divide-slate-700 border-collapse"
              >
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold">
                  <tr>
                    {headers.map((h, hIdx) => {
                      const align = alignments[hIdx] || 'left';
                      const alignClass =
                        align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left';
                      return (
                        <th
                          key={hIdx}
                          scope="col"
                          className={`px-3.5 py-2.5 text-xs font-semibold whitespace-nowrap ${alignClass}`}
                        >
                          <ReactMarkdown
                            components={{
                              p: ({ children }) => <span className="inline">{children}</span>,
                              a: ({ href, children }) => (
                                <a
                                  href={href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[#1f5ca9] dark:text-sky-400 underline hover:text-[#184a88]"
                                >
                                  {children}
                                </a>
                              ),
                              code: ({ children }) => (
                                <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[11px]">
                                  {children}
                                </code>
                              ),
                            }}
                          >
                            {h}
                          </ReactMarkdown>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-transparent">
                  {rows.map((row, rIdx) => (
                    <tr
                      key={rIdx}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {row.map((cell, cIdx) => {
                        const align = alignments[cIdx] || 'left';
                        const alignClass =
                          align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left';
                        return (
                          <td
                            key={cIdx}
                            className={`px-3.5 py-2 text-xs text-slate-800 dark:text-slate-200 ${alignClass} [overflow-wrap:anywhere] break-words`}
                          >
                            <ReactMarkdown
                              components={{
                                p: ({ children }) => <span className="inline">{children}</span>,
                                a: ({ href, children }) => (
                                  <a
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[#1f5ca9] dark:text-sky-400 underline hover:text-[#184a88]"
                                  >
                                    {children}
                                  </a>
                                ),
                                code: ({ children }) => (
                                  <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[11px]">
                                    {children}
                                  </code>
                                ),
                              }}
                            >
                              {cell}
                            </ReactMarkdown>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        return (
          <div
            key={index}
            className="space-y-2 [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1 [&_h1]:font-bold [&_h2]:font-bold [&_h3]:font-bold [&_a]:text-[#1f5ca9] dark:[&_a]:text-sky-400 [&_a]:underline [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-slate-50 dark:[&_pre]:bg-slate-900 [&_pre]:p-3 [&_code]:break-words"
          >
            <ReactMarkdown
              components={{
                a: ({ href, children }) => (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#1f5ca9] dark:text-sky-400 underline hover:text-[#184a88]"
                  >
                    {children}
                  </a>
                ),
              }}
            >
              {segment.content}
            </ReactMarkdown>
          </div>
        );
      })}
    </div>
  );
}
