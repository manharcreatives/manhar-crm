'use client';

import { useState } from 'react';
import { useAuth } from '../lib/auth';
import { LogIn, Eye, EyeOff, Lock } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!password.trim()) {
      setError('Please enter the access password');
      return;
    }
    setLoading(true);
    const ok = await login(password);
    setLoading(false);
    if (!ok) {
      setError('Incorrect password');
      setPassword('');
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg" />
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <img
              src="https://files.catbox.moe/fquzdh.png"
              alt="Manhar Creatives"
              className="login-logo"
            />
            <h1 className="login-title">Manhar Creatives</h1>
            <p className="login-subtitle">Agency CRM & Billing System</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="login-input-group">
              <div className="login-input-icon">
                <Lock size={18} />
              </div>
              <input
                type={show ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter access password"
                className="login-input"
                autoFocus
              />
              <button
                type="button"
                className="login-toggle"
                onClick={() => setShow((s) => !s)}
                tabIndex={-1}
              >
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {error && <p className="login-error">{error}</p>}

            <button type="submit" className="login-btn" disabled={loading}>
              <LogIn size={18} />
              {loading ? 'Verifying...' : 'Access System'}
            </button>
          </form>

          <p className="login-footer">
            Authorized access only
          </p>
        </div>
      </div>

      <style jsx>{`
        :global(.main-content) {
          margin-left: 0 !important;
        }
        .login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #0B0F0E;
          position: relative;
          overflow: hidden;
        }
        .login-bg {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse 80% 60% at 50% -20%, rgba(34, 197, 94, 0.08), transparent),
            radial-gradient(ellipse 60% 50% at 80% 80%, rgba(34, 197, 94, 0.04), transparent),
            radial-gradient(ellipse 50% 40% at 20% 70%, rgba(34, 197, 94, 0.03), transparent);
        }
        .login-container {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 400px;
          padding: 20px;
        }
        .login-card {
          background: rgba(17, 24, 39, 0.9);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          padding: 48px 36px 36px;
          box-shadow: 0 8px 40px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(34, 197, 94, 0.05);
        }
        .login-header {
          text-align: center;
          margin-bottom: 36px;
        }
        .login-logo {
          width: 64px;
          height: 64px;
          border-radius: 16px;
          margin-bottom: 16px;
          box-shadow: 0 0 24px rgba(34, 197, 94, 0.2);
        }
        .login-title {
          font-family: 'Outfit', sans-serif;
          font-size: 24px;
          font-weight: 800;
          color: #FFFFFF;
          margin-bottom: 4px;
        }
        .login-subtitle {
          font-size: 13px;
          color: #22C55E;
          font-weight: 500;
        }
        .login-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .login-input-group {
          position: relative;
          display: flex;
          align-items: center;
        }
        .login-input-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: #6B7280;
          pointer-events: none;
          display: flex;
        }
        .login-input {
          width: 100%;
          background: #161d2a;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 10px;
          color: #FFFFFF;
          padding: 12px 44px 12px 44px;
          font-size: 14px;
          font-family: 'Inter', sans-serif;
          outline: none;
          transition: all 0.2s ease;
        }
        .login-input:focus {
          border-color: #22C55E;
          box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.1), 0 0 12px rgba(34, 197, 94, 0.05);
        }
        .login-input::placeholder {
          color: #6B7280;
        }
        .login-toggle {
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #6B7280;
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          transition: color 0.2s;
        }
        .login-toggle:hover {
          color: #9CA3AF;
        }
        .login-error {
          font-size: 13px;
          color: #EF4444;
          text-align: center;
          padding: 8px 12px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: 8px;
        }
        .login-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px 24px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          font-family: 'Inter', sans-serif;
          cursor: pointer;
          border: none;
          background: linear-gradient(135deg, #22C55E, #16A34A);
          color: #0B0F0E;
          box-shadow: 0 2px 8px rgba(34, 197, 94, 0.25);
          transition: all 0.2s ease;
        }
        .login-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 16px rgba(34, 197, 94, 0.35);
        }
        .login-btn:active:not(:disabled) {
          transform: translateY(0);
        }
        .login-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .login-footer {
          text-align: center;
          margin-top: 24px;
          font-size: 11px;
          color: #6B7280;
        }
      `}</style>
    </div>
  );
}
