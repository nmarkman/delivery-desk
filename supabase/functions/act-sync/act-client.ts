import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { 
  UserActConnection, 
  ActApiResponse, 
  ActOpportunity, 
  ActTask,
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

    // Decrypt password and prepare credentials
    const password = decryptPassword(connection.act_password_encrypted);
    const credentials = btoa(`${connection.act_username}:${password}`);
    
    // Construct API URL
    const baseUrl = connection.api_base_url || `https://api${connection.act_region}.act.com`;
    const authorizeUrl = connection.api_base_url 
      ? `${connection.api_base_url}/authorize`
      : `${baseUrl}/act.web.api/authorize`;
    
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
  retryCount = 0
): Promise<ActApiResponse<T>> {
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

    // Construct URL
    const baseUrl = connection.api_base_url || `https://api${connection.act_region}.act.com`;
    const apiUrl = endpoint.replace('https://apius.act.com', baseUrl.replace('/act.web.api', ''));

    // Make the API call
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${bearerToken}`,
        "Act-Database-Name": connection.act_database_name
      }
    });

    await incrementApiCallCount(connection.id);

    // Handle 401 Unauthorized with token refresh
    if (response.status === 401 && retryCount < maxRetries) {
      console.log(`Received 401 for user ${connection.user_id}, refreshing token and retrying...`);
      tokenCache.delete(connection.user_id);
      return makeApiCall(endpoint, connection, retryCount + 1);
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
  return makeApiCall('https://apius.act.com/act.web.api/api/opportunities', connection);
}

/**
 * Fetch tasks from Act! CRM
 */
async function getTasks(connection: UserActConnection): Promise<ActApiResponse<any[]>> {
  console.log(`Fetching tasks for user ${connection.user_id}...`);
  return makeApiCall('https://apius.act.com/act.web.api/api/tasks', connection);
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
    retryCount = 0
  ): Promise<ActApiResponse<T>> {
    return makeApiCall(endpoint, connection, retryCount);
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
    } = {}
  ): Promise<ActApiResponse<any>> {
    try {
      console.log(`Fetching and syncing opportunities for user ${connection.user_id}...`);
      
      // First fetch opportunities from Act! API
      const apiResult = await this.makeApiCall<ActOpportunity[]>(
        'https://apius.act.com/act.web.api/api/opportunities', 
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
   * Fetch and sync tasks to database
   */
  async syncTasksData(
    connection: UserActConnection,
    options: {
      batchSize?: number;
      logIntegration?: boolean;
      syncOnlyBillable?: boolean;
      filterActivityTypes?: string[];
    } = {}
  ): Promise<ActApiResponse<any>> {
    try {
      console.log(`Fetching and syncing tasks for user ${connection.user_id}...`);
      
      // First fetch tasks from Act! API
      const apiResult = await this.makeApiCall<ActTask[]>(
        'https://apius.act.com/act.web.api/api/tasks', 
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