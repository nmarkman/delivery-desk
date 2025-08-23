# Contract Upload Edge Function

This edge function handles PDF contract processing, AI parsing, and product creation for the contract upload feature.

## Environment Variables

The following environment variables must be configured:

### Required Variables

- `OPENAI_API_KEY`: Your OpenAI API key for AI parsing functionality
  - Must start with `sk-`
  - Used for extracting line items from contract PDFs

## Setup Instructions

1. **Create environment file:**
   ```bash
   # Create .env file in supabase directory
   echo "OPENAI_API_KEY=your-actual-api-key-here" > supabase/.env
   ```

2. **Deploy secrets to Supabase:**
   ```bash
   # Deploy all secrets from .env file
   supabase secrets set --env-file ./supabase/.env
   
   # Or set individual secrets
   supabase secrets set OPENAI_API_KEY=your-actual-api-key-here
   ```

3. **Verify configuration:**
   ```bash
   # List all secrets (will show names but not values)
   supabase secrets list
   ```

## Security Notes

- Never commit the `.env` file to version control
- The `.env` file should be added to `.gitignore`
- Use `supabase/.env.template` as a template for required variables
- Rotate API keys regularly for security

## Testing

To test the OpenAI integration:

```bash
# Test the edge function locally
supabase functions serve contract-upload

# Test OpenAI connection
curl -X POST http://localhost:54321/functions/v1/contract-upload/test-openai
```

## Error Handling

The function includes comprehensive error handling for:
- Missing or invalid API keys
- OpenAI API failures
- PDF processing errors
- Database operation failures

All errors are logged and returned with appropriate HTTP status codes.
