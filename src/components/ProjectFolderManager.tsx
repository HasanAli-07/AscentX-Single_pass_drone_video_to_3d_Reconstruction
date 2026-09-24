import React, { useState } from "react";
import { Project } from "../types";
import { Badge } from "./SharedPrimitives";
import { createProject, updateProjectDetails, deleteProject } from "../services/api";
import {
  IconFolder,
  IconSparkles,
  IconX,
  IconPlay,
  IconAlertTriangle,
} from "./Icons";

interface ProjectFolderManagerProps {
  projects: Project[];
  activeProject: Project | null;
  onSelectProject: (p: Project) => void;
  onRefreshProjects: () => void;
  onClose: () => void;
  onNavigate: (section: any) => void;
}

export function ProjectFolderManager({
  projects,
  activeProject,
  onSelectProject,
  onRefreshProjects,
  onClose,
  onNavigate,
}: ProjectFolderManagerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editCrs, setEditCrs] = useState("");
  const [showNewModal, setShowNewModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCrs, setNewCrs] = useState("WGS84 / UTM Zone 33N");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredProjects = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleOpenProject = (p: Project) => {
    onSelectProject(p);
    onNavigate("visualization");
    onClose();
  };

  const handleStartEdit = (p: Project) => {
    setEditingProject(p);
    setEditName(p.name);
    setEditDesc(p.description || "");
    setEditCrs(p.coordinate_system || "WGS84 / UTM Zone 33N");
  };

  const handleSaveEdit = async () => {
    if (!editingProject || !editName.trim()) return;
    await updateProjectDetails(editingProject.id, {
      name: editName.trim(),
      description: editDesc.trim(),
      coordinate_system: editCrs,
    });
    setEditingProject(null);
    onRefreshProjects();
  };

  const handleCreateNew = async () => {
    if (!newName.trim()) return;
    const created = await createProject(newName.trim(), newDesc.trim());
    if (newCrs && created.id) {
      await updateProjectDetails(created.id, { coordinate_system: newCrs });
    }
    setShowNewModal(false);
    setNewName("");
    setNewDesc("");
    onRefreshProjects();
    onSelectProject(created);
    onNavigate("input");
  };

  const handleDeleteConfirm = async (id: string) => {
    await deleteProject(id);
    setDeletingId(null);
    onRefreshProjects();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-4 font-mono text-xs text-slate-200">
      <div className="w-full max-w-4xl max-h-[90vh] border rounded-xl shadow-2xl flex flex-col overflow-hidden transition-colors" style={{ background: "var(--color-card-bg)", borderColor: "var(--color-border)" }}>
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 border-b flex items-center justify-between gap-3" style={{ background: "var(--color-header-bg)", borderColor: "var(--color-border)" }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--color-cyan-dim)", color: "var(--color-cyan)", border: "1px solid var(--color-cyan)" }}>
              <IconFolder size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold" style={{ color: "var(--color-text)" }}>PROJECT FOLDER STORAGE HUB</h2>
              <p className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                Manage 3D drone reconstruction projects saved in <code style={{ color: "var(--color-cyan)" }}>backend/storage/</code>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNewModal(true)}
              className="px-3 py-1.5 rounded text-xs font-semibold cursor-pointer flex items-center gap-1.5 transition-colors"
              style={{ background: "var(--color-cyan-dim)", color: "var(--color-cyan)", border: "1px solid var(--color-cyan)" }}
            >
              <IconSparkles size={13} />
              <span className="hidden sm:inline">NEW FOLDER</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded text-xs cursor-pointer border transition-colors"
              style={{ background: "var(--color-panel-bg)", color: "var(--color-text-muted)", borderColor: "var(--color-border)" }}
            >
              <IconX size={14} />
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="px-4 sm:px-6 py-3 border-b flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3" style={{ background: "var(--color-panel-bg)", borderColor: "var(--color-border)" }}>
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search projects by name, ID, description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-slate-200 pl-4 pr-4 py-1.5 rounded border outline-none text-xs"
              style={{ background: "var(--color-input-bg)", color: "var(--color-text)", borderColor: "var(--color-border)" }}
            />
          </div>
          <span className="text-[10px] shrink-0" style={{ color: "var(--color-text-muted)" }}>
            SHOWING <strong style={{ color: "var(--color-cyan)" }}>{filteredProjects.length}</strong> OF {projects.length} PROJECTS
          </span>
        </div>

        {/* Project Folder List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredProjects.map((p) => {
            const isActive = activeProject?.id === p.id;
            return (
              <div
                key={p.id}
                className="p-4 rounded-xl border transition-all flex flex-col justify-between"
                style={{
                  background: isActive ? "var(--color-cyan-dim)" : "var(--color-card-bg)",
                  borderColor: isActive ? "var(--color-cyan)" : "var(--color-border)",
                }}
              >
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm truncate max-w-[180px] sm:max-w-[200px]" style={{ color: "var(--color-text)" }}>{p.name}</span>
                        {isActive && <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "var(--color-cyan-dim)", color: "var(--color-cyan)", border: "1px solid var(--color-cyan)" }}>ACTIVE</span>}
                      </div>
                      <span className="text-[10px] font-mono" style={{ color: "var(--color-text-dim)" }}>ID: {p.id}</span>
                    </div>
                    <Badge label={p.status} variant={p.status === "COMPLETED" ? "ok" : "running"} />
                  </div>

                  {p.description && (
                    <p className="text-[11px] mb-3 line-clamp-2" style={{ color: "var(--color-text-muted)" }}>{p.description}</p>
                  )}

                  {/* Folder Specs Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2.5 rounded-lg border mb-3 text-[10px]" style={{ background: "var(--color-input-bg)", borderColor: "var(--color-border-subtle)" }}>
                    <div>
                      <span className="block" style={{ color: "var(--color-text-dim)" }}>STORAGE PATH</span>
                      <span className="font-semibold truncate block" style={{ color: "var(--color-cyan)" }}>storage/{p.id}/</span>
                    </div>
                    <div>
                      <span className="block" style={{ color: "var(--color-text-dim)" }}>CRS SYSTEM</span>
                      <span className="truncate block" style={{ color: "var(--color-text)" }}>{p.coordinate_system || "WGS84 / UTM 33N"}</span>
                    </div>
                    <div>
                      <span className="block" style={{ color: "var(--color-text-dim)" }}>3D MESH</span>
                      <span className="font-semibold block text-emerald-500">model.glb (2048x2048)</span>
                    </div>
                    <div>
                      <span className="block" style={{ color: "var(--color-text-dim)" }}>SOURCE VIDEO</span>
                      <span className="truncate block" style={{ color: "var(--color-text)" }}>{p.video_filename || "Drone UAV Scan"}</span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: "var(--color-border-subtle)" }}>
                  <span className="text-[9px]" style={{ color: "var(--color-text-dim)" }}>
                    Created {new Date(p.created_at).toLocaleDateString()}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleStartEdit(p)}
                      className="px-2.5 py-1 rounded border text-[10px] cursor-pointer transition-colors"
                      style={{ background: "var(--color-panel-bg)", color: "var(--color-text-muted)", borderColor: "var(--color-border)" }}
                    >
                      EDIT
                    </button>
                    <button
                      onClick={() => setDeletingId(p.id)}
                      className="px-2.5 py-1 rounded border text-[10px] cursor-pointer transition-colors"
                      style={{ background: "rgba(239, 68, 68, 0.15)", color: "var(--color-danger)", borderColor: "var(--color-danger)" }}
                    >
                      DELETE
                    </button>
                    <button
                      onClick={() => handleOpenProject(p)}
                      className="px-3 py-1 rounded text-[10px] font-bold cursor-pointer flex items-center gap-1 transition-colors"
                      style={{ background: "var(--color-cyan-dim)", color: "var(--color-cyan)", border: "1px solid var(--color-cyan)" }}
                    >
                      <IconPlay size={11} />
                      <span>OPEN 3D</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit Project Modal */}
      {editingProject && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md border rounded-xl p-5 shadow-2xl flex flex-col gap-4" style={{ background: "var(--color-card-bg)", borderColor: "var(--color-border)" }}>
            <div className="flex justify-between items-center border-b pb-2" style={{ borderColor: "var(--color-border)" }}>
              <span className="font-bold text-sm" style={{ color: "var(--color-text)" }}>EDIT PROJECT: {editingProject.id}</span>
              <button onClick={() => setEditingProject(null)} className="cursor-pointer" style={{ color: "var(--color-text-muted)" }}><IconX size={16} /></button>
            </div>

            <div className="flex flex-col gap-3 text-xs">
              <div>
                <label className="text-[10px] mb-1 block" style={{ color: "var(--color-text-muted)" }}>Project Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full p-2 rounded border outline-none"
                  style={{ background: "var(--color-input-bg)", color: "var(--color-text)", borderColor: "var(--color-border)" }}
                />
              </div>

              <div>
                <label className="text-[10px] mb-1 block" style={{ color: "var(--color-text-muted)" }}>Description</label>
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  rows={3}
                  className="w-full p-2 rounded border outline-none resize-none"
                  style={{ background: "var(--color-input-bg)", color: "var(--color-text)", borderColor: "var(--color-border)" }}
                />
              </div>

              <div>
                <label className="text-[10px] mb-1 block" style={{ color: "var(--color-text-muted)" }}>Coordinate Reference System (CRS)</label>
                <select
                  value={editCrs}
                  onChange={(e) => setEditCrs(e.target.value)}
                  className="w-full p-2 rounded border outline-none"
                  style={{ background: "var(--color-input-bg)", color: "var(--color-cyan)", borderColor: "var(--color-border)" }}
                >
                  <option value="WGS84 / UTM Zone 33N">WGS84 / UTM Zone 33N (EPSG:32633)</option>
                  <option value="WGS84 / UTM Zone 32N">WGS84 / UTM Zone 32N (EPSG:32632)</option>
                  <option value="WGS84 Geographic">WGS84 Geographic (EPSG:4326)</option>
                  <option value="Web Mercator">Web Mercator (EPSG:3857)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t" style={{ borderColor: "var(--color-border)" }}>
              <button
                onClick={() => setEditingProject(null)}
                className="px-3 py-1.5 rounded text-xs cursor-pointer"
                style={{ background: "var(--color-panel-bg)", color: "var(--color-text-muted)" }}
              >
                CANCEL
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-1.5 rounded text-xs font-bold cursor-pointer"
                style={{ background: "rgba(34, 197, 94, 0.15)", color: "var(--color-success)", border: "1px solid var(--color-success)" }}
              >
                SAVE CHANGES
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Project Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md border rounded-xl p-5 shadow-2xl flex flex-col gap-4" style={{ background: "var(--color-card-bg)", borderColor: "var(--color-border)" }}>
            <div className="flex justify-between items-center border-b pb-2" style={{ borderColor: "var(--color-border)" }}>
              <span className="font-bold text-sm" style={{ color: "var(--color-text)" }}>CREATE NEW PROJECT FOLDER</span>
              <button onClick={() => setShowNewModal(false)} className="cursor-pointer" style={{ color: "var(--color-text-muted)" }}><IconX size={16} /></button>
            </div>

            <div className="flex flex-col gap-3 text-xs">
              <div>
                <label className="text-[10px] mb-1 block" style={{ color: "var(--color-text-muted)" }}>Project Name *</label>
                <input
                  type="text"
                  placeholder="e.g., Zurich_MAV_Scan_Session_02"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full p-2 rounded border outline-none"
                  style={{ background: "var(--color-input-bg)", color: "var(--color-text)", borderColor: "var(--color-border)" }}
                  autoFocus
                />
              </div>

              <div>
                <label className="text-[10px] mb-1 block" style={{ color: "var(--color-text-muted)" }}>Description</label>
                <textarea
                  placeholder="Optional site notes, location info..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  rows={3}
                  className="w-full p-2 rounded border outline-none resize-none"
                  style={{ background: "var(--color-input-bg)", color: "var(--color-text)", borderColor: "var(--color-border)" }}
                />
              </div>

              <div>
                <label className="text-[10px] mb-1 block" style={{ color: "var(--color-text-muted)" }}>Target Coordinate System (CRS)</label>
                <select
                  value={newCrs}
                  onChange={(e) => setNewCrs(e.target.value)}
                  className="w-full p-2 rounded border outline-none"
                  style={{ background: "var(--color-input-bg)", color: "var(--color-cyan)", borderColor: "var(--color-border)" }}
                >
                  <option value="WGS84 / UTM Zone 33N">WGS84 / UTM Zone 33N (EPSG:32633)</option>
                  <option value="WGS84 / UTM Zone 32N">WGS84 / UTM Zone 32N (EPSG:32632)</option>
                  <option value="WGS84 Geographic">WGS84 Geographic (EPSG:4326)</option>
                  <option value="Web Mercator">Web Mercator (EPSG:3857)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t" style={{ borderColor: "var(--color-border)" }}>
              <button
                onClick={() => setShowNewModal(false)}
                className="px-3 py-1.5 rounded text-xs cursor-pointer"
                style={{ background: "var(--color-panel-bg)", color: "var(--color-text-muted)" }}
              >
                CANCEL
              </button>
              <button
                onClick={handleCreateNew}
                className="px-4 py-1.5 rounded text-xs font-bold cursor-pointer"
                style={{ background: "var(--color-cyan-dim)", color: "var(--color-cyan)", border: "1px solid var(--color-cyan)" }}
              >
                CREATE PROJECT FOLDER
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-sm border rounded-xl p-5 shadow-2xl flex flex-col gap-4 text-center" style={{ background: "var(--color-card-bg)", borderColor: "var(--color-danger)" }}>
            <div className="flex justify-center text-rose-500">
              <IconAlertTriangle size={32} />
            </div>
            <h3 className="text-sm font-bold" style={{ color: "var(--color-text)" }}>CONFIRM PROJECT DELETION</h3>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              Are you sure you want to delete project folder <strong style={{ color: "var(--color-danger)" }}>{deletingId}</strong> and all its 3D mesh files from disk?
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={() => setDeletingId(null)}
                className="px-4 py-1.5 rounded text-xs cursor-pointer"
                style={{ background: "var(--color-panel-bg)", color: "var(--color-text-muted)" }}
              >
                CANCEL
              </button>
              <button
                onClick={() => handleDeleteConfirm(deletingId)}
                className="px-4 py-1.5 rounded text-xs font-bold cursor-pointer"
                style={{ background: "rgba(239, 68, 68, 0.15)", color: "var(--color-danger)", border: "1px solid var(--color-danger)" }}
              >
                DELETE FOREVER
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
