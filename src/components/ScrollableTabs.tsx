import React, { useState } from 'react';
import { Tabs, Tab, Box, Modal, Paper, alpha, Typography, Stack, List, ListItem, IconButton, Slide, Fade } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import startsLogo from '../assets/starts_logo.png';
import europeanCommissionLogo from '../assets/european_commission_logo.png';
import mainLogo from '../assets/main_logo.png';


interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`scrollable-tabpanel-${index}`}
      aria-labelledby={`scrollable-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function ScrollableTabs() {
  const [value, setValue] = useState(0);
  const [open, setOpen] = useState(true);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      aria-labelledby="scrollable-tabs-modal"
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Slide 
        direction="up" 
        in={open} 
        mountOnEnter 
        unmountOnExit
        timeout={500}
      >
        <Paper 
          sx={{
            width: '100%',
            height: '100%',
            bgcolor: 'transparent',
            overflow: 'auto',
            position: 'relative'
          }}
        >
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            mt: 10, 
            px: 3 
          }}>
            <Box
              component="img"
              src={mainLogo}
              alt="Main Logo"
              sx={{
                height: 50,
                width: 'auto',
                display: 'flex',
                alignItems: 'center'
              }}
            />
            <IconButton
              color="primary"
              size="medium"
              edge="end"
              onClick={handleClose}
              sx={{ 
                border: 1, 
                borderColor: 'primary.main',
                width: 40,
                height: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
          <Box sx={{ width: '100%', mt: 1, pb: 10 }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs
                value={value}
                onChange={handleChange}
                variant="scrollable"
                scrollButtons={false}
                aria-label="scrollable prevent tabs example"
              >
                <Tab label="About" />
                <Tab label="Exhibitions" />
                <Tab label="Artists" />
              </Tabs>
            </Box>
            <TabPanel value={value} index={0}>
              <Typography variant="h4" color="primary" gutterBottom>
                About
              </Typography>
              <Typography variant="h6" color="primary" gutterBottom>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna.
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 8 }}>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
              </Typography>
            </TabPanel>
            <TabPanel value={value} index={1}>
              <Typography variant="h4" color="primary" gutterBottom>
                Exhibitions
              </Typography>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="subtitle1" color="primary" gutterBottom>
                    Lorem ipsum dolor
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    26 Mar 2025 - sit amet, consectetur adipiscing elit, sed do eiusmod tempor
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle1" color="primary" gutterBottom>
                    Lorem ipsum dolor
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    26 Mar 2025 - sit amet, consectetur adipiscing elit, sed do eiusmod tempor
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle1" color="primary" gutterBottom>
                    Lorem ipsum dolor
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    26 Mar 2025 - sit amet, consectetur adipiscing elit, sed do eiusmod tempor
                  </Typography>
                </Box>
              </Stack>
            </TabPanel>
            <TabPanel value={value} index={2}>
              <Typography variant="h4" color="primary" gutterBottom>
                Artists
              </Typography>
              <Stack spacing={3}>
                <Box>
                  <Typography variant="subtitle1" color="primary">
                    Name Surname
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Technical Director
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle1" color="primary">
                    Name Surname
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Technical Artist
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle1" color="primary">
                    Name Surname
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Job Title
                  </Typography>
                </Box>
              </Stack>
            </TabPanel>
          </Box>
          <Box sx={{ position: 'fixed', bottom: 70, left: 0, right: 0, px: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-end">
              <Stack direction="column" spacing={2}>
                <Box
                  component="img"
                  src={startsLogo}
                  alt="Starts Logo"
                  sx={{
                    height: 20,
                    width: 'auto'
                  }}
                />
                <Box
                  component="img"
                  src={europeanCommissionLogo}
                  alt="European Commission Logo"
                  sx={{
                    height: 40,
                    width: 'auto'
                  }}
                />
              </Stack>
              <Typography variant="body2" color="text.secondary">
                PRIVACY POLICY
              </Typography>
            </Stack>
          </Box>
        </Paper>
      </Slide>
    </Modal>
  );
} 