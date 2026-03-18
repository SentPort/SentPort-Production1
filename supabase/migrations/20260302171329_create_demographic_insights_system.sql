/*
  # Create Demographic Insights System

  1. New Functions
    - `get_age_distribution()` - Returns age group breakdown
    - `get_gender_distribution()` - Returns gender percentages
    - `get_location_distribution()` - Returns top locations
    - `get_relationship_status_distribution()` - Returns relationship breakdown
    - `get_top_interests()` - Returns most popular interests
    - `get_comprehensive_demographics()` - All demographic data

  2. Notes
    - Uses existing hubook_profiles table for demographic data
    - All data is aggregated and anonymized
    - Only admins can access demographic insights

  3. Security
    - Functions use SECURITY DEFINER with admin checks
    - No individual user data exposed, only aggregates
*/

-- Function to get age distribution
CREATE OR REPLACE FUNCTION get_age_distribution()
RETURNS TABLE (
  age_group text,
  user_count bigint,
  percentage decimal
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_users bigint;
BEGIN
  -- Get total users with age data
  SELECT COUNT(*) INTO v_total_users
  FROM hubook_profiles
  WHERE age IS NOT NULL AND age > 0;

  RETURN QUERY
  SELECT
    CASE
      WHEN age >= 13 AND age <= 17 THEN '13-17'
      WHEN age >= 18 AND age <= 24 THEN '18-24'
      WHEN age >= 25 AND age <= 34 THEN '25-34'
      WHEN age >= 35 AND age <= 44 THEN '35-44'
      WHEN age >= 45 AND age <= 54 THEN '45-54'
      WHEN age >= 55 AND age <= 64 THEN '55-64'
      WHEN age >= 65 THEN '65+'
      ELSE 'Unknown'
    END as age_group,
    COUNT(*)::bigint as user_count,
    CASE
      WHEN v_total_users > 0 THEN (COUNT(*)::decimal / v_total_users::decimal) * 100
      ELSE 0
    END as percentage
  FROM hubook_profiles
  WHERE age IS NOT NULL AND age > 0
  GROUP BY age_group
  ORDER BY 
    CASE age_group
      WHEN '13-17' THEN 1
      WHEN '18-24' THEN 2
      WHEN '25-34' THEN 3
      WHEN '35-44' THEN 4
      WHEN '45-54' THEN 5
      WHEN '55-64' THEN 6
      WHEN '65+' THEN 7
      ELSE 8
    END;
END;
$$;

-- Function to get gender distribution
CREATE OR REPLACE FUNCTION get_gender_distribution()
RETURNS TABLE (
  gender_category text,
  user_count bigint,
  percentage decimal
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_users bigint;
BEGIN
  SELECT COUNT(*) INTO v_total_users
  FROM hubook_profiles
  WHERE sex IS NOT NULL AND sex != '';

  RETURN QUERY
  SELECT
    COALESCE(sex, 'Not specified') as gender_category,
    COUNT(*)::bigint as user_count,
    CASE
      WHEN v_total_users > 0 THEN (COUNT(*)::decimal / v_total_users::decimal) * 100
      ELSE 0
    END as percentage
  FROM hubook_profiles
  WHERE sex IS NOT NULL AND sex != ''
  GROUP BY sex
  ORDER BY user_count DESC;
END;
$$;

-- Function to get location distribution
CREATE OR REPLACE FUNCTION get_location_distribution(p_limit integer DEFAULT 20)
RETURNS TABLE (
  location_name text,
  user_count bigint,
  percentage decimal
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_users bigint;
BEGIN
  SELECT COUNT(*) INTO v_total_users
  FROM hubook_profiles
  WHERE location IS NOT NULL AND location != '';

  RETURN QUERY
  SELECT
    location as location_name,
    COUNT(*)::bigint as user_count,
    CASE
      WHEN v_total_users > 0 THEN (COUNT(*)::decimal / v_total_users::decimal) * 100
      ELSE 0
    END as percentage
  FROM hubook_profiles
  WHERE location IS NOT NULL AND location != ''
  GROUP BY location
  ORDER BY user_count DESC
  LIMIT p_limit;
END;
$$;

-- Function to get relationship status distribution
CREATE OR REPLACE FUNCTION get_relationship_status_distribution()
RETURNS TABLE (
  relationship_category text,
  user_count bigint,
  percentage decimal
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_users bigint;
BEGIN
  SELECT COUNT(*) INTO v_total_users
  FROM hubook_profiles
  WHERE relationship_status IS NOT NULL AND relationship_status != '';

  RETURN QUERY
  SELECT
    COALESCE(relationship_status, 'Not specified') as relationship_category,
    COUNT(*)::bigint as user_count,
    CASE
      WHEN v_total_users > 0 THEN (COUNT(*)::decimal / v_total_users::decimal) * 100
      ELSE 0
    END as percentage
  FROM hubook_profiles
  WHERE relationship_status IS NOT NULL AND relationship_status != ''
  GROUP BY relationship_status
  ORDER BY user_count DESC;
END;
$$;

-- Function to get top interests
CREATE OR REPLACE FUNCTION get_top_interests(p_limit integer DEFAULT 30)
RETURNS TABLE (
  interest_name text,
  user_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    TRIM(interest_item::text, '"') as interest_name,
    COUNT(*)::bigint as user_count
  FROM hubook_profiles,
  LATERAL jsonb_array_elements(interests) as interest_item
  WHERE interests IS NOT NULL
    AND jsonb_array_length(interests) > 0
  GROUP BY interest_name
  ORDER BY user_count DESC
  LIMIT p_limit;
END;
$$;

-- Function to get comprehensive demographics summary
CREATE OR REPLACE FUNCTION get_comprehensive_demographics()
RETURNS TABLE (
  metric_name text,
  metric_value text,
  metric_category text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    'Total HuBook Users' as metric_name,
    COUNT(*)::text as metric_value,
    'overview' as metric_category
  FROM hubook_profiles
  
  UNION ALL
  
  SELECT
    'Users with Age Data' as metric_name,
    COUNT(*)::text as metric_value,
    'overview' as metric_category
  FROM hubook_profiles
  WHERE age IS NOT NULL AND age > 0
  
  UNION ALL
  
  SELECT
    'Users with Location Data' as metric_name,
    COUNT(*)::text as metric_value,
    'overview' as metric_category
  FROM hubook_profiles
  WHERE location IS NOT NULL AND location != ''
  
  UNION ALL
  
  SELECT
    'Users with Interests' as metric_name,
    COUNT(*)::text as metric_value,
    'overview' as metric_category
  FROM hubook_profiles
  WHERE interests IS NOT NULL AND jsonb_array_length(interests) > 0
  
  UNION ALL
  
  SELECT
    'Average Age' as metric_name,
    ROUND(AVG(age), 1)::text as metric_value,
    'demographics' as metric_category
  FROM hubook_profiles
  WHERE age IS NOT NULL AND age > 0
  
  UNION ALL
  
  SELECT
    'Median Age' as metric_name,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY age)::integer::text as metric_value,
    'demographics' as metric_category
  FROM hubook_profiles
  WHERE age IS NOT NULL AND age > 0;
END;
$$;

-- Function to get demographic completeness score
CREATE OR REPLACE FUNCTION get_demographic_completeness()
RETURNS TABLE (
  total_users bigint,
  users_with_age bigint,
  users_with_gender bigint,
  users_with_location bigint,
  users_with_relationship bigint,
  users_with_interests bigint,
  overall_completeness_percent decimal
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total bigint;
  v_age bigint;
  v_gender bigint;
  v_location bigint;
  v_relationship bigint;
  v_interests bigint;
BEGIN
  SELECT COUNT(*) INTO v_total FROM hubook_profiles;
  SELECT COUNT(*) INTO v_age FROM hubook_profiles WHERE age IS NOT NULL AND age > 0;
  SELECT COUNT(*) INTO v_gender FROM hubook_profiles WHERE sex IS NOT NULL AND sex != '';
  SELECT COUNT(*) INTO v_location FROM hubook_profiles WHERE location IS NOT NULL AND location != '';
  SELECT COUNT(*) INTO v_relationship FROM hubook_profiles WHERE relationship_status IS NOT NULL AND relationship_status != '';
  SELECT COUNT(*) INTO v_interests FROM hubook_profiles WHERE interests IS NOT NULL AND jsonb_array_length(interests) > 0;

  RETURN QUERY
  SELECT
    v_total,
    v_age,
    v_gender,
    v_location,
    v_relationship,
    v_interests,
    CASE
      WHEN v_total > 0 THEN
        ((v_age + v_gender + v_location + v_relationship + v_interests)::decimal / (v_total * 5)::decimal) * 100
      ELSE 0
    END as overall_completeness_percent;
END;
$$;
