import { useState } from "react";
import { authService } from "../firebase/authService";
import { useAuth } from "../firebase/AuthContext";

export function LoginScreen() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // Extra fields for signup
  const [age, setAge] = useState("");
  const [weight, setWeight] = useState("");
  const [gender, setGender] = useState("");
  
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { setGuestMode } = useAuth();

  const handleEmailAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isSignUp) {
        await authService.signUpWithEmail(email, password, {
          age: age ? parseInt(age) : undefined,
          weight: weight ? parseInt(weight) : undefined,
          gender: gender || undefined
        });
      } else {
        await authService.loginWithEmail(email, password);
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);
    try {
      await authService.signInWithGoogle();
    } catch (err: any) {
      setError(err.message || "Google sign in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex text-on-surface bg-surface font-body overflow-hidden">
      {/* Left side: branding/visual */}
      <div className="hidden lg:flex w-1/2 bg-inverse-surface items-center justify-center relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent pointer-events-none" />
        <div className="z-10 text-center max-w-md p-8">
          <h1 className="text-6xl font-black tracking-tighter italic text-inverse-on-surface mb-6 uppercase">
            KineSight
          </h1>
          <p className="text-xl text-inverse-on-surface/80 font-medium">
            AI-powered precision tracking for your athletic journey. Define your goals, we'll calibrate your movements.
          </p>
        </div>
      </div>

      {/* Right side: form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative dark:bg-[#0F172A] transition-colors duration-300">
        <div className="w-full max-w-md bg-surface-container-lowest dark:bg-slate-800 p-10 rounded-3xl shadow-xl border border-outline-variant/30">
          <h2 className="text-3xl font-black uppercase tracking-tight mb-2 dark:text-white">
            {isSignUp ? "Create Account" : "Access Portal"}
          </h2>
          <p className="text-secondary dark:text-slate-400 mb-8 font-medium">
            {isSignUp ? "Join the next generation of athletes." : "Welcome back. Ready for your next session?"}
          </p>

          {error && (
            <div className="mb-6 p-4 bg-error-container text-on-error-container rounded-xl text-sm font-bold animate-pulse">
              {error}
            </div>
          )}

          <form onSubmit={handleEmailAction} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-secondary dark:text-slate-400 mb-1">
                Email
              </label>
              <input 
                type="email" 
                required
                className="w-full bg-surface-container dark:bg-slate-900 border-none rounded-xl px-4 py-3 placeholder:text-secondary/50 focus:ring-2 focus:ring-primary dark:text-white transition-shadow"
                placeholder="athlete@kinesight.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-secondary dark:text-slate-400 mb-1">
                Password
              </label>
              <input 
                type="password"
                required
                className="w-full bg-surface-container dark:bg-slate-900 border-none rounded-xl px-4 py-3 placeholder:text-secondary/50 focus:ring-2 focus:ring-primary dark:text-white transition-shadow"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {isSignUp && (
              <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-secondary dark:text-slate-400 mb-1">
                    Age
                  </label>
                  <input 
                    type="number"
                    className="w-full bg-surface-container dark:bg-slate-900 border-none rounded-xl px-4 py-3 dark:text-white"
                    placeholder="24"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-secondary dark:text-slate-400 mb-1">
                    Weight (kg)
                  </label>
                  <input 
                    type="number"
                    className="w-full bg-surface-container dark:bg-slate-900 border-none rounded-xl px-4 py-3 dark:text-white"
                    placeholder="75"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-secondary dark:text-slate-400 mb-1">
                    Gender
                  </label>
                  <select 
                    className="w-full bg-surface-container dark:bg-slate-900 border-none rounded-xl px-4 py-3 dark:text-white"
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                  >
                    <option value="">Select...</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
            )}

            <button 
              disabled={loading}
              type="submit" 
              className="w-full py-4 mt-6 bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest rounded-xl transition-all active:scale-[0.98] disabled:opacity-70 flex justify-center items-center"
            >
              {loading ? <span className="material-symbols-outlined animate-spin">refresh</span> : (isSignUp ? "Initialize Profile" : "Login")}
            </button>
          </form>

          <div className="my-8 flex items-center justify-center">
            <span className="h-px w-full bg-outline-variant/30"></span>
            <span className="px-4 text-[10px] font-bold uppercase tracking-widest text-secondary">OR</span>
            <span className="h-px w-full bg-outline-variant/30"></span>
          </div>

          <div className="space-y-4">
            <button 
              disabled={loading}
              onClick={handleGoogleSignIn}
              className="w-full py-4 bg-surface hover:bg-surface-container border border-outline-variant/50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800 text-on-surface dark:text-white font-bold rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <img src="https://www.google.com/images/branding/googleg/1x/googleg_standard_color_128dp.png" alt="Google" className="w-5 h-5 bg-white rounded-full p-0.5" />
              Sign in with Google
            </button>
            
            <button 
              disabled={loading}
              onClick={() => setGuestMode(true)}
              className="w-full py-4 bg-surface-container hover:bg-surface-container-high dark:bg-slate-900 dark:hover:bg-slate-800 text-secondary dark:text-slate-300 font-bold rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">person_off</span>
              Browse as Guest
            </button>
          </div>

          <div className="mt-8 text-center">
            <button 
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm font-bold text-primary hover:underline underline-offset-4"
            >
              {isSignUp ? "Already have an account? Sign In" : "New athlete? Create an Account"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
