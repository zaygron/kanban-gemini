import { describe, it, expect } from 'vitest';
import { rankInitial, rankBetween } from '../rank';

describe('Ranking Module', () => {
  it('deve gerar um rank inicial', () => {
    const r = rankInitial();
    expect(typeof r).toBe('string');
    expect(r.length).toBeGreaterThan(0);
  });

  it('deve inserir no inicio (before=null, after=firstRank)', () => {
    const firstRank = rankInitial();
    const newRank = rankBetween(null, firstRank);
    expect(newRank < firstRank).toBe(true);
  });

  it('deve inserir no fim (before=lastRank, after=null)', () => {
    const lastRank = rankInitial();
    const newRank = rankBetween(lastRank, null);
    expect(newRank > lastRank).toBe(true);
  });

  it('deve inserir no meio e manter ordem lexicográfica', () => {
    const before = 'A';
    const after = 'C';
    const newRank = rankBetween(before, after);
    expect(newRank > before).toBe(true);
    expect(newRank < after).toBe(true);
  });

  it('deve suportar 50 insercoes consecutivas no MESMO GAP sem falhar (Teste de Estresse)', () => {
    let before = 'A';
    const after = 'B';
    const ranks: string[] = [];

    for (let i = 0; i < 50; i++) {
      const newRank = rankBetween(before, after);
      expect(newRank > before).toBe(true);
      expect(newRank < after).toBe(true);
      ranks.push(newRank);
      before = newRank; // always insert after the newly created rank (pushing limits)
    }

    // Ensure strict lexicographical order is maintained
    for (let i = 0; i < ranks.length - 1; i++) {
      expect(ranks[i] < ranks[i+1]).toBe(true);
    }
  });

  it('deve lancar erro se before >= after', () => {
    expect(() => rankBetween('C', 'A')).toThrow();
    expect(() => rankBetween('A', 'A')).toThrow();
  });
});
