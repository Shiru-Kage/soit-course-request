import React, { useState } from 'react';
import { Cloud, X, Check, Trash2, ExternalLink, RefreshCw, ShieldCheck } from 'lucide-react';
import { getSavedFirebaseConfig, saveFirebaseConfig, getFirebaseDb } from '../services/firebase';

export default function FirebaseModal({ isOpen, onClose, onConfigSaved }) {
  const currentConfig = getSavedFirebaseConfig();
  const isCurrentlyConnected = Boolean(getFirebaseDb());
  const [configText, setConfigText] = useState(
    currentConfig ? JSON.stringify(currentConfig, null, 2) : ''
  );
  const [status, setStatus] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    setIsSaving(true);
    setStatus('');

    try {
      if (!configText.trim()) {
        saveFirebaseConfig(null);
        setStatus('Configuration cleared. System reverted to LocalStorage / Dev server mode.');
        setTimeout(() => {
          setIsSaving(false);
          if (onConfigSaved) onConfigSaved(false);
          onClose();
        }, 1200);
        return;
      }

      let parsed;
      try {
        parsed = JSON.parse(configText);
      } catch {
        const cleaned = configText
          .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2": ')
          .replace(/'/g, '"');
        parsed = JSON.parse(cleaned);
      }

      if (!parsed.apiKey || !parsed.projectId) {
        setStatus('Error: apiKey and projectId are required in Firebase config.');
        setIsSaving(false);
        return;
      }

      saveFirebaseConfig(parsed);
      setStatus('Firebase Cloud Firestore Connected Successfully! Reloading in 1s...');
      setTimeout(() => {
        setIsSaving(false);
        if (onConfigSaved) onConfigSaved(true);
        window.location.reload();
      }, 1000);
    } catch (e) {
      setStatus(`Invalid JSON format: ${e.message}`);
      setIsSaving(false);
    }
  };

  const handleDisconnect = () => {
    saveFirebaseConfig(null);
    setConfigText('');
    setStatus('Firebase disconnected. Reverted to LocalStorage mode.');
    setTimeout(() => {
      if (onConfigSaved) onConfigSaved(false);
      window.location.reload();
    }, 1000);
  };

  return (
    <div className="modal-backdrop" style={{ zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div 
        className="dossier-card" 
        style={{ 
          maxWidth: '560px', 
          width: '90%', 
          padding: '1.75rem', 
          borderRadius: 'var(--radius-xl)', 
          boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
          background: 'var(--bg-surface)'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-hairline)', paddingBottom: '0.85rem', marginBottom: '1.15rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(245, 158, 11, 0.15))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--crimson-bright)'
            }}>
              <Cloud size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-pure)', margin: 0 }}>
                Cloud Database Integration
              </h2>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Google Cloud Firestore • Real-Time Vercel Synchronization
              </span>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.35rem' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Live Status Pill */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.65rem 0.95rem',
          borderRadius: 'var(--radius-md)',
          background: isCurrentlyConnected ? 'rgba(16, 185, 129, 0.08)' : 'rgba(245, 158, 11, 0.08)',
          border: isCurrentlyConnected ? '1px solid var(--emerald-border)' : '1px solid var(--gold-border)',
          marginBottom: '1.15rem',
          fontSize: '0.78rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: isCurrentlyConnected ? 'var(--emerald-core)' : '#f59e0b',
              boxShadow: isCurrentlyConnected ? '0 0 8px var(--emerald-glow)' : '0 0 8px rgba(245, 158, 11, 0.5)'
            }} />
            <span style={{ fontWeight: 700, color: isCurrentlyConnected ? 'var(--emerald-core)' : '#d97706' }}>
              {isCurrentlyConnected ? 'Connected to Cloud Firestore (Real-Time Live Sync)' : 'Operating in Local / Offline Storage Mode'}
            </span>
          </div>
          <span className="mono-tag" style={{ fontSize: '0.68rem' }}>
            {isCurrentlyConnected ? 'GLOBAL SYNC' : 'OFFLINE'}
          </span>
        </div>

        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '0.85rem' }}>
          When deployed to <strong>Vercel</strong> or accessed across different devices, pasting your Firebase Web App configuration below connects this app to Firestore. All course petitions, quota counters, and chair actions synchronize in real-time worldwide.
        </p>

        {/* Config Textarea */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
            Firebase Web App Configuration (JSON / JS Object)
          </label>
          <textarea
            value={configText}
            onChange={e => setConfigText(e.target.value)}
            rows={7}
            placeholder={`{\n  "apiKey": "AIzaSy...",\n  "authDomain": "mapua-soit.firebaseapp.com",\n  "projectId": "mapua-soit",\n  "storageBucket": "mapua-soit.appspot.com",\n  "appId": "1:..."\n}`}
            style={{
              width: '100%',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.78rem',
              padding: '0.75rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-input)',
              color: 'var(--text-pure)',
              border: '1px solid var(--border-medium)',
              outline: 'none',
              resize: 'vertical'
            }}
          />
        </div>

        {status && (
          <div style={{
            padding: '0.65rem 0.85rem',
            borderRadius: 'var(--radius-md)',
            background: status.startsWith('Error') || status.startsWith('Invalid') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
            color: status.startsWith('Error') || status.startsWith('Invalid') ? '#ef4444' : 'var(--emerald-core)',
            fontSize: '0.78rem',
            fontWeight: 700,
            marginBottom: '1rem'
          }}>
            {status}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
          {isCurrentlyConnected ? (
            <button
              type="button"
              onClick={handleDisconnect}
              style={{
                background: 'transparent',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#ef4444',
                padding: '0.5rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              <Trash2 size={13} />
              <span>Disconnect Firebase</span>
            </button>
          ) : <div />}

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: '1px solid var(--border-medium)',
                color: 'var(--text-muted)',
                padding: '0.52rem 0.95rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="tactile-btn-primary"
              onClick={handleSave}
              disabled={isSaving}
              style={{ padding: '0.52rem 1.15rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              {isSaving ? <RefreshCw size={14} className="spin-slow" /> : <Check size={14} />}
              <span>{isSaving ? 'Connecting...' : 'Save & Connect Cloud'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

