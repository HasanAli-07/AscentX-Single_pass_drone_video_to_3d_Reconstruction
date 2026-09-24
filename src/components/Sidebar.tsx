import { Section } from "../types";
import { IconFolder, IconX } from "./Icons";

interface SidebarProps {
  activeSection: Section;
  setActiveSection: (s: Section) => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({ activeSection, setActiveSection, mobileOpen, onCloseMobile }: SidebarProps) {
  const sections: { id: Section; label: string; num: string }[] = [
    { id: "project",        label: "PROJECT",        num: "01" },
    { id: "input",          label: "INPUT DATA",     num: "02" },
    { id: "frames",         label: "FRAME SELECTION",num: "03" },
    { id: "reconstruction", label: "RECONSTRUCTION", num: "04" },
    { id: "analysis",       label: "MESH ANALYSIS",   num: "05" },
    { id: "georef",         label: "GEOREFERENCING", num: "06" },
    { id: "visualization", label: "VISUALIZATION",   num: "07" },
    { id: "measurements",  label: "MEASUREMENTS",   num: "08" },
    { id: "reports",        label: "REPORTS",        num: "09" },
    { id: "export",         label: "EXPORT",         num: "10" },
  ];

  const handleSelect = (id: Section) => {
    setActiveSection(id);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden"
        />
      )}

      <aside
        className={`w-56 border-r flex flex-col flex-shrink-0 transition-all duration-200 z-40 md:z-auto ${
          mobileOpen ? "fixed inset-y-0 left-0 shadow-2xl" : "hidden md:flex"
        }`}
        style={{ background: "var(--color-sidebar-bg)", borderColor: "var(--color-border)" }}
      >
        <div className="p-3 border-b flex items-center justify-between" style={{ borderColor: "var(--color-border-subtle)" }}>
          <span className="stat-label" style={{ color: "var(--color-text-dim)" }}>WORKFLOW PIPELINE</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleSelect("project")}
              className="px-2 py-0.5 rounded text-[9px] font-mono cursor-pointer transition-colors flex items-center gap-1"
              style={{ background: "var(--color-cyan-dim)", color: "var(--color-cyan)", border: "1px solid var(--color-cyan)" }}
            >
              <IconFolder size={11} />
              <span>HUB</span>
            </button>
            {mobileOpen && (
              <button
                onClick={onCloseMobile}
                className="p-1 rounded md:hidden text-slate-400 hover:text-slate-100"
              >
                <IconX size={14} />
              </button>
            )}
          </div>
        </div>
        <nav className="flex-1 py-2 overflow-y-auto">
          {sections.map((s) => {
            const isActive = activeSection === s.id;
            return (
              <button
                key={s.id}
                onClick={() => handleSelect(s.id)}
                className="w-full flex items-center justify-between px-3 py-2.5 transition-colors cursor-pointer"
                style={{
                  background: isActive ? "var(--color-cyan-dim)" : "transparent",
                  borderLeft: isActive ? "3px solid var(--color-cyan)" : "3px solid transparent",
                }}
              >
                <div className="flex items-center gap-2.5">
                  <span style={{ color: isActive ? "var(--color-cyan)" : "var(--color-text-dim)", fontFamily: "JetBrains Mono, monospace", fontSize: 9 }}>
                    {s.num}
                  </span>
                  <span
                    style={{
                      color: isActive ? "var(--color-text)" : "var(--color-text-muted)",
                      fontFamily: "JetBrains Mono, monospace",
                      fontSize: 11,
                      fontWeight: isActive ? 600 : 400,
                      letterSpacing: "0.04em",
                    }}
                  >
                    {s.label}
                  </span>
                </div>
                {isActive && <div className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--color-cyan)" }} />}
              </button>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
