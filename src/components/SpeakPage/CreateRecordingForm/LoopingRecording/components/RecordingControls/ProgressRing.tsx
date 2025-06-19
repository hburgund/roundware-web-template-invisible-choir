import { useTheme } from "@mui/material";
import { memo } from "react";

interface ProgressRingProps {
  progress: number;
  mode: "rehearse" | "recording" | "review";
}

const ProgressRing = memo(({ progress, mode }: ProgressRingProps) => {
  const theme = useTheme();

  // Main circle dimensions
  const svgSize = 305;
  const padding = 20; // Extra padding to prevent cut-off
  const viewBoxSize = svgSize + padding * 2;
  const radius = 152.5; // 305/2
  const baseStrokeWidth = 1; // Always thin
  const progressStrokeWidth =
    mode === "recording" || mode === "review" ? 14 : 1;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    mode === "review" ? 0 : circumference * (1 - progress);
  const thumbSize = 10;
  const thumbRadius = radius; // Removed strokeWidth/2 to center in band

  // Inner circle dimensions
  const innerRadius = 100; // 200/2
  const innerCircumference = 2 * Math.PI * innerRadius;
  const innerBaseStrokeWidth = 1; // Always thin
  const innerProgressStrokeWidth =
    mode === "recording" || mode === "review" ? 14 : 0;
  const innerThumbRadius = innerRadius; // Removed strokeWidth/2 to center in band

  // Calculate thumb positions
  const angle = 2 * Math.PI * progress;
  const thumbX = svgSize / 2 + thumbRadius * Math.sin(angle);
  const thumbY = svgSize / 2 - thumbRadius * Math.cos(angle);
  const innerThumbX = svgSize / 2 + innerThumbRadius * Math.sin(angle);
  const innerThumbY = svgSize / 2 - innerThumbRadius * Math.cos(angle);

  return (
    <svg
      width={svgSize}
      height={svgSize}
      viewBox={`-${padding} -${padding} ${viewBoxSize} ${viewBoxSize}`}
      style={{ overflow: "visible" }}
    >
      {/* Outer background circle */}
      <circle
        cx={svgSize / 2}
        cy={svgSize / 2}
        r={radius}
        fill="none"
        stroke={
          mode === "recording"
            ? theme.palette.common.white
            : theme.palette.background.paper
        }
        strokeWidth={baseStrokeWidth}
        strokeLinecap="round"
        transform={`rotate(-90 ${svgSize / 2} ${svgSize / 2})`}
      />
      {/* Outer progress circle */}
      <circle
        cx={svgSize / 2}
        cy={svgSize / 2}
        r={radius}
        fill="none"
        stroke={theme.palette.common.white}
        strokeWidth={progressStrokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        transform={`rotate(-90 ${svgSize / 2} ${svgSize / 2})`}
      />
      {/* Outer thumb circle */}
      <circle
        cx={thumbX}
        cy={thumbY}
        r={thumbSize / 2}
        fill={
          mode === "recording" || mode === "review"
            ? theme.palette.common.black
            : theme.palette.common.white
        }
      />

      {/* Inner solid background circle */}
      <circle
        cx={svgSize / 2}
        cy={svgSize / 2}
        r={innerRadius}
        fill={mode === "recording" ? theme.palette.secondary.main : theme.palette.background.paper}
        style={{
          filter:
            mode === "recording"
              ? `drop-shadow(0 0 8px ${theme.palette.primary.main})`
              : "none",
          transition: "filter 0.5s ease-in-out",
          animation: mode === "recording" ? "pulse 2s infinite" : "none",
        }}
      />

      {/* Inner recording circle - shown when recording or in review mode */}
      {(mode === "recording" || mode === "review") && (
        <>
          {/* Inner background circle */}
          <circle
            cx={svgSize / 2}
            cy={svgSize / 2}
            r={innerRadius}
            fill="none"
            stroke={theme.palette.primary.main}
            strokeWidth={innerBaseStrokeWidth}
            strokeLinecap="round"
            transform={`rotate(-90 ${svgSize / 2} ${svgSize / 2})`}
          />
          {/* Inner progress circle */}
          <circle
            cx={svgSize / 2}
            cy={svgSize / 2}
            r={innerRadius}
            fill="none"
            stroke={theme.palette.primary.main}
            strokeWidth={innerProgressStrokeWidth}
            strokeLinecap="round"
            strokeDasharray={innerCircumference}
            strokeDashoffset={
              mode === "review" ? 0 : innerCircumference * (1 - progress)
            }
            transform={`rotate(-90 ${svgSize / 2} ${svgSize / 2})`}
          />
          {/* Inner thumb circle */}
          <circle
            cx={innerThumbX}
            cy={innerThumbY}
            r={thumbSize / 2}
            fill={theme.palette.common.black}
          />
        </>
      )}

      <style>
        {`
          @keyframes pulse {
            0% {
              filter: drop-shadow(0 0 8px ${theme.palette.primary.main});
            }
            50% {
              filter: drop-shadow(0 0 16px ${theme.palette.primary.main});
            }
            100% {
              filter: drop-shadow(0 0 8px ${theme.palette.primary.main});
            }
          }
        `}
      </style>
    </svg>
  );
});

export default ProgressRing;
