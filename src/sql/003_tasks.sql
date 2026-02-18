CREATE TABLE tasks (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title VARCHAR(250) NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'Todo'
    CHECK (status IN ('Backlog', 'Todo', 'In Progress', 'Done', 'Archived')),
  priority TEXT DEFAULT 'Medium'
    CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent')),
  assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
