import React, { useState, useEffect, useRef, useCallback } from 'react';

// -------------------------------------------------------------
// WEB AUDIO API - PROCEDURAL TVS RONIN 225cc ENGINE SYNTHESIZER
// -------------------------------------------------------------
function makeDistortionCurve(amount = 20) {
  const k = typeof amount === 'number' ? amount : 20;
  const n_samples = 44100;
  const curve = new Float32Array(n_samples);
  const deg = Math.PI / 180;
  for (let i = 0; i < n_samples; ++i) {
    const x = (i * 2) / n_samples - 1;
    curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
  }
  return curve;
}

class RoninEngineAudio {
  constructor() {
    this.ctx = null;
    this.osc1 = null;
    this.osc2 = null;
    this.subOsc = null;
    this.filter = null;
    this.masterGain = null;
    this.distortion = null;
    this.isMuted = false;
    this.isRunning = false;
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return;
    }
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    this.ctx = new AudioContextClass();

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    this.distortion = this.ctx.createWaveShaper();
    this.distortion.curve = makeDistortionCurve(18);
    this.distortion.oversample = '4x';
    this.distortion.connect(this.masterGain);

    this.filter = this.ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.setValueAtTime(320, this.ctx.currentTime);
    this.filter.Q.setValueAtTime(3.6, this.ctx.currentTime);
    this.filter.connect(this.distortion);

    // Fundamental cylinder combustion (Sawtooth)
    this.osc1 = this.ctx.createOscillator();
    this.osc1.type = 'sawtooth';
    this.osc1.frequency.setValueAtTime(42, this.ctx.currentTime); // ~1260 RPM idle
    this.osc1.connect(this.filter);

    // Mechanical valvetrain chatter (Triangle)
    this.osc2 = this.ctx.createOscillator();
    this.osc2.type = 'triangle';
    this.osc2.frequency.setValueAtTime(84, this.ctx.currentTime);
    this.osc2.connect(this.filter);

    // Deep sub-bass exhaust pulse (Sine)
    this.subOsc = this.ctx.createOscillator();
    this.subOsc.type = 'sine';
    this.subOsc.frequency.setValueAtTime(26, this.ctx.currentTime);
    this.subOsc.connect(this.filter);

    this.osc1.start();
    this.osc2.start();
    this.subOsc.start();
    this.isRunning = true;
  }

  startIgnition() {
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(t);
    this.masterGain.gain.setValueAtTime(0.001, t);
    this.masterGain.gain.linearRampToValueAtTime(this.isMuted ? 0.0001 : 0.09, t + 0.35);

    // Starter motor crank pitch flare into idle
    this.osc1.frequency.setValueAtTime(30, t);
    this.osc1.frequency.exponentialRampToValueAtTime(68, t + 0.22);
    this.osc1.frequency.exponentialRampToValueAtTime(44, t + 0.55);

    this.filter.frequency.setValueAtTime(480, t);
    this.filter.frequency.linearRampToValueAtTime(340, t + 0.55);
  }

  revAndRun() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    // Audible metallic snap: Side stand retracting up into frame
    try {
      const snapOsc = this.ctx.createOscillator();
      const snapGain = this.ctx.createGain();
      snapOsc.type = 'square';
      snapOsc.frequency.setValueAtTime(650, t);
      snapOsc.frequency.exponentialRampToValueAtTime(70, t + 0.08);
      snapGain.gain.setValueAtTime(this.isMuted ? 0.0001 : 0.22, t);
      snapGain.gain.linearRampToValueAtTime(0.0001, t + 0.08);
      snapOsc.connect(snapGain);
      snapGain.connect(this.masterGain);
      snapOsc.start(t);
      snapOsc.stop(t + 0.08);
    } catch {
      // fallback
    }

    this.masterGain.gain.setTargetAtTime(this.isMuted ? 0.0001 : 0.28, t + 0.08, 0.1);
    this.osc1.frequency.setTargetAtTime(195, t + 0.08, 0.4); // ~6500 RPM full throttle
    this.osc2.frequency.setTargetAtTime(390, t + 0.08, 0.4);
    this.filter.frequency.setTargetAtTime(2600, t + 0.08, 0.4);
  }

  setIdle() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.masterGain.gain.setTargetAtTime(this.isMuted ? 0.0001 : 0.08, t, 0.2);
    this.osc1.frequency.setTargetAtTime(44, t, 0.2);
    this.osc2.frequency.setTargetAtTime(88, t, 0.2);
    this.filter.frequency.setTargetAtTime(350, t, 0.2);
  }

  stop() {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.1);
    }
    this.isRunning = false;
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0.0001 : 0.08, this.ctx.currentTime, 0.05);
    }
    return this.isMuted;
  }
}

// -------------------------------------------------------------
// WEB SPEECH API - VOICE CONFIRMATION ASSISTANT
// -------------------------------------------------------------
function speakRoninVoice(text) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.pitch = 1.05;
    utterance.rate = 1.02;
    utterance.volume = 0.95;

    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(
      (v) =>
        v.lang.startsWith('en') &&
        (v.name.includes('Google') ||
          v.name.includes('Natural') ||
          v.name.includes('Siri') ||
          v.name.includes('Samantha') ||
          v.name.includes('Daniel') ||
          v.name.includes('English'))
    );
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
    window.speechSynthesis.speak(utterance);
  } catch {
    // fallback
  }
}

// -------------------------------------------------------------
// 3-STATE ANIMATION CONTROLLER CONSTANTS
// -------------------------------------------------------------
const WALK_START_X = -160; // Starting root position (pixels offset from bike anchor)
const WALK_TARGET_X = 42;  // Saddle arrival root destination (pixels offset)
const NUM_STEPS = 4;       // 4 synchronized step poses
const STEP_DURATION_MS = 450; // 450ms per pose (1800ms total walking cycle)
const WALK_DURATION_MS = NUM_STEPS * STEP_DURATION_MS; // 1800ms total walk time
const WALK_PAUSE_DURATION_MS = 900; // ~900ms standing pause before mounting (0.8-1.0s requirement)
const CROSSFADE_WALK_TO_MOUNT_MS = 550; // >= 0.5s smooth cross-fade
const MOUNT_HOLD_MS = 650;  // Peak athletic step-over leg swing hold time
const CROSSFADE_MOUNT_TO_SEATED_MS = 550; // >= 0.5s smooth cross-fade

function getInitialRoninState() {
  if (typeof window === 'undefined') {
    return { auth: 'phone', animState: 'STANDBY', started: false, running: false, speed: 0, rpm: 0 };
  }
  const params = new URLSearchParams(window.location.search);
  const s = params.get('state');
  if (s === 'seated') return { auth: 'otp', animState: 'SEATED_IDLE', started: true, running: false, speed: 0, rpm: 1350 };
  if (s === 'mounting') return { auth: 'phone', animState: 'MOUNTING', started: true, running: false, speed: 0, rpm: 1350 };
  if (s === 'pause') return { auth: 'phone', animState: 'WALK_PAUSE', started: true, running: false, speed: 0, rpm: 1350 };
  if (s === 'walking') return { auth: 'phone', animState: 'WALKING', started: true, running: false, speed: 0, rpm: 1350 };
  if (s === 'rider') return { auth: 'dashboard', animState: 'RIDING', started: true, running: true, speed: 92, rpm: 6400 };
  return { auth: 'phone', animState: 'STANDBY', started: false, running: false, speed: 0, rpm: 0 };
}

export default function App() {
  const initial = getInitialRoninState();

  // Navigation & Registration states
  const [authStep, setAuthStep] = useState(initial.auth); // 'phone' | 'otp' | 'launching' | 'dashboard'

  // Sequential Animation Controller:
  // 'STANDBY' -> 'WALKING' (State 1) -> 'WALK_PAUSE' (0.9s pause) -> 'MOUNTING' (State 2) -> 'SEATED_IDLE' (State 3) -> 'RIDING'
  const [animState, setAnimState] = useState(initial.animState);

  // Smooth Cross-Fade Blend Opacities (>= 0.5s smooth blends between all states)
  const [blendOpacities, setBlendOpacities] = useState({
    walk: initial.animState === 'WALKING' || initial.animState === 'WALK_PAUSE' ? 1.0 : 0.0,
    mount: initial.animState === 'MOUNTING' ? 1.0 : 0.0,
    seated: initial.animState === 'SEATED_IDLE' ? 1.0 : 0.0,
  });

  // State 1: Synchronized Kinematic Root Motion (v = stride_length * cycle_frequency)
  const [rootMotion, setRootMotion] = useState({
    x: initial.animState === 'MOUNTING' || initial.animState === 'SEATED_IDLE' || initial.animState === 'WALK_PAUSE' ? WALK_TARGET_X : WALK_START_X,
    y: 0,
    strideFrame: initial.animState === 'WALK_PAUSE' ? 3 : 0,
    progress: initial.animState === 'MOUNTING' || initial.animState === 'SEATED_IDLE' || initial.animState === 'WALK_PAUSE' ? 1.0 : 0,
  });

  const [phoneNumber, setPhoneNumber] = useState('9876543210');
  const [otpCode, setOtpCode] = useState(['7', '2', '8', '4']);
  const [otpTimer, setOtpTimer] = useState(30);
  const [isBikeStarted, setIsBikeStarted] = useState(initial.started);
  const [isBikeRunning, setIsBikeRunning] = useState(initial.running);
  const [pilotMode, setPilotMode] = useState('rider'); // 'rider' | 'solo'
  const [ridingMode, setRidingMode] = useState('URBAN');
  const [isAudioMuted, setIsAudioMuted] = useState(false);

  // Live telemetry
  const [speedKmh, setSpeedKmh] = useState(initial.speed);
  const [engineRpm, setEngineRpm] = useState(initial.rpm);

  const audioRef = useRef(null);
  const walkAnimIdRef = useRef(null);
  const walkPauseAnimIdRef = useRef(null);
  const mountAnimIdRef = useRef(null);
  const seatedAnimIdRef = useRef(null);
  const walkStartTimeRef = useRef(null);
  const mountStartTimeRef = useRef(null);
  const seatedStartTimeRef = useRef(null);

  // Audio setup & animation cleanup
  useEffect(() => {
    audioRef.current = new RoninEngineAudio();
    return () => {
      if (audioRef.current) audioRef.current.stop();
      if (walkAnimIdRef.current) cancelAnimationFrame(walkAnimIdRef.current);
      if (walkPauseAnimIdRef.current) cancelAnimationFrame(walkPauseAnimIdRef.current);
      if (mountAnimIdRef.current) cancelAnimationFrame(mountAnimIdRef.current);
      if (seatedAnimIdRef.current) cancelAnimationFrame(seatedAnimIdRef.current);
    };
  }, []);

  const walkCycleFrames = [
    '/stylish-walker-tight.png',    // Stride 1: Right heel contact ground strike (foot planted)
    '/stylish-walker-passing.png',  // Stride 2: Right leg supporting, left leg passing
    '/stylish-walker-left.png',     // Stride 3: Left heel contact ground strike (foot planted)
    '/stylish-walker-passing.png',  // Stride 4: Left leg supporting, right leg passing
  ];

  // OTP Timer countdown
  useEffect(() => {
    if (authStep === 'otp' && otpTimer > 0) {
      const interval = setInterval(() => setOtpTimer((t) => t - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [authStep, otpTimer]);

  // -------------------------------------------------------------
  // SEQUENTIAL 3-STATE ANIMATION CONTROLLER (SMOOTH >=0.5s BLENDS)
  // -------------------------------------------------------------

  // STATE 3: Mount -> Seated Idle Cross-Fade (550ms >= 0.5s blend, hips firmly anchored to saddle)
  const triggerSeatedTransition = useCallback((mountFinishTimestamp) => {
    seatedStartTimeRef.current = mountFinishTimestamp;
    speakRoninVoice('Cross-fading into seated helmet-adjustment pose.');

    const stepSeated = (now) => {
      const elapsed = now - seatedStartTimeRef.current;
      const t = Math.min(1.0, elapsed / CROSSFADE_MOUNT_TO_SEATED_MS);
      // Equal-power cosine cross-fade
      const wSeated = (1 - Math.cos(t * Math.PI)) / 2;

      setBlendOpacities({
        walk: 0,
        mount: Math.max(0, 1 - wSeated),
        seated: wSeated,
      });

      if (t < 1.0) {
        seatedAnimIdRef.current = requestAnimationFrame(stepSeated);
      } else {
        // STATE 3 COMPLETE: Hips locked to bike mesh, OTP active
        setAnimState('SEATED_IDLE');
        setBlendOpacities({
          walk: 0,
          mount: 0,
          seated: 1.0,
        });
        setAuthStep('otp');
        setOtpTimer(30);
        speakRoninVoice('Hips seated firmly on saddle. Helmet adjusted. Security OTP sent.');
      }
    };

    seatedAnimIdRef.current = requestAnimationFrame(stepSeated);
  }, []);

  // STATE 2: Destination Reached & Paused -> Cross-Fade WALK_PAUSE -> MOUNTING (550ms >= 0.5s blend) + Step-Over Action
  const triggerMountTransition = useCallback((arrivalTimestamp) => {
    setAnimState('MOUNTING');
    mountStartTimeRef.current = arrivalTimestamp;
    speakRoninVoice('Destination reached. Cross-fading into step-over mount.');

    const TOTAL_MOUNT_TIME = CROSSFADE_WALK_TO_MOUNT_MS + MOUNT_HOLD_MS;

    const stepMount = (now) => {
      const elapsed = now - mountStartTimeRef.current;

      // Phase A: Walk/Pause -> Mount Cross-fade (0 to 550ms)
      if (elapsed <= CROSSFADE_WALK_TO_MOUNT_MS) {
        const t = elapsed / CROSSFADE_WALK_TO_MOUNT_MS;
        const wMount = (1 - Math.cos(t * Math.PI)) / 2;
        setBlendOpacities({
          walk: Math.max(0, 1 - wMount),
          mount: wMount,
          seated: 0,
        });
      } else {
        // Phase B: Peak athletic leg swing hold
        setBlendOpacities({
          walk: 0,
          mount: 1.0,
          seated: 0,
        });
      }

      if (elapsed < TOTAL_MOUNT_TIME) {
        mountAnimIdRef.current = requestAnimationFrame(stepMount);
      } else {
        // TRIGGER STATE 3: Mount -> Seated Cross-Fade (550ms >= 0.5s)
        triggerSeatedTransition(now);
      }
    };

    mountAnimIdRef.current = requestAnimationFrame(stepMount);
  }, [triggerSeatedTransition]);

  // 1. CLICK GET OTP: Start State 1 Walking with Synchronized Stride & Root Motion (Zero Skating)
  const handleGetOtp = (e) => {
    e.preventDefault();
    if (!phoneNumber || phoneNumber.length < 8) return;

    if (walkAnimIdRef.current) cancelAnimationFrame(walkAnimIdRef.current);
    if (walkPauseAnimIdRef.current) cancelAnimationFrame(walkPauseAnimIdRef.current);
    if (mountAnimIdRef.current) cancelAnimationFrame(mountAnimIdRef.current);
    if (seatedAnimIdRef.current) cancelAnimationFrame(seatedAnimIdRef.current);

    // Start Engine & Sound (1,350 RPM idle)
    setIsBikeStarted(true);
    setEngineRpm(1350);
    setSpeedKmh(0);
    if (audioRef.current) {
      audioRef.current.startIgnition();
    }

    // Initialize State 1: WALKING
    setAnimState('WALKING');
    setBlendOpacities({ walk: 1.0, mount: 0, seated: 0 });
    speakRoninVoice('Engine started. State one: Synchronized root-motion walking.');

    walkStartTimeRef.current = performance.now();

    const stepWalk = (now) => {
      const elapsed = now - walkStartTimeRef.current;

      if (elapsed >= WALK_DURATION_MS) {
        // -------------------------------------------------------------
        // DESTINATION REACHED: FREEZE ROOT MOTION AT WALK_TARGET_X
        // TRANSITION TO WALK_PAUSE (0.8 - 1.0s, ~900ms standing pause)
        // -------------------------------------------------------------
        setRootMotion({
          x: WALK_TARGET_X,
          y: 0,
          strideFrame: 3, // Final standing / walking-stop frame (stylish-walker-passing.png)
          progress: 1.0,
        });
        setAnimState('WALK_PAUSE');
        speakRoninVoice('Destination reached. Standing at motorcycle.');

        // Pause for approximately 900ms with rootMotion.x frozen at WALK_TARGET_X, y=0
        const pauseStart = now;
        const stepPause = (pauseNow) => {
          const pauseElapsed = pauseNow - pauseStart;
          if (pauseElapsed < WALK_PAUSE_DURATION_MS) {
            walkPauseAnimIdRef.current = requestAnimationFrame(stepPause);
          } else {
            // After ~900ms pause, start smooth cross-fade WALK_PAUSE -> MOUNTING (550ms)
            triggerMountTransition(pauseNow);
          }
        };
        walkPauseAnimIdRef.current = requestAnimationFrame(stepPause);
        return;
      }

      // -------------------------------------------------------------
      // SYNCHRONIZED STRIDE & KINEMATIC ROOT MOTION (ZERO FOOT SLIDING)
      // -------------------------------------------------------------
      const poseIndex = Math.min(3, Math.floor(elapsed / STEP_DURATION_MS));
      const poseElapsed = elapsed - poseIndex * STEP_DURATION_MS;
      const u = Math.min(1.0, poseElapsed / STEP_DURATION_MS); // 0 to 1 within current pose

      let currentX;
      let currentY;

      if (poseIndex === 0) {
        // Pose 0 (stylish-walker-tight.png): Right foot strike & plant cushion
        const ease0 = Math.sin((u * Math.PI) / 2);
        currentX = -160 + 18 * ease0;
        currentY = 0;
      } else if (poseIndex === 1) {
        // Pose 1 (stylish-walker-passing.png): Left leg swings through, hips surge forward over stance leg
        const ease1 = (1 - Math.cos(u * Math.PI)) / 2;
        currentX = -142 + 83 * ease1;
        currentY = -Math.sin(u * Math.PI) * 5.5;
      } else if (poseIndex === 2) {
        // Pose 2 (stylish-walker-left.png): Left foot strike & plant cushion
        const ease2 = Math.sin((u * Math.PI) / 2);
        currentX = -59 + 18 * ease2;
        currentY = 0;
      } else {
        // Pose 3 (stylish-walker-passing.png): Right leg steps forward to join left foot; decelerates into stop
        const ease3 = (1 - Math.cos(u * Math.PI)) / 2;
        currentX = -41 + 83 * ease3;
        currentY = -Math.sin(u * Math.PI) * 5.5;
      }

      setRootMotion({
        x: currentX,
        y: currentY,
        strideFrame: poseIndex,
        progress: elapsed / WALK_DURATION_MS,
      });

      walkAnimIdRef.current = requestAnimationFrame(stepWalk);
    };

    walkAnimIdRef.current = requestAnimationFrame(stepWalk);
  };

  // 2. CLICK SUBMIT OTP: Bike revs, accelerates and runs on wheels into dashboard!
  const handleSubmitOtp = (e) => {
    e.preventDefault();
    setAuthStep('launching');
    setAnimState('RIDING');
    setIsBikeRunning(true);

    // Rev engine and launch speed
    if (audioRef.current) {
      audioRef.current.revAndRun();
    }
    setEngineRpm(6400);
    setSpeedKmh(92);

    // Voice confirmation
    speakRoninVoice('OTP verified. Side stand retracted. Launching TVS Ronin on the road.');

    // Transition into Connected Rider Dashboard after speed run
    setTimeout(() => {
      setAuthStep('dashboard');
    }, 1800);
  };

  // Handle OTP digit changes
  const handleOtpDigitChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otpCode];
    newOtp[index] = value.slice(-1);
    setOtpCode(newOtp);

    // Auto-focus next input
    if (value && index < 3) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  // Sound toggle
  const handleToggleSound = () => {
    if (audioRef.current) {
      const muted = audioRef.current.toggleMute();
      setIsAudioMuted(muted);
    }
  };

  // Park & Logout: Full reset
  const handleParkBike = () => {
    if (walkAnimIdRef.current) cancelAnimationFrame(walkAnimIdRef.current);
    if (walkPauseAnimIdRef.current) cancelAnimationFrame(walkPauseAnimIdRef.current);
    if (mountAnimIdRef.current) cancelAnimationFrame(mountAnimIdRef.current);
    if (seatedAnimIdRef.current) cancelAnimationFrame(seatedAnimIdRef.current);
    setIsBikeStarted(false);
    setIsBikeRunning(false);
    setAnimState('STANDBY');
    setRootMotion({ x: WALK_START_X, y: 0, strideFrame: 0, progress: 0 });
    setBlendOpacities({ walk: 0, mount: 0, seated: 0 });
    setSpeedKmh(0);
    setEngineRpm(0);
    setAuthStep('phone');
    if (audioRef.current) {
      audioRef.current.stop();
    }
    speakRoninVoice('Engine shut off. Side stand deployed. TVS Ronin parked safely.');
  };

  return (
    <div className="relative w-full h-screen bg-[#ffffff] text-slate-900 font-sans overflow-hidden select-none">
      {/* Pristine Luxury White Studio Showroom Floor */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: '#ffffff',
        }}
      />

      {/* 1. TOP STATUS BAR */}
      <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-4 pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto">
          <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/80 border border-slate-200/80 backdrop-blur-xl shadow-md">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isBikeRunning ? 'bg-emerald-500 animate-ping' : isBikeStarted ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <span className="text-xs font-black tracking-wider text-slate-900">TVS RONIN 225</span>
            <span className="text-[10px] font-semibold text-slate-600 px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200">
              {isBikeRunning
                ? 'RIDING LIVE ON ROAD (6,400 RPM)'
                : animState === 'MOUNTING'
                ? 'STATE 2: CROSS-FADING STEP-OVER MOUNT...'
                : animState === 'WALK_PAUSE'
                ? 'STATE 1: ARRIVED • PAUSING BEFORE MOUNT...'
                : animState === 'WALKING'
                ? 'STATE 1: ROOT-MOTION WALKING (STEPPING TO SADDLE)...'
                : animState === 'SEATED_IDLE'
                ? 'STATE 3: PARENTED TO BIKE MESH • HELMET-ADJUST IDLE'
                : isBikeStarted
                ? 'ENGINE IDLING (1,350 RPM)'
                : 'PARKED (KEY OFF)'}
            </span>
          </div>

          {/* Side Stand Live Telemetry Sensor */}
          <div className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/70 border border-slate-200/70 backdrop-blur-md text-xs text-slate-700 shadow-sm">
            <span>Side Stand:</span>
            <span className={isBikeRunning ? 'text-emerald-600 font-bold' : 'text-amber-600 font-semibold'}>
              {isBikeRunning ? 'Retracted (UP) ⚡' : 'Deployed (DOWN) 🅿️'}
            </span>
          </div>

          <div className="hidden lg:flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/70 border border-slate-200/70 backdrop-blur-md text-xs text-slate-700 shadow-sm">
            <span>T-Face DRL:</span>
            <span className={isBikeStarted ? 'text-amber-500 font-bold' : 'text-slate-400'}>
              {isBikeStarted ? 'High Beam Active ⚡' : 'Standby'}
            </span>
          </div>
        </div>

        {/* Audio Mute & Telemetry Controls */}
        <div className="flex items-center gap-3 pointer-events-auto">
          {/* Pilot View Toggle (Available when running or on dashboard) */}
          {isBikeRunning && (
            <button
              onClick={() => setPilotMode((m) => (m === 'rider' ? 'solo' : 'rider'))}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all active:scale-95 shadow-md cursor-pointer border border-slate-700"
              title="Toggle between Rider Pilot View and Solo Motorcycle View"
            >
              <span>{pilotMode === 'rider' ? '👤 Rider Pilot' : '🏍️ Solo Bike'}</span>
              <span className="text-[10px] text-amber-400 uppercase tracking-wider font-mono">Switch</span>
            </button>
          )}

          <button
            onClick={handleToggleSound}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 hover:bg-white border border-slate-200 backdrop-blur-xl text-xs text-slate-800 transition-all active:scale-95 shadow-md cursor-pointer"
          >
            {isAudioMuted ? (
              <>
                <span className="text-red-500">🔇</span>
                <span className="text-[11px] font-medium">Unmute Sound</span>
              </>
            ) : (
              <>
                <span className="text-amber-500">🔊</span>
                <span className="text-[11px] font-semibold">225cc Exhaust Sound</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* ------------------------------------------------------------- */}
      {/* 2. REAL TVS RONIN MOTORCYCLE SHOWCASE (RIGHT/CENTER DISPLAY)   */}
      {/* ------------------------------------------------------------- */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
        <div
          className={`relative transition-all duration-700 ease-out flex flex-col items-center justify-center ${
            authStep === 'dashboard'
              ? 'translate-x-0 scale-95 md:scale-100'
              : 'translate-x-0 md:translate-x-28 lg:translate-x-36'
          }`}
        >
          {/* REAL TVS RONIN BIKE CONTAINER WITH INTEGRATED GROUND & WHEEL DYNAMICS */}
          <div className="relative flex flex-col items-center">
            <div
              className={`bike-mesh-container relative transition-all duration-300 w-[500px] sm:w-[620px] md:w-[700px] lg:w-[780px] aspect-square max-h-[82vh] max-w-[82vh] flex items-center justify-center ${
                isBikeRunning ? 'animate-riding-motion' : isBikeStarted ? 'animate-engine-rumble' : ''
              }`}
            >
              {/* 1. Base Motorcycle Layer (Parked Solo) - Standby, Walking & Pause */}
              {(animState === 'STANDBY' || animState === 'WALKING' || animState === 'WALK_PAUSE' || blendOpacities.walk > 0.01) && (
                <img
                  src="/tvs-ronin.jpg"
                  alt="TVS Ronin 225 Solo"
                  className="w-full h-full object-contain transition-all duration-300 select-none"
                  style={{
                    opacity: animState === 'STANDBY' || animState === 'WALKING' || animState === 'WALK_PAUSE' ? 1 : blendOpacities.walk,
                  }}
                />
              )}

              {/* 2. State 2: Mounting Step-Over Action Clip (Smooth >=0.5s cross-fades in & out) */}
              {blendOpacities.mount > 0.005 && (
                <div
                  className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
                  style={{ opacity: blendOpacities.mount }}
                >
                  <img
                    src="/tvs-ronin-mounting.jpg"
                    alt="TVS Ronin Rider Mounting Step-Over"
                    className="w-full h-full object-contain select-none"
                  />
                </div>
              )}

              {/* 3. State 3: Seated Helmet-Adjustment Idle Pose (Parented to Bike Mesh, Hips Anchored to Saddle at 32% 52%) */}
              {blendOpacities.seated > 0.005 && (
                <div
                  className="absolute inset-0 flex items-center justify-center pointer-events-none select-none animate-helmet-idle"
                  style={{
                    opacity: blendOpacities.seated,
                    transformOrigin: '32% 52%', // Hips and saddle anchor point - zero floating
                  }}
                >
                  <img
                    src="/tvs-ronin-helmet-adjust.jpg"
                    alt="TVS Ronin Rider Seated Helmet-Adjustment Pose"
                    className="w-full h-full object-contain select-none"
                  />
                </div>
              )}

              {/* 4. State 4: Riding Mode on Road */}
              {animState === 'RIDING' && (
                <img
                  src={pilotMode === 'rider' ? '/tvs-ronin-rider.jpg' : '/tvs-ronin-standup.jpg'}
                  alt="TVS Ronin 225 Riding"
                  className="w-full h-full object-contain select-none"
                />
              )}

              {/* STATE 1: WALKING CHARACTER WITH SYNCHRONIZED ROOT MOTION & STRIDE FREQUENCY */}
              {blendOpacities.walk > 0.005 && (
                <div
                  className="absolute pointer-events-none z-20 flex flex-col items-center select-none"
                  style={{
                    bottom: '12%',
                    left: '12%',
                    height: '84%',
                    width: '38%',
                    transform: `translate3d(${rootMotion.x}px, ${rootMotion.y}px, 0)`,
                    opacity: blendOpacities.walk,
                  }}
                >
                  <img
                    src={walkCycleFrames[rootMotion.strideFrame]}
                    alt="Stylish Rider Walking on His Own Feet"
                    className="h-full w-auto object-contain filter drop-shadow-[0_20px_20px_rgba(0,0,0,0.25)]"
                  />
                  <div className="px-3.5 py-1 -mt-3 rounded-full bg-slate-900/90 text-amber-400 text-[10px] font-bold tracking-wider uppercase border border-amber-400/40 shadow-lg backdrop-blur-md flex items-center gap-1.5 animate-pulse whitespace-nowrap">
                    <span>{animState === 'WALK_PAUSE' ? '🛑' : '🚶‍♂️'}</span>
                    <span>
                      {animState === 'WALK_PAUSE'
                        ? `Arrived: ${Math.round(rootMotion.x)}px | Standing Ready`
                        : `Synchronized Root: ${Math.round(rootMotion.x)}px | Stride ${rootMotion.strideFrame + 1}/4`}
                    </span>
                  </div>
                </div>
              )}

              {/* DYNAMIC T-FACE HEADLIGHT BEAM (ACCURATELY POSITIONED ON ROUND GLASS LENS) */}
              {isBikeStarted && (
                <div
                  className="absolute pointer-events-none transition-all duration-300"
                  style={{
                    top:
                      animState === 'RIDING' && pilotMode === 'rider'
                        ? '48.3%'
                        : blendOpacities.seated > 0.5
                        ? '49.0%'
                        : blendOpacities.mount > 0.5
                        ? '48.6%'
                        : '37.3%',
                    left:
                      animState === 'RIDING' && pilotMode === 'rider'
                        ? '75.8%'
                        : blendOpacities.seated > 0.5
                        ? '74.8%'
                        : blendOpacities.mount > 0.5
                        ? '75.3%'
                        : '73.1%',
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  {/* Precision Lens matching physical TVS Ronin round headlamp */}
                  <div
                    className={`relative flex items-center justify-center pointer-events-none ${
                      (animState === 'RIDING' && pilotMode === 'rider') || blendOpacities.seated > 0.5 || blendOpacities.mount > 0.5
                        ? 'w-5 sm:w-6 h-11 sm:h-12 rounded-[50%]'
                        : 'w-10 sm:w-11 h-10 sm:h-11 rounded-full'
                    }`}
                  >
                    {/* T-Face LED Signature Glow Halo */}
                    <div
                      className={`absolute inset-0 border border-cyan-300/80 shadow-[0_0_18px_6px_rgba(56,189,248,0.85)] animate-headlight-pulse ${
                        animState === 'RIDING' || animState === 'MOUNTING' || animState === 'SEATED_IDLE'
                          ? 'rounded-[50%]'
                          : 'rounded-full'
                      }`}
                    />

                    {/* Bright Xenon Core Light Emitter */}
                    <div className="w-3 h-3 rounded-full bg-white shadow-[0_0_12px_6px_rgba(255,255,255,1),0_0_24px_8px_rgba(56,189,248,0.9)]" />

                    {/* Forward High-Beam Projection Cone Originating at Lens Face */}
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-[320px] sm:w-[460px] h-[110px] sm:h-[140px] opacity-85 pointer-events-none"
                      style={{
                        left:
                          animState === 'RIDING' || animState === 'MOUNTING' || animState === 'SEATED_IDLE'
                            ? '70%'
                            : '60%',
                        background:
                          'radial-gradient(ellipse at left center, rgba(224,242,254,0.85) 0%, rgba(56,189,248,0.25) 45%, transparent 75%)',
                        transform: 'rotate(-2deg)',
                        transformOrigin: 'left center',
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Speed Run Motion Streaks */}
              {isBikeRunning && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  <div className="absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-speed-streak" />
                  <div
                    className="absolute top-1/3 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent animate-speed-streak"
                    style={{ animationDelay: '0.2s' }}
                  />
                  <div
                    className="absolute top-2/3 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-speed-streak"
                    style={{ animationDelay: '0.4s' }}
                  />
                </div>
              )}

              {/* ROLLING HIGH-SPEED ROAD SURFACE BENEATH THE TIRES */}
              {isBikeRunning && (
                <div
                  className="absolute left-1/2 -translate-x-1/2 w-[115%] h-[32px] flex flex-col justify-end pointer-events-none"
                  style={{
                    bottom: pilotMode === 'rider' ? '13.5%' : '19.5%',
                  }}
                >
                  {/* Road Asphalt Line */}
                  <div className="w-full h-[4px] bg-slate-300/80 rounded-full shadow-inner" />
                  {/* Rapidly moving dashed white/amber lane lines */}
                  <div
                    className="w-full h-[3px] mt-1.5 animate-road-roll opacity-75"
                    style={{
                      backgroundImage:
                        'repeating-linear-gradient(90deg, #64748b 0px, #64748b 35px, transparent 35px, transparent 70px)',
                      backgroundSize: '70px 3px',
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>


      {/* ------------------------------------------------------------- */}
      {/* 3. STAGE A: PHONE NUMBER INPUT (CLICK GET OTP ➔ BIKE STARTS)  */}
      {/* ------------------------------------------------------------- */}
      {authStep === 'phone' && (
        <div className="relative z-10 w-full h-full flex flex-col justify-center items-center md:items-start p-4 sm:p-6 md:pl-10 lg:pl-16 pointer-events-none">
          <div className="w-full max-w-[360px] pointer-events-auto transition-all duration-500 ease-out">
            {/* Header Badge */}
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-600 text-[11px] font-bold tracking-wide backdrop-blur-md">
                <span>📱</span>
                <span>MOBILE REGISTRATION</span>
              </span>
              <span className="text-[11px] font-medium text-slate-500">SmartXonnect v2.4</span>
            </div>

            {/* Frosted Glass Luxury Card */}
            <div className="relative w-full p-7 rounded-3xl bg-[#0e1015]/90 backdrop-blur-2xl border border-black/10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.35)] text-white flex flex-col">
              <div className="absolute top-3 left-3 w-5 h-5 border-t-2 border-l-2 border-amber-400/60 rounded-tl-lg pointer-events-none" />
              <div className="absolute bottom-3 right-3 w-5 h-5 border-b-2 border-r-2 border-amber-400/60 rounded-br-lg pointer-events-none" />

              <h1 className="text-2xl font-bold tracking-tight text-white mb-1">
                Enter Mobile <span className="text-amber-400">Number</span>
              </h1>
              <p className="text-xs text-gray-300 mb-6">
                Clicking <span className="text-amber-400 font-semibold">Get OTP</span> will start the TVS Ronin engine with authentic sound & voice!
              </p>

              <form onSubmit={handleGetOtp} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                    Rider Mobile Number
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-xs font-bold text-amber-400">
                      +91
                    </span>
                    <input
                      type="tel"
                      required
                      maxLength="10"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                      placeholder="98765 43210"
                      className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/20 rounded-xl text-sm font-mono tracking-wider text-white placeholder-gray-500 focus:outline-none focus:border-amber-400 backdrop-blur-md transition-all shadow-inner"
                    />
                    <span className="absolute right-3.5 text-xs text-gray-400">📲</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2.5">
                  <span className="text-lg">🔊</span>
                  <div className="text-[11px] text-gray-300">
                    <span className="text-amber-400 font-semibold">Live Ignition:</span> Single-cylinder 225cc exhaust purr & T-Face headlamp will engage on click!
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={animState === 'WALKING' || animState === 'WALK_PAUSE' || animState === 'MOUNTING'}
                  className="w-full py-4 bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-500 hover:to-orange-600 disabled:opacity-80 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 cursor-pointer mt-2 shadow-amber-500/20"
                >
                  {animState === 'WALKING' || animState === 'WALK_PAUSE' || animState === 'MOUNTING' ? (
                    <>
                      <span className="animate-spin text-base">⚙️</span>
                      <span>
                        {animState === 'MOUNTING'
                          ? 'STATE 2: CROSS-FADING STEP-OVER MOUNT...'
                          : animState === 'WALK_PAUSE'
                          ? 'STATE 1: ARRIVED • PAUSING BEFORE MOUNT...'
                          : 'STATE 1: ROOT-MOTION WALKING TO SADDLE...'}
                      </span>
                    </>
                  ) : (
                    <>
                      <span>⚡</span>
                      <span>GET OTP & START ENGINE ➔</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. STAGE B: OTP INPUT (BIKE RUNNING IDLE, SUBMIT ➔ RUN BIKE) */}
      {/* ------------------------------------------------------------- */}
      {authStep === 'otp' && (
        <div className="relative z-10 w-full h-full flex flex-col justify-center items-center md:items-start p-4 sm:p-6 md:pl-10 lg:pl-16 pointer-events-none">
          <div className="w-full max-w-[360px] pointer-events-auto transition-all duration-500 ease-out">
            {/* Header Badge */}
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-600 text-[11px] font-bold tracking-wide backdrop-blur-md animate-pulse">
                <span>😎</span>
                <span>STATE 3: PARENTED TO BIKE MESH • HELMET-ADJUST IDLE</span>
              </span>
              <button
                onClick={() => {
                  if (walkAnimIdRef.current) cancelAnimationFrame(walkAnimIdRef.current);
                  if (walkPauseAnimIdRef.current) cancelAnimationFrame(walkPauseAnimIdRef.current);
                  if (mountAnimIdRef.current) cancelAnimationFrame(mountAnimIdRef.current);
                  if (seatedAnimIdRef.current) cancelAnimationFrame(seatedAnimIdRef.current);
                  setAuthStep('phone');
                  setAnimState('STANDBY');
                  setIsBikeStarted(false);
                  setRootMotion({ x: WALK_START_X, y: 0, strideFrame: 0, progress: 0 });
                  setBlendOpacities({ walk: 0, mount: 0, seated: 0 });
                  if (audioRef.current) audioRef.current.stop();
                }}
                className="text-[11px] text-slate-500 hover:text-slate-900 font-medium transition-colors cursor-pointer"
              >
                ← Change Number
              </button>
            </div>

            {/* Frosted Glass OTP Card */}
            <div className="relative w-full p-7 rounded-3xl bg-[#0e1015]/90 backdrop-blur-2xl border border-black/10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.35)] text-white flex flex-col">
              <div className="absolute top-3 left-3 w-5 h-5 border-t-2 border-l-2 border-emerald-400/60 rounded-tl-lg pointer-events-none" />
              <div className="absolute bottom-3 right-3 w-5 h-5 border-b-2 border-r-2 border-emerald-400/60 rounded-br-lg pointer-events-none" />

              <h1 className="text-2xl font-bold tracking-tight text-white mb-1">
                Enter <span className="text-emerald-400">Security OTP</span>
              </h1>
              <p className="text-xs text-gray-300 mb-5">
                Sent to <span className="text-white font-mono font-semibold">+91 {phoneNumber}</span>
              </p>

              <form onSubmit={handleSubmitOtp} className="space-y-5">
                {/* 4-Digit OTP Boxes */}
                <div className="flex items-center justify-between gap-2.5 my-2">
                  {otpCode.map((digit, index) => (
                    <input
                      key={index}
                      id={`otp-input-${index}`}
                      type="text"
                      maxLength="1"
                      value={digit}
                      onChange={(e) => handleOtpDigitChange(index, e.target.value)}
                      className="w-14 h-14 text-center text-2xl font-bold text-white bg-black/60 border border-emerald-500/50 rounded-2xl focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/40 backdrop-blur-md shadow-inner transition-all"
                    />
                  ))}
                </div>

                <div className="flex items-center justify-between text-[11px] text-gray-400">
                  <span>Didn't receive code?</span>
                  <span className="text-amber-400 font-semibold">
                    {otpTimer > 0 ? `Resend in 00:${otpTimer < 10 ? `0${otpTimer}` : otpTimer}` : 'Resend OTP'}
                  </span>
                </div>

                <button
                  type="submit"
                  className="w-full py-4 bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 cursor-pointer shadow-emerald-500/25 mt-2"
                >
                  <span>🚀</span>
                  <span>SUBMIT OTP & RIDE RONIN ➔</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. STAGE C: LAUNCHING OVERLAY                                */}
      {/* ------------------------------------------------------------- */}
      {authStep === 'launching' && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm pointer-events-none animate-fadeIn">
          <div className="text-center text-white">
            <div className="text-5xl font-black italic tracking-tighter text-amber-400 drop-shadow-[0_0_35px_rgba(245,158,11,0.85)] animate-pulse mb-3">
              LAUNCHING RONIN 225!
            </div>
            <div className="text-lg text-cyan-300 font-mono tracking-widest uppercase">
              OTP Verified // 6,400 RPM Full Throttle
            </div>
            <div className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-200">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
              <span>Opening Connected Rider Dashboard...</span>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. STAGE D: CONNECTED RIDER DASHBOARD (NEW PAGE)              */}
      {/* ------------------------------------------------------------- */}
      {authStep === 'dashboard' && (
        <div className="relative z-20 w-full h-full flex flex-col justify-between p-6 sm:p-10 pointer-events-none">
          {/* Top Bar Status */}
          <div className="flex items-center justify-between w-full pointer-events-auto">
            <div className="flex items-center gap-3">
              <div className="px-5 py-2.5 rounded-2xl bg-white/90 border border-slate-200 backdrop-blur-xl flex items-center gap-3 shadow-lg">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-600 font-bold text-lg">
                  🏍️
                </div>
                <div>
                  <div className="text-sm font-black text-slate-900">TVS RONIN ON THE ROAD</div>
                  <div className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Verified Pilot: +91 {phoneNumber}
                  </div>
                </div>
              </div>
            </div>

            {/* Mode Switcher & Park Action */}
            <div className="flex items-center gap-3">
              <div className="p-1 rounded-2xl bg-white/90 border border-slate-200 backdrop-blur-xl flex items-center gap-1 shadow-lg">
                <button
                  onClick={() => setRidingMode('URBAN')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    ridingMode === 'URBAN'
                      ? 'bg-amber-400 text-black shadow-md'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  URBAN
                </button>
                <button
                  onClick={() => setRidingMode('RAIN')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    ridingMode === 'RAIN'
                      ? 'bg-cyan-500 text-white shadow-md'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  RAIN
                </button>
              </div>

              <button
                onClick={handleParkBike}
                className="px-4 py-2.5 rounded-2xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-600 font-bold text-xs transition-all active:scale-95 shadow-lg flex items-center gap-1.5 cursor-pointer"
              >
                <span>🅿️</span>
                <span>Park / Logout</span>
              </button>
            </div>
          </div>

          {/* Bottom Live Telemetry HUD Bar */}
          <div className="w-full max-w-4xl mx-auto pointer-events-auto">
            <div className="p-6 rounded-3xl bg-[#0e1015]/95 border border-black/10 backdrop-blur-2xl shadow-2xl text-white flex flex-col md:flex-row items-center justify-between gap-6">
              {/* Telemetry Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 w-full md:w-auto">
                <div>
                  <div className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">
                    Live Speed
                  </div>
                  <div className="text-3xl font-extrabold text-white flex items-baseline gap-1">
                    {Math.round(speedKmh)} <span className="text-xs text-cyan-400">KM/H</span>
                  </div>
                </div>

                <div>
                  <div className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">
                    Engine RPM
                  </div>
                  <div className="text-3xl font-extrabold text-amber-400 flex items-baseline gap-1">
                    {Math.round(engineRpm)} <span className="text-xs text-gray-400">RPM</span>
                  </div>
                </div>

                <div>
                  <div className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">
                    Fuel Tank
                  </div>
                  <div className="text-3xl font-extrabold text-emerald-400 flex items-baseline gap-1">
                    84% <span className="text-xs text-gray-400">14.0 L</span>
                  </div>
                </div>

                <div>
                  <div className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">
                    Est. Range
                  </div>
                  <div className="text-3xl font-extrabold text-white flex items-baseline gap-1">
                    420 <span className="text-xs text-cyan-400">KM</span>
                  </div>
                </div>
              </div>

              {/* Ride Status Badge */}
              <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>Cruising Live on Highway</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
