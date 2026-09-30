/*
  # PARCELA Database Schema

  1. New Tables
    - `lot_input`
      - `id` (uuid, primary key)
      - `title` (text)
      - `description_type` (text) - 'rectangular' or 'irregular'
      - `length` (numeric, nullable) - for rectangular lots
      - `width` (numeric, nullable) - for rectangular lots
      - `lot_size` (numeric) - desired lot size in sqm
      - `total_area` (numeric) - computed total area
      - `number_of_lots` (integer) - number of lots generated
      - `created_at` (timestamptz)
    
    - `polygon_data`
      - `id` (uuid, primary key)
      - `lot_input_id` (uuid, foreign key)
      - `geojson` (jsonb) - polygon coordinates
      - `created_at` (timestamptz)
    
    - `generated_lots`
      - `id` (uuid, primary key)
      - `lot_input_id` (uuid, foreign key)
      - `lot_number` (integer)
      - `geojson` (jsonb) - lot polygon coordinates
      - `area` (numeric) - lot area in sqm
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for public access (conceptual MVP - can be restricted later)
*/

-- Create lot_input table
CREATE TABLE IF NOT EXISTS lot_input (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description_type text NOT NULL CHECK (description_type IN ('rectangular', 'irregular')),
  length numeric,
  width numeric,
  lot_size numeric NOT NULL,
  total_area numeric NOT NULL,
  number_of_lots integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create polygon_data table
CREATE TABLE IF NOT EXISTS polygon_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_input_id uuid NOT NULL REFERENCES lot_input(id) ON DELETE CASCADE,
  geojson jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create generated_lots table
CREATE TABLE IF NOT EXISTS generated_lots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_input_id uuid NOT NULL REFERENCES lot_input(id) ON DELETE CASCADE,
  lot_number integer NOT NULL,
  geojson jsonb NOT NULL,
  area numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE lot_input ENABLE ROW LEVEL SECURITY;
ALTER TABLE polygon_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_lots ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (MVP - for demonstration purposes)
-- In production, these should be restricted to authenticated users

CREATE POLICY "Allow public read access to lot_input"
  ON lot_input FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public insert access to lot_input"
  ON lot_input FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public read access to polygon_data"
  ON polygon_data FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public insert access to polygon_data"
  ON polygon_data FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public read access to generated_lots"
  ON generated_lots FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public insert access to generated_lots"
  ON generated_lots FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_polygon_data_lot_input_id ON polygon_data(lot_input_id);
CREATE INDEX IF NOT EXISTS idx_generated_lots_lot_input_id ON generated_lots(lot_input_id);