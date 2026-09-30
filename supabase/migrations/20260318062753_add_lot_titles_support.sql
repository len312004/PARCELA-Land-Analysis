/*
  # Add Custom Lot Titles Support

  1. Changes to Tables
    - `generated_lots`
      - Add `lot_title` (text, nullable) - Custom title for each lot/parcel

  2. Notes
    - Allows users to specify custom names for each generated lot
    - Titles are optional and will fall back to lot numbers if not provided
    - No restrictions on title format to allow maximum flexibility
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'generated_lots' AND column_name = 'lot_title'
  ) THEN
    ALTER TABLE generated_lots ADD COLUMN lot_title text;
  END IF;
END $$;