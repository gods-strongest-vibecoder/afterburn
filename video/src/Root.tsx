// Root composition - defines the video dimensions, duration, and fps
import { Composition } from "remotion";
import { DemoVideo } from "./DemoVideo";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="AfterburnDemo45s"
      component={DemoVideo}
      durationInFrames={1350}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};
