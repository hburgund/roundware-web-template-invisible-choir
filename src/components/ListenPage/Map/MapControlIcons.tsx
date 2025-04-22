import { Box, Fab } from '@mui/material';
import { useRoundware } from '@/hooks';
import RoundwareMixerControl from '../RoundwareMixerControl';
import infoIcon from '@/assets/icons/info_i_icon.svg';

const MapControlIcons = () => {
  const { roundware } = useRoundware();

  return (
    <>
      <Box position="absolute" top={80} right={8} zIndex={1} sx={{ mr: 2 }}>
        <Fab color="secondary" size="medium">
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
      </Box>
      <Box position="absolute" top={140} right={8} zIndex={1} sx={{ mr: 2 }}>
        <Fab 
          color={roundware.mixer?.playing ? "primary" : "secondary"} 
          size="medium"
        >
          <RoundwareMixerControl />
        </Fab>
      </Box>
    </>
  );
};

export default MapControlIcons; 