import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  console.log('Edge Function called');
  
  const ACT_USERNAME = Deno.env.get('ACT_USERNAME');
  const ACT_PASSWORD = Deno.env.get('ACT_PASSWORD'); 
  const ACT_DATABASE_NAME = Deno.env.get('ACT_DATABASE_NAME');

  console.log('Environment variables check:');
  console.log('ACT_USERNAME:', ACT_USERNAME ? 'SET' : 'NOT SET');
  console.log('ACT_PASSWORD:', ACT_PASSWORD ? 'SET' : 'NOT SET');
  console.log('ACT_DATABASE_NAME:', ACT_DATABASE_NAME || 'NOT SET');

  if (!ACT_USERNAME || !ACT_PASSWORD || !ACT_DATABASE_NAME) {
    console.error('Missing environment variables');
    return new Response(
      JSON.stringify({ 
        error: 'Act! credentials not configured',
        missing: {
          username: !ACT_USERNAME,
          password: !ACT_PASSWORD,
          database: !ACT_DATABASE_NAME
        }
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  return new Response(
    JSON.stringify({ 
      message: 'Environment variables are configured',
      credentials_configured: true,
      database_name: ACT_DATABASE_NAME,
      username_set: !!ACT_USERNAME,
      password_set: !!ACT_PASSWORD
    }),
    { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}); 