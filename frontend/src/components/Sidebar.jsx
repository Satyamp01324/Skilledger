import { NavLink } from "react-router-dom";
import "./Sidebar.css";

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
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
  );
}
