import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import PasswordStrengthMeter from '../components/PasswordStrengthMeter';
import './Settings.css';

const Settings = () => {
  const [settings, setSettings] = useState({
    default_tone: 'professional',
    auto_analyze_sentiment: true,
    notify_new_reviews: true,
    notify_negative_reviews: true,
    email_notifications: true,
    notification_email: '',
    response_language: 'en',
    include_business_name: true,
    include_signature: true,
    signature_text: '',
    auto_approve_positive: false,
    minimum_rating_threshold: '3',
    max_response_length: '500',
    ai_model_preference: 'gpt-3.5-turbo',
    theme: 'light'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const toast = useToast();

  useEffect(() => {
    // In a real app, you would fetch settings from the API
    // For now, we'll use default settings
    setLoading(false);
  }, []);

  const handleChange = (key, value) => {
    setSettings({ ...settings, [key]: value });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // In a real app, you would save settings to the API
      await new Promise(resolve => setTimeout(resolve, 500));
      setMessage('Settings saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading settings...</div>;
  }

  return (
    <div className="settings-page">
      <div className="page-header">
        <h1>Settings</h1>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {message && (
        <div className={`alert ${message.includes('Error') ? 'alert-error' : 'alert-success'}`}>
          {message}
        </div>
      )}

      {/* AI Settings */}
      <div className="card settings-section">
        <h2>AI Response Settings</h2>
        <div className="settings-grid">
          <div className="form-group">
            <label>Default Response Tone</label>
            <select
              value={settings.default_tone}
              onChange={(e) => handleChange('default_tone', e.target.value)}
            >
              <option value="professional">Professional</option>
              <option value="friendly">Friendly</option>
              <option value="apologetic">Apologetic</option>
              <option value="grateful">Grateful</option>
            </select>
          </div>
          <div className="form-group">
            <label>AI Model</label>
            <select
              value={settings.ai_model_preference}
              onChange={(e) => handleChange('ai_model_preference', e.target.value)}
            >
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Fast)</option>
              <option value="gpt-4">GPT-4 (Quality)</option>
              <option value="claude-2">Claude 2</option>
            </select>
          </div>
          <div className="form-group">
            <label>Max Response Length</label>
            <input
              type="number"
              value={settings.max_response_length}
              onChange={(e) => handleChange('max_response_length', e.target.value)}
              min="100"
              max="1000"
            />
          </div>
          <div className="form-group">
            <label>Response Language</label>
            <select
              value={settings.response_language}
              onChange={(e) => handleChange('response_language', e.target.value)}
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
            </select>
          </div>
        </div>
        <div className="settings-toggles">
          <label className="toggle-item">
            <input
              type="checkbox"
              checked={settings.auto_analyze_sentiment}
              onChange={(e) => handleChange('auto_analyze_sentiment', e.target.checked)}
            />
            <span>Auto-analyze sentiment for new reviews</span>
          </label>
          <label className="toggle-item">
            <input
              type="checkbox"
              checked={settings.auto_approve_positive}
              onChange={(e) => handleChange('auto_approve_positive', e.target.checked)}
            />
            <span>Auto-approve responses to 5-star reviews</span>
          </label>
        </div>
      </div>

      {/* Response Settings */}
      <div className="card settings-section">
        <h2>Response Formatting</h2>
        <div className="settings-toggles">
          <label className="toggle-item">
            <input
              type="checkbox"
              checked={settings.include_business_name}
              onChange={(e) => handleChange('include_business_name', e.target.checked)}
            />
            <span>Include business name in responses</span>
          </label>
          <label className="toggle-item">
            <input
              type="checkbox"
              checked={settings.include_signature}
              onChange={(e) => handleChange('include_signature', e.target.checked)}
            />
            <span>Include signature in responses</span>
          </label>
        </div>
        {settings.include_signature && (
          <div className="form-group">
            <label>Signature Text</label>
            <textarea
              value={settings.signature_text}
              onChange={(e) => handleChange('signature_text', e.target.value)}
              placeholder="Best regards,&#10;The Management Team"
              rows={3}
            />
          </div>
        )}
      </div>

      {/* Notification Settings */}
      <div className="card settings-section">
        <h2>Notifications</h2>
        <div className="settings-toggles">
          <label className="toggle-item">
            <input
              type="checkbox"
              checked={settings.email_notifications}
              onChange={(e) => handleChange('email_notifications', e.target.checked)}
            />
            <span>Enable email notifications</span>
          </label>
          <label className="toggle-item">
            <input
              type="checkbox"
              checked={settings.notify_new_reviews}
              onChange={(e) => handleChange('notify_new_reviews', e.target.checked)}
            />
            <span>Notify me of new reviews</span>
          </label>
          <label className="toggle-item">
            <input
              type="checkbox"
              checked={settings.notify_negative_reviews}
              onChange={(e) => handleChange('notify_negative_reviews', e.target.checked)}
            />
            <span>Priority alert for negative reviews</span>
          </label>
        </div>
        {settings.email_notifications && (
          <div className="form-group">
            <label>Notification Email</label>
            <input
              type="email"
              value={settings.notification_email}
              onChange={(e) => handleChange('notification_email', e.target.value)}
              placeholder="your@email.com"
            />
          </div>
        )}
        <div className="form-group">
          <label>Minimum Rating Threshold for Alerts</label>
          <select
            value={settings.minimum_rating_threshold}
            onChange={(e) => handleChange('minimum_rating_threshold', e.target.value)}
          >
            <option value="1">1 Star (All Reviews)</option>
            <option value="2">2 Stars and Below</option>
            <option value="3">3 Stars and Below</option>
            <option value="4">4 Stars and Below</option>
          </select>
        </div>
      </div>

      {/* Appearance */}
      <div className="card settings-section">
        <h2>Appearance</h2>
        <div className="form-group">
          <label>Theme</label>
          <select
            value={settings.theme}
            onChange={(e) => handleChange('theme', e.target.value)}
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="system">System Default</option>
          </select>
        </div>
      </div>

      {/* Change Password */}
      <div className="card settings-section">
        <h2>Change Password</h2>
        <div className="settings-grid">
          <div className="form-group">
            <label>Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
            />
          </div>
          <div className="form-group">
            <label>New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
            />
            {newPassword && <PasswordStrengthMeter password={newPassword} />}
          </div>
          <div className="form-group">
            <label>Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
            />
          </div>
        </div>
        <button
          className="btn btn-primary"
          disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
          onClick={async () => {
            if (newPassword !== confirmPassword) {
              toast.error('Passwords do not match');
              return;
            }
            if (newPassword.length < 6) {
              toast.error('Password must be at least 6 characters');
              return;
            }
            setChangingPassword(true);
            try {
              await api.put('/auth/change-password', { currentPassword, newPassword });
              toast.success('Password changed successfully');
              setCurrentPassword('');
              setNewPassword('');
              setConfirmPassword('');
            } catch (err) {
              toast.error(err.response?.data?.error || 'Failed to change password');
            } finally {
              setChangingPassword(false);
            }
          }}
        >
          {changingPassword ? 'Changing...' : 'Change Password'}
        </button>
      </div>

      {/* API Keys */}
      <div className="card settings-section">
        <h2>API Configuration</h2>
        <div className="api-info">
          <p>
            <strong>OpenRouter API Key:</strong> Configure your API key in the <code>.env</code> file.
          </p>
          <p className="hint">
            To use AI features, add your OpenRouter API key to the .env file as OPENROUTER_API_KEY
          </p>
        </div>
      </div>
    </div>
  );
};

export default Settings;
