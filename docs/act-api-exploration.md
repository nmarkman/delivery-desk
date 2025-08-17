# Act! CRM API Exploration Report

**Generated:** July 26, 2025  
**Project:** DeliveryDesk - Act! CRM Integration  
**API Version:** Act! Web API (US Region)  

## 🔗 **API Connection Details**

### **Base URLs & Authentication**
- **API Base URL:** `https://apius.act.com/act.web.api`
- **Authentication Endpoint:** `/authorize` (GET with Basic Auth)
- **Data Endpoints:** `/api/{resource}` (GET with Bearer token)
- **Required Header:** `Act-Database-Name: H72225153757`

### **Authentication Flow**
1. **Basic Auth** → Bearer Token: `GET /authorize` with `Authorization: Basic {base64(username:password)}`
2. **Bearer Token** → API Access: `Authorization: Bearer {jwt_token}`
3. **Token Caching:** Tokens valid for ~1 hour, refresh proactively at 50 minutes

---

## 📊 **Opportunities Data Structure**

**Endpoint:** `GET /api/opportunities`  
**Total Found:** 5 opportunities  
**Total Fields:** 37 fields per opportunity  

### **🔑 Key Fields for DeliveryDesk**

| Field | Type | Purpose | Example |
|-------|------|---------|---------|
| `id` | GUID | Unique identifier | `195a64f8-6329-4506-8eb2-2dd6fa8dfd1a` |
| `name` | String | Opportunity title | `"Vanderpelt Fitness - possible annual client"` |
| `productTotal` | Number | Contract/retainer amount | `5000.00` |
| `weightedTotal` | Number | Probability-adjusted value | `2600.00` |
| `contactNames` | String | Primary contacts summary | `"Bruce Vanderpelt (demo)"` |
| `openDate` | Date | Contract start date | `"2025-04-14T00:00:00+00:00"` |
| `estimatedCloseDate` | Date | Expected close date | `"2025-04-28T00:00:00+00:00"` |
| `actualCloseDate` | Date | Actual close date | `"2025-07-03T00:00:00+00:00"` |
| `status` | Integer | Opportunity status | `0` (Open), `1` (Won), `2` (Lost) |
| `probability` | Integer | Win probability % | `65` |

### **👥 Contact Integration**
```json
{
  "contacts": [
    {
      "id": "19bfc4c5-bf3a-4865-8b88-1bc4b8ccd993",
      "displayName": "Bruce Vanderpelt (demo)",
      "company": "Vanderpelt Fitness (demo)",
      "isInvited": true
    }
  ]
}
```

### **🎛️ Custom Fields (Available for Enhancement)**
- `opportunity_field_1` through `opportunity_field_8`
- **Current Status:** All null in demo data
- **Recommendation:** Use for retainer tracking, billing frequency, contract details

### **🏢 Company Relationship**
- **`companies` array:** Always empty in current data, but might not neccessarily be in CRCG production data.
- **Company info available via:** `contacts[].company` field
- **Conclusion:** No separate companies API call needed

---

## ✅ **Tasks Data Structure**

**Endpoint:** `GET /api/tasks`  
**Total Found:** 24 tasks (includes our test uploads!)  
**Total Fields:** 34 fields per task  

### **🏷️ Activity Types Discovered**

| Type | ID Range | Usage | DeliveryDesk Purpose |
|------|----------|-------|---------------------|
| `Meeting` | 1-4 | Built-in | Client meetings - might be able to ignore ingestion of these for what the tool needs|
| `Appointment` | 1-4 | Built-in | Scheduled appointments  - might be able to ignore ingestion of these for what the tool needs|
| `Call` | 1-4 | Built-in | Phone calls  - might be able to ignore ingestion of these for what the tool needs|
| `To-do` | 1-4 | Built-in | General tasks  - might be able to ignore ingestion of these for what the tool needs|
| `Billing` | 1000+ | **Custom** | **Invoice/payment tracking** ⭐ |

### **🔑 Key Task Fields**

| Field | Type | Purpose | Example |
|-------|------|---------|---------|
| `id` | String | Full task identifier | `8ec15509-fdf9-405e-b107-606e2802588007262025` |
| `seriesID` | GUID | Base task ID (for attachments) | `8ec15509-fdf9-405e-b107-606e28025880` |
| `subject` | String | Task title | `"Example billing task"` |
| `activityTypeName` | String | Task category | `"Billing"` |
| `activityTypeId` | Integer | Type ID (1000+ = custom) | `1000` |
| `isCleared` | Boolean | Completion status | `false` |
| `isAlarmed` | Boolean | Has reminder | `false` |
| `startTime` | Date | Scheduled start | `"2025-07-26T18:46:00+00:00"` |
| `endTime` | Date | Scheduled end | `"2025-07-26T18:46:00+00:00"` |
| `details` | HTML String | Task description | Rich text with HTML formatting |

### **🔗 Task Relationships**

**Linked to Opportunities:**
```json
{
  "opportunities": [
    {
      "id": "1b1b47e3-13ec-44eb-a94b-94babddbdd77",
      "name": "Small Biz Financial Set up, Annual Retainer (demo)"
    }
  ]
}
```

**Linked to Contacts:**
```json
{
  "contacts": [
    {
      "id": "a58016a6-780c-48c0-84ff-b6b6b085eb8c", 
      "displayName": "Nick Markman",
      "emailAddress": "nmarkman93@gmail.com",
      "isInvited": true
    }
  ]
}
```

---

## 📎 **File Attachment Capabilities**

### **Upload API** ✅ **CONFIRMED WORKING**

**Endpoint:** `POST /api/attachments/activities/{seriesID}`  
**Content-Type:** `multipart/form-data`  
**Field Name:** `file`  
**Authentication:** Bearer token + `Act-Database-Name` header  

### **Test Results**
✅ **Successfully uploaded:** `test_invoice.txt`  
✅ **HTTP 202 Accepted** response  
✅ **Immediate availability** in subsequent API calls  

### **Attachment Data Structure**
```json
{
  "attachment": {
    "displayName": "CRCG Example Client Invoice.pdf",
    "fileExtension": ".pdf",
    "fileName": "\\\\USP1-ACTSQL-10\\H72225153757-database files\\Attachments\\AttachmentsCRCG Example Client Invoice cdb5b5ba-f135-42ea-b1e5-434133d8152a.pdf",
    "fileSize": 164,
    "fileSizeDisplay": "164 KB", 
    "fileType": "PDF File",
    "lastModified": "2025-07-26T18:50:58+00:00",
    "personal": false
  }
}
```

### **File Management**
- **Unique Names:** Act! generates UUID-based filenames
- **Network Storage:** Files stored on Act! server infrastructure
- **Metadata Tracking:** Size, type, modification date automatically generated
- **Conflict Detection:** 409 error if attachment already exists (so a task has a 1:1 relationship with attachment)

---

## 🎯 **DeliveryDesk Integration Recommendations**

### **🗂️ Custom Opportunity Fields to Create**

Recommend using these custom fields for enhanced tracking:

1. **`opportunity_field_2`** → `"monthly_retainer_amount"` (stores monthly amount directly)
2. **`opportunity_field_3`** → `"retainer_start_date"` (first month of billing)  
3. **`opportunity_field_4`** → `"retainer_end_date"` (last month of billing)
4. **`opportunity_field_5`** → `"deliverydesk_sync_status"` (optional for debugging)
5. **`opportunity_field_6`** → `"last_sync_timestamp"` (optional for tracking)

### **📊 Data Mapping Strategy**

**Opportunities → DeliveryDesk Clients:**
- `id` → Primary key for sync
- `name` → Client/project name
- `productTotal` → Total contract value
- `contacts[0].company` → Company name
- `contacts[0].displayName` → Primary contact
- `opportunity_field_2` → Monthly retainer amount (stored directly)
- `opportunity_field_3` → Retainer start date (first month)
- `opportunity_field_4` → Retainer end date (last month)

**Tasks → DeliveryDesk Deliverables:**
- Filter by `activityTypeName` (custom types only)
- `seriesID` → Link for attachments
- `opportunities[]` → Link to client
- `isCleared` → Completion status
- `subject` + `details` → Deliverable description

---

## 🚀 **Future Enhancement Opportunities**

### **📄 Automated Invoice Management**
1. **Generate PDF invoices** in DeliveryDesk
2. **Create "Invoice Sent" task** in Act! linked to opportunity
3. **Upload PDF attachment** to task via API
4. **Track payment status** through task completion

### **🔔 Automated Reminders**
- Create "Payment Reminder" tasks for overdue invoices
- Set alarm dates for follow-up actions
- Link back to original invoice tasks

### **📈 Enhanced Reporting**
- Filter tasks by custom types for billing reports
- Track deliverable completion rates
- Analyze payment timing patterns

### **📁 Document Management**
- Store all invoice PDFs in Act! tasks
- Maintain complete audit trail
- Access documents through Act! mobile app

---

## ⚡ **API Performance & Limits**

### **Rate Limiting**
- **Status:** No explicit rate limits encountered during testing
- **Recommendation:** Implement 1-second delays between bulk operations
- **Monitoring:** Watch for 429 status codes in production

### **Token Management** 
- **Lifespan:** ~1 hour (estimated)
- **Strategy:** Proactive refresh at 50 minutes
- **Caching:** Implemented in Edge Function
- **Recovery:** Automatic 401 retry with token refresh

### **Data Volume**
- **Current:** 5 opportunities, 24 tasks
- **Performance:** Fast response times (<2 seconds)
- **Scalability:** Should handle typical small business volumes well

---

## 🎯 **Next Steps for Implementation**

1. **Create custom task type** in Act! trial account
2. **Configure custom opportunity fields** for retainer tracking  
3. **Design database schema** mapping Act! data to DeliveryDesk tables
4. **Implement sync logic** with upsert operations
5. **Build file attachment workflow** for invoice PDFs
6. **Set up automated daily sync** with error handling

---

**📝 Note:** This exploration used Act! trial account data. Production implementation should verify field availability and custom field configuration with the actual business Act! database. 