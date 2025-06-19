import { Box, Stack, Typography } from "@mui/material";
import { Fade } from "@mui/material";
import { useState, useEffect } from "react";

const JoinChoirSteps = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const steps = [
    {
      text: "Rehearse your\nsinging to the loop",
      bars: [true, false, false],
    },
    {
      text: "Record yourself\nsinging",
      bars: [false, true, false],
    },
    {
      text: "Review and Submit\nto join the choir",
      bars: [false, false, true],
    },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setIsVisible(false);
      setTimeout(() => {
        setCurrentStep((prev) => (prev + 1) % steps.length);
        setIsVisible(true);
      }, 500);
    }, 3000);

    return () => clearInterval(interval);
  }, [steps.length]);

  return (
    <Stack alignItems="center" spacing={4}>
      <Stack alignItems="center" spacing={3}>
        <Typography className="joinChoirTitle" variant="h1">Join Choir</Typography>
        <Stack
          direction="row"
          spacing={1}
          justifyContent="center"
          alignItems="center"
        >
          {steps[currentStep].bars.map((isHighlighted, index) => (
            <Box
              key={index}
              sx={{
                width: 55,
                height: 2,
                bgcolor: isHighlighted ? "primary.main" : "grey.500",
                transition: (theme) => theme.transitions.create('background-color', {
                  duration: theme.transitions.duration.standard,
                  easing: theme.transitions.easing.easeInOut,
                }),
              }}
            />
          ))}
        </Stack>
      </Stack>
      <Fade in={isVisible} timeout={500}>
        <Typography className="joinChoirText" variant="body2">
          {steps[currentStep].text}
        </Typography>
      </Fade>
    </Stack>
  );
};

export default JoinChoirSteps;
