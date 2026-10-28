import React, { useState } from 'react';
import styles from './SearchableSelect.module.css';

export interface SelectOpt { value: string; label: string; isHeader?: boolean }

/** A text box that filters a dropdown of options; "×" clears the choice back to ''. */
export default function SearchableSelect({ options, value, onChange, placeholder, label }: Readonly<{
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
          className={selected ? `${styles.selectInput} ${styles.hasValue}` : styles.selectInput}
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
