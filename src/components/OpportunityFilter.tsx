import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface OpportunityFilterProps {
  onFilterChange: (searchTerm: string) => void;
  placeholder?: string;
  className?: string;
}

export default function OpportunityFilter({
  onFilterChange,
  placeholder = "Search opportunities...",
  className = "",
}: OpportunityFilterProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Call filter callback when debounced term changes
  useEffect(() => {
    onFilterChange(debouncedSearchTerm);
  }, [debouncedSearchTerm, onFilterChange]);

  const handleClear = () => {
    setSearchTerm('');
  };

  return (
    <div className={`relative w-full max-w-sm ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 pr-10"
        />
        {searchTerm && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0 text-muted-foreground hover:text-foreground"
            onClick={handleClear}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}