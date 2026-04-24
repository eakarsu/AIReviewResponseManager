import React from 'react';

const getStrength = (password) => {
  let score = 0;
  if (!password) return { score: 0, label: '', color: '#e2e8f0' };
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;

  if (score <= 2) return { score: 1, label: 'Weak', color: '#ef4444' };
  if (score <= 3) return { score: 2, label: 'Fair', color: '#f59e0b' };
  if (score <= 4) return { score: 3, label: 'Good', color: '#3b82f6' };
  return { score: 4, label: 'Strong', color: '#22c55e' };
};

const PasswordStrengthMeter = ({ password }) => {
  const { score, label, color } = getStrength(password);

  if (!password) return null;

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
        {[1, 2, 3, 4].map(level => (
          <div
            key={level}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              background: level <= score ? color : '#e2e8f0',
              transition: 'background 0.2s'
            }}
          />
        ))}
      </div>
      <span style={{ fontSize: 12, color, fontWeight: 500 }}>{label}</span>
    </div>
  );
};

export default PasswordStrengthMeter;
