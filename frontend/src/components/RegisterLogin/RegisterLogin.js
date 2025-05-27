import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { auth } from "../../firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  FacebookAuthProvider,
  OAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail
} from "firebase/auth";
import styled from "styled-components";
import Cookies from "js-cookie";
import { authAPI } from '../../services/api';

const Button = styled.button`
  background-color: ${props => props.isActive ? "#FF5733" : "#ccc"};
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  width: 100%;
  margin: 10px 0;
  font-size: 1rem;
  cursor: pointer;
  box-sizing: border-box;

  &:hover {
    background-color: ${props => props.isActive ? "#FF2A1D" : "#bbb"};
  }
`;

const SocialButton = styled.button`
  background-color: ${props => props.bgColor || "#ccc"};
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  width: 100%;
  margin: 10px 0;
  font-size: 1rem;
  cursor: pointer;
  box-sizing: border-box;

  &:hover {
    opacity: 0.9;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const Divider = styled.div`
  display: flex;
  align-items: center;
  margin: 20px 0;
  
  &:before, &:after {
    content: "";
    flex: 1;
    border-bottom: 1px solid #ccc;
  }
  
  span {
    margin: 0 10px;
    color: #555;
    font-size: 14px;
  }
`;

const RegisterLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [isSignUp, setIsSignUp] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const refCode = searchParams.get('ref');

    if (refCode) {
      console.log('🔗 Found referral code in URL:', refCode);
      Cookies.set('referralCode', refCode, { expires: 30 });
      setReferralCode(refCode);
    } else {
      const storedRefCode = Cookies.get('referralCode');
      if (storedRefCode) {
        console.log('🍪 Found referral code in cookies:', storedRefCode);
        setReferralCode(storedRefCode);
      }
    }
  }, [location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const refCode = referralCode || Cookies.get('referralCode') || '';
      console.log(`🔄 Starting ${isSignUp ? 'registration' : 'login'} process...`);

      if (isSignUp) {
        // 📝 Register new user
        console.log('📝 Creating new Firebase user...');
        
        // 1. Create Firebase user
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        console.log('✅ Firebase user created:', user.uid);
        
        // 2. Register with backend
        const result = await authAPI.register(user, refCode);
        
        if (result.success) {
          console.log('✅ Backend registration successful:', result.data);
          
          // Clear form
          setEmail("");
          setPassword("");
          setReferralCode("");
          
          navigate("/");
        } else {
          console.error('❌ Backend registration failed:', result.error);
          setError(result.error || 'Registration failed');
        }
      } else {
        // 🔑 Login existing user
        console.log('🔑 Signing in existing Firebase user...');
        
        // 1. Sign in with Firebase
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        console.log('✅ Firebase login successful:', user.uid);
        
        // 2. Login with backend
        const result = await authAPI.login(user, refCode);
        
        if (result.success) {
          console.log('✅ Backend login successful:', result.data);
          
          // Clear form
          setEmail("");
          setPassword("");
          
          navigate("/");
        } else {
          console.error('❌ Backend login failed:', result.error);
          setError(result.error || 'Login failed');
        }
      }
    } catch (error) {
      console.error(`❌ ${isSignUp ? 'Registration' : 'Login'} error:`, error);
      
      // Handle Firebase auth errors
      let errorMessage = error.message;
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already registered. Please sign in instead.';
        setIsSignUp(false); // Switch to login mode
      } else if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email. Please sign up first.';
        setIsSignUp(true); // Switch to register mode
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password. Please try again.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password should be at least 6 characters.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address.';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your connection.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed attempts. Please try again later.';
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Initialize providers outside of functions
  const googleProvider = new GoogleAuthProvider();
  googleProvider.addScope('profile');
  googleProvider.addScope('email');
  
  const facebookProvider = new FacebookAuthProvider();
  facebookProvider.addScope('email');
  
  const appleProvider = new OAuthProvider("apple.com");
  appleProvider.addScope('email');
  appleProvider.addScope('name');

  const handleForgotPassword = async () => {
    if (!email) {
      setError("Please enter your email address first.");
      return;
    }
    
    try {
      setError("");
      await sendPasswordResetEmail(auth, email);
      alert(`Password reset email sent to ${email}!`);
    } catch (error) {
      console.error('❌ Password reset error:', error);
      
      let errorMessage = error.message;
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email address.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address.';
      }
      
      setError(errorMessage);
    }
  };

  const handleSocialLogin = async (provider, providerName = 'Social') => {
    setIsLoading(true);
    setError("");

    try {
      console.log(`🌐 Starting ${providerName} login...`);
      
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const refCode = referralCode || Cookies.get('referralCode') || '';
      
      console.log('✅ Social popup successful:', {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName
      });
      
      // ✅ ตรวจสอบว่าเป็น user ใหม่หรือไม่จาก Firebase response
      const isNewUser = result._tokenResponse?.isNewUser === true || 
                       result._tokenResponse?.isNewUser === 'true';
      
      console.log('📊 User status:', { isNewUser, tokenResponse: result._tokenResponse });
      
      // ใช้ socialAuth API ที่จัดการทั้ง register และ login
      const authResult = await authAPI.socialAuth(user, refCode, isNewUser);
      
      if (authResult.success) {
        console.log(`✅ Social ${authResult.type} successful:`, authResult.data);
        
        // Clear any errors
        setError("");
        
        navigate("/");
      } else {
        console.error(`❌ Social ${authResult.type} failed:`, authResult.error);
        setError(authResult.error || `${providerName} authentication failed`);
      }
    } catch (error) {
      console.error(`❌ ${providerName} login error:`, error);
      
      let errorMessage = error.message;
      
      if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Login cancelled by user.';
      } else if (error.code === 'auth/popup-blocked') {
        errorMessage = 'Popup blocked. Please allow popups for this site.';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your connection.';
      } else if (error.code === 'auth/cancelled-popup-request') {
        errorMessage = 'Another popup is already open.';
      } else if (error.code === 'auth/account-exists-with-different-credential') {
        errorMessage = 'An account already exists with this email using a different sign-in method.';
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (!showForm) {
    return (
      <Container>
        <LoginBox>
          <Logo src="/assets/images/logo.png" alt="Logo" />

          <WelcomeText>Welcome to Chicken Farm!</WelcomeText>

          <div>
            <Button 
              onClick={() => { setIsSignUp(true); setShowForm(true); setError(""); }} 
              isActive={true}
            >
              Sign Up
            </Button>
            <Button 
              onClick={() => { setIsSignUp(false); setShowForm(true); setError(""); }} 
              isActive={false}
            >
              Sign In
            </Button>
          </div>

          <Divider><span>or continue with</span></Divider>

          <SocialButtons>
            <SocialButton 
              onClick={() => handleSocialLogin(googleProvider, 'Google')} 
              bgColor="#4285F4"
              disabled={isLoading}
            >
              {isLoading ? "Processing..." : "Continue with Google"}
            </SocialButton>
          </SocialButtons>

          {error && <ErrorMessage>{error}</ErrorMessage>}
        </LoginBox>
      </Container>
    );
  }

  return (
    <Container>
      <LoginBox>
        <Logo src="/assets/images/logo.png" alt="Logo" />
        <FormTitle>{isSignUp ? "Create Account" : "Welcome Back"}</FormTitle>

        <Form onSubmit={handleSubmit}>
          <Input 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            placeholder="Enter your email" 
            required 
            autoComplete="email"
          />
          <Input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            placeholder="Enter your password" 
            required 
            autoComplete={isSignUp ? "new-password" : "current-password"}
            minLength={6}
          />

          {isSignUp && (
            <Input
              type="text"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value)}
              placeholder="Referral Code (Optional)"
              autoComplete="off"
            />
          )}

          <SubmitButton type="submit" disabled={isLoading}>
            {isLoading ? "Processing..." : isSignUp ? "Create Account" : "Sign In"}
          </SubmitButton>
        </Form>

        {!isSignUp && (
          <ForgotPassword onClick={handleForgotPassword}>
            Forgot Password?
          </ForgotPassword>
        )}

        <ToggleAuth onClick={() => { setIsSignUp(!isSignUp); setError(""); }}>
          {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
        </ToggleAuth>

        {error && <ErrorMessage>{error}</ErrorMessage>}

        <Divider><span>or</span></Divider>

        <SocialButtons>
          <SocialButton 
            onClick={() => handleSocialLogin(googleProvider, 'Google')} 
            bgColor="#4285F4"
            disabled={isLoading}
          >
            {isLoading ? "Processing..." : "Continue with Google"}
          </SocialButton>
        </SocialButtons>

        <BackButton onClick={() => { setShowForm(false); setError(""); }}>
          ← Back to Options
        </BackButton>
      </LoginBox>
    </Container>
  );
};

const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-image: url('/assets/images/background.jpg');
  background-size: cover;
  background-position: center;
  background-attachment: fixed;
  padding: 20px;
`;

const LoginBox = styled.div`
  background-color: rgba(255, 255, 255, 0.95);
  padding: 40px;
  border-radius: 15px;
  text-align: center;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
`;

const Logo = styled.img`
  width: 120px;
  height: auto;
  margin-bottom: 20px;
`;

const WelcomeText = styled.h1`
  color: #FF5733;
  font-size: 24px;
  margin-bottom: 30px;
  font-weight: bold;
`;

const FormTitle = styled.h2`
  margin-bottom: 30px;
  color: #FF5733;
  font-size: 24px;
  font-weight: bold;
`;

const Input = styled.input`
  padding: 12px 15px;
  margin: 10px 0;
  border-radius: 8px;
  border: 2px solid #e0e0e0;
  width: 100%;
  box-sizing: border-box;
  font-size: 16px;
  transition: border-color 0.3s;

  &:focus {
    outline: none;
    border-color: #FF5733;
  }

  &:invalid {
    border-color: #ff6b6b;
  }
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  width: 100%;
  margin-bottom: 20px;
`;

const SocialButtons = styled.div`
  margin: 20px 0;
  width: 100%;
`;

const ForgotPassword = styled.span`
  display: block;
  margin: 15px 0;
  color: #666;
  cursor: pointer;
  font-size: 14px;
  
  &:hover {
    color: #FF5733;
    text-decoration: underline;
  }
`;

const ToggleAuth = styled.span`
  display: block;
  margin: 20px 0;
  color: #666;
  cursor: pointer;
  font-size: 14px;
  
  &:hover {
    color: #FF5733;
    text-decoration: underline;
  }
`;

const BackButton = styled.button`
  background: none;
  border: none;
  color: #666;
  cursor: pointer;
  font-size: 14px;
  margin-top: 20px;
  padding: 10px;
  
  &:hover {
    color: #FF5733;
    text-decoration: underline;
  }
`;

const ErrorMessage = styled.div`
  color: #ff4757;
  margin: 15px 0;
  padding: 12px;
  background-color: rgba(255, 71, 87, 0.1);
  border: 1px solid rgba(255, 71, 87, 0.3);
  border-radius: 8px;
  font-size: 14px;
  text-align: left;
`;

const SubmitButton = styled.button`
  background-color: #FF5733;
  color: white;
  padding: 12px 20px;
  border: none;
  border-radius: 8px;
  width: 100%;
  margin: 15px 0;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  box-sizing: border-box;
  transition: background-color 0.3s;

  &:hover:not(:disabled) {
    background-color: #E14A2B;
  }

  &:disabled {
    background-color: #a0a0a0;
    cursor: not-allowed;
  }
`;

export default RegisterLogin;