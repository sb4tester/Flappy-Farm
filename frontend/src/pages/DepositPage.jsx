import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDepositAddress, getDepositTransactions } from '../services/api';

export default function DepositPage() {
  const navigate = useNavigate();
  const [address, setAddress] = useState('');
  const [txs, setTxs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copyOk, setCopyOk] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/register');
      return;
    }
    (async () => {
      try {
        const [addrRes, txRes] = await Promise.all([
          getDepositAddress(token),
          getDepositTransactions(token, 50)
        ]);
        setAddress(addrRes.data.address || '');
        setTxs((txRes.data.transactions || []).map((t) => ({
          id: t.id,
          type: t.type,
          amount: t.amount,
          createdAt: t.createdAt?.toDate ? t.createdAt.toDate() : (t.createdAt?._seconds ? new Date(t.createdAt._seconds * 1000) : null),
          metadata: t.metadata || {}
        })));
      } catch (e) {
        console.error('Failed to load deposit data', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopyOk(true);
      setTimeout(() => setCopyOk(false), 1500);
    } catch (e) {
      console.error('Copy failed', e);
    }
  };

  if (loading) return <div style={{ padding: 16 }}>Loading...</div>;

  return (
    <div style={{ padding: 16, maxWidth: 600, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
        <button onClick={() => navigate(-1)} style={{ marginRight: 12 }}>Back</button>
        <h2 style={{ margin: 0 }}>Deposit</h2>
      </div>

      <div style={{ background: '#1f1f1f', color: '#fff', borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Deposit Wallet</h3>
        {address ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'center', margin: '12px 0' }}>
              <img
                alt="Deposit QR"
                src="/assets/images/deposit_qr.png"
                style={{ width: 220, height: 220, borderRadius: 8, background: '#fff', objectFit: 'contain' }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              <code style={{ background: '#111', padding: '6px 8px', borderRadius: 6 }}>{address}</code>
              <button onClick={handleCopy} style={{ padding: '6px 10px' }}>
                {copyOk ? 'Copied' : 'Copy'}
              </button>
            </div>
            <div style={{ textAlign: 'center', color: '#aaa', marginTop: 8, fontSize: 12 }}>Network: BSC USDT</div>
          </>
        ) : (
          <div style={{ color: '#f66' }}>Deposit address not configured.</div>
        )}
      </div>

      <div style={{ background: '#1f1f1f', color: '#fff', borderRadius: 12, padding: 16 }}>
        <h3 style={{ marginTop: 0 }}>Your Deposits</h3>
        {txs.length === 0 ? (
          <div style={{ color: '#aaa' }}>No deposit transactions found.</div>
        ) : (
          <div>
            {txs.map((t) => (
              <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #333' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{t.amount?.toLocaleString()} coin</div>
                  <div style={{ fontSize: 12, color: '#aaa' }}>
                    {t.metadata?.usdtAmount ? `${t.metadata.usdtAmount} USDT` : ''}
                    {typeof t.metadata?.bonusPercent === 'number' ? ` + bonus ${t.metadata.bonusPercent}%` : ''}
                    {t.metadata?.channel ? ` · via ${t.metadata.channel}` : ''}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 12, color: '#aaa' }}>{t.createdAt ? t.createdAt.toLocaleString() : ''}</div>
                  {t.metadata?.txHash && (
                    <div style={{ fontSize: 12, color: '#6af' }}>{t.metadata.txHash.slice(0, 10)}...</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
