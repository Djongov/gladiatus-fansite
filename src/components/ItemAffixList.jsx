import React, { useState, useMemo } from 'react';
import Link from '@docusaurus/Link';

// Helper: format gold numbers with dots
function formatGold(value) {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// Helper: slugify item name
function slugify(value) {
  return typeof value === 'string'
    ? value.toLowerCase().replace(/\s+/g, '-')
    : '';
}

export default function ItemAffixList({ items, type = 'prefix' }) {
  const [search, setSearch] = useState('');
  const [statFilter, setStatFilter] = useState(''); // e.g., "Armor >= 600"
  const [statFilterValue, setStatFilterValue] = useState(''); // number
  const [sortKey, setSortKey] = useState(''); // 'name' | 'level' | 'gold'
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' | 'desc'

  const allStats = useMemo(() => {
    const set = new Set();
    items.forEach(item => {
      Object.keys(item.stats).forEach(stat => set.add(stat));
    });
    return Array.from(set).sort(); // optional: sort alphabetically
  }, [items]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Skip items with asterisks in the name
      if (item.name && item.name.includes('*')) return false;

      // Name search
      if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false;

      // Stat filter
      if (statFilter && statFilterValue) {
        const statKey = statFilter.toLowerCase().replace(/\s+/g, '_');
        const values = item.stats[statKey];
        if (!values) return false; // stat must exist

        const total = (values.flat || 0) + (values.percent || 0);
        if (total < Number(statFilterValue)) return false;
      }

      return true;
    });
  }, [items, search, statFilter, statFilterValue]);

  const sortedItems = useMemo(() => {
    if (!sortKey) return filteredItems;

    return [...filteredItems].sort((a, b) => {
      let aVal, bVal;

      if (sortKey === 'name') {
        aVal = a.name.toLowerCase();
        bVal = b.name.toLowerCase();
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      } else if (sortKey === 'level' || sortKey === 'gold') {
        aVal = a[sortKey] ?? 0;
        bVal = b[sortKey] ?? 0;
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }

      return 0;
    });
  }, [filteredItems, sortKey, sortOrder]);


  return (
    <div>
      {/* Search input */}
      <input
        type="text"
        placeholder="Search by name..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ marginBottom: '8px', padding: '6px', borderRadius: '4px', width: '180px' }}
      />

      {/* Stat filter */}
      <div style={{ marginBottom: '12px' }}>
        <select
          value={statFilter}
          onChange={e => setStatFilter(e.target.value)}
          style={{ marginRight: '4px', padding: '4px' }}
        >
          <option value="">-- Filter stat --</option>
          {allStats.map(stat => (
            <option key={stat} value={stat}>
              {stat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </option>
          ))}
        </select>
        <input
          type="number"
          placeholder="Min value"
          value={statFilterValue}
          onChange={e => setStatFilterValue(e.target.value)}
          style={{ width: '80px', padding: '4px' }}
        />
      </div>

      {/* Paragraph showing number of filtered items */}
      <p style={{ marginBottom: '12px', fontStyle: 'italic', color: '#ccc' }}>
        Showing {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''}
      </p>

      <div style={{ marginBottom: '12px', display: 'flex', gap: '8px' }}>
        <select value={sortKey} onChange={e => setSortKey(e.target.value)} style={{ padding: '4px' }}>
          <option value="">-- Sort by --</option>
          <option value="name">Name</option>
          <option value="level">Level</option>
          <option value="gold">Gold</option>
        </select>

        <button
          onClick={() => setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))}
          style={{ padding: '4px 8px' }}
        >
          {sortOrder === 'asc' ? 'Asc' : 'Desc'}
        </button>
      </div>

      {/* Tooltip grid */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        {sortedItems.map((item, index) => (
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
                color: '#00ff00',
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
            </div>

            {/* Stats */}
            {Object.entries(item.stats).map(([stat, values]) => {
              const lines = [];
              const formatKey = stat
                .replace(/_/g, ' ')
                .split(' ')
                .map(w => w.charAt(0).toUpperCase() + w.slice(1))
                .join(' ');

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

            {/* Gold */}
            <div style={{ marginBottom: '4px', fontWeight: 'bold' }}>
              Value {formatGold(item.gold)}{' '}
              <img
                src="https://gladiatusfansite.blob.core.windows.net/images/icon_gold.gif"
                alt="gold"
                style={{ verticalAlign: 'middle', width: '16px', height: '16px' }}
              />
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
