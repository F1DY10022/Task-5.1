import bcrypt from 'bcryptjs';
import Joi from 'joi';
import { Instructor } from '../models/Instructor.js';

// =============================================================================
//  INSTRUCTOR PORTAL CONTROLLER
// =============================================================================
//
// Two layers of defence against NoSQL injection:
//   1. express-mongo-sanitize (app.js) strips every `$`-prefixed / dotted key
//      from req.body / req.query, so operators like $ne, $gt, $regex and $where
//      never reach this code.
//   2. Joi (below) validates the SHAPE and TYPE of what is left: credentials and
//      search terms must be plain strings. Sanitizing removes operators; Joi
//      guarantees we only ever put strings into a filter.
// On top of that, passwords are bcrypt-hashed and secret fields are never
// selected or returned.
// =============================================================================

// Only these fields are safe to show to anyone.
const PUBLIC_FIELDS = 'name department role';

// What a successfully logged-in instructor gets back. No apiKey / private
// contact info: that response is stored in the browser's localStorage.
function publicProfile(doc) {
  return {
    id: doc._id.toString(),
    name: doc.name,
    username: doc.username,
    department: doc.department,
    role: doc.role
  };
}

// Used when the username does not exist, so the response time is the same as
// for a wrong password (no username enumeration through timing).
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', 10);

const loginSchema = Joi.object({
  username: Joi.string().trim().min(1).max(50).required(),
  password: Joi.string().min(1).max(128).required()
});

// POST /api/instructors/login
export async function loginInstructor(req, res, next) {
  try {
    const { value, error } = loginSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.message });

    // `value.username` is guaranteed to be a string, so this is an exact match.
    const instructor = await Instructor.findOne({ username: value.username }).select('+password');

    const ok = await bcrypt.compare(value.password, instructor ? instructor.password : DUMMY_HASH);
    if (!instructor || !ok) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    return res.json({ instructor: publicProfile(instructor) });
  } catch (err) {
    next(err);
  }
}

// GET /api/instructors
// Public directory: only safe fields.
export async function getDirectory(req, res, next) {
  try {
    const instructors = await Instructor.find()
      .select(PUBLIC_FIELDS)
      .sort({ name: 1 })
      .lean();
    res.json({ instructors });
  } catch (err) {
    next(err);
  }
}

// A search term must be a plain string. Anything else (e.g. the `{}` left
// behind after express-mongo-sanitize strips `role[$ne]=...`) can only come
// from a tampered request and is ignored rather than used as a filter.
const searchTerm = () => Joi.string().trim().max(100).empty(Joi.alternatives(Joi.object(), Joi.array(), ''));

// Allow-list of searchable fields. Unknown parameters are dropped.
const searchSchema = Joi.object({
  name: searchTerm(),
  department: searchTerm(),
  role: searchTerm()
}).options({ stripUnknown: true });

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// GET /api/instructors/search
export async function searchInstructors(req, res, next) {
  try {
    const { value, error } = searchSchema.validate(req.query);
    if (error) return res.status(400).json({ message: error.message });

    // Build the filter ourselves from validated strings only.
    const filter = {};
    if (value.name) filter.name = { $regex: escapeRegex(value.name), $options: 'i' };
    if (value.department) filter.department = value.department;
    if (value.role) filter.role = value.role;

    const instructors = await Instructor.find(filter)
      .select(PUBLIC_FIELDS)
      .sort({ name: 1 })
      .lean();
    res.json({ count: instructors.length, instructors });
  } catch (err) {
    next(err);
  }
}
