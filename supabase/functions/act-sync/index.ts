import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Token cache to avoid unnecessary auth calls
interface TokenCache {
  token: string;
  issuedAt: number;
  expiresAt: number;
}

let cachedToken: TokenCache | null = null;

// Act! API authentication function with token caching
async function getActBearerToken(username: string, password: string, databaseName: string): Promise<string | null> {
  try {
    // Check if we have a valid cached token (refresh if older than 50 minutes)
    const now = Date.now();
    const fiftyMinutes = 50 * 60 * 1000;
    
    if (cachedToken && (now - cachedToken.issuedAt) < fiftyMinutes) {
      console.log("Using cached bearer token, age:", Math.floor((now - cachedToken.issuedAt) / 1000 / 60), "minutes");
      return cachedToken.token;
    }

    console.log("Obtaining new Act! bearer token...");
    const credentials = btoa(`${username}:${password}`);
    
    const response = await fetch("https://apius.act.com/act.web.api/authorize", {
      method: "GET",
      headers: {
        "Authorization": `Basic ${credentials}`,
        "Act-Database-Name": databaseName
      }
    });

    if (!response.ok) {
      console.error(`Act! authentication failed: ${response.status} ${response.statusText}`);
      cachedToken = null; // Clear invalid cache
      return null;
    }

    const bearerToken = await response.text();
    console.log("New bearer token obtained, length:", bearerToken.length);
    
    // Cache the token with current timestamp
    // Assume 1 hour expiration if not specified in JWT payload
    cachedToken = {
      token: bearerToken,
      issuedAt: now,
      expiresAt: now + (60 * 60 * 1000) // 1 hour default
    };
    
    return bearerToken;
  } catch (error) {
    console.error("Error obtaining Act! bearer token:", error);
    cachedToken = null; // Clear cache on error
    return null;
  }
}

// Enhanced API call function with automatic token refresh on 401
async function makeActApiCall(url: string, databaseName: string, retryCount = 0): Promise<Response | null> {
  const maxRetries = 2;
  
  if (retryCount > maxRetries) {
    console.error("Max retries exceeded for API call:", url);
    return null;
  }

  try {
    // Get credentials from environment
    const ACT_USERNAME = Deno.env.get("ACT_USERNAME");
    const ACT_PASSWORD = Deno.env.get("ACT_PASSWORD");
    
    if (!ACT_USERNAME || !ACT_PASSWORD) {
      console.error("Missing Act! credentials for API call");
      return null;
    }

    // Get bearer token (from cache or fresh)
    const bearerToken = await getActBearerToken(ACT_USERNAME, ACT_PASSWORD, databaseName);
    if (!bearerToken) {
      console.error("Failed to obtain bearer token for API call");
      return null;
    }

    // Make the API call
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${bearerToken}`,
        "Act-Database-Name": databaseName
      }
    });

    // If we get 401 Unauthorized, refresh token and retry
    if (response.status === 401 && retryCount < maxRetries) {
      console.log("Received 401, refreshing token and retrying...");
      cachedToken = null; // Force token refresh
      return makeActApiCall(url, databaseName, retryCount + 1);
    }

    return response;
  } catch (error) {
    console.error("Error making Act! API call:", error);
    return null;
  }
}

// Function to fetch and analyze opportunities data with token refresh
async function fetchOpportunitiesData(databaseName: string) {
  try {
    console.log("Fetching opportunities data...");
    
    const response = await makeActApiCall("https://apius.act.com/act.web.api/api/opportunities", databaseName);
    if (!response) {
      return { error: "Failed to make opportunities API call" };
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Opportunities API call failed: ${response.status} ${response.statusText}`);
      return { error: `${response.status}: ${errorText}` };
    }

    const opportunities = await response.json();
    console.log("Opportunities fetched successfully. Count:", opportunities.length);
    
    // Log structure analysis
    if (opportunities.length > 0) {
      const firstOpportunity = opportunities[0];
      console.log("Sample opportunity structure:");
      console.log("- ID:", firstOpportunity.id);
      console.log("- Name:", firstOpportunity.name);
      console.log("- Contact Names:", firstOpportunity.contactNames);
      console.log("- Product Total:", firstOpportunity.productTotal);
      console.log("- Custom Fields:", Object.keys(firstOpportunity.customFields || {}));
      console.log("- Contacts Array Length:", firstOpportunity.contacts?.length || 0);
      console.log("- Companies Array Length:", firstOpportunity.companies?.length || 0);
      console.log("- All Top-Level Keys:", Object.keys(firstOpportunity));
    }
    
    return {
      success: true,
      count: opportunities.length,
      opportunities: opportunities,
      sampleStructure: opportunities.length > 0 ? Object.keys(opportunities[0]) : []
    };
    
  } catch (error) {
    console.error("Error fetching opportunities:", error);
    return { error: error.message };
  }
}

// Function to fetch and analyze tasks data with token refresh
async function fetchTasksData(databaseName: string) {
  try {
    console.log("Fetching tasks data...");
    
    const response = await makeActApiCall("https://apius.act.com/act.web.api/api/tasks", databaseName);
    if (!response) {
      return { error: "Failed to make tasks API call" };
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Tasks API call failed: ${response.status} ${response.statusText}`);
      return { error: `${response.status}: ${errorText}` };
    }

    const tasks = await response.json();
    console.log("Tasks fetched successfully. Count:", tasks.length);
    
    // Log structure analysis
    if (tasks.length > 0) {
      const firstTask = tasks[0];
      console.log("Sample task structure:");
      console.log("- ID:", firstTask.id);
      console.log("- Subject:", firstTask.subject);
      console.log("- Activity Type Name:", firstTask.activityTypeName);
      console.log("- Start Time:", firstTask.startTime);
      console.log("- End Time:", firstTask.endTime);
      console.log("- Is Cleared:", firstTask.isCleared);
      console.log("- Is Alarmed:", firstTask.isAlarmed);
      console.log("- Contacts Array Length:", firstTask.contacts?.length || 0);
      console.log("- Opportunities Array Length:", firstTask.opportunities?.length || 0);
      console.log("- Companies Array Length:", firstTask.companies?.length || 0);
      console.log("- All Top-Level Keys:", Object.keys(firstTask));
    }
    
    return {
      success: true,
      count: tasks.length,
      tasks: tasks,
      sampleStructure: tasks.length > 0 ? Object.keys(tasks[0]) : []
    };
    
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return { error: error.message };
  }
}

serve(async (req) => {
  console.log("Edge Function called for Act! API analysis with token refresh");
  
  const ACT_USERNAME = Deno.env.get("ACT_USERNAME");
  const ACT_PASSWORD = Deno.env.get("ACT_PASSWORD"); 
  const ACT_DATABASE_NAME = Deno.env.get("ACT_DATABASE_NAME");

  if (!ACT_USERNAME || !ACT_PASSWORD || !ACT_DATABASE_NAME) {
    return new Response(
      JSON.stringify({ 
        error: "Act! credentials not configured" 
      }),
      { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }

  try {
    // Test initial authentication
    const bearerToken = await getActBearerToken(ACT_USERNAME, ACT_PASSWORD, ACT_DATABASE_NAME);
    
    if (!bearerToken) {
      return new Response(
        JSON.stringify({ 
          error: "Failed to obtain Act! bearer token"
        }),
        { 
          status: 500,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    // Fetch both opportunities and tasks data with automatic token refresh
    const [opportunitiesResult, tasksResult] = await Promise.all([
      fetchOpportunitiesData(ACT_DATABASE_NAME),
      fetchTasksData(ACT_DATABASE_NAME)
    ]);

    return new Response(
      JSON.stringify({ 
        message: "Act! API analysis completed with token refresh strategy",
        authentication: "successful",
        database_name: ACT_DATABASE_NAME,
        api_url: "https://apius.act.com/act.web.api",
        token_cache_status: cachedToken ? {
          age_minutes: Math.floor((Date.now() - cachedToken.issuedAt) / 1000 / 60),
          expires_in_minutes: Math.floor((cachedToken.expiresAt - Date.now()) / 1000 / 60)
        } : "no_cache",
        opportunities_data: opportunitiesResult,
        tasks_data: tasksResult
      }),
      { 
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ 
        error: "Analysis error with token refresh",
        details: error.message 
      }),
      { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}); 