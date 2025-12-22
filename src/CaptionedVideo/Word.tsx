import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { TheBoldFont } from "../load-font";
import { makeTransform, scale, translateY } from "@remotion/animation-utils";

const fontFamily = TheBoldFont;

const container: React.CSSProperties = {
  justifyContent: "center",
  alignItems: "center",
  top: undefined,
  bottom: 350,
  height: 150,
};

const FONT_SIZE = 100;

export const Word: React.FC<{
  readonly text: string;
  readonly fontSize?: number;
  readonly fontColor?: string;
  readonly subtitleY?: number;
}> = ({ text, fontSize = 100, fontColor = "white", subtitleY = 80 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = spring({
    frame,
    fps,
    config: {
      damping: 200,
    },
    durationInFrames: 5,
  });

  const dynamicContainer: React.CSSProperties = {
    ...container,
    top: `${subtitleY}%`,
    bottom: undefined,
    transform: 'translateY(-50%)',
  };

  return (
    <AbsoluteFill style={dynamicContainer}>
      <div
        style={{
          fontFamily,
          fontSize: fontSize,
          color: fontColor,
          textTransform: "uppercase",
          textAlign: "center",
          WebkitTextStroke: `${fontSize * 0.1}px black`,
          paintOrder: "stroke",
          transform: makeTransform([
            scale(interpolate(enter, [0, 1], [0.5, 1])),
            translateY(interpolate(enter, [0, 1], [50, 0])),
          ]),
        }}
      >
        <span
          style={{
            transform: makeTransform([
                scale(interpolate(enter, [0, 1], [0.5, 1])),
                translateY(interpolate(enter, [0, 1], [50, 0])),
            ]),
          }}
        >
          {text}
        </span>
      </div>
    </AbsoluteFill>
  );
};
