const pool = require('../config/database');

const SETTING_KEYS = [
  'default_tone',
  'auto_analyze_sentiment',
  'notify_new_reviews',
  'notify_negative_reviews',
  'email_notifications',
  'notification_email',
  'response_language',
  'include_business_name',
  'include_signature',
  'signature_text',
  'auto_approve_positive',
  'minimum_rating_threshold',
  'max_response_length',
  'ai_model_preference',
  'theme',
];

const getSettings = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT setting_key, setting_value FROM settings WHERE user_id = $1',
      [req.userId]
    );
    const settings = {};
    for (const row of result.rows) {
      try {
        settings[row.setting_key] = JSON.parse(row.setting_value);
      } catch (_) {
        settings[row.setting_key] = row.setting_value;
      }
    }
    res.json({ settings });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Failed to load settings' });
  }
};

const updateSettings = async (req, res) => {
  try {
    const input = req.body && typeof req.body.settings === 'object' && req.body.settings !== null
      ? req.body.settings
      : req.body;
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      return res.status(400).json({ error: 'A settings object is required' });
    }

    const entries = Object.entries(input).filter(([key]) => SETTING_KEYS.includes(key));
    if (entries.length === 0) {
      return res.status(400).json({ error: 'No valid settings provided' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const [key, value] of entries) {
        await client.query(
          `INSERT INTO settings (user_id, setting_key, setting_value)
           VALUES ($1, $2, $3)
           ON CONFLICT (user_id, setting_key)
           DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = CURRENT_TIMESTAMP`,
          [req.userId, key, JSON.stringify(value)]
        );
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    res.json({ message: 'Settings saved', settings: Object.fromEntries(entries) });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Failed to save settings' });
  }
};

module.exports = { getSettings, updateSettings, SETTING_KEYS };
