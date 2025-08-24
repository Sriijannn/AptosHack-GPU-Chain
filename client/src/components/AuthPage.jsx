import React, { useState } from "react";
import { FaUser, FaEnvelope, FaLock } from "react-icons/fa";

function AuthPage({ onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [notifType, setNotifType] = useState("info");
  const [loading, setLoading] = useState(false);
  const [isButtonHovered, setIsButtonHovered] = useState(false);

  // Restored original handleLogin function
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setNotifType("info");
    try {
      const res = await fetch("http://127.0.0.1:5000/login", {
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
    } finally {
      setLoading(false);
    }
  };

  // Restored original handleSignup function
  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setNotifType("info");
    try {
      const res = await fetch("http://127.0.0.1:5000/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(data.message || "Signup successful!");
        setNotifType("success");
        setTimeout(() => {
          setIsLogin(true); // Switch to login view
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
    } finally {
      setLoading(false);
    }
  };

  const renderFormFields = () => {
    const fields = [];
    if (!isLogin) {
      fields.push(
        <div key="name" style={styles.inputGroup}>
          <FaUser style={styles.inputIcon} />
          <input
            style={styles.input}
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
      );
    }
    fields.push(
      <div key="email" style={styles.inputGroup}>
        <FaEnvelope style={styles.inputIcon} />
        <input
          style={styles.input}
          placeholder="Email Address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          required
        />
      </div>
    );
    fields.push(
      <div key="password" style={styles.inputGroup}>
        <FaLock style={styles.inputIcon} />
        <input
          style={styles.input}
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          required
        />
      </div>
    );
    return fields;
  };

  const buttonStyle = isButtonHovered
    ? { ...styles.button, ...styles.buttonHover }
    : styles.button;

  return (
    <div style={styles.container}>
      <div style={styles.authPanel}>
        <div style={styles.header}>
          <h1 style={styles.title}>
            {isLogin ? "Welcome Back" : "Get Started"}
          </h1>
          <p style={styles.subtitle}>
            {isLogin
              ? "Sign in to access your account"
              : "Create an account to continue"}
          </p>
        </div>

        <form
          style={styles.form}
          onSubmit={isLogin ? handleLogin : handleSignup}
        >
          {renderFormFields()}
          <button
            type="submit"
            style={buttonStyle}
            disabled={loading}
            onMouseEnter={() => setIsButtonHovered(true)}
            onMouseLeave={() => setIsButtonHovered(false)}
          >
            {loading
              ? "Please wait..."
              : isLogin
              ? "Sign In"
              : "Create Account"}
          </button>
        </form>

        {message && (
          <div
            style={{
              ...styles.message,
              ...(notifType === "success"
                ? styles.messageSuccess
                : notifType === "error"
                ? styles.messageError
                : styles.messageInfo),
            }}
          >
            {message}
          </div>
        )}

        <div style={styles.footer}>
          <p style={styles.footerText}>
            {isLogin ? "Don't have an account?" : "Already have an account?"}
            <span
              style={styles.footerLink}
              onClick={() => setIsLogin(!isLogin)}
            >
              {isLogin ? "Sign Up" : "Sign In"}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

// --- Styles Object ---
const styles = {
  // Layout & Container
  container: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    background: "#121212",
    fontFamily: "system-ui, -apple-system, sans-serif",
    color: "#e0e0e0",
  },
  authPanel: {
    background: "#1e1e1e",
    border: "1px solid #333",
    borderRadius: "12px",
    padding: "40px 32px",
    width: "100%",
    maxWidth: "400px",
    display: "flex",
    flexDirection: "column",
  },
  form: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    marginTop: "24px",
  },
  header: {
    textAlign: "center",
    marginBottom: "16px",
  },

  // Typography
  title: {
    margin: "0 0 8px 0",
    fontSize: "28px",
    fontWeight: 600,
    color: "#ffffff",
  },
  subtitle: {
    margin: 0,
    color: "#a0a0a0",
    fontSize: "16px",
  },

  // Inputs
  inputGroup: {
    position: "relative",
  },
  input: {
    width: "100%",
    padding: "12px 16px 12px 44px",
    backgroundColor: "#2c2c2c",
    border: "1px solid #444",
    borderRadius: "8px",
    color: "#e0e0e0",
    fontSize: "16px",
    outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
  },
  inputIcon: {
    position: "absolute",
    top: "50%",
    left: "16px",
    transform: "translateY(-50%)",
    color: "#888",
  },

  // Button
  button: {
    padding: "12px",
    fontSize: "16px",
    fontWeight: "600",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    backgroundColor: "#007bff",
    color: "#ffffff",
    transition: "opacity 0.2s ease-in-out",
    marginTop: "8px",
  },
  buttonHover: {
    opacity: 0.85,
  },

  // Footer
  footer: {
    marginTop: "24px",
    borderTop: "1px solid #333",
    paddingTop: "24px",
    textAlign: "center",
  },
  footerText: {
    margin: 0,
    color: "#a0a0a0",
  },
  footerLink: {
    color: "#007bff",
    fontWeight: "600",
    cursor: "pointer",
    marginLeft: "8px",
  },

  // Messages
  message: {
    padding: "12px",
    marginTop: "16px",
    borderRadius: "6px",
    fontSize: "14px",
    fontWeight: "500",
    textAlign: "center",
  },
  messageSuccess: {
    backgroundColor: "rgba(40, 167, 69, 0.15)",
    color: "#28a745",
    border: "1px solid rgba(40, 167, 69, 0.3)",
  },
  messageError: {
    backgroundColor: "rgba(220, 53, 69, 0.15)",
    color: "#dc3545",
    border: "1px solid rgba(220, 53, 69, 0.3)",
  },
  messageInfo: {
    backgroundColor: "rgba(23, 162, 184, 0.15)",
    color: "#17a2b8",
    border: "1px solid rgba(23, 162, 184, 0.3)",
  },
};

export default AuthPage;
