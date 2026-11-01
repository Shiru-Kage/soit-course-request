import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, 
  ShieldCheck, 
  ShieldAlert, 
  Search, 
  PlusCircle, 
  Filter, 
  KeyRound, 
  Trash2, 
  Edit3, 
  UserCheck, 
  UserX, 
  CheckCircle2, 
  AlertTriangle, 
  Lock, 
  Sparkles, 
  GraduationCap, 
  BookOpen, 
  Mail, 
  Clock, 
  X, 
  RefreshCw,
  Eye,
  EyeOff,
  UserPlus
} from 'lucide-react';
import { 
  SUPER_ADMIN_EMAIL, 
  FIXED_ADMIN_DEPARTMENTS, 
  CLUSTER_PROGRAM_LABELS, 
  isSuperAdmin, 
  isLeadProgramChair, 
  hasAdminPrivilege, 
  grantAdminPrivilege, 
  revokeAdminPrivilege, 
  adminDirectResetFacultyPassword, 
  adminUpdateFacultyUser, 
  adminRemoveFacultyUser,
  addAdminEmail,
  getConsultationProfileForEmail
} from '../services/adminAuth';
import { 
  getLocalStudents, 
  syncStudentsFromServer, 
  adminUpdateStudentAccount, 
  adminResetStudentPassword, 
  adminDeleteStudentAccount,
  registerStudentAccount
} from '../services/studentAuth';
import { SOIT_PROGRAMS } from '../data/programs';

export default function UserManagementSection({
  activeAdminEmail,
  consultations = {},
  adminEmails = [],
  adminRoleEmails = [],
  requests = [],
  onRefreshData,
  onAdminRolesChanged,
  onConsultationsChanged
}) {
  // Category tabs: 'all' | 'students' | 'faculty' | 'chairs' | 'admins'
  const [userCategory, setUserCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [clusterFilter, setClusterFilter] = useState('ALL');
  const [adminStatusFilter, setAdminStatusFilter] = useState('ALL'); // 'ALL' | 'ADMIN' | 'NON_ADMIN'

  // Student accounts state
  const [studentsList, setStudentsList] = useState(() => getLocalStudents());
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);

  // Status / Feedback message
  const [feedback, setFeedback] = useState({ text: '', type: 'success' });

  // Modal States
  const [editingUser, setEditingUser] = useState(null); // { type: 'student'|'faculty', data: {...} }
  const [passwordResetUser, setPasswordResetUser] = useState(null); // { type: 'student'|'faculty', data: {...} }
  const [newPasswordVal, setNewPasswordVal] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [deletingUser, setDeletingUser] = useState(null); // { type: 'student'|'faculty', data: {...} }
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [addUserTab, setAddUserTab] = useState('faculty'); // 'faculty' | 'student'

  // Add Faculty Form State
  const [newFacultyEmail, setNewFacultyEmail] = useState('');
  const [newFacultyName, setNewFacultyName] = useState('');
  const [newFacultyCluster, setNewFacultyCluster] = useState('CS');
  const [newFacultyGrantAdmin, setNewFacultyGrantAdmin] = useState(false);

  // Add Student Form State
  const [newStudentData, setNewStudentData] = useState({
    studentNumber: '',
    email: '',
    firstName: '',
    lastName: '',
    program: 'CS',
    unitsLeft: '33',
    password: '1234'
  });

  const showMsg = (text, type = 'success') => {
    setFeedback({ text, type });
    setTimeout(() => {
      setFeedback({ text: '', type: 'success' });
    }, 5000);
  };

  // Sync students on load
  const loadStudents = async () => {
    setIsLoadingStudents(true);
    try {
      const data = await syncStudentsFromServer();
      if (Array.isArray(data)) {
        setStudentsList(data);
      }
    } catch (e) {
      console.warn('Could not load students:', e);
    } finally {
      setIsLoadingStudents(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, []);

  // Compute category datasets
  // 1. Program Chairs (Lead department heads + Super Admin)
  const chairsList = useMemo(() => {
    const chairEmails = Object.keys(FIXED_ADMIN_DEPARTMENTS);
    return chairEmails.map(email => {
      const prof = getConsultationProfileForEmail(email, consultations);
      const isLead = isLeadProgramChair(email);
      const isSuper = isSuperAdmin(email);
      const isAdmin = hasAdminPrivilege(email, adminRoleEmails);
      return {
        id: `chair_${email}`,
        userCategory: 'chair',
        email,
        name: prof.name || (isSuper ? 'SOIT System Administrator' : 'Program Chair'),
        dept: prof.dept || FIXED_ADMIN_DEPARTMENTS[email] || 'CS',
        programTitle: prof.programTitle || CLUSTER_PROGRAM_LABELS[prof.dept] || 'SOIT Cluster',
        isLead,
        isSuper,
        isAdmin,
        consultationSlots: Array.isArray(prof.slots) ? prof.slots.length : 0,
        raw: prof
      };
    });
  }, [consultations, adminRoleEmails]);

  // 2. Faculty (Cluster faculty not listed in the 5 lead chairs)
  const facultyList = useMemo(() => {
    const leadSet = new Set(Object.keys(FIXED_ADMIN_DEPARTMENTS).map(e => e.toLowerCase()));
    const nonLeadEmails = adminEmails.filter(e => !leadSet.has(e.toLowerCase()));

    return nonLeadEmails.map(email => {
      const prof = getConsultationProfileForEmail(email, consultations);
      const isAdmin = hasAdminPrivilege(email, adminRoleEmails);
      return {
        id: `faculty_${email}`,
        userCategory: 'faculty',
        email,
        name: prof.name || email.split('@')[0],
        dept: prof.dept || 'CS',
        programTitle: prof.programTitle || CLUSTER_PROGRAM_LABELS[prof.dept] || 'CS Cluster',
        isLead: false,
        isSuper: false,
        isAdmin,
        consultationSlots: Array.isArray(prof.slots) ? prof.slots.length : 0,
        raw: prof
      };
    });
  }, [adminEmails, consultations, adminRoleEmails]);

  // 3. Students
  const studentsFormatted = useMemo(() => {
    return studentsList.map(s => {
      const petitionCount = requests.filter(r => 
        (r.studentNumber && String(r.studentNumber).trim() === String(s.studentNumber).trim()) ||
        (r.email && String(r.email).toLowerCase() === String(s.email).toLowerCase())
      ).length;

      return {
        id: `student_${s.email || s.studentNumber}`,
        userCategory: 'student',
        email: s.email,
        studentNumber: s.studentNumber,
        name: `${s.firstName || ''} ${s.lastName || ''}`.trim() || 'Student Account',
        firstName: s.firstName || '',
        lastName: s.lastName || '',
        program: s.program || 'CS',
        unitsLeft: s.unitsLeft || '0',
        createdAt: s.createdAt,
        petitionCount,
        isAdmin: false,
        raw: s
      };
    });
  }, [studentsList, requests]);

  // 4. Combined All Users
  const allUsersList = useMemo(() => {
    return [...chairsList, ...facultyList, ...studentsFormatted];
  }, [chairsList, facultyList, studentsFormatted]);

  // 5. Admins view
  const adminsOnlyList = useMemo(() => {
    return allUsersList.filter(u => u.isAdmin);
  }, [allUsersList]);

  // Filtered dataset according to category, search, cluster, and admin filter
  const displayedUsers = useMemo(() => {
    let list = allUsersList;
    if (userCategory === 'students') list = studentsFormatted;
    else if (userCategory === 'faculty') list = facultyList;
    else if (userCategory === 'chairs') list = chairsList;
    else if (userCategory === 'admins') list = adminsOnlyList;

    return list.filter(u => {
      // Cluster filter
      if (clusterFilter !== 'ALL') {
        const userCluster = u.dept || u.program;
        if (userCluster !== clusterFilter) return false;
      }

      // Admin status filter
      if (adminStatusFilter === 'ADMIN' && !u.isAdmin) return false;
      if (adminStatusFilter === 'NON_ADMIN' && u.isAdmin) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = String(u.name || '').toLowerCase().includes(q);
        const matchEmail = String(u.email || '').toLowerCase().includes(q);
        const matchNum = String(u.studentNumber || '').toLowerCase().includes(q);
        const matchCluster = String(u.dept || u.program || '').toLowerCase().includes(q);
        return matchName || matchEmail || matchNum || matchCluster;
      }

      return true;
    });
  }, [userCategory, allUsersList, studentsFormatted, facultyList, chairsList, adminsOnlyList, clusterFilter, adminStatusFilter, searchQuery]);

  // Role Toggle Handler
  const handleToggleAdminRole = async (targetUser) => {
    const isCurrentlyAdmin = targetUser.isAdmin;
    const actionLabel = isCurrentlyAdmin ? 'Revoke Administrator' : 'Grant Administrator';

    try {
      let res;
      if (isCurrentlyAdmin) {
        res = await revokeAdminPrivilege(targetUser.email, activeAdminEmail);
      } else {
        res = await grantAdminPrivilege(targetUser.email, activeAdminEmail);
      }

      if (res.success) {
        showMsg(res.message, 'success');
        if (onAdminRolesChanged) onAdminRolesChanged(res.adminEmails);
        if (onRefreshData) onRefreshData();
      } else {
        showMsg(res.error || `Could not ${actionLabel.toLowerCase()} role.`, 'error');
      }
    } catch (err) {
      showMsg(err.message || `Error during ${actionLabel.toLowerCase()}.`, 'error');
    }
  };

  // Password Reset Handler
  const handleExecutePasswordReset = async (e) => {
    e.preventDefault();
    if (!passwordResetUser) return;
    const cleanPass = String(newPasswordVal || '').trim();
    if (!cleanPass || cleanPass.length < 4) {
      showMsg('Password must be at least 4 characters long.', 'error');
      return;
    }

    try {
      if (passwordResetUser.userCategory === 'student') {
        const res = await adminResetStudentPassword(passwordResetUser.email, cleanPass);
        if (res.success) {
          showMsg(`Password for student ${passwordResetUser.email} has been updated.`, 'success');
          setPasswordResetUser(null);
          setNewPasswordVal('');
          loadStudents();
        } else {
          showMsg(res.error || 'Failed to update student password.', 'error');
        }
      } else {
        // Faculty or Chair
        const res = await adminDirectResetFacultyPassword(passwordResetUser.email, cleanPass, activeAdminEmail);
        if (res.success) {
          showMsg(res.message, 'success');
          setPasswordResetUser(null);
          setNewPasswordVal('');
        } else {
          showMsg(res.error || 'Failed to update faculty password.', 'error');
        }
      }
    } catch (err) {
      showMsg(err.message || 'Error updating password.', 'error');
    }
  };

  // Save Edit User Details
  const handleSaveUserDetails = async (e) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      if (editingUser.userCategory === 'student') {
        const { email, firstName, lastName, studentNumber, program, unitsLeft } = editingUser.data;
        const res = await adminUpdateStudentAccount(email, {
          firstName,
          lastName,
          studentNumber,
          program,
          unitsLeft
        });
        if (res.success) {
          showMsg(`Student account details for ${email} updated.`, 'success');
          setEditingUser(null);
          loadStudents();
        } else {
          showMsg(res.error || 'Failed to update student account.', 'error');
        }
      } else {
        // Faculty or Chair
        const { email, name, dept } = editingUser.data;
        const res = await adminUpdateFacultyUser(email, { name, dept }, activeAdminEmail);
        if (res.success) {
          showMsg(res.message, 'success');
          setEditingUser(null);
          if (onConsultationsChanged) onConsultationsChanged(res.consultations);
          if (onRefreshData) onRefreshData();
        } else {
          showMsg(res.error || 'Failed to update faculty details.', 'error');
        }
      }
    } catch (err) {
      showMsg(err.message || 'Error updating account details.', 'error');
    }
  };

  // Delete User Handler
  const handleExecuteDelete = async () => {
    if (!deletingUser) return;
    try {
      if (deletingUser.userCategory === 'student') {
        const res = await adminDeleteStudentAccount(deletingUser.email);
        if (res.success) {
          showMsg(res.message, 'success');
          setDeletingUser(null);
          loadStudents();
        } else {
          showMsg(res.error || 'Failed to delete student account.', 'error');
        }
      } else {
        // Faculty
        const res = await adminRemoveFacultyUser(deletingUser.email, activeAdminEmail);
        if (res.success) {
          showMsg(res.message, 'success');
          setDeletingUser(null);
          if (onRefreshData) onRefreshData();
        } else {
          showMsg(res.error || 'Failed to remove faculty account.', 'error');
        }
      }
    } catch (err) {
      showMsg(err.message || 'Error deleting account.', 'error');
    }
  };

  // Add Faculty Submit
  const handleCreateFaculty = async (e) => {
    e.preventDefault();
    try {
      const res = addAdminEmail(newFacultyEmail, newFacultyCluster, newFacultyName, activeAdminEmail);
      if (res.success) {
        if (newFacultyGrantAdmin) {
          await grantAdminPrivilege(newFacultyEmail, activeAdminEmail);
        }
        showMsg(`Successfully authorized faculty "${newFacultyEmail}" under ${newFacultyCluster} cluster.`, 'success');
        setShowAddUserModal(false);
        setNewFacultyEmail('');
        setNewFacultyName('');
        setNewFacultyGrantAdmin(false);
        if (onRefreshData) onRefreshData();
      } else {
        showMsg(res.error || 'Failed to authorize faculty member.', 'error');
      }
    } catch (err) {
      showMsg(err.message || 'Error authorizing faculty.', 'error');
    }
  };

  // Add Student Submit
  const handleCreateStudent = async (e) => {
    e.preventDefault();
    try {
      const res = await registerStudentAccount(newStudentData);
      if (res.success) {
        showMsg(`Student account "${newStudentData.email}" registered successfully.`, 'success');
        setShowAddUserModal(false);
        setNewStudentData({
          studentNumber: '',
          email: '',
          firstName: '',
          lastName: '',
          program: 'CS',
          unitsLeft: '33',
          password: '1234'
        });
        loadStudents();
      } else {
        showMsg(res.error || 'Failed to register student.', 'error');
      }
    } catch (err) {
      showMsg(err.message || 'Error registering student.', 'error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Banner & Stats Overview */}
      <div 
        className="dossier-card" 
        style={{ 
          padding: '1.75rem', 
          background: 'linear-gradient(135deg, rgba(185, 28, 28, 0.08) 0%, rgba(217, 119, 6, 0.07) 100%)',
          borderColor: 'rgba(185, 28, 28, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ 
              width: 50, 
              height: 50, 
              borderRadius: '14px', 
              backgroundColor: 'rgba(185, 28, 28, 0.14)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              color: 'var(--crimson-bright)',
              border: '1px solid rgba(185, 28, 28, 0.3)'
            }}>
              <ShieldCheck size={28} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ 
                  fontSize: '0.72rem', 
                  fontWeight: 800, 
                  color: 'var(--crimson-bright)', 
                  textTransform: 'uppercase', 
                  letterSpacing: '0.05em' 
                }}>
                  SOIT Master Security Authority
                </span>
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  padding: '0.15rem 0.5rem',
                  borderRadius: '999px',
                  background: 'rgba(217, 119, 6, 0.16)',
                  color: 'var(--gold-bright)',
                  border: '1px solid rgba(217, 119, 6, 0.35)'
                }}>
                  ADMIN ACCESS ONLY
                </span>
              </div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0.2rem 0', color: 'var(--text-pure)' }}>
                Account Information & Security Management
              </h2>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
                Manage account details, credentials, and permissions across all SOIT users. Grant or revoke Administrator privileges for Chairs and Faculty.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn-secondary-ghost"
              onClick={loadStudents}
              disabled={isLoadingStudents}
              style={{ padding: '0.65rem 1.15rem', fontSize: '0.82rem', fontWeight: 700 }}
              title="Refresh student and account data"
            >
              <RefreshCw size={14} className={isLoadingStudents ? 'spin-icon' : ''} />
              <span>{isLoadingStudents ? 'Syncing...' : 'Sync Cloud Accounts'}</span>
            </button>

            <button
              type="button"
              className="tactile-btn-primary"
              onClick={() => setShowAddUserModal(true)}
              style={{ padding: '0.65rem 1.25rem', fontSize: '0.82rem' }}
            >
              <UserPlus size={15} />
              <span>+ Provision New User</span>
            </button>
          </div>
        </div>

        {/* 4 Stat Metric Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem' }}>
          <div style={{ 
            background: 'var(--bg-card)', 
            border: '1px solid var(--border-hairline)', 
            borderRadius: '12px', 
            padding: '1rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }}>
            <div style={{ width: 42, height: 42, borderRadius: '10px', background: 'rgba(16, 185, 129, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--emerald-core)' }}>
              <GraduationCap size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)' }}>Registered Students</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-pure)' }}>{studentsFormatted.length}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--emerald-core)', fontWeight: 600 }}>{studentsFormatted.filter(s => s.petitionCount > 0).length} active petitioners</div>
            </div>
          </div>

          <div style={{ 
            background: 'var(--bg-card)', 
            border: '1px solid var(--border-hairline)', 
            borderRadius: '12px', 
            padding: '1rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }}>
            <div style={{ width: 42, height: 42, borderRadius: '10px', background: 'rgba(59, 130, 246, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
              <Users size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)' }}>Cluster Faculty</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-pure)' }}>{facultyList.length}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-light)', fontWeight: 600 }}>Across 5 clusters</div>
            </div>
          </div>

          <div style={{ 
            background: 'var(--bg-card)', 
            border: '1px solid var(--border-hairline)', 
            borderRadius: '12px', 
            padding: '1rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }}>
            <div style={{ width: 42, height: 42, borderRadius: '10px', background: 'rgba(217, 119, 6, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gold-bright)' }}>
              <BookOpen size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)' }}>Lead Program Chairs</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-pure)' }}>{chairsList.length}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-light)', fontWeight: 600 }}>CS, IT, DS, EMC, IS, SOIT</div>
            </div>
          </div>

          <div style={{ 
            background: 'var(--bg-card)', 
            border: '1px solid var(--border-hairline)', 
            borderRadius: '12px', 
            padding: '1rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }}>
            <div style={{ width: 42, height: 42, borderRadius: '10px', background: 'rgba(185, 28, 28, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--crimson-bright)' }}>
              <ShieldCheck size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)' }}>System Administrators</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--crimson-bright)' }}>{adminsOnlyList.length}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--crimson-bright)', fontWeight: 600 }}>Full permission authority</div>
            </div>
          </div>
        </div>
      </div>

      {/* Feedback Alert Banner */}
      {feedback.text && (
        <div style={{
          padding: '0.85rem 1.15rem',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.85rem',
          fontWeight: 700,
          backgroundColor: feedback.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
          color: feedback.type === 'success' ? 'var(--emerald-core)' : '#ef4444',
          border: `1px solid ${feedback.type === 'success' ? 'var(--emerald-border)' : 'rgba(239, 68, 68, 0.3)'}`,
          display: 'flex',
          alignItems: 'center',
          gap: '0.55rem'
        }}>
          {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Category Pills Tab Bar */}
      <div className="chair-tab-bar" style={{ marginBottom: 0 }}>
        <button
          type="button"
          className={`chair-tab-btn ${userCategory === 'all' ? 'active' : ''}`}
          onClick={() => setUserCategory('all')}
        >
          <Users size={15} />
          <span>All Accounts ({allUsersList.length})</span>
        </button>

        <button
          type="button"
          className={`chair-tab-btn ${userCategory === 'students' ? 'active' : ''}`}
          onClick={() => setUserCategory('students')}
        >
          <GraduationCap size={15} />
          <span>Students ({studentsFormatted.length})</span>
        </button>

        <button
          type="button"
          className={`chair-tab-btn ${userCategory === 'faculty' ? 'active' : ''}`}
          onClick={() => setUserCategory('faculty')}
        >
          <BookOpen size={15} />
          <span>Faculty ({facultyList.length})</span>
        </button>

        <button
          type="button"
          className={`chair-tab-btn ${userCategory === 'chairs' ? 'active' : ''}`}
          onClick={() => setUserCategory('chairs')}
        >
          <ShieldAlert size={15} />
          <span>Program Chairs ({chairsList.length})</span>
        </button>

        <button
          type="button"
          className={`chair-tab-btn ${userCategory === 'admins' ? 'active' : ''}`}
          onClick={() => setUserCategory('admins')}
        >
          <ShieldCheck size={15} />
          <span>Administrators ({adminsOnlyList.length})</span>
        </button>
      </div>

      {/* Main Table Container Card */}
      <div className="dossier-card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Search & Cluster Filters */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          {/* Search Input */}
          <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: '420px' }}>
            <Search size={15} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="custom-input"
              placeholder="Search by name, email, student number..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '2.4rem', fontSize: '0.85rem' }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Cluster & Admin Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <Filter size={13} />
              <span>Cluster:</span>
              <select
                className="chair-status-select"
                value={clusterFilter}
                onChange={e => setClusterFilter(e.target.value)}
                style={{ fontSize: '0.78rem', padding: '0.3rem 0.6rem' }}
              >
                <option value="ALL">All Clusters</option>
                <option value="CS">CS (Computer Science)</option>
                <option value="IT">IT (Information Technology)</option>
                <option value="DS">DS (Data Science)</option>
                <option value="EMC">EMC (Multimedia)</option>
                <option value="IS">IS (Information Systems)</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <span>Admin Role:</span>
              <select
                className="chair-status-select"
                value={adminStatusFilter}
                onChange={e => setAdminStatusFilter(e.target.value)}
                style={{ fontSize: '0.78rem', padding: '0.3rem 0.6rem' }}
              >
                <option value="ALL">All Roles</option>
                <option value="ADMIN">Admin Only</option>
                <option value="NON_ADMIN">Non-Admin</option>
              </select>
            </div>
          </div>
        </div>

        {/* User Accounts Table */}
        <div className="table-responsive">
          <table className="data-table" style={{ minWidth: '920px' }}>
            <thead>
              <tr>
                <th>User / Account Name</th>
                <th>Email & Identification</th>
                <th>Category & Program</th>
                <th>Admin Role Privilege</th>
                <th>Admin Privilege Control</th>
                <th>Management Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayedUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.65rem' }}>
                      <Users size={32} style={{ opacity: 0.35 }} />
                      <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>No user accounts match your filters.</div>
                      <div style={{ fontSize: '0.8rem' }}>Try clearing your search or switching categories above.</div>
                    </div>
                  </td>
                </tr>
              ) : (
                displayedUsers.map(u => {
                  const isCurrentSession = activeAdminEmail.toLowerCase() === u.email.toLowerCase();
                  const isSuper = isSuperAdmin(u.email);
                  const isLead = isLeadProgramChair(u.email);

                  return (
                    <tr key={u.id}>
                      {/* Name & Session Badge */}
                      <td style={{ fontWeight: 700, color: 'var(--text-pure)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            background: u.userCategory === 'student'
                              ? 'rgba(16, 185, 129, 0.14)'
                              : u.userCategory === 'chair'
                              ? 'rgba(217, 119, 6, 0.16)'
                              : 'rgba(59, 130, 246, 0.14)',
                            color: u.userCategory === 'student'
                              ? 'var(--emerald-core)'
                              : u.userCategory === 'chair'
                              ? 'var(--gold-bright)'
                              : '#3b82f6',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '0.75rem',
                            flexShrink: 0
                          }}>
                            {u.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <span>{u.name}</span>
                              {isCurrentSession && (
                                <span style={{
                                  fontSize: '0.65rem',
                                  fontWeight: 800,
                                  padding: '0.1rem 0.4rem',
                                  borderRadius: '999px',
                                  background: 'rgba(16, 185, 129, 0.14)',
                                  color: 'var(--emerald-core)',
                                  border: '1px solid var(--emerald-border)'
                                }}>
                                  You
                                </span>
                              )}
                            </div>
                            {u.userCategory === 'student' && u.petitionCount > 0 && (
                              <div style={{ fontSize: '0.7rem', color: 'var(--emerald-core)', fontWeight: 600 }}>
                                {u.petitionCount} active petition{u.petitionCount > 1 ? 's' : ''}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Email & ID */}
                      <td>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {u.email}
                        </div>
                        {u.studentNumber && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-light)', fontWeight: 600 }}>
                            SN: <strong>{u.studentNumber}</strong>
                          </div>
                        )}
                      </td>

                      {/* Category & Program */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{
                            display: 'inline-block',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            padding: '0.18rem 0.5rem',
                            borderRadius: '6px',
                            background: u.userCategory === 'student'
                              ? 'rgba(16, 185, 129, 0.1)'
                              : u.userCategory === 'chair'
                              ? 'rgba(217, 119, 6, 0.1)'
                              : 'rgba(59, 130, 246, 0.1)',
                            color: u.userCategory === 'student'
                              ? 'var(--emerald-core)'
                              : u.userCategory === 'chair'
                              ? '#d97706'
                              : '#2563eb'
                          }}>
                            {u.userCategory === 'student'
                              ? `Student • ${u.program}`
                              : u.userCategory === 'chair'
                              ? `Program Chair • ${u.dept}`
                              : `Faculty • ${u.dept}`}
                          </span>
                        </div>
                        {u.unitsLeft && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                            {u.unitsLeft} units remaining
                          </div>
                        )}
                      </td>

                      {/* Admin Role Privilege Status */}
                      <td>
                        {u.isAdmin ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            padding: '0.22rem 0.6rem',
                            borderRadius: '999px',
                            background: isSuper ? 'rgba(185, 28, 28, 0.12)' : 'rgba(16, 185, 129, 0.14)',
                            color: isSuper ? 'var(--crimson-bright)' : 'var(--emerald-core)',
                            border: `1px solid ${isSuper ? 'rgba(185, 28, 28, 0.3)' : 'var(--emerald-border)'}`
                          }}>
                            <ShieldCheck size={12} />
                            <span>{isSuper ? 'Super Admin' : 'System Admin'}</span>
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            padding: '0.2rem 0.55rem',
                            borderRadius: '999px',
                            background: 'var(--bg-input)',
                            color: 'var(--text-light)',
                            border: '1px solid var(--border-hairline)'
                          }}>
                            <span>Standard User</span>
                          </span>
                        )}
                      </td>

                      {/* Admin Privilege Control Toggle */}
                      <td>
                        {u.userCategory === 'student' ? (
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-faint)' }}>
                            N/A (Student Account)
                          </span>
                        ) : isSuper ? (
                          <span style={{ 
                            fontSize: '0.72rem', 
                            color: 'var(--crimson-bright)', 
                            fontWeight: 700, 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: '0.3rem' 
                          }}>
                            <Lock size={11} />
                            <span>Permanent Super Admin</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleToggleAdminRole(u)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.4rem',
                              padding: '0.32rem 0.75rem',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              borderRadius: '999px',
                              cursor: 'pointer',
                              background: u.isAdmin ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                              color: u.isAdmin ? '#ef4444' : 'var(--emerald-core)',
                              border: `1px solid ${u.isAdmin ? 'rgba(239, 68, 68, 0.3)' : 'var(--emerald-border)'}`
                            }}
                            title={u.isAdmin ? 'Revoke administrator privileges' : 'Grant administrator privileges'}
                          >
                            {u.isAdmin ? <UserX size={12} /> : <UserCheck size={12} />}
                            <span>{u.isAdmin ? 'Revoke Admin' : 'Set to Admin'}</span>
                          </button>
                        )}
                      </td>

                      {/* Management Actions: Edit, Reset Pass, Delete */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <button
                            type="button"
                            onClick={() => setEditingUser(u)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              padding: '0.3rem 0.6rem',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              borderRadius: '6px',
                              background: 'var(--bg-input)',
                              color: 'var(--text-secondary)',
                              border: '1px solid var(--border-hairline)',
                              cursor: 'pointer'
                            }}
                            title="Edit account information"
                          >
                            <Edit3 size={12} />
                            <span>Edit</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setPasswordResetUser(u);
                              setNewPasswordVal('');
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              padding: '0.3rem 0.6rem',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              borderRadius: '6px',
                              background: 'rgba(217, 119, 6, 0.1)',
                              color: 'var(--gold-bright)',
                              border: '1px solid rgba(217, 119, 6, 0.25)',
                              cursor: 'pointer'
                            }}
                            title="Directly reset account password"
                          >
                            <KeyRound size={12} />
                            <span>Password</span>
                          </button>

                          {!isSuper && !isLead && (
                            <button
                              type="button"
                              onClick={() => setDeletingUser(u)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                padding: '0.3rem 0.5rem',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                borderRadius: '6px',
                                background: 'rgba(239, 68, 68, 0.08)',
                                color: '#ef4444',
                                border: '1px solid rgba(239, 68, 68, 0.25)',
                                cursor: 'pointer'
                              }}
                              title="Delete or remove this account"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: EDIT ACCOUNT INFORMATION */}
      {editingUser && (
        <div className="modal-backdrop" onClick={() => setEditingUser(null)}>
          <div className="confirmation-modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-hairline)', paddingBottom: '0.9rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--crimson-bright)' }}>
                <Edit3 size={18} />
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-pure)' }}>
                  Edit {editingUser.userCategory === 'student' ? 'Student Profile' : 'Faculty Profile'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="modal-close-btn"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveUserDetails} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="input-field-group" style={{ marginBottom: 0 }}>
                <label className="field-label">Account Email (Permanent Identifier)</label>
                <input
                  type="email"
                  className="custom-input"
                  value={editingUser.email}
                  disabled
                  style={{ opacity: 0.65, cursor: 'not-allowed', background: 'var(--bg-input)' }}
                />
              </div>

              {editingUser.userCategory === 'student' ? (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div className="input-field-group" style={{ marginBottom: 0 }}>
                      <label className="field-label">First Name</label>
                      <input
                        type="text"
                        className="custom-input"
                        value={editingUser.data?.firstName || editingUser.firstName || ''}
                        onChange={e => setEditingUser({
                          ...editingUser,
                          data: { ...(editingUser.data || editingUser), firstName: e.target.value }
                        })}
                        required
                      />
                    </div>
                    <div className="input-field-group" style={{ marginBottom: 0 }}>
                      <label className="field-label">Last Name</label>
                      <input
                        type="text"
                        className="custom-input"
                        value={editingUser.data?.lastName || editingUser.lastName || ''}
                        onChange={e => setEditingUser({
                          ...editingUser,
                          data: { ...(editingUser.data || editingUser), lastName: e.target.value }
                        })}
                        required
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.75rem' }}>
                    <div className="input-field-group" style={{ marginBottom: 0 }}>
                      <label className="field-label">10-Digit Student Number</label>
                      <input
                        type="text"
                        className="custom-input"
                        value={editingUser.data?.studentNumber || editingUser.studentNumber || ''}
                        onChange={e => setEditingUser({
                          ...editingUser,
                          data: { ...(editingUser.data || editingUser), studentNumber: e.target.value }
                        })}
                        maxLength={10}
                        required
                      />
                    </div>
                    <div className="input-field-group" style={{ marginBottom: 0 }}>
                      <label className="field-label">Remaining Units</label>
                      <input
                        type="number"
                        className="custom-input"
                        value={editingUser.data?.unitsLeft || editingUser.unitsLeft || '0'}
                        onChange={e => setEditingUser({
                          ...editingUser,
                          data: { ...(editingUser.data || editingUser), unitsLeft: e.target.value }
                        })}
                        min={0}
                        max={250}
                        required
                      />
                    </div>
                  </div>

                  <div className="input-field-group" style={{ marginBottom: 0 }}>
                    <label className="field-label">SOIT Degree Program</label>
                    <select
                      className="custom-input"
                      value={editingUser.data?.program || editingUser.program || 'CS'}
                      onChange={e => setEditingUser({
                        ...editingUser,
                        data: { ...(editingUser.data || editingUser), program: e.target.value }
                      })}
                      style={{ fontWeight: 700 }}
                    >
                      {SOIT_PROGRAMS.map(prog => (
                        <option key={prog.code} value={prog.code}>
                          {prog.code} — {prog.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              ) : (
                <>
                  <div className="input-field-group" style={{ marginBottom: 0 }}>
                    <label className="field-label">Faculty Full Name / Title</label>
                    <input
                      type="text"
                      className="custom-input"
                      value={editingUser.data?.name || editingUser.name || ''}
                      onChange={e => setEditingUser({
                        ...editingUser,
                        data: { ...(editingUser.data || editingUser), name: e.target.value }
                      })}
                      required
                    />
                  </div>

                  <div className="input-field-group" style={{ marginBottom: 0 }}>
                    <label className="field-label">Assigned Cluster / Department</label>
                    <select
                      className="custom-input"
                      value={editingUser.data?.dept || editingUser.dept || 'CS'}
                      onChange={e => setEditingUser({
                        ...editingUser,
                        data: { ...(editingUser.data || editingUser), dept: e.target.value }
                      })}
                      disabled={isLeadProgramChair(editingUser.email)}
                      style={{ fontWeight: 700 }}
                    >
                      <option value="CS">CS — Computer Science</option>
                      <option value="IT">IT — Information Technology</option>
                      <option value="DS">DS — Data Science</option>
                      <option value="EMC">EMC — Entertainment & Multimedia</option>
                      <option value="IS">IS — Information Systems</option>
                    </select>
                  </div>
                </>
              )}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.75rem' }}>
                <button
                  type="button"
                  className="btn-secondary-ghost"
                  onClick={() => setEditingUser(null)}
                  style={{ padding: '0.65rem 1.25rem', fontSize: '0.82rem', fontWeight: 700 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="tactile-btn-primary"
                  style={{ padding: '0.65rem 1.4rem' }}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: DIRECT PASSWORD RESET */}
      {passwordResetUser && (
        <div className="modal-backdrop" onClick={() => setPasswordResetUser(null)}>
          <div className="confirmation-modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-hairline)', paddingBottom: '0.9rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--gold-bright)' }}>
                <KeyRound size={18} />
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-pure)' }}>
                  Reset User Password
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPasswordResetUser(null)}
                className="modal-close-btn"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
              Directly assign a new password for <strong>{passwordResetUser.name}</strong> ({passwordResetUser.email}).
            </p>

            <form onSubmit={handleExecutePasswordReset} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              <div className="input-field-group" style={{ marginBottom: 0 }}>
                <label className="field-label">New Password (Min 4 chars)</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    className="custom-input"
                    placeholder="Enter new password"
                    value={newPasswordVal}
                    onChange={e => setNewPasswordVal(e.target.value)}
                    required
                    minLength={4}
                    style={{ paddingRight: '2.5rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                  >
                    {showNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setNewPasswordVal('1234')}
                  style={{
                    padding: '0.35rem 0.75rem',
                    borderRadius: '6px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-hairline)',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer'
                  }}
                >
                  Set to 1234 (Default)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const rnd = Math.random().toString(36).slice(-8);
                    setNewPasswordVal(rnd);
                    setShowNewPassword(true);
                  }}
                  style={{
                    padding: '0.35rem 0.75rem',
                    borderRadius: '6px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-hairline)',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer'
                  }}
                >
                  Generate 8-Char Random
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn-secondary-ghost"
                  onClick={() => setPasswordResetUser(null)}
                  style={{ padding: '0.65rem 1.25rem', fontSize: '0.82rem', fontWeight: 700 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="tactile-btn-primary"
                  style={{ padding: '0.65rem 1.4rem' }}
                >
                  Apply New Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: DELETE ACCOUNT CONFIRMATION */}
      {deletingUser && (
        <div className="modal-backdrop" onClick={() => setDeletingUser(null)}>
          <div className="confirmation-modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px', textAlign: 'center' }}>
            <div style={{
              width: 50,
              height: 50,
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
              color: '#ef4444'
            }}>
              <AlertTriangle size={26} />
            </div>

            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 0.5rem', color: 'var(--text-pure)' }}>
              Confirm Account Removal
            </h3>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '1.5rem' }}>
              Are you sure you want to permanently remove the account for <strong>{deletingUser.name}</strong> ({deletingUser.email})? This action will delete their profile from Cloud Firestore and local storage.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn-secondary-ghost"
                onClick={() => setDeletingUser(null)}
                style={{ padding: '0.65rem 1.25rem', fontSize: '0.82rem', fontWeight: 700 }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteDelete}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.65rem 1.25rem',
                  borderRadius: '999px',
                  background: '#ef4444',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                <Trash2 size={15} />
                <span>Yes, Remove Account</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: PROVISION NEW USER (FACULTY OR STUDENT) */}
      {showAddUserModal && (
        <div className="modal-backdrop" onClick={() => setShowAddUserModal(false)}>
          <div className="confirmation-modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-hairline)', paddingBottom: '0.9rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--crimson-bright)' }}>
                <UserPlus size={18} />
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-pure)' }}>
                  Provision New User Account
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddUserModal(false)}
                className="modal-close-btn"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* Sub-tab selection */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <button
                type="button"
                onClick={() => setAddUserTab('faculty')}
                style={{
                  flex: 1,
                  padding: '0.6rem',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  border: 'none',
                  cursor: 'pointer',
                  background: addUserTab === 'faculty' ? 'var(--crimson-core)' : 'var(--bg-input)',
                  color: addUserTab === 'faculty' ? '#ffffff' : 'var(--text-secondary)'
                }}
              >
                Authorize Faculty / Admin
              </button>
              <button
                type="button"
                onClick={() => setAddUserTab('student')}
                style={{
                  flex: 1,
                  padding: '0.6rem',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  border: 'none',
                  cursor: 'pointer',
                  background: addUserTab === 'student' ? 'var(--crimson-core)' : 'var(--bg-input)',
                  color: addUserTab === 'student' ? '#ffffff' : 'var(--text-secondary)'
                }}
              >
                Register Student Account
              </button>
            </div>

            {addUserTab === 'faculty' ? (
              <form onSubmit={handleCreateFaculty} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="input-field-group" style={{ marginBottom: 0 }}>
                  <label className="field-label">Faculty Email Address <span className="required-dot">*</span></label>
                  <input
                    type="email"
                    className="custom-input"
                    placeholder="e.g. faculty@mapua.edu.ph"
                    value={newFacultyEmail}
                    onChange={e => setNewFacultyEmail(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.75rem' }}>
                  <div className="input-field-group" style={{ marginBottom: 0 }}>
                    <label className="field-label">Faculty Full Name / Title</label>
                    <input
                      type="text"
                      className="custom-input"
                      placeholder="e.g. Prof. Juan Dela Cruz"
                      value={newFacultyName}
                      onChange={e => setNewFacultyName(e.target.value)}
                    />
                  </div>

                  <div className="input-field-group" style={{ marginBottom: 0 }}>
                    <label className="field-label">Assigned Cluster <span className="required-dot">*</span></label>
                    <select
                      className="custom-input"
                      value={newFacultyCluster}
                      onChange={e => setNewFacultyCluster(e.target.value)}
                      style={{ fontWeight: 700 }}
                    >
                      <option value="CS">CS (Computer Science)</option>
                      <option value="IT">IT (Information Technology)</option>
                      <option value="DS">DS (Data Science)</option>
                      <option value="EMC">EMC (Multimedia)</option>
                      <option value="IS">IS (Information Systems)</option>
                    </select>
                  </div>
                </div>

                {/* Grant Admin immediately checkbox */}
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-pure)', cursor: 'pointer', background: 'rgba(217, 119, 6, 0.08)', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid rgba(217, 119, 6, 0.25)' }}>
                  <input
                    type="checkbox"
                    checked={newFacultyGrantAdmin}
                    onChange={e => setNewFacultyGrantAdmin(e.target.checked)}
                    style={{ accentColor: 'var(--crimson-core)' }}
                  />
                  <span>Grant Administrator Privileges immediately</span>
                </label>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    className="btn-secondary-ghost"
                    onClick={() => setShowAddUserModal(false)}
                    style={{ padding: '0.65rem 1.25rem', fontSize: '0.82rem', fontWeight: 700 }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="tactile-btn-primary"
                    style={{ padding: '0.65rem 1.4rem' }}
                  >
                    Authorize Faculty
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleCreateStudent} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="input-field-group" style={{ marginBottom: 0 }}>
                    <label className="field-label">First Name <span className="required-dot">*</span></label>
                    <input
                      type="text"
                      className="custom-input"
                      placeholder="First Name"
                      value={newStudentData.firstName}
                      onChange={e => setNewStudentData({ ...newStudentData, firstName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="input-field-group" style={{ marginBottom: 0 }}>
                    <label className="field-label">Last Name <span className="required-dot">*</span></label>
                    <input
                      type="text"
                      className="custom-input"
                      placeholder="Last Name"
                      value={newStudentData.lastName}
                      onChange={e => setNewStudentData({ ...newStudentData, lastName: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.75rem' }}>
                  <div className="input-field-group" style={{ marginBottom: 0 }}>
                    <label className="field-label">10-Digit Student Number <span className="required-dot">*</span></label>
                    <input
                      type="text"
                      className="custom-input"
                      placeholder="e.g. 2023104521"
                      value={newStudentData.studentNumber}
                      onChange={e => setNewStudentData({ ...newStudentData, studentNumber: e.target.value })}
                      maxLength={10}
                      required
                    />
                  </div>
                  <div className="input-field-group" style={{ marginBottom: 0 }}>
                    <label className="field-label">Remaining Units <span className="required-dot">*</span></label>
                    <input
                      type="number"
                      className="custom-input"
                      value={newStudentData.unitsLeft}
                      onChange={e => setNewStudentData({ ...newStudentData, unitsLeft: e.target.value })}
                      min={0}
                      max={250}
                      required
                    />
                  </div>
                </div>

                <div className="input-field-group" style={{ marginBottom: 0 }}>
                  <label className="field-label">MyMapúa Email <span className="required-dot">*</span></label>
                  <input
                    type="email"
                    className="custom-input"
                    placeholder="student@mymail.mapua.edu.ph"
                    value={newStudentData.email}
                    onChange={e => setNewStudentData({ ...newStudentData, email: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.75rem' }}>
                  <div className="input-field-group" style={{ marginBottom: 0 }}>
                    <label className="field-label">Degree Program <span className="required-dot">*</span></label>
                    <select
                      className="custom-input"
                      value={newStudentData.program}
                      onChange={e => setNewStudentData({ ...newStudentData, program: e.target.value })}
                      style={{ fontWeight: 700 }}
                    >
                      {SOIT_PROGRAMS.map(prog => (
                        <option key={prog.code} value={prog.code}>
                          {prog.code} — {prog.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="input-field-group" style={{ marginBottom: 0 }}>
                    <label className="field-label">Initial Password <span className="required-dot">*</span></label>
                    <input
                      type="text"
                      className="custom-input"
                      value={newStudentData.password}
                      onChange={e => setNewStudentData({ ...newStudentData, password: e.target.value })}
                      required
                      minLength={4}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    className="btn-secondary-ghost"
                    onClick={() => setShowAddUserModal(false)}
                    style={{ padding: '0.65rem 1.25rem', fontSize: '0.82rem', fontWeight: 700 }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="tactile-btn-primary"
                    style={{ padding: '0.65rem 1.4rem' }}
                  >
                    Register Student
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

