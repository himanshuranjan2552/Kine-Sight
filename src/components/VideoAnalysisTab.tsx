import { useState, useRef, useCallback, useEffect } from 'react';
import { EXERCISES, drawSkeleton } from '../fitness/poseEngine';
import type { ExerciseDef } from '../fitness/poseEngine';
import { analyzeVideo } from '../fitness/videoAnalyzer';
import type { VideoAnalysisReport, AnalysisProgress, FrameAnalysis } from '../fitness/videoAnalyzer';
import '../styles/video-analysis.css';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface VideoAnalysisTabProps {
  onClose: () => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
type Phase = 'upload' | 'processing' | 'report' | 'error';

export function VideoAnalysisTab({ onClose, theme = 'dark', onToggleTheme }: VideoAnalysisTabProps) {
  const isDark = theme === 'dark';
  const tc = isDark ? 'dark' : 'light'; // theme class suffix

  // Upload state
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string>('');
  const [selectedExercise, setSelectedExercise] = useState<ExerciseDef | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Processing
  const [phase, setPhase] = useState<Phase>('upload');
  const [progress, setProgress] = useState<AnalysisProgress | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Report
  const [report, setReport] = useState<VideoAnalysisReport | null>(null);

  // Video playback with skeleton
  const reportVideoRef = useRef<HTMLVideoElement>(null);
  const reportCanvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [videoPreviewUrl]);

  // ------------------------------------------------------------------
  // File handling
  // ------------------------------------------------------------------
  const handleFile = useCallback((file: File) => {
    const validTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(mp4|webm|mov|mkv)$/i)) {
      setErrorMsg('Unsupported file type. Please upload an MP4, WebM, or MOV video.');
      setPhase('error');
      return;
    }
    if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
    setVideoFile(file);
    setVideoPreviewUrl(URL.createObjectURL(file));
  }, [videoPreviewUrl]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragActive(false);
  }, []);

  const removeFile = useCallback(() => {
    if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
    setVideoFile(null);
    setVideoPreviewUrl('');
  }, [videoPreviewUrl]);

  // ------------------------------------------------------------------
  // Start analysis
  // ------------------------------------------------------------------
  const startAnalysis = useCallback(async () => {
    if (!videoFile || !selectedExercise) return;

    setPhase('processing');
    setErrorMsg('');

    try {
      const result = await analyzeVideo(videoFile, selectedExercise, (p) => {
        setProgress(p);
      });
      setReport(result);
      setPhase('report');
    } catch (err) {
      console.error('Video analysis failed:', err);
      setErrorMsg(err instanceof Error ? err.message : 'Analysis failed. Please try a different video.');
      setPhase('error');
    }
  }, [videoFile, selectedExercise]);

  // ------------------------------------------------------------------
  // Skeleton overlay on report video playback
  // ------------------------------------------------------------------
  const drawSkeletonOverlay = useCallback(() => {
    const video = reportVideoRef.current;
    const canvas = reportCanvasRef.current;
    if (!video || !canvas || !report) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      if (video.paused && rafRef.current) {
        // Still draw one frame when paused
      }

      canvas.width = video.clientWidth;
      canvas.height = video.clientHeight;

      // Find the closest frame to the current playback time
      const currentTime = video.currentTime;
      let closestFrame: FrameAnalysis | null = null;
      let minDist = Infinity;
      for (const frame of report.frames) {
        const dist = Math.abs(frame.timestamp - currentTime);
        if (dist < minDist) {
          minDist = dist;
          closestFrame = frame;
        }
      }

      if (closestFrame && closestFrame.landmarks.length > 0) {
        const exercise = EXERCISES.find(e => e.id === report.exerciseId);
        const formColor = closestFrame.form === 'good'
          ? '#22C55E'
          : closestFrame.form === 'bad'
            ? '#EF4444'
            : '#F59E0B';

        drawSkeleton(
          ctx,
          closestFrame.landmarks,
          canvas.width,
          canvas.height,
          formColor,
          exercise?.keyLandmarks,
        );
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
  }, [report]);

  useEffect(() => {
    if (phase === 'report' && report) {
      // Start skeleton overlay when report video is ready
      const video = reportVideoRef.current;
      if (video) {
        const onPlay = () => drawSkeletonOverlay();
        const onSeeked = () => drawSkeletonOverlay();
        video.addEventListener('play', onPlay);
        video.addEventListener('seeked', onSeeked);
        // Draw initial frame
        drawSkeletonOverlay();
        return () => {
          video.removeEventListener('play', onPlay);
          video.removeEventListener('seeked', onSeeked);
          if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
      }
    }
  }, [phase, report, drawSkeletonOverlay]);

  // ------------------------------------------------------------------
  // Render — Header (shared across all phases)
  // ------------------------------------------------------------------
  const renderHeader = () => (
    <header className={`va-header ${isDark ? 'va-header-dark' : 'va-header-light'}`}>
      <div className="flex items-center gap-3">
        <span className={`va-logo ${isDark ? 'text-white' : 'text-slate-900'}`}>
          KINESIGHT
        </span>
        <span style={{
          fontSize: '0.6rem',
          fontWeight: 800,
          letterSpacing: '0.15em',
          textTransform: 'uppercase' as const,
          opacity: 0.4,
          borderLeft: '1px solid',
          borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
          paddingLeft: 12,
          marginLeft: 4,
        }}>
          Video Analysis
        </span>
      </div>
      <div className="flex items-center gap-3">
        {onToggleTheme && (
          <button onClick={onToggleTheme} style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#FF5500',
            fontSize: '1.5rem',
          }} title={isDark ? 'Light mode' : 'Dark mode'}>
            <span className="material-symbols-outlined">
              {isDark ? 'light_mode' : 'dark_mode'}
            </span>
          </button>
        )}
        <button className={`va-back-btn ${isDark ? '' : 'va-back-btn-light'}`} onClick={onClose}>
          <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>arrow_back</span>
          Back
        </button>
      </div>
    </header>
  );

  // ------------------------------------------------------------------
  // Render — Upload Phase
  // ------------------------------------------------------------------
  if (phase === 'upload') {
    const canStart = !!videoFile && !!selectedExercise;

    return (
      <div className={`va-root ${isDark ? 'bg-[#0F172A] text-slate-100' : 'bg-white text-slate-900'}`}>
        {renderHeader()}
        <main className="va-main">
          <div className="va-container">
            <section className="va-upload-section">
              <h1 className="va-upload-title">
                Analyze Your <span style={{ color: '#FF5500', fontStyle: 'italic' }}>Workout</span>
              </h1>
              <p className="va-upload-subtitle">
                Upload a recorded video of your workout and get AI-powered posture analysis with rep counting, form feedback, and a detailed breakdown.
              </p>

              {/* Drop Zone */}
              <div
                className={`va-dropzone ${dragActive ? 'va-dropzone-active' : ''}`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov,.mkv"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFile(file);
                  }}
                />
                <span className="material-symbols-outlined va-dropzone-icon">upload_file</span>
                <p className="va-dropzone-text">Drop your workout video here</p>
                <p className="va-dropzone-hint">or click to browse · MP4, WebM, MOV supported</p>
              </div>

              {/* File preview */}
              {videoFile && (
                <div className={`va-file-preview ${isDark ? 'va-file-preview-dark' : 'va-file-preview-light'}`}>
                  <video
                    className="va-file-thumb"
                    src={videoPreviewUrl}
                    muted
                    playsInline
                    onLoadedData={(e) => { (e.target as HTMLVideoElement).currentTime = 1; }}
                  />
                  <div className="va-file-info">
                    <div className="va-file-name">{videoFile.name}</div>
                    <div className="va-file-meta">{formatFileSize(videoFile.size)}</div>
                  </div>
                  <button className="va-file-remove" onClick={(e) => { e.stopPropagation(); removeFile(); }}>
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>
              )}

              {/* Exercise selector */}
              <div className="va-exercise-selector">
                <p className="va-exercise-label">Select Exercise Type</p>
                <div className="va-exercise-grid">
                  {EXERCISES.map((ex) => (
                    <div
                      key={ex.id}
                      className={`va-exercise-card ${isDark ? 'va-exercise-card-dark' : 'va-exercise-card-light'} ${selectedExercise?.id === ex.id ? 'va-exercise-selected' : ''}`}
                      onClick={() => setSelectedExercise(ex)}
                    >
                      <span className="va-exercise-card-icon">{ex.icon}</span>
                      {ex.name}
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA */}
              <button
                className="va-cta-btn"
                disabled={!canStart}
                onClick={startAnalysis}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1.2rem' }}>biotech</span>
                Analyze My Form
              </button>
            </section>
          </div>
        </main>
      </div>
    );
  }

  // ------------------------------------------------------------------
  // Render — Processing Phase
  // ------------------------------------------------------------------
  if (phase === 'processing') {
    const pct = progress ? Math.round(progress.progress * 100) : 0;

    return (
      <div className={`va-root ${isDark ? 'bg-[#0F172A] text-slate-100' : 'bg-white text-slate-900'}`}>
        {renderHeader()}
        <main className="va-main">
          <div className="va-container">
            <div className="va-processing">
              <span className="va-processing-icon">🔬</span>
              <h2 className="va-processing-title">
                {progress?.phase === 'loading' ? 'Preparing Engine...' :
                 progress?.phase === 'building-report' ? 'Building Report...' :
                 'Analyzing Your Form'}
              </h2>
              <p className="va-processing-message">{progress?.message || 'Starting up...'}</p>

              <div className="va-progress-bar-container">
                <div className={`va-progress-track ${isDark ? 'va-progress-track-dark' : 'va-progress-track-light'}`}>
                  <div
                    className="va-progress-fill"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="va-progress-label">{pct}%</p>
              </div>

              {progress?.phase === 'analyzing' && (
                <p style={{ fontSize: '0.8rem', opacity: 0.4, fontWeight: 600 }}>
                  Frame {progress.currentFrame} / {progress.totalFrames}
                </p>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ------------------------------------------------------------------
  // Render — Error Phase
  // ------------------------------------------------------------------
  if (phase === 'error') {
    return (
      <div className={`va-root ${isDark ? 'bg-[#0F172A] text-slate-100' : 'bg-white text-slate-900'}`}>
        {renderHeader()}
        <main className="va-main">
          <div className="va-container">
            <div className="va-error">
              <span className="material-symbols-outlined va-error-icon">error_outline</span>
              <p className="va-error-text">{errorMsg || 'Something went wrong.'}</p>
              <button className="va-cta-btn" onClick={() => { setPhase('upload'); setErrorMsg(''); }}>
                <span className="material-symbols-outlined" style={{ fontSize: '1.2rem' }}>refresh</span>
                Try Again
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ------------------------------------------------------------------
  // Render — Report Phase
  // ------------------------------------------------------------------
  if (!report) return null;

  const formatTimestamp = (t: number) => {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Count issues for display
  const allIssues = report.reps.flatMap(r => r.worstFormIssues);
  const issueCounts = new Map<string, number>();
  for (const issue of allIssues) {
    issueCounts.set(issue, (issueCounts.get(issue) || 0) + 1);
  }

  return (
    <div className={`va-root ${isDark ? 'bg-[#0F172A] text-slate-100' : 'bg-white text-slate-900'}`}>
      {renderHeader()}
      <main className="va-main">
        <div className="va-container">
          <div className="va-report">
            {/* Report Header */}
            <div className="va-report-header">
              <h1 className="va-report-title">
                Analysis <span style={{ color: '#FF5500', fontStyle: 'italic' }}>Complete</span>
              </h1>
              <p className="va-report-subtitle">
                {report.exerciseName} · {formatTime(report.duration)} · {report.analyzedFrames} frames analyzed
              </p>
            </div>

            {/* Stats Grid */}
            <div className="va-stats-grid">
              <div className={`va-stat-card ${isDark ? 'va-stat-card-dark' : 'va-stat-card-light'}`}>
                <div className="va-stat-label">Total Reps</div>
                <div className="va-stat-value va-stat-value-primary">{report.totalReps}</div>
                <span className="material-symbols-outlined va-stat-icon">fitness_center</span>
              </div>
              <div className={`va-stat-card ${isDark ? 'va-stat-card-dark' : 'va-stat-card-light'}`}>
                <div className="va-stat-label">Accuracy</div>
                <div className={`va-stat-value ${report.overallAccuracy >= 70 ? 'va-stat-value-green' : 'va-stat-value-red'}`}>
                  {report.overallAccuracy}%
                </div>
                <span className="material-symbols-outlined va-stat-icon">target</span>
              </div>
              <div className={`va-stat-card ${isDark ? 'va-stat-card-dark' : 'va-stat-card-light'}`}>
                <div className="va-stat-label">Correct</div>
                <div className="va-stat-value va-stat-value-green">{report.correctReps}</div>
                <span className="material-symbols-outlined va-stat-icon">check_circle</span>
              </div>
              <div className={`va-stat-card ${isDark ? 'va-stat-card-dark' : 'va-stat-card-light'}`}>
                <div className="va-stat-label">Incorrect</div>
                <div className="va-stat-value va-stat-value-red">{report.incorrectReps}</div>
                <span className="material-symbols-outlined va-stat-icon">cancel</span>
              </div>
            </div>

            {/* Video Playback with Skeleton Overlay */}
            {videoPreviewUrl && (
              <div className="va-section">
                <p className="va-section-title">Video Playback with Skeleton</p>
                <div className={`va-video-player-container ${isDark ? '' : 'va-video-player-container-light'}`}>
                  <video
                    ref={reportVideoRef}
                    className="va-video-player"
                    src={videoPreviewUrl}
                    controls
                    muted
                    playsInline
                  />
                  <canvas ref={reportCanvasRef} className="va-video-overlay-canvas" />
                </div>
              </div>
            )}

            {/* Timeline Heatmap */}
            <div className="va-section">
              <p className="va-section-title">Form Quality Timeline</p>
              <div className={`va-timeline-container ${isDark ? 'va-timeline-container-dark' : 'va-timeline-container-light'}`}>
                <div className="va-timeline-bar">
                  {report.frames.map((frame, i) => (
                    <div
                      key={i}
                      className={`va-timeline-segment ${
                        frame.form === 'good'
                          ? 'va-timeline-segment-good'
                          : frame.form === 'bad'
                            ? 'va-timeline-segment-bad'
                            : 'va-timeline-segment-unknown'
                      }`}
                      title={`${formatTimestamp(frame.timestamp)} — ${frame.form} (${frame.angle}°)`}
                    />
                  ))}
                </div>
                <div className="va-timeline-labels">
                  <span>0:00</span>
                  <span>{formatTimestamp(report.duration / 2)}</span>
                  <span>{formatTimestamp(report.duration)}</span>
                </div>
                <div className="va-timeline-legend">
                  <div className="va-legend-item">
                    <div className="va-legend-dot" style={{ background: '#22C55E' }} />
                    Good Form
                  </div>
                  <div className="va-legend-item">
                    <div className="va-legend-dot" style={{ background: '#EF4444' }} />
                    Poor Form
                  </div>
                  <div className="va-legend-item">
                    <div className="va-legend-dot" style={{ background: 'rgba(148,163,184,0.3)' }} />
                    Not Detected
                  </div>
                </div>
              </div>
            </div>

            {/* Per-Rep Breakdown */}
            <div className="va-section">
              <p className="va-section-title">Rep-by-Rep Breakdown</p>
              {report.reps.length > 0 ? (
                <div className={`va-reps-table-container ${isDark ? 'va-reps-table-container-dark' : 'va-reps-table-container-light'}`}>
                  <table className={`va-reps-table ${isDark ? '' : 'va-reps-table-light'}`}>
                    <thead>
                      <tr>
                        <th>Rep</th>
                        <th>Time</th>
                        <th>Form</th>
                        <th>Avg Angle</th>
                        <th>Issues</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.reps.map((rep) => (
                        <tr key={rep.repNumber}>
                          <td style={{ fontWeight: 800, fontStyle: 'italic' }}>#{rep.repNumber}</td>
                          <td style={{ fontFamily: "'SF Mono', monospace", fontSize: '0.8rem' }}>
                            {formatTimestamp(rep.startTime)} → {formatTimestamp(rep.endTime)}
                          </td>
                          <td>
                            <span className={`va-rep-badge ${rep.isCorrect ? 'va-rep-badge-good' : 'va-rep-badge-bad'}`}>
                              <span className="material-symbols-outlined" style={{ fontSize: '0.85rem' }}>
                                {rep.isCorrect ? 'check' : 'close'}
                              </span>
                              {rep.isCorrect ? 'Good' : 'Bad'}
                            </span>
                          </td>
                          <td style={{ fontWeight: 700 }}>{rep.avgAngle}°</td>
                          <td className="va-rep-issues">
                            {rep.worstFormIssues.length > 0
                              ? rep.worstFormIssues.join(', ')
                              : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="va-empty-reps">
                  No complete reps were detected. Try a video with clearer movements.
                </div>
              )}
            </div>

            {/* Common Issues */}
            <div className="va-section">
              <p className="va-section-title">Common Form Issues</p>
              {report.commonIssues.length > 0 ? (
                <div className="va-issues-list">
                  {report.commonIssues.map((issue, i) => (
                    <div key={i} className={`va-issue-item ${isDark ? 'va-issue-item-dark' : 'va-issue-item-light'}`}>
                      <span className="material-symbols-outlined va-issue-icon">warning</span>
                      <div>
                        <div className="va-issue-text">{issue}</div>
                        <div className="va-issue-count">
                          Occurred in {issueCounts.get(issue) || 0} rep{(issueCounts.get(issue) || 0) > 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={`va-no-issues ${isDark ? 'va-no-issues-dark' : 'va-no-issues-light'}`}>
                  <span className="va-no-issues-icon">🎉</span>
                  <div className="va-no-issues-text">Perfect form throughout! No issues detected.</div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="va-actions">
              <button className="va-cta-btn" onClick={() => {
                setPhase('upload');
                setReport(null);
                setVideoFile(null);
                if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
                setVideoPreviewUrl('');
                setSelectedExercise(null);
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: '1.2rem' }}>upload_file</span>
                Analyze Another Video
              </button>
              <button className={`va-back-btn ${isDark ? '' : 'va-back-btn-light'}`} onClick={onClose}>
                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>arrow_back</span>
                Back to Workouts
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
