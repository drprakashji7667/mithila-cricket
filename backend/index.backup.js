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

app.get('/health', (req, res) => {
  res.json({
    ok: true,
    app: 'Mithila Cricket Backend'
  });
});

app.get('/players', async (req, res) => {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .order('performance', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.get('/teams', async (req, res) => {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.get('/matches', async (req, res) => {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .order('match_date', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.get('/donations', async (req, res) => {
  const { data, error } = await supabase
    .from('donations')
    .select('id, donor_name, amount, note, created_at')
    .eq('verified', true)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.listen(PORT, () => {
  console.log(`Mithila Cricket backend running on port ${PORT}`);
});
