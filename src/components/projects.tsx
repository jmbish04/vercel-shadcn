import { useEffect, useState } from "react";

<<<<<<< codex/refactor-for-robustness-and-api-compliance
export interface Project {
  scriptId: string;
  title: string;
=======
interface Project {
  id: string;
  title?: string;
>>>>>>> main
}

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
<<<<<<< codex/refactor-for-robustness-and-api-compliance

  useEffect(() => {
    fetch('/api/projects')
      .then((res) => res.json())
      .then((data) => {
        setProjects(Array.isArray(data.projects) ? data.projects : []);
      })
      .catch((err) => {
        console.error(err);
        setProjects([]);
      });
  }, []);

  return (
    <div className="space-y-2">
      {projects.map((p) => (
        <div key={p.scriptId}>{p.title}</div>
      ))}
=======
  const [files, setFiles] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((data) => setProjects(data))
      .catch(() => setProjects([]));
  }, []);

  const openProject = (id: string) => {
    setSelected(id);
    fetch(`/api/project/files?id=${id}`)
      .then((r) => r.json())
      .then((d) => setFiles(d.files || []))
      .catch(() => setFiles([]));
  };

  return (
    <div className="space-y-2">
      <h2 className="font-bold">Apps Script Projects</h2>
      <ul className="space-y-1">
        {projects.map((p) => (
          <li key={p.id}>
            <button
              className="underline"
              onClick={() => openProject(p.id)}
            >
              {p.title || p.id}
            </button>
          </li>
        ))}
      </ul>
      {selected && (
        <div className="mt-4">
          <h3 className="font-semibold">Files</h3>
          <ul className="space-y-1">
            {files.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>
      )}
>>>>>>> main
    </div>
  );
}
