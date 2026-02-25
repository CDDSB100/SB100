import { useState, useEffect } from "react";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import { 
  Box, 
  Paper, 
  TextField, 
  Button, 
  Typography, 
  Container, 
  Alert, 
  IconButton, 
  InputAdornment,
  CircularProgress,
  Grid,
  Divider,
  Stack
} from "@mui/material";
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import ScienceIcon from "@mui/icons-material/Science";
import SchoolIcon from "@mui/icons-material/School";
import StorageIcon from "@mui/icons-material/Storage";
import AutoGraphIcon from "@mui/icons-material/AutoGraph";
import { useAuth } from "../hooks/useAuth";
import { login } from "../api";

function LoginPage() {
  const navigate = useNavigate();
  const auth = useAuth();
  const { isAuthenticated } = auth;

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/home");
    }
  }, [isAuthenticated, navigate]);

  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { accessToken } = await login(username, password);
      auth.login(accessToken);
      navigate("/home");
    } catch (err) {
      console.error("Login failed:", err);
      const errorMessage =
        err.response?.data?.error ||
        "Falha no login. Verifique suas credenciais.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClickShowPassword = () => setShowPassword((show) => !show);
  const handleMouseDownPassword = (event) => { event.preventDefault(); };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', bgcolor: 'white' }}>
      <Grid container>
        {/* Lado Esquerdo - Visual e Info (Oculto em Mobile) */}
        <Grid 
          item 
          xs={false} 
          sm={4} 
          md={7} 
          sx={{ 
            bgcolor: 'primary.main',
            display: { xs: 'none', sm: 'flex' },
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            p: 8,
            color: 'white',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Elementos decorativos de fundo */}
          <Box sx={{ position: 'absolute', top: -100, left: -100, width: 400, height: 400, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.05)' }} />
          <Box sx={{ position: 'absolute', bottom: -150, right: -50, width: 500, height: 500, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.03)' }} />
          
          <Box sx={{ position: 'relative', zIndex: 2, maxWidth: 600 }}>
            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 4 }}>
              <ScienceIcon sx={{ fontSize: 40, color: 'secondary.main' }} />
              <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: -1 }}>
                Plataforma Cientometria
              </Typography>
            </Stack>
            
            <Typography variant="h2" sx={{ fontWeight: 900, mb: 4, lineHeight: 1.1 }}>
              Inteligência de dados para sua <br />
              <Box component="span" sx={{ color: 'secondary.main' }}>produção acadêmica.</Box>
            </Typography>
            
            <Grid container spacing={4} sx={{ mt: 2 }}>
              <Grid item xs={6}>
                <Stack spacing={1}>
                  <SchoolIcon sx={{ color: 'secondary.main' }} />
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>Pesquisa Eficiente</Typography>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>
                    Acesse as principais bases científicas mundiais em um só lugar.
                  </Typography>
                </Stack>
              </Grid>
              <Grid item xs={6}>
                <Stack spacing={1}>
                  <AutoGraphIcon sx={{ color: 'secondary.main' }} />
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>Análise com IA</Typography>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>
                    Curadoria automatizada com modelos de linguagem avançados.
                  </Typography>
                </Stack>
              </Grid>
            </Grid>
          </Box>
        </Grid>

        {/* Lado Direito - Form de Login */}
        <Grid 
          item 
          xs={12} 
          sm={8} 
          md={5} 
          component={Paper} 
          elevation={0} 
          square 
          sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center',
            p: { xs: 4, md: 10 }
          }}
        >
          <Container maxWidth="xs" disableGutters>
            <Box sx={{ mb: 6 }}>
              <Button 
                component={RouterLink} 
                to="/" 
                startIcon={<ArrowBackIcon />} 
                sx={{ mb: 4, color: 'text.secondary', fontWeight: 600 }}
              >
                Voltar
              </Button>
              <Typography variant="h4" sx={{ fontWeight: 900, mb: 1, color: 'primary.main' }}>
                Bem-vindo de volta
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Insira suas credenciais para acessar a plataforma de curadoria.
              </Typography>
            </Box>

            <Box component="form" onSubmit={handleLogin} noValidate>
              <Stack spacing={2.5}>
                <TextField
                  fullWidth
                  id="username"
                  label="Usuário ou E-mail"
                  name="username"
                  autoComplete="username"
                  autoFocus
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                />
                <TextField
                  fullWidth
                  name="password"
                  label="Senha"
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={handleClickShowPassword}
                          onMouseDown={handleMouseDownPassword}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                
                {error && (
                  <Alert severity="error" variant="filled" sx={{ borderRadius: 2 }}>
                    {error}
                  </Alert>
                )}

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={loading}
                  sx={{ 
                    mt: 2, 
                    py: 1.8, 
                    borderRadius: '50px', 
                    fontSize: '1rem',
                    boxShadow: '0 8px 16px rgba(27, 94, 32, 0.2)'
                  }}
                >
                  {loading ? <CircularProgress size={24} color="inherit" /> : 'Entrar no Sistema'}
                </Button>
              </Stack>
            </Box>

            <Box sx={{ mt: 8, pt: 4, borderTop: '1px solid', borderColor: 'divider', textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Acesso restrito a pesquisadores autorizados.
                <br />
                Esqueceu sua senha? Entre em contato com o administrador.
              </Typography>
            </Box>
          </Container>
        </Grid>
      </Grid>
    </Box>
  );
}

export default LoginPage;
