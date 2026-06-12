import React, { useState, useEffect } from "react";
import axios from "axios";

// TypeScript Interfaces
interface Tenant {
  id: number;
  name: string;
  createdAt: string;
}

interface User {
  id: number;
  name: string;
  email: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  tenantId: number;
}

interface Workspace {
  id: number;
  name: string;
  description?: string;
  tenantId: number;
}

interface Task {
  id: number;
  title: string;
  description?: string | null;
  priority: "LOW" | "MEDIUM" | "HIGH";
  status: "TODO" | "IN_PROGRESS" | "DONE";
  dueDate?: string | null;
  workspaceId: number;
}

export default function App() {
  // App Core States
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    !!localStorage.getItem("workhive_token")
  );
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("workhive_token")
  );
  const [user, setUser] = useState<User | null>(
    localStorage.getItem("workhive_user")
      ? JSON.parse(localStorage.getItem("workhive_user")!)
      : null
  );
  const [tenant, setTenant] = useState<Tenant | null>(
    localStorage.getItem("workhive_tenant")
      ? JSON.parse(localStorage.getItem("workhive_tenant")!)
      : null
  );

  // Connection config
  const [apiTarget, setApiTarget] = useState<"backend" | "stub" | "local">("local");
  const [serverUrl, setServerUrl] = useState<string>("http://localhost:8000");

  // Navigation / Workspace States
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);

  // Auth Forms
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [authForm, setAuthForm] = useState({
    name: "",
    email: "",
    password: "",
    tenantName: "",
  });

  // Modal / Form States for Creating/Editing
  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [newWorkspaceDesc, setNewWorkspaceDesc] = useState("");

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskForm, setTaskForm] = useState<{
    id?: number;
    title: string;
    description: string;
    priority: "LOW" | "MEDIUM" | "HIGH";
    status: "TODO" | "IN_PROGRESS" | "DONE";
    dueDate: string;
  }>({
    title: "",
    description: "",
    priority: "MEDIUM",
    status: "TODO",
    dueDate: "",
  });

  // Local state backup mock database (Failsafe fallback)
  const [localDB, setLocalDB] = useState<{
    workspaces: Workspace[];
    tasks: Task[];
  }>({
    workspaces: [
      { id: 1, name: "Engineering Team", description: "Vite + DRF + Specmatic setup", tenantId: 1 },
      { id: 2, name: "Marketing Workspace", description: "Public launch materials", tenantId: 1 }
    ],
    tasks: [
      { id: 101, title: "Design OpenAPI 3.1 Specs", description: "Write YAML files for contract testing", priority: "HIGH", status: "DONE", dueDate: "2026-06-15", workspaceId: 1 },
      { id: 102, title: "Setup Specmatic test suite", description: "Create specmatic.yaml and docker configurations", priority: "HIGH", status: "IN_PROGRESS", dueDate: "2026-06-20", workspaceId: 1 },
      { id: 103, title: "Configure GitHub Actions CI", description: "Include pytest and specmatic steps in pipeline", priority: "MEDIUM", status: "TODO", dueDate: "2026-06-25", workspaceId: 1 },
      { id: 104, title: "Draft launch marketing plan", description: "Prepare blog posts and tweets", priority: "LOW", status: "TODO", dueDate: "2026-06-28", workspaceId: 2 }
    ]
  });

  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  // Set API target URL
  useEffect(() => {
    if (apiTarget === "backend") {
      setServerUrl("http://localhost:8000");
      showToast("Switched API base: Production Django on Port 8000", "info");
    } else if (apiTarget === "stub") {
      setServerUrl("http://localhost:9000");
      showToast("Switched API base: Specmatic Stub Mock on Port 9000", "info");
    } else {
      setServerUrl("local-state");
      showToast("Switched API base: Offline Failsafe Local Database", "info");
    }
  }, [apiTarget]);

  // Fetch Workspaces & Tasks whenever Auth or currentWorkspace changes
  useEffect(() => {
    if (isAuthenticated) {
      fetchWorkspaces();
    }
  }, [isAuthenticated, token, serverUrl]);

  useEffect(() => {
    if (currentWorkspace) {
      fetchTasks(currentWorkspace.id);
    } else {
      setTasks([]);
    }
  }, [currentWorkspace, serverUrl]);

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Axios base config
  const getAxiosConfig = () => {
    return {
      headers: {
        Authorization: `Bearer ${token || ""}`,
        "Content-Type": "application/json",
      },
    };
  };

  // API operations wrapper with local state fallback
  const fetchWorkspaces = async () => {
    if (apiTarget === "local") {
      setWorkspaces(localDB.workspaces);
      if (localDB.workspaces.length > 0 && !currentWorkspace) {
        setCurrentWorkspace(localDB.workspaces[0]);
      }
      return;
    }

    try {
      const res = await axios.get(`${serverUrl}/workspaces`, getAxiosConfig());
      setWorkspaces(res.data);
      if (res.data.length > 0 && !currentWorkspace) {
        setCurrentWorkspace(res.data[0]);
      }
    } catch (err) {
      console.warn("API request failed, falling back to offline Local state DB:", err);
      setWorkspaces(localDB.workspaces);
      if (localDB.workspaces.length > 0 && !currentWorkspace) {
        setCurrentWorkspace(localDB.workspaces[0]);
      }
    }
  };

  const fetchTasks = async (workspaceId: number) => {
    if (apiTarget === "local") {
      const filtered = localDB.tasks.filter(t => t.workspaceId === workspaceId);
      setTasks(filtered);
      return;
    }

    try {
      const res = await axios.get(`${serverUrl}/tasks?workspaceId=${workspaceId}`, getAxiosConfig());
      setTasks(res.data);
    } catch (err) {
      console.warn("API request failed, falling back to offline Local state tasks:", err);
      const filtered = localDB.tasks.filter(t => t.workspaceId === workspaceId);
      setTasks(filtered);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (apiTarget === "local") {
      // Local Auth Mock
      const mockUser: User = {
        id: 1,
        name: authForm.name || "Alice Smith",
        email: authForm.email,
        role: "OWNER",
        tenantId: 1
      };
      const mockTenant: Tenant = {
        id: 1,
        name: authForm.tenantName || "Acme Corp",
        createdAt: new Date().toISOString()
      };
      saveAuth("mock-jwt-token-string", mockUser, mockTenant);
      showToast(`Welcome to WorkHive, ${mockUser.name}! (Local Sandbox Mode)`, "success");
      return;
    }

    try {
      if (isRegistering) {
        const res = await axios.post(`${serverUrl}/register`, authForm);
        const { token, user, tenant } = res.data;
        saveAuth(token, user, tenant);
        showToast("Registration successful!", "success");
      } else {
        const res = await axios.post(`${serverUrl}/login`, {
          email: authForm.email,
          password: authForm.password
        });
        const { token, user } = res.data;
        // Fetch Tenant if login returned successfully
        // We can request profile or just use first tenant from user
        const dummyTenant: Tenant = {
          id: user.tenantId,
          name: "Acme Corp",
          createdAt: new Date().toISOString()
        };
        saveAuth(token, user, dummyTenant);
        showToast("Logged in successfully!", "success");
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.error || "Connection failed. Please check backend status or select 'Local Sandbox'.";
      showToast(errMsg, "error");
    }
  };

  const saveAuth = (token: string, user: User, tenant: Tenant) => {
    localStorage.setItem("workhive_token", token);
    localStorage.setItem("workhive_user", JSON.stringify(user));
    localStorage.setItem("workhive_tenant", JSON.stringify(tenant));
    setToken(token);
    setUser(user);
    setTenant(tenant);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("workhive_token");
    localStorage.removeItem("workhive_user");
    localStorage.removeItem("workhive_tenant");
    setToken(null);
    setUser(null);
    setTenant(null);
    setIsAuthenticated(false);
    setCurrentWorkspace(null);
    showToast("Logged out successfully", "info");
  };

  const createWorkspace = async () => {
    if (!newWorkspaceName.trim()) return;

    if (apiTarget === "local") {
      const newWs: Workspace = {
        id: Date.now(),
        name: newWorkspaceName,
        description: newWorkspaceDesc,
        tenantId: tenant?.id || 1
      };
      const updatedList = [...localDB.workspaces, newWs];
      setLocalDB({ ...localDB, workspaces: updatedList });
      setWorkspaces(updatedList);
      setCurrentWorkspace(newWs);
      setShowWorkspaceModal(false);
      setNewWorkspaceName("");
      setNewWorkspaceDesc("");
      showToast("Workspace created locally", "success");
      return;
    }

    try {
      const res = await axios.post(`${serverUrl}/workspaces`, {
        name: newWorkspaceName,
        description: newWorkspaceDesc
      }, getAxiosConfig());
      
      const newWs = res.data;
      setWorkspaces([...workspaces, newWs]);
      setCurrentWorkspace(newWs);
      setShowWorkspaceModal(false);
      setNewWorkspaceName("");
      setNewWorkspaceDesc("");
      showToast("Workspace created!", "success");
    } catch (err: any) {
      showToast(err.response?.data?.error || "Failed to create workspace", "error");
    }
  };

  const saveTask = async () => {
    if (!taskForm.title.trim() || !currentWorkspace) return;

    if (taskForm.id) {
      // EDIT Task
      if (apiTarget === "local") {
        const updatedTasks = localDB.tasks.map(t =>
          t.id === taskForm.id
            ? { ...t, title: taskForm.title, description: taskForm.description, priority: taskForm.priority, status: taskForm.status, dueDate: taskForm.dueDate || null }
            : t
        );
        setLocalDB({ ...localDB, tasks: updatedTasks });
        setTasks(updatedTasks.filter(t => t.workspaceId === currentWorkspace.id));
        setShowTaskModal(false);
        showToast("Task updated locally", "success");
        return;
      }

      try {
        const res = await axios.put(`${serverUrl}/tasks/${taskForm.id}`, {
          title: taskForm.title,
          description: taskForm.description,
          priority: taskForm.priority,
          status: taskForm.status,
          dueDate: taskForm.dueDate || null
        }, getAxiosConfig());

        const updated = res.data;
        setTasks(tasks.map(t => (t.id === updated.id ? updated : t)));
        setShowTaskModal(false);
        showToast("Task updated!", "success");
      } catch (err: any) {
        showToast(err.response?.data?.error || "Failed to update task", "error");
      }
    } else {
      // CREATE Task
      if (apiTarget === "local") {
        const newT: Task = {
          id: Date.now(),
          title: taskForm.title,
          description: taskForm.description,
          priority: taskForm.priority,
          status: taskForm.status,
          dueDate: taskForm.dueDate || null,
          workspaceId: currentWorkspace.id
        };
        const updatedTasks = [...localDB.tasks, newT];
        setLocalDB({ ...localDB, tasks: updatedTasks });
        setTasks(updatedTasks.filter(t => t.workspaceId === currentWorkspace.id));
        setShowTaskModal(false);
        showToast("Task created locally", "success");
        return;
      }

      try {
        const res = await axios.post(`${serverUrl}/tasks`, {
          title: taskForm.title,
          description: taskForm.description,
          priority: taskForm.priority,
          status: taskForm.status,
          dueDate: taskForm.dueDate || null,
          workspaceId: currentWorkspace.id
        }, getAxiosConfig());

        setTasks([...tasks, res.data]);
        setShowTaskModal(false);
        showToast("Task created!", "success");
      } catch (err: any) {
        showToast(err.response?.data?.error || "Failed to create task", "error");
      }
    }
  };

  const deleteTask = async (taskId: number) => {
    if (!confirm("Are you sure you want to delete this task?")) return;

    if (apiTarget === "local") {
      const updatedTasks = localDB.tasks.filter(t => t.id !== taskId);
      setLocalDB({ ...localDB, tasks: updatedTasks });
      setTasks(updatedTasks.filter(t => t.workspaceId === currentWorkspace?.id));
      showToast("Task deleted locally", "info");
      return;
    }

    try {
      await axios.delete(`${serverUrl}/tasks/${taskId}`, getAxiosConfig());
      setTasks(tasks.filter(t => t.id !== taskId));
      showToast("Task deleted!", "success");
    } catch (err: any) {
      showToast(err.response?.data?.error || "Failed to delete task", "error");
    }
  };

  // Move status inline
  const updateTaskStatus = async (task: Task, newStatus: "TODO" | "IN_PROGRESS" | "DONE") => {
    if (apiTarget === "local") {
      const updatedTasks = localDB.tasks.map(t =>
        t.id === task.id ? { ...t, status: newStatus } : t
      );
      setLocalDB({ ...localDB, tasks: updatedTasks });
      setTasks(updatedTasks.filter(t => t.workspaceId === currentWorkspace?.id));
      return;
    }

    try {
      const res = await axios.put(`${serverUrl}/tasks/${task.id}`, {
        title: task.title,
        description: task.description,
        priority: task.priority,
        status: newStatus,
        dueDate: task.dueDate
      }, getAxiosConfig());
      setTasks(tasks.map(t => (t.id === res.data.id ? res.data : t)));
    } catch (err: any) {
      showToast("Failed to change task status", "error");
    }
  };

  // Modal helpers
  const openCreateTaskModal = (statusCol: "TODO" | "IN_PROGRESS" | "DONE") => {
    setTaskForm({
      title: "",
      description: "",
      priority: "MEDIUM",
      status: statusCol,
      dueDate: new Date().toISOString().split("T")[0],
    });
    setShowTaskModal(true);
  };

  const openEditTaskModal = (task: Task) => {
    setTaskForm({
      id: task.id,
      title: task.title,
      description: task.description || "",
      priority: task.priority,
      status: task.status,
      dueDate: task.dueDate || "",
    });
    setShowTaskModal(true);
  };

  // Render registration/login if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="relative min-h-screen flex items-center justify-center bg-slate-950 px-4 py-12 font-sans overflow-hidden">
        {/* Decorative Gradients */}
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-500/10 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-amber-500/5 blur-[120px]" />

        {/* Floating toast */}
        {notification && (
          <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-xl text-sm font-medium border transition-all duration-300 ${
            notification.type === "success" ? "bg-emerald-950/80 border-emerald-500/30 text-emerald-300" :
            notification.type === "error" ? "bg-rose-950/80 border-rose-500/30 text-rose-300" :
            "bg-indigo-950/80 border-indigo-500/30 text-indigo-300"
          }`}>
            {notification.message}
          </div>
        )}

        <div className="w-full max-w-md glass p-8 rounded-2xl shadow-2xl relative z-10">
          <div className="flex justify-center mb-6">
            <span className="text-4xl">🐝</span>
          </div>
          <h2 className="text-3xl font-extrabold text-center tracking-tight bg-gradient-to-r from-amber-400 via-amber-200 to-indigo-400 bg-clip-text text-transparent mb-2">
            WorkHive
          </h2>
          <p className="text-slate-400 text-sm text-center mb-6">
            Collaborative task space for high-performing teams
          </p>

          {/* Connection Target Switcher */}
          <div className="mb-6 p-1 bg-slate-900/80 rounded-lg flex text-xs">
            <button
              onClick={() => setApiTarget("local")}
              className={`flex-1 py-1.5 rounded-md font-semibold transition-all ${
                apiTarget === "local" ? "bg-indigo-600 text-white shadow-md" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Offline Sandbox
            </button>
            <button
              onClick={() => setApiTarget("backend")}
              className={`flex-1 py-1.5 rounded-md font-semibold transition-all ${
                apiTarget === "backend" ? "bg-indigo-600 text-white shadow-md" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Backend (8000)
            </button>
            <button
              onClick={() => setApiTarget("stub")}
              className={`flex-1 py-1.5 rounded-md font-semibold transition-all ${
                apiTarget === "stub" ? "bg-indigo-600 text-white shadow-md" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Specmatic Mock (9000)
            </button>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {isRegistering && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={authForm.name}
                    onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                    className="w-full glass-input px-4 py-2.5 rounded-lg text-sm"
                    placeholder="Alice Smith"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Organization (Tenant)</label>
                  <input
                    type="text"
                    required
                    value={authForm.tenantName}
                    onChange={(e) => setAuthForm({ ...authForm, tenantName: e.target.value })}
                    className="w-full glass-input px-4 py-2.5 rounded-lg text-sm"
                    placeholder="Acme Corporation"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Email Address</label>
              <input
                type="email"
                required
                value={authForm.email}
                onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                className="w-full glass-input px-4 py-2.5 rounded-lg text-sm"
                placeholder="alice@example.com"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Password</label>
              <input
                type="password"
                required
                value={authForm.password}
                onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                className="w-full glass-input px-4 py-2.5 rounded-lg text-sm"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              className="w-full mt-4 bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 text-white font-bold py-3 px-4 rounded-lg shadow-lg hover:shadow-indigo-500/20 transition-all duration-300 text-sm"
            >
              {isRegistering ? "Create Organization Account" : "Access Workspace"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsRegistering(!isRegistering)}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
            >
              {isRegistering
                ? "Already have an account? Sign In"
                : "Need a new tenant? Register organization"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard Layout
  return (
    <div className="min-h-screen flex bg-slate-950 font-sans text-slate-100 overflow-hidden">
      {/* Notifications */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-xl text-sm font-medium border transition-all duration-300 ${
          notification.type === "success" ? "bg-emerald-950/80 border-emerald-500/30 text-emerald-300" :
          notification.type === "error" ? "bg-rose-950/80 border-rose-500/30 text-rose-300" :
          "bg-indigo-950/80 border-indigo-500/30 text-indigo-300"
        }`}>
          {notification.message}
        </div>
      )}

      {/* Sidebar */}
      <aside className="w-72 bg-slate-900/60 border-r border-slate-800/80 flex flex-col justify-between z-10">
        <div>
          {/* Header */}
          <div className="p-6 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">🐝</span>
              <span className="text-xl font-extrabold bg-gradient-to-r from-amber-400 to-amber-200 bg-clip-text text-transparent">
                WorkHive
              </span>
            </div>
            <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded-full font-bold text-slate-400 uppercase">SaaS</span>
          </div>

          {/* Active Tenant / Organization */}
          <div className="p-4 mx-4 my-3 rounded-lg bg-indigo-950/30 border border-indigo-900/30">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Active Tenant</div>
            <div className="text-sm font-extrabold text-indigo-300">{tenant?.name || "Acme Corp"}</div>
          </div>

          {/* Workspace Switcher */}
          <div className="px-4 py-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase tracking-wider font-semibold text-slate-500">Workspaces</span>
              <button
                onClick={() => setShowWorkspaceModal(true)}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-bold p-1 rounded"
                title="Create Workspace"
              >
                + New
              </button>
            </div>
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {workspaces.map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => setCurrentWorkspace(ws)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                    currentWorkspace?.id === ws.id
                      ? "bg-indigo-600/90 text-white shadow-md"
                      : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                  }`}
                >
                  📁 {ws.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Footer settings */}
        <div className="p-4 border-t border-slate-800/80 space-y-4">
          {/* Target Toggle */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2">
              Specmatic API Target
            </label>
            <div className="p-1 bg-slate-950 rounded-lg flex text-[10px] font-semibold border border-slate-800/50">
              <button
                onClick={() => setApiTarget("local")}
                className={`flex-1 py-1 rounded transition-all ${
                  apiTarget === "local" ? "bg-slate-800 text-white" : "text-slate-500 hover:text-slate-300"
                }`}
              >
                Sandbox
              </button>
              <button
                onClick={() => setApiTarget("backend")}
                className={`flex-1 py-1 rounded transition-all ${
                  apiTarget === "backend" ? "bg-slate-800 text-white" : "text-slate-500 hover:text-slate-300"
                }`}
              >
                DRF
              </button>
              <button
                onClick={() => setApiTarget("stub")}
                className={`flex-1 py-1 rounded transition-all ${
                  apiTarget === "stub" ? "bg-slate-800 text-white" : "text-slate-500 hover:text-slate-300"
                }`}
              >
                Stub
              </button>
            </div>
          </div>

          {/* User Profile */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold truncate text-slate-300">{user?.name || "Alice Smith"}</span>
              <span className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold">
                {user?.role || "OWNER"}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="text-slate-500 hover:text-rose-400 transition-all p-1 text-xs font-bold"
            >
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Workspace Board */}
      <main className="flex-1 flex flex-col min-w-0 z-10">
        {/* Top bar */}
        <header className="h-16 border-b border-slate-800/80 flex items-center justify-between px-8 bg-slate-900/20">
          <div className="flex items-center space-x-3">
            <h1 className="text-lg font-bold text-slate-100">
              {currentWorkspace ? currentWorkspace.name : "Select or create a workspace"}
            </h1>
            {currentWorkspace?.description && (
              <span className="text-xs text-slate-500 border-l border-slate-800 pl-3">
                {currentWorkspace.description}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-3 text-xs">
            <span className="flex items-center space-x-1 bg-slate-900 px-2.5 py-1 rounded-full border border-slate-800">
              <span className={`w-2 h-2 rounded-full ${apiTarget === "local" ? "bg-amber-400" : "bg-emerald-400"}`} />
              <span className="font-semibold text-slate-400">
                {apiTarget === "local" ? "Local State" : apiTarget === "backend" ? "Django API" : "Specmatic Stub"}
              </span>
            </span>
          </div>
        </header>

        {/* Board Panel */}
        <div className="flex-1 overflow-x-auto p-8">
          {!currentWorkspace ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto">
              <span className="text-5xl mb-4">📂</span>
              <h3 className="text-lg font-bold">No Workspace Selected</h3>
              <p className="text-sm text-slate-500 mt-1">
                Create a new workspace using the sidebar menu, or switch database targets to refresh.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-6 h-full items-start min-w-[900px]">
              {/* Column Status Mapper */}
              {(["TODO", "IN_PROGRESS", "DONE"] as const).map((colStatus) => {
                const columnTasks = tasks.filter((t) => t.status === colStatus);
                const colTitle = colStatus === "TODO" ? "To Do" : colStatus === "IN_PROGRESS" ? "In Progress" : "Done";
                const colBg = colStatus === "TODO" ? "bg-slate-900/50" : colStatus === "IN_PROGRESS" ? "bg-slate-900/50" : "bg-slate-900/50";
                const headerColor = colStatus === "TODO" ? "border-amber-500/40" : colStatus === "IN_PROGRESS" ? "border-indigo-500/40" : "border-emerald-500/40";

                return (
                  <div key={colStatus} className={`flex flex-col max-h-full rounded-xl p-4 ${colBg} border border-slate-800/40`}>
                    {/* Header */}
                    <div className={`flex items-center justify-between pb-3 mb-4 border-b ${headerColor}`}>
                      <div className="flex items-center space-x-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${
                          colStatus === "TODO" ? "bg-amber-500" : colStatus === "IN_PROGRESS" ? "bg-indigo-500" : "bg-emerald-500"
                        }`} />
                        <span className="font-bold text-sm tracking-wide">{colTitle}</span>
                        <span className="bg-slate-800 text-[10px] text-slate-400 font-bold px-2 py-0.5 rounded-full">
                          {columnTasks.length}
                        </span>
                      </div>
                      <button
                        onClick={() => openCreateTaskModal(colStatus)}
                        className="text-xs text-slate-400 hover:text-slate-200 font-bold px-1.5 py-0.5 hover:bg-slate-800/65 rounded"
                      >
                        + Add
                      </button>
                    </div>

                    {/* Task cards stack */}
                    <div className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-[300px]">
                      {columnTasks.map((task) => (
                        <div
                          key={task.id}
                          className="glass-card hover:bg-slate-800/40 p-4 rounded-lg shadow-md group relative hover:translate-y-[-2px] transition-all duration-200 cursor-pointer"
                          onClick={() => openEditTaskModal(task)}
                        >
                          <div className="flex justify-between items-start mb-1.5">
                            <h4 className="font-semibold text-sm text-slate-200 group-hover:text-indigo-300 transition-colors">
                              {task.title}
                            </h4>
                            {/* Card Status Switch Actions */}
                            <div className="flex space-x-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              {colStatus !== "TODO" && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateTaskStatus(task, colStatus === "DONE" ? "IN_PROGRESS" : "TODO");
                                  }}
                                  className="text-[10px] bg-slate-800/80 hover:bg-slate-700 px-1 py-0.5 rounded text-slate-400 hover:text-slate-200 font-bold"
                                  title="Move Left"
                                >
                                  ←
                                </button>
                              )}
                              {colStatus !== "DONE" && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateTaskStatus(task, colStatus === "TODO" ? "IN_PROGRESS" : "DONE");
                                  }}
                                  className="text-[10px] bg-slate-800/80 hover:bg-slate-700 px-1 py-0.5 rounded text-slate-400 hover:text-slate-200 font-bold"
                                  title="Move Right"
                                >
                                  →
                                </button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteTask(task.id);
                                }}
                                className="text-[10px] bg-rose-950/40 hover:bg-rose-900 px-1 py-0.5 rounded text-rose-400 hover:text-rose-200 font-bold ml-1"
                                title="Delete"
                              >
                                ✕
                              </button>
                            </div>
                          </div>

                          {task.description && (
                            <p className="text-xs text-slate-400 line-clamp-2 mb-3 leading-relaxed">
                              {task.description}
                            </p>
                          )}

                          <div className="flex items-center justify-between text-[10px]">
                            {/* Priority Badge */}
                            <span className={`px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                              task.priority === "HIGH" ? "bg-rose-950/60 text-rose-400 border border-rose-900/30" :
                              task.priority === "MEDIUM" ? "bg-amber-950/60 text-amber-400 border border-amber-900/30" :
                              "bg-indigo-950/60 text-indigo-400 border border-indigo-900/30"
                            }`}>
                              {task.priority}
                            </span>
                            {/* Due Date */}
                            {task.dueDate && (
                              <span className="text-slate-500 font-semibold">
                                📅 {task.dueDate}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                      {columnTasks.length === 0 && (
                        <div className="border border-dashed border-slate-800/40 rounded-lg p-6 text-center text-xs text-slate-600">
                          Empty column
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* MODALS */}
      {/* Workspace Creation Modal */}
      {showWorkspaceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass p-6 rounded-xl w-full max-w-sm shadow-2xl relative">
            <h3 className="text-lg font-bold mb-4 bg-gradient-to-r from-amber-400 to-amber-200 bg-clip-text text-transparent">
              Create New Workspace
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Workspace Name</label>
                <input
                  type="text"
                  required
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  className="w-full glass-input px-3 py-2 rounded-lg text-sm"
                  placeholder="e.g. Design Team"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Description (Optional)</label>
                <textarea
                  value={newWorkspaceDesc}
                  onChange={(e) => setNewWorkspaceDesc(e.target.value)}
                  className="w-full glass-input px-3 py-2 rounded-lg text-sm h-20 resize-none"
                  placeholder="Describe workspace purposes..."
                />
              </div>
              <div className="flex space-x-3 pt-2">
                <button
                  onClick={() => setShowWorkspaceModal(false)}
                  className="flex-1 border border-slate-700 text-slate-400 hover:text-slate-200 py-2 rounded-lg text-xs font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={createWorkspace}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg text-xs font-bold transition-all shadow-md"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Task Creation & Edit Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass p-6 rounded-xl w-full max-w-md shadow-2xl relative">
            <h3 className="text-lg font-bold mb-4 bg-gradient-to-r from-amber-400 to-indigo-400 bg-clip-text text-transparent">
              {taskForm.id ? "Edit Task Details" : "Create New Task"}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Task Title</label>
                <input
                  type="text"
                  required
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  className="w-full glass-input px-3 py-2 rounded-lg text-sm"
                  placeholder="Task summary..."
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Description</label>
                <textarea
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  className="w-full glass-input px-3 py-2 rounded-lg text-sm h-24 resize-none"
                  placeholder="Detailed notes about the work..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Priority</label>
                  <select
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value as any })}
                    className="w-full bg-slate-900 border border-slate-700 px-3 py-2 rounded-lg text-sm text-slate-200"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Status</label>
                  <select
                    value={taskForm.status}
                    onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value as any })}
                    className="w-full bg-slate-900 border border-slate-700 px-3 py-2 rounded-lg text-sm text-slate-200"
                  >
                    <option value="TODO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="DONE">Done</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Due Date</label>
                <input
                  type="date"
                  value={taskForm.dueDate}
                  onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                  className="w-full glass-input px-3 py-2 rounded-lg text-sm"
                />
              </div>
              <div className="flex space-x-3 pt-2">
                <button
                  onClick={() => setShowTaskModal(false)}
                  className="flex-1 border border-slate-700 text-slate-400 hover:text-slate-200 py-2 rounded-lg text-xs font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={saveTask}
                  className="flex-1 bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-600 hover:to-indigo-750 text-white py-2 rounded-lg text-xs font-bold transition-all shadow-md"
                >
                  Save Task
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
