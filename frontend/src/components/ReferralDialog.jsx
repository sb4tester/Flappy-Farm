import React, { useEffect, useState } from 'react';
import { auth } from '../firebase';
import './ReferralDialog.css';

export default function ReferralDialog({ onClose }) {
  const [refLink, setRefLink] = useState('');

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (user) {
        const link = `${window.location.origin}/register?ref=${user.uid}`;
        setRefLink(link);
      }
    });
    return () => unsubscribe();
  }, []);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(refLink);
    alert('คัดลอกลิงก์แล้ว!');
  };

  const shareLine = () => {
    const url = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(refLink)}`;
    window.open(url, '_blank');
  };

  const shareFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(refLink)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="referral-overlay" onClick={onClose}>
      <div className="referral-dialog" onClick={e => e.stopPropagation()}>
        <h2>แนะนำเพื่อน</h2>
        <p>แชร์ลิงก์ของคุณ:</p>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            type="text"
            readOnly
            value={refLink}
            onFocus={e => e.target.select()}
            style={{ flex: 1 }}
          />
          <button onClick={copyToClipboard}>📋</button>
        </div>

        <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between' }}>
          <button onClick={shareLine} style={{ background: '#06C755', color: '#fff' }}>แชร์ผ่าน LINE</button>
          <button onClick={shareFacebook} style={{ background: '#4267B2', color: '#fff' }}>แชร์ผ่าน Facebook</button>
        </div>

        <button style={{ marginTop: '20px' }} onClick={onClose}>ปิด</button>
      </div>
    </div>
  );
}
