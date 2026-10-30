import {
  Router
} from 'express';
import Doctor from '../models/Doctor.js';
import Patient from '../models/Patient.js';
import {
  validate
} from '../middleware/index.js';
import {
  doctorSchema,
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
      specialization,
      hospital,
      from,
      to,
      sort = 'newest'
    } = req.query;
    const filter = {};
    if (search?.trim()) {
      const rx = new RegExp(escapeRegex(search.trim()), 'i');
      filter.$or = [{
        name: rx
      }, {
        specialization: rx
      }, {
        hospital: rx
      }, {
        email: rx
      }];
    }
    if (specialization) filter.specialization = specialization;
    if (hospital) filter.hospital = hospital;
    applyDateRange(filter, from, to);

    const p = pageParams(req.query, 9);
    const [items, total] = await Promise.all([
      Doctor.find(filter).sort(SORTS[sort] || SORTS.newest).skip(p.skip).limit(p.limit).lean(),
      Doctor.countDocuments(filter),
    ]);

    // One grouped query for the whole page instead of N count queries
    const counts = await Patient.aggregate([{
        $match: {
          doctor: {
            $in: items.map((d) => d._id)
          }
        }
      },
      {
        $group: {
          _id: '$doctor',
          count: {
            $sum: 1
          }
        }
      },
    ]);
    const map = new Map(counts.map((c) => [String(c._id), c.count]));
    res.json(paginated(items.map((d) => ({
      ...d,
      patientCount: map.get(String(d._id)) || 0
    })), total, p));
  })
);

router.get(
  '/meta',
  asyncHandler(async (_req, res) => {
    const [specializations, hospitals] = await Promise.all([
      Doctor.distinct('specialization'),
      Doctor.distinct('hospital'),
    ]);
    res.json({
      specializations: specializations.sort(),
      hospitals: hospitals.sort()
    });
  })
);

router.get(
  '/options',
  asyncHandler(async (_req, res) => {
    res.json(await Doctor.find().select('name specialization').sort({
      name: 1
    }).lean());
  })
);

router.post(
  '/',
  validate(doctorSchema),
  asyncHandler(async (req, res) => res.status(201).json(await Doctor.create(req.body)))
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const doctor = await Doctor.findById(req.params.id).lean();
    if (!doctor) throw new ApiError(404, 'Doctor not found');
    doctor.patientCount = await Patient.countDocuments({
      doctor: doctor._id
    });
    res.json(doctor);
  })
);

router.put(
  '/:id',
  validate(doctorSchema),
  asyncHandler(async (req, res) => {
    const doctor = await Doctor.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!doctor) throw new ApiError(404, 'Doctor not found');
    res.json(doctor);
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const doctor = await Doctor.findByIdAndDelete(req.params.id);
    if (!doctor) throw new ApiError(404, 'Doctor not found');
    await Patient.deleteMany({
      doctor: doctor._id
    });
    res.json({
      message: 'Doctor and their patients were deleted'
    });
  })
);

// ----- Patients of a doctor -----
router.get(
  '/:id/patients',
  asyncHandler(async (req, res) => {
    const filter = {
      doctor: req.params.id
    };
    if (req.query.search?.trim()) filter.name = new RegExp(escapeRegex(req.query.search.trim()), 'i');
    const p = pageParams(req.query, 10);
    const [items, total] = await Promise.all([
      Patient.find(filter).sort({
        createdAt: -1
      }).skip(p.skip).limit(p.limit).lean(),
      Patient.countDocuments(filter),
    ]);
    res.json(paginated(items, total, p));
  })
);

router.post(
  '/:id/patients',
  validate(patientSchema),
  asyncHandler(async (req, res) => {
    if (!(await Doctor.exists({
        _id: req.params.id
      }))) throw new ApiError(404, 'Doctor not found');
    const patient = await Patient.create({
      ...req.body,
      doctor: req.params.id
    });
    res.status(201).json(patient);
  })
);

router.delete(
  '/:id/patients/:patientId',
  asyncHandler(async (req, res) => {
    const removed = await Patient.findOneAndDelete({
      _id: req.params.patientId,
      doctor: req.params.id
    });
    if (!removed) throw new ApiError(404, 'Patient not found for this doctor');
    res.json({
      message: 'Patient removed'
    });
  })
);

export default router;