// =================================
// OpenAI Client for Contract Upload
// =================================

/**
 * OpenAI API configuration and client utilities
 */

// Environment variables
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

/**
 * Validate OpenAI API configuration
 */
export function validateOpenAIConfig(): { valid: boolean; error?: string } {
  if (!OPENAI_API_KEY) {
    return {
      valid: false,
      error: 'OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.'
    };
  }

  if (!OPENAI_API_KEY.startsWith('sk-')) {
    return {
      valid: false,
      error: 'Invalid OpenAI API key format. Key should start with "sk-"'
    };
  }

  return { valid: true };
}

/**
 * OpenAI Vision API content types
 */
export interface OpenAITextContent {
  type: 'text';
  text: string;
}

export interface OpenAIImageContent {
  type: 'image_url';
  image_url: {
    url: string;
    detail?: 'low' | 'high' | 'auto';
  };
}

export type OpenAIContent = string | Array<OpenAITextContent | OpenAIImageContent>;

/**
 * OpenAI API request interface
 */
export interface OpenAIRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: OpenAIContent;
  }>;
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: 'json_object' | 'text' };
}

/**
 * OpenAI API response interface
 */
export interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * OpenAI API error interface
 */
export interface OpenAIError {
  error: {
    message: string;
    type: string;
    param?: string;
    code?: string;
  };
}

/**
 * Call OpenAI API with proper error handling and retry logic
 */
export async function callOpenAI(
  request: OpenAIRequest,
  retries: number = 3
): Promise<OpenAIResponse> {
  const config = validateOpenAIConfig();
  if (!config.valid) {
    throw new Error(config.error);
  }

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`OpenAI API call attempt ${attempt}/${retries}`);

      const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json() as OpenAIError;
        throw new Error(`OpenAI API error (${response.status}): ${errorData.error.message}`);
      }

      const data = await response.json() as OpenAIResponse;
      
      // Validate response structure
      if (!data.choices || !data.choices[0]?.message?.content) {
        throw new Error('Invalid response structure from OpenAI API');
      }

      console.log(`OpenAI API call successful (attempt ${attempt})`);
      return data;

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`OpenAI API call failed (attempt ${attempt}):`, lastError.message);

      // Don't retry on certain errors
      if (lastError.message.includes('401') || lastError.message.includes('403')) {
        throw lastError; // Authentication errors shouldn't be retried
      }

      // Wait before retrying (exponential backoff)
      if (attempt < retries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Max 10 seconds
        console.log(`Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('OpenAI API call failed after all retries');
}

/**
 * Parse JSON response from OpenAI with error handling
 */
export function parseOpenAIJSONResponse(content: string): any {
  try {
    return JSON.parse(content);
  } catch (error) {
    console.error('Failed to parse OpenAI JSON response:', error);
    console.error('Raw content:', content);
    throw new Error(`Invalid JSON response from OpenAI: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Test OpenAI connection
 */
export async function testOpenAIConnection(): Promise<{ success: boolean; message: string }> {
  try {
    const config = validateOpenAIConfig();
    if (!config.valid) {
      return { success: false, message: config.error! };
    }

    const testRequest: OpenAIRequest = {
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant.'
        },
        {
          role: 'user',
          content: 'Respond with "OpenAI connection successful"'
        }
      ],
      max_tokens: 50
    };

    const response = await callOpenAI(testRequest, 1);
    const content = response.choices[0]?.message?.content;

    if (content && content.includes('successful')) {
      return { 
        success: true, 
        message: 'OpenAI connection test successful' 
      };
    } else {
      return { 
        success: false, 
        message: 'OpenAI connection test failed - unexpected response' 
      };
    }

  } catch (error) {
    return { 
      success: false, 
      message: `OpenAI connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}
