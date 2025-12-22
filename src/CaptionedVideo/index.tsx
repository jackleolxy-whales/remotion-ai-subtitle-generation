import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AbsoluteFill,
  CalculateMetadataFunction,
  cancelRender,
  getStaticFiles,
  OffthreadVideo,
  Sequence,
  useDelayRender,
  useVideoConfig,
  watchStaticFile,
} from "remotion";
import { z } from "zod";
import { Word } from "./Word";
import { KaraokeSentence } from "./KaraokeSentence";
import { Caption, createTikTokStyleCaptions } from "@remotion/captions";
import { getVideoMetadata } from "@remotion/media-utils";
import { loadFont } from "../load-font";
import { NoCaptionFile } from "./NoCaptionFile";

export type SubtitleProp = {
  startInSeconds: number;
  text: string;
};

export const captionedVideoSchema = z.object({
  src: z.string(),
  subtitles: z.array(
    z.object({
      startMs: z.number(),
      endMs: z.number(),
      text: z.string(),
      timestampMs: z.number().optional(),
      confidence: z.number().optional(),
      words: z.array(z.object({
        text: z.string(),
        startMs: z.number(),
        endMs: z.number(),
      })).optional(),
    })
  ).optional(),
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

const getFileExists = (file: string) => {
  const files = getStaticFiles();
  const fileExists = files.find((f) => {
    return f.src === file;
  });
  return Boolean(fileExists);
};

// How many captions should be displayed at a time?
// Try out:
// - 1500 to display a lot of words at a time
// - 200 to only display 1 word at a time
const SWITCH_CAPTIONS_EVERY_MS = 1200;

export const CaptionedVideo: React.FC<{
  src: string;
  subtitles?: (Caption & { words?: { text: string; startMs: number; endMs: number }[] })[];
  fontSize?: number;
  fontColor?: string;
  highlightColor?: string;
  subtitleY?: number;
}> = ({ src, subtitles: initialSubtitles, fontSize, fontColor, highlightColor, subtitleY = 80 }) => {
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
  }, [handle, subtitlesFile, initialSubtitles]);

  useEffect(() => {
    fetchSubtitles();

    const c = watchStaticFile(subtitlesFile, () => {
      fetchSubtitles();
    });

    return () => {
      c.cancel();
    };
  }, [fetchSubtitles, src, subtitlesFile]);

  const [localVideoSrc, setLocalVideoSrc] = useState<string | null>(null);
  const [localSubtitles, setLocalSubtitles] = useState<(Caption & { words?: any[] })[] | null>(null);

  const onVideoFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const url = URL.createObjectURL(e.target.files[0]);
      setLocalVideoSrc(url);
    }
  }, []);

  const onSubtitleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (!content) return;

        // Simple SRT parser
        const parsed: Caption[] = [];
        const blocks = content.trim().split(/\n\s*\n/);
        
        for (const block of blocks) {
          const lines = block.split("\n");
          if (lines.length < 3) continue;

          const timeLine = lines[1];
          const text = lines.slice(2).join("\n");
          const [startStr, endStr] = timeLine.split(" --> ");

          if (!startStr || !endStr) continue;

          const parseTime = (timeStr: string) => {
            const [h, m, s] = timeStr.trim().split(":");
            const [sec, ms] = s.split(",");
            return (
              parseInt(h) * 3600 * 1000 +
              parseInt(m) * 60 * 1000 +
              parseInt(sec) * 1000 +
              parseInt(ms)
            );
          };

          const startMs = parseTime(startStr);
          const endMs = parseTime(endStr);

          parsed.push({
            startMs,
            endMs,
            timestampMs: startMs,
            text: text.trim(),
            confidence: 1.0,
          });
        }
        setLocalSubtitles(parsed);
      };
      reader.readAsText(file);
    }
  }, []);

  const effectiveSrc = localVideoSrc ?? src;
  // Use local subtitles if available, otherwise fallback to fetched subtitles
  const effectiveSubtitles = localSubtitles ?? subtitles;

  return (
    <AbsoluteFill style={{ backgroundColor: "white" }}>
      <AbsoluteFill>
        <OffthreadVideo
          style={{ objectFit: "cover" }}
          src={effectiveSrc}
        />
      </AbsoluteFill>
      
      {effectiveSubtitles.map((subtitle, index) => {
        const nextSubtitle = effectiveSubtitles[index + 1] ?? null;
        const subtitleStartFrame = (subtitle.startMs / 1000) * fps;
        const subtitleEndFrame = Math.min(
          nextSubtitle ? (nextSubtitle.startMs / 1000) * fps : Infinity,
          (subtitle.endMs / 1000) * fps
        );
        const durationInFrames = subtitleEndFrame - subtitleStartFrame;
        
        if (durationInFrames <= 0) return null;

        // Check if we have word-level details for Karaoke mode
        // (This field 'words' is populated by python-transcribe.py in 'sentence' mode)
        const hasWordLevelTimings = (subtitle as any).words && (subtitle as any).words.length > 0;

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
                  words={(subtitle as any).words} 
                  sentenceStartMs={subtitle.startMs}
                  fontSize={fontSize}
                  fontColor={fontColor}
                  highlightColor={highlightColor}
                  subtitleY={subtitleY}
                />
              ) : (
                <Word 
                  text={subtitle.text} 
                  fontSize={fontSize}
                  fontColor={fontColor}
                  subtitleY={subtitleY}
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
