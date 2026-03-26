import { useState, useRef, useEffect } from 'react';

/**
 * ScrollableSelect — a custom dropdown that replaces <select> for filters.
 * Shows a scrollable list (max 220px) when open.
 *
 * Props:
 *   value        {string}   — currently selected value
 *   onChange     {fn}       — called with new value string
 *   options      {Array}    — [{ value, label }]
 *   placeholder  {string}   — label shown when nothing selected
 *   disabled     {bool}     — when true, disables interaction and dims the button
 */
export default function ScrollableSelect({ value, onChange, options, placeholder = 'Select…', disabled = false }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    function handle(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const selected = options.find(o => o.value === value);
  const label = selected ? selected.label : placeholder;
  const isActive = !!value;

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      {/* Trigger button — matches .select-field visually */}
      <button
        type="button"
        onClick={() => { if (!disabled) setOpen(o => !o); }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 28px 6px 10px',
          fontSize: 13,
          fontWeight: 500,
          color: disabled ? 'var(--text-3)' : isActive ? 'var(--text-1)' : 'var(--text-2)',
          background: disabled ? 'var(--bg-1)' : isActive ? 'var(--bg-3)' : 'var(--bg-2)',
          border: `1px solid ${open ? 'var(--blue)' : isActive ? 'var(--border-2)' : 'var(--border)'}`,
          borderRadius: 'var(--radius)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          outline: 'none',
          fontFamily: "'Inter', sans-serif",
          whiteSpace: 'nowrap',
          position: 'relative',
          transition: 'border-color 0.15s, background 0.15s',
          minWidth: 120,
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {label}
        </span>
        {/* Chevron icon */}
        <svg
          width="10" height="6" fill="none"
          style={{
            position: 'absolute', right: 10, top: '50%',
            transform: `translateY(-50%) rotate(${open ? 180 : 0}deg)`,
            transition: 'transform 0.18s',
            flexShrink: 0,
          }}
        >
          <path d="M1 1l4 4 4-4" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          left: 0,
          zIndex: 1000,
          minWidth: '100%',
          background: 'var(--panel)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.13)',
          overflow: 'hidden',
        }}>
          <ul
            style={{
              listStyle: 'none',
              margin: 0,
              padding: '4px 0',
              maxHeight: 220,
              overflowY: 'auto',
              overflowX: 'hidden',
              // Custom scrollbar
              scrollbarWidth: 'thin',
              scrollbarColor: 'var(--border-2) transparent',
            }}
          >
            {options.map(opt => {
              const isSelected = opt.value === value;
              return (
                <li
                  key={opt.value}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  style={{
                    padding: '8px 14px',
                    fontSize: 13,
                    fontFamily: "'Inter', sans-serif",
                    color: isSelected ? 'var(--blue, #3b82f6)' : 'var(--text-1)',
                    background: isSelected ? 'var(--bg-3)' : 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    transition: 'background 0.1s',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-2)'; }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                >
                  <span>{opt.label}</span>
                  {isSelected && (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="var(--blue,#3b82f6)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
