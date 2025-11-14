import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getUserProfile, getBalance } from '../services/api';

export default function DebugStatus() {
  const { currentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [balance, setBalance] = useState(null);
  const [errors, setErrors] = useState([]);

  const enabled = (() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get('debug') === '1') return true;
      return localStorage.getItem('debug') === '1';
    } catch (_) { return false; }
  })();

  useEffect(() => {
    if (!enabled) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    (async () => {
      const errs = [];
      try {
        const p = await getUserProfile(token);
        setProfile({ status: p.status, data: p.data });
      } catch (e) {
        errs.push(`profile: ${e?.response?.status || e?.message}`);
      }
      try {
        const b = await getBalance(token);
        setBalance({ status: b.status, data: b.data });
      } catch (e) {
        errs.push(`balance: ${e?.response?.status || e?.message}`);
      }
      setErrors(errs);
    })();
  }, [enabled, currentUser]);

  if (!enabled) return null;

  const token = (() => {
    try { return localStorage.getItem('token') || ''; } catch { return ''; }
  })();

  const short = (s) => (s ? `${s.slice(0, 8)}…${s.slice(-4)}` : '');

  const boxStyle = {
    position: 'fixed', right: 8, bottom: 8, zIndex: 9999,
    background: 'rgba(0,0,0,0.75)', color: '#fff', padding: '8px 10px',
    borderRadius: 6, fontSize: 12, maxWidth: 320, lineHeight: 1.35,
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
  };

  return (
    <div style={boxStyle}>
      <div>UID: {currentUser?.uid || '(none)'}</div>
      <div>Token: {token ? short(token) : '(none)'}</div>
      <div>API: {process.env.REACT_APP_API_URL || '(default http://localhost:5000)'}</div>
      <div>Origin: {typeof window !== 'undefined' ? window.location.origin : ''}</div>
      <hr style={{opacity:0.2}} />
      <div>/user/profile: {profile ? `${profile.status}` : '…'}</div>
      <div>food: {profile?.data?.food ?? '-'}</div>
      <div>/wallet/balance: {balance ? `${balance.status}` : '…'}</div>
      <div>coin_balance: {balance?.data?.coin_balance ?? '-'}</div>
      {errors.length > 0 && (
        <div>errors: {errors.join(', ')}</div>
      )}
      <div style={{opacity:0.6, marginTop:4}}>toggle with ?debug=1 or localStorage.debug=1</div>
    </div>
  );
}

