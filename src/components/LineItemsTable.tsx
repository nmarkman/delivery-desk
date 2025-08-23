import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Trash2, Edit3, Save, X, DollarSign, Calendar, Tag } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

interface LineItem {
  id?: string;
  type: 'retainer' | 'deliverable';
  name: string;
  amount: number;
  date?: string;
  original_text: string;
  retainer_details?: {
    start_date: string;
    end_date: string;
    monthly_amount: number;
  };
}

interface LineItemsTableProps {
  lineItems: LineItem[];
  onLineItemsChange: (lineItems: LineItem[]) => void;
  onDelete: (index: number) => void;
  onEdit: (index: number, item: LineItem) => void;
  isProcessing: boolean;
}

export default function LineItemsTable({
  lineItems,
  onLineItemsChange,
  onDelete,
  onEdit,
  isProcessing
}: LineItemsTableProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingItem, setEditingItem] = useState<LineItem | null>(null);
  const { toast } = useToast();

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setEditingItem({ ...lineItems[index] });
  };

  const handleSave = (index: number) => {
    if (editingItem) {
      onEdit(index, editingItem);
      setEditingIndex(null);
      setEditingItem(null);
      toast({
        title: "Line Item Updated",
        description: "Changes have been saved",
      });
    }
  };

  const handleCancel = () => {
    setEditingIndex(null);
    setEditingItem(null);
  };

  const handleDelete = (index: number) => {
    onDelete(index);
    toast({
      title: "Line Item Removed",
      description: "Item has been deleted",
    });
  };

  const getTypeBadgeVariant = (type: string) => {
    return type === 'retainer' ? 'default' : 'secondary';
  };

  const getTypeIcon = (type: string) => {
    return type === 'retainer' ? <Calendar className="h-3 w-3" /> : <Tag className="h-3 w-3" />;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const totalAmount = lineItems.reduce((sum, item) => sum + item.amount, 0);
  const retainersCount = lineItems.filter(item => item.type === 'retainer').length;
  const deliverablesCount = lineItems.filter(item => item.type === 'deliverable').length;

  if (lineItems.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <DollarSign className="h-5 w-5" />
          <span>Extracted Line Items</span>
        </CardTitle>
        <CardDescription>
          Review and edit the extracted line items before creating products
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{lineItems.length}</div>
            <div className="text-sm text-gray-600">Total Items</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{retainersCount}</div>
            <div className="text-sm text-gray-600">Retainers</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{deliverablesCount}</div>
            <div className="text-sm text-gray-600">Deliverables</div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Original Text</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lineItems.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Badge variant={getTypeBadgeVariant(item.type)} className="flex items-center space-x-1">
                      {getTypeIcon(item.type)}
                      <span className="capitalize">{item.type}</span>
                    </Badge>
                  </TableCell>
                  
                  <TableCell>
                    {editingIndex === index ? (
                      <Input
                        value={editingItem?.name || ''}
                        onChange={(e) => setEditingItem(prev => prev ? { ...prev, name: e.target.value } : null)}
                        className="w-full"
                      />
                    ) : (
                      <div className="font-medium">{item.name}</div>
                    )}
                  </TableCell>
                  
                  <TableCell>
                    {editingIndex === index ? (
                      <Input
                        type="number"
                        value={editingItem?.amount || 0}
                        onChange={(e) => setEditingItem(prev => prev ? { ...prev, amount: parseFloat(e.target.value) || 0 } : null)}
                        className="w-full"
                        min="0"
                        step="0.01"
                      />
                    ) : (
                      <div className="font-semibold text-green-700">
                        {formatCurrency(item.amount)}
                      </div>
                    )}
                  </TableCell>
                  
                  <TableCell>
                    {editingIndex === index ? (
                      <Input
                        type="date"
                        value={editingItem?.date || ''}
                        onChange={(e) => setEditingItem(prev => prev ? { ...prev, date: e.target.value } : null)}
                        className="w-full"
                      />
                    ) : (
                      <div className="text-sm text-gray-600">
                        {item.date ? new Date(item.date).toLocaleDateString() : 'N/A'}
                      </div>
                    )}
                  </TableCell>
                  
                  <TableCell>
                    <div className="text-sm text-gray-600 max-w-xs truncate" title={item.original_text}>
                      {item.original_text}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex space-x-1">
                      {editingIndex === index ? (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleSave(index)}
                            disabled={isProcessing}
                            className="h-8 w-8 p-0"
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCancel}
                            disabled={isProcessing}
                            className="h-8 w-8 p-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(index)}
                            disabled={isProcessing}
                            className="h-8 w-8 p-0"
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(index)}
                            disabled={isProcessing}
                            className="h-8 w-8 p-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Total Amount */}
        <div className="mt-6 text-right">
          <div className="text-2xl font-bold text-green-700">
            Total: {formatCurrency(totalAmount)}
          </div>
          <div className="text-sm text-gray-600">
            {retainersCount} retainer(s) • {deliverablesCount} deliverable(s)
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
