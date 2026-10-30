import { Router } from 'express';
import Doctor from '../models/Doctor.js';
import Patient from '../models/Patient.js';
import { asyncHandler } from '../utils/helpers.js';

const router = Router();

const dailySeries = (model, since) =>
  model.aggregate([
    { $match: { createdAt: { $gte: since } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
  ]);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const days = Math.min(90, Math.max(7, parseInt(req.query.days) || 30));
    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    since.setUTCDate(since.getUTCDate() - (days - 1));

    // All independent aggregations run in parallel; each is index-backed
    const [
      totalDoctors, totalPatients, newPatients, newDoctors,
      perDoctor, patientDaily, doctorDaily, conditions, specializations, recent,
    ] = await Promise.all([
      Doctor.estimatedDocumentCount(),
      Patient.estimatedDocumentCount(),
      Patient.countDocuments({ createdAt: { $gte: since } }),
      Doctor.countDocuments({ createdAt: { $gte: since } }),
      Patient.aggregate([
        { $group: { _id: '$doctor', patients: { $sum: 1 } } },
        { $sort: { patients: -1 } },
        { $limit: 8 },
        { $lookup: { from: 'doctors', localField: '_id', foreignField: '_id', as: 'doc' } },
        { $unwind: '$doc' },
        { $project: { _id: 0, name: '$doc.name', specialization: '$doc.specialization', patients: 1 } },
      ]),
      dailySeries(Patient, since),
      dailySeries(Doctor, since),
      Patient.aggregate([
        { $group: { _id: '$condition', value: { $sum: 1 } } },
        { $sort: { value: -1 } },
        { $limit: 6 },
        { $project: { _id: 0, name: '$_id', value: 1 } },
      ]),
      Doctor.aggregate([
        { $group: { _id: '$specialization', value: { $sum: 1 } } },
        { $sort: { value: -1 } },
        { $limit: 6 },
        { $project: { _id: 0, name: '$_id', value: 1 } },
      ]),
      Patient.find().sort({ createdAt: -1 }).limit(6).populate('doctor', 'name').lean(),
    ]);

    // Fill days with no data so the chart has a continuous axis
    const pMap = new Map(patientDaily.map((d) => [d._id, d.count]));
    const dMap = new Map(doctorDaily.map((d) => [d._id, d.count]));
    const timeline = Array.from({ length: days }, (_, i) => {
      const d = new Date(since);
      d.setUTCDate(since.getUTCDate() + i);
      const key = d.toISOString().slice(0, 10);
      return { date: key, patients: pMap.get(key) || 0, doctors: dMap.get(key) || 0 };
    });

    res.json({
      totals: {
        doctors: totalDoctors,
        patients: totalPatients,
        avgPatientsPerDoctor: totalDoctors ? +(totalPatients / totalDoctors).toFixed(1) : 0,
        newPatients,
        newDoctors,
        days,
      },
      perDoctor, timeline, conditions, specializations, recent,
    });
  })
);

export default router;
