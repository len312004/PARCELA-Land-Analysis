/*
  # Update lot_input table for flexible sizing options

  1. Changes
    - Add `input_mode` column to specify whether user provided lot_size or number_of_lots
    - Make `lot_size` nullable since user might provide number_of_lots instead
    - Add `desired_number_of_lots` column for when user specifies lot count
    - Add `calculated_lot_size` for when system calculates it from number_of_lots

  2. Notes
    - Maintains backward compatibility with existing data
    - Supports both input methods: lot size or number of lots
*/

-- Add new columns for flexible sizing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lot_input' AND column_name = 'input_mode'
  ) THEN
    ALTER TABLE lot_input ADD COLUMN input_mode text CHECK (input_mode IN ('lot_size', 'number_of_lots'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lot_input' AND column_name = 'desired_number_of_lots'
  ) THEN
    ALTER TABLE lot_input ADD COLUMN desired_number_of_lots integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lot_input' AND column_name = 'calculated_lot_size'
  ) THEN
    ALTER TABLE lot_input ADD COLUMN calculated_lot_size numeric;
  END IF;
END $$;

-- Make lot_size nullable since user might provide number_of_lots instead
ALTER TABLE lot_input ALTER COLUMN lot_size DROP NOT NULL;