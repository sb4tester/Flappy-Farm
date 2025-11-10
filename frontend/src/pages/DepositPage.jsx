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
        const normalizeCreatedAt = (value) => {
          try {
            if (!value) return null;
            if (value instanceof Date) return value;
            if (typeof value === 'string' || typeof value === 'number') return new Date(value);
            if (value?.toDate) return value.toDate();
            if (value?._seconds) return new Date(value._seconds * 1000);
          } catch (_) {}
          return null;
        };

        const txsRaw = Array.isArray(txRes?.data?.transactions) ? txRes.data.transactions : [];
        const normalized = txsRaw.map((t) => {
          const id = t.id || t._id || t.txId || t.hash || undefined;
          const amount = (typeof t.amount === 'number')
            ? t.amount
            : (typeof t.amountCoin === 'number' ? t.amountCoin : 0);
          const metadata = { ...(t.metadata || t.meta || {}) };
          // Ensure usdtAmount is available in metadata for UI
          if (metadata.usdtAmount == null && typeof t.amountUSDT === 'number') {
            metadata.usdtAmount = t.amountUSDT;
          }
          const createdAt = normalizeCreatedAt(t.createdAt);
          return { id, type: t.type, amount, createdAt, metadata };
        });

        setTxs(normalized);
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
                src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(address)}`}
                style={{ width: 220, height: 220, borderRadius: 8, background: '#fff', objectFit: 'contain' }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              <code style={{ background: '#111', padding: '6px 8px', borderRadius: 6 }}>{address}</code>
              <button onClick={handleCopy} style={{ padding: '6px 10px' }}>
                {copyOk ? 'Copied' : 'Copy'}
              </button>
            </div>
            <div style={{ textAlign: 'center', color: '#aaa', marginTop: 8, fontSize: 12 }}>เครือข่าย: BSC USDT (BEP20)</div>
          </>
        ) : (
          <div style={{ color: '#f66' }}>Deposit address not configured.</div>
        )}
      </div>

      {/* Deposit Instructions */}
      <div style={{ background: '#101010', color: '#eee', borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>ขั้นตอนการฝาก (Deposit)</h3>
        <div>
          <h4 style={{ margin: '8px 0' }}>ถ้าใช้ Testnet</h4>
          <ol style={{ marginTop: 8, paddingLeft: 18, lineHeight: 1.6 }}>
            <li>เปิดกระเป๋า (เช่น MetaMask) แล้วเปลี่ยนเครือข่ายเป็น BSC Testnet</li>
            <li>ขอรับเหรียญทดสอบจาก BSC Testnet Faucet (เช่น USDT/BNB สำหรับค่าธรรมเนียม)</li>
            <li>คัดลอก Address ข้างบน หรือสแกน QR แล้วโอน USDT (BEP20 Testnet) มายังที่อยู่นี้</li>
            <li>รอการยืนยันเครือข่าย จากนั้นระบบจะตรวจจับและเติม Coin ให้อัตโนมัติ</li>
          </ol>

          <h4 style={{ margin: '12px 0 8px' }}>ถ้าใช้ Mainnet</h4>
          <ol style={{ marginTop: 8, paddingLeft: 18, lineHeight: 1.6 }}>
            <li>เปิดกระเป๋า (เช่น MetaMask) แล้วเปลี่ยนเครือข่ายเป็น BSC Mainnet</li>
            <li>คัดลอก Address ข้างบน หรือสแกน QR แล้วโอน USDT (BEP20) มายังที่อยู่นี้</li>
            <li>เผื่อค่าธรรมเนียม Gas เป็น BNB ให้เพียงพอ</li>
            <li>รอการยืนยันเครือข่าย ระบบจะเติม Coin ให้อัตโนมัติตามอัตราแลกเปลี่ยน</li>
          </ol>

          <div style={{ color: '#aaa', fontSize: 12, marginTop: 8 }}>
            หมายเหตุ: โปรดตรวจสอบให้แน่ใจว่าโอนบนเครือข่าย BSC (BEP20) เท่านั้น และตรวจสอบที่อยู่ให้ถูกต้องก่อนยืนยันการโอนทุกครั้ง
          </div>
        </div>
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
