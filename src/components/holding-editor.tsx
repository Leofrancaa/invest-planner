import { categories, money, type Holding } from "@/lib/portfolio";

type Props = {
  holding: Holding;
  savedValue: number;
  total: number;
  suggestion: number | null;
  canRemove: boolean;
  onChange: (patch: Partial<Holding>) => void;
  onRemove: () => void;
};

export function HoldingEditor({
  holding: h,
  savedValue,
  total,
  suggestion,
  canRemove,
  onChange,
  onRemove,
}: Props) {
  const current = Number.isFinite(h.value) ? h.value : 0;
  const difference = current - savedValue;
  const share = total ? (current / total) * 100 : 0;
  return (
    <article className="holding-card" aria-label={`Position ${h.id}`}>
      <div className="holding-heading">
        <div>
          <span className="eyebrow">{h.category}</span>
          <h3>{h.ticker || h.name || "New asset"}</h3>
        </div>
        <button
          className="text-button danger"
          disabled={!canRemove}
          onClick={onRemove}
        >
          Remove
        </button>
      </div>
      <div className="holding-fields">
        <label className="field">
          Investment name
          <input
            aria-label={`Name ${h.id}`}
            value={h.name}
            maxLength={100}
            onChange={(e) => onChange({ name: e.target.value })}
          />
        </label>
        <label className="field">
          Ticker (optional)
          <input
            aria-label={`Ticker ${h.id}`}
            value={h.ticker}
            placeholder="e.g. ITUB4"
            maxLength={12}
            onChange={(e) => onChange({ ticker: e.target.value.toUpperCase() })}
          />
        </label>
        <label className="field">
          Asset class
          <select
            aria-label={`Category ${h.id}`}
            value={h.category}
            onChange={(e) =>
              onChange({ category: e.target.value as Holding["category"] })
            }
          >
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="field">
          Current balance (BRL)
          <input
            aria-label={`Balance ${h.id}`}
            type="number"
            min="0"
            max="1000000000000"
            step="0.01"
            value={Number.isFinite(h.value) ? h.value : ""}
            onChange={(e) =>
              onChange({
                value: e.target.value === "" ? NaN : Number(e.target.value),
              })
            }
          />
          <small>Last saved: {money(savedValue)}</small>
        </label>
        <label className="field">
          Target weight (%)
          <input
            aria-label={`Target ${h.id}`}
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={Number.isFinite(h.target) ? h.target : ""}
            onChange={(e) =>
              onChange({
                target: e.target.value === "" ? NaN : Number(e.target.value),
              })
            }
          />
        </label>
      </div>
      <dl className="holding-metrics">
        <div>
          <dt>Change since last save</dt>
          <dd>
            {difference > 0 ? "+" : ""}
            {money(difference)}
          </dd>
        </div>
        <div>
          <dt>Current share</dt>
          <dd>{share.toFixed(1)}%</dd>
        </div>
        <div>
          <dt>Next contribution</dt>
          <dd className="allocation-value">
            {suggestion === null ? "Check targets" : money(suggestion)}
          </dd>
        </div>
      </dl>
    </article>
  );
}
