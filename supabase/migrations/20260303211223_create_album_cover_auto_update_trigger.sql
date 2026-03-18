/*
  # Auto-Update Album Cover Photo

  1. Purpose
    - Automatically set album cover photo when first image is uploaded
    - Update cover photo when current cover is deleted
    - Ensure albums always have a cover photo if they contain images

  2. Trigger Logic
    - When an image is inserted into album_media:
      - If album has no cover photo, set it to the new image
    - When an image is deleted from album_media:
      - If the deleted image was the cover photo, pick another image as cover
      - If no images remain, clear the cover photo

  3. Security
    - Trigger runs with SECURITY DEFINER to bypass RLS
    - Only updates albums that the media belongs to
*/

-- Function to update album cover photo on insert
CREATE OR REPLACE FUNCTION update_album_cover_on_insert()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only update if it's an image and album has no cover
  IF NEW.media_type = 'image' THEN
    UPDATE albums
    SET cover_photo_url = NEW.media_url
    WHERE id = NEW.album_id
      AND cover_photo_url IS NULL;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Function to update album cover photo on delete
CREATE OR REPLACE FUNCTION update_album_cover_on_delete()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  current_cover text;
  new_cover text;
BEGIN
  -- Get the album's current cover photo
  SELECT cover_photo_url INTO current_cover
  FROM albums
  WHERE id = OLD.album_id;
  
  -- If the deleted media was the cover photo, find a new one
  IF current_cover = OLD.media_url THEN
    -- Find the first available image in the album
    SELECT media_url INTO new_cover
    FROM album_media
    WHERE album_id = OLD.album_id
      AND media_type = 'image'
      AND id != OLD.id
    ORDER BY display_order ASC, uploaded_at ASC
    LIMIT 1;
    
    -- Update the album cover (might be NULL if no images remain)
    UPDATE albums
    SET cover_photo_url = new_cover
    WHERE id = OLD.album_id;
  END IF;
  
  RETURN OLD;
END;
$$;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_update_album_cover_on_insert ON album_media;
DROP TRIGGER IF EXISTS trigger_update_album_cover_on_delete ON album_media;

-- Create trigger for insert
CREATE TRIGGER trigger_update_album_cover_on_insert
  AFTER INSERT ON album_media
  FOR EACH ROW
  EXECUTE FUNCTION update_album_cover_on_insert();

-- Create trigger for delete
CREATE TRIGGER trigger_update_album_cover_on_delete
  AFTER DELETE ON album_media
  FOR EACH ROW
  EXECUTE FUNCTION update_album_cover_on_delete();