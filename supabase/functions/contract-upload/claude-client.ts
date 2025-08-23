// =================================
// Claude Client for PDF Processing
// =================================

/**
 * Claude API client for PDF processing
 * Uses Anthropic's native PDF support for better accuracy
 */

export interface ClaudeRequest {
  model: string;
  max_tokens: number;
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: Array<{
      type: 'text' | 'document';
      text?: string;
      source?: {
        type: 'url';
        url: string;
      };
    }>;
  }>;
}

export interface ClaudeResponse {
  id: string;
  type: string;
  role: string;
  content: Array<{
    type: 'text';
    text: string;
  }>;
  model: string;
  stop_reason: string;
  stop_sequence: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export interface ClaudeParsingResponse {
  line_items: Array<{
    type: 'retainer' | 'deliverable';
    name: string;
    amount: number;
    date: string | null;
    original_text: string;
    description?: string;
    quantity?: number;
  }>;
  total_items: number;
  confidence: number;
  summary?: string;
}

/**
 * Validate Claude API configuration
 */
export function validateClaudeConfig(): { valid: boolean; error?: string } {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  
  if (!apiKey) {
    return { valid: false, error: 'ANTHROPIC_API_KEY environment variable is not set' };
  }
  
  if (!apiKey.startsWith('sk-ant-')) {
    return { valid: false, error: 'ANTHROPIC_API_KEY must start with sk-ant-' };
  }
  
  return { valid: true };
}

/**
 * Call Claude API with PDF document
 */
export async function callClaude(request: ClaudeRequest): Promise<ClaudeResponse> {
  const config = validateClaudeConfig();
  if (!config.valid) {
    throw new Error(config.error);
  }
  
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')!;
  
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(request),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `Claude API error (${response.status}): ${response.statusText}`;
    
    try {
      const errorData = JSON.parse(errorText);
      if (errorData.error?.message) {
        errorMessage = `Claude API error: ${errorData.error.message}`;
      }
    } catch (e) {
      // If we can't parse the error, use the status text
    }
    
    throw new Error(errorMessage);
  }
  
  const data = await response.json();
  return data;
}

/**
 * Parse Claude JSON response
 */
export function parseClaudeJSONResponse(content: string): ClaudeParsingResponse {
  try {
    // Extract JSON from the response content
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in Claude response');
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    // Validate the response structure
    if (!parsed.line_items || !Array.isArray(parsed.line_items)) {
      throw new Error('Invalid response structure: missing line_items array');
    }
    
    // Validate each line item
    for (const item of parsed.line_items) {
      // Check required fields
      if (!item.type || !item.name || typeof item.amount !== 'number' || !item.original_text) {
        throw new Error(`Invalid line item structure: ${JSON.stringify(item)}`);
      }
      
      // Check valid type
      if (!['retainer', 'deliverable'].includes(item.type)) {
        throw new Error(`Invalid line item type: ${item.type}`);
      }
      
      // Date validation: retainers should have dates, deliverables can have null dates
      if (item.type === 'retainer' && !item.date) {
        throw new Error(`Retainer line item missing required date: ${JSON.stringify(item)}`);
      }
      
      // If date is provided, it should be a string
      if (item.date !== null && typeof item.date !== 'string') {
        throw new Error(`Invalid date format in line item: ${JSON.stringify(item)}`);
      }
    }
    
    return parsed;
  } catch (error) {
    console.error('Failed to parse Claude JSON response:', error);
    throw new Error(`JSON parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Test Claude API connection
 */
export async function testClaudeConnection(): Promise<{ success: boolean; message: string }> {
  try {
    const config = validateClaudeConfig();
    if (!config.valid) {
      return { success: false, message: config.error! };
    }
    
    const request: ClaudeRequest = {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 100,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Hello! Please respond with "Connection successful" to confirm the API is working.'
            }
          ]
        }
      ]
    };
    
    const response = await callClaude(request);
    
    if (response.content && response.content.length > 0) {
      const text = response.content[0].text;
      if (text.toLowerCase().includes('connection successful')) {
        return { success: true, message: 'Claude API connection successful' };
      } else {
        return { success: true, message: `Claude API responded: ${text}` };
      }
    } else {
      return { success: false, message: 'No content received from Claude API' };
    }
  } catch (error) {
    return { 
      success: false, 
      message: `Claude API connection failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}
