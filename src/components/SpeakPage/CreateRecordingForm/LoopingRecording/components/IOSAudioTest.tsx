import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Button, 
  Typography, 
  Paper, 
  List, 
  ListItem, 
  ListItemText,
  Alert,
  Divider,
  Fab
} from '@mui/material';

// Import audio routing utilities directly
import { 
  initializeIOSAudioRouting, 
  enumerateAudioDevices, 
  isIOSDevice, 
  isIOSSafari,
  type AudioRoutingState 
} from '@/utils/audioRouting';

interface AudioDevice {
  deviceId: string;
  label: string;
  kind: MediaDeviceKind;
  groupId?: string;
}

const IOSAudioTest: React.FC = () => {
  const [audioState, setAudioState] = useState<AudioRoutingState | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [allDevices, setAllDevices] = useState<AudioDevice[]>([]);
  const [viewportInfo, setViewportInfo] = useState<string>('');

  // Add debugging to see if component mounts
  useEffect(() => {
    console.log('IOSAudioTest component mounted');
    
    // Debug viewport and scrolling
    const updateViewportInfo = () => {
      const info = `
        Viewport: ${window.innerHeight}px
        Document Height: ${document.documentElement.scrollHeight}px
        Body Height: ${document.body.scrollHeight}px
        Scrollable: ${document.documentElement.scrollHeight > window.innerHeight}
      `;
      setViewportInfo(info);
      console.log('Viewport info:', info);
    };
    
    updateViewportInfo();
    window.addEventListener('resize', updateViewportInfo);
    
    return () => window.removeEventListener('resize', updateViewportInfo);
  }, []);

  const testAudioRouting = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('=== iOS AUDIO ROUTING TEST START ===');
      console.log('Testing iOS audio routing...');
      
      // Step 1: Enumerate all devices
      console.log('Step 1: Enumerating audio devices...');
      const devices = await enumerateAudioDevices();
      setAudioState(devices);
      
      console.log('=== DEVICE ENUMERATION RESULTS ===');
      console.log('All devices:', JSON.stringify(allDevices, null, 2));
      console.log('Audio routing state:', JSON.stringify(devices, null, 2));
      
      // Step 2: Initialize iOS audio routing
      console.log('Step 2: Initializing iOS audio routing...');
      const result = await initializeIOSAudioRouting();
      
      console.log('=== AUDIO ROUTING INITIALIZATION RESULTS ===');
      console.log('Initialization result:', JSON.stringify(result, null, 2));
      
      if (result.success) {
        setIsInitialized(true);
        setAudioState(result.audioState);
        console.log('✅ iOS audio routing test successful');
      } else {
        setError('Failed to initialize iOS audio routing');
        console.log('❌ iOS audio routing test failed');
      }
      
      console.log('=== TEST SUMMARY ===');
      console.log('Device type:', isIOSDeviceResult ? 'iOS Device' : 'Non-iOS Device');
      console.log('Browser:', isSafari ? 'Safari' : 'Other Browser');
      console.log('User agent:', navigator.userAgent);
      console.log('Headphones connected:', devices.isHeadphonesConnected);
      console.log('Built-in microphone:', devices.builtInMicrophone?.label || 'Not found');
      console.log('Preferred output device:', devices.preferredOutputDevice?.label || 'Not found');
      console.log('External microphones count:', devices.externalMicrophones.length);
      console.log('=== iOS AUDIO ROUTING TEST END ===');
      
    } catch (err) {
      setError(`Error during audio routing test: ${err}`);
      console.log('❌ Audio routing test error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const enumerateAllDevices = async () => {
    try {
      console.log('=== ENUMERATING ALL DEVICES ===');
      
      // First request microphone permission to get device labels
      try {
        console.log('Requesting microphone permission for device enumeration...');
        await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log('Microphone permission granted');
      } catch (permissionError) {
        console.log('Microphone permission not granted, device labels may be empty');
      }
      
      const devices = await navigator.mediaDevices.enumerateDevices();
      setAllDevices(devices);
      console.log('Raw device enumeration:', JSON.stringify(devices, null, 2));
      console.log('=== DEVICE ENUMERATION COMPLETE ===');
    } catch (err) {
      console.log('❌ Failed to enumerate devices:', err);
    }
  };

  useEffect(() => {
    enumerateAllDevices();
  }, []);

  const isIOSDeviceResult = isIOSDevice();
  const isSafari = isIOSSafari();

  // Add debugging to see if we get this far
  console.log('IOSAudioTest rendering, isIOSDeviceResult:', isIOSDeviceResult);

  const scrollToBottom = () => {
    console.log('Scroll to bottom clicked');
    console.log('Document height:', document.documentElement.scrollHeight);
    console.log('Body height:', document.body.scrollHeight);
    console.log('Window height:', window.innerHeight);
    
    // Try scrolling the body instead of documentElement
    document.body.scrollTo({
      top: document.body.scrollHeight,
      behavior: 'smooth'
    });
  };

  // Create a lot of test content to force scrolling
  const testContent = Array.from({ length: 20 }, (_, i) => (
    <Paper key={i} sx={{ p: 2, mb: 2, backgroundColor: i % 2 === 0 ? '#f0f0f0' : '#e0e0e0' }}>
      <Typography variant="h6">Test Section {i + 1}</Typography>
      <Typography>This is test content to make the page scrollable. Section {i + 1} of 20.</Typography>
    </Paper>
  ));

  return (
    <Box 
      sx={{ 
        p: 2, 
        width: '100%', 
        backgroundColor: 'white', 
        minHeight: '200vh', // Force it to be taller than viewport
        position: 'relative',
        // Use a container that can scroll internally
        maxHeight: '100vh',
        overflow: 'auto'
      }}
    >
      <Typography variant="h5" gutterBottom>
        iOS Audio Routing Test - Content Length: {allDevices.length} devices
      </Typography>
      
      <Alert severity="info" sx={{ mb: 2 }}>
        This component helps test and debug iOS audio routing functionality.
      </Alert>

      <Paper sx={{ p: 2, mb: 2, backgroundColor: 'lightblue' }}>
        <Typography variant="h6" gutterBottom>
          Scroll Test Section
        </Typography>
        <Typography>
          If you can see this blue section, the component is rendering. 
          Try scrolling down to see more content below.
        </Typography>
        <Button 
          variant="contained" 
          onClick={scrollToBottom}
          sx={{ mt: 1 }}
        >
          Test Scroll to Bottom
        </Button>
      </Paper>

      <Paper sx={{ p: 2, mb: 2, backgroundColor: 'lightyellow' }}>
        <Typography variant="h6" gutterBottom>
          Viewport Debug Info
        </Typography>
        <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
          {viewportInfo}
        </Typography>
      </Paper>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Device Information
        </Typography>
        <List dense>
          <ListItem>
            <ListItemText 
              primary="Device Type" 
              secondary={isIOSDeviceResult ? 'iOS Device' : 'Non-iOS Device'} 
            />
          </ListItem>
          <ListItem>
            <ListItemText 
              primary="Browser" 
              secondary={isSafari ? 'Safari' : 'Other Browser'} 
            />
          </ListItem>
          <ListItem>
            <ListItemText 
              primary="User Agent" 
              secondary={navigator.userAgent.substring(0, 50) + '...'} 
            />
          </ListItem>
        </List>
      </Paper>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Audio Routing Test
        </Typography>
        
        <Button 
          variant="contained" 
          onClick={testAudioRouting}
          disabled={isLoading}
          sx={{ mb: 2 }}
        >
          {isLoading ? 'Testing...' : 'Test Audio Routing'}
        </Button>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {isInitialized && (
          <Alert severity="success" sx={{ mb: 2 }}>
            iOS audio routing initialized successfully! Scroll down to see device analysis.
          </Alert>
        )}

        {audioState && (
          <Box sx={{ mt: 2 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              📱 Audio State Analysis (scroll down for more details)
            </Alert>
            <Typography variant="subtitle1" gutterBottom>
              Audio State Analysis
            </Typography>
            <List dense>
              <ListItem>
                <ListItemText 
                  primary="Headphones Connected" 
                  secondary={audioState.isHeadphonesConnected ? '✅ Yes (inferred from external mic)' : '❌ No'} 
                />
              </ListItem>
              <ListItem>
                <ListItemText 
                  primary="Built-in Microphone" 
                  secondary={audioState.builtInMicrophone?.label || '❌ Not found'} 
                />
              </ListItem>
              <ListItem>
                <ListItemText 
                  primary="Preferred Output Device" 
                  secondary={audioState.preferredOutputDevice?.label || '❌ iOS Safari limitation - not available'} 
                />
              </ListItem>
              <ListItem>
                <ListItemText 
                  primary="External Microphones" 
                  secondary={`${audioState.externalMicrophones.length} found`} 
                />
              </ListItem>
            </List>
          </Box>
        )}
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          All Available Devices
        </Typography>
        
        <Button 
          variant="outlined" 
          onClick={enumerateAllDevices}
          sx={{ mb: 2 }}
        >
          Refresh Devices
        </Button>

        <List dense>
          {allDevices.map((device, index) => (
            <React.Fragment key={device.deviceId}>
              <ListItem>
                <ListItemText 
                  primary={device.label || `Device ${index + 1}`}
                  secondary={`${device.kind} - ${device.deviceId}`}
                />
              </ListItem>
              {index < allDevices.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </List>
        
        <Typography variant="subtitle2" sx={{ mt: 2, color: 'text.secondary' }}>
          Raw device data for debugging:
        </Typography>
        <Typography variant="body2" component="pre" sx={{ 
          fontSize: '0.75rem', 
          backgroundColor: '#f5f5f5', 
          p: 1, 
          borderRadius: 1,
          overflow: 'auto',
          maxHeight: '200px'
        }}>
          {JSON.stringify(allDevices, null, 2)}
        </Typography>
      </Paper>

      {/* Add lots of test content to force scrolling */}
      {testContent}

      <Paper sx={{ p: 2, mb: 2, backgroundColor: 'lightgreen' }}>
        <Typography variant="h6" gutterBottom>
          Bottom Test Section
        </Typography>
        <Typography>
          If you can see this green section, you've scrolled to the bottom!
          This confirms scrolling is working.
        </Typography>
      </Paper>
      
      {/* Floating scroll button */}
      <Fab
        color="primary"
        aria-label="scroll to bottom"
        onClick={scrollToBottom}
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
        }}
      >
        ↓
      </Fab>
          </Box>
  );
};

export default IOSAudioTest;
