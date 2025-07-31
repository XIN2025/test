import * as React from "react";
import Svg, { Circle, Rect } from "react-native-svg";

export default function EvraLogo({ size = 80 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 58 58" fill="none">
      <Circle cx="29" cy="29" r="29" fill="#114131" />
      <Circle cx="29" cy="29" r="21" fill="#F6FEFB" />
      <Circle cx="29" cy="29" r="14" fill="#114131" />
      <Rect
        x="44.5885"
        y="9.94284"
        width="5.8"
        height="47.8245"
        transform="rotate(45 44.5885 9.94284)"
        fill="#114131"
      />
    </Svg>
  );
}
