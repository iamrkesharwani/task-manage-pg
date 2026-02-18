CREATE TABLE members (
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'Member' CHECK (role IN ('Owner', 'Admin', 'Member', 'Viewer')),
  PRIMARY KEY (project_id, user_id)
);
