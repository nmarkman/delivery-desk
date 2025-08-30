import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Building2, CreditCard } from 'lucide-react';

interface BillingInfo {
  id?: string;
  opportunity_id: string;
  organization_name: string;
  organization_address: string;
  organization_contact_name: string;
  organization_contact_email: string;
  bill_to_name: string;
  bill_to_address: string;
  bill_to_contact_name: string;
  bill_to_contact_email: string;
  payment_terms: number;
  po_number: string;
}

interface BillingDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  opportunityId: string;
  companyName: string;
  billingInfo?: BillingInfo | null;
  onSave?: (billingInfo: BillingInfo) => void;
}

export default function BillingDetailsModal({
  open,
  onOpenChange,
  opportunityId,
  companyName,
  billingInfo,
  onSave,
}: BillingDetailsModalProps) {
  const [formData, setFormData] = useState<BillingInfo>({
    opportunity_id: opportunityId,
    organization_name: '',
    organization_address: '',
    organization_contact_name: '',
    organization_contact_email: '',
    bill_to_name: '',
    bill_to_address: '',
    bill_to_contact_name: '',
    bill_to_contact_email: '',
    payment_terms: 30,
    po_number: '',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form data when modal opens or billingInfo changes
  useEffect(() => {
    if (billingInfo) {
      setFormData(billingInfo);
    } else {
      // Reset to defaults if no existing billing info
      setFormData({
        opportunity_id: opportunityId,
        organization_name: companyName || '',
        organization_address: '',
        organization_contact_name: '',
        organization_contact_email: '',
        bill_to_name: companyName || '',
        bill_to_address: '',
        bill_to_contact_name: '',
        bill_to_contact_email: '',
        payment_terms: 30,
        po_number: '',
      });
    }
    setErrors({});
  }, [billingInfo, opportunityId, companyName]);

  const handleInputChange = (field: keyof BillingInfo, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required fields validation
    const requiredFields = [
      'organization_name',
      'organization_address', 
      'organization_contact_name',
      'organization_contact_email',
      'bill_to_name',
      'bill_to_address',
      'bill_to_contact_name', 
      'bill_to_contact_email',
    ];

    requiredFields.forEach((field) => {
      if (!formData[field as keyof BillingInfo] || 
          String(formData[field as keyof BillingInfo]).trim() === '') {
        newErrors[field] = 'This field is required';
      }
    });

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.organization_contact_email && 
        !emailRegex.test(formData.organization_contact_email)) {
      newErrors.organization_contact_email = 'Please enter a valid email address';
    }
    if (formData.bill_to_contact_email && 
        !emailRegex.test(formData.bill_to_contact_email)) {
      newErrors.bill_to_contact_email = 'Please enter a valid email address';
    }

    // Payment terms validation
    if (formData.payment_terms < 0 || formData.payment_terms > 365) {
      newErrors.payment_terms = 'Payment terms must be between 0 and 365 days';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSaving(true);
    try {
      if (onSave) {
        await onSave(formData);
      }
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving billing information:', error);
      // Handle error - could add error state here
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Billing Details - {companyName}
          </DialogTitle>
          <DialogDescription>
            Configure billing information for this opportunity. This information will be used for invoice generation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Organization Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium">Organization Details</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="org-name">Organization Name *</Label>
                <Input
                  id="org-name"
                  value={formData.organization_name}
                  onChange={(e) => handleInputChange('organization_name', e.target.value)}
                  placeholder="Enter organization name"
                  className={errors.organization_name ? 'border-red-300' : ''}
                />
                {errors.organization_name && (
                  <p className="text-sm text-red-600">{errors.organization_name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="org-contact-name">Contact Name *</Label>
                <Input
                  id="org-contact-name"
                  value={formData.organization_contact_name}
                  onChange={(e) => handleInputChange('organization_contact_name', e.target.value)}
                  placeholder="Enter contact name"
                  className={errors.organization_contact_name ? 'border-red-300' : ''}
                />
                {errors.organization_contact_name && (
                  <p className="text-sm text-red-600">{errors.organization_contact_name}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="org-address">Organization Address *</Label>
                <Textarea
                  id="org-address"
                  value={formData.organization_address}
                  onChange={(e) => handleInputChange('organization_address', e.target.value)}
                  placeholder="Enter organization address"
                  rows={3}
                  className={errors.organization_address ? 'border-red-300' : ''}
                />
                {errors.organization_address && (
                  <p className="text-sm text-red-600">{errors.organization_address}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="org-email">Contact Email *</Label>
                <Input
                  id="org-email"
                  type="email"
                  value={formData.organization_contact_email}
                  onChange={(e) => handleInputChange('organization_contact_email', e.target.value)}
                  placeholder="Enter contact email"
                  className={errors.organization_contact_email ? 'border-red-300' : ''}
                />
                {errors.organization_contact_email && (
                  <p className="text-sm text-red-600">{errors.organization_contact_email}</p>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Bill To Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium">Bill To Details</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bill-to-name">Bill To Name *</Label>
                <Input
                  id="bill-to-name"
                  value={formData.bill_to_name}
                  onChange={(e) => handleInputChange('bill_to_name', e.target.value)}
                  placeholder="Enter billing contact name"
                  className={errors.bill_to_name ? 'border-red-300' : ''}
                />
                {errors.bill_to_name && (
                  <p className="text-sm text-red-600">{errors.bill_to_name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="bill-to-contact-name">Contact Name *</Label>
                <Input
                  id="bill-to-contact-name"
                  value={formData.bill_to_contact_name}
                  onChange={(e) => handleInputChange('bill_to_contact_name', e.target.value)}
                  placeholder="Enter contact name"
                  className={errors.bill_to_contact_name ? 'border-red-300' : ''}
                />
                {errors.bill_to_contact_name && (
                  <p className="text-sm text-red-600">{errors.bill_to_contact_name}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bill-to-address">Billing Address *</Label>
                <Textarea
                  id="bill-to-address"
                  value={formData.bill_to_address}
                  onChange={(e) => handleInputChange('bill_to_address', e.target.value)}
                  placeholder="Enter billing address"
                  rows={3}
                  className={errors.bill_to_address ? 'border-red-300' : ''}
                />
                {errors.bill_to_address && (
                  <p className="text-sm text-red-600">{errors.bill_to_address}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="bill-to-email">Contact Email *</Label>
                <Input
                  id="bill-to-email"
                  type="email"
                  value={formData.bill_to_contact_email}
                  onChange={(e) => handleInputChange('bill_to_contact_email', e.target.value)}
                  placeholder="Enter contact email"
                  className={errors.bill_to_contact_email ? 'border-red-300' : ''}
                />
                {errors.bill_to_contact_email && (
                  <p className="text-sm text-red-600">{errors.bill_to_contact_email}</p>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Payment Details Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Payment Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="payment-terms">Payment Terms (days) *</Label>
                <Input
                  id="payment-terms"
                  type="number"
                  min="0"
                  max="365"
                  value={formData.payment_terms}
                  onChange={(e) => handleInputChange('payment_terms', parseInt(e.target.value) || 0)}
                  placeholder="30"
                  className={errors.payment_terms ? 'border-red-300' : ''}
                />
                {errors.payment_terms && (
                  <p className="text-sm text-red-600">{errors.payment_terms}</p>
                )}
                <p className="text-xs text-muted-foreground">Default is 30 days (Net 30)</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="po-number">PO Number (optional)</Label>
                <Input
                  id="po-number"
                  value={formData.po_number}
                  onChange={(e) => handleInputChange('po_number', e.target.value)}
                  placeholder="Enter PO number if applicable"
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Details'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}