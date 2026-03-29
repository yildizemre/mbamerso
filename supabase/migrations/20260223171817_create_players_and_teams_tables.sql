/*
  # MBA Futbol Takım Oluşturucu - Database Schema

  1. Yeni Tablolar
    - `players`
      - `id` (uuid, primary key)
      - `name` (text, oyuncu adı)
      - `gender` (text, cinsiyet: male/female)
      - `position` (text, pozisyon: GK/DEF/MID/FWD)
      - `rating` (integer, oyuncu gücü 1-100)
      - `is_favorite` (boolean, favori işareti)
      - `created_at` (timestamptz, oluşturma zamanı)
      - `user_id` (uuid, kullanıcı referansı)
    
    - `saved_teams`
      - `id` (uuid, primary key)
      - `name` (text, takım grubu adı)
      - `category` (text, kategori: mixed/male/female)
      - `team_size` (integer, takım büyüklüğü)
      - `created_at` (timestamptz, oluşturma zamanı)
      - `user_id` (uuid, kullanıcı referansı)
    
    - `team_players`
      - `id` (uuid, primary key)
      - `saved_team_id` (uuid, saved_teams referansı)
      - `team_number` (integer, takım numarası)
      - `team_name` (text, takım özel ismi)
      - `player_id` (uuid, players referansı)
      - `is_reserve` (boolean, yedek oyuncu mu)
      - `created_at` (timestamptz)

  2. Güvenlik
    - RLS aktif tüm tablolarda
    - Kullanıcılar sadece kendi verilerini görebilir ve değiştirebilir
*/

-- Players tablosu
CREATE TABLE IF NOT EXISTS players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  gender text NOT NULL CHECK (gender IN ('male', 'female')),
  position text NOT NULL DEFAULT 'MID' CHECK (position IN ('GK', 'DEF', 'MID', 'FWD')),
  rating integer NOT NULL DEFAULT 50 CHECK (rating >= 1 AND rating <= 100),
  is_favorite boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Saved teams tablosu
CREATE TABLE IF NOT EXISTS saved_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('mixed', 'male', 'female')),
  team_size integer NOT NULL DEFAULT 11,
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Team players tablosu
CREATE TABLE IF NOT EXISTS team_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  saved_team_id uuid REFERENCES saved_teams(id) ON DELETE CASCADE NOT NULL,
  team_number integer NOT NULL,
  team_name text DEFAULT '',
  player_id uuid REFERENCES players(id) ON DELETE CASCADE NOT NULL,
  is_reserve boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Indexler
CREATE INDEX IF NOT EXISTS players_user_id_idx ON players(user_id);
CREATE INDEX IF NOT EXISTS players_position_idx ON players(position);
CREATE INDEX IF NOT EXISTS players_is_favorite_idx ON players(is_favorite);
CREATE INDEX IF NOT EXISTS saved_teams_user_id_idx ON saved_teams(user_id);
CREATE INDEX IF NOT EXISTS team_players_saved_team_id_idx ON team_players(saved_team_id);

-- RLS Policies

-- Players table RLS
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own players"
  ON players FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own players"
  ON players FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own players"
  ON players FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own players"
  ON players FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Saved teams table RLS
ALTER TABLE saved_teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own saved teams"
  ON saved_teams FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved teams"
  ON saved_teams FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own saved teams"
  ON saved_teams FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved teams"
  ON saved_teams FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Team players table RLS
ALTER TABLE team_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own team players"
  ON team_players FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM saved_teams
      WHERE saved_teams.id = team_players.saved_team_id
      AND saved_teams.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own team players"
  ON team_players FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM saved_teams
      WHERE saved_teams.id = team_players.saved_team_id
      AND saved_teams.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own team players"
  ON team_players FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM saved_teams
      WHERE saved_teams.id = team_players.saved_team_id
      AND saved_teams.user_id = auth.uid()
    )
  );
