import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Trash2, Edit3, Save, X, DollarSign, Calendar, Tag, Plus } from 'lucide-react';
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

// Act! Product interface for processed line items
interface ActProduct {
  id: string;
  name: string;
  price: number;
  quantity: number;
  itemNumber: string;
  type: string;
  total: number;
  opportunityID: string;
  created?: string;
  edited?: string;
}

// Union type for both parsed and processed items
type DisplayItem = LineItem | ActProduct;

interface LineItemsTableProps {
  lineItems: DisplayItem[];
  onLineItemsChange: (lineItems: DisplayItem[]) => void;
  onDelete: (index: number) => void;
  onEdit: (index: number, item: DisplayItem) => void;
  isProcessing: boolean;
  onSubmit?: () => void;
  onReset?: () => void;
  showActionButtons?: boolean;
}

export default function LineItemsTable({
  lineItems,
  onLineItemsChange,
  onDelete,
  onEdit,
  isProcessing,
  onSubmit,
  onReset,
  showActionButtons = false
}: LineItemsTableProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingItem, setEditingItem] = useState<DisplayItem | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState<LineItem>({
    type: 'deliverable',
    name: '',
    amount: 0,
    date: '',
    original_text: ''
  });
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

  const handleAddItem = () => {
    if (!newItem.name.trim() || newItem.amount <= 0) {
      toast({
        title: "Invalid Item",
        description: "Please provide a name and amount greater than 0",
        variant: "destructive",
      });
      return;
    }

    const itemToAdd: LineItem = {
      ...newItem,
      original_text: newItem.original_text || `Manually added: ${newItem.name}`
    };

    const updatedItems = [...lineItems, itemToAdd];
    onLineItemsChange(updatedItems);
    
    // Reset form
    setNewItem({
      type: 'deliverable',
      name: '',
      amount: 0,
      date: '',
      original_text: ''
    });
    setShowAddForm(false);
    
    // Removed misleading toast - items aren't actually created until final confirmation
  };

  const handleCancelAdd = () => {
    setNewItem({
      type: 'deliverable',
      name: '',
      amount: 0,
      date: '',
      original_text: ''
    });
    setShowAddForm(false);
  };

  // Helper functions to handle both LineItem and ActProduct types
  const getItemAmount = (item: DisplayItem): number => {
    return 'amount' in item ? item.amount : item.total;
  };

  const getItemName = (item: DisplayItem): string => {
    return item.name;
  };

  const getItemType = (item: DisplayItem): string => {
    if ('amount' in item) {
      // This is a LineItem
      return item.type === 'retainer' ? 'retainer' : 'deliverable';
    } else {
      // This is an ActProduct
      return item.type === 'Retainer' ? 'retainer' : 'deliverable';
    }
  };

  const getItemDate = (item: DisplayItem): string => {
    if ('date' in item) return item.date || '';
    if ('itemNumber' in item) return item.itemNumber;
    return '';
  };

  const getItemOriginalText = (item: DisplayItem): string => {
    return 'original_text' in item ? item.original_text : item.name;
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

  const formatDateDisplay = (dateString: string) => {
    // Parse the date string as local date to avoid timezone issues
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day); // month is 0-indexed
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric'
    });
  };

  const totalAmount = lineItems.reduce((sum, item) => sum + getItemAmount(item), 0);
  const retainersCount = lineItems.filter((item: DisplayItem) => getItemType(item) === 'retainer').length;
  const deliverablesCount = lineItems.filter((item: DisplayItem) => getItemType(item) === 'deliverable').length;

  // Always show the table, even when empty, to allow manual line item addition

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <DollarSign className="h-5 w-5" />
            <span>Line Items</span>
          </div>
          <Button
            onClick={() => setShowAddForm(true)}
            variant="outline"
            disabled={isProcessing || showAddForm}
            className="flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add Line Item</span>
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>

        {/* Add Item Form */}
        {showAddForm && (
          <Card className="mb-4 border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="new-type">Type</Label>
                  <Select
                    value={newItem.type}
                    onValueChange={(value: 'retainer' | 'deliverable') => 
                      setNewItem(prev => ({ ...prev, type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="deliverable">Deliverable</SelectItem>
                      <SelectItem value="retainer">Retainer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="new-name">Name</Label>
                  <Input
                    id="new-name"
                    value={newItem.name}
                    onChange={(e) => setNewItem(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter item name"
                  />
                </div>
                
                <div>
                  <Label htmlFor="new-amount">Amount</Label>
                  <Input
                    id="new-amount"
                    type="number"
                    value={newItem.amount === 0 ? '' : newItem.amount}
                    onChange={(e) => setNewItem(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
                
                <div>
                  <Label htmlFor="new-date">Date (Optional)</Label>
                  <Input
                    id="new-date"
                    type="date"
                    value={newItem.date}
                    onChange={(e) => setNewItem(prev => ({ ...prev, date: e.target.value }))}
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 mt-4">
                <Button
                  variant="outline"
                  onClick={handleCancelAdd}
                  disabled={isProcessing}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddItem}
                  disabled={isProcessing}
                >
                  Add Item
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Confirmation Message - Show when items exist but aren't confirmed yet */}
        {lineItems.length > 0 && showActionButtons && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Step 1 Complete:</strong> Review your line items below, then click "Confirm & Create Products" to finalize.
            </p>
          </div>
        )}

        {/* Line Items Table - Only show when there are items */}
        {lineItems.length > 0 && (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24 text-center">Type</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lineItems.map((item, index) => (
                <TableRow key={index}>
                  <TableCell className="text-center">
                    <Badge variant={getTypeBadgeVariant(getItemType(item))} className="flex items-center justify-center space-x-1 mx-auto">
                      {getTypeIcon(getItemType(item))}
                      <span className="capitalize">{getItemType(item)}</span>
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
                        value={editingItem && 'amount' in editingItem ? editingItem.amount : (editingItem && 'total' in editingItem ? editingItem.total : 0)}
                        onChange={(e) => setEditingItem(prev => prev ? { ...prev, ...('amount' in prev ? { amount: parseFloat(e.target.value) || 0 } : { total: parseFloat(e.target.value) || 0 }) } : null)}
                        className="w-full"
                        min="0"
                        step="0.01"
                      />
                    ) : (
                      <div className="font-semibold text-green-700">
                        {formatCurrency(getItemAmount(item))}
                      </div>
                    )}
                  </TableCell>
                  
                  <TableCell>
                    {editingIndex === index ? (
                      <Input
                        type="date"
                        value={editingItem && 'date' in editingItem ? editingItem.date || '' : (editingItem && 'itemNumber' in editingItem ? editingItem.itemNumber : '')}
                        onChange={(e) => setEditingItem(prev => prev ? { ...prev, ...('date' in prev ? { date: e.target.value } : { itemNumber: e.target.value }) } : null)}
                        className="w-full"
                      />
                    ) : (
                      <div className="text-sm text-gray-600">
                        {getItemDate(item) ? formatDateDisplay(getItemDate(item)) : 'N/A'}
                      </div>
                    )}
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
                ))
                }
              </TableBody>
            </Table>
          </div>
        )}

        {/* Footer with Total and Action Buttons */}
        {lineItems.length > 0 && (
          <div className="mt-6 flex items-end justify-between">
            {/* Action Buttons - Left side */}
            {showActionButtons && (
              <div className="flex space-x-4">
                <Button
                  onClick={onSubmit}
                  disabled={isProcessing}
                  className="flex items-center space-x-2"
                  size="lg"
                >
                  {isProcessing ? (
                    <>
                      <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeOpacity="0.25"/>
                        <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" strokeOpacity="0.75"/>
                      </svg>
                      <span>Creating Products...</span>
                    </>
                  ) : (
                    <>
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="5,3 19,12 5,21" fill="currentColor"/>
                      </svg>
                      <span>Confirm & Create Products</span>
                    </>
                  )}
                </Button>
                
                <Button
                  onClick={onReset}
                  variant="outline"
                  disabled={isProcessing}
                  size="lg"
                  className="flex items-center space-x-2"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                    <path d="M3 3v5h5"/>
                  </svg>
                  <span>Start Over</span>
                </Button>
              </div>
            )}
            
            {/* Total - Right side */}
            <div className="text-right">
              <div className="text-2xl font-bold text-green-700">
                Total: {formatCurrency(totalAmount)}
              </div>
              <div className="text-sm text-gray-600">
                {retainersCount} retainer(s) • {deliverablesCount} deliverable(s)
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
