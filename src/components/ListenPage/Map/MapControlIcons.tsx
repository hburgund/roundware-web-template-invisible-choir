import { Box, Fab, Stack } from '@mui/material';
import { useRoundware } from '@/hooks';
import RoundwareMixerControl from '../RoundwareMixerControl';
import infoIcon from '@/assets/icons/info_i_icon.svg';
import { useState } from 'react';
import ScrollableTabs from '@/components/ScrollableTabs';

const MapControlIcons = () => {
  const { roundware } = useRoundware();
  const [showTabs, setShowTabs] = useState(false);

  const handleCloseTabs = () => {
    setShowTabs(false);
  };

  return (
    <Box>
      <Stack
        spacing={2}
        position="absolute"
        top={20}
        right={20}
        zIndex={1200}
      >
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
      <ScrollableTabs open={showTabs} onClose={handleCloseTabs} />
    </Box>
  );
};

export default MapControlIcons; 