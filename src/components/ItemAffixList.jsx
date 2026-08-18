import React, { useState, useMemo } from 'react';
import Link from '@docusaurus/Link';
import { calcAffixGoldBase, calcAffixGoldRange, formatGoldDots } from '@site/src/utils/affixGold';

// Helper: slugify item name
function slugify(value) {
  return typeof value === 'string'
    ? value.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-')
    : '';
}

// Canonical in-game stat order, used for both the tooltip and the sort/filter lists
const STAT_ORDER = [
  'damage', 'armour', 'strength', 'dexterity', 'agility', 'constitution', 'charisma', 'intelligence',
  'critical_hit', 'double_hit', 'avoid_critical_hit', 'avoid_double_hit',
  'block_chance', 'healing', 'critical_healing_value', 'critical_attack_value',
  'block_value', 'hardening_value', 'threat',
];

function statOrderIndex(key) {
  const i = STAT_ORDER.indexOf(key);
  return i === -1 ? STAT_ORDER.length : i;
}

// "critical_attack_value" -> "Critical Attack Value"
function formatStatLabel(key) {
  return key
    .replace(/_/g, ' ')
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// Sort/filter options encode a stat as `${statKey}|flat` or `${statKey}|percent`.
function getSortValue(item, sortKey, type) {
  if (sortKey === 'level') return item.level ?? 0;
  if (sortKey === 'gold') return calcAffixGoldBase(item.level, type);
  const [statKey, kind] = sortKey.split('|');
  const stat = item.stats?.[statKey];
  if (!stat) return 0;
  return (kind === 'percent' ? stat.percent : stat.flat) ?? 0;
}

// True when the item carries a non-zero value for the given `${statKey}|flat|percent` variant.
function itemHasStatVariant(item, variantValue) {
  const [statKey, kind] = variantValue.split('|');
  const stat = item.stats?.[statKey];
  if (!stat) return false;
  return kind === 'percent' ? Boolean(stat.percent) : Boolean(stat.flat);
}

export default function ItemAffixList({ items, type = 'prefix', showFilters = true }) {
  const [search, setSearch] = useState('');
  const [selectedStats, setSelectedStats] = useState([]); // array of `${statKey}|flat|percent` variant values (AND filter)
  const [sortKey, setSortKey] = useState(''); // '' | 'name' | 'level' | 'gold' | `${statKey}|flat|percent`
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' | 'desc'
  const [showNewOnly, setShowNewOnly] = useState(false);
  const [showUWOnly, setShowUWOnly] = useState(false);

  const toggleStat = value =>
    setSelectedStats(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );

  // Every stat variant present in the data, in canonical order. A stat appears as a
  // single "Strength" entry when it only ever has a flat value, or as separate
  // "Strength (flat)" / "Strength (%)" entries when both forms occur in the dataset.
  const statVariants = useMemo(() => {
    const hasFlat = new Set();
    const hasPercent = new Set();
    items.forEach(item => {
      Object.entries(item.stats || {}).forEach(([key, v]) => {
        if (v.flat) hasFlat.add(key);
        if (v.percent) hasPercent.add(key);
      });
    });
    const keys = Array.from(new Set([...hasFlat, ...hasPercent]))
      .sort((a, b) => statOrderIndex(a) - statOrderIndex(b) || a.localeCompare(b));

    const variants = [];
    keys.forEach(key => {
      const name = formatStatLabel(key);
      const both = hasFlat.has(key) && hasPercent.has(key);
      if (hasFlat.has(key)) {
        variants.push({ value: `${key}|flat`, label: both ? `${name} (flat)` : name });
      }
      if (hasPercent.has(key)) {
        variants.push({ value: `${key}|percent`, label: `${name} (%)` });
      }
    });
    return variants;
  }, [items]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter(item => {

      // Skip items with asterisks in the name
      if (item.name && item.name.includes('*')) return false;

      // Name search
      if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false;

      // New only filter
      if (showNewOnly && !item.new) return false;

      // Underworld only filter
      if (showUWOnly && !item.underworld) return false;

      // Stat presence filter — must carry every selected stat variant (AND logic)
      if (selectedStats.length && !selectedStats.every(v => itemHasStatVariant(item, v))) return false;

      return true;
    });
  }, [items, search, selectedStats, showNewOnly, showUWOnly]);

  const sortedItems = useMemo(() => {
    if (!sortKey) return filteredItems;

    return [...filteredItems].sort((a, b) => {
      if (sortKey === 'name') {
        const cmp = a.name.toLowerCase().localeCompare(b.name.toLowerCase());
        return sortOrder === 'asc' ? cmp : -cmp;
      }

      const aVal = getSortValue(a, sortKey, type);
      const bVal = getSortValue(b, sortKey, type);
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [filteredItems, sortKey, sortOrder, type]);


  return (
    <div>
      {showFilters && (
        <>
          {/* Search + New only filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <input
              type="text"
              placeholder="Search by name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ padding: '6px', borderRadius: '4px', width: '180px' }}
            />
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showNewOnly}
                onChange={e => setShowNewOnly(e.target.checked)}
              />
              <span>New only</span>
            </label>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showUWOnly}
                onChange={e => setShowUWOnly(e.target.checked)}
              />
              <span>UW only</span>
            </label>
          </div>

          {/* Stat presence filter — toggle chips, AND logic */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ marginBottom: '6px', fontWeight: 'bold', fontSize: '13px' }}>
              Filter by stats
              {selectedStats.length > 0 &&
                ` — showing affixes with all ${selectedStats.length} selected`}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {statVariants.map(variant => {
                const active = selectedStats.includes(variant.value);
                return (
                  <button
                    key={variant.value}
                    type="button"
                    onClick={() => toggleStat(variant.value)}
                    style={{
                      padding: '3px 10px',
                      borderRadius: '12px',
                      border: active ? '1px solid #00aa00' : '1px solid #ccc',
                      backgroundColor: active ? '#00ff00' : '#f5f5f5',
                      color: active ? '#000' : '#333',
                      fontWeight: active ? 'bold' : 'normal',
                      cursor: 'pointer',
                      fontSize: '12px',
                    }}
                  >
                    {variant.label}
                  </button>
                );
              })}
              {selectedStats.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedStats([])}
                  style={{
                    padding: '3px 10px',
                    borderRadius: '12px',
                    border: '1px solid #cc0000',
                    backgroundColor: '#fff',
                    color: '#cc0000',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Paragraph showing number of filtered items */}
          <p style={{ marginBottom: '12px', fontStyle: 'italic', color: '#000000' }}>
            Showing {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''}
          </p>

          <div style={{ marginBottom: '12px', display: 'flex', gap: '8px' }}>
            <select value={sortKey} onChange={e => setSortKey(e.target.value)} style={{ padding: '4px' }}>
              <option value="">-- Sort by --</option>
              <option value="name">Name</option>
              <option value="level">Level</option>
              <option value="gold">Gold</option>
              {statVariants.map(variant => (
                <option key={variant.value} value={variant.value}>{variant.label}</option>
              ))}
            </select>

            <button
              onClick={() => setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))}
              style={{ padding: '4px 8px' }}
            >
              {sortOrder === 'asc' ? 'Asc' : 'Desc'}
            </button>
          </div>
        </>
      )}

      {/* Tooltip grid */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        {(showFilters ? sortedItems : filteredItems).map((item, index) => (
          <div
            key={index}
            style={{
              backgroundColor: '#000',
              border: '1px solid #222',
              padding: '12px',
              borderRadius: '6px',
              fontFamily: 'monospace',
              color: '#ccc',
              maxWidth: 'fit-content',
            }}
          >
            {/* Name */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: 'bold',
                fontSize: '16px',
                marginBottom: '6px',
              }}
            >
              <Link
                to={`/items/${type}/${slugify(item.name)}`}
                style={{
                  color: '#00ff00',
                  textDecoration: 'none',
                }}
              >
                {item.name}
              </Link>
              {item.new && (
                <span title="Added in Battle for Britannia patch" style={{
                  backgroundColor: '#cc0000',
                  color: '#fff',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  padding: '1px 5px',
                  borderRadius: '3px',
                  letterSpacing: '0.5px',
                  cursor: 'pointer',
                }}>
                  NEW
                </span>
              )}
              {item.underworld && (
                <span title="Only found in Underworld" style={{
                  backgroundColor: '#cc0000',
                  color: '#fff',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  padding: '1px 5px',
                  borderRadius: '3px',
                  letterSpacing: '0.5px',
                  cursor: 'pointer',
                }}>
                  UW
                </span>
              )}
            </div>

            {/* Stats */}
            {Object.entries(item.stats)
              .sort(([a], [b]) => statOrderIndex(a) - statOrderIndex(b))
              .map(([stat, values]) => {
              const lines = [];
              const formatKey = formatStatLabel(stat);

              if (values.flat !== 0) {
                const sign = values.flat > 0 ? '+' : '';
                lines.push(
                  <div key={`${stat}-flat`}>
                    {formatKey} {sign}{values.flat}
                  </div>
                );
              }

              if (values.percent !== 0) {
                const sign = values.percent > 0 ? '+' : '';
                lines.push(
                  <div key={`${stat}-percent`}>
                    {formatKey} {sign}{values.percent}%
                  </div>
                );
              }

              return lines;
            })}

            {/* Level */}
            <div style={{ color: '#9b9b9b', marginTop: '4px' }}>Level {item.level}</div>
            <div style={{ color: '#9b9b9b' }}>Scroll level {item.level + 10}</div>

            {/* Gold */}
            {item.level > 0 && (() => {
              const { min, max } = calcAffixGoldRange(item.level, type);
              return (
                <div style={{ marginBottom: '4px', fontWeight: 'bold' }}>
                  Value {formatGoldDots(min)} – {formatGoldDots(max)}{' '}
                  <img
                    src="https://gladiatusfansite.blob.core.windows.net/images/icon_gold.gif"
                    alt="gold"
                    style={{ verticalAlign: 'middle', width: '16px', height: '16px' }}
                  />
                </div>
              );
            })()}
          </div>
        ))}
      </div>

    </div>
  );
}
