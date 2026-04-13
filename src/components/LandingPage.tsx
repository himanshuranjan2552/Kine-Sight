import { useEffect, useRef } from "react";

interface LandingPageProps {
  onGetStarted: () => void;
}

export function LandingPage({ onGetStarted }: LandingPageProps) {
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Intersection Observer for scroll animations
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("landing-visible");
          }
        });
      },
      { threshold: 0.15 }
    );

    document.querySelectorAll(".landing-animate").forEach((el) => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="landing-root">
      {/* ===== TOP NAVBAR ===== */}
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <div className="landing-logo">KINESIGHT</div>
          <div className="landing-nav-links">
            <a href="#features" className="landing-nav-link active">Features</a>
            <a href="#ai-coach" className="landing-nav-link">AI Coach</a>
            <a href="#pricing" className="landing-nav-link">Pricing</a>
          </div>
          <button className="landing-get-started-btn" onClick={onGetStarted}>
            Get Started
          </button>
        </div>
      </nav>

      {/* ===== HERO SECTION ===== */}
      <header className="landing-hero" ref={heroRef}>
        <div className="landing-hero-bg">
          <img
            alt="hero-athlete"
            className="landing-hero-img"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCECFFz5y-g91IhnI9tIhsaFefVQNL9m-dto3Ecd8S9bCdymGxzOSvI0N2zu6ArjeIv6VkGbHTlkqet_GmhSEhi8EtK3aCesc0xq3R9HIha2AM6ny-0tuxlfDEihkuxa0ZsT2G-lKemkgE2lVmlr8tiWK0CaY9t5w3Sb1Xv3bQCCEfXsIuPoUlIRFOsZlhU9LfdGbkt_nimTu4WgWYZz4jEowU53MMdX8aIy155cTnILPZU1piKJEvTPRqS3RwD0FX4bJD5GQEEcQ"
          />
          <div className="landing-hero-overlay"></div>
        </div>
        <div className="landing-hero-content">
          <div className="landing-hero-reveal">
            <span className="landing-hero-tag">KINETIC INTELLIGENCE // 001</span>
            <h1 className="landing-hero-title">
              Elite <br />Performance <br />
              <span className="landing-text-primary">Re-engineered.</span>
            </h1>
            <div className="landing-hero-actions">
              <button className="landing-cta-btn" onClick={onGetStarted}>
                Initialize Protocol
              </button>
              <p className="landing-hero-desc">
                Real-time neural feedback. Correct your form as you move. Stop guessing. Start evolving.
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* ===== NEURAL PATHWAYS SECTION ===== */}
      <section className="landing-neural" id="features">
        <div className="landing-neural-grid">
          <div className="landing-neural-left landing-animate">
            <h2 className="landing-section-title">Neural <br />Pathways.</h2>
            <p className="landing-section-desc">
              KineSight tracks 42 biomechanical nodes with sub-millisecond latency. Professional grade analysis, zero hardware required.
            </p>
            <div className="landing-features-list">
              <div className="landing-feature-item">
                <h4 className="landing-feature-title">Angular Precision</h4>
                <p className="landing-feature-desc">Real-time joint angle feedback within 0.5° of lab-grade accuracy.</p>
              </div>
              <div className="landing-feature-item">
                <h4 className="landing-feature-title">Latency-Zero</h4>
                <p className="landing-feature-desc">Instant haptic cues the micro-second your form deviates from the optimal path.</p>
              </div>
            </div>
          </div>
          <div className="landing-neural-right landing-animate">
            <div className="landing-neural-visual">
              <img
                alt="ai-skeleton"
                className="landing-neural-img"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCRUW7DvN9tCkPorS7GEkrfnZf6RT2a5sZM6jkmgdD4Vg6s07m4QKDEGdF4_nfPCIOO5whtDWOpVrdekJAJBWbR0s1uwltqmzLHE57WsJTX5-a0CJn9SCsYgZBhlRGpijNDiq8bJHx_OjijOsTnRPxs-NlnZ6V5nLCWNVBHUTtkVp_7jWzGDT42uLFYpT3qJbMOZeK8OHRcDJX0-StphWyG6AFeF1AkPySHd9GHtblbEs4v8qjpc_tRlyZD6fwREUL1QwU0LMzvnA"
              />
              <div className="landing-neural-overlay">
                <div className="landing-neural-overlay-top">
                  <div className="landing-velocity-badge">
                    <div className="landing-velocity-label">Velocity</div>
                    <div className="landing-velocity-value">0.84 M/S</div>
                  </div>
                  <div className="landing-live-badge">
                    <span className="landing-live-dot"></span>
                    <span className="landing-live-text">Live Analysis</span>
                  </div>
                </div>
                <div className="landing-progress-bar">
                  <div className="landing-progress-fill"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== THE ENGINE SECTION ===== */}
      <section className="landing-engine" id="ai-coach">
        <div className="landing-engine-header landing-animate">
          <h3 className="landing-engine-title">The <br /><span className="landing-text-primary">Engine.</span></h3>
          <p className="landing-engine-desc">Data is the new displacement. Our kinetic engine processes over 1,000 data points per second to optimize your output.</p>
        </div>
        <div className="landing-engine-grid">
          {/* AI Coach */}
          <div className="landing-engine-card landing-engine-card-wide landing-animate">
            <div className="landing-engine-card-content">
              <span className="landing-feature-tag">FEATURE_01</span>
              <h4 className="landing-engine-card-title">AI Coach</h4>
              <p className="landing-engine-card-desc">Predictive workload management that adjusts your intensity based on real-time muscle fatigue detection.</p>
            </div>
            <img
              alt="coach-visual"
              className="landing-engine-card-bg"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCYm4Jy2EsKhO6ubNxSew0CjgnxdPaJ6QldT28phgHKQwykSpPmuquWJy6ZX0t8TFaqI4Dfk5ORJyzA2lPYHA5rCe4pbyO4fr_p2pT_b8pHkbhiYWo_RIbcD_gY8PF2mwYNYH8uzKZxcYe8oP4hgccE00-vBgbsElUbljW9-6ai_z_cnZFozx_rt3y1mPwxW2C6m-WBSkliqcNbDCt2t33AaR66LEkXgJtyYgr_uzdopf7hP05G0YSpQuGPyIurAIq8AJ0rGuWIfQ"
            />
          </div>
          {/* Consistency Matrix */}
          <div className="landing-engine-card landing-engine-card-narrow landing-animate">
            <div>
              <span className="landing-feature-tag">FEATURE_02</span>
              <h4 className="landing-engine-card-title-sm">Consistency Matrix</h4>
              <p className="landing-engine-card-desc-sm">Training density visualization.</p>
            </div>
            <div className="landing-bar-chart">
              <div className="landing-bar" style={{ height: "50%", opacity: 0.2 }}></div>
              <div className="landing-bar" style={{ height: "75%", opacity: 0.4 }}></div>
              <div className="landing-bar" style={{ height: "25%", opacity: 0.1 }}></div>
              <div className="landing-bar" style={{ height: "100%", opacity: 1 }}></div>
              <div className="landing-bar" style={{ height: "66%", opacity: 0.6 }}></div>
            </div>
          </div>
          {/* Precision Tracking */}
          <div className="landing-engine-card landing-engine-card-full landing-animate">
            <div className="landing-precision-left">
              <span className="landing-feature-tag">FEATURE_03</span>
              <h4 className="landing-engine-card-title">Precision Tracking</h4>
              <p className="landing-engine-card-desc">From bar path tracking to sprint gate analysis. Professional metrics, consumer accessibility.</p>
            </div>
            <div className="landing-precision-stats">
              <div className="landing-stat-box">
                <div className="landing-stat-value">99.2%</div>
                <div className="landing-stat-label">Capture Rate</div>
              </div>
              <div className="landing-stat-box">
                <div className="landing-stat-value">12MS</div>
                <div className="landing-stat-label">Sync Latency</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== SOCIAL PROOF / VANGUARD SECTION ===== */}
      <section className="landing-proof">
        <div className="landing-proof-inner">
          <div className="landing-proof-left landing-animate">
            <h3 className="landing-proof-ghost">PROOF</h3>
            <h3 className="landing-proof-title">The <br />Vanguard.</h3>
            <div className="landing-testimonial">
              <p className="landing-testimonial-text">
                "KineSight identified a 3-degree hip tilt I didn't know I had. My deadlift PR increased by 40lbs in six weeks."
              </p>
              <div className="landing-testimonial-author">
                <div className="landing-testimonial-avatar">
                  <img
                    alt="testimonial-1"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuAJ_FvdmU0FjpWoCwto2QlAm3EF95xwNxXicgJ0f8ftnLs8Il42LT_kD2o1EWiUdt9j9ipUehngZbNi2_Swp2pAlgpk4t68KOKThivxYHfmUML7438KkHzMkj47w-AYjLVrc1RWkwUUpfAjd3DYmWYAMu0XtM9cXifhMWIR2o32masbjfnWhx4IG8q0lSf9RdY5pZJ0E4eULRub73cbwIELbqKytEx9lgu28Ko-JTPYFpXpplkXmxjBDc6j9YPfRQqcFwJJP88cTw"
                  />
                </div>
                <div>
                  <span className="landing-author-name">Marcus Thorne</span>
                  <span className="landing-author-role">Olympic Weightlifter</span>
                </div>
              </div>
            </div>
          </div>
          <div className="landing-proof-right landing-animate">
            <div className="landing-proof-visual">
              <img
                alt="stats-visual"
                className="landing-proof-img"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBAU5bKRbQ3AQEpyR8brtxrdwGYoCiD52rkggeN05z6xN7Mgejbh_5iLmKL3YIMJlln-8MHjuclQGzN4SvHA-K8L9Y5cZaSqBW8n9ahsNbwTuEUmA7ujGnlHYygblU_JU4Mp7fYtmk1KJXIWCAc17EvPBxzwVgJyaBql3UoLpYEy0hDpYx3ySy1CEjV2vtGjprGEqnrQCXvEeftRRpjOVRFeOp-V596ZxgBvNBBhGVolmuUNPaokcc4R_Ad_NKqnpALqCq3O9WVlw"
              />
              <div className="landing-proof-stats-bar">
                <div className="landing-proof-stat">
                  <div className="landing-proof-stat-val">1.2M+</div>
                  <div className="landing-proof-stat-label">Sessions Tracked</div>
                </div>
                <div className="landing-proof-stat">
                  <div className="landing-proof-stat-val">15%</div>
                  <div className="landing-proof-stat-label">Injury Reduction</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FINAL CTA - EVOLVE NOW ===== */}
      <section className="landing-cta-section" id="pricing">
        <div className="landing-cta-glow"></div>
        <div className="landing-cta-content landing-animate">
          <h2 className="landing-cta-title">
            Evolve <br /><span className="landing-text-primary">Now.</span>
          </h2>
          <p className="landing-cta-desc">
            The era of guesswork is over. Step into the arena with neural-guided kinetic intelligence.
          </p>
          <div className="landing-cta-buttons">
            <button className="landing-cta-btn" onClick={onGetStarted}>
              Initialize Access
            </button>
            <button className="landing-cta-btn-outline">
              View Specs
            </button>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="landing-footer-top">
            <div className="landing-footer-logo">KINESIGHT</div>
            <div className="landing-footer-links">
              <a href="#" className="landing-footer-link">Privacy</a>
              <a href="#" className="landing-footer-link">Terms</a>
              <a href="#" className="landing-footer-link">Social</a>
              <a href="#" className="landing-footer-link">Contact</a>
            </div>
          </div>
          <div className="landing-footer-bottom">
            <div>© 2024 KINESIGHT. PERFORMANCE THROUGH PRECISION.</div>
            <div className="landing-footer-status">
              <span>LATENCY // 12MS</span>
              <span className="landing-text-primary">//</span>
              <span>STATUS // NOMINAL</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
