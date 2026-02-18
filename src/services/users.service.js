import bcrypt from 'bcrypt';
import db from '../../utils/db.js';
import logger from '../../utils/logger.js';
const SALT_ROUNDS = 10;

// --- Validators ---
const isValidEmail = (email) => {
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
};

const isStrongPassword = (password) => {
  return (
    password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password)
  );
};

const normalizeEmail = (email) => email.trim().toLowerCase();

const createError = (message, code) => {
  const err = new Error(message);
  err.code = code;
  return err;
};

/** Creates a new user record with a hashed password */
export const registerUser = async (name, email, password) => {
  name = name?.trim();
  email = normalizeEmail(email);

  if (!name) throw createError('Name is required', 'VALIDATION_ERROR');
  if (!isValidEmail(email))
    throw createError('Invalid email format', 'VALIDATION_ERROR');
  if (!isStrongPassword(password)) {
    throw createError(
      'Password must be 8+ characters, include an uppercase letter and a number',
      'VALIDATION_ERROR'
    );
  }

  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  const query = `
    INSERT INTO users (name, email, password_hash)
    VALUES ($1, $2, $3)
    RETURNING id, name, email;
  `;

  try {
    const { rows } = await db.query(query, [name, email, hash]);
    logger.info({ userId: rows[0].id }, 'New user registered');
    return rows[0];
  } catch (err) {
    // 23505 = PostgreSQL unique_violation
    if (err.code === '23505') {
      throw createError('Email already registered', 'EMAIL_EXISTS');
    }
    logger.error({ err }, 'User registration failed');
    throw err;
  }
};

/** Validates credentials and returns user profile */
export const loginUser = async (email, password) => {
  email = normalizeEmail(email);

  const query = `SELECT id, name, email, password_hash FROM users WHERE email = $1;`;
  const { rows, rowCount } = await db.query(query, [email]);
  const user = rows[0];

  if (!rowCount) {
    logger.warn({ email }, 'Login attempt: user not found');
    throw createError('Invalid credentials', 'INVALID_CREDENTIALS');
  }

  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    logger.warn({ userId: user.id }, 'Login attempt: incorrect password');
    throw createError('Invalid credentials', 'INVALID_CREDENTIALS');
  }

  logger.info({ userId: user.id }, 'User logged in');
  return { id: user.id, name: user.name, email: user.email };
};

/** Partially updates user data; requires current password for password changes */
export const updateUser = async (id, updates) => {
  if (!id) throw createError('User ID required', 'VALIDATION_ERROR');

  const fields = [];
  const values = [];
  let index = 1; // Tracks SQL parameter position

  if (updates.name !== undefined) {
    updates.name = updates.name.trim();
    if (!updates.name)
      throw createError('Name cannot be empty', 'VALIDATION_ERROR');
    fields.push(`name = $${index++}`);
    values.push(updates.name);
  }

  if (updates.email !== undefined) {
    updates.email = normalizeEmail(updates.email);
    if (!isValidEmail(updates.email))
      throw createError('Invalid email format', 'VALIDATION_ERROR');
    fields.push(`email = $${index++}`);
    values.push(updates.email);
  }

  if (updates.newPassword !== undefined) {
    if (!isStrongPassword(updates.newPassword)) {
      throw createError('New password is too weak', 'VALIDATION_ERROR');
    }
    if (!updates.currentPassword) {
      throw createError(
        'Current password required to set new password',
        'VALIDATION_ERROR'
      );
    }

    const { rows, rowCount } = await db.query(
      'SELECT password_hash FROM users WHERE id = $1;',
      [id]
    );
    if (!rowCount) throw createError('User not found', 'NOT_FOUND');

    const isValid = await bcrypt.compare(
      updates.currentPassword,
      rows[0].password_hash
    );
    if (!isValid)
      throw createError('Current password is incorrect', 'INVALID_PASSWORD');

    const newHash = await bcrypt.hash(updates.newPassword, SALT_ROUNDS);
    fields.push(`password_hash = $${index++}`);
    values.push(newHash);
  }

  if (fields.length === 0)
    throw createError('No fields to update', 'VALIDATION_ERROR');

  const query = `
    UPDATE users
    SET ${fields.join(', ')}
    WHERE id = $${index}
    RETURNING id, name, email`;

  try {
    const { rows, rowCount } = await db.query(query, [...values, id]);
    if (!rowCount) throw createError('User not found', 'NOT_FOUND');
    logger.info({ userId: id }, 'User profile updated');
    return rows[0];
  } catch (err) {
    if (err.code === '23505')
      throw createError('Email already in use', 'EMAIL_EXISTS');
    logger.error({ userId: id, err }, 'User update failed');
    throw err;
  }
};

/** Deletes user record after password verification */
export const deleteUser = async (id, password) => {
  if (!id) throw createError('User ID required', 'VALIDATION_ERROR');
  if (!password)
    throw createError('Password required for deletion', 'VALIDATION_ERROR');

  const { rows, rowCount } = await db.query(
    'SELECT password_hash FROM users WHERE id = $1;',
    [id]
  );
  if (!rowCount) throw createError('User not found', 'NOT_FOUND');

  const isValid = await bcrypt.compare(password, rows[0].password_hash);
  if (!isValid) throw createError('Incorrect password', 'INVALID_PASSWORD');

  await db.query('DELETE FROM users WHERE id = $1;', [id]);
  logger.info({ userId: id }, 'User account deleted');
  return { message: 'User deleted successfully' };
};
