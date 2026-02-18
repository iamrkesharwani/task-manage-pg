import db from '../../utils/db.js';
import logger from '../../utils/logger.js';

const createError = (message, code) => {
  const err = new Error(message);
  err.code = code;
  return err;
};

// --- Create ---
export const createProject = async (name, user_id) => {
  if (!name) throw createError('Project name is required', 'VALIDATION_ERROR');
  if (!user_id) throw createError('User ID required', 'VALIDATION_ERROR');
  const query = `
    INSERT INTO projects (name, user_id)
    VALUES ($1, $2)
    RETURNING *;
  `;
  const { rows } = await db.query(query, [name, user_id]);

  logger.info({ name, user_id }, 'Project created successfully');
  return rows[0];
};

// --- Read ---
export const getProject = async (id, user_id) => {
  if (!id) throw createError('Project ID required', 'VALIDATION_ERROR');
  if (!user_id) throw createError('User ID required', 'VALIDATION_ERROR');
  const userProjectQuery = `
    SELECT id, name, user_id
    FROM projects
    WHERE id = $1 AND user_id = $2;
  `;
  const { rows, rowCount } = await db.query(userProjectQuery, [id, user_id]);
  if (!rowCount) throw createError('Project not found', 'NOT_FOUND');

  logger.info({ projectId: id }, 'Project found');
  return rows[0];
};

// --- Update ---
export const updateProject = async (id, user_id, updates) => {
  if (!id) throw createError('Project ID required', 'VALIDATION_ERROR');
  if (!user_id) throw createError('User ID required', 'VALIDATION_ERROR');

  const fields = [];
  const values = [];
  let index = 1;

  if (updates.name !== undefined) {
    updates.name = updates.name.trim();
    if (!updates.name)
      throw createError('Project name cannot be empty', 'VALIDATION_ERROR');
    fields.push(`name = $${index++}`);
    values.push(updates.name);
  }

  if (updates.description !== undefined) {
    updates.description = updates.description.trim();
    fields.push(`description = $${index++}`);
    values.push(updates.description);
  }

  if (fields.length === 0)
    throw createError('No fields to update', 'VALIDATION_ERROR');

  const query = `
    UPDATE projects
    SET ${fields.join(', ')}
    WHERE id = $${index} AND user_id = $${index + 1}
    RETURNING *;
  `;

  try {
    const { rows, rowCount } = await db.query(query, [...values, id, user_id]);
    if (!rowCount) throw createError('Project not found', 'NOT_FOUND');
    logger.info({ projectId: id }, 'Project udpated');
    return rows[0];
  } catch (err) {
    if (err.code === '23505')
      throw createError(
        'Project name already exists for this user',
        'VALIDATION_ERROR'
      );
    throw err;
  }
};

// --- Delete ---
export const deleteProject = async (id, user_id) => {
  if (!id) throw createError('Project ID required', 'VALIDATION_ERROR');
  if (!user_id) throw createError('User ID required', 'VALIDATION_ERROR');

  const query = 'DELETE FROM projects WHERE id = $1 AND user_id = $2;';
  const { rowCount } = await db.query(query, [id]);
  if (!rowCount) throw createError('Project not found', 'NOT_FOUND');
  logger.info({ projectId: id }, 'Project deleted');
  return { message: 'Project deleted successfully' };
};