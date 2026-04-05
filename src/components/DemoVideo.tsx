import { useRef, useState } from "react";

/**
 * Map exercise IDs to their demo video URLs.
 * Replace the placeholder values with actual video file paths or URLs.
 *
 * To add a video:
 *   1. Place the video file in /public/demos/ (e.g. /public/demos/squats.mp4)
 *   2. Add the mapping below: "squats": "/demos/squats.mp4"
 *
 * Supported formats: .mp4 (H.264), .webm (VP9)
 */
const DEMO_VIDEOS: Record<string, string> = {
  // "squats":         "/demos/squats.mp4",
  // "bicep-curls":    "/demos/bicep-curls.mp4",
  // "pushups":        "/demos/pushups.mp4",
  // "lunges":         "/demos/lunges.mp4",
  // "shoulder-press": "/demos/shoulder-press.mp4",
  // "plank":          "/demos/plank.mp4",
};

interface DemoVideoProps {
  exerciseId: string;
}

export default function DemoVideo({ exerciseId }: DemoVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasError, setHasError] = useState(false);

  const videoSrc = DEMO_VIDEOS[exerciseId];

  // No video configured for this exercise yet
  if (!videoSrc) {
    return (
      <div className="demo-video-placeholder">
        <span className="material-symbols-outlined" style={{ fontSize: 28, opacity: 0.5 }}>
          videocam_off
        </span>
        <span style={{ fontSize: 10, fontWeight: 700, opacity: 0.6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          No Demo
        </span>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="demo-video-placeholder">
        <span className="material-symbols-outlined" style={{ fontSize: 28, opacity: 0.5 }}>
          error_outline
        </span>
        <span style={{ fontSize: 10, fontWeight: 700, opacity: 0.6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Load Failed
        </span>
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      className="demo-video"
      src={videoSrc}
      autoPlay
      loop
      muted
      playsInline
      onError={() => setHasError(true)}
      style={{
        width: "100%",
        height: "auto",
        display: "block",
        objectFit: "cover",
        borderRadius: "8px 8px 0 0",
      }}
    />
  );
}
