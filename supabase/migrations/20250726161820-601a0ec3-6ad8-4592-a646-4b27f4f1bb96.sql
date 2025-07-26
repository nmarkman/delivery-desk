-- Fix security issue: Set search_path for the function
ALTER FUNCTION public.update_updated_at_column() SET search_path = '';

-- The function needs to be more secure
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;