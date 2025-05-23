import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { auth, db } from "../../firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider, FacebookAuthProvider, OAuthProvider, signInWithPopup, sendPasswordResetEmail } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import styled from "styled-components";
import Cookies from "js-cookie"; // You'll need to install this package

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

  // Function to extract referral code from URL and store it in a cookie
  useEffect(() => {
    // Parse query parameters
    const searchParams = new URLSearchParams(location.search);
    const refCode = searchParams.get('ref');
    
    if (refCode) {
      // Store referral code in a cookie that expires in 30 days
      Cookies.set('referralCode', refCode, { expires: 30 });
      // Update the state
      setReferralCode(refCode);
    } else {
      // Check if we have a stored referral code in cookies
      const storedRefCode = Cookies.get('referralCode');
      if (storedRefCode) {
        setReferralCode(storedRefCode);
      }
    }
  }, [location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (isSignUp) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Use referral code from state (which could come from URL or cookie)
        const refCode = referralCode || Cookies.get('referralCode') || '';
        
        await setDoc(doc(db, "users", user.uid), { 
          email: user.email, 
          referralCode: refCode, 
          createdAt: new Date() 
        });
        
        navigate("/");
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        navigate("/");
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const googleProvider = new GoogleAuthProvider();
  const facebookProvider = new FacebookAuthProvider();
  const appleProvider = new OAuthProvider("apple.com");

  // Handle Forgot Password
  const handleForgotPassword = async () => {
    if (!email) {
      setError("Please enter your email address.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      alert("Password reset email sent!");
    } catch (error) {
      setError(error.message);
    }
  };

  const handleSocialLogin = async (provider) => {
    setIsLoading(true);
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Use referral code from state or cookie
      const refCode = referralCode || Cookies.get('referralCode') || '';

      await setDoc(doc(db, "users", user.uid), {
        email: user.email,
        referralCode: refCode,
        createdAt: new Date(),
      });

      navigate("/lobby");
    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!showForm) {
    return (
      <Container>
        <LoginBox>
          <Logo src="/assets/images/logo.png" alt="Logo" />
          
          <div>
            <Button onClick={() => { setIsSignUp(true); setShowForm(true); }} isActive={true}>Sign Up</Button>
            <Button onClick={() => { setIsSignUp(false); setShowForm(true); }} isActive={false}>Sign In</Button>
          </div>

          <Divider>
            <span>or</span>
          </Divider>

          <SocialButtons>
            <SocialButton onClick={() => handleSocialLogin(googleProvider)} bgColor="#4285F4">Login with Google</SocialButton>
            {/*
            <SocialButton onClick={() => handleSocialLogin(facebookProvider)} bgColor="#3b5998">Login with Facebook</SocialButton>
            <SocialButton onClick={() => handleSocialLogin(appleProvider)} bgColor="#000">Login with Apple ID</SocialButton>
            */}
          </SocialButtons>
        </LoginBox>
      </Container>
    );
  }

  return (
    <Container>
      <LoginBox>
        <Logo src="/assets/images/logo.png" alt="Logo" />
        <FormTitle>{isSignUp ? "Sign Up" : "Sign In"}</FormTitle>

        <Form onSubmit={handleSubmit}>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter Email" required />
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter Password" required />
          
          {isSignUp && (
            <Input 
              type="text" 
              value={referralCode} 
              onChange={(e) => setReferralCode(e.target.value)} 
              placeholder="Referral Code (Optional)" 
            />
          )}
          
          <SubmitButton type="submit" disabled={isLoading}>
            {isLoading ? "Processing..." : isSignUp ? "Sign Up" : "Sign In"}
          </SubmitButton>
        </Form>

        {/* Forgot Password link */}
        {!isSignUp && (
          <ForgotPassword onClick={handleForgotPassword}>Forgot Password?</ForgotPassword>
        )}

        <ToggleAuth onClick={() => { setIsSignUp(!isSignUp); }}>
          {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
        </ToggleAuth>

        {error && <ErrorMessage>{error}</ErrorMessage>}

        <Divider>
          <span>or</span>
        </Divider>

        <SocialButtons>
          <SocialButton onClick={() => handleSocialLogin(googleProvider)} bgColor="#4285F4">Login with Google</SocialButton>
          
          {/*
          <SocialButton onClick={() => handleSocialLogin(facebookProvider)} bgColor="#3b5998">Login with Facebook</SocialButton>
          <SocialButton onClick={() => handleSocialLogin(appleProvider)} bgColor="#000">Login with Apple ID</SocialButton>
          */}
        </SocialButtons>
      </LoginBox>
    </Container>
  );
};

const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-image: url('/assets/images/background.jpg');
  background-size: cover;
  background-position: center;
  background-attachment: fixed;
`;

const LoginBox = styled.div`
  background-color: rgba(255, 255, 255, 0.8);
  padding: 30px;
  border-radius: 10px;
  text-align: center;
  width: 80%;
  max-width: 400px;
`;

const Logo = styled.img`
  width: 150px;
  height: auto;
  margin-bottom: 20px;
`;

const Input = styled.input`
  padding: 10px;
  margin: 10px 0;
  border-radius: 5px;
  border: 1px solid #ccc;
  width: 100%;
  box-sizing: border-box;
  font-size: 1rem;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  width: 100%;
`;

const SocialButtons = styled.div`
  margin: 20px 0;
  width: 100%;
`;

const ForgotPassword = styled.span`
  display: block;
  margin-top: 10px;
  color: #555;
  cursor: pointer;
`;

const ToggleAuth = styled.span`
  display: block;
  margin-top: 10px;
  color: #555;
  cursor: pointer;
`;

const ErrorMessage = styled.div`
  color: red;
  margin-top: 10px;
`;

const SubmitButton = styled.button`
  background-color: #2962ff;
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
    background-color: #1a54f7;
  }

  &:disabled {
    background-color: #a0a0a0;
    cursor: not-allowed;
  }
`;

const FormTitle = styled.h2`
  margin-bottom: 20px;
  color: #FF5733;
  font-size: 24px;
`;

export default RegisterLogin;