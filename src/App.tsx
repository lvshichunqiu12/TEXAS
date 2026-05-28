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
import { type ReactNode, useState } from "react";

type Difficulty = "新手" | "常规" | "高手";
type Street = "翻前" | "翻牌" | "转牌" | "河牌";

type Player = {
  id: number;
  name: string;
  stack: number;
  bet: number;
  role?: "D" | "SB" | "BB";
  status: "thinking" | "waiting" | "acted" | "hero";
};

const asset = (name: string) => `/assets/generated/ui/${name}`;

const names = ["你", "Mira", "Stone", "Nova", "Chen", "Ivy", "Atlas", "River"];
const roles: Array<Player["role"]> = [undefined, "SB", "BB", undefined, undefined, "D", undefined, undefined];
const streets: Street[] = ["翻前", "翻牌", "转牌", "河牌"];
const difficulties: Difficulty[] = ["新手", "常规", "高手"];
const countOptions = [3, 4, 5, 6, 7, 8];

function makePlayers(count: number): Player[] {
  return Array.from({ length: count }, (_, index) => ({
    id: index,
    name: names[index],
    stack: index === 0 ? 1180 : 860 + index * 115,
    bet: index === 1 ? 5 : index === 2 ? 10 : index === 4 ? 35 : 0,
    role: roles[index],
    status: index === 0 ? "hero" : index === 3 ? "thinking" : index === 4 ? "acted" : "waiting"
  }));
}

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
  const [playerCount, setPlayerCount] = useState(6);
  const [difficulty, setDifficulty] = useState<Difficulty>("常规");
  const [street, setStreet] = useState<Street>("翻牌");
  const players = makePlayers(playerCount);
  const human = players[0];
  const opponents = players.slice(1);

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
            value={`${playerCount} 人`}
            options={countOptions.map(String)}
            onSelect={(value) => setPlayerCount(Number(value))}
          />
          <SelectControl
            icon={<Gauge size={17} />}
            label="难度"
            value={difficulty}
            options={difficulties}
            onSelect={(value) => setDifficulty(value as Difficulty)}
          />
          <SelectControl
            icon={<CircleDollarSign size={17} />}
            label="阶段"
            value={street}
            options={streets}
            onSelect={(value) => setStreet(value as Street)}
          />
          <button className="icon-button" aria-label="设置">
            <Settings size={19} />
          </button>
        </div>
      </section>

      <section className="table-stage" aria-label="德州扑克桌">
        <img className="table-bg" src={asset("poker-table-bg.png")} alt="" />
        <div className="table-vignette" />

        <div className={`seat-layer seats-${playerCount}`}>
          {opponents.map((player, index) => (
            <Seat
              key={player.id}
              player={player}
              avatarIndex={index}
              seatIndex={index}
              opponentCount={opponents.length}
            />
          ))}
        </div>

        <div className="board-area">
          <div className="pot-panel">
            <span>主池</span>
            <strong>240</strong>
          </div>
          <div className="community-cards" aria-label="公共牌">
            <PlayingCard rank="A" suit="♠" />
            <PlayingCard rank="J" suit="♥" red />
            <PlayingCard rank="7" suit="♣" />
            <CardBack index={2} />
            <CardBack index={4} />
          </div>
          <div className="street-chip">{street}</div>
        </div>

        <aside className="hand-log" aria-label="行动记录">
          <div className="panel-title">
            <History size={15} />
            本手行动
          </div>
          <p><b>BB</b> 下注 10</p>
          <p><b>Mira</b> 跟注 10</p>
          <p><b>Stone</b> 加注到 35</p>
          <p><b>Nova</b> 思考中</p>
        </aside>

        <div className="hero-console">
          <div className="hero-seat">
            <div className="hero-avatar" style={avatarStyle(7)}>
              <span>YOU</span>
            </div>
            <div>
              <div className="hero-name">{human.name}</div>
              <div className="hero-stack">{human.stack.toLocaleString()} 筹码</div>
            </div>
          </div>

          <div className="hole-cards">
            <PlayingCard rank="K" suit="♦" red />
            <PlayingCard rank="Q" suit="♦" red />
          </div>

          <div className="action-pad">
            <button className="action ghost">弃牌</button>
            <button className="action">跟注 35</button>
            <button className="action primary">加注</button>
            <button className="action all-in">全下</button>
          </div>
        </div>

        <div className="bet-rail">
          <button className="mini-button">
            <RotateCcw size={15} />
            重开
          </button>
          <div className="slider-block">
            <span>下注额</span>
            <input type="range" min="35" max={human.stack} defaultValue="120" aria-label="下注额" />
            <strong>120</strong>
          </div>
          <button className="mini-button primary">
            <Play size={15} />
            下一手
          </button>
        </div>
      </section>
    </main>
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
      <select value={value.replace(" 人", "")} onChange={(event) => onSelect(event.target.value)}>
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
  opponentCount
}: {
  player: Player;
  avatarIndex: number;
  seatIndex: number;
  opponentCount: number;
}) {
  return (
    <article className={`seat seat-${player.id} ${player.status}`} style={seatPosition(seatIndex, opponentCount)}>
      <div className="seat-avatar" style={avatarStyle(avatarIndex)}>
        {player.status === "thinking" && (
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
        {player.bet > 0 && <div className="bet-pill">下注 {player.bet}</div>}
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

function PlayingCard({ rank, suit, red = false }: { rank: string; suit: string; red?: boolean }) {
  return (
    <div className={`playing-card ${red ? "red" : ""}`}>
      <span>{rank}</span>
      <strong>{suit}</strong>
    </div>
  );
}

function CardBack({ index }: { index: number }) {
  return <div className="card-back" style={cardBackStyle(index)} />;
}

export default App;
