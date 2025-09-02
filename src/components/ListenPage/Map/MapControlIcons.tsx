import { Box, Fab, Stack, useMediaQuery } from '@mui/material';
import { useRoundware, useCurrentScreen } from '@/hooks';
import RoundwareMixerControl from '../RoundwareMixerControl';
import infoIcon from '@/assets/icons/info_i_icon.svg';
import LightbulbOutlined from '@mui/icons-material/LightbulbOutlined';
import { useState } from 'react';
import InfoPopup from '@/components/InfoPopup';
import HelpPopup from '@/components/HelpPopup';

const MapControlIcons = () => {
  const { roundware } = useRoundware();
  const [showTabs, setShowTabs] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const isLandscape = useMediaQuery('(orientation: landscape)', { noSsr: true });

  // Use the custom hook to determine current screen
  const currentScreen = useCurrentScreen();

  const handleCloseTabs = () => {
    setShowTabs(false);
  };

  const handleCloseHelp = () => {
    setShowHelp(false);
  };

  return (
    <Box>
      <Stack
        spacing={2}
        position="absolute"
        top={20}
        right={isLandscape ? 60 : 20}
        zIndex={1200}
      >
        <Fab color="info" size="medium" onClick={() => setShowHelp(true)}>
          <LightbulbOutlined sx={{ fontSize: 20, color: "white" }} />
        </Fab>
        <Fab color="secondary" size="medium" onClick={() => setShowTabs(true)}>
          <Box
            component="img"
            src={infoIcon}
            alt="Info"
            sx={{
              height: 24,
              width: 24
            }}
          />
        </Fab>
        <Fab 
          color={roundware.mixer?.playing ? "primary" : "secondary"} 
          size="medium"
        >
          <RoundwareMixerControl />
        </Fab>
      </Stack>
      <InfoPopup open={showTabs} onClose={handleCloseTabs} />
      <HelpPopup open={showHelp} onClose={handleCloseHelp} currentScreen={currentScreen} />
    </Box>
  );
};

export default MapControlIcons; 