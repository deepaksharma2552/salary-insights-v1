import { Link, useLocation } from 'react-router-dom';
import {
  Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  Typography, Box, Divider
} from '@mui/material';
import {
  Dashboard, Business, HourglassEmpty, AccountTree, History, Home
} from '@mui/icons-material';

const DRAWER_WIDTH = 240;

const NAV_ITEMS = [
  { label: 'Dashboard',      icon: <Dashboard />,       path: '/admin' },
  { label: 'Companies',      icon: <Business />,        path: '/admin/companies' },
  { label: 'Pending Review', icon: <HourglassEmpty />,  path: '/admin/pending' },
  { label: 'Level Mappings', icon: <AccountTree />,     path: '/admin/levels' },
  { label: 'Audit Logs',     icon: <History />,         path: '/admin/audit' },
];

export default function AdminSidebar() {
  const location = useLocation();

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
          bgcolor: '#1a1a2e',
          color: 'white',
        },
      }}
    >
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="h6" fontWeight={700} sx={{ color: '#e94560' }}>
          Admin Panel
        </Typography>
      </Box>
      <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />

      <List>
        {NAV_ITEMS.map(({ label, icon, path }) => (
          <ListItem key={path} disablePadding>
            <ListItemButton
              component={Link}
              to={path}
              selected={location.pathname === path}
              sx={{
                color: 'white',
                '&.Mui-selected': {
                  bgcolor: 'rgba(233,69,96,0.2)',
                  borderRight: '3px solid #e94560',
                },
                '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' },
              }}
            >
              <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}>{icon}</ListItemIcon>
              <ListItemText primary={label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', mt: 'auto' }} />
      <List>
        <ListItem disablePadding>
          <ListItemButton component={Link} to="/" sx={{ color: 'rgba(255,255,255,0.6)' }}>
            <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}><Home /></ListItemIcon>
            <ListItemText primary="Back to Site" />
          </ListItemButton>
        </ListItem>
      </List>
    </Drawer>
  );
}
