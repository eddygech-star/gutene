/*
# Fix search_path on update_updated_at function

1. Changes
   - Recreates the update_updated_at() function with an explicit search_path for security.
2. Security
   - Resolves the "Function Search Path Mutable" advisor warning.
*/

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
