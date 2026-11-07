// Guess course details from pasted text so the form can start with sensible defaults (pure).
export type CourseGuess = { code?: string; title?: string; term?: string };

const TERM_RE = /\b(fall|winter|spring|summer)\s+(20\d{2})\b/i;
const CODE_RE = /\b([A-Z]{2,5})\s?-?(\d{3}[A-Z]?)\b/;

export function guessCourse(text: string): CourseGuess {
  const head = text.slice(0, 3000);
  const out: CourseGuess = {};
  const code = head.match(CODE_RE);
  if (code) {
    out.code = `${code[1]} ${code[2]}`;
    // Title: the rest of the same line after the code, if it looks like words.
    const line = head.split('\n').find((l) => l.includes(code[0]));
    const after = line?.split(code[0])[1]?.replace(/^[\s:\-–—|,]+/, '').trim();
    if (after && /[A-Za-z]{3}/.test(after) && after.length <= 80) out.title = after;
  }
  const term = head.match(TERM_RE);
  if (term) out.term = `${term[1][0].toUpperCase()}${term[1].slice(1).toLowerCase()} ${term[2]}`;
  return out;
}

/** Course year (1-4) from the first digit of the course number, e.g. "CSCI 201" -> 2. */
export function guessYear(code: string): 1 | 2 | 3 | 4 | undefined {
  const digit = code.match(/(\d)\d{2}/)?.[1];
  const n = digit ? Number(digit) : NaN;
  return n >= 1 && n <= 4 ? (n as 1 | 2 | 3 | 4) : undefined;
}
