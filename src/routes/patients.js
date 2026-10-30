import {
  Router
} from 'express';
import Doctor from '../models/Doctor.js';
import Patient from '../models/Patient.js';
import {
  validate
} from '../middleware/index.js';
import {
  patientSchema
} from '../validators/index.js';
import {
  ApiError,
  asyncHandler,
  escapeRegex,
  applyDateRange,
  pageParams,
  paginated,
} from '../utils/helpers.js';

const router = Router();
const SORTS = {
  newest: {
    createdAt: -1
  },
  oldest: {
    createdAt: 1
  },
  name: {
    name: 1
  }
};

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const {
      search,
      condition,
      doctor,
      gender,
      from,
      to,
      sort = 'newest'
    } = req.query;
    const filter = {};
    if (search?.trim()) filter.name = new RegExp(escapeRegex(search.trim()), 'i');
    if (condition) filter.condition = condition;
    if (doctor) filter.doctor = doctor;
    if (gender) filter.gender = gender;
    applyDateRange(filter, from, to);

    const p = pageParams(req.query, 10);
    const [items, total] = await Promise.all([
      Patient.find(filter)
      .sort(SORTS[sort] || SORTS.newest)
      .skip(p.skip)
      .limit(p.limit)
      .populate('doctor', 'name specialization')
      .lean(),
      Patient.countDocuments(filter),
    ]);
    res.json(paginated(items, total, p));
  })
);

router.get(
  '/conditions',
  asyncHandler(async (_req, res) => res.json((await Patient.distinct('condition')).sort()))
);

router.put(
  '/:id',
  validate(patientSchema),
  asyncHandler(async (req, res) => {
    if (req.body.doctor && !(await Doctor.exists({
        _id: req.body.doctor
      }))) {
      throw new ApiError(404, 'Selected doctor does not exist');
    }
    const patient = await Patient.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
      })
      .populate('doctor', 'name specialization');
    if (!patient) throw new ApiError(404, 'Patient not found');
    res.json(patient);
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const patient = await Patient.findByIdAndDelete(req.params.id);
    if (!patient) throw new ApiError(404, 'Patient not found');
    res.json({
      message: 'Patient deleted'
    });
  })
);

export default router;