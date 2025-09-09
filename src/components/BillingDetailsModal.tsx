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
import { Building2, CreditCard, Copy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { extractClientShortform } from '@/utils/invoiceHelpers';
import { generateDateBasedInvoiceNumber } from '@/utils/dateBasedInvoiceNumbering';
import { useToast } from '@/hooks/use-toast';

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
  custom_school_code?: string;
  custom_payment_terms_text?: string;
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
    custom_school_code: '',
    custom_payment_terms_text: '',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

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
        custom_school_code: '',
        custom_payment_terms_text: '',
      });
    }
    setErrors({});
  }, [billingInfo, opportunityId, companyName]);

  const handleInputChange = (field: keyof BillingInfo, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value as any }));
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
    const paymentTerms = formData.payment_terms;
    if (paymentTerms === '' || paymentTerms === undefined || paymentTerms === null) {
      newErrors.payment_terms = 'Payment terms is required';
    } else if (typeof paymentTerms === 'number' && (paymentTerms < 0 || paymentTerms > 365)) {
      newErrors.payment_terms = 'Payment terms must be between 0 and 365 days';
    }

    // Custom school code validation (optional but must be valid format if provided)
    if (formData.custom_school_code && formData.custom_school_code.trim()) {
      const schoolCode = formData.custom_school_code.trim();
      
      // Check for valid format: alphanumeric characters only, 2-10 characters
      if (!/^[A-Za-z0-9]+$/.test(schoolCode)) {
        newErrors.custom_school_code = 'School code must contain only letters and numbers';
      } else if (schoolCode.length < 2 || schoolCode.length > 10) {
        newErrors.custom_school_code = 'School code must be between 2-10 characters';
      }
    }

    // Custom payment terms validation (optional but reasonable length limit)
    if (formData.custom_payment_terms_text && formData.custom_payment_terms_text.trim()) {
      const paymentTermsText = formData.custom_payment_terms_text.trim();
      
      if (paymentTermsText.length > 200) {
        newErrors.custom_payment_terms_text = 'Payment terms text must be 200 characters or less';
      }
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
      // Ensure payment_terms is a number before saving
      const dataToSave = {
        ...formData,
        payment_terms: typeof formData.payment_terms === 'string' && formData.payment_terms === '' 
          ? 30 // Default to 30 if empty
          : Number(formData.payment_terms)
      };
      
      // Save the billing information first
      if (onSave) {
        await onSave(dataToSave);
      }
      
      // If a custom school code was provided and is different from the existing one, update existing invoice numbers
      const newCustomCode = formData.custom_school_code?.trim() || '';
      const existingCustomCode = billingInfo?.custom_school_code?.trim() || '';
      
      if (newCustomCode && newCustomCode !== existingCustomCode) {
        await updateExistingInvoiceNumbers(newCustomCode);
      } else {
        // Show success toast only if we're not updating invoice numbers (which shows its own toast)
        toast({
          title: "Billing Details Saved",
          description: "The billing information has been successfully updated.",
        });
      }
      
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving billing information:', error);
      toast({
        title: "Error Saving Billing Details",
        description: "Failed to save billing information. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const copyFromOrganization = () => {
    setFormData((prev) => ({
      ...prev,
      bill_to_name: prev.organization_name,
      bill_to_address: prev.organization_address,
      bill_to_contact_name: prev.organization_contact_name,
      bill_to_contact_email: prev.organization_contact_email,
    }));
  };

  const updateExistingInvoiceNumbers = async (customSchoolCode: string) => {
    try {
      // Get all existing invoice line items for this opportunity that have invoice numbers
      const { data: existingItems, error: fetchError } = await supabase
        .from('invoice_line_items')
        .select('id, invoice_number, billed_at')
        .eq('opportunity_id', opportunityId)
        .not('invoice_number', 'is', null)
        .not('billed_at', 'is', null)
        .is('act_deleted_at', null);

      if (fetchError) {
        console.error('Error fetching existing invoice items:', fetchError);
        return;
      }

      if (!existingItems || existingItems.length === 0) {
        console.log('No existing invoice items to update');
        return;
      }

      console.log(`Updating ${existingItems.length} existing invoice numbers with custom school code: ${customSchoolCode}`);
      
      // Show toast notification that updates are in progress
      toast({
        title: "Updating Invoice Numbers",
        description: `Updating ${existingItems.length} existing invoice numbers with custom school code...`,
      });

      // Get the new shortform using the custom school code
      const newShortform = extractClientShortform(companyName, customSchoolCode);
      
      // Get all existing invoice numbers for this shortform to avoid duplicates
      const { data: existingNumbers, error: numbersError } = await supabase
        .from('invoice_line_items')
        .select('invoice_number')
        .not('invoice_number', 'is', null)
        .like('invoice_number', `${newShortform}-%`);

      if (numbersError) {
        console.error('Error fetching existing invoice numbers:', numbersError);
        return;
      }

      const existingNumbersList = existingNumbers?.map(item => item.invoice_number).filter(Boolean) as string[] || [];
      
      // Update each item with new invoice number
      for (const item of existingItems) {
        if (!item.billed_at) continue;
        
        // Generate new invoice number with the custom school code
        const newInvoiceNumber = generateDateBasedInvoiceNumber(
          newShortform,
          item.billed_at,
          existingNumbersList
        );
        
        // Add this number to the list to avoid duplicates in the same batch
        existingNumbersList.push(newInvoiceNumber);
        
        // Update the database
        const { error: updateError } = await supabase
          .from('invoice_line_items')
          .update({ invoice_number: newInvoiceNumber })
          .eq('id', item.id);
          
        if (updateError) {
          console.error(`Error updating invoice number for item ${item.id}:`, updateError);
        } else {
          console.log(`Updated invoice number: ${item.invoice_number} → ${newInvoiceNumber}`);
        }
      }
      
      console.log('Completed updating existing invoice numbers');
      
      // Show success toast
      toast({
        title: "Invoice Numbers Updated",
        description: `Successfully updated ${existingItems.length} existing invoice numbers with custom school code "${customSchoolCode}".`,
      });
    } catch (error) {
      console.error('Error in updateExistingInvoiceNumbers:', error);
      toast({
        title: "Error Updating Invoice Numbers",
        description: "Failed to update existing invoice numbers. Please try again.",
        variant: "destructive"
      });
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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-medium">Bill To Details</h3>
              </div>
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={copyFromOrganization}
                className="h-7 px-2 text-xs"
                disabled={isSaving}
              >
                <Copy className="h-3 w-3 mr-1" />
                Copy from Organization
              </Button>
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
                  onChange={(e) => {
                    const value = e.target.value;
                    // Allow empty string during editing, otherwise parse the number
                    handleInputChange('payment_terms', value === '' ? '' : parseInt(value) || 0);
                  }}
                  className={errors.payment_terms ? 'border-red-300' : ''}
                />
                {errors.payment_terms && (
                  <p className="text-sm text-red-600">{errors.payment_terms}</p>
                )}
                <p className="text-xs text-muted-foreground">Enter number of days (e.g., 30 for Net 30)</p>
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="custom-school-code">Custom School Code (optional)</Label>
                <Input
                  id="custom-school-code"
                  value={formData.custom_school_code || ''}
                  onChange={(e) => handleInputChange('custom_school_code', e.target.value)}
                  placeholder="e.g., CSN, WSU, etc."
                  maxLength={10}
                  className={errors.custom_school_code ? 'border-red-300' : ''}
                />
                {errors.custom_school_code && (
                  <p className="text-sm text-red-600">{errors.custom_school_code}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Override auto-generated abbreviation for invoice numbers
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="custom-payment-terms">Custom Payment Terms (optional)</Label>
                <Textarea
                  id="custom-payment-terms"
                  value={formData.custom_payment_terms_text || ''}
                  onChange={(e) => handleInputChange('custom_payment_terms_text', e.target.value)}
                  placeholder="e.g., 1% 10 net 30, Due upon receipt, etc."
                  rows={3}
                  maxLength={200}
                  className={errors.custom_payment_terms_text ? 'border-red-300' : ''}
                />
                {errors.custom_payment_terms_text && (
                  <p className="text-sm text-red-600">{errors.custom_payment_terms_text}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  When provided, replaces "Net {'{payment_terms}'}" on invoices. Leave blank to use default format.
                </p>
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