import { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import "./Sidebar.css";

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  // Close drawer automatically when route changes
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <>
      {/* Mobile Top Header (only visible on screens <= 768px) */}
      <div className="mobile-header">
        <div className="mobile-brand">
          <div className="sidebar-logo">⛓</div>
          <div>
            <div className="sidebar-brand-name">SkillLedger</div>
            <div className="sidebar-brand-sub">Proof Behind Claims</div>
          </div>
        </div>
        <button
          type="button"
          className="mobile-menu-btn"
          onClick={() => setMobileOpen((prev) => !prev)}
          aria-label="Toggle navigation"
        >
          {mobileOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* Backdrop overlay for mobile drawer */}
      {mobileOpen && (
        <div className="sidebar-backdrop" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar navigation */}
      <aside className={`sidebar ${mobileOpen ? "sidebar-mobile-open" : ""}`}>
        <div className="sidebar-brand desktop-brand">
          <div className="sidebar-logo">⛓</div>
          <div>
            <div className="sidebar-brand-name">SkillLedger</div>
            <div className="sidebar-brand-sub">Proof Behind Claims</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/dashboard" className="sidebar-link" end>
            <span className="sidebar-link-icon">▦</span> Dashboard
          </NavLink>
          <NavLink to="/issue" className="sidebar-link">
            <span className="sidebar-link-icon">✎</span> Issue Credential
          </NavLink>
          <NavLink to="/verify" className="sidebar-link">
            <span className="sidebar-link-icon">✓</span> Verify
          </NavLink>
          <NavLink to="/chain" className="sidebar-link">
            <span className="sidebar-link-icon">⬡</span> Chain Visualization
          </NavLink>
          <NavLink to="/tamper" className="sidebar-link">
            <span className="sidebar-link-icon">⚠</span> Tamper & Drift Demo
          </NavLink>
          <NavLink to="/skill-validator" className="sidebar-link">
            <span className="sidebar-link-icon">⎇</span> Skill & GitHub Validator
          </NavLink>
          <NavLink to="/audit" className="sidebar-link">
            <span className="sidebar-link-icon">📋</span> Audit Explorer
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-footer-label">Consensus</div>
          <div className="sidebar-footer-value">Proof of Authority</div>
        </div>
      </aside>
    </>
  );
}
