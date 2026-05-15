const mongoose = require('mongoose');
const Appointment = require('../models/Appointment');
const billingSchema = require('../models/billingSchema');

// Helper for dynamic collection (Multi-tenancy)
const getBillingModel = (slug) => {
    const collectionName = `${slug}_billings`;
    return mongoose.models[collectionName] || mongoose.model(collectionName, billingSchema, collectionName);
};

exports.getComprehensiveReport1 = async (req, res) => {
    try {
        const { slug } = req.params;
        const { startDate, endDate } = req.query; // Format: YYYY-MM-DD

        const start = new Date(startDate || new Date());
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate || new Date());
        end.setHours(23, 59, 59, 999);

        const Bill = getBillingModel(slug);

        // --- 1. REVENUE & PAYMENT PENDING (From Billing Schema) ---
        const revenueStats = await Bill.aggregate([
            { $match: { clinicSlug: slug, createdAt: { $gte: start, $lte: end } } },
            { $group: {
                _id: null,
                totalRevenue: { $sum: "$grandTotal" },
                totalCollected: { $sum: "$paidAmount" },
                totalOutstanding: { $sum: "$dueAmount" }
            }}
        ]);

        // --- 2. DAILY PATIENTS (New vs Revisit from Appointment Schema) ---
        const patientStats = await Appointment.aggregate([
            { $match: { clinicSlug: slug, appointmentDate: { $gte: start, $lte: end } } },
            { $group: {
                _id: "$visitType",
                count: { $sum: 1 }
            }}
        ]);

        // --- 3. MONTHLY GROWTH (Revenue Trend) ---
        const growthStats = await Bill.aggregate([
            { $match: { clinicSlug: slug } },
            { $group: {
                _id: { month: { $month: "$createdAt" }, year: { $year: "$createdAt" } },
                revenue: { $sum: "$grandTotal" }
            }},
            { $sort: { "_id.year": 1, "_id.month": 1 } },
            { $limit: 12 }
        ]);

        // --- 4. POPULAR MEDICINES (Unwinding Billing Items) ---
        const popularMeds = await Bill.aggregate([
            { $match: { clinicSlug: slug } },
            { $unwind: "$items" },
            { $group: {
                _id: "$items.name",
                salesCount: { $sum: "$items.qty" }
            }},
            { $sort: { salesCount: -1 } },
            { $limit: 8 }
        ]);

        // --- 5. COMMON DISEASES (From Appointment Schema) ---
        const commonDiseases = await Appointment.aggregate([
            { $match: { clinicSlug: slug, disease: { $ne: null } } },
            { $group: {
                _id: "$disease",
                count: { $sum: 1 }
            }},
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]);

        // --- 6. FOLLOW-UP REPORT ---
        const followUps = await Appointment.find({
            clinicSlug: slug,
            followUpDate: { $gte: start, $lte: end }
        }).select('patientName mobile followUpDate');

        res.status(200).json({
            success: true,
            reports: {
                revenue: revenueStats[0] || { totalRevenue: 0, totalCollected: 0, totalOutstanding: 0 },
                patients: patientStats,
                growth: growthStats,
                medicines: popularMeds,
                diseases: commonDiseases,
                followUps: followUps
            }
        });

    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};



exports.getComprehensiveReport = async (req, res) => {
  try {
    const { slug } = req.params;

    // ── Frontend sends: quickRange ('7 days' | '30 days' | 'Year')
    const { quickRange = '30 days' } = req.query;

    // ── 1. Resolve date range from quickRange only ──────────────────
    const now   = new Date();
    const end   = new Date(); end.setHours(23, 59, 59, 999);
    const start = new Date(); start.setHours(0, 0, 0, 0);

    switch (quickRange) {
      case '7 days':
        start.setDate(now.getDate() - 6);
        break;
      case 'Year':
        start.setDate(now.getDate() - 364);
        break;
      case '30 days':
      default:
        start.setDate(now.getDate() - 29);
        break;
    }

    const Bill = getBillingModel(slug); // your existing helper

    // ── 2. Billing filter (date range) ──────────────────────────────
    const billMatch = {
      clinicSlug: slug,
      createdAt:  { $gte: start, $lte: end },
    };

    // ── 3. Appointment filter (date range) ──────────────────────────
    const apptMatch = {
      clinicSlug:      slug,
      appointmentDate: { $gte: start, $lte: end },
    };

    // ── 4. Run all aggregations in parallel ─────────────────────────

    // 4a. Revenue stats
    const revenueStatsPromise = Bill.aggregate([
      { $match: billMatch },
      {
        $group: {
          _id:              null,
          totalRevenue:     { $sum: '$grandTotal' },
          totalCollected:   { $sum: '$paidAmount' },
          totalOutstanding: { $sum: '$dueAmount' },
          totalBills:       { $sum: 1 },
        },
      },
    ]);

    // 4b. Patient split (New / Follow-up / Old)
    const patientStatsPromise = Appointment.aggregate([
      { $match: apptMatch },
      { $group: { _id: '$visitType', count: { $sum: 1 } } },
    ]);

    // 4c. Revenue growth bucketed by the chosen range
    //     — For 7 days  → group by day
    //     — For 30 days → group by day
    //     — For Year    → group by month
    const isYearly = quickRange === 'Year';

    const growthGroupId = isYearly
      ? { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } }
      : { day: { $dayOfMonth: '$createdAt' }, month: { $month: '$createdAt' }, year: { $year: '$createdAt' } };

    const growthStatsPromise = Bill.aggregate([
      { $match: billMatch },          // ← now respects the date range
      {
        $group: {
          _id:     growthGroupId,
          revenue: { $sum: '$grandTotal' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
    ]);

    // 4d. Popular medicines
    const popularMedsPromise = Bill.aggregate([
      { $match: billMatch },
      { $unwind: '$items' },
      { $group: { _id: '$items.name', salesCount: { $sum: '$items.qty' } } },
      { $sort: { salesCount: -1 } },
      { $limit: 8 },
    ]);

    // 4e. Common diseases
    const commonDiseasesPromise = Appointment.aggregate([
      { $match: { ...apptMatch, disease: { $ne: null } } },
      { $group: { _id: '$disease', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    // 4f. Upcoming follow-ups (next 30 days from now — no range filter)
    const followUpsPromise = Appointment.find({
      clinicSlug:   slug,
      followUpDate: {
        $gte: now,
        $lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      },
    })
      .select('patientName mobile followUpDate')
      .sort({ followUpDate: 1 })
      .limit(20);

    // ── 5. Await all ────────────────────────────────────────────────
    const [
      revenueStats,
      patientStats,
      growthStats,
      popularMeds,
      commonDiseases,
      followUps,
    ] = await Promise.all([
      revenueStatsPromise,
      patientStatsPromise,
      growthStatsPromise,
      popularMedsPromise,
      commonDiseasesPromise,
      followUpsPromise,
    ]);

    res.status(200).json({
      success: true,
      reports: {
        revenue:   revenueStats[0] || { totalRevenue: 0, totalCollected: 0, totalOutstanding: 0, totalBills: 0 },
        patients:  patientStats,
        growth:    growthStats,
        medicines: popularMeds,
        diseases:  commonDiseases,
        followUps,
      },
    });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};