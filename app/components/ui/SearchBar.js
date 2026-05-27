'use client';

import { Search, X } from 'lucide-react';

export default function SearchBar({
  value, onChange, placeholder = 'Search...', filters = [], className = ''
}) {
  return (
    <div className={`search-bar ${className}`}>
      <div className="search-input-wrapper">
        <Search size={16} className="search-icon" />
        <input
          className="form-input search-input"
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        {value && (
          <button className="search-clear" onClick={() => onChange('')}>
            <X size={14} />
          </button>
        )}
      </div>
      {filters.map((filter, i) => (
        <select
          key={i}
          className="form-select search-filter"
          value={filter.value}
          onChange={(e) => filter.onChange(e.target.value)}
        >
          <option value="">{filter.placeholder || 'All'}</option>
          {filter.options.map((opt, j) => (
            <option key={j} value={opt.value || opt}>{opt.label || opt}</option>
          ))}
        </select>
      ))}
    </div>
  );
}
