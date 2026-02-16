const MIN_CHAR = 33; // '!' (Menor caractere printável)
const MAX_CHAR = 126; // '~' (Maior caractere printável)

export function rankInitial(): string {
  return String.fromCharCode(MIN_CHAR + Math.floor((MAX_CHAR - MIN_CHAR) / 2));
}

export function rankBetween(before: string | null, after: string | null): string {
  const p = before || String.fromCharCode(MIN_CHAR);
  const n = after || String.fromCharCode(MAX_CHAR + 1);

  if (p >= n) {
    throw new Error('before rank must be strictly less than after rank');
  }

  let rank = '';
  let i = 0;

  while (true) {
    const pChar = i < p.length ? p.charCodeAt(i) : MIN_CHAR;
    const nChar = i < n.length ? n.charCodeAt(i) : MAX_CHAR + 1;

    if (pChar === nChar) {
      rank += String.fromCharCode(pChar);
      i++;
      continue;
    }

    const mid = Math.floor((pChar + nChar) / 2);

    if (mid === pChar) {
      rank += String.fromCharCode(pChar);
      i++;
    } else {
      rank += String.fromCharCode(mid);
      break;
    }
  }

  return rank;
}
