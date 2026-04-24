import React, { useState, useEffect, useRef } from 'react';

const SearchBar = ({ onSearch, placeholder = 'Search...' }) => {
  const [value, setValue] = useState('');
  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleChange = (e) => {
    const newValue = e.target.value;
    setValue(newValue);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onSearch(newValue);
    }, 300);
  };

  const handleClear = () => {
    setValue('');
    onSearch('');
  };

  return (
    <div style={{ position: 'relative', flex: 1, maxWidth: 400 }}>
      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '8px 36px 8px 12px',
          border: '1px solid #e2e8f0',
          borderRadius: 8,
          fontSize: 14,
          outline: 'none',
          boxSizing: 'border-box'
        }}
      />
      {value && (
        <button
          onClick={handleClear}
          style={{
            position: 'absolute',
            right: 8,
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 16,
            color: '#94a3b8',
            padding: 0
          }}
        >
          x
        </button>
      )}
    </div>
  );
};

export default SearchBar;
