import { Composition, staticFile } from "remotion";
import {
  CaptionedVideo,
  calculateCaptionedVideoMetadata,
  captionedVideoSchema,
} from "./CaptionedVideo";

// Each <Composition> is an entry in the sidebar!

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="CaptionedVideo"
      component={CaptionedVideo}
      calculateMetadata={calculateCaptionedVideoMetadata}
      schema={captionedVideoSchema}
      width={1080}
      height={1920}
      defaultProps={{
        src: staticFile("sample-video.mp4"),
        outlineColor: "black",
        outlineSize: 5,
        watermarkUrl: null,
        watermarkOpacity: 0.8,
        watermarkSize: 20,
        watermarkX: 10,
        watermarkY: 10,
      }}
    />
  );
};
