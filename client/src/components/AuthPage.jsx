import React, { useState, useRef, useEffect } from "react";
import './AuthPage.css';

// Unified Auth Page with Login & Signup Tabs
function AuthPage({ onBack, defaultTab = "login", onLoginSuccess }) {
  const [tab, setTab] = useState(defaultTab === "login" ? 0 : 1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [notifType, setNotifType] = useState("info");
  const cardRef = useRef(null);

  // Card tilt effect
  const handleMouseMove = (e) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * 8;
    const rotateY = ((x - centerX) / centerX) * -8;
    card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.03)`;
  };
  const handleMouseLeave = () => {
    const card = cardRef.current;
    if (card) card.style.transform = "rotateX(0deg) rotateY(0deg) scale(1)";
  };

  // Handles login POST
  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage("");
    setNotifType("info");
    try {
      const res = await fetch("http://localhost:5000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(data.message || "Login successful!");
        setNotifType("success");
        setTimeout(() => {
          onLoginSuccess(email);
        }, 1000);
      } else {
        setMessage(data.message || "Login failed.");
        setNotifType("error");
      }
    } catch (err) {
      setMessage("Network error: " + err.message);
      setNotifType("error");
    }
  };

  // Handles signup POST
  const handleSignup = async (e) => {
    e.preventDefault();
    setMessage("");
    setNotifType("info");
    try {
      const res = await fetch("http://localhost:5000/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(data.message || "Signup successful!");
        setNotifType("success");
        setTimeout(() => {
          setTab(0);
          setMessage("Account created! Please log in.");
          setNotifType("info");
        }, 1500);
      } else {
        setMessage(data.message || "Signup failed.");
        setNotifType("error");
      }
    } catch (err) {
      setMessage("Network error: " + err.message);
      setNotifType("error");
    }
  };

  useEffect(() => {
    const glow = document.createElement('div');
    glow.className = 'glow-cursor';
    document.body.appendChild(glow);
    const move = e => {
      glow.style.left = `${e.clientX - 30}px`;
      glow.style.top = `${e.clientY - 30}px`;
    };
    window.addEventListener('mousemove', move);
    return () => {
      window.removeEventListener('mousemove', move);
      document.body.removeChild(glow);
    };
  }, []);

  return (
    <div className="authContainer fadeIn">
      <div
        className="authCard animatedCard"
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <div className="tabContainer">
          <button
            className={`tab ${tab === 0 ? "tabActive" : ""}`}
            onClick={() => setTab(0)}
            type="button"
          >
            Login
          </button>
          <button
            className={`tab ${tab === 1 ? "tabActive" : ""}`}
            onClick={() => setTab(1)}
            type="button"
          >
            Sign Up
          </button>
        </div>
        <div className="tabPanels">
          {tab === 0 && (
            <form className="authForm slideInLeft" onSubmit={handleLogin}>
              <input
                className="input"
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                type="email"
                required
                autoFocus
              />
              <input
                className="input"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                type="password"
                required
              />
              <button type="submit" className="authBtn ripple">
                Login
              </button>
            </form>
          )}
          {tab === 1 && (
            <form className="authForm slideInRight" onSubmit={handleSignup}>
              <input
                className="input"
                placeholder="Name"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
              <input
                className="input"
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                type="email"
                required
              />
              <input
                className="input"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                type="password"
                required
              />
              <button type="submit" className="authBtn ripple">
                Sign Up
              </button>
            </form>
          )}
        </div>
        {message && (
          <div className={`message ${notifType === 'success' ? 'messageSuccess bounceIn' : notifType === 'error' ? 'messageError shake' : ''}`}
            style={{ marginTop: 18 }}>
            {message}
          </div>
        )}
        <button className="backBtn" onClick={onBack}>
          ← Back
        </button>
      </div>
    </div>
  );
}

export default AuthPage;
