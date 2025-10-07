import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ClientFilterProps {
  value: string;
  onValueChange: (value: string) => void;
  clients: string[];
  className?: string;
}

export default function ClientFilter({
  value,
  onValueChange,
  clients,
  className = "",
}: ClientFilterProps) {
  // Clean and sort clients alphabetically
  // Remove any leading/trailing whitespace and normalize internal spacing
  const sortedClients = [...clients]
    .map(client => client.trim().replace(/\s+/g, ' '))
    .sort((a, b) => a.localeCompare(b));

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={`w-full ${className}`}>
        <SelectValue placeholder="All clients" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All clients</SelectItem>
        {sortedClients.map((client) => (
          <SelectItem key={client} value={client}>
            {client}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
