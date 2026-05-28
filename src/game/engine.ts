import { cardLabel, makeDeck, shuffle } from "./cards";
import { compareEvaluations, evaluateBestHand } from "./handEvaluator";
import type {
  ActionType,
  GameSettings,
  GameState,
  HandResult,
  LegalAction,
  PlayerAction,
  PlayerState,
  PotResult,
  Street
} from "./types";

const names = ["你", "Mira", "Stone", "Nova", "Chen", "Ivy", "Atlas", "River"];
const streetNames: Record<Street, string> = {
  preflop: "翻前",
  flop: "翻牌",
  turn: "转牌",
  river: "河牌",
  showdown: "摊牌"
};

export function createGame(settings: Partial<GameSettings> = {}): GameState {
  const fullSettings: GameSettings = {
    playerCount: settings.playerCount ?? 6,
    difficulty: settings.difficulty ?? "常规",
    initialStack: settings.initialStack ?? 1000,
    smallBlind: settings.smallBlind ?? 5,
    bigBlind: settings.bigBlind ?? 10
  };

  return startHand(fullSettings, 0, 1);
}

export function startNextHand(state: GameState): GameState {
  return startHand(state.settings, state.handId + 1, nextSeat(state.dealerIndex, state.players.length), state.players);
}

export function resetGame(settings: Partial<GameSettings> = {}) {
  return createGame(settings);
}

export function getLegalActions(state: GameState, playerIndex = state.currentPlayerIndex): LegalAction[] {
  if (state.status !== "playing" || playerIndex === null) return [];
  const player = state.players[playerIndex];
  if (!player || player.folded || player.allIn || player.stack <= 0) return [];

  const toCall = Math.max(0, state.currentBet - player.bet);
  const actions: LegalAction[] = [];

  if (toCall > 0) {
    actions.push({ type: "fold", label: "弃牌" });
    actions.push({ type: "call", label: `跟注 ${Math.min(toCall, player.stack)}`, amount: Math.min(toCall, player.stack) });
  } else {
    actions.push({ type: "check", label: "过牌" });
  }

  if (player.stack > toCall) {
    if (state.currentBet === 0) {
      actions.push({
        type: "bet",
        label: "下注",
        min: Math.min(state.settings.bigBlind, player.stack),
        max: player.stack
      });
    } else {
      const minTotal = Math.min(state.currentBet + state.minRaise, player.bet + player.stack);
      actions.push({
        type: "raise",
        label: "加注",
        min: Math.max(minTotal - player.bet, toCall),
        max: player.stack
      });
    }
  }

  actions.push({ type: "all_in", label: "全下", amount: player.stack });
  return actions;
}

export function performAction(state: GameState, action: PlayerAction): GameState {
  if (state.status !== "playing" || state.currentPlayerIndex === null) return state;

  const legalActions = getLegalActions(state);
  const normalized = normalizeAction(action, legalActions);
  const players = state.players.map((player) => ({ ...player }));
  const player = players[state.currentPlayerIndex];
  const logs = [...state.logs];
  let currentBet = state.currentBet;
  let minRaise = state.minRaise;

  if (normalized.type === "fold") {
    player.folded = true;
    player.acted = true;
    player.lastAction = "弃牌";
    logs.unshift(`${player.name} 弃牌`);
  }

  if (normalized.type === "check") {
    player.acted = true;
    player.lastAction = "过牌";
    logs.unshift(`${player.name} 过牌`);
  }

  if (normalized.type === "call") {
    const amount = Math.min(currentBet - player.bet, player.stack);
    commitChips(player, amount);
    player.acted = true;
    player.lastAction = `跟注 ${amount}`;
    logs.unshift(`${player.name} 跟注 ${amount}`);
  }

  if (normalized.type === "bet" || normalized.type === "raise") {
    const before = currentBet;
    const amount = Math.min(normalized.amount ?? 0, player.stack);
    commitChips(player, amount);
    currentBet = player.bet;
    minRaise = Math.max(currentBet - before, state.settings.bigBlind);
    resetOtherActors(players, player.id);
    player.acted = true;
    player.lastAction = normalized.type === "bet" ? `下注 ${amount}` : `加注到 ${player.bet}`;
    logs.unshift(`${player.name} ${player.lastAction}`);
  }

  if (normalized.type === "all_in") {
    const before = currentBet;
    const amount = player.stack;
    commitChips(player, amount);
    player.acted = true;
    player.lastAction = `全下 ${amount}`;

    if (player.bet > currentBet) {
      currentBet = player.bet;
      if (currentBet - before >= minRaise) {
        minRaise = currentBet - before;
        resetOtherActors(players, player.id);
      }
    }

    logs.unshift(`${player.name} 全下 ${amount}`);
  }

  const nextState: GameState = {
    ...state,
    players,
    logs: logs.slice(0, 12),
    currentBet,
    minRaise,
    aiThinkingPlayerId: undefined
  };

  return settleIfNeeded(advanceTurn(nextState));
}

export function setAiThinking(state: GameState, playerId?: number): GameState {
  return { ...state, aiThinkingPlayerId: playerId };
}

export function streetLabel(street: Street) {
  return streetNames[street];
}

export function totalPot(state: GameState) {
  return state.players.reduce((sum, player) => sum + player.contributed, 0);
}

export function currentPlayer(state: GameState) {
  return state.currentPlayerIndex === null ? undefined : state.players[state.currentPlayerIndex];
}

function startHand(settings: GameSettings, handId: number, dealerIndex: number, previousPlayers: PlayerState[] = []): GameState {
  const playerCount = settings.playerCount;
  const deck = shuffle(makeDeck());
  const players: PlayerState[] = Array.from({ length: playerCount }, (_, index) => ({
    id: index,
    name: names[index],
    isHuman: index === 0,
    avatarIndex: index === 0 ? 7 : index - 1,
    stack: previousPlayers[index] && previousPlayers[index].stack > 0 ? previousPlayers[index].stack : settings.initialStack,
    holeCards: [],
    folded: false,
    allIn: false,
    bet: 0,
    contributed: 0,
    acted: false
  }));

  for (let cardIndex = 0; cardIndex < 2; cardIndex += 1) {
    for (const player of players) {
      player.holeCards.push(deck.pop()!);
    }
  }

  const smallBlindIndex = nextSeat(dealerIndex, playerCount);
  const bigBlindIndex = nextSeat(smallBlindIndex, playerCount);
  players[dealerIndex].role = "D";
  players[smallBlindIndex].role = "SB";
  players[bigBlindIndex].role = "BB";
  commitChips(players[smallBlindIndex], Math.min(settings.smallBlind, players[smallBlindIndex].stack));
  commitChips(players[bigBlindIndex], Math.min(settings.bigBlind, players[bigBlindIndex].stack));

  return {
    handId,
    settings,
    players,
    deck,
    community: [],
    dealerIndex,
    currentPlayerIndex: nextActionSeat(bigBlindIndex, players),
    street: "preflop",
    currentBet: players[bigBlindIndex].bet,
    minRaise: settings.bigBlind,
    logs: [
      `第 ${handId + 1} 手开始`,
      ...players
        .filter((player, index) => (previousPlayers[index]?.stack ?? settings.initialStack) <= 0)
        .map((player) => `${player.name} 自动补买入 ${settings.initialStack}`),
      `${players[smallBlindIndex].name} 小盲 ${players[smallBlindIndex].bet}`,
      `${players[bigBlindIndex].name} 大盲 ${players[bigBlindIndex].bet}`
    ],
    status: "playing"
  };
}

function advanceTurn(state: GameState): GameState {
  if (activeContenders(state.players).length <= 1) {
    return awardUncontested(state);
  }

  if (bettingRoundComplete(state)) {
    return advanceStreet(state);
  }

  return {
    ...state,
    currentPlayerIndex: nextActionSeat(state.currentPlayerIndex!, state.players)
  };
}

function advanceStreet(state: GameState): GameState {
  const players = state.players.map((player) => ({ ...player, bet: 0, acted: false }));
  let deck = [...state.deck];
  let community = [...state.community];
  let street: Street = state.street;

  if (players.filter((player) => !player.folded && !player.allIn).length <= 1) {
    while (community.length < 5) {
      community.push(deck.pop()!);
    }
    return finishShowdown({ ...state, players, deck, community, street: "showdown", currentPlayerIndex: null });
  }

  if (state.street === "preflop") {
    community = [deck.pop()!, deck.pop()!, deck.pop()!];
    street = "flop";
  } else if (state.street === "flop") {
    community.push(deck.pop()!);
    street = "turn";
  } else if (state.street === "turn") {
    community.push(deck.pop()!);
    street = "river";
  } else if (state.street === "river") {
    return finishShowdown({ ...state, players, deck, community, street: "showdown", currentPlayerIndex: null });
  }

  const nextState = {
    ...state,
    players,
    deck,
    community,
    street,
    currentBet: 0,
    minRaise: state.settings.bigBlind,
    currentPlayerIndex: nextActionSeat(state.dealerIndex, players),
    logs: [`进入${streetNames[street]}`, ...state.logs].slice(0, 12)
  };

  return settleIfNeeded(nextState);
}

function finishShowdown(state: GameState): GameState {
  const result = buildHandResult(state);
  const players = state.players.map((player) => ({ ...player }));

  for (const pot of result.pots) {
    const share = Math.floor(pot.amount / pot.winners.length);
    let remainder = pot.amount - share * pot.winners.length;

    for (const winnerId of pot.winners) {
      const winner = players.find((player) => player.id === winnerId)!;
      winner.stack += share + (remainder > 0 ? 1 : 0);
      remainder -= 1;
    }
  }

  return {
    ...state,
    players,
    result,
    status: "handComplete",
    currentPlayerIndex: null,
    logs: [result.summary, ...state.logs].slice(0, 12)
  };
}

function awardUncontested(state: GameState): GameState {
  const winner = activeContenders(state.players)[0];
  const pot = totalPot(state);
  const players = state.players.map((player) => ({ ...player }));
  players[winner.id].stack += pot;
  const result: HandResult = {
    summary: `${winner.name} 赢得底池 ${pot}`,
    pots: [{ amount: pot, winners: [winner.id], handName: "未摊牌", cards: [] }]
  };

  return {
    ...state,
    players,
    result,
    status: "handComplete",
    currentPlayerIndex: null,
    logs: [result.summary, ...state.logs].slice(0, 12)
  };
}

function settleIfNeeded(state: GameState): GameState {
  if (state.status !== "playing") return state;
  if (activeContenders(state.players).length <= 1) return awardUncontested(state);
  if (state.currentPlayerIndex === null || state.players.filter((player) => !player.folded && !player.allIn).length === 0) {
    return finishShowdown(state);
  }
  return state;
}

function buildHandResult(state: GameState): HandResult {
  const pots = buildPots(state);
  const evaluations = new Map(
    state.players
      .filter((player) => !player.folded)
      .map((player) => [player.id, evaluateBestHand([...player.holeCards, ...state.community])])
  );

  const potResults: PotResult[] = pots.map((pot) => {
    const ranked = pot.eligible
      .map((playerId) => ({ playerId, evaluation: evaluations.get(playerId)! }))
      .sort((a, b) => compareEvaluations(b.evaluation, a.evaluation));
    const best = ranked[0].evaluation;
    const winners = ranked
      .filter((entry) => compareEvaluations(entry.evaluation, best) === 0)
      .map((entry) => entry.playerId);

    return {
      amount: pot.amount,
      winners,
      handName: best.name,
      cards: best.cards
    };
  });
  const firstWinner = state.players.find((player) => player.id === potResults[0].winners[0])!;
  const firstWinnerTotal = potResults
    .filter((pot) => pot.winners.includes(firstWinner.id))
    .reduce((sum, pot) => sum + Math.floor(pot.amount / pot.winners.length), 0);

  return {
    summary: `${firstWinner.name} 以${potResults[0].handName}赢得 ${firstWinnerTotal}`,
    pots: potResults
  };
}

function buildPots(state: GameState) {
  const contributions = [...new Set(state.players.map((player) => player.contributed).filter((amount) => amount > 0))].sort(
    (a, b) => a - b
  );
  let previous = 0;

  return contributions
    .map((level) => {
      const participants = state.players.filter((player) => player.contributed >= level);
      const amount = (level - previous) * participants.length;
      previous = level;

      return {
        amount,
        eligible: participants.filter((player) => !player.folded).map((player) => player.id)
      };
    })
    .filter((pot) => pot.amount > 0 && pot.eligible.length > 0);
}

function bettingRoundComplete(state: GameState) {
  const pending = state.players.filter((player) => !player.folded && !player.allIn);
  if (pending.length === 0) return true;

  return pending.every((player) => player.acted && player.bet === state.currentBet);
}

function normalizeAction(action: PlayerAction, legalActions: LegalAction[]): PlayerAction {
  const legal = legalActions.find((item) => item.type === action.type);
  if (!legal) {
    const fallback = legalActions.find((item) => item.type === "check") ?? legalActions.find((item) => item.type === "fold");
    return { type: fallback?.type ?? "fold", amount: fallback?.amount };
  }

  if (legal.type === "bet" || legal.type === "raise") {
    return {
      type: legal.type,
      amount: clamp(action.amount ?? legal.min ?? 0, legal.min ?? 0, legal.max ?? action.amount ?? 0)
    };
  }

  return { type: legal.type, amount: legal.amount };
}

function commitChips(player: PlayerState, amount: number) {
  const committed = Math.max(0, Math.min(amount, player.stack));
  player.stack -= committed;
  player.bet += committed;
  player.contributed += committed;
  if (player.stack === 0) player.allIn = true;
}

function resetOtherActors(players: PlayerState[], actorId: number) {
  for (const player of players) {
    if (player.id !== actorId && !player.folded && !player.allIn) {
      player.acted = false;
    }
  }
}

function nextSeat(index: number, count: number) {
  return (index + 1) % count;
}

function nextActionSeat(fromIndex: number, players: PlayerState[]) {
  let index = fromIndex;

  for (let attempt = 0; attempt < players.length; attempt += 1) {
    index = nextSeat(index, players.length);
    const player = players[index];
    if (!player.folded && !player.allIn && player.stack > 0) return index;
  }

  return null;
}

function activeContenders(players: PlayerState[]) {
  return players.filter((player) => !player.folded);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function actionText(type: ActionType) {
  const labels: Record<ActionType, string> = {
    fold: "弃牌",
    check: "过牌",
    call: "跟注",
    bet: "下注",
    raise: "加注",
    all_in: "全下"
  };
  return labels[type];
}

export function revealCards(cards: Parameters<typeof cardLabel>[0][]) {
  return cards.map(cardLabel).join(" ");
}
