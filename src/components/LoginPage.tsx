import React, { useState } from 'react';
import { 
  Box, 
  Card, 
  CardContent, 
  TextField, 
  Button, 
  Typography, 
  Alert,
  Container,
  Avatar,
  CircularProgress,
  Stack,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const GradientBackground = styled(Box)(({ theme }) => ({
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: theme.palette.mode === 'dark'
    ? '#202020'
    : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
  transition: 'background 0.3s ease',
}));

const StyledCard = styled(Card)(({ theme }) => ({
  maxWidth: 460,
  width: '100%',
  margin: '0 16px',
  boxShadow: theme.palette.mode === 'dark'
    ? '0 20px 60px rgba(0, 0, 0, 0.5)'
    : '0 20px 60px rgba(0, 0, 0, 0.12)',
  border: theme.palette.mode === 'dark'
    ? '1px solid rgba(148, 163, 184, 0.2)'
    : '1px solid rgba(226, 232, 240, 1)',
  [theme.breakpoints.down('sm')]: {
    margin: '0 12px',
  },
}));

const GradientAvatar = styled(Avatar)({
  width: 64,
  height: 64,
  background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
  boxShadow: '0 8px 24px rgba(59, 130, 246, 0.4)',
});

const GradientText = styled(Typography)({
  background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
  fontWeight: 700,
});

const GradientButton = styled(Button)({
  background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
  color: '#ffffff',
  padding: '12px 24px',
  fontSize: '15px',
  fontWeight: 500,
  textTransform: 'none',
  boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)',
  '&:hover': {
    background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
    boxShadow: '0 6px 20px rgba(59, 130, 246, 0.5)',
  },
  '&:disabled': {
    opacity: 0.6,
  },
});

const LinkButton = styled(Button)({
  textTransform: 'none',
  fontSize: '14px',
  color: '#3b82f6',
  '&:hover': {
    backgroundColor: 'transparent',
    color: '#2563eb',
  },
});

export function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, register, error: authError } = useAuth();
  const [localError, setLocalError] = useState('');

  const resetForm = () => {
    setUsername('');
    setPassword('');
    setConfirmPassword('');
    setLocalError('');
  };

  const handleToggleMode = () => {
    resetForm();
    setIsLogin(!isLogin);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');

    if (!username || !password) {
      setLocalError('Please enter both username and password');
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }

    if (!isLogin && password.length < 6) {
      setLocalError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    try {
      let success = false;
      if (isLogin) {
        success = await login(username, password);
      } else {
        success = await register(username, password);
      }

      if (!success) {
        setLocalError(authError || 'Authentication failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const error = localError || authError;

  return (
    <GradientBackground>
      <Container maxWidth="sm">
        <StyledCard>
          <CardContent sx={{ 
            padding: { xs: '32px 24px !important', sm: '48px 40px !important' }
          }}>
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <GradientAvatar sx={{ margin: '0 auto 24px' }}>
                <Sparkles size={32} color="white" />
              </GradientAvatar>
              <GradientText variant="h4" sx={{ mb: 1.5 }}>
                SDM GEN-AI Dashboard
              </GradientText>
              <Typography variant="body1" color="text.secondary">
                {isLogin
                  ? 'Sign in to access your AI-powered analytics'
                  : 'Create an account to get started'}
              </Typography>
            </Box>

            <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
              <TextField
                fullWidth
                label="Username"
                variant="outlined"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                margin="normal"
                autoComplete={isLogin ? 'username' : 'off'}
                disabled={isLoading}
                sx={{ mb: 2, '& .MuiInputBase-root': { height: '55px' } }}
              />

              <TextField
                fullWidth
                label="Password"
                type="password"
                variant="outlined"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                margin="normal"
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                disabled={isLoading}
                sx={{ mb: 2, '& .MuiInputBase-root': { height: '55px' } }}
              />

              {!isLogin && (
                <TextField
                  fullWidth
                  label="Confirm Password"
                  type="password"
                  variant="outlined"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  margin="normal"
                  autoComplete="new-password"
                  disabled={isLoading}
                  sx={{ mb: 2, '& .MuiInputBase-root': { height: '55px' } }}
                />
              )}

              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}

              <GradientButton
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={isLoading}
                sx={{ mt: 2, mb: 2, position: 'relative' }}
              >
                {isLoading ? (
                  <CircularProgress size={24} color="inherit" />
                ) : isLogin ? (
                  'Sign In'
                ) : (
                  'Create Account'
                )}
              </GradientButton>

              <Stack direction="row" justifyContent="center" spacing={1} sx={{ mt: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  {isLogin ? "Don't have an account?" : 'Already have an account?'}
                </Typography>
                <LinkButton onClick={handleToggleMode} disabled={isLoading}>
                  {isLogin ? 'Sign up' : 'Sign in'}
                </LinkButton>
              </Stack>

              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', textAlign: 'center', mt: 3 }}
              >
                {isLogin
                  ? 'Demo: Use any username and password to login'
                  : 'Create a new account to get started'}
              </Typography>
            </Box>
          </CardContent>
        </StyledCard>
      </Container>
    </GradientBackground>
  );
}
