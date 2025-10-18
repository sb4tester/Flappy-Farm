import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { getUserSettings, updateUserSettings } from '../services/api';
import { useNavigate } from 'react-router-dom';

const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: url('/assets/images/background.jpg') center/cover no-repeat;
  max-width: 430px;
  margin: 0 auto;
  padding: 0;
`;

const Header = styled.div`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(3px);
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  border-bottom-left-radius: 18px;
  border-bottom-right-radius: 18px;
`;

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  padding: 10px 12px;
`;

const BackButton = styled.button`
  background: #f5f5f5;
  color: #333;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  padding: 6px 14px;
  font-weight: bold;
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  box-shadow: 0 1px 2px #0001;
  transition: background 0.15s;
  &:hover { background: #e0e0e0; }
`;

const Title = styled.h2`
  font-size: 1.7rem;
  margin: 0 0 16px 0;
  padding: 0 16px 16px 16px;
  color: #4CAF50;
  text-shadow: 0 1px 3px rgba(0,0,0,0.3);
  text-align: center;
`;

const Form = styled.form`
  flex: 1;
  width: 90%;
  max-width: 380px;
  margin: 24px auto;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(4px);
  border-radius: 20px;
  padding: 28px 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.25);
`;

const Input = styled.input`
  width: 100%;
  box-sizing: border-box; /* ✅ ป้องกันล้น */
  border: 2px solid #ccc;
  border-radius: 14px;
  padding: 14px 18px;
  font-size: 1.1rem;
  &:focus {
    border-color: #4CAF50;
    outline: none;
  }
`;


const CheckboxContainer = styled.label`
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 1.15rem;
  color: #333;
`;

const SubmitButton = styled.button`
  background: #4CAF50;
  color: #fff;
  border: none;
  border-radius: 14px;
  font-size: 1.2rem;
  padding: 14px 0;
  font-weight: bold;
  cursor: pointer;
  transition: background 0.2s;
  &:hover:not(:disabled) { background: #388e3c; }
  &:disabled {
    background: #bdbdbd;
    cursor: not-allowed;
  }
`;

export default function SettingsPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    farmName: '',
    usdtWallet: '',
    twoFactorEnabled: false,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    getUserSettings(token).then(res => setForm(res.data)).catch(err => console.error(err));
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      await updateUserSettings(form, token);
      alert('บันทึกเรียบร้อยแล้ว');
    } catch (error) {
      console.error(error);
      alert('บันทึกไม่สำเร็จ');
    }
    setLoading(false);
  };

  return (
    <PageContainer>
      <Header>
        <HeaderRow>
          <BackButton onClick={() => navigate('/')}>{'<'} Lobby</BackButton>
        </HeaderRow>
        <Title>🛠 ตั้งค่าฟาร์มของคุณ</Title>
      </Header>

      <Form onSubmit={handleSubmit}>
        <Input
          type="text"
          name="farmName"
          placeholder="ชื่อฟาร์ม"
          value={form.farmName}
          onChange={handleChange}
        />
        <Input
          type="text"
          name="usdtWallet"
          placeholder="USDT Wallet Address"
          value={form.usdtWallet}
          onChange={handleChange}
        />
        <CheckboxContainer>
          <input
            type="checkbox"
            name="twoFactorEnabled"
            checked={form.twoFactorEnabled}
            onChange={handleChange}
          />
          เปิดใช้งาน 2FA
        </CheckboxContainer>
        <SubmitButton type="submit" disabled={loading}>
          {loading ? 'กำลังบันทึก...' : 'บันทึก'}
        </SubmitButton>
      </Form>
    </PageContainer>
  );
}
