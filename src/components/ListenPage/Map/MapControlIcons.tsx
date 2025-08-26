import { Box, Fab, Stack, useMediaQuery } from '@mui/material';
import { useRoundware } from '@/hooks';
import RoundwareMixerControl from '../RoundwareMixerControl';
import infoIcon from '@/assets/icons/info_i_icon.svg';
import { useState } from 'react';
import InfoPopup from '@/components/InfoPopup';
import HelpPopup from '@/components/HelpPopup';

const MapControlIcons = () => {
  const { roundware } = useRoundware();
  const [showTabs, setShowTabs] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const isLandscape = useMediaQuery('(orientation: landscape)', { noSsr: true });

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
        <Fab color="secondary" size="medium" onClick={() => setShowHelp(true)}>
          <Box
            sx={{
              height: 24,
              width: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              color: 'inherit'
            }}
          >
            ?
          </Box>
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
      <HelpPopup open={showHelp} onClose={handleCloseHelp} />
    </Box>
  );
};

export default MapControlIcons; 