import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { TheBoldFont } from "../load-font";

const fontFamily = TheBoldFont;

const container: React.CSSProperties = {
  justifyContent: "center",
  alignItems: "center",
  top: undefined,
  bottom: 150, // Positioned slightly higher for full sentences
  height: 300,
  paddingLeft: 100,
  paddingRight: 100,
};

const FONT_SIZE = 60; // Smaller font for sentences

export const KaraokeSentence: React.FC<{
  readonly text: string;
  readonly words: {
    text: string;
    startMs: number;
    endMs: number;
  }[];
  readonly sentenceStartMs: number;
}> = ({ text, words, sentenceStartMs }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // useCurrentFrame returns the frame relative to the start of the Sequence.
  // We need to add the sequence start time to get the absolute video time.
  const currentAbsoluteTimeMs = sentenceStartMs + (frame / fps) * 1000;

  return (
    <AbsoluteFill style={container}>
      <div
        style={{
          fontFamily,
          fontSize: FONT_SIZE,
          color: "white",
          textAlign: "center",
          lineHeight: 1.4,
          textShadow: "0px 2px 8px rgba(0,0,0,0.8)",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "15px",
        }}
      >
        {words.length > 0 ? (
          words.map((word, i) => {
            const isActive =
              currentAbsoluteTimeMs >= word.startMs && currentAbsoluteTimeMs <= word.endMs;
            
            // To ensure we highlight 'something' if we are within the sentence bounds but maybe in a silence gap between words,
            // we could look at the closest word, but for now strict timing is fine.
            // Or maybe cumulative: words already spoken are one color, current is highlighted, future is another?
            // User asked for "highlight yellow", implying karaoke style.
            
            // Style:
            // Past words: White
            // Current word: Yellow + slight scale
            // Future words: White (or slightly dimmed?)
            
            return (
              <span
                key={i}
                style={{
                  color: isActive ? "#FFE600" : "white",
                  transform: isActive ? "scale(1.1)" : "scale(1)",
                  transition: "transform 0.1s, color 0.1s",
                  display: "inline-block",
                }}
              >
                {word.text}
              </span>
            );
          })
        ) : (
          // Fallback if no word data is available
          <span>{text}</span>
        )}
      </div>
    </AbsoluteFill>
  );
};
