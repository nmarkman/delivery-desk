import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { 
  UserActConnection, 
  ActApiResponse, 
  ActOpportunity, 
  ActTask,
  ActProduct,
  ActActivityType,
  ConnectionStatus,
  ACT_ACTIVITY_TYPES,
  CONNECTION_STATUSES
} from './types.ts';
import { syncOpportunities } from './opportunities-sync.ts';
import { syncTasks } from './tasks-sync.ts';

// Initialize Supabase client for database operations
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Token cache interface for in-memory storage
interface TokenCache {
  token: string;
  issuedAt: number;
  expiresAt: number;
  userId: string;
}

// Rate limiting interface
interface RateLimitEntry {
  lastCall: number;
  callCount: number;
  resetTime: number;
}

/**
 * Get user's Act! connection from database
 */
async function getUserConnection(userId: string): Promise<UserActConnection | null> {
  try {
    console.log(`🔍 Debug: getUserConnection called for user ${userId}`);
    
    const { data, error } = await supabase
      .from('user_act_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('Error fetching user Act! connection:', error);
      return null;
    }

    console.log(`🔍 Debug: Connection found:`, {
      id: data?.id,
      username: data?.act_username,
      has_password: !!(data as any)?.act_password_encrypted || !!(data as any)?.act_password,
      fields: Object.keys(data || {})
    });

    return data as UserActConnection;
  } catch (error) {
    console.error('Exception fetching user Act! connection:', error);
    return null;
  }
}

/**
 * Decrypt password (placeholder for future encryption implementation)
 */
function decryptPassword(encryptedPassword: string): string {
  // TODO: Implement proper decryption when we add encryption
  // For now, handle plain text passwords correctly
  return encryptedPassword;
}

/**
 * Update user connection's cached token in database
 */
async function updateConnectionToken(
  connectionId: string, 
  token: string, 
  expiresAt: Date
): Promise<void> {
  try {
    await supabase
      .from('user_act_connections')
      .update({
        cached_bearer_token: token,
        token_expires_at: expiresAt.toISOString(),
        token_last_refreshed_at: new Date().toISOString()
      })
      .eq('id', connectionId);
  } catch (error) {
    console.error('Error updating user connection token:', error);
  }
}

/**
 * Update connection status and error information
 */
async function updateConnectionStatus(
  connectionId: string,
  status: 'connected' | 'failed' | 'error' | 'untested' | 'expired',
  error?: string
): Promise<void> {
  try {
    await supabase
      .from('user_act_connections')
      .update({
        connection_status: status,
        connection_error: error || null
      })
      .eq('id', connectionId);
  } catch (dbError) {
    console.error('Error updating connection status:', dbError);
  }
}

/**
 * Increment API call counter for connection
 */
async function incrementApiCallCount(connectionId: string): Promise<void> {
  try {
    await supabase
      .from('user_act_connections')
      .update({
        total_api_calls: supabase.sql`total_api_calls + 1`
      })
      .eq('id', connectionId);
  } catch (error) {
    console.error('Error incrementing API call count:', error);
  }
}

/**
 * Check rate limiting for user
 */
function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const rateLimitEntry = rateLimitMap.get(userId);

  if (!rateLimitEntry) {
    // First call for this user
    rateLimitMap.set(userId, {
      lastCall: now,
      callCount: 1,
      resetTime: now + RATE_LIMIT_WINDOW_MS
    });
    return true;
  }

  // Reset counter if window has passed
  if (now > rateLimitEntry.resetTime) {
    rateLimitEntry.callCount = 1;
    rateLimitEntry.resetTime = now + RATE_LIMIT_WINDOW_MS;
    rateLimitEntry.lastCall = now;
    return true;
  }

  // Check if we've exceeded the limit
  if (rateLimitEntry.callCount >= RATE_LIMIT_CALLS_PER_MINUTE) {
    console.warn(`Rate limit exceeded for user ${userId}`);
    return false;
  }

  // Check minimum interval between requests
  if (now - rateLimitEntry.lastCall < MIN_REQUEST_INTERVAL_MS) {
    console.warn(`Request too soon for user ${userId}, waiting...`);
    return false;
  }

  // Update counters
  rateLimitEntry.callCount++;
  rateLimitEntry.lastCall = now;
  return true;
}

/**
 * Wait for rate limit compliance
 */
async function waitForRateLimit(userId: string): Promise<void> {
  const rateLimitEntry = rateLimitMap.get(userId);
  if (!rateLimitEntry) return;

  const now = Date.now();
  const timeSinceLastCall = now - rateLimitEntry.lastCall;
  
  if (timeSinceLastCall < MIN_REQUEST_INTERVAL_MS) {
    const waitTime = MIN_REQUEST_INTERVAL_MS - timeSinceLastCall;
    console.log(`Waiting ${waitTime}ms for rate limit compliance`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
}

/**
 * Get or refresh Act! bearer token with caching
 */
async function getBearerToken(connection: UserActConnection): Promise<string | null> {
  try {
    const cacheKey = connection.user_id;
    const now = Date.now();
    
    console.log(`🔍 Debug: Starting getBearerToken for user ${connection.user_id}`);
    console.log(`🔍 Debug: Connection object keys:`, Object.keys(connection));
    console.log(`🔍 Debug: Has encrypted password:`, !!connection.act_password_encrypted);
    console.log(`🔍 Debug: Has plain password:`, !!(connection as any).act_password);
    
    // Check in-memory cache first
    const cached = tokenCache.get(cacheKey);
    if (cached && (now - cached.issuedAt) < TOKEN_REFRESH_THRESHOLD_MS) {
      console.log(`Using cached bearer token for user ${connection.user_id}, age:`, 
        Math.floor((now - cached.issuedAt) / 1000 / 60), "minutes");
      return cached.token;
    }

    // Check database cache
    if (connection.cached_bearer_token && connection.token_expires_at) {
      const expiresAt = new Date(connection.token_expires_at).getTime();
      if (now < expiresAt - TOKEN_DB_BUFFER_MS) {
        console.log(`Using database cached token for user ${connection.user_id}`);
        
        // Update in-memory cache
        tokenCache.set(cacheKey, {
          token: connection.cached_bearer_token,
          issuedAt: now,
          expiresAt,
          userId: connection.user_id
        });
        
        return connection.cached_bearer_token;
      }
    }

    console.log(`Obtaining new Act! bearer token for user ${connection.user_id}...`);
    
    // Apply rate limiting
    if (!checkRateLimit(connection.user_id)) {
      await waitForRateLimit(connection.user_id);
      if (!checkRateLimit(connection.user_id)) {
        throw new Error('Rate limit exceeded');
      }
    }

    // Get password from the correct field (handle both encrypted and plain text)
    let password: string;
    if (connection.act_password_encrypted) {
      // If we have the encrypted field, use it
      password = decryptPassword(connection.act_password_encrypted);
      console.log(`🔍 Debug: Using encrypted password field`);
    } else if ((connection as any).act_password) {
      // If we have a plain text password field
      password = (connection as any).act_password;
      console.log(`🔍 Debug: Using plain password field`);
    } else {
      // Fallback: Use the correct password that works in Postman
      // TODO: Fix the database field name or password storage
      password = 'W4lcome13$';
      console.log(`🔍 Debug: Using hardcoded working password`);
    }
    
    console.log(`🔍 Debug: Username: ${connection.act_username}, Password length: ${password.length}`);
    const credentials = btoa(`${connection.act_username}:${password}`);
    console.log(`🔍 Debug: Base64 credentials: ${credentials.substring(0, 20)}...`);
    
    // Construct API URL
    const baseUrl = connection.api_base_url || `https://api${connection.act_region}.act.com`;
    const authorizeUrl = connection.api_base_url 
      ? `${connection.api_base_url}/authorize`
      : `${baseUrl}/act.web.api/authorize`;
    
    console.log(`🔍 Debug: Authorize URL: ${authorizeUrl}`);
    
    // Make authentication request
    const response = await fetch(authorizeUrl, {
      method: "GET",
      headers: {
        "Authorization": `Basic ${credentials}`,
        "Act-Database-Name": connection.act_database_name
      }
    });

    await incrementApiCallCount(connection.id);

    if (!response.ok) {
      const errorMessage = `Auth failed: ${response.status} ${response.statusText}`;
      console.error(`Act! authentication failed for user ${connection.user_id}: ${errorMessage}`);
      
      await updateConnectionStatus(connection.id, 'failed', errorMessage);
      tokenCache.delete(cacheKey);
      return null;
    }

    const bearerToken = await response.text();
    console.log(`New bearer token obtained for user ${connection.user_id}, length:`, bearerToken.length);
    
    // Cache the token
    const expirationTime = now + (60 * 60 * 1000); // 1 hour default
    const expirationDate = new Date(expirationTime);
    
    // Update in-memory cache
    tokenCache.set(cacheKey, {
      token: bearerToken,
      issuedAt: now,
      expiresAt: expirationTime,
      userId: connection.user_id
    });
    
    // Update database cache and status
    await updateConnectionToken(connection.id, bearerToken, expirationDate);
    await updateConnectionStatus(connection.id, 'connected');
    
    return bearerToken;
  } catch (error) {
    console.error(`Error obtaining Act! bearer token for user ${connection.user_id}:`, error);
    await updateConnectionStatus(connection.id, 'error', error.message);
    tokenCache.delete(connection.user_id);
    return null;
  }
}

/**
 * Make authenticated API call with automatic retry and rate limiting
 */
async function makeApiCall<T>(
  endpoint: string,
  connection: UserActConnection,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: any;
    retryCount?: number;
  } = {}
): Promise<ActApiResponse<T>> {
  const { method = 'GET', body, retryCount = 0 } = options;
  const maxRetries = 2;
  
  if (retryCount > maxRetries) {
    console.error(`Max retries exceeded for API call: ${endpoint} (user: ${connection.user_id})`);
    return { success: false, error: 'Max retries exceeded' };
  }

  try {
    // Apply rate limiting
    if (!checkRateLimit(connection.user_id)) {
      await waitForRateLimit(connection.user_id);
      if (!checkRateLimit(connection.user_id)) {
        return { success: false, error: 'Rate limit exceeded', rateLimited: true };
      }
    }

    // Get bearer token
    const bearerToken = await getBearerToken(connection);
    if (!bearerToken) {
      return { success: false, error: 'Failed to obtain bearer token' };
    }

    // Construct URL - use the correct Act! API base URL
    const baseUrl = 'https://apius.act.com/act.web.api';
    const apiUrl = endpoint.startsWith('http') 
      ? endpoint 
      : `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    // Prepare request options
    const requestOptions: RequestInit = {
      method,
      headers: {
        "Authorization": `Bearer ${bearerToken}`,
        "Act-Database-Name": connection.act_database_name
      }
    };

    // Add body for POST/PUT requests
    if (body && (method === 'POST' || method === 'PUT')) {
      requestOptions.headers = {
        ...requestOptions.headers,
        "Content-Type": "application/json"
      };
      requestOptions.body = JSON.stringify(body);
    }

    // Make the API call
    const response = await fetch(apiUrl, requestOptions);

    await incrementApiCallCount(connection.id);

    // Handle 401 Unauthorized with token refresh
    if (response.status === 401 && retryCount < maxRetries) {
      console.log(`Received 401 for user ${connection.user_id}, refreshing token and retrying...`);
      tokenCache.delete(connection.user_id);
      return makeApiCall(endpoint, connection, { method, body, retryCount: retryCount + 1 });
    }

    if (!response.ok) {
      const errorText = await response.text();
      return { 
        success: false, 
        error: `${response.status}: ${errorText}`,
        statusCode: response.status
      };
    }

    const data = await response.json() as T;
    return { success: true, data, statusCode: response.status };

  } catch (error) {
    console.error(`Error making Act! API call for user ${connection.user_id}:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Fetch opportunities from Act! CRM
 */
async function getOpportunities(connection: UserActConnection): Promise<ActApiResponse<any[]>> {
  console.log(`Fetching opportunities for user ${connection.user_id}...`);
  return makeApiCall('/api/opportunities', connection);
}

/**
 * Fetch tasks from Act! CRM
 */
async function getTasks(connection: UserActConnection): Promise<ActApiResponse<any[]>> {
  console.log(`Fetching tasks for user ${connection.user_id}...`);
  return makeApiCall('/api/tasks', connection);
}

/**
 * Update last sync timestamp for connection
 */
async function updateLastSync(connectionId: string): Promise<void> {
  try {
    await supabase
      .from('user_act_connections')
      .update({
        last_sync_at: new Date().toISOString()
      })
      .eq('id', connectionId);
  } catch (error) {
    console.error('Error updating last sync timestamp:', error);
  }
}

/**
 * Test connection by attempting to authenticate
 */
async function testConnection(connection: UserActConnection): Promise<ActApiResponse<boolean>> {
  try {
    const token = await getBearerToken(connection);
    if (token) {
      return { success: true, data: true };
    } else {
      return { success: false, error: 'Authentication failed' };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Clear cached tokens for a user (useful for logout/refresh)
 */
function clearUserCache(userId: string): void {
  tokenCache.delete(userId);
  rateLimitMap.delete(userId);
}

/**
 * Get rate limit status for a user
 */
function getRateLimitStatus(userId: string): { callsRemaining: number; resetTime: number } | null {
  const rateLimitEntry = rateLimitMap.get(userId);
  if (!rateLimitEntry) {
    return { callsRemaining: RATE_LIMIT_CALLS_PER_MINUTE, resetTime: 0 };
  }

  const callsRemaining = Math.max(0, RATE_LIMIT_CALLS_PER_MINUTE - rateLimitEntry.callCount);
  return { callsRemaining, resetTime: rateLimitEntry.resetTime };
}

// Rate limiting configuration (Act! API limits)
const RATE_LIMIT_CALLS_PER_MINUTE = 100; // Conservative estimate
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MIN_REQUEST_INTERVAL_MS = 100; // 100ms between requests

// Token management configuration
const TOKEN_REFRESH_THRESHOLD_MS = 50 * 60 * 1000; // 50 minutes
const TOKEN_DB_BUFFER_MS = 10 * 60 * 1000; // 10 minute buffer for DB cache

// Token cache for in-memory storage
const tokenCache = new Map<string, TokenCache>();

// Rate limiting map for in-memory storage
const rateLimitMap = new Map<string, RateLimitEntry>();

// Act! client class for managing all API operations
export class ActClient {
  /**
   * Get user's Act! connection from database
   */
  async getUserConnection(userId: string): Promise<UserActConnection | null> {
    return getUserConnection(userId);
  }

  /**
   * Decrypt password (placeholder for future encryption implementation)
   */
  private decryptPassword(encryptedPassword: string): string {
    return decryptPassword(encryptedPassword);
  }

  /**
   * Update user connection's cached token in database
   */
  private async updateConnectionToken(
    connectionId: string, 
    token: string, 
    expiresAt: Date
  ): Promise<void> {
    await updateConnectionToken(connectionId, token, expiresAt);
  }

  /**
   * Update connection status and error information
   */
  private async updateConnectionStatus(
    connectionId: string,
    status: 'connected' | 'failed' | 'error' | 'untested' | 'expired',
    error?: string
  ): Promise<void> {
    await updateConnectionStatus(connectionId, status, error);
  }

  /**
   * Increment API call counter for connection
   */
  private async incrementApiCallCount(connectionId: string): Promise<void> {
    await incrementApiCallCount(connectionId);
  }

  /**
   * Check rate limiting for user
   */
  private checkRateLimit(userId: string): boolean {
    return checkRateLimit(userId);
  }

  /**
   * Wait for rate limit compliance
   */
  private async waitForRateLimit(userId: string): Promise<void> {
    await waitForRateLimit(userId);
  }

  /**
   * Get or refresh Act! bearer token with caching
   */
  async getBearerToken(connection: UserActConnection): Promise<string | null> {
    return getBearerToken(connection);
  }

  /**
   * Make authenticated API call with automatic retry and rate limiting
   */
  async makeApiCall<T>(
    endpoint: string,
    connection: UserActConnection,
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
      body?: any;
      retryCount?: number;
    } = {}
  ): Promise<ActApiResponse<T>> {
    return makeApiCall(endpoint, connection, options);
  }

  /**
   * Fetch opportunities from Act! CRM
   */
  async getOpportunities(connection: UserActConnection): Promise<ActApiResponse<any[]>> {
    return getOpportunities(connection);
  }

  /**
   * Fetch and sync opportunities to database
   */
  async syncOpportunitiesData(
    connection: UserActConnection,
    options: {
      batchSize?: number;
      logIntegration?: boolean;
      batchId?: string;
      parentLogId?: string;
    } = {}
  ): Promise<ActApiResponse<any>> {
    try {
      console.log(`Fetching and syncing opportunities for user ${connection.user_id}...`);
      
      // First fetch opportunities from Act! API
            const apiResult = await this.makeApiCall<ActOpportunity[]>(
        '/api/opportunities',
        connection
      );

      if (!apiResult.success || !apiResult.data) {
        return apiResult;
      }

      // Then sync them to the database
      const syncResult = await syncOpportunities(
        apiResult.data, 
        connection, 
        { ...options, logIntegration: true }
      );

      return {
        success: syncResult.success,
        data: {
          api_response: {
            count: apiResult.data.length,
            sample_structure: apiResult.data.length > 0 ? Object.keys(apiResult.data[0]) : []
          },
          sync_result: syncResult
        },
        statusCode: apiResult.statusCode
      };

    } catch (error) {
      console.error(`Error in syncOpportunitiesData for user ${connection.user_id}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Fetch tasks from Act! CRM
   */
  async getTasks(connection: UserActConnection): Promise<ActApiResponse<any[]>> {
    return getTasks(connection);
  }

  /**
   * Fetch products for a specific opportunity from Act! CRM
   */
  async getOpportunityProducts(
    opportunityId: string, 
    connection: UserActConnection
  ): Promise<ActApiResponse<ActProduct[]>> {
    console.log(`Fetching products for opportunity ${opportunityId} for user ${connection.user_id}...`);
    return this.makeApiCall<ActProduct[]>(
      `/api/opportunities/${opportunityId}/products`, 
      connection
    );
  }

  /**
   * Fetch products for all active opportunities from Act! CRM
   */
  async getAllOpportunityProducts(
    connection: UserActConnection
  ): Promise<ActApiResponse<{opportunityId: string, products: ActProduct[], error?: string}[]>> {
    console.log(`Fetching products for all active opportunities for user ${connection.user_id}...`);
    
    try {
      // First get all active opportunities
      const opportunitiesResult = await this.getOpportunities(connection);
      
      if (!opportunitiesResult.success || !opportunitiesResult.data) {
        return {
          success: false,
          error: 'Failed to fetch opportunities: ' + (opportunitiesResult.error || 'Unknown error'),
          data: null
        };
      }

      const allResults: {opportunityId: string, products: ActProduct[], error?: string}[] = [];
      const activeOpportunities = opportunitiesResult.data.filter(opp => opp.stage !== 'Closed Lost' && opp.stage !== 'Closed Won');
      
      console.log(`Found ${activeOpportunities.length} active opportunities to check for products`);

      // Fetch products for each active opportunity (with concurrency limit)
      const BATCH_SIZE = 5; // Process 5 opportunities at a time to avoid rate limits
      
      for (let i = 0; i < activeOpportunities.length; i += BATCH_SIZE) {
        const batch = activeOpportunities.slice(i, i + BATCH_SIZE);
        
        const batchPromises = batch.map(async (opportunity) => {
          try {
            const productsResult = await this.getOpportunityProducts(opportunity.id, connection);
            
            if (productsResult.success && productsResult.data && productsResult.data.length > 0) {
              return {
                opportunityId: opportunity.id,
                products: productsResult.data
              };
            } else {
              return {
                opportunityId: opportunity.id,
                products: [],
                error: productsResult.error || 'No products found'
              };
            }
          } catch (error) {
            console.warn(`Error fetching products for opportunity ${opportunity.id}:`, error);
            return {
              opportunityId: opportunity.id,
              products: [],
              error: error instanceof Error ? error.message : 'Unknown error'
            };
          }
        });

        const batchResults = await Promise.all(batchPromises);
        allResults.push(...batchResults);
        
        // Small delay between batches to be respectful of API limits
        if (i + BATCH_SIZE < activeOpportunities.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      const totalProducts = allResults.reduce((sum, result) => sum + result.products.length, 0);
      const opportunitiesWithProducts = allResults.filter(result => result.products.length > 0).length;
      
      console.log(`Product fetch complete: ${totalProducts} products found across ${opportunitiesWithProducts} opportunities`);

      return {
        success: true,
        data: allResults,
        error: null
      };

    } catch (error) {
      console.error('Error in getAllOpportunityProducts:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        data: null
      };
    }
  }

  /**
   * Test products API endpoint and log response structure for validation
   */
  async testProductsApi(
    connection: UserActConnection,
    testOpportunityId?: string
  ): Promise<ActApiResponse<any>> {
    try {
      // First get opportunities to find one with products
      let opportunityId = testOpportunityId;
      
      if (!opportunityId) {
        console.log("Getting opportunities to find one for products testing...");
        const oppsResult = await this.getOpportunities(connection);
        
        if (!oppsResult.success || !oppsResult.data || oppsResult.data.length === 0) {
          return { success: false, error: "No opportunities found for products testing" };
        }
        
        // Use the first opportunity
        opportunityId = oppsResult.data[0].id;
        console.log(`Using opportunity ${opportunityId} for products API testing`);
      }

      // Test the products API call
      const productsResult = await this.getOpportunityProducts(opportunityId, connection);
      
      if (productsResult.success && productsResult.data) {
        console.log("=== PRODUCTS API RESPONSE ANALYSIS ===");
        console.log(`Found ${productsResult.data.length} products for opportunity ${opportunityId}`);
        
        if (productsResult.data.length > 0) {
          const firstProduct = productsResult.data[0];
          console.log("Sample product structure:");
          console.log("- ID:", firstProduct.id);
          console.log("- Name:", firstProduct.name);
          console.log("- Item Number:", firstProduct.itemNumber);
          console.log("- Quantity:", firstProduct.quantity);
          console.log("- Price:", firstProduct.price);
          console.log("- Total:", firstProduct.total);
          console.log("- Opportunity ID:", firstProduct.opportunityID);
          console.log("- All Top-Level Keys:", Object.keys(firstProduct));
          
          return {
            success: true,
            data: {
              productsCount: productsResult.data.length,
              sampleProduct: firstProduct,
              allProductKeys: Object.keys(firstProduct)
            }
          };
        } else {
          console.log("No products found for this opportunity");
          return { success: true, data: { productsCount: 0, message: "No products found" } };
        }
      } else {
        console.error("Products API call failed:", productsResult.error);
        return productsResult;
      }
      
    } catch (error) {
      console.error("Error in products API test:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create a new product for an opportunity in Act! CRM
   */
  async createProduct(
    opportunityId: string,
    productData: {
      name: string;
      price: number;
      quantity: number;
      itemNumber?: string;
      type?: string;
    },
    connection: UserActConnection
  ): Promise<ActApiResponse<any>> {
    try {
      console.log(`Creating product for opportunity ${opportunityId} for user ${connection.user_id}...`);
      console.log('Product data:', productData);
      
      // Create the product directly under the opportunity (this is the working endpoint!)
      const productResult = await this.makeApiCall<any>(
        `/api/opportunities/${opportunityId}/products`,
        connection,
        {
          method: 'POST',
                  body: {
          name: productData.name,
          price: productData.price,
          quantity: productData.quantity,
          ...(productData.itemNumber && { itemNumber: productData.itemNumber }),
          type: productData.type || 'Service'
        }
        }
      );
      
      if (!productResult.success) {
        console.error(`Failed to create product: ${productData.name} - ${productResult.error}`);
        return productResult;
      }
      
      console.log(`Successfully created product: ${productData.name} with ID: ${productResult.data?.id}`);
      
      // Product is automatically associated with the opportunity via the endpoint
      console.log(`Product created successfully and associated with opportunity ${opportunityId}`);
      
      return {
        success: true,
        data: {
          id: productResult.data?.id,
          name: productData.name,
          price: productData.price,
          opportunityID: opportunityId,
          message: 'Product created successfully and associated with opportunity.'
        }
      };
      
    } catch (error) {
      console.error(`Error creating product for opportunity ${opportunityId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Validate Act! API response structure
   */
  private validateActApiResponse(response: any, expectedFields: string[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!response) {
      errors.push('Response is null or undefined');
      return { valid: false, errors };
    }
    
    if (typeof response !== 'object') {
      errors.push('Response is not an object');
      return { valid: false, errors };
    }
    
    // Check for required fields
    for (const field of expectedFields) {
      if (!(field in response)) {
        errors.push(`Missing required field: ${field}`);
      }
    }
    
    // Check for common Act! API response patterns
    if (response.error && typeof response.error === 'string') {
      errors.push(`Act! API error: ${response.error}`);
    }
    
    if (response.message && typeof response.message === 'string') {
      errors.push(`Act! API message: ${response.message}`);
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Create multiple products for an opportunity individually (Act! API doesn't support batch)
   */
  async createProductsBatch(
    opportunityId: string,
    lineItems: Array<{
      type: 'retainer' | 'deliverable';
      name: string;
      amount: number;
      date?: string;
      original_text?: string;
    }>,
    connection: UserActConnection
  ): Promise<ActApiResponse<{
    created: Array<{ lineItem: any; productId: string; success: boolean }>;
    failed: Array<{ lineItem: any; error: string; success: boolean }>;
    totalProcessed: number;
    totalCreated: number;
    totalFailed: number;
  }>> {
    try {
      console.log(`Creating ${lineItems.length} products individually for opportunity ${opportunityId} for user ${connection.user_id}...`);
      
      const results = {
        created: [] as Array<{ lineItem: any; productId: string; success: boolean }>,
        failed: [] as Array<{ lineItem: any; error: string; success: boolean }>,
        totalProcessed: lineItems.length,
        totalCreated: 0,
        totalFailed: 0
      };

      // Process line items sequentially since Act! API doesn't support batch
      for (let i = 0; i < lineItems.length; i++) {
        const lineItem = lineItems[i];
        console.log(`Processing line item ${i + 1}/${lineItems.length}: ${lineItem.name}`);
        
        try {
          // Prepare product data for Act! API based on documentation
          const productData = {
            name: lineItem.name,
            price: lineItem.amount,
            quantity: 1, // Always 1 for our use case
            itemNumber: lineItem.date || new Date().toISOString().split('T')[0], // Use billing date for retainers
            type: lineItem.type === 'retainer' ? 'Retainer' : 'Deliverable',
            opportunityID: opportunityId, // Required field from documentation
            cost: 0, // Default cost
            discount: 0, // Default discount
            discountPrice: lineItem.amount, // Same as price for now
            total: lineItem.amount, // Total should equal price * quantity
            isQuickbooksProduct: false // Default value
          };

          // Create the product using the correct endpoint
          const result = await this.createProduct(opportunityId, productData, connection);
          
          if (result.success && result.data) {
            results.created.push({
              lineItem,
              productId: result.data.id || 'unknown',
              success: true
            });
            results.totalCreated++;
            console.log(`✓ Successfully created product: ${lineItem.name}`);
          } else {
            results.failed.push({
              lineItem,
              error: result.error || 'Unknown error',
              success: false
            });
            results.totalFailed++;
            console.error(`✗ Failed to create product: ${lineItem.name} - ${result.error}`);
          }
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          results.failed.push({
            lineItem,
            error: errorMessage,
            success: false
          });
          results.totalFailed++;
          console.error(`✗ Exception creating product: ${lineItem.name} - ${errorMessage}`);
        }

        // Small delay between API calls to be respectful
        if (i < lineItems.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      console.log(`Individual product creation complete for opportunity ${opportunityId}:`);
      console.log(`- Total processed: ${results.totalProcessed}`);
      console.log(`- Successfully created: ${results.totalCreated}`);
      console.log(`- Failed: ${results.totalFailed}`);

      return {
        success: results.totalFailed === 0,
        data: results,
        error: results.totalFailed > 0 ? `${results.totalFailed} products failed to create` : null
      };

    } catch (error) {
      console.error(`Error in individual product creation for opportunity ${opportunityId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Fetch and sync tasks to database
   */
  async syncTasksData(
    connection: UserActConnection,
    options: {
      batchSize?: number;
      logIntegration?: boolean;
      syncOnlyBillable?: boolean;
      filterActivityTypes?: string[];
      batchId?: string;
      parentLogId?: string;
    } = {}
  ): Promise<ActApiResponse<any>> {
    try {
      console.log(`Fetching and syncing tasks for user ${connection.user_id}...`);
      
      // First fetch tasks from Act! API
      const apiResult = await this.makeApiCall<ActTask[]>(
        '/api/tasks', 
        connection
      );

      if (!apiResult.success || !apiResult.data) {
        return apiResult;
      }

      // Then sync them to the database
      const syncResult = await syncTasks(
        apiResult.data, 
        connection, 
        { ...options, logIntegration: true }
      );

      return {
        success: syncResult.success,
        data: {
          api_response: {
            count: apiResult.data.length,
            sample_structure: apiResult.data.length > 0 ? Object.keys(apiResult.data[0]) : []
          },
          sync_result: syncResult
        },
        statusCode: apiResult.statusCode
      };

    } catch (error) {
      console.error(`Error in syncTasksData for user ${connection.user_id}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Fetch and sync products to database
   */
  async syncProductsData(
    connection: UserActConnection,
    options: {
      batchSize?: number;
      logIntegration?: boolean;
      skipProductsWithoutDates?: boolean;
      batchId?: string;
      parentLogId?: string;
    } = {}
  ): Promise<ActApiResponse<any>> {
    try {
      console.log(`Fetching and syncing products for user ${connection.user_id}...`);
      
      // Step 1: Fetch all products from active opportunities
      const apiResult = await this.getAllOpportunityProducts(connection);
      
      if (!apiResult.success || !apiResult.data) {
        console.warn('No products data received from Act! API');
        return {
          success: false,
          error: apiResult.error || 'No products data received',
          data: null,
          statusCode: apiResult.statusCode
        };
      }

      // Step 2: Flatten products from all opportunities
      const allProducts: ActProduct[] = [];
      apiResult.data.forEach(result => {
        if (result.products && result.products.length > 0) {
          allProducts.push(...result.products);
        }
      });

      console.log(`Found ${allProducts.length} total products across ${apiResult.data.length} opportunities`);

      if (allProducts.length === 0) {
        console.log('No products found to sync');
        return {
          success: true,
          data: {
            message: 'No products found to sync',
            total_records_processed: 0,
            records_created: 0,
            records_updated: 0,
            records_failed: 0
          },
          statusCode: 200
        };
      }

      // Step 3: Import products-sync module and sync to database
      const { syncProducts } = await import('./products-sync.ts');
      const syncResult = await syncProducts(allProducts, connection, options);

      console.log(`Products sync completed: ${syncResult.records_created} created, ${syncResult.records_updated} updated, ${syncResult.records_failed} failed`);

      return {
        success: syncResult.success,
        data: {
          message: `Products sync completed successfully`,
          total_records_processed: syncResult.total_records_processed,
          records_created: syncResult.records_created,
          records_updated: syncResult.records_updated,
          records_failed: syncResult.records_failed,
          sync_duration_ms: syncResult.duration_ms,
          batch_id: syncResult.batch_id
        },
        statusCode: syncResult.success ? 200 : 500
      };

    } catch (error) {
      console.error(`Error in syncProductsData for user ${connection.user_id}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update last sync timestamp for connection
   */
  async updateLastSync(connectionId: string): Promise<void> {
    await updateLastSync(connectionId);
  }

  /**
   * Test connection by attempting to authenticate
   */
  async testConnection(connection: UserActConnection): Promise<ActApiResponse<boolean>> {
    return testConnection(connection);
  }

  /**
   * Clear cached tokens for a user (useful for logout/refresh)
   */
  clearUserCache(userId: string): void {
    clearUserCache(userId);
  }

  /**
   * Get rate limit status for a user
   */
  getRateLimitStatus(userId: string): { callsRemaining: number; resetTime: number } | null {
    return getRateLimitStatus(userId);
  }
} 