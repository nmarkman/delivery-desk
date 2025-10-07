import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface InvoiceStatusFilterProps {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}

export default function InvoiceStatusFilter({
  value,
  onValueChange,
  className = "",
}: InvoiceStatusFilterProps) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={`w-[200px] ${className}`}>
        <SelectValue placeholder="All invoice statuses" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All invoice statuses</SelectItem>
        <SelectItem value="draft">Draft</SelectItem>
        <SelectItem value="sent">Sent</SelectItem>
        <SelectItem value="paid">Paid</SelectItem>
        <SelectItem value="overdue">Overdue</SelectItem>
      </SelectContent>
    </Select>
  );
}
