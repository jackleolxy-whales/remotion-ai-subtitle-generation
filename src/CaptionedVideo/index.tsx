import { useCallback, useEffect, useState } from "react";
import {
  AbsoluteFill,
  CalculateMetadataFunction,
  cancelRender,
  Img,
  Video,
  Sequence,
  useDelayRender,
  useVideoConfig,
  watchStaticFile,
} from "remotion";
import { z } from "zod";
import { Word } from "./Word";
import { KaraokeSentence } from "./KaraokeSentence";
import { Caption } from "@remotion/captions";
import { getVideoMetadata } from "@remotion/media-utils";
import { loadFont } from "../load-font";
import { NoCaptionFile } from "./NoCaptionFile";

export type SubtitleProp = {
  startInSeconds: number;
  text: string;
};

export const captionedVideoSchema = z.object({
  src: z.string(),
  subtitles: z.array(z.any()).optional(),
  fontSize: z.number().optional(),
  fontColor: z.string().optional(),
  highlightColor: z.string().optional(),
  outlineColor: z.string().optional(),
  outlineSize: z.number().optional(),
  subtitleY: z.number().optional(),
  originalVolume: z.number().optional(),
  subtitleBgEnabled: z.boolean().optional(),
  subtitleBgColor: z.string().optional(),
  subtitleBgRadius: z.number().optional(),
  subtitleBgPadX: z.number().optional(),
  subtitleBgPadY: z.number().optional(),
  subtitleBgOpacity: z.number().optional(),
  watermarkUrl: z.string().nullable().optional(),
  watermarkOpacity: z.number().optional(),
  watermarkSize: z.number().optional(),
  watermarkX: z.number().optional(),
  watermarkY: z.number().optional(),
});

export const calculateCaptionedVideoMetadata: CalculateMetadataFunction<
  z.infer<typeof captionedVideoSchema>
> = async ({ props }) => {
  const fps = 30;
  const metadata = await getVideoMetadata(props.src);

  return {
    fps,
    durationInFrames: Math.floor(metadata.durationInSeconds * fps),
  };
};

type CaptionWithWords = Caption & { words?: { text: string; startMs: number; endMs: number }[] };

export const CaptionedVideo: React.FC<{
  src: string;
  subtitles?: (Caption & { words?: { text: string; startMs: number; endMs: number }[] })[];
  fontSize?: number;
  fontColor?: string;
  highlightColor?: string;
  outlineColor?: string;
  outlineSize?: number;
  subtitleY?: number;
  originalVolume?: number;
  subtitleBgEnabled?: boolean;
  subtitleBgColor?: string;
  subtitleBgRadius?: number;
  subtitleBgPadX?: number;
  subtitleBgPadY?: number;
  subtitleBgOpacity?: number;
  watermarkUrl?: string | null;
  watermarkOpacity?: number;
  watermarkSize?: number;
  watermarkX?: number;
  watermarkY?: number;
}> = ({
  src,
  subtitles: initialSubtitles,
  fontSize,
  fontColor,
  highlightColor,
  outlineColor,
  outlineSize,
  subtitleY = 80,
  originalVolume,
  subtitleBgEnabled,
  subtitleBgColor,
  subtitleBgRadius,
  subtitleBgPadX,
  subtitleBgPadY,
  subtitleBgOpacity,
  watermarkUrl,
  watermarkOpacity,
  watermarkSize,
  watermarkX,
  watermarkY,
}) => {
  const [subtitles, setSubtitles] = useState<Caption[]>(initialSubtitles ?? []);
  const { delayRender, continueRender } = useDelayRender();
  const [handle] = useState(() => delayRender());
  const { fps } = useVideoConfig();

  const subtitlesFile = src
    .replace(/.mp4$/, ".json")
    .replace(/.mkv$/, ".json")
    .replace(/.mov$/, ".json")
    .replace(/.webm$/, ".json");

  const fetchSubtitles = useCallback(async () => {
    if (initialSubtitles) {
      await loadFont();
      continueRender(handle);
      return;
    }

    try {
      await loadFont();
      const res = await fetch(subtitlesFile);
      const data = (await res.json()) as Caption[];
      setSubtitles(data);
      continueRender(handle);
    } catch (e) {
      cancelRender(e);
    }
  }, [handle, subtitlesFile, initialSubtitles, continueRender]);

  useEffect(() => {
    fetchSubtitles();

    const c = watchStaticFile(subtitlesFile, () => {
      fetchSubtitles();
    });

    return () => {
      c.cancel();
    };
  }, [fetchSubtitles, src, subtitlesFile]);

  const effectiveSrc = src;
  const effectiveSubtitles = subtitles as CaptionWithWords[];

  return (
    <AbsoluteFill style={{ backgroundColor: "white" }}>
      <AbsoluteFill>
        <Video
          style={{ objectFit: "cover" }}
          src={effectiveSrc}
          muted={originalVolume === 0}
          volume={() => originalVolume ?? 1}
        />
      </AbsoluteFill>

      {watermarkUrl && (
        <AbsoluteFill>
          <Img
            src={watermarkUrl}
            style={{
              position: 'absolute',
              left: `${watermarkX ?? 10}%`,
              top: `${watermarkY ?? 10}%`,
              width: `${watermarkSize ?? 20}%`,
              opacity: watermarkOpacity ?? 0.8,
            }}
          />
        </AbsoluteFill>
      )}
      
      {effectiveSubtitles.map((subtitle, index) => {
        const nextSubtitle = effectiveSubtitles[index + 1] ?? null;
        const subtitleStartFrame = (subtitle.startMs / 1000) * fps;
        const subtitleEndFrame = Math.min(
          nextSubtitle ? (nextSubtitle.startMs / 1000) * fps : Infinity,
          (subtitle.endMs / 1000) * fps
        );
        const durationInFrames = subtitleEndFrame - subtitleStartFrame;
        
        if (durationInFrames <= 0) return null;

        const hasWordLevelTimings = subtitle.words && subtitle.words.length > 0;

        return (
          <Sequence
            key={index}
            from={subtitleStartFrame}
            durationInFrames={durationInFrames}
          >
            <AbsoluteFill>
              {hasWordLevelTimings ? (
                <KaraokeSentence 
                  text={subtitle.text} 
                  words={subtitle.words!} 
                  sentenceStartMs={subtitle.startMs}
                  fontSize={fontSize}
                  fontColor={fontColor}
                  highlightColor={highlightColor}
                  outlineColor={outlineColor}
                  outlineSize={outlineSize}
                  subtitleY={subtitleY}
                  subtitleBgEnabled={subtitleBgEnabled}
                  subtitleBgColor={subtitleBgColor}
                  subtitleBgRadius={subtitleBgRadius}
                  subtitleBgPadX={subtitleBgPadX}
                  subtitleBgPadY={subtitleBgPadY}
                  subtitleBgOpacity={subtitleBgOpacity}
                />
              ) : (
                <Word 
                  text={subtitle.text} 
                  fontSize={fontSize}
                  fontColor={fontColor}
                  outlineColor={outlineColor}
                  outlineSize={outlineSize}
                  subtitleY={subtitleY}
                  subtitleBgEnabled={subtitleBgEnabled}
                  subtitleBgColor={subtitleBgColor}
                  subtitleBgRadius={subtitleBgRadius}
                  subtitleBgPadX={subtitleBgPadX}
                  subtitleBgPadY={subtitleBgPadY}
                  subtitleBgOpacity={subtitleBgOpacity}
                />
              )}
            </AbsoluteFill>
          </Sequence>
        );
      })}
      
      {effectiveSubtitles.length === 0 && <NoCaptionFile />}
    </AbsoluteFill>
  );
};
