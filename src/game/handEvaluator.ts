import { rankValues } from "./cards";
import type { Card, HandEvaluation } from "./types";

const categoryNames = [
  "高牌",
  "一对",
  "两对",
  "三条",
  "顺子",
  "同花",
  "葫芦",
  "四条",
  "同花顺"
];

export function evaluateBestHand(cards: Card[]): HandEvaluation {
  if (cards.length < 5) {
    throw new Error("At least five cards are required for hand evaluation.");
  }

  const ranked = combinations(cards, 5)
    .map(evaluateFiveCards)
    .sort(compareEvaluations);

  return ranked[ranked.length - 1];
}

export function compareEvaluations(a: HandEvaluation, b: HandEvaluation) {
  if (a.category !== b.category) {
    return a.category - b.category;
  }

  for (let index = 0; index < Math.max(a.tiebreakers.length, b.tiebreakers.length); index += 1) {
    const diff = (a.tiebreakers[index] ?? 0) - (b.tiebreakers[index] ?? 0);
    if (diff !== 0) return diff;
  }

  return 0;
}

function evaluateFiveCards(cards: Card[]): HandEvaluation {
  const values = cards.map((card) => rankValues[card.rank]).sort((a, b) => b - a);
  const flush = cards.every((card) => card.suit === cards[0].suit);
  const straightHigh = getStraightHigh(values);
  const counts = countValues(values);
  const groups = [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || b.value - a.value);

  if (flush && straightHigh) {
    return makeEvaluation(8, cards, [straightHigh]);
  }

  if (groups[0].count === 4) {
    return makeEvaluation(7, cards, [groups[0].value, groups[1].value]);
  }

  if (groups[0].count === 3 && groups[1].count === 2) {
    return makeEvaluation(6, cards, [groups[0].value, groups[1].value]);
  }

  if (flush) {
    return makeEvaluation(5, cards, values);
  }

  if (straightHigh) {
    return makeEvaluation(4, cards, [straightHigh]);
  }

  if (groups[0].count === 3) {
    const kickers = groups.filter((group) => group.count === 1).map((group) => group.value);
    return makeEvaluation(3, cards, [groups[0].value, ...kickers]);
  }

  if (groups[0].count === 2 && groups[1].count === 2) {
    const pairs = groups.filter((group) => group.count === 2).map((group) => group.value);
    const kicker = groups.find((group) => group.count === 1)!.value;
    return makeEvaluation(2, cards, [...pairs, kicker]);
  }

  if (groups[0].count === 2) {
    const kickers = groups.filter((group) => group.count === 1).map((group) => group.value);
    return makeEvaluation(1, cards, [groups[0].value, ...kickers]);
  }

  return makeEvaluation(0, cards, values);
}

function makeEvaluation(category: number, cards: Card[], tiebreakers: number[]): HandEvaluation {
  return {
    category,
    name: categoryNames[category],
    cards: sortCards(cards),
    tiebreakers
  };
}

function countValues(values: number[]) {
  const counts = new Map<number, number>();

  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return counts;
}

function getStraightHigh(values: number[]) {
  const unique = [...new Set(values)].sort((a, b) => b - a);
  if (unique.includes(14)) unique.push(1);

  for (let index = 0; index <= unique.length - 5; index += 1) {
    const window = unique.slice(index, index + 5);
    if (window[0] - window[4] === 4) {
      return window[0] === 14 && window[4] === 10 ? 14 : window[0];
    }
  }

  return 0;
}

function sortCards(cards: Card[]) {
  return [...cards].sort((a, b) => rankValues[b.rank] - rankValues[a.rank]);
}

function combinations<T>(items: T[], size: number): T[][] {
  if (size === 0) return [[]];
  if (items.length < size) return [];
  const [first, ...rest] = items;
  return [...combinations(rest, size - 1).map((combo) => [first, ...combo]), ...combinations(rest, size)];
}
