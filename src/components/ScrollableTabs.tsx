import React, { useState } from 'react';
import { Tabs, Tab, Box, Modal, Paper, alpha, Typography, Stack, List, ListItem, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import startsLogo from '../assets/starts_logo.png';
import europeanCommissionLogo from '../assets/european_commission_logo.png';


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

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  return (
    <Modal
      open={true}
      aria-labelledby="scrollable-tabs-modal"
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
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
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 10, mr: 5 }}>
          <IconButton
            color="primary"
            size="medium"
            edge="end"
            sx={{ border: 1, borderColor: 'primary.main' }}
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
    </Modal>
  );
} 