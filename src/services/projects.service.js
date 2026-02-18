import db from '../../utils/db.js';
import logger from '../../utils/logger.js';

const createError = (message, code) => {
  const err = new Error(message);
  err.code = code;
  return err;
};

/** Creates a new project owned by the specified user */
export const createProject = async (name, user_id) => {
  if (!name) throw createError('Project name is required', 'VALIDATION_ERROR');
  if (!user_id) throw createError('User ID required', 'VALIDATION_ERROR');

  const query = `
    INSERT INTO projects (name, user_id)
    VALUES ($1, $2)
    RETURNING *;
  `;

  try {
    const { rows } = await db.query(query, [name, user_id]);
    logger.info({ projectId: rows[0].id, user_id }, 'Project created');
    return rows[0];
  } catch (err) {
    logger.error({ err, user_id }, 'Failed to create project');
    throw err;
  }
};

/** Retrieves a project only if it belongs to the requesting user */
export const getProject = async (id, user_id) => {
  if (!id || !user_id)
    throw createError('Missing required IDs', 'VALIDATION_ERROR');

  const query = `
    SELECT id, name, user_id, description
    FROM projects
    WHERE id = $1 AND user_id = $2;
  `;

  const { rows, rowCount } = await db.query(query, [id, user_id]);
  if (!rowCount) throw createError('Project not found', 'NOT_FOUND');

  logger.info({ projectId: id }, 'Project retrieved');
  return rows[0];
};

/** Updates project fields dynamically based on provided updates object */
export const updateProject = async (id, user_id, updates) => {
  if (!id || !user_id)
    throw createError('Missing required IDs', 'VALIDATION_ERROR');

  const fields = [];
  const values = [];
  let index = 1; // Tracks SQL parameter position

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

    logger.info({ projectId: id }, 'Project updated');
    return rows[0];
  } catch (err) {
    // 23505 = unique_violation
    if (err.code === '23505') {
      throw createError(
        'Project name already exists for this user',
        'VALIDATION_ERROR'
      );
    }
    logger.error({ err, projectId: id }, 'Project update failed');
    throw err;
  }
};

/** Deletes a project record after verifying ownership */
export const deleteProject = async (id, user_id) => {
  if (!id || !user_id)
    throw createError('Missing required IDs', 'VALIDATION_ERROR');

  const query = 'DELETE FROM projects WHERE id = $1 AND user_id = $2;';

  try {
    const { rowCount } = await db.query(query, [id, user_id]);

    if (!rowCount) throw createError('Project not found', 'NOT_FOUND');

    logger.info({ projectId: id }, 'Project deleted');
    return { message: 'Project deleted successfully' };
  } catch (err) {
    logger.error({ err, projectId: id }, 'Project deletion failed');
    throw err;
  }
};
