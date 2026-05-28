import { getLegalActions, totalPot } from "./engine";
import { cardLabel } from "./cards";
import type { GameState, PlayerAction } from "./types";

export async function requestAiAction(state: GameState): Promise<PlayerAction> {
  const playerIndex = state.currentPlayerIndex;
  if (playerIndex === null) return { type: "check" };

  const legalActions = getLegalActions(state, playerIndex);
  const fallback = conservativeFallback(legalActions);

  try {
    const response = await fetch("/api/ai-action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        difficulty: state.settings.difficulty,
        table: {
          handId: state.handId,
          street: state.street,
          pot: totalPot(state),
          currentBet: state.currentBet,
          bigBlind: state.settings.bigBlind,
          community: state.community.map(cardLabel)
        },
        player: {
          id: state.players[playerIndex].id,
          name: state.players[playerIndex].name,
          profile: state.players[playerIndex].profile ?? "均衡型",
          stack: state.players[playerIndex].stack,
          bet: state.players[playerIndex].bet,
          holeCards: state.players[playerIndex].holeCards.map(cardLabel)
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
      signal: AbortSignal.timeout(12000)
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

function conservativeFallback(legalActions: ReturnType<typeof getLegalActions>): PlayerAction {
  const check = legalActions.find((action) => action.type === "check");
  if (check) return { type: "check" };
  const call = legalActions.find((action) => action.type === "call" && (action.amount ?? 0) <= 10);
  if (call) return { type: "call", amount: call.amount };
  return { type: "fold" };
}
