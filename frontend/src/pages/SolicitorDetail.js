import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import AIOutputDisplay from '../components/AIOutputDisplay';
import './SolicitorDetail.css';

const SolicitorDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [solicitation, setSolicitation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchSolicitation();
  }, [id]);

  const fetchSolicitation = async () => {
    try {
      const response = await api.get(`/solicitations/${id}`);
      setSolicitation(response.data);
    } catch (error) {
      console.error('Error fetching solicitation:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const response = await api.post(`/solicitations/${id}/analyze`);
      setSolicitation(response.data);
    } catch (error) {
      console.error('Error generating:', error);
      alert('Failed to generate solicitation. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSend = async () => {
    setSending(true);
    try {
      const response = await api.post(`/solicitations/${id}/send`);
      setSolicitation(response.data);
    } catch (error) {
      console.error('Error sending:', error);
      alert('Failed to send solicitation. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this solicitation?')) {
      try {
        await api.delete(`/solicitations/${id}`);
        navigate('/solicitations');
      } catch (error) {
        console.error('Error deleting:', error);
      }
    }
  };

  const getChannelIcon = (channel) => {
    const icons = {
      email: '📧',
      sms: '📱',
      in_app: '📲'
    };
    return icons[channel?.toLowerCase()] || '📨';
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!solicitation) {
    return <div className="not-found">Solicitation not found</div>;
  }

  return (
    <div className="solicitor-detail">
      <div className="detail-header">
        <button className="btn-back" onClick={() => navigate('/solicitations')}>
          ← Back to Campaigns
        </button>
        <div className="header-actions">
          <button className="btn-delete" onClick={handleDelete}>Delete</button>
        </div>
      </div>

      <div className="detail-content">
        <div className="main-section">
          <div className="customer-card">
            <h1>{solicitation.customer_name}</h1>
            <div className="customer-meta">
              {solicitation.customer_email && (
                <span>📧 {solicitation.customer_email}</span>
              )}
              {solicitation.customer_phone && (
                <span>📱 {solicitation.customer_phone}</span>
              )}
            </div>
            <div className="purchase-info">
              <div className="info-box">
                <label>Product/Service</label>
                <span>{solicitation.product_service || 'N/A'}</span>
              </div>
              <div className="info-box">
                <label>Purchase Date</label>
                <span>{solicitation.purchase_date ? new Date(solicitation.purchase_date).toLocaleDateString() : 'N/A'}</span>
              </div>
            </div>
          </div>

          {!solicitation.personalized_message && (
            <div className="generate-section">
              <button
                className="btn-generate"
                onClick={handleGenerate}
                disabled={generating}
              >
                {generating ? 'Generating...' : '✨ Generate Personalized Message'}
              </button>
              <p>AI will determine the optimal timing and channel, then create a personalized review request.</p>
            </div>
          )}

          {solicitation.personalized_message && (
            <>
              <div className="timing-section">
                <h3>📅 Optimal Send Time</h3>
                <div className="timing-info">
                  <span className="optimal-time">
                    {solicitation.optimal_send_time
                      ? new Date(solicitation.optimal_send_time).toLocaleString()
                      : 'To be determined'}
                  </span>
                  <span className="channel">
                    {getChannelIcon(solicitation.channel)} via {solicitation.channel || 'Email'}
                  </span>
                </div>
                {solicitation.ai_timing_reason && (
                  <p className="timing-reason">{solicitation.ai_timing_reason}</p>
                )}
              </div>

              <div className="message-section">
                <h3>📝 Personalized Message</h3>
                <div className="message-preview">
                  {solicitation.personalized_message}
                </div>
              </div>

              {solicitation.message_template && (
                <div className="template-section">
                  <h3>Template Used</h3>
                  <div className="template-preview">
                    {solicitation.message_template}
                  </div>
                </div>
              )}

              {solicitation.status !== 'sent' && (
                <div className="send-section">
                  <button
                    className="btn-send"
                    onClick={handleSend}
                    disabled={sending}
                  >
                    {sending ? 'Sending...' : `📤 Send via ${solicitation.channel || 'Email'}`}
                  </button>
                  <p>Send the review request to the customer now.</p>
                </div>
              )}

              {solicitation.status === 'sent' && (
                <div className="sent-confirmation">
                  <div className="sent-badge">
                    ✓ Message Sent
                  </div>
                  <p>Sent on: {new Date(solicitation.sent_at).toLocaleString()}</p>
                  {solicitation.response_received && (
                    <div className="response-received">
                      🎉 Review response received!
                    </div>
                  )}
                </div>
              )}

              <div className="regenerate-section">
                <button
                  className="btn-regenerate"
                  onClick={handleGenerate}
                  disabled={generating}
                >
                  {generating ? 'Regenerating...' : '🔄 Regenerate Message'}
                </button>
              </div>
            </>
          )}
        </div>

        <div className="sidebar">
          <div className="info-card">
            <h3>Campaign Info</h3>
            <div className="info-item">
              <label>ID</label>
              <span>{solicitation.id}</span>
            </div>
            <div className="info-item">
              <label>Status</label>
              <span className={`status-${solicitation.status}`}>{solicitation.status}</span>
            </div>
            <div className="info-item">
              <label>Channel</label>
              <span>{solicitation.channel || 'Not set'}</span>
            </div>
            <div className="info-item">
              <label>Created</label>
              <span>{new Date(solicitation.created_at).toLocaleDateString()}</span>
            </div>
            {solicitation.sent_at && (
              <div className="info-item">
                <label>Sent</label>
                <span>{new Date(solicitation.sent_at).toLocaleDateString()}</span>
              </div>
            )}
          </div>

          <div className="response-card">
            <h3>Response Status</h3>
            {solicitation.response_received ? (
              <div className="response-status success">
                <span className="icon">🎉</span>
                <span>Review Received!</span>
              </div>
            ) : solicitation.status === 'sent' ? (
              <div className="response-status waiting">
                <span className="icon">⏳</span>
                <span>Waiting for response</span>
              </div>
            ) : (
              <div className="response-status pending">
                <span className="icon">📤</span>
                <span>Not yet sent</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SolicitorDetail;
