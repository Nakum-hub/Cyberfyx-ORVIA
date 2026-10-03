import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import shield from "./Shield.png";

// Brand tokens from Colors & Typography PDF
const ORANGE = "#ffab40"; // primary
const PURPLE = "#351c74"; // secondary

// Timeline in ms (total ≈ 7s)
const T = { text: 2400, orvia: 3500, form: 4600 };

const css = `
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600;800&display=swap');
.cfx { font-family: 'Montserrat', system-ui, sans-serif; }
.cfx-input { width:100%; padding:14px 16px; border:1.5px solid #e4def0; border-radius:10px;
  font: 500 15px 'Montserrat', sans-serif; color:${PURPLE}; background:#fff; outline:none;
  transition: border-color .2s, box-shadow .2s; }
.cfx-input:focus { border-color:${PURPLE}; box-shadow:0 0 0 4px rgba(53,28,116,.12); }
.cfx-btn { width:100%; padding:14px; border:0; border-radius:10px; cursor:pointer;
  font: 800 15px 'Montserrat', sans-serif; letter-spacing:.02em; color:#fff; background:${PURPLE};
  transition: transform .15s, background .2s; }
.cfx-btn:hover { background:#43259a; }
.cfx-btn:active { transform: scale(.98); }
.cfx-btn:focus-visible { outline:3px solid ${ORANGE}; outline-offset:3px; }
`;

export default function CyberfyxLogin({ onSubmit }) {
  const reduce = useReduceMotionSafe();
  const [stage, setStage] = useState(reduce ? 3 : 0); // 0 shield · 1 name · 2 ORVIA · 3 form
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (reduce) return;
    const ids = [
      setTimeout(() => setStage(1), T.text),
      setTimeout(() => setStage(2), T.orvia),
      setTimeout(() => setStage(3), T.form),
    ];
    return () => ids.forEach(clearTimeout);
  }, [reduce]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit?.({ email, password });
  };

  return (
    <div
      className="cfx"
      style={{
        minHeight: "100vh",
        background: "#fff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        overflow: "hidden",
      }}
    >
      <style>{css}</style>

      {/* Brand lockup — `layout` lets it glide up when the form mounts */}
      <motion.div
        layout
        transition={{ layout: { duration: 0.9, ease: [0.22, 1, 0.36, 1] } }}
        style={{ display: "flex", alignItems: "center", flexWrap: "nowrap" }}
      >
        {/* Shield: opens (scale) while spinning on its Y axis */}
        <motion.img
          src={shield}
          alt="Cyberfyx shield"
          initial={{ scale: 0, rotateY: -360, opacity: 0 }}
          animate={{
            scale: [0, 1, 1],
            rotateY: [-360, -281, 0],
            opacity: [0, 1, 1],
          }}
          // linear = constant spin speed, no slow-down; shield opens within the first ~0.5s
          transition={{ duration: 2.3, ease: "linear", times: [0, 0.22, 1] }}
          style={{
            height: "clamp(72px, 14vw, 120px)",
            width: "auto",
            flexShrink: 0,
            transformPerspective: 800,
          }}
        />

        {/* CYBERFYX + ORVIA: width expands from 0 so the shield slides left */}
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={stage >= 1 ? { width: "auto", opacity: 1 } : {}}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          style={{ overflow: "hidden", whiteSpace: "nowrap", display: "flex", alignItems: "baseline" }}
        >
          <span
            style={{
              fontWeight: 800, // Montserrat Extra Bold
              fontSize: "clamp(36px, 7vw, 72px)", // 72px max, per PDF
              color: PURPLE,
              marginLeft: "clamp(10px, 2vw, 20px)",
              lineHeight: 1.1,
            }}
          >
            CYBERFYX
          </span>
          <motion.span
            initial={{ opacity: 0, x: -16 }}
            animate={stage >= 2 ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, ease: "easeOut" }}
            style={{
              fontWeight: 800,
              fontSize: "clamp(36px, 7vw, 72px)",
              color: ORANGE,
              marginLeft: "clamp(1px, 0.3vw, 4px)",
              wordSpacing: "-0.2em",
              lineHeight: 1.1,
              paddingRight: 4,
            }}
          >
            - ORVIA
          </motion.span>
        </motion.div>
      </motion.div>

      {/* Sign-in card */}
      <AnimatePresence>
        {stage >= 3 && (
          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
            style={{
              width: "100%",
              maxWidth: 400,
              marginTop: 40,
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <label htmlFor="cfx-email" style={labelStyle}>Email</label>
            <input
              id="cfx-email"
              className="cfx-input"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <label htmlFor="cfx-password" style={labelStyle}>Password</label>
            <input
              id="cfx-password"
              className="cfx-input"
              type="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button type="submit" className="cfx-btn" style={{ marginTop: 8 }}>
              Sign in
            </button>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}

const labelStyle = { fontWeight: 600, fontSize: 13, color: PURPLE, marginBottom: -6 };

// Respect prefers-reduced-motion (skips intro, shows form immediately)
function useReduceMotionSafe() {
  return !!useReducedMotion();
}
