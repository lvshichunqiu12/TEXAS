import { getLegalActions, totalPot } from "./engine";
import { cardLabel } from "./cards";
import type { GameState, PlayerAction } from "./types";

export async function requestAiAction(state: GameState): Promise<PlayerAction> {
  const playerIndex = state.currentPlayerIndex;
  if (playerIndex === null) return { type: "check" };

  const legalActions = getLegalActions(state, playerIndex);
  const player = state.players[playerIndex];
  const toCall = Math.max(0, state.currentBet - player.bet);
  const pot = totalPot(state);
  const fallback = conservativeFallback(legalActions, state);

  try {
    const response = await fetch("/api/ai-action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        difficulty: state.settings.difficulty,
        table: {
          handId: state.handId,
          street: state.street,
          pot,
          currentBet: state.currentBet,
          bigBlind: state.settings.bigBlind,
          community: state.community.map(cardLabel),
          activePlayers: state.players.filter((seat) => !seat.folded).length,
          playersStillAbleToAct: state.players.filter((seat) => !seat.folded && !seat.allIn && seat.stack > 0).length
        },
        player: {
          id: player.id,
          name: player.name,
          profile: player.profile ?? "均衡型",
          stack: player.stack,
          bet: player.bet,
          toCall,
          effectiveStackAfterCall: Math.max(0, player.stack - toCall),
          callPotOdds: toCall > 0 ? Number((toCall / (pot + toCall)).toFixed(3)) : 0,
          holeCards: player.holeCards.map(cardLabel)
        },
        opponents: state.players
          .filter((player) => player.id !== state.players[playerIndex].id)
          .map((player) => ({
            name: player.name,
            stack: player.stack,
            bet: player.bet,
            profile: player.profile,
            folded: player.folded,
            allIn: player.allIn,
            lastAction: player.lastAction
          })),
        legalActions,
        recentActions: state.logs.slice(0, 8)
      }),
      signal: AbortSignal.timeout(35000)
    });

    if (!response.ok) return fallback;
    const data = (await response.json()) as PlayerAction;
    return sanitizeAiAction(data, legalActions) ?? fallback;
  } catch {
    return fallback;
  }
}

function sanitizeAiAction(action: PlayerAction, legalActions: ReturnType<typeof getLegalActions>) {
  const legal = legalActions.find((item) => item.type === action.type);
  if (!legal) return undefined;

  if (legal.type === "bet" || legal.type === "raise") {
    return {
      type: legal.type,
      amount: Math.max(legal.min ?? 0, Math.min(legal.max ?? action.amount ?? 0, action.amount ?? legal.min ?? 0))
    };
  }

  return { type: legal.type, amount: legal.amount };
}

function conservativeFallback(legalActions: ReturnType<typeof getLegalActions>, state: GameState): PlayerAction {
  const check = legalActions.find((action) => action.type === "check");
  if (check) return { type: "check" };
  const player = state.currentPlayerIndex === null ? undefined : state.players[state.currentPlayerIndex];
  const call = legalActions.find((action) => action.type === "call");
  const potAfterCall = totalPot(state) + (call?.amount ?? 0);
  const looseFallback = player?.profile === "娱乐型" || player?.profile === "松凶型";
  const maxFallbackCall = looseFallback ? Math.max(state.settings.bigBlind * 10, potAfterCall * 0.56) : Math.max(state.settings.bigBlind * 8, potAfterCall * 0.48);
  const affordableCall =
    call && player && (state.settings.difficulty === "高手" || looseFallback)
      ? (call.amount ?? 0) <= maxFallbackCall
      : call && (call.amount ?? 0) <= state.settings.bigBlind;
  if (call && affordableCall) return { type: "call", amount: call.amount };
  return { type: "fold" };
}
