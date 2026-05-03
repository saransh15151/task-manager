import { useEffect, useState } from "react";
import API from "../api/api";
import "../Dashboard.css";

function Dashboard() {
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  
  // Forms
  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  
  // UI State
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const userRes = await API.get("/me");
      setUser(userRes.data);
      const projRes = await API.get("/projects");
      setProjects(projRes.data);
    } catch (err) {
      console.log(err);
      if (err.response?.status === 401) logout();
    } finally {
      setLoading(false);
    }
  };

  const getProjects = async () => {
    try {
      const projRes = await API.get("/projects");
      setProjects(projRes.data);
    } catch (err) {
      console.log(err);
    }
  };

  const openProject = async (project) => {
    setSelectedProject(project);
    fetchProjectDetails(project._id);
  };

  const fetchProjectDetails = async (projectId) => {
    try {
      setErrorMsg("");
      const [projRes, tasksRes] = await Promise.all([
        API.get(`/projects/${projectId}`),
        API.get(`/projects/${projectId}/tasks`)
      ]);
      setSelectedProject(projRes.data);
      setTasks(tasksRes.data);
    } catch (err) {
      console.log(err);
      setErrorMsg("Failed to load project details.");
    }
  };

  const closeProject = () => {
    setSelectedProject(null);
    setTasks([]);
    getProjects(); // Refresh project list to get updated stats
  };

  // ================= PROJECTS =================

  const createProject = async (e) => {
    e.preventDefault();
    if (!newProjectTitle.trim()) return;
    try {
      await API.post("/projects", { title: newProjectTitle, description: newProjectDesc });
      setNewProjectTitle("");
      setNewProjectDesc("");
      setShowProjectModal(false);
      getProjects();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || "Error creating project");
    }
  };

  const deleteProject = async (id) => {
    if (!window.confirm("Are you sure you want to delete this project?")) return;
    try {
      await API.delete(`/projects/${id}`);
      closeProject();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || "Error deleting project");
    }
  };

  // ================= TASKS =================

  const addTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !selectedProject) return;
    try {
      await API.post(`/projects/${selectedProject._id}/tasks`, { title: newTaskTitle });
      setNewTaskTitle("");
      fetchProjectDetails(selectedProject._id);
    } catch (err) {
      setErrorMsg(err.response?.data?.error || "Error adding task");
    }
  };

  const toggleTaskStatus = async (task) => {
    const nextStatus = task.status === "done" ? "todo" : (task.status === "todo" ? "in-progress" : "done");
    try {
      await API.put(`/tasks/${task._id}`, { status: nextStatus });
      fetchProjectDetails(selectedProject._id);
    } catch (err) {
      console.log(err);
    }
  };

  const deleteTask = async (id) => {
    try {
      await API.delete(`/tasks/${id}`);
      fetchProjectDetails(selectedProject._id);
    } catch (err) {
      setErrorMsg(err.response?.data?.error || "Error deleting task. Admin access required.");
    }
  };

  // ================= MEMBERS =================

  const addMember = async (e) => {
    e.preventDefault();
    if (!newMemberEmail.trim() || !selectedProject) return;
    try {
      await API.post(`/projects/${selectedProject._id}/members`, { email: newMemberEmail });
      setNewMemberEmail("");
      fetchProjectDetails(selectedProject._id);
    } catch (err) {
      setErrorMsg(err.response?.data?.error || "Error adding member");
    }
  };

  const removeMember = async (userId) => {
    if (!window.confirm("Remove this member?")) return;
    try {
      await API.delete(`/projects/${selectedProject._id}/members/${userId}`);
      fetchProjectDetails(selectedProject._id);
    } catch (err) {
      setErrorMsg(err.response?.data?.error || "Error removing member");
    }
  };

  // ================= UTILS =================

  const logout = () => {
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  if (loading) return <div className="dashboard loading">Loading TaskFlow...</div>;

  // Check if current user is admin of selected project
  const isCurrentAdmin = selectedProject?.members?.find(m => m.user._id === user?._id)?.role === "admin";

  return (
    <div className="dashboard">
      <nav className="navbar">
        <div className="nav-brand" onClick={closeProject} style={{cursor: 'pointer'}}>
          <div className="brand-icon">⚡</div>
          <h1>TaskFlow</h1>
        </div>
        <div className="nav-actions">
          <span className="nav-greeting">
            Hello, {user?.name} 👋
          </span>
          <button className="logout-btn" onClick={logout}>
            ↗ Sign Out
          </button>
        </div>
      </nav>

      <main className="dashboard-content">
        {errorMsg && <div className="error-banner">{errorMsg} <button onClick={() => setErrorMsg("")}>×</button></div>}

        {!selectedProject ? (
          // ================= PROJECTS LIST VIEW =================
          <>
            <div className="dashboard-header split">
              <div>
                <h2>My Projects</h2>
                <p>Manage your projects and collaborate with your team.</p>
              </div>
              <button className="add-btn" onClick={() => setShowProjectModal(true)}>
                ＋ New Project
              </button>
            </div>

            {projects.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">📁</span>
                <h3>No projects yet</h3>
                <p>Create your first project to start assigning tasks!</p>
                <button className="add-btn mt-2" onClick={() => setShowProjectModal(true)}>Create Project</button>
              </div>
            ) : (
              <div className="projects-grid">
                {projects.map(p => (
                  <div className="project-card" key={p._id} onClick={() => openProject(p)}>
                    <h3>{p.title}</h3>
                    <p className="project-desc">{p.description || "No description provided."}</p>
                    <div className="project-meta">
                      <span className="meta-item">👥 {p.members?.length || 1} Members</span>
                      <span className="meta-item">📋 {p.stats?.total || 0} Tasks</span>
                    </div>
                    {p.stats && p.stats.total > 0 && (
                      <div className="progress-bar">
                        <div 
                          className="progress-fill" 
                          style={{ width: `${Math.round((p.stats.done / p.stats.total) * 100)}%` }}
                        ></div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Create Project Modal */}
            {showProjectModal && (
              <div className="modal-overlay" onClick={() => setShowProjectModal(false)}>
                <div className="modal-content" onClick={e => e.stopPropagation()}>
                  <h3>Create New Project</h3>
                  <form onSubmit={createProject}>
                    <input 
                      type="text" 
                      placeholder="Project Title" 
                      value={newProjectTitle} 
                      onChange={e => setNewProjectTitle(e.target.value)} 
                      autoFocus
                    />
                    <textarea 
                      placeholder="Project Description (optional)" 
                      value={newProjectDesc} 
                      onChange={e => setNewProjectDesc(e.target.value)}
                    ></textarea>
                    <div className="modal-actions">
                      <button type="button" className="cancel-btn" onClick={() => setShowProjectModal(false)}>Cancel</button>
                      <button type="submit" className="save-btn">Create</button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </>
        ) : (
          // ================= PROJECT DETAIL VIEW =================
          <div className="project-detail-view">
            <button className="back-btn" onClick={closeProject}>← Back to Projects</button>
            
            <div className="project-header">
              <div className="project-title-area">
                <h2>{selectedProject.title}</h2>
                <p>{selectedProject.description}</p>
              </div>
              {isCurrentAdmin && (
                <button className="delete-btn outline" onClick={() => deleteProject(selectedProject._id)}>
                  Delete Project
                </button>
              )}
            </div>

            <div className="project-layout">
              {/* Tasks Section */}
              <div className="project-tasks">
                <div className="section-header">
                  <h3>Tasks</h3>
                </div>
                
                <form className="add-task-form" onSubmit={addTask}>
                  <input 
                    type="text" 
                    placeholder="What needs to be done?" 
                    value={newTaskTitle} 
                    onChange={e => setNewTaskTitle(e.target.value)} 
                  />
                  <button type="submit" className="add-btn">Add Task</button>
                </form>

                <div className="tasks-board">
                  {['todo', 'in-progress', 'done'].map(status => (
                    <div className="task-column" key={status}>
                      <h4>{status.replace('-', ' ').toUpperCase()}</h4>
                      <div className="task-list">
                        {tasks.filter(t => t.status === status).map(task => (
                          <div className="task-card" key={task._id}>
                            <div className="task-content">
                              <span className="task-title">{task.title}</span>
                              {task.assignedTo && (
                                <span className="task-assignee">👤 {task.assignedTo.name}</span>
                              )}
                            </div>
                            <div className="task-actions">
                              <button className={`status-btn ${status}`} onClick={() => toggleTaskStatus(task)}>
                                {status === 'todo' ? 'Start' : (status === 'in-progress' ? 'Complete' : 'Reopen')}
                              </button>
                              {isCurrentAdmin && (
                                <button className="icon-btn delete" onClick={() => deleteTask(task._id)} title="Delete Task">×</button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Members Section */}
              <div className="project-members">
                <div className="section-header">
                  <h3>Team</h3>
                </div>
                
                <div className="members-list">
                  {selectedProject.members.map(m => (
                    <div className="member-card" key={m.user._id}>
                      <div className="member-info">
                        <span className="member-name">{m.user.name}</span>
                        <span className="member-email">{m.user.email}</span>
                      </div>
                      <div className="member-role">
                        <span className={`role-badge ${m.role}`}>{m.role}</span>
                        {isCurrentAdmin && m.user._id !== selectedProject.owner._id && (
                          <button className="icon-btn delete" onClick={() => removeMember(m.user._id)} title="Remove Member">×</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {isCurrentAdmin && (
                  <form className="add-member-form" onSubmit={addMember}>
                    <h4>Invite Member</h4>
                    <div className="input-group">
                      <input 
                        type="email" 
                        placeholder="User's email" 
                        value={newMemberEmail} 
                        onChange={e => setNewMemberEmail(e.target.value)} 
                      />
                      <button type="submit" className="add-btn small">Invite</button>
                    </div>
                    <small>User must already have an account.</small>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default Dashboard;