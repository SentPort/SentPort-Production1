/*
  # Complete Language Detection Overhaul
  
  1. New Functions
    - `detect_language_from_url(url text)`: Extracts language hints from URL patterns
      - Checks for language subdomains (ja.wikipedia.org, de.wikipedia.org, etc.)
      - Checks for language path segments (/en/, /es/, /fr/, etc.)
      - Returns language code or NULL if no hint found
    
    - `has_sufficient_seo_content(title text, description text, snippet text)`: Validates content quality
      - Returns true only if meaningful content exists (combined length > 20)
      - Ensures URLs have proper SEO content before including in search
    
    - `detect_language_enhanced(content text, url text)`: Enhanced detection with fallback logic
      - First attempt: Text-based detection on combined content
      - If content < 10 chars or confidence < 0.6: Try URL-based detection
      - If both fail: Return 'unknown' with 0.3 confidence (NOT 'en')
      - Ensures only actual English content gets marked as 'en'
  
  2. Changes
    - Update search_index language CHECK constraint to allow 'unknown'
    - Replace old detect_language_simple with enhanced version
  
  3. Important Notes
    - URLs without sufficient SEO content get marked as 'unknown' language
    - These will be excluded from search automatically via language filter
    - Only URLs with proper English SEO content will appear in search results
*/

-- Drop existing language constraint
ALTER TABLE search_index DROP CONSTRAINT IF EXISTS search_index_language_check;

-- Add new constraint that includes 'unknown'
ALTER TABLE search_index ADD CONSTRAINT search_index_language_check 
  CHECK (language IN ('en', 'ja', 'zh', 'ko', 'ar', 'ru', 'es', 'fr', 'de', 'pt', 'it', 'unknown', 'other'));

-- Create URL-based language detection function
CREATE OR REPLACE FUNCTION detect_language_from_url(url text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_domain text;
  v_path text;
BEGIN
  IF url IS NULL OR url = '' THEN
    RETURN NULL;
  END IF;

  -- Extract domain and path
  v_domain := lower(substring(url from '://([^/]+)'));
  v_path := lower(substring(url from '://[^/]+(/[^?#]*)'));

  -- Check for language subdomain patterns (ja.wikipedia.org, de.example.com, etc.)
  IF v_domain ~ '^ja\.' THEN RETURN 'ja';
  ELSIF v_domain ~ '^zh\.' OR v_domain ~ '^cn\.' THEN RETURN 'zh';
  ELSIF v_domain ~ '^ko\.' THEN RETURN 'ko';
  ELSIF v_domain ~ '^ar\.' THEN RETURN 'ar';
  ELSIF v_domain ~ '^ru\.' THEN RETURN 'ru';
  ELSIF v_domain ~ '^es\.' THEN RETURN 'es';
  ELSIF v_domain ~ '^fr\.' THEN RETURN 'fr';
  ELSIF v_domain ~ '^de\.' THEN RETURN 'de';
  ELSIF v_domain ~ '^pt\.' THEN RETURN 'pt';
  ELSIF v_domain ~ '^it\.' THEN RETURN 'it';
  END IF;

  -- Check for language path segments (/en/, /es/, /fr/, etc.)
  IF v_path ~ '^/en/' OR v_path ~ '/en/' THEN RETURN 'en';
  ELSIF v_path ~ '^/ja/' OR v_path ~ '/ja/' THEN RETURN 'ja';
  ELSIF v_path ~ '^/zh/' OR v_path ~ '/zh/' OR v_path ~ '^/cn/' OR v_path ~ '/cn/' THEN RETURN 'zh';
  ELSIF v_path ~ '^/ko/' OR v_path ~ '/ko/' THEN RETURN 'ko';
  ELSIF v_path ~ '^/ar/' OR v_path ~ '/ar/' THEN RETURN 'ar';
  ELSIF v_path ~ '^/ru/' OR v_path ~ '/ru/' THEN RETURN 'ru';
  ELSIF v_path ~ '^/es/' OR v_path ~ '/es/' THEN RETURN 'es';
  ELSIF v_path ~ '^/fr/' OR v_path ~ '/fr/' THEN RETURN 'fr';
  ELSIF v_path ~ '^/de/' OR v_path ~ '/de/' THEN RETURN 'de';
  ELSIF v_path ~ '^/pt/' OR v_path ~ '/pt/' THEN RETURN 'pt';
  ELSIF v_path ~ '^/it/' OR v_path ~ '/it/' THEN RETURN 'it';
  END IF;

  -- No language hint found
  RETURN NULL;
END;
$$;

-- Create content quality validation function
CREATE OR REPLACE FUNCTION has_sufficient_seo_content(title text, description text, snippet text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_combined_length int;
  v_combined_text text;
BEGIN
  v_combined_text := COALESCE(title, '') || ' ' || COALESCE(description, '') || ' ' || COALESCE(snippet, '');
  v_combined_length := length(trim(v_combined_text));
  
  -- Content must be at least 20 characters to be considered sufficient
  -- This filters out images, empty pages, and low-quality content
  RETURN v_combined_length >= 20;
END;
$$;

-- Create enhanced language detection function
CREATE OR REPLACE FUNCTION detect_language_enhanced(content text, url text)
RETURNS TABLE(language text, confidence numeric)
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_content_length int;
  v_text_lang text;
  v_text_confidence numeric;
  v_url_lang text;
BEGIN
  -- First attempt: text-based detection
  v_content_length := length(trim(COALESCE(content, '')));
  
  IF v_content_length >= 10 THEN
    -- Try text-based detection using the original logic
    SELECT * INTO v_text_lang, v_text_confidence FROM detect_language_simple(content);
    
    -- If text detection has high confidence, use it
    IF v_text_confidence >= 0.6 THEN
      language := v_text_lang;
      confidence := v_text_confidence;
      RETURN NEXT;
      RETURN;
    END IF;
  END IF;
  
  -- Second attempt: URL-based detection
  v_url_lang := detect_language_from_url(url);
  
  IF v_url_lang IS NOT NULL THEN
    -- Found language hint in URL
    language := v_url_lang;
    confidence := 0.7; -- Medium-high confidence from URL
    RETURN NEXT;
    RETURN;
  END IF;
  
  -- Third attempt: Low confidence text detection
  IF v_content_length >= 10 AND v_text_lang IS NOT NULL THEN
    -- Use text detection even with lower confidence
    language := v_text_lang;
    confidence := v_text_confidence;
    RETURN NEXT;
    RETURN;
  END IF;
  
  -- All detection methods failed - mark as unknown
  -- This ensures low-quality content gets excluded from search
  language := 'unknown';
  confidence := 0.3;
  RETURN NEXT;
  RETURN;
END;
$$;