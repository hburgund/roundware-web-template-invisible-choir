import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Slider, Box, Typography, Paper, Button, FormControlLabel, Checkbox, TextField } from '@mui/material';
import { useRoundware } from '@/hooks';
import config from '@/config';

interface TimeMachineSliderProps {
  className?: string;
  onHidePlayButtonChange?: (hide: boolean) => void;
}

const TimeMachineSlider: React.FC<TimeMachineSliderProps> = ({ className, onHidePlayButtonChange }) => {
  const { roundware, timeMachineFilterDate, setTimeMachineFilterDate } = useRoundware();
  const [sliderValue, setSliderValue] = useState<number>(1000); // Default to max (all speakers)
  const [isAutomating, setIsAutomating] = useState<boolean>(false);
  const [hidePlayButton, setHidePlayButton] = useState<boolean>(false);
  const [speedMs, setSpeedMs] = useState<number>(100); // Speed in milliseconds per increment
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // Calculate the time range from config min and speakers max timestamps
  const timeRange = useMemo(() => {
    // Use config minimum date - ensure it's treated as UTC
    const configMinDate = new Date(config.map.timeMachineSliderMin);
    
    // Debug logging
    if (config.debugMode) {
      console.log('TimeMachineSlider - Config min date:', config.map.timeMachineSliderMin);
      console.log('TimeMachineSlider - Parsed min date:', configMinDate.toISOString());
      console.log('TimeMachineSlider - Min date local:', configMinDate.toLocaleDateString());
    }
    
    if (!roundware.speakers || !Array.isArray(roundware.speakers())) {
      return { min: configMinDate, max: configMinDate };
    }

    const speakers = roundware.speakers();
    const validTimestamps = speakers
      .filter(speaker => speaker.created && !isNaN(new Date(speaker.created).getTime()))
      .map(speaker => new Date(speaker.created).getTime());

    if (validTimestamps.length === 0) {
      return { min: configMinDate, max: configMinDate };
    }

    const maxTime = Math.max(...validTimestamps);

    return {
      min: configMinDate,
      max: new Date(maxTime)
    };
  }, [roundware.speakers]);

  // Initialize the filter date to max (show all speakers) when component mounts
  useEffect(() => {
    if (timeMachineFilterDate === null && timeRange.max) {
      setTimeMachineFilterDate(timeRange.max);
    }
  }, [timeRange.max, timeMachineFilterDate, setTimeMachineFilterDate]);

  // Convert slider value (0-1000) to actual date
  const getDateFromSliderValue = (value: number): Date => {
    const timeDiff = timeRange.max.getTime() - timeRange.min.getTime();
    const sliderTime = timeRange.min.getTime() + (timeDiff * value / 1000);
    return new Date(sliderTime);
  };

  // Convert date to slider value (0-1000)
  const getSliderValueFromDate = (date: Date): number => {
    const timeDiff = timeRange.max.getTime() - timeRange.min.getTime();
    if (timeDiff === 0) return 1000;
    const dateTime = date.getTime();
    const relativeTime = dateTime - timeRange.min.getTime();
    return Math.max(0, Math.min(1000, (relativeTime / timeDiff) * 1000));
  };

  // Update slider value when timeMachineFilterDate changes externally
  useEffect(() => {
    if (timeMachineFilterDate) {
      const newSliderValue = getSliderValueFromDate(timeMachineFilterDate);
      setSliderValue(newSliderValue);
    }
  }, [timeMachineFilterDate, timeRange.min, timeRange.max]);

  const handleSliderChange = (event: Event, newValue: number | number[]) => {
    const value = Array.isArray(newValue) ? newValue[0] : newValue;
    setSliderValue(value);
    
    const selectedDate = getDateFromSliderValue(value);
    setTimeMachineFilterDate(selectedDate);
  };

  // Animation function with consistent 1 increment per 100ms
  const animateSlider = (timestamp: number) => {
    if (!startTimeRef.current) {
      startTimeRef.current = timestamp;
    }

    const elapsed = timestamp - startTimeRef.current;
    const incrementInterval = speedMs; // Use the speed setting
    const totalIncrements = 1000;
    const totalDuration = totalIncrements * incrementInterval;
    
    const currentIncrement = Math.floor(elapsed / incrementInterval);
    const newValue = Math.min(currentIncrement, 1000);
    
    setSliderValue(newValue);
    
    const selectedDate = getDateFromSliderValue(newValue);
    setTimeMachineFilterDate(selectedDate);

    if (newValue < 1000) {
      animationRef.current = requestAnimationFrame(animateSlider);
    } else {
      setIsAutomating(false);
      startTimeRef.current = null;
    }
  };

  const handleAutomate = () => {
    if (isAutomating) {
      // Stop automation
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      setIsAutomating(false);
      startTimeRef.current = null;
    } else {
      // Start automation
      setIsAutomating(true);
      startTimeRef.current = null;
      animationRef.current = requestAnimationFrame(animateSlider);
    }
  };

  // Notify parent when hidePlayButton changes
  useEffect(() => {
    if (onHidePlayButtonChange) {
      onHidePlayButtonChange(hidePlayButton);
    }
  }, [hidePlayButton, onHidePlayButtonChange]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateOnly = (date: Date): string => {
    // Use UTC to avoid timezone issues
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC'
    });
  };

  const currentDate = getDateFromSliderValue(sliderValue);

  // Calculate current number of visible speakers within the time range
  const speakerCounts = useMemo(() => {
    if (!roundware.speakers || !Array.isArray(roundware.speakers())) {
      return { current: 0, total: 0 };
    }

    const speakers = roundware.speakers();
    const minDate = new Date(config.map.timeMachineSliderMin);
    const maxDate = timeRange.max;
    
    // Count speakers that exist within the time range (between min and max timestamps)
    const speakersInTimeRange = speakers.filter(speaker => {
      const speakerCreated = speaker.created;
      if (!speakerCreated) return false; // Exclude speakers without timestamps
      
      const speakerDate = new Date(speakerCreated);
      if (isNaN(speakerDate.getTime())) return false; // Exclude speakers with invalid timestamps
      
      // Only include speakers within the time range
      return speakerDate >= minDate && speakerDate <= maxDate;
    });
    
    // Count speakers that would be visible with current filter (within time range and before filter date)
    const visibleSpeakers = speakersInTimeRange.filter(speaker => {
      if (!timeMachineFilterDate) return true;
      
      const speakerCreated = speaker.created;
      const speakerDate = new Date(speakerCreated);
      
      // Only check if speaker is before the current filter date
      return speakerDate <= timeMachineFilterDate;
    });

    return {
      current: visibleSpeakers.length,
      total: speakersInTimeRange.length
    };
  }, [roundware.speakers, timeMachineFilterDate, timeRange.max]);

  return (
    <Paper
      elevation={3}
      sx={{
        position: 'absolute',
        bottom: 20,
        left: '5%',
        right: '5%',
        width: '90%',
        padding: 1.5,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        zIndex: 1000,
      }}
      className={className}
    >
      <Box sx={{ width: '100%' }}>
        {/* Speaker count display */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          px: 2, 
          mb: 1,
          alignItems: 'center'
        }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#333' }}>
            0
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#333' }}>
            {speakerCounts.total}
          </Typography>
        </Box>
        
        <Box sx={{ px: 2 }}>
          <Slider
            value={sliderValue}
            onChange={handleSliderChange}
            min={0}
            max={1000}
            step={1}
            marks={[
              { value: 0, label: formatDateOnly(timeRange.min) },
              { value: 1000, label: formatDateOnly(timeRange.max) }
            ]}
            valueLabelDisplay="on"
            valueLabelFormat={(value) => `${speakerCounts.current} speakers`}
            sx={{
              '& .MuiSlider-track': {
                backgroundColor: '#1976d2',
              },
              '& .MuiSlider-thumb': {
                backgroundColor: '#1976d2',
                '&:hover': {
                  backgroundColor: '#1565c0',
                },
              },
              '& .MuiSlider-mark': {
                backgroundColor: '#666',
              },
              '& .MuiSlider-markLabel': {
                fontSize: '0.75rem',
                color: '#333',
                fontWeight: 'bold',
              },
            }}
          />
        </Box>
        
        {/* Current timestamp display and controls */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          px: 2, 
          mt: 1,
          alignItems: 'center'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button
              variant={isAutomating ? "contained" : "outlined"}
              size="small"
              onClick={handleAutomate}
              sx={{
                minWidth: 80,
                height: 24,
                fontSize: '0.75rem',
                backgroundColor: isAutomating ? '#f44336' : 'transparent',
                color: isAutomating ? 'white' : '#1976d2',
                borderColor: '#1976d2',
                '&:hover': {
                  backgroundColor: isAutomating ? '#d32f2f' : '#1976d2',
                  color: 'white',
                }
              }}
            >
              {isAutomating ? 'Stop' : 'Automate'}
            </Button>
            
            <TextField
              size="small"
              type="number"
              value={speedMs}
              onChange={(e) => setSpeedMs(Math.max(10, parseInt(e.target.value) || 100))}
              inputProps={{
                min: 10,
                max: 2000,
                step: 10,
                style: { 
                  fontSize: '0.75rem',
                  width: '60px',
                  textAlign: 'center',
                  color: '#333'
                }
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  height: 24,
                  fontSize: '0.75rem',
                  color: '#333',
                  '& fieldset': {
                    borderColor: '#1976d2',
                  },
                  '&:hover fieldset': {
                    borderColor: '#1976d2',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#1976d2',
                  },
                },
                '& .MuiInputLabel-root': {
                  fontSize: '0.7rem',
                  color: '#333',
                }
              }}
            />
            <Typography variant="caption" sx={{ color: '#333', fontSize: '0.7rem' }}>
              ms
            </Typography>
          </Box>
          
          <Typography variant="caption" sx={{ color: '#333', fontWeight: 'bold' }}>
            {formatDate(currentDate)}
          </Typography>
          
          <FormControlLabel
            control={
              <Checkbox
                checked={hidePlayButton}
                onChange={(e) => setHidePlayButton(e.target.checked)}
                size="small"
                sx={{
                  color: '#1976d2',
                  '&.Mui-checked': {
                    color: '#1976d2',
                  },
                }}
              />
            }
            label={
              <Typography variant="caption" sx={{ color: '#333', fontSize: '0.7rem' }}>
                Hide Play Button
              </Typography>
            }
            sx={{ m: 0 }}
          />
        </Box>
        
        <Typography variant="caption" color="text.secondary" align="center" display="block" sx={{ mt: 1 }}>
          Move slider to filter speakers by creation time
        </Typography>
      </Box>
    </Paper>
  );
};

export default TimeMachineSlider;
