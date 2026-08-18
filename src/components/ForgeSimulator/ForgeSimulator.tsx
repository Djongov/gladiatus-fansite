import React, { useState, useMemo, useCallback, useEffect } from 'react';
import styles from './ForgeSimulator.module.css';
import { useActiveCharacter } from '@site/src/hooks/useActiveCharacter';
import basesData from '@site/static/data/items/bases.json';
import prefixesData from '@site/static/data/items/prefixes.json';
import suffixesData from '@site/static/data/items/suffixes.json';
import forgingGoodsData from '@site/static/data/items/forging-goods.json';
import affixesRecipes from '@site/static/data/items/prefixes_suffixes_recipes.json';
import ForgingGood from '@site/src/components/ForgingGood';
import Item, { calculateItemStats } from '@site/src/components/Item';
import type { BaseItem, PrefixSuffix } from '@site/src/components/Item';
import type { ForgingGood as ForgingGoodEntry } from '@site/src/components/ForgingGood';

// ─── Types ───────────────────────────────────────────────────────────────────

type ItemQuality = 'green' | 'blue' | 'purple' | 'orange' | 'red';
type ToolTier = 'none' | 'bronze' | 'silver' | 'gold';

/** Per-material quality split: how many units of each quality tier to invest. */
type TierDist = Partial<Record<ItemQuality, number>>;
type MaterialQualityMap = Record<string, TierDist>;

interface SimResult {
  success: boolean;
  quality?: ItemQuality;
  qualityPcts?: Record<ItemQuality, number>;
  refundPercent?: number;
  refundQuality?: ItemQuality;
  rollValue?: number;
  successThreshold?: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Fallback character level used until a profile is imported. */
const DEFAULT_CHAR_LEVEL = 100;

/** Server speed multipliers — a higher speed divides the smelting duration. */
const SERVER_SPEEDS = [1, 2, 4, 5] as const;

const QUALITY_ORDER: ItemQuality[] = ['green', 'blue', 'purple', 'orange', 'red'];

const QUALITY_LABELS: Record<ItemQuality, string> = {
  green: 'Green', blue: 'Blue', purple: 'Purple', orange: 'Orange', red: 'Red',
};

const QUALITY_COLORS: Record<ItemQuality, string> = {
  green: '#1eff00', blue: '#0070dd', purple: '#a335ee', orange: '#ff8000', red: '#e52b2b',
};

const QUALITY_SHORT: Record<ItemQuality, string> = {
  green: 'G', blue: 'B', purple: 'P', orange: 'O', red: 'R',
};

const TOOL_TIERS: ToolTier[] = ['none', 'bronze', 'silver', 'gold'];

// ── Clover of Fortune ────────────────────────────────────────────────────────
const TOOL_IMG_BASE = 'https://gladiatusfansite.blob.core.windows.net/images/Forging/Tools/';

const CLOVER = {
  name: 'Clover of Fortune',
  desc: 'Multiplies base success rate',
  multipliers: { none: 1, bronze: 1.2, silver: 1.5, gold: 2 } as Record<ToolTier, number>,
  labels: {
    none: 'No Clover',
    bronze: '×1.2 success rate',
    silver: '×1.5 success rate',
    gold: '×2.0 success rate',
  } as Record<ToolTier, string>,
  prices: { none: '', bronze: '30 Rubies', silver: '50 Rubies', gold: '110 Rubies' } as Record<ToolTier, string>,
  images: { none: '', bronze: `${TOOL_IMG_BASE}Clover-bronze.png`, silver: `${TOOL_IMG_BASE}Clover-silver.png`, gold: `${TOOL_IMG_BASE}Clover-gold.png` } as Record<ToolTier, string>,
};

// ── Bellows of Austerity ─────────────────────────────────────────────────────
const BELLOWS = {
  name: 'Bellows of Austerity',
  desc: 'Reduces material cost',
  discounts: { none: 0, bronze: 0.15, silver: 0.3, gold: 0.5 } as Record<ToolTier, number>,
  labels: { none: 'No Bellows', bronze: '−15% materials', silver: '−30% materials', gold: '−50% materials' } as Record<ToolTier, string>,
  prices: { none: '', bronze: '30 Rubies', silver: '50 Rubies', gold: '100 Rubies' } as Record<ToolTier, string>,
  images: { none: '', bronze: `${TOOL_IMG_BASE}Bellows-bronze.png`, silver: `${TOOL_IMG_BASE}Bellows-silver.png`, gold: `${TOOL_IMG_BASE}Bellows-gold.png` } as Record<ToolTier, string>,
};

// ── Anvil of Calibre ─────────────────────────────────────────────────────────
const ANVIL = {
  name: 'Anvil of Calibre',
  desc: 'Chance to upgrade quality one tier',
  bonuses: { none: 0, bronze: 0.1, silver: 0.2, gold: 0.3 } as Record<ToolTier, number>,
  labels: { none: 'No Anvil', bronze: '+10% upgrade', silver: '+20% upgrade', gold: '+30% upgrade' } as Record<ToolTier, string>,
  prices: { none: '', bronze: '40 Rubies', silver: '60 Rubies', gold: '90 Rubies' } as Record<ToolTier, string>,
  images: { none: '', bronze: `${TOOL_IMG_BASE}Anvil-bronze.png`, silver: `${TOOL_IMG_BASE}Anvil-silver.png`, gold: `${TOOL_IMG_BASE}Anvil-gold.png` } as Record<ToolTier, string>,
};

// ── Smith's Hammer of Urgency ─────────────────────────────────────────────────
const HAMMER = {
  name: "Smith's Hammer of Urgency",
  desc: 'Reduces forging time',
  reductions: { none: 0, bronze: 0.15, silver: 0.3, gold: 0.5 } as Record<ToolTier, number>,
  labels: { none: 'No Hammer', bronze: '−15% time', silver: '−30% time', gold: '−50% time' } as Record<ToolTier, string>,
  prices: { none: '', bronze: '10 Rubies', silver: '15 Rubies', gold: '25 Rubies' } as Record<ToolTier, string>,
  images: { none: '', bronze: `${TOOL_IMG_BASE}Hammer-bronze.png`, silver: `${TOOL_IMG_BASE}Hammer-silver.png`, gold: `${TOOL_IMG_BASE}Hammer-gold.png` } as Record<ToolTier, string>,
};

// ── Event multipliers ─────────────────────────────────────────────────────────
// Events apply the same way as Clover — multiplicatively on top of it.
// Current known values: ×1.15 and ×1.25 from in-game event descriptions.
const EVENT_OPTIONS = [
  { value: 1,    label: 'No Event' },
  { value: 1.15, label: '×1.15 — increased success chance' },
  { value: 1.25, label: '×1.25 — increased success chance' },
] as const;

// ── Resources event reductions ─────────────────────────────────────────────────
// Reduces material cost, stacking additively with the Bellows and the
// costume/mini-pumpkin reductions. Tiers run in 5% steps up to a 25% max.
const RESOURCE_EVENT_OPTIONS = [
  { value: 0,    label: 'No Event' },
  { value: 0.05, label: '−5% materials' },
  { value: 0.1,  label: '−10% materials' },
  { value: 0.15, label: '−15% materials' },
  { value: 0.2,  label: '−20% materials' },
  { value: 0.25, label: '−25% materials' },
] as const;

const TIER_COLORS: Record<ToolTier, string> = {
  none: '#666', bronze: '#cd7f32', silver: '#a8a9ad', gold: '#d4af37',
};

// ─── Success table (true BASE rates, without any tools or events) ─────────────
// [absoluteExcess, chance] — absoluteExcess = itemLevel − charLevel
//
// Raw observations were made at C=98 DURING a ×1.25 event (no clover).
// True base = observed ÷ 1.25 (since event adds base×0.25 on top).
// Anchor at [0, 55] is wiki-confirmed max base (items at/below your level).
// All other values: observed÷1.25, rounded to one decimal.
//
// Confirmed cross-level: C=110, I=125 (excess=15) → live 58% ÷ 1.25 = 46.4%
// matches C=98, I=113 (excess=15) → 46.4%. Absolute excess is the right axis.
//
// Observed (C=98) → True base:
//   excess  0: 67   → 55   (wiki max, anchored here)
//   excess  1: 66   → 52.8
//   excess  3: 65   → 52.0
//   excess  8: 63   → 50.4
//   excess 11: 62   → 49.6
//   excess 13: 61   → 48.8
//   excess 14: 60   → 48.0
//   excess 15: 58   → 46.4
//   excess 16: 56   → 44.8
//   excess 20: 42   → 33.6  (C=98, I=118 Lucius Sandals of Alleluia, live confirmed)
//   excess 50:  1   →  1   (capped)
const SUCCESS_TABLE: [number, number][] = [
  [0,   55],
  [1,   52.8],
  [3,   52],
  [8,   50.4],
  [11,  49.6],
  [13,  48.8],
  [14,  48],
  [15,  46.4],
  [16,  44.8],
  [20,  33.6],
  [50,  1],
];

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function clamp(v: number, min: number, max: number) { return Math.min(max, Math.max(min, v)); }

function interpolateTable(table: [number, number][], x: number): number {
  if (x <= table.at(0)[0]) return table.at(0)[1];
  if (x >= table.at(-1)[0]) return table.at(-1)[1];
  for (let i = 0; i < table.length - 1; i++) {
    const [x0, y0] = table[i];
    const [x1, y1] = table[i + 1];
    if (x >= x0 && x <= x1) return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
  }
  return table.at(-1)[1];
}

/**
 * Base success chance (before tools/events).
 * Items at or below character level → 55% (wiki-confirmed max).
 * Items above → interpolated from lookup table keyed by absolute excess (itemLevel − charLevel).
 */
function baseSuccessRate(charLevel: number, itemLevel: number): number {
  if (charLevel <= 0 || itemLevel <= charLevel) return 55;
  return Math.max(1, interpolateTable(SUCCESS_TABLE, itemLevel - charLevel));
}

/**
 * Final success chance.
 *
 * Formula (from fansite docs):
 *   final = (base × cloverMult) + base × (eventMult − 1)
 *         = base × (cloverMult + eventMult − 1)
 *
 * Key rule: Clover multiplies only the BASE rate.
 * Event/costume also adds based on the BASE rate (not the clovered value).
 * They do NOT stack multiplicatively with each other.
 *
 * Docs example: base 40%, Gold Clover (×2), event (+10% of base i.e. eventMult=1.25):
 *   (40 × 2) + (40 × 0.25) = 80 + 10 = 90%   ← correct per docs
 *   NOT: 40 × 2 × 1.25 = 100%                 ← wrong (multiplicative)
 *
 * Bronze Clover ×1.2, Silver ×1.5, Gold ×2.0 (per wiki).
 */
function calcSuccessChance(
  charLevel: number,
  itemLevel: number,
  cloverTier: ToolTier,
  eventMult: number,
): number {
  const base = baseSuccessRate(charLevel, itemLevel);
  return clamp(base * (CLOVER.multipliers[cloverTier] + eventMult - 1), 0, 100);
}

// Forging duration scales with the item's GOLD VALUE, not its level — two items
// at the same level but different rarity/affixes smelt for very different times.
// We use the rarity-independent (green) value, since the forge time is shown
// before the result rarity is known.
//
// Real in-game rate: 3.75 s per gold at base (x1) speed (= 0.9375 s/gold on x4).
// `serverSpeed` then divides the result. Anchored to a live data point:
//   Lucius Ra`s Eye of Delicacy — real in-game GREEN value 30,012 gold
//   → 30,012 × 3.75 ÷ 4 = 28,136 s = 07:48:56 on x4 (matches exactly).
//
// ⚠️ The estimate is only as good as the gold VALUE we feed in. Our gold-value
// formula (see src/utils/affixGold.ts) currently undercounts for some slots
// (this amulet: ~1.93× low → 15,563 vs real 30,012), so absolute times for
// those slots read low until the affix-gold formula is refit against live data.
const FORGE_SECONDS_PER_GOLD = 3.75;

/**
 * Duration estimate from item gold value.
 * `serverSpeed` divides the result — a 4× server smelts 4× faster, etc.
 */
function calcDuration(goldValue: number, timeReduction = 0, serverSpeed = 1): string {
  if (!goldValue) return '??:??:??';
  const secs = Math.round(goldValue * FORGE_SECONDS_PER_GOLD * (1 - timeReduction) / serverSpeed);
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Sum of units allocated across all quality tiers for one material. */
function tierDistTotal(dist: TierDist): number {
  return QUALITY_ORDER.reduce((sum, q) => sum + (dist[q] ?? 0), 0);
}

/**
 * Aggregate quality units across all materials using per-tier splits.
 * Default for any unsplit material: all goes to Orange.
 */
function computeQualityUnits(
  materials: Record<string, number>,
  qmap: MaterialQualityMap,
): Record<ItemQuality, number> {
  const units: Record<ItemQuality, number> = { green: 0, blue: 0, purple: 0, orange: 0, red: 0 };
  for (const [name] of Object.entries(materials)) {
    const dist: TierDist = qmap[name] ?? {};
    for (const q of QUALITY_ORDER) units[q] += dist[q] ?? 0;
  }
  return units;
}

// The game weights quality tiers inversely when computing result quality probabilities.
// Lower quality = higher weight, so minority low-quality units punch above their share.
// Confirmed from live data with Silver Anvil (+20% per-roll upgrade):
//   1 green (w5) + 1 purple (w3) → 62.5% G base → 50% G, 13% B, 30% P, 8% O ✓
//   1 orange (w2) + 19 red (w1) → 9.52% O base → 8% O, 92% R (with rounding)  ✓
//   2 orange (w2) + 19 red (w1) → 13.91% O base → 14% O, 86% R                ✓
const QUALITY_WEIGHTS: Record<ItemQuality, number> = {
  green: 5, blue: 4, purple: 3, orange: 2, red: 1,
};

function unitsToPercents(units: Record<ItemQuality, number>): Record<ItemQuality, number> {
  let total = 0;
  const weighted = {} as Record<ItemQuality, number>;
  for (const q of QUALITY_ORDER) {
    const w = units[q] * QUALITY_WEIGHTS[q];
    weighted[q] = w;
    total += w;
  }
  if (total === 0) return { green: 0, blue: 0, purple: 0, orange: 0, red: 0 };
  const pcts = {} as Record<ItemQuality, number>;
  for (const q of QUALITY_ORDER) pcts[q] = (weighted[q] / total) * 100;
  return pcts;
}

function rollQuality(pcts: Record<ItemQuality, number>): ItemQuality {
  const total = Object.values(pcts).reduce((a, b) => a + b, 0);
  if (total === 0) return 'green';
  let roll = Math.random() * total;
  for (const q of QUALITY_ORDER) { roll -= pcts[q]; if (roll <= 0) return q; }
  return 'red';
}

// Each rolled result quality has `bonus`% chance to upgrade one tier (per-roll model).
// Equivalent to: each quality Q contributes (1−bonus)×p[Q] to Q and bonus×p[Q] to Q+1.
// Red cannot upgrade (already max). Applied to the weighted base distribution.
// With all-orange + gold anvil (30%): 70% orange, 30% red ✓
// With 1G+1P + silver anvil (20%): 50% G, 12.5% B, 30% P, 7.5% O → rounds to live ✓
function applyAnvilToDistribution(
  pcts: Record<ItemQuality, number>,
  anvilTier: ToolTier,
): Record<ItemQuality, number> {
  const bonus = ANVIL.bonuses[anvilTier];
  if (!bonus) return pcts;
  const result: Record<ItemQuality, number> = { green: 0, blue: 0, purple: 0, orange: 0, red: 0 };
  for (let i = 0; i < QUALITY_ORDER.length; i++) {
    const q = QUALITY_ORDER[i];
    if (i < QUALITY_ORDER.length - 1) {
      const next = QUALITY_ORDER[i + 1];
      result[q] += pcts[q] * (1 - bonus);
      result[next] += pcts[q] * bonus;
    } else {
      result[q] += pcts[q];
    }
  }
  return result;
}

function dominantQuality(units: Record<ItemQuality, number>): ItemQuality {
  return QUALITY_ORDER.reduce(
    (best, q) => (units[q] > units[best] ? q : best),
    'green' as ItemQuality,
  );
}

function refundQualityTier(q: ItemQuality): ItemQuality {
  return QUALITY_ORDER[Math.max(0, QUALITY_ORDER.indexOf(q) - 1)];
}

// ─── Materials helpers ────────────────────────────────────────────────────────

function addEntries(target: Record<string, number>, source: Record<string, number>) {
  for (const [k, v] of Object.entries(source)) target[k] = (target[k] || 0) + v;
}

function resolveAffixMaterials(
  prefix: PrefixSuffix | undefined,
  suffix: PrefixSuffix | undefined,
  materialIdToName: Record<number, string>,
): { mats: Record<string, number>; usingFallback: boolean } {
  const prefixId = (prefix as any)?.id ?? 0;
  const rawSuffixId = (suffix as any)?.id ?? 0;
  const suffixId = rawSuffixId >= 100 && rawSuffixId <= 109 ? 0 : rawSuffixId;
  const recipe = (affixesRecipes as Record<string, Record<string, number>>)[`${prefixId}-${suffixId}`];

  if (recipe && Object.keys(recipe).length > 0) {
    const mats: Record<string, number> = {};
    for (const [matId, qty] of Object.entries(recipe)) {
      const name = materialIdToName[Number(matId)];
      if (name) mats[name] = (mats[name] || 0) + qty;
    }
    return { mats, usingFallback: false };
  }

  const mats: Record<string, number> = {};
  if (prefix?.materials) addEntries(mats, prefix.materials);
  if (suffix?.materials) addEntries(mats, suffix.materials);
  return { mats, usingFallback: Boolean(prefix || suffix) };
}

// ─── SearchableSelect ─────────────────────────────────────────────────────────

interface SelectOpt { value: string; label: string; isHeader?: boolean }

function SearchableSelect({ options, value, onChange, placeholder, label }: Readonly<{
  options: SelectOpt[];
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  label: string;
}>) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.value === value);
  const filtered = options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className={styles.selectWrapper}>
      <label className={styles.selectLabel}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          className={styles.selectInput}
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder={selected ? selected.label : placeholder}
        />
        {value && (
          <button className={styles.clearBtn} onClick={() => { onChange(''); setSearch(''); }} title="Clear">×</button>
        )}
      </div>
      {open && (
        <>
          <button
            type="button"
            className={styles.selectBackdrop}
            aria-label="Close dropdown"
            onClick={() => setOpen(false)}
            onKeyDown={e => { if (e.key === 'Escape') setOpen(false); }}
          />
          <div className={styles.selectDropdown}>
            {filtered.map(opt => (
              opt.isHeader
                ? <div key={opt.value + opt.label} className={styles.selectOptionHeader}>{opt.label}</div>
                : (
                  <button
                    key={opt.value + opt.label}
                    type="button"
                    className={styles.selectOption}
                    onClick={() => { onChange(opt.value); setSearch(''); setOpen(false); }}
                  >
                    {opt.label}
                  </button>
                )
            ))}
            {filtered.length === 0 && <div className={styles.selectNoResults}>No results found</div>}
          </div>
        </>
      )}
    </div>
  );
}

// ─── ToolCard ─────────────────────────────────────────────────────────────────

function ToolCard({ name, desc, tiers, selected, onChange, priceMap, labelMap, imageMap }: Readonly<{
  name: string;
  desc: string;
  tiers: ToolTier[];
  selected: ToolTier;
  onChange: (t: ToolTier) => void;
  priceMap: Record<ToolTier, string>;
  labelMap: Record<ToolTier, string>;
  imageMap: Record<ToolTier, string>;
}>) {
  const borderColor = TIER_COLORS[selected];
  const activeImg = selected === 'none' ? null : imageMap[selected];
  return (
    <div className={styles.toolCard} style={{ borderColor }}>
      <div className={styles.toolCardHeader}>
        {activeImg
          ? <img src={activeImg} alt={labelMap[selected]} className={styles.toolIcon} />
          : <span className={styles.toolIconPlaceholder} />
        }
        <div className={styles.toolCardTitle}>
          <div className={styles.toolName}>{name}</div>
          <div className={styles.toolDesc}>{desc}</div>
        </div>
      </div>

      {selected !== 'none' && (
        <div className={styles.toolSelectedBadge} style={{ color: borderColor }}>
          {labelMap[selected]}
          {priceMap[selected] && <span className={styles.toolPrice}> · {priceMap[selected]}</span>}
        </div>
      )}

      <div className={styles.toolTierRow}>
        {tiers.map(tier => {
          const active = selected === tier;
          const c = TIER_COLORS[tier];
          const img = tier === 'none' ? null : imageMap[tier];
          return (
            <button
              key={tier}
              className={`${styles.toolTierBtn} ${active ? styles.toolTierActive : ''}`}
              style={active ? { background: c, borderColor: c, color: '#fff' } : {}}
              onClick={() => onChange(tier)}
              title={priceMap[tier] || 'No tool'}
            >
              {img && <img src={img} alt={tier} className={styles.toolTierBtnImg} />}
              <span>{tier === 'none' ? 'None' : tier.charAt(0).toUpperCase() + tier.slice(1)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── MaterialRow ──────────────────────────────────────────────────────────────
// Shows per-tier quantity inputs. Numbers must sum to `qty`.
// Clicking a quality label sets all of that material's quantity to that tier.

function MaterialRow({ name, qty, dist, onChange }: Readonly<{
  name: string;
  qty: number;
  dist: TierDist;
  onChange: (d: TierDist) => void;
}>) {
  const allocated = tierDistTotal(dist);
  const isValid = allocated === qty;
  const remaining = qty - allocated;

  const setTier = (q: ItemQuality, val: number) => {
    const clamped = Math.max(0, val);
    // Total of all other tiers (excluding the one being changed)
    const otherTotal = QUALITY_ORDER.filter(o => o !== q).reduce((s, o) => s + (dist[o] ?? 0), 0);
    // Cap so the grand total never exceeds qty
    const maxAllowed = Math.max(0, qty - otherTotal);
    onChange({ ...dist, [q]: Math.min(clamped, maxAllowed) });
  };

  /** Click the quality label → fill remaining into that tier */
  const fillRemaining = (q: ItemQuality) => {
    if (remaining <= 0) return;
    setTier(q, (dist[q] ?? 0) + remaining);
  };

  return (
    <div className={styles.materialRow}>
      <span className={styles.materialQty}>{qty}×</span>
      <div className={styles.materialIcon}><ForgingGood name={name} /></div>
      <span className={styles.materialName}>{name}</span>

      <div className={styles.qualityInputs}>
        {QUALITY_ORDER.map(q => {
          const tierVal = dist[q] ?? 0;
          return (
            <div key={q} className={styles.qualityInputGroup}>
              <button
                type="button"
                className={styles.qualityInputLabel}
                style={{ color: QUALITY_COLORS[q] }}
                title={`Fill remaining into ${QUALITY_LABELS[q]}`}
                onClick={() => fillRemaining(q)}
              >
                {QUALITY_SHORT[q]}
              </button>
              <input
                type="number"
                min={0}
                max={qty}
                value={tierVal === 0 ? '' : tierVal}
                placeholder="0"
                onChange={e => setTier(q, e.target.value === '' ? 0 : Number.parseInt(e.target.value, 10))}
                className={styles.qualityInput}
                style={{ borderColor: tierVal > 0 ? QUALITY_COLORS[q] : undefined }}
              />
            </div>
          );
        })}
      </div>

      <span className={styles.matTotal} style={{ color: isValid ? '#4caf50' : '#f44336' }}>
        {allocated}/{qty}
      </span>
    </div>
  );
}

// ─── QualityBar ───────────────────────────────────────────────────────────────

function QualityBar({ pcts }: Readonly<{ pcts: Record<ItemQuality, number> }>) {
  const nonZero = QUALITY_ORDER.filter(q => pcts[q] > 0);
  if (!nonZero.length) return null;
  return (
    <div className={styles.qualityBarWrap}>
      <div className={styles.qualityBar}>
        {nonZero.map(q => (
          <div
            key={q}
            className={styles.qualityBarSegment}
            style={{ width: `${pcts[q]}%`, background: QUALITY_COLORS[q] }}
            title={`${QUALITY_LABELS[q]}: ${pcts[q].toFixed(1)}%`}
          />
        ))}
      </div>
      <div className={styles.qualityLegend}>
        {nonZero.map(q => (
          <span key={q} className={styles.qualityLegendItem}>
            <span className={styles.qualityLegendDot} style={{ background: QUALITY_COLORS[q] }} />
            <strong style={{ color: QUALITY_COLORS[q] }}>{pcts[q].toFixed(1)}%</strong>
            {' '}{QUALITY_LABELS[q]}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── ResultDisplay ────────────────────────────────────────────────────────────

function ResultDisplay({ result, baseItem, prefix, suffix, materials }: Readonly<{
  result: SimResult;
  baseItem: BaseItem | undefined;
  prefix: PrefixSuffix | undefined;
  suffix: PrefixSuffix | undefined;
  materials: Record<string, number>;
}>) {
  if (result.success) {
    const qual = result.quality;
    return (
      <div className={`${styles.result} ${styles.resultSuccess}`}>
        <div className={styles.resultHeader}>
          <span className={styles.resultIcon}>🎉</span>
          <span className={styles.resultTitle}>Eureka! Forge Successful!</span>
        </div>
        <div className={styles.resultQuality}>
          Item quality:{' '}
          <strong style={{ color: QUALITY_COLORS[qual], fontSize: '18px' }}>{QUALITY_LABELS[qual]}</strong>
        </div>
        {result.qualityPcts && <QualityBar pcts={result.qualityPcts} />}
        {baseItem && (
          <div className={styles.resultItem}>
            <Item baseItem={baseItem} prefix={prefix} suffix={suffix} rarity={qual} conditioned={false} />
          </div>
        )}
        <div className={styles.resultRoll}>
          Roll: {result.rollValue?.toFixed(1)}% (needed ≤ {result.successThreshold?.toFixed(1)}%)
        </div>
      </div>
    );
  }

  const refundQ = result.refundQuality;
  return (
    <div className={`${styles.result} ${styles.resultFailure}`}>
      <div className={styles.resultHeader}>
        <span className={styles.resultIcon}>💥</span>
        <span className={styles.resultTitle}>What a disaster!</span>
        <p>Unfortunately a catastrophic error occurred during the forging and you are now stood before the pitiful remains of your forging work.
Despite your failure, you receive some of your resources back and can now decide what your next move is:
Have them wrapped into a package and delivered to you or, for a fee, store them directly into a new forging space for the same item to have the forging process attempted once again.
</p>
      </div>
      {result.qualityPcts && <QualityBar pcts={result.qualityPcts} />}
      <div className={styles.resultRoll}>
        Roll: {result.rollValue?.toFixed(1)}% (needed ≤ {result.successThreshold?.toFixed(1)}%)
      </div>
      <div className={styles.refundSection}>
        <strong>Material Refund ({result.refundPercent}%)</strong>
        <span className={styles.refundNote}>
          — returned at{' '}
          <span style={{ color: QUALITY_COLORS[refundQ] }}>{QUALITY_LABELS[refundQ]}</span>
          {' '}quality (one tier below dominant input quality)
        </span>
      </div>
      <div className={styles.refundMaterials}>
        {Object.entries(materials).map(([mat, qty]) => {
          const refunded = Math.max(1, Math.floor(qty * (result.refundPercent / 100)));
          return (
            <div key={mat} className={styles.refundMaterial}>
              <span className={styles.refundQty}>{refunded}×</span>
              <ForgingGood name={mat} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function ForgeSimulator() {
  // ── Step 1: character
  const [charLevel, setCharLevel] = useState(DEFAULT_CHAR_LEVEL);

  // Prefill from an imported profile, but only while the level is still the
  // default — never clobber a value the user has already typed in.
  const { character } = useActiveCharacter();
  useEffect(() => {
    if (character && charLevel === DEFAULT_CHAR_LEVEL) {
      setCharLevel(clamp(character.level, 1, 200));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character]);

  // ── Step 2: item
  const [selectedBase, setSelectedBase] = useState('');
  const [selectedPrefix, setSelectedPrefix] = useState('');
  const [selectedSuffix, setSelectedSuffix] = useState('');

  // ── Step 3: tools
  const [cloverTier, setCloverTier] = useState<ToolTier>('none');
  const [bellowsTier, setBellowsTier] = useState<ToolTier>('none');
  const [anvilTier, setAnvilTier] = useState<ToolTier>('none');
  const [hammerTier, setHammerTier] = useState<ToolTier>('none');
  const [hasCostume, setHasCostume] = useState(false);
  const [hasMiniPumpkin, setHasMiniPumpkin] = useState(false);
  const [eventMult, setEventMult] = useState<number>(1);
  const [resourceEventReduction, setResourceEventReduction] = useState(0);
  const [timeEventReduction, setTimeEventReduction] = useState(0);

  // ── Step 4: per-material per-tier quality splits
  const [materialQuality, setMaterialQuality] = useState<MaterialQualityMap>({});

  // ── Simulation result
  const [result, setResult] = useState<SimResult | null>(null);

  // ── Data lookups ──────────────────────────────────────────────────────────

  const baseItem = useMemo(
    () => (basesData as BaseItem[]).find(b => b.name === selectedBase),
    [selectedBase],
  );
  const prefix = useMemo(
    () => (prefixesData as PrefixSuffix[]).find(p => p.name === selectedPrefix),
    [selectedPrefix],
  );
  const suffix = useMemo(
    () => (suffixesData as PrefixSuffix[]).find(s => s.name === selectedSuffix),
    [selectedSuffix],
  );

  const materialIdToName = useMemo(() => {
    const map: Record<number, string> = {};
    (forgingGoodsData as ForgingGoodEntry[]).forEach(g => {
      if (g.id !== undefined) map[g.id] = g.name;
    });
    return map;
  }, []);

  // ── Materials ─────────────────────────────────────────────────────────────

  const { materials: rawMaterials, usingFallback } = useMemo(() => {
    const baseMats: Record<string, number> = {};
    if (baseItem?.materials) addEntries(baseMats, baseItem.materials);
    const { mats, usingFallback: fallback } = resolveAffixMaterials(prefix, suffix, materialIdToName);
    addEntries(baseMats, mats);
    return { materials: baseMats, usingFallback: fallback };
  }, [baseItem, prefix, suffix, materialIdToName]);

  const discountedMaterials = useMemo(() => {
    const discount = BELLOWS.discounts[bellowsTier]
      + (hasCostume ? 0.2 : 0)
      + (hasMiniPumpkin ? 0.2 : 0)
      + resourceEventReduction;
    const result: Record<string, number> = {};
    for (const [mat, qty] of Object.entries(rawMaterials)) {
      result[mat] = Math.max(1, Math.floor(qty * (1 - discount)));
    }
    return result;
  }, [rawMaterials, bellowsTier, hasCostume, hasMiniPumpkin, resourceEventReduction]);

  const materialDiscountParts = useMemo(() => {
    const parts: string[] = [];
    if (bellowsTier !== 'none') parts.push(`−${BELLOWS.discounts[bellowsTier] * 100}% (bellows)`);
    if (hasCostume) parts.push('−20% (costume)');
    if (hasMiniPumpkin) parts.push('−20% (mini-pumpkin)');
    if (resourceEventReduction > 0) parts.push(`−${resourceEventReduction * 100}% (resources event)`);
    return parts;
  }, [bellowsTier, hasCostume, hasMiniPumpkin, resourceEventReduction]);

  // ── Quality distribution ──────────────────────────────────────────────────

  const qualityUnits = useMemo(
    () => computeQualityUnits(discountedMaterials, materialQuality),
    [discountedMaterials, materialQuality],
  );
  const qualityPcts = useMemo(
    () => applyAnvilToDistribution(unitsToPercents(qualityUnits), anvilTier),
    [qualityUnits, anvilTier],
  );

  // ── Item level & success ──────────────────────────────────────────────────
  // Item level = prefix scroll level + suffix scroll level + base item level.
  // Verified: Gaius(90) + of Delicacy(21) + Triskele(1) = 112 ✓

  const itemLevel = useMemo(
    () => (prefix?.level ?? 0) + (suffix?.level ?? 0) + (baseItem?.level ?? 0),
    [prefix, suffix, baseItem],
  );

  // Rarity-independent (green) gold value — drives the forging duration estimate.
  const itemValue = useMemo(
    () => (baseItem ? calculateItemStats(baseItem, 'green', false, prefix, suffix).gold ?? 0 : 0),
    [baseItem, prefix, suffix],
  );

  const baseRate = useMemo(
    () => baseSuccessRate(charLevel, itemLevel),
    [charLevel, itemLevel],
  );

  const successChance = useMemo(
    () => calcSuccessChance(charLevel, itemLevel, cloverTier, eventMult),
    [charLevel, itemLevel, cloverTier, eventMult],
  );

  // Hammer and time-event reductions stack MULTIPLICATIVELY, not additively.
  // Verified live: base × (1−0.50 event) × (1−0.30 silver hammer) = base × 0.35.
  const timeReduction = useMemo(
    () => 1 - (1 - HAMMER.reductions[hammerTier]) * (1 - timeEventReduction),
    [hammerTier, timeEventReduction],
  );

  // ── Dropdown options ──────────────────────────────────────────────────────

  const groupedBases = useMemo(() => {
    const g: Record<string, BaseItem[]> = {};
    (basesData as BaseItem[]).forEach(b => {
      if (!g[b.type]) g[b.type] = [];
      g[b.type].push(b);
    });
    return g;
  }, []);

  const baseOptions = useMemo(() => [
    ...Object.entries(groupedBases).flatMap(([type, items]) => [
      { value: '', label: type.charAt(0).toUpperCase() + type.slice(1), isHeader: true },
      ...items.map(i => ({ value: i.name, label: `${i.name} (Lv. ${i.level ?? '?'})` })),
    ]),
  ], [groupedBases]);

  const prefixOptions = useMemo(() => [
    { value: '', label: 'None' },
    ...(prefixesData as PrefixSuffix[]).map(p => ({ value: p.name, label: `${p.name} (Lv. ${p.level})` })),
  ], []);

  const suffixOptions = useMemo(() => [
    { value: '', label: 'None' },
    ...(suffixesData as PrefixSuffix[]).map(s => ({ value: s.name, label: `${s.name} (Lv. ${s.level})` })),
  ], []);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const setMatDist = useCallback((name: string, dist: TierDist) => {
    setMaterialQuality(prev => ({ ...prev, [name]: dist }));
  }, []);

  const fillAllQuality = useCallback((q: ItemQuality) => {
    setMaterialQuality(prev => {
      const next = { ...prev };
      for (const [name, qty] of Object.entries(discountedMaterials)) {
        next[name] = { [q]: qty };
      }
      return next;
    });
  }, [discountedMaterials]);

  const simulate = useCallback(() => {
    const roll = Math.random() * 100;
    if (roll <= successChance) {
      const quality = rollQuality(qualityPcts);
      setResult({ success: true, quality, qualityPcts, rollValue: roll, successThreshold: successChance });
    } else {
      const refundPct = Math.floor(10 + Math.random() * 11);
      const dom = dominantQuality(qualityUnits);
      setResult({
        success: false,
        refundPercent: refundPct,
        refundQuality: refundQualityTier(dom),
        qualityPcts,
        rollValue: roll,
        successThreshold: successChance,
      });
    }
  }, [successChance, qualityPcts, qualityUnits]);

  // ── Derived UI state ──────────────────────────────────────────────────────

  const hasAnyItem = Boolean(baseItem || prefix || suffix);
  const hasMaterials = Object.keys(discountedMaterials).length > 0;
  const totalAllocated = Object.values(qualityUnits).reduce((a, b) => a + b, 0);
  const totalRequired = Object.values(discountedMaterials).reduce((a, b) => a + b, 0);
  const allMaterialsFilled = hasMaterials && totalAllocated === totalRequired;

  let chanceColor = '#f44336';
  if (successChance >= 80) chanceColor = '#4caf50';
  else if (successChance >= 60) chanceColor = '#8bc34a';
  else if (successChance >= 40) chanceColor = '#ffc107';

  return (
    <div className={styles.simulator}>

      {/* ── 1: Character Level ───────────────────────────────────────── */}
      <section className={styles.section}>
        <div className={styles.stepHeader}>
          <span className={styles.stepNum}>1</span>
          <h2 className={styles.sectionTitle}>Character Level</h2>
        </div>
        <div className={styles.charLevelRow}>
          <label htmlFor="charLevel" className={styles.charLevelLabel}>Your character level:</label>
          <input
            id="charLevel"
            type="number"
            min={1}
            max={200}
            value={charLevel}
            onChange={e => setCharLevel(clamp(Number(e.target.value), 1, 200))}
            className={styles.charLevelInput}
          />
        </div>
      </section>

      {/* ── 2: Item ───────────────────────────────────────────────────── */}
      <section className={styles.section}>
        <div className={styles.stepHeader}>
          <span className={styles.stepNum}>2</span>
          <h2 className={styles.sectionTitle}>Choose Item</h2>
        </div>
        <div className={styles.itemSelectors}>
          <SearchableSelect options={prefixOptions} value={selectedPrefix} onChange={setSelectedPrefix} placeholder="Search prefix..." label="Prefix" />
          <SearchableSelect options={baseOptions} value={selectedBase} onChange={setSelectedBase} placeholder="Search base item..." label="Base Item" />
          <SearchableSelect options={suffixOptions} value={selectedSuffix} onChange={setSelectedSuffix} placeholder="Search suffix..." label="Suffix" />
        </div>
      </section>

      {/* ── 3: Tools ──────────────────────────────────────────────────── */}
      <section className={styles.section}>
        <div className={styles.stepHeader}>
          <span className={styles.stepNum}>3</span>
          <h2 className={styles.sectionTitle}>Forging Tools</h2>
        </div>
        <div className={styles.toolsGrid}>
          <ToolCard name={CLOVER.name} desc={CLOVER.desc}
            tiers={TOOL_TIERS} selected={cloverTier} onChange={setCloverTier}
            priceMap={CLOVER.prices} labelMap={CLOVER.labels} imageMap={CLOVER.images} />
          <ToolCard name={BELLOWS.name} desc={BELLOWS.desc}
            tiers={TOOL_TIERS} selected={bellowsTier} onChange={setBellowsTier}
            priceMap={BELLOWS.prices} labelMap={BELLOWS.labels} imageMap={BELLOWS.images} />
          <ToolCard name={ANVIL.name} desc={ANVIL.desc}
            tiers={TOOL_TIERS} selected={anvilTier} onChange={setAnvilTier}
            priceMap={ANVIL.prices} labelMap={ANVIL.labels} imageMap={ANVIL.images} />
          <ToolCard name={HAMMER.name} desc={HAMMER.desc}
            tiers={TOOL_TIERS} selected={hammerTier} onChange={setHammerTier}
            priceMap={HAMMER.prices} labelMap={HAMMER.labels} imageMap={HAMMER.images} />
        </div>

        <div className={styles.eventModifiers}>
          <div className={styles.eventChecks}>
            <label className={styles.checkLabel}>
              <input type="checkbox" checked={hasCostume} onChange={e => setHasCostume(e.target.checked)} className={styles.checkbox} />{' '}
              Mercurius' Robber's Garments{' '}<span className={styles.checkDesc}>(−20% materials)</span>
            </label>
            <label className={styles.checkLabel}>
              <input type="checkbox" checked={hasMiniPumpkin} onChange={e => setHasMiniPumpkin(e.target.checked)} className={styles.checkbox} />{' '}
              Mini-Pumpkin{' '}<span className={styles.checkDesc}>(−20% materials)</span>
            </label>
            <div className={styles.eventBonusRow}>
              <label htmlFor="eventMult" className={styles.eventBonusLabel}>Forging Success Bonus Event:</label>
              <select
                id="eventMult"
                value={eventMult}
                onChange={e => setEventMult(Number(e.target.value))}
                className={styles.eventBonusSelect}
              >
                {EVENT_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className={styles.eventBonusRow}>
              <label htmlFor="timeEventReduction" className={styles.eventBonusLabel}>Forging Time Bonus Event:</label>
              <select
                id="timeEventReduction"
                value={timeEventReduction}
                onChange={e => setTimeEventReduction(Number(e.target.value))}
                className={styles.eventBonusSelect}
              >
                <option value={0}>No Event</option>
                <option value={0.1}>−10% forging time</option>
                <option value={0.2}>−20% forging time</option>
                <option value={0.3}>−30% forging time</option>
                <option value={0.4}>−40% forging time</option>
                <option value={0.5}>−50% forging time</option>
              </select>
            </div>
            <div className={styles.eventBonusRow}>
              <label htmlFor="resourceEventReduction" className={styles.eventBonusLabel}>Forging Resources Bonus Event:</label>
              <select
                id="resourceEventReduction"
                value={resourceEventReduction}
                onChange={e => setResourceEventReduction(Number(e.target.value))}
                className={styles.eventBonusSelect}
              >
                {RESOURCE_EVENT_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4: Materials ──────────────────────────────────────────────── */}
      {hasAnyItem && (
        <section className={styles.section}>
          <div className={styles.stepHeader}>
            <span className={styles.stepNum}>4</span>
            <h2 className={styles.sectionTitle}>Materials Required</h2>
          </div>

          {usingFallback && (
            <div className={styles.fallbackWarning}>
              ⚠️ This prefix/suffix combination is not yet in the recipes database.
              Showing estimated materials from individual prefix + suffix + base item data.
              Quantities may differ from the actual in-game forge cost.
            </div>
          )}

          {materialDiscountParts.length > 0 && (
            <div className={styles.discountNote}>
              Material discount: {materialDiscountParts.join(' + ')}
            </div>
          )}

          {hasMaterials ? (
            <>
              <div className={styles.fillAllRow}>
                <span className={styles.fillAllLabel}>Set ALL to:</span>
                {QUALITY_ORDER.map(q => (
                  <button
                    key={q}
                    className={styles.fillAllBtn}
                    style={{ borderColor: QUALITY_COLORS[q], color: QUALITY_COLORS[q] }}
                    onClick={() => fillAllQuality(q)}
                  >
                    {QUALITY_LABELS[q]}
                  </button>
                ))}
                <span className={styles.fillAllHint}>
                  — or split per material using the inputs below.
                  Click a quality label (G/B/P/O/R) to fill the remaining quantity into that tier.
                </span>
              </div>

              <div className={styles.materialsList}>
                {Object.entries(discountedMaterials)
                  .sort(([, a], [, b]) => b - a)
                  .map(([name, qty]) => {
                    const dist = materialQuality[name] ?? {};
                    return (
                      <MaterialRow
                        key={name}
                        name={name}
                        qty={qty}
                        dist={dist}
                        onChange={d => setMatDist(name, d)}
                      />
                    );
                  })}
              </div>

              {totalAllocated > 0 && (
                <div className={styles.qualityDistSection}>
                  <div className={styles.qualityDistTitle}>Quality Distribution</div>
                  <QualityBar pcts={qualityPcts} />
                </div>
              )}
            </>
          ) : (
            <div className={styles.noMaterials}>No material data found for this combination.</div>
          )}
        </section>
      )}

      {/* ── Info ──────────────────────────────────────────────────────── */}
      {hasAnyItem && (
        <section className={styles.section}>
          <div className={styles.stepHeader}>
            <h2 className={styles.sectionTitle}>Info</h2>
          </div>
          <div className={styles.itemPreview}>
            <div className={styles.itemPreviewMeta}>
              {baseItem && (
                <span className={styles.itemTooltipWrapper}>
                  <Item baseItem={baseItem} prefix={prefix} suffix={suffix} rarity={dominantQuality(qualityUnits)} conditioned={false} />
                </span>
              )}
              <span
                className={styles.itemPreviewName}
                style={{ color: QUALITY_COLORS[dominantQuality(qualityUnits)] }}
              >
                {[prefix?.name, baseItem?.name, suffix?.name].filter(Boolean).join(' ') || '—'}
              </span>
              {itemLevel > 0 && (
                <span className={styles.itemPreviewLevel}>Item Level: {itemLevel}</span>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── 5: Forge ──────────────────────────────────────────────────── */}
      <section className={styles.section}>
        <div className={styles.stepHeader}>
          <span className={styles.stepNum}>5</span>
          <h2 className={styles.sectionTitle}>Simulate the Forge</h2>
        </div>

        <div className={styles.forgePanel}>
          <div className={styles.successPanel}>
            <div className={styles.successLabel}>Success Chance</div>
            <div className={styles.successValue} style={{ color: chanceColor }}>
              {successChance.toFixed(1)}%
            </div>
            <div className={styles.successBreakdown}>
              <div>Base (Lv {charLevel} vs item Lv {itemLevel || '?'}): {baseRate.toFixed(1)}%</div>
              {cloverTier !== 'none' && (
                <div>× Clover {cloverTier} (×{CLOVER.multipliers[cloverTier]}): {(baseRate * CLOVER.multipliers[cloverTier]).toFixed(1)}%</div>
              )}
              {eventMult !== 1 && (
                <div>× Event (×{eventMult}): {successChance.toFixed(1)}%</div>
              )}
            </div>
          </div>

          {itemValue > 0 && (
            <div className={styles.durationPanels}>
              {SERVER_SPEEDS.map(speed => (
                <div key={speed} className={styles.durationPanel}>
                  <div className={styles.durationLabel}>Est. Duration · {speed}× server</div>
                  <div className={styles.durationValue}>{calcDuration(itemValue, timeReduction, speed)}</div>
                  <div className={styles.durationNote}>Based on ~{itemValue.toLocaleString()} gold value (approx.)</div>
                </div>
              ))}
            </div>
          )}

          <div className={styles.forgeActions}>
            <button
              className={styles.forgeBtn}
              onClick={simulate}
              disabled={!hasAnyItem || !allMaterialsFilled}
            >
              ⚒️ Forge!
            </button>
            {hasAnyItem && !allMaterialsFilled && (
              <div className={styles.forgeBtnHint}>
                {totalAllocated === 0
                  ? 'Set material quality in Step 4 first'
                  : `Fill all materials first (${totalAllocated}/${totalRequired})`}
              </div>
            )}
            {!hasAnyItem && (
              <div className={styles.forgeBtnHint}>Select an item in Step 2 first</div>
            )}
            {result && (
              <button className={styles.resetBtn} onClick={() => setResult(null)}>Clear Result</button>
            )}
          </div>
        </div>

        {result && (
          <ResultDisplay
            result={result}
            baseItem={baseItem}
            prefix={prefix}
            suffix={suffix}
            materials={discountedMaterials}
          />
        )}
      </section>
    </div>
  );
}
