require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

const multer = require('multer');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf'
    ];

    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('Only JPG, PNG, WEBP or PDF files are allowed'));
    }

    cb(null, true);
  }
});


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

/* Test Match Registration */

/* Public: Register for Test Match */
app.post(
  '/test-match/register',
  upload.fields([
    { name: 'profile_photo', maxCount: 1 },
    { name: 'aadhaar', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const {
        name,
        mobile,
        dob,
        address,
        playing_role
      } = req.body;

      if (!name || !mobile) {
        return res.status(400).json({
          error: 'Name and mobile number are required'
        });
      }

      const files = req.files || {};
      const profilePhoto = files.profile_photo?.[0];
      const aadhaar = files.aadhaar?.[0];

      if (!profilePhoto) {
        return res.status(400).json({
          error: 'Profile photo is required'
        });
      }

      if (!aadhaar) {
        return res.status(400).json({
          error: 'Aadhaar document is required'
        });
      }

      const safeName = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      const timestamp = Date.now();

      const photoExt =
        profilePhoto.mimetype === 'image/png' ? 'png' :
        profilePhoto.mimetype === 'image/webp' ? 'webp' : 'jpg';

      const aadhaarExt =
        aadhaar.mimetype === 'application/pdf' ? 'pdf' :
        aadhaar.mimetype === 'image/png' ? 'png' :
        aadhaar.mimetype === 'image/webp' ? 'webp' : 'jpg';

      const photoPath =
        `profile-photos/${timestamp}-${safeName}.${photoExt}`;

      const aadhaarPath =
        `aadhaar/${timestamp}-${safeName}.${aadhaarExt}`;

      const { error: photoError } = await supabase.storage
        .from('player-uploads')
        .upload(photoPath, profilePhoto.buffer, {
          contentType: profilePhoto.mimetype,
          upsert: false
        });

      if (photoError) {
        return res.status(500).json({
          error: 'Profile photo upload failed: ' + photoError.message
        });
      }

      const { error: aadhaarError } = await supabase.storage
        .from('player-uploads')
        .upload(aadhaarPath, aadhaar.buffer, {
          contentType: aadhaar.mimetype,
          upsert: false
        });

      if (aadhaarError) {
        await supabase.storage
          .from('player-uploads')
          .remove([photoPath]);

        return res.status(500).json({
          error: 'Aadhaar upload failed: ' + aadhaarError.message
        });
      }

      const { data, error } = await supabase
        .from('test_match_registrations')
        .insert({
          name,
          mobile,
          dob: dob || null,
          address: address || null,
          playing_role: playing_role || null,
          profile_photo_url: photoPath,
          aadhaar_url: aadhaarPath,
          status: 'pending'
        })
        .select()
        .single();

      if (error) {
        await supabase.storage
          .from('player-uploads')
          .remove([photoPath, aadhaarPath]);

        return res.status(500).json({
          error: error.message
        });
      }

      res.status(201).json({
        success: true,
        message: 'Test Match registration submitted successfully',
        registration_id: data.id
      });

    } catch (error) {
      console.error('Test Match registration error:', error);

      res.status(500).json({
        error: error.message || 'Registration failed'
      });
    }
  }
);

/* Admin: View pending Test Match registrations */
app.get('/admin/test-match/pending', adminKey, async (req, res) => {
  const { data, error } = await supabase
    .from('test_match_registrations')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
});


/* Admin: Verify registration and add player */
app.post('/admin/test-match/:id/verify', adminKey, async (req, res) => {
  const id = req.params.id;

  const { data: registration, error: findError } = await supabase
    .from('test_match_registrations')
    .select('*')
    .eq('id', id)
    .single();

  if (findError || !registration) {
    return res.status(404).json({
      error: 'Registration not found'
    });
  }

  if (registration.status !== 'pending') {
    return res.status(400).json({
      error: 'Registration already processed'
    });
  }

  const { data: player, error: playerError } = await supabase
    .from('players')
    .insert({
      name: registration.name,
      photo_url: registration.profile_photo_url,
      matches: 0,
      wins: 0,
      runs: 0,
      wickets: 0,
      performance: 0,
      is_top11: false
    })
    .select()
    .single();

  if (playerError) {
    return res.status(500).json({
      error: playerError.message
    });
  }

  const { data: updated, error: updateError } = await supabase
    .from('test_match_registrations')
    .update({
      status: 'verified',
      verified_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (updateError) {
    return res.status(500).json({
      error: updateError.message
    });
  }

  res.json({
    success: true,
    message: 'Player verified and added successfully',
    player,
    registration: updated
  });
});


/* Admin: Reject Test Match registration */
app.post('/admin/test-match/:id/reject', adminKey, async (req, res) => {
  const id = req.params.id;
  const { reason = '' } = req.body;

  const { data, error } = await supabase
    .from('test_match_registrations')
    .update({
      status: 'rejected',
      rejection_reason: reason
    })
    .eq('id', id)
    .eq('status', 'pending')
    .select()
    .single();

  if (error) {
    return res.status(500).json({
      error: error.message
    });
  }

  res.json({
    success: true,
    message: 'Registration rejected',
    registration: data
  });
});


/* Admin: Delete Test Match registration */
app.delete('/admin/test-match/:id', adminKey, async (req, res) => {
  const { error } = await supabase
    .from('test_match_registrations')
    .delete()
    .eq('id', req.params.id);

  if (error) {
    return res.status(500).json({
      error: error.message
    });
  }

  res.json({ success: true });
});


/* Admin Login */
app.post('/admin/login', (req, res) => {
  const { email, password } = req.body;

  if (
    email === 'hsquad583@gmail.com' &&
    password === 'Alok@7667@Pkmast'
  ) {
    return res.json({
      success: true,
      adminKey: process.env.ADMIN_API_KEY
    });
  }

  res.status(401).json({ error: 'Invalid email or password' });
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
