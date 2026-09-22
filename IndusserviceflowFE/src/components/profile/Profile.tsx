import React, { useEffect, useState } from "react";
import {
  FaShieldAlt,
  FaBuilding,
  FaCircle,
  FaCalendarAlt,
  FaEnvelope,
  FaPhone,
  FaUser,
  FaClock,
  FaEdit,
  FaCamera,
  FaKey,
  FaTimes,
  FaCheck,
} from "react-icons/fa";

import { getOrgProfile, updateOrgProfile, changeOrgPassword } from "../../services/api";
import { sanitizeMobileInput } from "../../utils/validators";

interface ProfileData {
  id: number;
  name: string;
  username: string;
  email: string;
  mobile: string;
  organization: string | null;
  role: string;
  status: string; // "active" | "inactive"
  created_by: string | null;
  created_on: string;
  updated_by: string | null;
  updated_on: string;
}

const formatDate = (value?: string) => {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const formatLabel = (value?: string) => {
  if (!value) return "—";
  return value
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
};

const initialsOf = (name?: string) => {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
};

const Profile: React.FC = () => {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", email: "", mobile: "" });
  const [originalForm, setOriginalForm] = useState({ name: "", email: "", mobile: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const hasProfileChanges =
    editForm.name !== originalForm.name ||
    editForm.email !== originalForm.email ||
    editForm.mobile !== originalForm.mobile;

  // Change password card
  const [pwForm, setPwForm] = useState({
    old_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [savingPassword, setSavingPassword] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState<string | null>(null);

  const loadProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getOrgProfile();
      const data: ProfileData = response?.data ?? response;
      setProfile(data);
    } catch (err) {
      console.error("Failed to load profile:", err);
      setError("Unable to load your profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const startEditing = () => {
    if (!profile) return;
    const initial = {
      name: profile.name ?? "",
      email: profile.email ?? "",
      mobile: profile.mobile ?? "",
    };
    setEditForm(initial);
    setOriginalForm(initial);
    setEditError(null);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setEditError(null);
    setIsEditing(false);
  };

  const handleSaveProfile = async () => {
    setEditError(null);

    if (!editForm.name.trim()) {
      setEditError("Name is required.");
      return;
    }
    if (!editForm.email.trim()) {
      setEditError("Email is required.");
      return;
    }

    setSavingProfile(true);
    try {
      await updateOrgProfile(editForm);
      await loadProfile();
      setIsEditing(false);
    } catch (err: any) {
      console.error("Failed to update profile:", err);
      setEditError(
        err?.response?.data?.message ?? "Unable to update profile. Please try again."
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);
    setPwSuccess(null);

    if (!pwForm.old_password || !pwForm.new_password || !pwForm.confirm_password) {
      setPwError("Please fill in all password fields.");
      return;
    }
    if (pwForm.new_password !== pwForm.confirm_password) {
      setPwError("New password and confirm password do not match.");
      return;
    }

    setSavingPassword(true);
    try {
      const response = await changeOrgPassword(pwForm);
      setPwSuccess(response?.message ?? "Password changed successfully.");
      setPwForm({ old_password: "", new_password: "", confirm_password: "" });
    } catch (err: any) {
      console.error("Failed to change password:", err);
      setPwError(
        err?.response?.data?.message ?? "Unable to change password. Please try again."
      );
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="category-page profile-page">
      <div className="category-header">
        <div>
          <h1>My Profile</h1>
          <p>View and manage your account information</p>
        </div>
      </div>

      {loading && <div className="profile-state">Loading profile…</div>}

      {!loading && error && (
            <div className="profile-state profile-state-error">
              {error}
              <button className="new-btn profile-retry-btn" onClick={loadProfile}>
                Retry
              </button>
            </div>
          )}

          {!loading && !error && profile && (
            <>
              {/* ---------------- Profile header card ---------------- */}
              <div className="category-section profile-hero">
                <div className="profile-hero-left">
                  <div className="profile-avatar-wrap">
                    <div className="profile-avatar-lg">
                      {initialsOf(isEditing ? editForm.name : profile.name)}
                    </div>
                    <button className="profile-avatar-upload" title="Upload photo (coming soon)">
                      <FaCamera />
                    </button>
                  </div>

                  <div>
                    {isEditing ? (
                      <input
                        type="text"
                        className="profile-name-input"
                        value={editForm.name}
                        onChange={(e) =>
                          setEditForm({ ...editForm, name: e.target.value })
                        }
                        placeholder="Full name"
                      />
                    ) : (
                      <h2 className="profile-name">{profile.name}</h2>
                    )}

                    <p className="profile-role">{formatLabel(profile.role)}</p>

                    <div className="profile-badges">
                      <span className="profile-badge profile-badge-id">
                        {profile.username}
                      </span>
                      <span
                        className={`status ${
                          profile.status?.toLowerCase() === "active" ? "status-active" : "status-inactive"
                        }`}
                      >
                        {profile.status?.toLowerCase() === "active" ? "Active" : "Inactive"}
                      </span>
                      {profile.organization && (
                        <span className="profile-badge profile-badge-outline">
                          {profile.organization}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {isEditing ? (
                  <div className="profile-edit-actions-inline">
                    <button
                      className="new-btn profile-cancel-btn"
                      onClick={cancelEditing}
                      disabled={savingProfile}
                    >
                      <FaTimes /> Cancel
                    </button>
                    <button
                      className="new-btn profile-save-btn"
                      onClick={handleSaveProfile}
                      disabled={savingProfile || !hasProfileChanges}
                      title={!hasProfileChanges ? "No changes to save" : undefined}
                      style={{ color: "#fff" }}
                    >
                      <FaCheck /> {savingProfile ? "Saving…" : "Save changes"}
                    </button>
                  </div>
                ) : (
                  <button className="new-btn profile-edit-btn" onClick={startEditing}>
                    <FaEdit /> Edit profile
                  </button>
                )}
              </div>

              {editError && (
                <div className="profile-form-error profile-form-error-banner">
                  {editError}
                </div>
              )}

              {/* ---------------- Info cards ---------------- */}
              <div className="profile-info-grid">
                <div className="category-section profile-info-card">
                  <h3>Professional information</h3>

                  <div className="profile-field">
                    <span className="profile-field-icon">
                      <FaShieldAlt />
                    </span>
                    <div>
                      <span className="profile-field-label">Role</span>
                      <span className="profile-field-value">
                        {formatLabel(profile.role)}
                      </span>
                    </div>
                  </div>

                  {profile.role?.toLowerCase() !== "super_admin" && (
                    <div className="profile-field">
                      <span className="profile-field-icon">
                        <FaBuilding />
                      </span>
                      <div>
                        <span className="profile-field-label">Organization</span>
                        <span className="profile-field-value">
                          {profile.organization || "—"}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="profile-field">
                    <span className="profile-field-icon">
                      <FaCircle />
                    </span>
                    <div>
                      <span className="profile-field-label">Status</span>
                      <span className="profile-field-value">
                        {formatLabel(profile.status)}
                      </span>
                    </div>
                  </div>

                  <div className="profile-field">
                    <span className="profile-field-icon">
                      <FaCalendarAlt />
                    </span>
                    <div>
                      <span className="profile-field-label">Member since</span>
                      <span className="profile-field-value">
                        {formatDate(profile.created_on)}
                      </span>
                    </div>
                  </div>

                  {profile.role?.toLowerCase() === "super_admin" && (
                    <div className="profile-field">
                      <span className="profile-field-icon">
                        <FaClock />
                      </span>
                      <div>
                        <span className="profile-field-label">Last updated</span>
                        <span className="profile-field-value">
                          {formatDate(profile.updated_on)}
                          {profile.updated_by ? ` · by ${profile.updated_by}` : ""}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="category-section profile-info-card">
                  <h3>Contact information</h3>

                  <div className="profile-field">
                    <span className="profile-field-icon">
                      <FaEnvelope />
                    </span>
                    <div className="profile-field-grow">
                      <span className="profile-field-label">Email</span>
                      {isEditing ? (
                        <input
                          type="email"
                          className="profile-field-input"
                          value={editForm.email}
                          onChange={(e) =>
                            setEditForm({ ...editForm, email: e.target.value })
                          }
                          placeholder="Enter your email"
                        />
                      ) : (
                        <span className="profile-field-value">{profile.email}</span>
                      )}
                    </div>
                  </div>

                  <div className="profile-field">
                    <span className="profile-field-icon">
                      <FaPhone />
                    </span>
                    <div className="profile-field-grow">
                      <span className="profile-field-label">Phone</span>
                      {isEditing ? (
                        <input
                          type="text"
                          className="profile-field-input"
                          value={editForm.mobile}
                          onChange={(e) =>
                            setEditForm({ ...editForm, mobile: sanitizeMobileInput(e.target.value) })
                          }
                          placeholder="Enter your mobile number"
                          maxLength={10}
                        />
                      ) : (
                        <span className="profile-field-value">
                          {profile.mobile || "—"}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="profile-field">
                    <span className="profile-field-icon">
                      <FaUser />
                    </span>
                    <div>
                      <span className="profile-field-label">Username</span>
                      <span className="profile-field-value">{profile.username}</span>
                    </div>
                  </div>

                  {profile.role?.toLowerCase() !== "super_admin" && (
                    <div className="profile-field">
                      <span className="profile-field-icon">
                        <FaClock />
                      </span>
                      <div>
                        <span className="profile-field-label">Last updated</span>
                        <span className="profile-field-value">
                          {formatDate(profile.updated_on)}
                          {profile.updated_by ? ` · by ${profile.updated_by}` : ""}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ---------------- Change password ---------------- */}
              <div className="category-section profile-password-card">
                <h3>
                  <FaKey /> Change password
                </h3>
                <p className="profile-password-hint">
                  Choose a strong password you don't use anywhere else.
                </p>

                <form className="profile-password-form" onSubmit={handleChangePassword}>
                  <div className="profile-form-row">
                    <label>Current password</label>
                    <input
                      type="password"
                      value={pwForm.old_password}
                      onChange={(e) =>
                        setPwForm({ ...pwForm, old_password: e.target.value })
                      }
                      placeholder="Enter current password"
                    />
                  </div>

                  <div className="profile-form-row">
                    <label>New password</label>
                    <input
                      type="password"
                      value={pwForm.new_password}
                      onChange={(e) =>
                        setPwForm({ ...pwForm, new_password: e.target.value })
                      }
                      placeholder="Enter new password"
                    />
                  </div>

                  <div className="profile-form-row">
                    <label>Confirm new password</label>
                    <input
                      type="password"
                      value={pwForm.confirm_password}
                      onChange={(e) =>
                        setPwForm({ ...pwForm, confirm_password: e.target.value })
                      }
                      placeholder="Re-enter new password"
                    />
                  </div>

                  {pwError && <div className="profile-form-error">{pwError}</div>}
                  {pwSuccess && <div className="profile-form-success">{pwSuccess}</div>}

                  <button type="submit" className="new-btn" disabled={savingPassword}>
                    {savingPassword ? "Updating…" : "Update password"}
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
  );
};

export default Profile;