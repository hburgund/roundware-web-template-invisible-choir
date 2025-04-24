import { Box, Fab, Stack } from '@mui/material';
import { useRoundware } from '@/hooks';
import RoundwareMixerControl from '../RoundwareMixerControl';
import infoIcon from '@/assets/icons/info_i_icon.svg';

const MapControlIcons = () => {
  const { roundware } = useRoundware();

  return (
    <Stack
      spacing={2}
      position="absolute"
      top={20}
      right={20}
      zIndex={1}
    >
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
      <Fab 
        color={roundware.mixer?.playing ? "primary" : "secondary"} 
        size="medium"
      >
        <RoundwareMixerControl />
      </Fab>
    </Stack>
  );
};

export default MapControlIcons; 