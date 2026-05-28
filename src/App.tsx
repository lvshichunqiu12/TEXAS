import {
  Bot,
  ChevronDown,
  CircleDollarSign,
  Gauge,
  History,
  Play,
  RotateCcw,
  Settings,
  Sparkles,
  Users
} from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { displayRank, isRed, suitSymbols } from "./game/cards";
import { requestAiAction } from "./game/aiClient";
import {
  createGame,
  getLegalActions,
  performAction,
  setAiThinking,
  startNextHand,
  streetLabel,
  totalPot
} from "./game/engine";
import type { Difficulty, GameState, LegalAction, PlayerAction, PlayerState } from "./game/types";

const asset = (name: string) => `/assets/generated/ui/${name}`;
const difficulties: Difficulty[] = ["新手", "常规", "高手"];
const countOptions = [3, 4, 5, 6, 7, 8];

function avatarStyle(index: number) {
  const col = index % 4;
  const row = Math.floor(index / 4);

  return {
    backgroundImage: `url(${asset("ai-avatars-sheet.png")})`,
    backgroundSize: "400% 200%",
    backgroundPosition: `${(col / 3) * 100}% ${row * 100}%`
  };
}

function cardBackStyle(index: number) {
  const col = index % 3;
  const row = Math.floor(index / 3);

  return {
    backgroundImage: `url(${asset("card-backs-sheet.png")})`,
    backgroundSize: "300% 200%",
    backgroundPosition: `${(col / 2) * 100}% ${row * 100}%`
  };
}

function App() {
  const [game, setGame] = useState<GameState>(() => createGame());
  const [betAmount, setBetAmount] = useState(10);
  const current = game.currentPlayerIndex === null ? undefined : game.players[game.currentPlayerIndex];
  const human = game.players[0];
  const opponents = game.players.slice(1);
  const legalActions = useMemo(() => getLegalActions(game), [game]);
  const wagerAction = legalActions.find((action) => action.type === "bet" || action.type === "raise");
  const canAct = game.status === "playing" && current?.isHuman;

  useEffect(() => {
    if (!wagerAction) return;
    setBetAmount(wagerAction.min ?? 0);
  }, [wagerAction?.min, wagerAction?.max, game.handId, game.street]);

  useEffect(() => {
    if (game.status !== "playing" || !current || current.isHuman) return;
    if (game.aiThinkingPlayerId === current.id) return;

    const playerId = current.id;
    setGame((state) => setAiThinking(state, playerId));

    window.setTimeout(() => {
      requestAiAction(game).then((action) => {
        setGame((state) => {
          const active = state.currentPlayerIndex === null ? undefined : state.players[state.currentPlayerIndex];
          if (state.status !== "playing" || active?.id !== playerId) return state;
          return performAction(state, action);
        });
      });
    }, 450);
  }, [current?.id, current?.isHuman, game.status, game.aiThinkingPlayerId]);

  function updateSettings(next: Partial<{ playerCount: number; difficulty: Difficulty }>) {
    setGame((state) =>
      createGame({
        ...state.settings,
        ...next
      })
    );
  }

  function act(action: PlayerAction) {
    if (!canAct) return;
    setGame((state) => performAction(state, action));
  }

  return (
    <main className="app-shell">
      <section className="hud">
        <div className="brand-block">
          <div className="brand-mark">
            <Sparkles size={18} />
          </div>
          <div>
            <h1>AI 德州扑克训练桌</h1>
            <p>DeepSeek bot · No-limit Hold'em · 单机练习</p>
          </div>
        </div>

        <div className="toolbar">
          <SelectControl
            icon={<Users size={17} />}
            label="人数"
            value={String(game.settings.playerCount)}
            options={countOptions.map(String)}
            onSelect={(value) => updateSettings({ playerCount: Number(value) })}
          />
          <SelectControl
            icon={<Gauge size={17} />}
            label="难度"
            value={game.settings.difficulty}
            options={difficulties}
            onSelect={(value) => updateSettings({ difficulty: value as Difficulty })}
          />
          <div className="readout-control">
            <span>
              <CircleDollarSign size={17} />
              阶段
            </span>
            <strong>{streetLabel(game.street)}</strong>
          </div>
          <button className="icon-button" aria-label="设置">
            <Settings size={19} />
          </button>
        </div>
      </section>

      <section className="table-stage" aria-label="德州扑克桌">
        <img className="table-bg" src={asset("poker-table-bg.png")} alt="" />
        <div className="table-vignette" />

        <div className={`seat-layer seats-${game.settings.playerCount}`}>
          {opponents.map((player, index) => (
            <Seat
              key={player.id}
              player={player}
              active={current?.id === player.id}
              thinking={game.aiThinkingPlayerId === player.id}
              avatarIndex={player.avatarIndex}
              seatIndex={index}
              opponentCount={opponents.length}
              reveal={game.status === "handComplete" && !player.folded}
            />
          ))}
        </div>

        <div className="board-area">
          <div className="pot-panel">
            <span>底池</span>
            <strong>{totalPot(game)}</strong>
          </div>
          <div className="community-cards" aria-label="公共牌">
            {Array.from({ length: 5 }, (_, index) =>
              game.community[index] ? <PlayingCard key={index} card={game.community[index]} /> : <CardBack key={index} index={index} />
            )}
          </div>
          <div className="street-chip">{game.status === "handComplete" ? "结算" : streetLabel(game.street)}</div>
        </div>

        <aside className="hand-log" aria-label="行动记录">
          <div className="panel-title">
            <History size={15} />
            本手行动
          </div>
          {game.logs.slice(0, 6).map((log, index) => (
            <p key={`${game.handId}-${index}`}>{log}</p>
          ))}
        </aside>

        {game.result && (
          <aside className="result-panel" aria-label="牌局结果">
            <strong>{game.result.summary}</strong>
            {game.result.pots.map((pot, index) => (
              <p key={index}>
                池 {pot.amount} · {pot.handName}
              </p>
            ))}
          </aside>
        )}

        <div className="hero-console">
          <div className="hero-seat">
            <div className={`hero-avatar ${current?.id === human.id ? "active-hero" : ""}`} style={avatarStyle(human.avatarIndex)}>
              <span>YOU</span>
            </div>
            <div>
              <div className="hero-name">{human.name}</div>
              <div className="hero-stack">{human.stack.toLocaleString()} 筹码</div>
              {human.bet > 0 && <div className="hero-bet">本轮 {human.bet}</div>}
            </div>
          </div>

          <div className="hole-cards">
            {human.holeCards.map((card, index) => (
              <PlayingCard key={index} card={card} />
            ))}
          </div>

          <ActionPad legalActions={legalActions} disabled={!canAct} betAmount={betAmount} onAction={act} />
        </div>

        <div className="bet-rail">
          <button className="mini-button" onClick={() => setGame((state) => createGame(state.settings))}>
            <RotateCcw size={15} />
            重开
          </button>
          <div className="slider-block">
            <span>下注额</span>
            <input
              type="range"
              min={wagerAction?.min ?? 0}
              max={wagerAction?.max ?? 0}
              value={Math.min(betAmount, wagerAction?.max ?? betAmount)}
              disabled={!canAct || !wagerAction}
              aria-label="下注额"
              onChange={(event) => setBetAmount(Number(event.target.value))}
            />
            <strong>{wagerAction ? Math.min(betAmount, wagerAction.max ?? betAmount) : 0}</strong>
          </div>
          <button className="mini-button primary" onClick={() => setGame(startNextHand)} disabled={game.status !== "handComplete"}>
            <Play size={15} />
            下一手
          </button>
        </div>
      </section>
    </main>
  );
}

function ActionPad({
  legalActions,
  disabled,
  betAmount,
  onAction
}: {
  legalActions: LegalAction[];
  disabled: boolean;
  betAmount: number;
  onAction: (action: PlayerAction) => void;
}) {
  const has = (type: LegalAction["type"]) => legalActions.find((action) => action.type === type);
  const call = has("call");
  const check = has("check");
  const wager = has("bet") ?? has("raise");
  const allIn = has("all_in");

  return (
    <div className="action-pad">
      <button className="action ghost" disabled={disabled || !has("fold")} onClick={() => onAction({ type: "fold" })}>
        弃牌
      </button>
      <button
        className="action"
        disabled={disabled || (!check && !call)}
        onClick={() => onAction(check ? { type: "check" } : { type: "call" })}
      >
        {check?.label ?? call?.label ?? "跟注"}
      </button>
      <button
        className="action primary"
        disabled={disabled || !wager}
        onClick={() => onAction({ type: wager?.type ?? "bet", amount: betAmount })}
      >
        {wager?.label ?? "下注"}
      </button>
      <button className="action all-in" disabled={disabled || !allIn} onClick={() => onAction({ type: "all_in" })}>
        全下
      </button>
    </div>
  );
}

function SelectControl({
  icon,
  label,
  value,
  options,
  onSelect
}: {
  icon: ReactNode;
  label: string;
  value: string;
  options: string[];
  onSelect: (value: string) => void;
}) {
  return (
    <label className="select-control">
      <span>
        {icon}
        {label}
      </span>
      <select value={value} onChange={(event) => onSelect(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <ChevronDown className="select-arrow" size={15} />
    </label>
  );
}

function Seat({
  player,
  avatarIndex,
  seatIndex,
  opponentCount,
  active,
  thinking,
  reveal
}: {
  player: PlayerState;
  avatarIndex: number;
  seatIndex: number;
  opponentCount: number;
  active: boolean;
  thinking: boolean;
  reveal: boolean;
}) {
  const statusClass = [active ? "active" : "", thinking ? "thinking" : "", player.folded ? "folded" : ""].join(" ");

  return (
    <article className={`seat ${statusClass}`} style={seatPosition(seatIndex, opponentCount)}>
      <div className="seat-avatar" style={avatarStyle(avatarIndex)}>
        {thinking && (
          <span className="thinking-dot">
            <Bot size={14} />
          </span>
        )}
      </div>
      <div className="seat-card">
        <div className="seat-line">
          <strong>{player.name}</strong>
          {player.role && <span className="role-badge">{player.role}</span>}
        </div>
        <div className="stack">{player.stack.toLocaleString()}</div>
        <div className="seat-meta">
          {player.bet > 0 && <span className="bet-pill">下注 {player.bet}</span>}
          {player.allIn && <span className="all-in-pill">All in</span>}
          {player.folded && <span className="fold-pill">已弃牌</span>}
        </div>
        <div className="mini-cards">
          {reveal
            ? player.holeCards.map((card, index) => <TinyCard key={index} card={card} />)
            : [0, 1].map((index) => <span key={index} className="tiny-back" />)}
        </div>
      </div>
    </article>
  );
}

function seatPosition(index: number, opponentCount: number) {
  const layouts: Record<number, Array<[number, number]>> = {
    2: [
      [33, 22],
      [67, 22]
    ],
    3: [
      [26, 28],
      [50, 17],
      [74, 28]
    ],
    4: [
      [22, 34],
      [42, 17],
      [62, 17],
      [82, 34]
    ],
    5: [
      [20, 47],
      [33, 20],
      [50, 15],
      [67, 20],
      [80, 47]
    ],
    6: [
      [17, 52],
      [28, 25],
      [43, 15],
      [57, 15],
      [72, 25],
      [83, 52]
    ],
    7: [
      [15, 53],
      [24, 30],
      [37, 17],
      [50, 14],
      [63, 17],
      [76, 30],
      [85, 53]
    ]
  };
  const [left, top] = layouts[opponentCount][index];

  return { left: `${left}%`, top: `${top}%` };
}

function PlayingCard({ card }: { card: PlayerState["holeCards"][number] }) {
  return (
    <div className={`playing-card ${isRed(card) ? "red" : ""}`}>
      <span>{displayRank(card.rank)}</span>
      <strong>{suitSymbols[card.suit]}</strong>
    </div>
  );
}

function TinyCard({ card }: { card: PlayerState["holeCards"][number] }) {
  return <span className={`tiny-card ${isRed(card) ? "red" : ""}`}>{`${displayRank(card.rank)}${suitSymbols[card.suit]}`}</span>;
}

function CardBack({ index }: { index: number }) {
  return <div className="card-back" style={cardBackStyle(index)} />;
}

export default App;
