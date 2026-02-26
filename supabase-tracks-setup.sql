-- ============================================================
-- Ready Sounds — Tracks Database Setup
-- Run this in: Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. CREATE TRACKS TABLE
CREATE TABLE IF NOT EXISTS tracks (
  id            SERIAL PRIMARY KEY,
  title         TEXT NOT NULL,
  artist        TEXT NOT NULL,
  genre         TEXT,
  bpm           INTEGER,
  duration      TEXT,
  energy        TEXT,
  moods         TEXT,
  use_cases     TEXT,
  similar_artists TEXT,
  best_moments  TEXT,
  stream_url    TEXT NOT NULL,
  artwork_url   TEXT,
  download_album TEXT,   -- override album folder for download URLs (null = auto-derive from stream_url)
  sort_order    INTEGER DEFAULT 0,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CREATE ALTERNATES TABLE
CREATE TABLE IF NOT EXISTS alternates (
  id            SERIAL PRIMARY KEY,
  track_id      INTEGER NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  stream_url    TEXT NOT NULL,
  duration      TEXT,
  download_album TEXT,
  sort_order    INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ROW LEVEL SECURITY (public read, no public write)
ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE alternates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read tracks"
  ON tracks FOR SELECT USING (true);

CREATE POLICY "Public can read alternates"
  ON alternates FOR SELECT USING (true);

-- ============================================================
-- 4. INSERT MAIN TRACKS
-- ============================================================

INSERT INTO tracks (id, title, artist, genre, bpm, duration, energy, moods, use_cases, similar_artists, best_moments, stream_url, artwork_url, sort_order, download_album) VALUES

(1,
 'Go, Now', 'Buck Moon',
 'dance, electronic, hip hop', 90, '1:09', 'very high',
 'energetic, confident, urban, gritty, motivational',
 'fitness class warmup, streetwear fashion show, youth sports highlight reel, skateboarding video, energy drink commercial',
 'Flume, ODESZA, Kaytranada, Diplo, LCD Soundsystem',
 'opening sequence, action montage, background energy, climactic moment, credits, workout sequences, fast-cut edits',
 'https://pub-fd4a6646ef594336bc5ad646a65a2625.r2.dev/audio/primum-electronic/buck-moon-go-now/buck-moon-go-now-full-preview.mp3',
 'https://pub-fd4a6646ef594336bc5ad646a65a2625.r2.dev/images/primum-electronic-cover.jpg',
 1, NULL),

(2,
 'Super Things', 'Buck Moon',
 'electronic, hip hop, trap, dub', 152, '4:00', 'high',
 'futuristic, innovative, sleek, upbeat, progressive',
 'tech product launch video, gaming highlight reel, innovation startup pitch deck, science future documentary, drone footage cityscape',
 'Daft Punk, Justice, The Chemical Brothers, Aphex Twin',
 'opening sequence, montage, background energy, product reveal, credits',
 'https://pub-fd4a6646ef594336bc5ad646a65a2625.r2.dev/audio/primum-electronic/buck-moon-super-things/buck-moon-super-things-full-preview.mp3',
 'https://pub-fd4a6646ef594336bc5ad646a65a2625.r2.dev/images/primum-electronic-cover.jpg',
 2, NULL),

(3,
 'Give Me Your Energy', 'Buck Moon',
 'electronic, dance, energetic, retro, indie', 95, '3:12', 'very high',
 'powerful, driving, intense, anthemic, motivational',
 'workout gym motivation video, sports team hype video, festival concert promo, energy drink commercial, marathon running event highlight',
 'The Prodigy, Pendulum, Knife Party, Zedd',
 'climactic moment, workout sequences, action montage, opening sequence, fast-cut edits',
 'https://pub-fd4a6646ef594336bc5ad646a65a2625.r2.dev/audio/primum-electronic/buck-moon-give-me-your-energy/buck-moon-give-me-your-energy-full-preview.mp3',
 'https://pub-fd4a6646ef594336bc5ad646a65a2625.r2.dev/images/primum-electronic-cover.jpg',
 3, NULL),

(4,
 'Snow', 'Buck Moon',
 'electronic, dance, strings, house, tech, progressive', 120, '5:18', 'high',
 'euphoric, driving, progressive, hypnotic, uplifting',
 'late night workout running video, luxury car commercial night driving, high-end cocktail bar lounge promo, urban nightlife time-lapse, afterparty club lifestyle vlog',
 'Tiësto early 2000s, Armin van Buuren, Paul van Dyk, Ferry Corsten, Above & Beyond',
 'climactic moment, dance floor montage, buildup sequences, festival crowd shots, euphoric peak moments',
 'https://pub-fd4a6646ef594336bc5ad646a65a2625.r2.dev/audio/primum-electronic/buck-moon-snow/buck-moon-snow-full-preview.mp3',
 'https://pub-fd4a6646ef594336bc5ad646a65a2625.r2.dev/images/primum-electronic-cover.jpg',
 4, NULL),

(5,
 'Swell', 'Buck Moon',
 'electronic, hip hop, trap, dub', 100, '3:36', 'medium',
 'breezy, carefree, sunny, relaxed, feel-good',
 'surf beach lifestyle video, travel vlog tropical destinations, summer festival promo, ocean water sports documentary, California coastal brand commercial',
 'Tycho, Washed Out, Toro y Moi, Poolside, Miami Horror',
 'background atmosphere, opening sequence, montage, feel-good moments, credits',
 'https://pub-fd4a6646ef594336bc5ad646a65a2625.r2.dev/audio/primum-electronic/buck-moon-swell/buck-moon-swell-full-preview.mp3',
 'https://pub-fd4a6646ef594336bc5ad646a65a2625.r2.dev/images/primum-electronic-cover.jpg',
 5, NULL),

(6,
 'I''ll Be There', 'Crane Flight',
 'afro beats, fun, dance, electro', 100, '2:21', 'high',
 'energetic, uplifting, fun, celebratory, vibrant',
 'African culture documentary, Lagos street party footage, workout motivation video, summer rooftop party promo, festival crowd hype reel',
 'Burna Boy, Wizkid, Davido, Tiwa Savage, Focalistic',
 'action montage, celebration scenes, party atmosphere, energetic transitions, crowd shots',
 'https://pub-fd4a6646ef594336bc5ad646a65a2625.r2.dev/audio/afro-beats-vol-1/crane-flight-ill-be-there/crane-flight-ill-be-there-full-preview.mp3',
 'https://pub-fd4a6646ef594336bc5ad646a65a2625.r2.dev/images/afro-beats-vol-1-cover.jpg',
 6, NULL),

(7,
 'Airborne', 'Buck Moon',
 'funk, house, pop, edm, dance', 95, '2:45', 'high',
 'energetic, fun, uplifting, funky, confident',
 'fitness workout montage, product launch video, sports highlight reel, fashion show runway, upbeat brand commercial',
 'Daft Punk, Purple Disco Machine, Chromeo, Breakbot, Oliver',
 'action sequences, energetic transitions, product reveals, dance segments, motivational moments',
 'https://pub-fd4a6646ef594336bc5ad646a65a2625.r2.dev/audio/primum-electronic/buck-moon-airborne/buck-moon-airborne-full-preview.mp3',
 'https://pub-fd4a6646ef594336bc5ad646a65a2625.r2.dev/images/primum-electronic-cover.jpg',
 7, NULL),

(8,
 'Spin My World', 'Buck Moon',
 'indie, electronic, lofi, pop', 95, '3:40', 'low-medium',
 'chill, happy, emotional, dreamy, relaxed',
 'coffee shop ambience video, study with me livestream, morning routine vlog, indie film soundtrack, reflective documentary',
 'ODESZA, Flume, Ford., Kasbo, Jai Wolf',
 'contemplative scenes, background atmosphere, introspective moments, calm transitions, peaceful sequences',
 'https://pub-fd4a6646ef594336bc5ad646a65a2625.r2.dev/audio/primum-electronic/buck-moon-spin-my-world/buck-moon-spin-my-world-full-preview.mp3',
 'https://pub-fd4a6646ef594336bc5ad646a65a2625.r2.dev/images/primum-electronic-cover.jpg',
 8, NULL),

(9,
 'Ice Skatin''', 'MallFlex',
 'funk, dance, pop', 95, '2:22', 'medium',
 'groovy, fun, smooth, confident, stylish',
 'retail shopping montage, fashion lookbook video, urban lifestyle vlog, streetwear brand promo, city night drive footage',
 'Anderson .Paak, Tom Misch, FKJ, Thundercat, Mac Ayres',
 'product reveals, smooth transitions, fashion sequences, confident moments, stylish montages',
 'https://pub-fd4a6646ef594336bc5ad646a65a2625.r2.dev/audio/mallflex-funky-mondays/mallflex-ice-skatin/mallflex-ice-skatin-full-preview.mp3',
 'https://pub-fd4a6646ef594336bc5ad646a65a2625.r2.dev/images/funky-munky.jpg',
 9,
 'funky-munky'),

(10,
 'My Love For You', 'Buck Moon',
 'dance, edm, house, pop, indie pop', 95, '3:20', 'medium',
 'euphoric, dreamy, sunset vibes, warm, blissful',
 'real estate luxury property video, sunset beach party footage, poolside resort lifestyle video, high-end hotel resort promo, summer sunset time-lapse',
 'EDX, Kaskade, Embrz, Ben Böhmer, Luttrell',
 'sunset sequences, romantic montage, beach scenes, wind-down moments, emotional buildup',
 'https://pub-fd4a6646ef594336bc5ad646a65a2625.r2.dev/audio/primum-electronic/buck-moon-my-love-for-you/buck-moon-my-love-for-you-full-preview.mp3',
 'https://pub-fd4a6646ef594336bc5ad646a65a2625.r2.dev/images/primum-electronic-cover.jpg',
 10, NULL),

(11,
 'Journey On The Radio', 'Buck Moon',
 'indie rock, electronic, indie, nu wave, pop', 160, '2:48', 'medium to high',
 'nostalgic, uplifting, adventurous, heartfelt, cinematic',
 'road trip driving montage, indie film coming-of-age scene, travel documentary, nostalgic flashback sequence, cross-country adventure vlog',
 'The War on Drugs, M83, MGMT, Phoenix, Tame Impala',
 'opening sequence, road trip montage, emotional peak, reflective moments, credits',
 'https://pub-fd4a6646ef594336bc5ad646a65a2625.r2.dev/audio/primum-electronic/buck-moon-journey-on-the-radio/buck-moon-journey-on-the-radio-full-preview.mp3',
 'https://pub-fd4a6646ef594336bc5ad646a65a2625.r2.dev/images/primum-electronic-cover.jpg',
 11, NULL),

(12,
 'His & Hers', 'Buck Moon',
 'electronic, indie, pop', 120, '3:00', 'medium to high',
 'sophisticated, sleek, stylish, contemporary, elegant',
 'fashion runway show, beauty cosmetics commercial, lifestyle brand campaign, luxury retail store promo, modern romance film scene',
 'CHVRCHES, Disclosure, Jessie Ware, FKA twigs, Robyn',
 'fashion montage, product reveal, opening sequence, stylish transitions, credits',
 'https://pub-fd4a6646ef594336bc5ad646a65a2625.r2.dev/audio/primum-electronic/buck-moon-his-&-hers/buck-moon-him-or-her-full-preview.mp3',
 'https://pub-fd4a6646ef594336bc5ad646a65a2625.r2.dev/images/primum-electronic-cover.jpg',
 12, NULL);

-- Reset the sequence so future inserts don't collide
SELECT setval('tracks_id_seq', 12);

-- ============================================================
-- 5. INSERT ALTERNATES
-- ============================================================

INSERT INTO alternates (track_id, title, stream_url, duration, sort_order) VALUES

-- Track 1: Go, Now
(1, 'Intro',  'https://pub-fd4a6646ef594336bc5ad646a65a2625.r2.dev/audio/primum-electronic/buck-moon-go-now/buck-moon-go-now-intro-main.mp3', '0:27', 1),
(1, 'Outro',  'https://pub-fd4a6646ef594336bc5ad646a65a2625.r2.dev/audio/primum-electronic/buck-moon-go-now/buck-moon-go-now-outro.mp3', '0:27', 2),

-- Track 2: Super Things
(2, 'Breakdown', 'https://pub-fd4a6646ef594336bc5ad646a65a2625.r2.dev/audio/primum-electronic/buck-moon-super-things/buck-moon-super-things-breakdown-preview.mp3', '1:08', 1),
(2, 'Intro',     'https://pub-fd4a6646ef594336bc5ad646a65a2625.r2.dev/audio/primum-electronic/buck-moon-super-things/buck-moon-super-things-intro-preview.mp3', '1:12', 2),
(2, 'Main Beat', 'https://pub-fd4a6646ef594336bc5ad646a65a2625.r2.dev/audio/primum-electronic/buck-moon-super-things/buck-moon-super-things-main-beat-preview.mp3', '1:00', 3),
(2, 'Outro',     'https://pub-fd4a6646ef594336bc5ad646a65a2625.r2.dev/audio/primum-electronic/buck-moon-super-things/buck-moon-super-things-outro-preview.mp3', '1:15', 4),

-- Track 3: Give Me Your Energy
(3, 'Intro',     'https://pub-fd4a6646ef594336bc5ad646a65a2625.r2.dev/audio/primum-electronic/buck-moon-give-me-your-energy/buck-moon-give-me-your-energy-intro.mp3', '1:08', 1),
(3, 'Breakdown', 'https://pub-fd4a6646ef594336bc5ad646a65a2625.r2.dev/audio/primum-electronic/buck-moon-give-me-your-energy/buck-moon-give-me-your-energy-breakdown.mp3', '1:25', 2),

-- Track 4: Snow
(4, 'Intro',      'https://pub-fd4a6646ef594336bc5ad646a65a2625.r2.dev/audio/primum-electronic/buck-moon-snow/buck-moon-snow-intro.mp3', '1:07', 1),
(4, 'Breakdown',  'https://pub-fd4a6646ef594336bc5ad646a65a2625.r2.dev/audio/primum-electronic/buck-moon-snow/buck-moon-snow-breakdown.mp3', '1:05', 2),
(4, 'Club Beat',  'https://pub-fd4a6646ef594336bc5ad646a65a2625.r2.dev/audio/primum-electronic/buck-moon-snow/buck-moon-snow-club-beat.mp3', '1:03', 3),
(4, 'Final Beat', 'https://pub-fd4a6646ef594336bc5ad646a65a2625.r2.dev/audio/primum-electronic/buck-moon-snow/buck-moon-snow-final-beat.mp3', '2:10', 4),

-- Track 5: Swell
(5, 'Intro',     'https://pub-fd4a6646ef594336bc5ad646a65a2625.r2.dev/audio/primum-electronic/buck-moon-swell/buck-moon-swell-intro.mp3', '0:24', 1),
(5, 'Breakdown', 'https://pub-fd4a6646ef594336bc5ad646a65a2625.r2.dev/audio/primum-electronic/buck-moon-swell/buck-moon-swell-breakdown.mp3', '0:24', 2),
(5, 'Bridge',    'https://pub-fd4a6646ef594336bc5ad646a65a2625.r2.dev/audio/primum-electronic/buck-moon-swell/buck-moon-swell-bridge.mp3', '0:43', 3),
(5, 'Main Beat', 'https://pub-fd4a6646ef594336bc5ad646a65a2625.r2.dev/audio/primum-electronic/buck-moon-swell/buck-moon-swell-main-beat.mp3', '0:46', 4),

-- Track 6: I'll Be There
(6, '15s', 'https://pub-fd4a6646ef594336bc5ad646a65a2625.r2.dev/audio/afro-beats-vol-1/crane-flight-ill-be-there/crane-flight-ill-be-there-15s.mp3', '0:15', 1),
(6, '30s', 'https://pub-fd4a6646ef594336bc5ad646a65a2625.r2.dev/audio/afro-beats-vol-1/crane-flight-ill-be-there/crane-flight-ill-be-there-30s.mp3', '0:30', 2),
(6, '60s', 'https://pub-fd4a6646ef594336bc5ad646a65a2625.r2.dev/audio/afro-beats-vol-1/crane-flight-ill-be-there/crane-flight-ill-be-there-60s.mp3', '1:00', 3),

-- Track 7: Airborne
(7, '30s',    'https://pub-fd4a6646ef594336bc5ad646a65a2625.r2.dev/audio/primum-electronic/buck-moon-airborne/buck-moon-airborne-30s.mp3', '0:30', 1),
(7, '30s v2', 'https://pub-fd4a6646ef594336bc5ad646a65a2625.r2.dev/audio/primum-electronic/buck-moon-airborne/buck-moon-airborne-30s-v2.mp3', '0:30', 2),
(7, '30s v3', 'https://pub-fd4a6646ef594336bc5ad646a65a2625.r2.dev/audio/primum-electronic/buck-moon-airborne/buck-moon-airborne-30s-v3.mp3', '0:30', 3),
(7, '30s v4', 'https://pub-fd4a6646ef594336bc5ad646a65a2625.r2.dev/audio/primum-electronic/buck-moon-airborne/buck-moon-airborne-30s-v4.mp3', '0:30', 4),
(7, '30s v5', 'https://pub-fd4a6646ef594336bc5ad646a65a2625.r2.dev/audio/primum-electronic/buck-moon-airborne/buck-moon-airborne-30s-v5.mp3', '0:30', 5),
(7, '60s',    'https://pub-fd4a6646ef594336bc5ad646a65a2625.r2.dev/audio/primum-electronic/buck-moon-airborne/buck-moon-airborne-60s.mp3', '1:00', 6),
(7, '60s v2', 'https://pub-fd4a6646ef594336bc5ad646a65a2625.r2.dev/audio/primum-electronic/buck-moon-airborne/buck-moon-airborne-60s-v2.mp3', '1:00', 7),
(7, '60s v3', 'https://pub-fd4a6646ef594336bc5ad646a65a2625.r2.dev/audio/primum-electronic/buck-moon-airborne/buck-moon-airborne-60s-v3.mp3', '1:00', 8),

-- Track 8: Spin My World
(8, 'Alternate', 'https://pub-fd4a6646ef594336bc5ad646a65a2625.r2.dev/audio/primum-electronic/buck-moon-spin-my-world/buck-moon-spin-my-world-alternate.mp3', '0:50', 1),
(8, 'Bridge',    'https://pub-fd4a6646ef594336bc5ad646a65a2625.r2.dev/audio/primum-electronic/buck-moon-spin-my-world/buck-moon-spin-my-world-bridge.mp3', '0:47', 2),
(8, 'Chorus',    'https://pub-fd4a6646ef594336bc5ad646a65a2625.r2.dev/audio/primum-electronic/buck-moon-spin-my-world/buck-moon-spin-my-world-chorus.mp3', '0:41', 3),

-- Track 9: Ice Skatin' (download_album override = funky-munky)
(9, '15s', 'https://pub-fd4a6646ef594336bc5ad646a65a2625.r2.dev/audio/mallflex-funky-mondays/mallflex-ice-skatin/mallflex-ice-skatin-15s.mp3', '0:15', 1),
(9, '30s', 'https://pub-fd4a6646ef594336bc5ad646a65a2625.r2.dev/audio/mallflex-funky-mondays/mallflex-ice-skatin/mallflex-ice-skatin-30s.mp3', '0:30', 2),
(9, '60s', 'https://pub-fd4a6646ef594336bc5ad646a65a2625.r2.dev/audio/mallflex-funky-mondays/mallflex-ice-skatin/mallflex-ice-skatin-60s.mp3', '1:00', 3),

-- Track 10: My Love For You
(10, 'Alternate (Instrumental)', 'https://pub-fd4a6646ef594336bc5ad646a65a2625.r2.dev/audio/primum-electronic/buck-moon-my-love-for-you/buck-moon-my-love-for-you-alternate-instrumental.mp3', '1:14', 1),
(10, 'Alternate',               'https://pub-fd4a6646ef594336bc5ad646a65a2625.r2.dev/audio/primum-electronic/buck-moon-my-love-for-you/buck-moon-my-love-for-you-alternate.mp3', '1:14', 2),
(10, 'Intro',                   'https://pub-fd4a6646ef594336bc5ad646a65a2625.r2.dev/audio/primum-electronic/buck-moon-my-love-for-you/buck-moon-my-love-for-you-intro.mp3', '0:44', 3),

-- Track 11: Journey On The Radio
(11, 'Alternate', 'https://pub-fd4a6646ef594336bc5ad646a65a2625.r2.dev/audio/primum-electronic/buck-moon-journey-on-the-radio/buck-moon-journey-on-the-radio-alternate.mp3', '2:17', 1),
(11, 'Intro',     'https://pub-fd4a6646ef594336bc5ad646a65a2625.r2.dev/audio/primum-electronic/buck-moon-journey-on-the-radio/buck-moon-journey-on-the-radio-intro.mp3', '1:33', 2),

-- Track 12: His & Hers
(12, 'Alternate (20s)', 'https://pub-fd4a6646ef594336bc5ad646a65a2625.r2.dev/audio/primum-electronic/buck-moon-his-&-hers/buck-moon-him-or-her-alternate-20.mp3', '0:20', 1),
(12, 'Alternate (30s)', 'https://pub-fd4a6646ef594336bc5ad646a65a2625.r2.dev/audio/primum-electronic/buck-moon-his-&-hers/buck-moon-him-or-her-alternate-30.mp3', '0:30', 2);

-- ============================================================
-- 6. UPDATE Ice Skatin' alternates with download_album override
-- ============================================================
UPDATE alternates
SET download_album = 'funky-munky'
WHERE track_id = 9;

-- ============================================================
-- Done! Verify with:
-- SELECT * FROM tracks ORDER BY sort_order;
-- SELECT * FROM alternates ORDER BY track_id, sort_order;
-- ============================================================
