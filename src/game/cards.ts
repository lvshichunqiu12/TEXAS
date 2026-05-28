import type { Card, Rank, Suit } from "./types";

export const suits: Suit[] = ["spades", "hearts", "diamonds", "clubs"];
export const ranks: Rank[] = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"];

export const rankValues: Record<Rank, number> = {
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  T: 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14
};

export const suitSymbols: Record<Suit, string> = {
  spades: "♠",
  hearts: "♥",
  diamonds: "♦",
  clubs: "♣"
};

export function makeDeck(): Card[] {
  return suits.flatMap((suit) => ranks.map((rank) => ({ rank, suit })));
}

export function shuffle(deck: Card[]): Card[] {
  const next = [...deck];

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }

  return next;
}

export function cardLabel(card: Card) {
  return `${displayRank(card.rank)}${suitSymbols[card.suit]}`;
}

export function isRed(card: Card) {
  return card.suit === "hearts" || card.suit === "diamonds";
}

export function displayRank(rank: Rank) {
  return rank === "T" ? "10" : rank;
}
