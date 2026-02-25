import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUsers, updateUserPermissions, deleteUser } from '../api';
import { 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, 
  Button, Typography, Box, Select, MenuItem, FormControl, InputLabel, 
  Dialog, DialogTitle, DialogContent, DialogActions, Chip,
  FormGroup, FormControlLabel, Checkbox, FormLabel, IconButton,
  Container, Stack, Avatar, Tooltip, Fade, Divider
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import GroupIcon from '@mui/icons-material/Group';
import PersonIcon from '@mui/icons-material/Person';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import Header from '../components/Header';

const CATEGORIES_OPTIONS = [
  "MANEJO ECOFISIOLÓGICO E NUTRICIONAL DA CITRICULTURA DE ALTA PERFORMANCE",
  "MANEJO DE NUTRIENTES E AGUA",
  "BIOINSUMOS"
];

const UserManagement = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newRole, setNewRole] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);

  const fetchUsers = async () => {
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDelete = async (id, username) => {
    if (window.confirm(`Excluir o usuário "${username}" permanentemente?`)) {
      try {
        await deleteUser(id);
        fetchUsers();
      } catch (error) {
        console.error('Erro ao excluir usuário:', error);
      }
    }
  };

  const handleEdit = (user) => {
    setSelectedUser(user);
    setNewRole(user.role);
    
    let cats = [];
    if (user.allowed_categories) {
      if (typeof user.allowed_categories === 'string' && user.allowed_categories.startsWith('[')) {
        try { cats = JSON.parse(user.allowed_categories); } catch (e) { cats = []; }
      } else if (Array.isArray(user.allowed_categories)) {
        cats = user.allowed_categories;
      }
    }
    setSelectedCategories(cats);
    setOpenModal(true);
  };

  const handleCategoryChange = (category) => {
    setSelectedCategories(prev => 
      prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
    );
  };

  const handleSave = async () => {
    try {
      await updateUserPermissions(selectedUser.id, newRole, selectedCategories);
      setOpenModal(false);
      fetchUsers();
    } catch (error) {
      console.error('Erro ao salvar permissões:', error);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: 10 }}>
      <Header />
      
      <Box sx={{ bgcolor: 'primary.main', color: 'white', py: 6, mb: 4 }}>
        <Container maxWidth="lg">
          <Stack direction="row" spacing={2} alignItems="center">
            <IconButton onClick={() => navigate(-1)} sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.1)' }}>
              <ArrowBackIcon />
            </IconButton>
            <Box>
              <Typography variant="h3" sx={{ fontWeight: 900 }}>Gestão de Usuários</Typography>
              <Typography variant="h6" sx={{ opacity: 0.8, fontWeight: 400 }}>Controle de acesso e permissões da equipe</Typography>
            </Box>
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="lg">
        <Fade in timeout={500}>
          <TableContainer component={Paper} sx={{ borderRadius: 4, overflow: 'hidden' }}>
            <Table>
              <TableHead sx={{ bgcolor: 'grey.50' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem' }}>Pesquisador</TableCell>
                  <TableCell sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem' }}>E-mail</TableCell>
                  <TableCell sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem' }}>Cargo (Role)</TableCell>
                  <TableCell sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem' }}>Categorias Permitidas</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem' }}>Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} hover>
                    <TableCell>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Avatar sx={{ bgcolor: user.role === 'admin' ? 'secondary.main' : 'primary.light', width: 32, height: 32 }}>
                          {user.role === 'admin' ? <AdminPanelSettingsIcon sx={{ fontSize: 18 }} /> : <PersonIcon sx={{ fontSize: 18 }} />}
                        </Avatar>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{user.username}</Typography>
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>{user.email}</TableCell>
                    <TableCell>
                      <Chip 
                        label={user.role.toUpperCase()} 
                        size="small" 
                        color={user.role === 'admin' ? 'secondary' : 'default'} 
                        sx={{ fontWeight: 800, fontSize: '0.65rem' }} 
                      />
                    </TableCell>
                    <TableCell>
                      {user.allowed_categories && (user.allowed_categories.length > 0 && user.allowed_categories !== '[]') ? (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {(typeof user.allowed_categories === 'string' && user.allowed_categories.startsWith('[') 
                            ? JSON.parse(user.allowed_categories) 
                            : user.allowed_categories).map((cat, i) => (
                              <Chip key={i} label={cat} size="small" variant="outlined" sx={{ fontSize: '0.65rem' }} />
                            ))
                          }
                        </Box>
                      ) : (
                        <Chip label="GLOBAL (TODAS)" size="small" variant="contained" sx={{ fontSize: '0.65rem', bgcolor: 'success.light', color: 'white' }} />
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Tooltip title="Editar Permissões">
                          <IconButton size="small" onClick={() => handleEdit(user)} sx={{ bgcolor: 'rgba(27, 94, 32, 0.05)' }}>
                            <EditIcon fontSize="small" color="primary" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Remover Usuário">
                          <IconButton size="small" onClick={() => handleDelete(user.id, user.username)} sx={{ bgcolor: 'rgba(211, 47, 47, 0.05)' }}>
                            <DeleteIcon fontSize="small" color="error" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Fade>
      </Container>

      <Dialog open={openModal} onClose={() => setOpenModal(false)} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle sx={{ fontWeight: 900, pb: 1 }}>Configurar Permissões</DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Stack spacing={4}>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 2, color: 'primary.main' }}>1. CARGO NO SISTEMA</Typography>
              <FormControl fullWidth>
                <InputLabel>Role</InputLabel>
                <Select value={newRole} label="Role" onChange={(e) => setNewRole(e.target.value)} sx={{ borderRadius: 3 }}>
                  <MenuItem value="admin">Administrador</MenuItem>
                  <MenuItem value="cientometria">Cientometria (Leitura/Escrita)</MenuItem>
                  <MenuItem value="curadoria_boaretto">Curador Especializado (Boaretto)</MenuItem>
                  <MenuItem value="curadoria_bonetti">Curador Especializado (Bonetti)</MenuItem>
                </Select>
              </FormControl>
            </Box>
            
            <Divider />

            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1, color: 'primary.main' }}>2. CATEGORIAS DE ACESSO</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                Selecione as categorias que este usuário poderá visualizar e curar. Deixe em branco para acesso total.
              </Typography>
              <FormGroup>
                {CATEGORIES_OPTIONS.map((cat) => (
                  <FormControlLabel
                    key={cat}
                    control={<Checkbox checked={selectedCategories.includes(cat)} onChange={() => handleCategoryChange(cat)} />}
                    label={<Typography variant="body2" sx={{ fontWeight: 500 }}>{cat}</Typography>}
                  />
                ))}
              </FormGroup>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3, bgcolor: 'grey.50' }}>
          <Button onClick={() => setOpenModal(false)} sx={{ fontWeight: 700 }}>Cancelar</Button>
          <Button onClick={handleSave} variant="contained" sx={{ px: 4, borderRadius: '50px', fontWeight: 800 }}>Salvar Alterações</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserManagement;
