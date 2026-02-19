import db from '../../utils/db.js';
import logger from '../../utils/logger.js';

const createError = (message, code) => {
  const error = new Error(message);
  error.code = code;
  return error;
};

export const createTask = async (project_id, user_id, title) => {
  if (!project_id)
    throw createError('Project ID is required', 'VALIDATION_ERROR');
  if (!user_id)
    throw createError('User ID is required here', 'VALIDATION_ERROR');
  if (!title)
    throw createError('Title is required to create task', 'VALIDATION_ERROR');

  const ownershipCheck = await db.query(
    'SELECT id FROM projects WHERE id = $1 AND user_id = $2;',
    [project_id, user_id]
  );

  if (!ownershipCheck.rowCount)
    throw createError('Project not found', 'NOT_FOUND');

  const query = `
    INSERT INTO tasks (project_id, title)
    VALUES ($1, $2)
    RETURNING *;
  `;

  const { rows } = await db.query(query, [project_id, title.trim()]);

  logger.info({ taskId: rows[0].id }, 'Task added successfully');
  return rows[0];
};

export const fetchSingleTask = async (task_id, user_id) => {
  if (!task_id) throw createError('Task ID required', 'VALIDATION_ERROR');
  if (!user_id) throw createError('User ID required', 'VALIDATION_ERROR');
  const query = `
    SELECT t.*
    FROM tasks t
    JOIN projects p ON p.id = t.project_id
    WHERE t.id = $1 AND p.user_id = $2;
  `;
  const { rows, rowCount } = await db.query(query, [task_id, user_id]);
  if (!rowCount) throw createError('Task not found', 'NOT_FOUND');
  logger.info({ taskId: task_id, title: rows[0].title });
  return rows[0];
};

export const getTasksByProject = async (project_id, user_id) => {
  if (!project_id) throw createError('Project ID required', 'VALIDATION_ERROR');
  if (!user_id) throw createError('User ID required', 'VALIDATION_ERROR');
  const query = `
    SELECT t.*
    FROM tasks t
    JOIN projects p ON p.id = t.project_id
    WHERE t.project_id = $1 AND p.user_id = $2
    ORDER BY t.created_at DESC;
  `;
  const { rows, rowCount } = await db.query(query, [project_id, user_id]);
  if (!rowCount) throw createError('No task found', 'NOT_FOUND');
  return rows;
};

export const getTasksByAssignee = async (assigned_to, user_id) => {
  if (!assigned_to)
    throw createError('Assigned user ID required', 'VALIDATION_ERROR');
  if (!user_id) throw createError('User ID required', 'VALIDATION_ERROR');

  const query = `
    SELECT t.*
    FROM tasks t
    JOIN projects p ON p.id = t.project_id
    WHERE t.assigned_to = $1 AND p.user_id = $2
    ORDER BY t.created_at DESC;
  `;
  const { rows, rowCount } = await db.query(query, [assigned_to, user_id]);
  if (!rowCount) throw createError('No task found', 'NOT_FOUND');
  return rows;
};

export const updateStatus = async () => {
  
}

export const updatePriority = async () => {
  
}

export const updateAssignedTo = async () => {
  
}