import React from 'react';
import { Search } from 'lucide-react';

type SearchBarProps = {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

export default function SearchBar({ placeholder, value, onChange, className = '' }: SearchBarProps) {
  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
      <input
        type="text"
        placeholder={placeholder}
        className="search-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}