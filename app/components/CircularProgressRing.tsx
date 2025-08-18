import React from "react";
import { View } from "react-native";
import Svg, { Circle, Text } from "react-native-svg";

interface CircularProgressRingProps {
  size?: number;
  strokeWidth?: number;
  progress: number; // 0 to 100
  color?: string;
  backgroundColor?: string;
  showPercentage?: boolean;
  textColor?: string;
  children?: React.ReactNode;
}

export const CircularProgressRing: React.FC<CircularProgressRingProps> = ({
  size = 60,
  strokeWidth = 4,
  progress,
  color = "#10b981",
  backgroundColor = "#e5e7eb",
  showPercentage = true,
  textColor = "#374151",
  children,
}) => {
  const center = size / 2;
  const radius = center - strokeWidth / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        {/* Background circle */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />

        {/* Progress circle */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${center} ${center})`}
        />

        {/* Percentage text */}
        {showPercentage && (
          <Text
            x={center}
            y={center}
            textAnchor="middle"
            dy="0.3em"
            fontSize={size * 0.2}
            fill={textColor}
            fontWeight="600"
          >
            {Math.round(progress)}%
          </Text>
        )}
      </Svg>

      {/* Custom children overlay */}
      {children && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {children}
        </View>
      )}
    </View>
  );
};

interface MultiRingProgressProps {
  size?: number;
  strokeWidth?: number;
  rings: Array<{
    progress: number;
    color: string;
    label?: string;
  }>;
  backgroundColor?: string;
  showOverallPercentage?: boolean;
  textColor?: string;
}

export const MultiRingProgress: React.FC<MultiRingProgressProps> = ({
  size = 80,
  strokeWidth = 3,
  rings,
  backgroundColor = "#f3f4f6",
  showOverallPercentage = true,
  textColor = "#374151",
}) => {
  const center = size / 2;
  const ringSpacing = strokeWidth + 2;
  const overallProgress =
    rings.reduce((sum, ring) => sum + ring.progress, 0) / rings.length;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        {rings.map((ring, index) => {
          const radius = center - strokeWidth / 2 - index * ringSpacing;
          const circumference = 2 * Math.PI * radius;
          const strokeDasharray = circumference;
          const strokeDashoffset =
            circumference - (ring.progress / 100) * circumference;

          return (
            <React.Fragment key={index}>
              {/* Background circle for this ring */}
              <Circle
                cx={center}
                cy={center}
                r={radius}
                stroke={backgroundColor}
                strokeWidth={strokeWidth}
                fill="transparent"
              />

              {/* Progress circle for this ring */}
              <Circle
                cx={center}
                cy={center}
                r={radius}
                stroke={ring.color}
                strokeWidth={strokeWidth}
                fill="transparent"
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                transform={`rotate(-90 ${center} ${center})`}
              />
            </React.Fragment>
          );
        })}

        {/* Overall percentage text */}
        {showOverallPercentage && (
          <Text
            x={center}
            y={center}
            textAnchor="middle"
            dy="0.3em"
            fontSize={size * 0.15}
            fill={textColor}
            fontWeight="600"
          >
            {Math.round(overallProgress)}%
          </Text>
        )}
      </Svg>
    </View>
  );
};
