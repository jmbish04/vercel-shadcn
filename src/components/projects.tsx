import { useEffect, useState } from "react";

export interface Project {
  scriptId: string;
  title: string;
}

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);

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
    </div>
  );
}
