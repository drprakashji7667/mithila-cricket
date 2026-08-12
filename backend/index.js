require('dotenv').config({ path: '../.env' });

const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

const supabase = createClient(
  'https://qjfazyaadmgzptabqjbu.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function adminKey(req, res, next) {
  const key = req.headers['x-admin-key'];

  if (!process.env.ADMIN_API_KEY || key !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
}

/* Health */
app.get('/health', (req, res) => {
  res.json({
    ok: true,
    app: 'Mithila Cricket Backend'
  });
});

/* Public: Players */
app.get('/players', async (req, res) => {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .order('performance', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

/* Public: Top 11 */
app.get('/players/top11', async (req, res) => {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .order('performance', { ascending: false })
    .limit(11);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

/* Public: Teams */
app.get('/teams', async (req, res) => {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

/* Public: Matches */
app.get('/matches', async (req, res) => {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .order('match_date', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

/* Public: Verified donations */
app.get('/donations', async (req, res) => {
  const { data, error } = await supabase
    .from('donations')
    .select('id, donor_name, amount, note, created_at')
    .eq('verified', true)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

/* Admin: Add player */
app.post('/admin/players', adminKey, async (req, res) => {
  const {
    name,
    photo_url,
    matches = 0,
    wins = 0,
    runs = 0,
    wickets = 0,
    performance = 0
  } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Player name required' });
  }

  const { data, error } = await supabase
    .from('players')
    .insert({
      name,
      photo_url,
      matches,
      wins,
      runs,
      wickets,
      performance,
      is_top11: false
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

/* Admin: Update player */
app.put('/admin/players/:id', adminKey, async (req, res) => {
  const allowed = [
    'name',
    'photo_url',
    'matches',
    'wins',
    'runs',
    'wickets',
    'performance',
    'is_top11'
  ];

  const update = {};

  for (const field of allowed) {
    if (req.body[field] !== undefined) {
      update[field] = req.body[field];
    }
  }

  const { data, error } = await supabase
    .from('players')
    .update(update)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

/* Admin: Delete player */
app.delete('/admin/players/:id', adminKey, async (req, res) => {
  const { error } = await supabase
    .from('players')
    .delete()
    .eq('id', req.params.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

/* Admin: Add team */
app.post('/admin/teams', adminKey, async (req, res) => {
  const { name, logo_url } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Team name required' });
  }

  const { data, error } = await supabase
    .from('teams')
    .insert({ name, logo_url })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

/* Admin: Add match */
app.post('/admin/matches', adminKey, async (req, res) => {
  const {
    team_a,
    team_b,
    match_date,
    venue,
    status = 'upcoming',
    winner,
    score_a,
    score_b
  } = req.body;

  const { data, error } = await supabase
    .from('matches')
    .insert({
      team_a,
      team_b,
      match_date,
      venue,
      status,
      winner,
      score_a,
      score_b
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

/* Admin: Add verified donation */
app.post('/admin/donations', adminKey, async (req, res) => {
  const {
    donor_name,
    amount,
    note = ''
  } = req.body;

  if (!donor_name || !amount) {
    return res.status(400).json({
      error: 'Donor name and amount required'
    });
  }

  const { data, error } = await supabase
    .from('donations')
    .insert({
      donor_name,
      amount,
      note,
      verified: true
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

/* Admin: Delete donation */
app.delete('/admin/donations/:id', adminKey, async (req, res) => {
  const { error } = await supabase
    .from('donations')
    .delete()
    .eq('id', req.params.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Mithila Cricket backend running on port ${PORT}`);
});
