export type Suit = "spades" | "hearts" | "diamonds" | "clubs";
export type Rank = "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K" | "A";

export type Card = {
  rank: Rank;
  suit: Suit;
};

export type Street = "preflop" | "flop" | "turn" | "river" | "showdown";
export type Difficulty = "新手" | "常规" | "高手";
export type PlayerRole = "D" | "SB" | "BB";

export type ActionType = "fold" | "check" | "call" | "bet" | "raise" | "all_in";

export type LegalAction = {
  type: ActionType;
  label: string;
  amount?: number;
  min?: number;
  max?: number;
};

export type PlayerState = {
  id: number;
  name: string;
  isHuman: boolean;
  avatarIndex: number;
  stack: number;
  totalBuyIn: number;
  rebuyCount: number;
  holeCards: Card[];
  folded: boolean;
  allIn: boolean;
  bet: number;
  contributed: number;
  acted: boolean;
  role?: PlayerRole;
  lastAction?: string;
};

export type HandEvaluation = {
  category: number;
  name: string;
  cards: Card[];
  tiebreakers: number[];
};

export type PotResult = {
  amount: number;
  winners: number[];
  handName: string;
  cards: Card[];
};

export type HandResult = {
  summary: string;
  pots: PotResult[];
};

export type GameSettings = {
  playerCount: number;
  difficulty: Difficulty;
  initialStack: number;
  smallBlind: number;
  bigBlind: number;
};

export type GameState = {
  handId: number;
  settings: GameSettings;
  players: PlayerState[];
  deck: Card[];
  community: Card[];
  dealerIndex: number;
  currentPlayerIndex: number | null;
  street: Street;
  currentBet: number;
  minRaise: number;
  logs: string[];
  result?: HandResult;
  status: "playing" | "handComplete";
  aiThinkingPlayerId?: number;
};

export type PlayerAction = {
  type: ActionType;
  amount?: number;
};
