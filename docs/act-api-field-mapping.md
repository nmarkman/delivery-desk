# Act! to DeliveryDesk Field Mapping

**Generated:** July 26, 2025  
**Purpose:** Define exact mapping between Act! CRM fields and DeliveryDesk database requirements  

## 🎯 **DeliveryDesk Requirements → Act! Field Mapping**

### **📋 Client/Opportunity Information**

| DeliveryDesk Requirement | Act! Field | Type | Example | Notes |
|--------------------------|------------|------|---------|-------|
| **Client/Project Name** | `name` | String | `"Small Biz Financial Set up, Annual Retainer (demo)"` | Direct mapping |
| **Company Name** | `contacts[0].company` | String | `"MeatMarkets Inc (demo)"` | From first contact |
| **Primary Contact** | `contacts[0].displayName` | String | `"Chris Yang (demo)"` | From first contact |
| **Contact Email** | `contacts[0].emailAddress` | String | `"email@company.com"` | Available in contact data |
| **Unique Identifier** | `id` | GUID | `"1b1b47e3-13ec-44eb-a94b-94babddbdd77"` | Primary sync key |

### **💰 Financial Information**

| DeliveryDesk Requirement | Act! Field | Type | Example | Notes |
|--------------------------|------------|------|---------|-------|
| **Total Contract Value** | `productTotal` | Number | `2000.00` | Includes retainer + deliverables |
| **Monthly Retainer Amount** | **CUSTOM FIELD NEEDED** | Number | `500.00` | Monthly retainer amount (not total) |
| **Retainer Start Date** | **CUSTOM FIELD NEEDED** | Date | `"2025-01-01"` | When retainer billing begins |
| **Retainer End Date** | **CUSTOM FIELD NEEDED** | Date | `"2025-12-31"` | When retainer billing ends |
| **Weighted Value** | `weightedTotal` | Number | `1300.00` | Probability-adjusted (optional) |

### **📅 Contract Dates**

| DeliveryDesk Requirement | Act! Field | Type | Example | Notes |
|--------------------------|------------|------|---------|-------|
| **Contract Start Date** | `openDate` | Date | `"2025-06-26T00:00:00+00:00"` | When contract begins |
| **Contract End Date** | `estimatedCloseDate` | Date | `"2025-07-29T00:00:00+00:00"` | Expected end (may change) |
| **Actual Close Date** | `actualCloseDate` | Date | `"2025-07-03T00:00:00+00:00"` | When contract actually closed |

### **📊 Status & Tracking**

| DeliveryDesk Requirement | Act! Field | Type | Values | DeliveryDesk Logic |
|--------------------------|------------|------|--------|-------------------|
| **Opportunity Status** | `status` | Integer | `0`=Open, `1`=Won, `2`=Lost | Only sync Won (1) and Open (0) |
| **Win Probability** | `probability` | Integer | `0-100` | For forecasting (optional) |
| **Sync Status** | **CUSTOM FIELD NEEDED** | String | `"synced"`, `"pending"` | Track sync state |

## 🔧 **Custom Fields Strategy**

### **Required Custom Opportunity Fields**

Based on analysis, we need to create these retainer-specific custom fields in Act!:

| Custom Field | Purpose | Type | Example Values | Notes |
|--------------|---------|------|----------------|-------|
| `opportunity_field_2` | Monthly Retainer Amount | Currency | `500.00`, `1000.00`, `0.00` (if no retainer) | **Stores monthly amount directly** |
| `opportunity_field_3` | Retainer Start Date | Date | `"2025-01-01"`, `"2025-06-01"` | First month of billing |
| `opportunity_field_4` | Retainer End Date | Date | `"2025-12-31"`, `"2026-05-31"` | Last month of billing |
| `opportunity_field_5` | DeliveryDesk Sync Status | Text | `"synced"`, `"pending"`, `"error"` | Optional for debugging |
| `opportunity_field_6` | Last Sync Timestamp | Date | `"2025-07-26T19:00:00Z"` | Optional for tracking |

### **Optional Enhancement Fields**

| Custom Field | Purpose | Type | Example Values |
|--------------|---------|------|----------------|
| `opportunity_field_7` | Payment Terms | Text | `"Net 30"`, `"Net 15"` |
| `opportunity_field_8` | Retainer Notes | Text | `"Invoice by 1st of month"`, `"Quarterly billing"` |

## 📊 **Data Transformation Logic**

### **Retainer Processing Logic**

```javascript
// Extract retainer information from custom fields
function extractRetainerInfo(opportunity) {
  const monthlyRetainerAmount = parseFloat(opportunity.customFields.opportunity_field_2) || 0;
  const retainerStart = opportunity.customFields.opportunity_field_3;
  const retainerEnd = opportunity.customFields.opportunity_field_4;
  
  return {
    hasRetainer: monthlyRetainerAmount > 0,
    monthlyAmount: monthlyRetainerAmount, // Already monthly amount
    startDate: retainerStart ? new Date(retainerStart) : null,
    endDate: retainerEnd ? new Date(retainerEnd) : null
  };
}

// Calculate retainer billing periods for DeliveryDesk
function calculateRetainerBillingPeriods(retainerInfo) {
  if (!retainerInfo.hasRetainer || !retainerInfo.startDate || !retainerInfo.endDate) {
    return [];
  }
  
  const periods = [];
  const current = new Date(retainerInfo.startDate);
  const end = new Date(retainerInfo.endDate);
  
  while (current <= end) {
    periods.push({
      billingDate: new Date(current),
      amount: retainerInfo.monthlyAmount, // Use monthly amount directly
      description: `Monthly retainer - ${current.toLocaleDateString()}`
    });
    
    // Move to next month
    current.setMonth(current.getMonth() + 1);
  }
  
  return periods;
}
```

### **Opportunity Filtering Logic**

```javascript
// Only sync relevant opportunities
function shouldSyncOpportunity(opportunity) {
  // Include Won (1) and Open (0) opportunities
  if (![0, 1].includes(opportunity.status)) {
    return false;
  }
  
  // Must have contact information
  if (!opportunity.contacts || opportunity.contacts.length === 0) {
    return false;
  }
  
  // Must have financial value
  if (!opportunity.productTotal || opportunity.productTotal <= 0) {
    return false;
  }
  
  return true;
}
```

## 🎯 **Database Schema Mapping**

### **DeliveryDesk `opportunities` Table**

| Column | Act! Source | Transform | Required |
|--------|-------------|-----------|----------|
| `act_opportunity_id` | `id` | Direct | ✅ |
| `name` | `name` | Direct | ✅ |
| `company_name` | `contacts[0].company` | Direct | ✅ |
| `primary_contact` | `contacts[0].displayName` | Direct | ✅ |
| `contact_email` | `contacts[0].emailAddress` | Direct | ❌ |
| `total_contract_value` | `productTotal` | Direct | ✅ |
| `retainer_amount` | `opportunity_field_2` | Direct monthly amount (0 if no retainer) | ❌ |
| `retainer_start_date` | `opportunity_field_3` | Parse date | ❌ |
| `retainer_end_date` | `opportunity_field_4` | Parse date | ❌ |
| `contract_start_date` | `openDate` | Parse date | ✅ |
| `contract_end_date` | `estimatedCloseDate` | Parse date | ❌ |
| `status` | `status` | Map: 0→active, 1→completed | ✅ |
| `last_synced_at` | Generated | Current timestamp | ✅ |
| `act_raw_data` | Full object | JSON store | ❌ |

## ⚠️ **Data Quality Considerations**

### **Missing Data Handling**

| Scenario | Act! Data | DeliveryDesk Action |
|----------|-----------|---------------------|
| No contacts | `contacts: []` | Skip opportunity with warning |
| No company name | `contacts[0].company: null` | Use contact name as company |
| Zero contract value | `productTotal: 0` | Skip opportunity |
| Invalid dates | Malformed date strings | Log error, use current date |
| Missing custom fields | `opportunity_field_X: null` | Use calculated/default values |

### **Data Validation Rules**

1. **Contract Value**: Must be > 0
2. **Dates**: Start date must be <= end date  
3. **Contacts**: Must have at least one contact
4. **Retainer**: If custom field exists, use it; otherwise calculate
5. **Status**: Only sync status 0 (Open) and 1 (Won)

## 🔄 **Sync Strategy**

### **Initial Sync**
1. Fetch all opportunities with `status` in [0, 1]
2. Apply filtering logic
3. Transform fields according to mapping
4. Upsert to DeliveryDesk database
5. Update `opportunity_field_5` with sync timestamp

### **Incremental Sync**
1. Use `edited` date to find recently modified opportunities
2. Compare with `last_synced_at` in DeliveryDesk
3. Sync only changed records
4. Handle deletions (status = 2) by marking inactive

### **Conflict Resolution**
- **Act! is source of truth** for all mapped fields
- **DeliveryDesk manages** invoice/payment tracking
- **Custom fields** bridge the gap for missing data

---

**📝 Note:** This mapping assumes custom fields will be configured in the production Act! database. Field mapping should be validated with actual CRCG data before implementation. 