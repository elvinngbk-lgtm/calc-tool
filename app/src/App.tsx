import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  formatGrouped,
  formatRM,
  formatShort,
  formatTenure,
  parseAmount,
  solve,
} from "@/lib/loan";
import type { FieldKey, LoanState } from "@/lib/loan";

/* ---------------------------------------------------------------- icons */

function LockIcon({ open }: { open: boolean }) {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect
        x="4.5"
        y="10.5"
        width="15"
        height="10"
        rx="2.4"
        stroke="currentColor"
        strokeWidth="1.9"
      />
      {open ? (
        <path
          d="M8 10.5V7.6A4 4 0 0 1 15.8 6.4"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
        />
      ) : (
        <path
          d="M8 10.5V7.6a4 4 0 1 1 8 0v2.9"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
        />
      )}
      <circle cx="12" cy="15.4" r="1.5" fill="currentColor" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M9.6 14.4 14.4 9.6"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      <path
        d="M12.9 7.5 14.7 5.7a3.6 3.6 0 0 1 5.1 5.1l-1.8 1.8M11.1 16.5 9.3 18.3a3.6 3.6 0 0 1-5.1-5.1l1.8-1.8"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* ---------------------------------------------------------------- inputs */

interface NumInputProps {
  value: number;
  format: (n: number) => string;
  parse: (s: string) => number;
  onCommit: (n: number) => void;
  prefix?: string;
  suffix?: string;
  step?: number;
  ariaLabel: string;
  inputMode?: "decimal" | "numeric";
  compact?: boolean;
}

function NumInput({
  value,
  format,
  parse,
  onCommit,
  prefix,
  suffix,
  step,
  ariaLabel,
  inputMode = "decimal",
  compact = false,
}: NumInputProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? format(value);

  const bump = (dir: number) => {
    if (!step) return;
    const next = Math.max(0, Math.round((value + dir * step) * 1e6) / 1e6);
    setDraft(null);
    onCommit(next);
  };

  return (
    <div className={`input-wrap${compact ? " compact" : ""}`}>
      {prefix ? <span className="input-prefix">{prefix}</span> : null}
      <input
        aria-label={ariaLabel}
        inputMode={inputMode}
        value={shown}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={(e) => e.currentTarget.select()}
        onBlur={() => {
          if (draft !== null) {
            const n = parse(draft);
            if (!isNaN(n)) onCommit(n);
          }
          setDraft(null);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
      />
      {suffix ? <span className="input-suffix">{suffix}</span> : null}
      {step ? (
        <span className="stepper">
          <button
            type="button"
            className="step-btn"
            aria-label={`Decrease ${ariaLabel}`}
            onClick={() => bump(-1)}
          >
            &minus;
          </button>
          <button
            type="button"
            className="step-btn"
            aria-label={`Increase ${ariaLabel}`}
            onClick={() => bump(1)}
          >
            +
          </button>
        </span>
      ) : null}
    </div>
  );
}

function Slider({
  value,
  min,
  max,
  step,
  onChange,
  ariaLabel,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (n: number) => void;
  ariaLabel: string;
}) {
  const pct = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
  return (
    <input
      type="range"
      className="slider"
      aria-label={ariaLabel}
      min={min}
      max={max}
      step={step}
      value={Math.min(max, Math.max(min, value))}
      style={{ "--pct": `${pct}%` } as React.CSSProperties}
      onChange={(e) => onChange(parseFloat(e.target.value))}
    />
  );
}

function Chips({
  options,
  active,
  onPick,
}: {
  options: { label: string; value: number }[];
  active: number;
  onPick: (n: number) => void;
}) {
  return (
    <div className="chips">
      {options.map((o) => (
        <button
          type="button"
          key={o.label}
          className={`chip${Math.abs(o.value - active) < 1e-9 ? " on" : ""}`}
          onClick={() => onPick(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- row shell */

function Row({
  fieldKey,
  label,
  note,
  locked,
  onLock,
  hasError,
  linked,
  onUnlink,
  children,
}: {
  fieldKey: FieldKey;
  label: string;
  note?: string;
  locked: boolean;
  onLock: (k: FieldKey) => void;
  hasError?: boolean;
  linked?: boolean;
  onUnlink?: () => void;
  children: ReactNode;
}) {
  return (
    <section
      className={`row${locked ? " is-locked" : ""}${linked ? " is-linked" : ""}${
        locked && hasError ? " is-error" : ""
      }`}
    >
      {linked ? (
        <button
          type="button"
          className="lock-rail linked"
          onClick={onUnlink}
          aria-label={`${label} comes from the financing section. Tap to set it by hand.`}
        >
          <LinkIcon />
          <span className="rail-tag">Linked</span>
        </button>
      ) : (
        <button
          type="button"
          className="lock-rail"
          aria-pressed={locked}
          onClick={() => onLock(fieldKey)}
          aria-label={
            locked ? `${label} is the calculated field` : `Calculate ${label} instead`
          }
        >
          <LockIcon open={!locked} />
          <span className="rail-tag">{locked ? "Solve" : "Set"}</span>
        </button>
      )}
      <div className="field">
        <div className="field-head">
          <span className="field-label">{label}</span>
          {note ? <span className="field-note">{note}</span> : null}
        </div>
        {children}
      </div>
    </section>
  );
}

function Solved({
  value,
  unit,
  exact,
  error,
}: {
  value: string;
  unit?: string;
  exact?: string;
  error?: string;
}) {
  if (error) return <p className="solved-error">{error}</p>;
  return (
    <div className="solved">
      <span className="solved-value">{value}</span>
      {unit ? <span className="solved-unit">{unit}</span> : null}
      {exact ? <span className="solved-exact">{exact}</span> : null}
    </div>
  );
}

/* ---------------------------------------------------------------- financing */

/** Fixed add-on applied to the property price before anything else. */
const MARKUP_PCT = 11;
/** Margin of finance the proposed SPA price is grossed up to. */
const MOF = 0.9;

interface Financing {
  on: boolean;
  price: number;
  mrta: number;
  valuation: number;
}

const FIN_DEFAULTS: Financing = {
  on: true,
  price: 300_000,
  mrta: 25_000,
  valuation: 1_500,
};

function markedUpPrice(price: number): number {
  return price * (1 + MARKUP_PCT / 100);
}

/** Banks round a facility up to a whole thousand — 490,277.77 becomes 491,000. */
function roundUpThousand(v: number): number {
  if (!isFinite(v) || isNaN(v)) return v;
  return Math.ceil(v / 1_000) * 1_000;
}

function financedTotal(f: Financing): number {
  return roundUpThousand(markedUpPrice(f.price) + f.mrta + f.valuation);
}

function Switch({
  on,
  onToggle,
  label,
}: {
  on: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      className={`switch${on ? " on" : ""}`}
      onClick={onToggle}
    >
      <span className="switch-track">
        <span className="switch-thumb" />
      </span>
      <span className="switch-label">{label}</span>
    </button>
  );
}

function LedRow({
  label,
  prefix,
  suffix,
  value,
  step,
  note,
  format,
  parse,
  onCommit,
  ariaLabel,
}: {
  label: string;
  prefix?: string;
  suffix?: string;
  value: number;
  step: number;
  note?: string;
  format: (n: number) => string;
  parse: (s: string) => number;
  onCommit: (n: number) => void;
  ariaLabel: string;
}) {
  return (
    <div className="led-row">
      <span className="led-label">{label}</span>
      <div className="led-control">
        <NumInput
          compact
          ariaLabel={ariaLabel}
          value={value}
          prefix={prefix}
          suffix={suffix}
          step={step}
          format={format}
          parse={parse}
          onCommit={onCommit}
        />
      </div>
      <span className="led-note">{note ?? ""}</span>
    </div>
  );
}

function LedStatic({
  label,
  note,
  value,
  shade = false,
}: {
  label: string;
  note?: string;
  value: string;
  shade?: boolean;
}) {
  return (
    <div className={`led-row${shade ? " led-row-static" : ""}`}>
      <span className="led-label">{label}</span>
      <span className="led-static-value">{value}</span>
      <span className="led-note">{note ?? ""}</span>
    </div>
  );
}

/* ---------------------------------------------------------------- app */

const DEFAULTS: LoanState = {
  amount: 500_000,
  rate: 4.1,
  months: 360,
  payment: 2417.53,
};

export default function App() {
  const [locked, setLocked] = useState<FieldKey>("payment");
  const [vals, setVals] = useState<LoanState>(DEFAULTS);
  const [error, setError] = useState<string | undefined>(undefined);
  const [theme, setTheme] = useState<"system" | "light" | "dark">("system");
  const [fin, setFin] = useState<Financing>(FIN_DEFAULTS);
  const first = useRef(true);

  // Seed from the financing section, then solve for the instalment.
  useEffect(() => {
    if (!first.current) return;
    first.current = false;
    const seeded: LoanState = {
      ...DEFAULTS,
      amount: FIN_DEFAULTS.on ? financedTotal(FIN_DEFAULTS) : DEFAULTS.amount,
    };
    const r = solve("payment", seeded);
    setVals({ ...seeded, payment: isNaN(r.value) ? seeded.payment : r.value });
  }, []);

  useEffect(() => {
    const el = document.documentElement;
    if (theme === "system") el.removeAttribute("data-theme");
    else el.setAttribute("data-theme", theme);
  }, [theme]);

  const commit = (patch: Partial<LoanState>, lockOverride?: FieldKey) => {
    const key = lockOverride ?? locked;
    const merged: LoanState = { ...vals, ...patch };
    const r = solve(key, merged);
    setError(r.error);
    if (!isNaN(r.value)) {
      if (key === "amount") merged.amount = r.value;
      else if (key === "rate") merged.rate = Math.round(r.value * 1000) / 1000;
      else if (key === "tenure") merged.months = Math.round(r.value);
      else merged.payment = r.value;
    }
    setVals(merged);
  };

  const relock = (k: FieldKey) => {
    if (k === locked) return;
    if (k === "amount" && fin.on) return; // the financing section owns it
    setLocked(k);
    commit({}, k);
  };

  /** Edit the financing section; when it's linked, push the new total into the loan. */
  const editFin = (patch: Partial<Financing>) => {
    const next: Financing = { ...fin, ...patch };
    setFin(next);
    if (!next.on) return;
    let key = locked;
    if (key === "amount") {
      key = "payment";
      setLocked("payment");
    }
    commit({ amount: financedTotal(next) }, key);
  };

  const reset = () => {
    setLocked("payment");
    setError(undefined);
    setFin(FIN_DEFAULTS);
    const seeded: LoanState = {
      ...DEFAULTS,
      amount: FIN_DEFAULTS.on ? financedTotal(FIN_DEFAULTS) : DEFAULTS.amount,
    };
    const r = solve("payment", seeded);
    setVals({ ...seeded, payment: isNaN(r.value) ? seeded.payment : r.value });
  };

  const { amount, rate, months, payment } = vals;
  const years = Math.floor(months / 12);
  const extraMonths = months % 12;
  const finTotal = financedTotal(fin);
  const spaPrice = roundUpThousand(finTotal / MOF);
  const markupValue = (fin.price * MARKUP_PCT) / 100;
  const amountLinked = fin.on;

  /** Strip the fees and the fixed add-on back off the loan to get the raw price. */
  const afford = useMemo(() => {
    const net = amount - fin.mrta - fin.valuation;
    const price = net / (1 + MARKUP_PCT / 100);
    return { net, price, ok: net > 0 && isFinite(price) && !error };
  }, [amount, fin.mrta, fin.valuation, error]);

  const themeLabel = theme === "system" ? "Auto" : theme === "dark" ? "Dark" : "Light";

  return (
    <div className="shell">
      <header className="topbar">
        <div>
          <h1>Lock One, Move Three</h1>
          <span className="sub">Malaysia home loan</span>
        </div>
        <div className="topbar-actions">
          <button
            type="button"
            className="ghost-btn"
            onClick={() =>
              setTheme(
                theme === "system" ? "dark" : theme === "dark" ? "light" : "system",
              )
            }
            aria-label={`Theme is ${themeLabel}. Tap to change.`}
          >
            {themeLabel}
          </button>
          <button type="button" className="ghost-btn" onClick={reset}>
            Reset
          </button>
        </div>
      </header>

      <section className="builder">
        <div className="builder-head">
          <h2>What you're financing</h2>
          <Switch
            on={fin.on}
            label={fin.on ? "Feeding loan" : "Off"}
            onToggle={() => editFin({ on: !fin.on })}
          />
        </div>

        <div className="led">
          <LedRow
            label="Property price"
            ariaLabel="Property price in ringgit"
            prefix="RM"
            value={fin.price}
            step={10_000}
            note={formatShort(fin.price)}
            format={formatGrouped}
            parse={parseAmount}
            onCommit={(n) => editFin({ price: n })}
          />
          <LedStatic
            shade
            label={`Price + ${MARKUP_PCT}%`}
            value={formatRM(markedUpPrice(fin.price), 0)}
            note={`add-on ${formatRM(markupValue, 0)}`}
          />
          <LedRow
            label="MRTA / MLTA"
            ariaLabel="MRTA or MLTA premium in ringgit"
            prefix="RM"
            value={fin.mrta}
            step={1_000}
            format={formatGrouped}
            parse={parseAmount}
            onCommit={(n) => editFin({ mrta: n })}
          />
          <LedRow
            label="Valuation fee"
            ariaLabel="Valuation fee in ringgit"
            prefix="RM"
            value={fin.valuation}
            step={100}
            format={formatGrouped}
            parse={parseAmount}
            onCommit={(n) => editFin({ valuation: n })}
          />
        </div>

        <div className="led-total">
          <div className="led-total-l">
            <span className="led-total-k">Total to finance</span>
            <span className="led-total-x">
              {formatShort(fin.price)} + {MARKUP_PCT}% + fees, rounded up
            </span>
          </div>
          <div className="led-total-r">
            <span className="led-total-v">RM {formatShort(finTotal)}</span>
            <span className="led-total-e">{formatRM(finTotal)}</span>
          </div>
        </div>

        <div className="led-total secondary">
          <div className="led-total-l">
            <span className="led-total-k">Proposed SPA price</span>
            <span className="led-total-x">
              total ÷ {MOF.toFixed(1)} ({(MOF * 100).toFixed(0)}% margin), rounded up
            </span>
          </div>
          <div className="led-total-r">
            <span className="led-total-v">RM {formatShort(spaPrice)}</span>
            <span className="led-total-e">{formatRM(spaPrice)}</span>
          </div>
        </div>

        {!fin.on ? (
          <p className="builder-off">
            Not linked — the loan amount below is set by hand. Flip the switch to
            drive it from these numbers.
          </p>
        ) : null}
      </section>

      <p className="hint">
        Tap a <b>padlock</b> to pick the one figure you want worked out. The other
        three are yours to move.
      </p>

      <div className="rows">
        {/* -------- loan amount -------- */}
        <Row
          fieldKey="amount"
          label="Loan amount"
          note={
            amountLinked
              ? "from the section above"
              : locked === "amount"
                ? undefined
                : formatShort(amount)
          }
          locked={locked === "amount"}
          onLock={relock}
          hasError={!!error}
          linked={amountLinked}
          onUnlink={() => editFin({ on: false })}
        >
          {amountLinked ? (
            <div className="solved neutral">
              <span className="solved-value">RM {formatShort(amount)}</span>
              <span className="solved-exact">{formatRM(amount)}</span>
            </div>
          ) : locked === "amount" ? (
            <Solved
              value={`RM ${formatShort(amount)}`}
              exact={error ? undefined : formatRM(amount)}
              error={error}
            />
          ) : (
            <>
              <NumInput
                ariaLabel="Loan amount in ringgit"
                value={amount}
                prefix="RM"
                step={10_000}
                format={formatGrouped}
                parse={parseAmount}
                onCommit={(n) => commit({ amount: n })}
              />
              <Slider
                ariaLabel="Loan amount slider"
                value={amount}
                min={50_000}
                max={Math.max(1_500_000, Math.ceil(amount / 100_000) * 100_000)}
                step={5_000}
                onChange={(n) => commit({ amount: n })}
              />
              <Chips
                active={amount}
                onPick={(n) => commit({ amount: n })}
                options={[
                  { label: "300k", value: 300_000 },
                  { label: "500k", value: 500_000 },
                  { label: "750k", value: 750_000 },
                  { label: "1.00M", value: 1_000_000 },
                ]}
              />
            </>
          )}
        </Row>

        {/* -------- interest rate -------- */}
        <Row
          fieldKey="rate"
          label="Interest rate"
          note={locked === "rate" ? undefined : "per annum"}
          locked={locked === "rate"}
          onLock={relock}
          hasError={!!error}
        >
          {locked === "rate" ? (
            <Solved
              value={isFinite(rate) ? rate.toFixed(2) : "—"}
              unit="% p.a."
              exact={error ? undefined : `${rate.toFixed(3)}% nominal`}
              error={error}
            />
          ) : (
            <>
              <NumInput
                ariaLabel="Interest rate percent"
                value={rate}
                suffix="% p.a."
                step={0.05}
                format={(n) => n.toFixed(2)}
                parse={(s) => parseFloat(s.replace(/[^0-9.]/g, ""))}
                onCommit={(n) => commit({ rate: n })}
              />
              <Slider
                ariaLabel="Interest rate slider"
                value={rate}
                min={2}
                max={9}
                step={0.05}
                onChange={(n) => commit({ rate: Math.round(n * 100) / 100 })}
              />
              <Chips
                active={rate}
                onPick={(n) => commit({ rate: n })}
                options={[
                  { label: "3.75", value: 3.75 },
                  { label: "4.10", value: 4.1 },
                  { label: "4.40", value: 4.4 },
                  { label: "4.75", value: 4.75 },
                ]}
              />
            </>
          )}
        </Row>

        {/* -------- tenure -------- */}
        <Row
          fieldKey="tenure"
          label="Loan tenure"
          note={locked === "tenure" ? undefined : `${months} months`}
          locked={locked === "tenure"}
          onLock={relock}
          hasError={!!error}
        >
          {locked === "tenure" ? (
            <Solved
              value={formatTenure(months)}
              exact={error ? undefined : `${months} months`}
              error={error}
            />
          ) : (
            <>
              <div className="tenure-split">
                <NumInput
                  ariaLabel="Tenure years"
                  value={years}
                  suffix="yrs"
                  inputMode="numeric"
                  format={(n) => String(Math.round(n))}
                  parse={(s) => parseInt(s.replace(/[^0-9]/g, ""), 10)}
                  onCommit={(n) =>
                    commit({ months: Math.max(1, Math.round(n) * 12 + extraMonths) })
                  }
                />
                <NumInput
                  ariaLabel="Tenure extra months"
                  value={extraMonths}
                  suffix="mo"
                  inputMode="numeric"
                  format={(n) => String(Math.round(n))}
                  parse={(s) => parseInt(s.replace(/[^0-9]/g, ""), 10)}
                  onCommit={(n) =>
                    commit({
                      months: Math.max(
                        1,
                        years * 12 + Math.min(11, Math.max(0, Math.round(n))),
                      ),
                    })
                  }
                />
              </div>
              <Slider
                ariaLabel="Tenure slider in years"
                value={months / 12}
                min={5}
                max={40}
                step={1}
                onChange={(n) => commit({ months: Math.round(n) * 12 })}
              />
              <Chips
                active={months}
                onPick={(n) => commit({ months: n })}
                options={[
                  { label: "20 yr", value: 240 },
                  { label: "25 yr", value: 300 },
                  { label: "30 yr", value: 360 },
                  { label: "35 yr", value: 420 },
                ]}
              />
            </>
          )}
        </Row>

        {/* -------- instalment -------- */}
        <Row
          fieldKey="payment"
          label="Monthly instalment"
          note={locked === "payment" ? undefined : "per month"}
          locked={locked === "payment"}
          onLock={relock}
          hasError={!!error}
        >
          {locked === "payment" ? (
            <Solved
              value={
                isFinite(payment)
                  ? `RM ${payment.toLocaleString("en-MY", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}`
                  : "—"
              }
              unit="/ mo"
              error={error}
            />
          ) : (
            <>
              <NumInput
                ariaLabel="Monthly instalment in ringgit"
                value={payment}
                prefix="RM"
                step={50}
                format={(n) =>
                  n.toLocaleString("en-MY", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })
                }
                parse={parseAmount}
                onCommit={(n) => commit({ payment: n })}
              />
              <Slider
                ariaLabel="Monthly instalment slider"
                value={payment}
                min={300}
                max={Math.max(8_000, Math.ceil(payment / 1_000) * 1_000 + 2_000)}
                step={10}
                onChange={(n) => commit({ payment: n })}
              />
              <Chips
                active={payment}
                onPick={(n) => commit({ payment: n })}
                options={[
                  { label: "1.5k", value: 1_500 },
                  { label: "2.0k", value: 2_000 },
                  { label: "3.0k", value: 3_000 },
                  { label: "4.5k", value: 4_500 },
                ]}
              />
            </>
          )}
        </Row>
      </div>

      {/* -------- reverse: what property does this loan buy -------- */}
      <section className="builder reverse">
        <div className="builder-head">
          <h2>Property they can afford</h2>
          <span className="head-note">from the loan above</span>
        </div>

        <div className="led">
          <LedStatic label="Loan amount" value={formatRM(amount, 0)} />
          <LedStatic label="Less MRTA / MLTA" value={`− ${formatRM(fin.mrta, 0)}`} />
          <LedStatic
            label="Less valuation fee"
            value={`− ${formatRM(fin.valuation, 0)}`}
          />
          <LedStatic
            shade
            label="Left for the property"
            note={`includes the ${MARKUP_PCT}%`}
            value={afford.net > 0 ? formatRM(afford.net, 0) : "—"}
          />
        </div>

        <div className="led-total">
          <div className="led-total-l">
            <span className="led-total-k">Raw property price</span>
            <span className="led-total-x">
              {afford.ok
                ? `net ÷ ${(1 + MARKUP_PCT / 100).toFixed(2)}`
                : "loan is smaller than the fees"}
            </span>
          </div>
          <div className="led-total-r">
            <span className="led-total-v">
              {afford.ok ? `RM ${formatShort(afford.price)}` : "—"}
            </span>
            <span className="led-total-e">
              {afford.ok ? formatRM(afford.price) : ""}
            </span>
          </div>
        </div>
      </section>

      <p className="foot">
        Reducing balance on monthly rest, the way Malaysian banks quote a term loan.
        Big figures round to the nearest thousand — RM 316,952.70 reads as 317k, with
        the exact amount underneath. Stamp duty and legal fees aren't in the financing
        total; fold them into the valuation line if you want them borrowed too. The
        total to finance and the proposed SPA price are both rounded up to the next
        whole RM 1,000. An estimate for planning, not a bank offer.
      </p>
    </div>
  );
}
