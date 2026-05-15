// controllers/dashboardController.js
const Patient     = require('../models/PatientSchema');
const Appointment = require('../models/Appointment');
const moment      = require('moment-timezone');

const TIMEZONE = 'Asia/Kolkata'; // IST — change if your clinic is elsewhere

// ─────────────────────────────────────────────────────────────────────────────
// Helper: % change between two numbers
// ─────────────────────────────────────────────────────────────────────────────
const pctChange = (current, previous) => {
    if (!previous || previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/advices/dashboard/:clinicSlug
// ─────────────────────────────────────────────────────────────────────────────
exports.getClinicDashboard = async (req, res) => {
    try {
        const { clinicSlug } = req.params;

        // ── Time windows (IST-aware) ──────────────────────────────────────────
        // Using moment-timezone to avoid UTC vs IST day-boundary mismatches.
        // If you only have plain `moment`, replace moment.tz(...) with
        // moment().startOf('day') etc., but make sure your server TZ is IST.
        const nowIST = moment.tz(TIMEZONE);

        const todayStart     = nowIST.clone().startOf('day').toDate();
        const todayEnd       = nowIST.clone().endOf('day').toDate();
        const yesterdayStart = nowIST.clone().subtract(1, 'day').startOf('day').toDate();
        const yesterdayEnd   = nowIST.clone().subtract(1, 'day').endOf('day').toDate();

        // ── 1. Parallel core queries ──────────────────────────────────────────
        const [
            totalPatients,
            newPatientsToday,
            newPatientsYesterday,
            todayAppointments,
            yesterdayApptCount,
            todayRevenueData,
            yesterdayRevenueData,
            pendingPaymentsData,
            recentPatients,
        ] = await Promise.all([

            // Total patients for this clinic
            Patient.countDocuments({ clinicSlug }),

            // New patients registered today
            Patient.countDocuments({
                clinicSlug,
                createdAt: { $gte: todayStart, $lte: todayEnd },
            }),

            // New patients registered yesterday
            Patient.countDocuments({
                clinicSlug,
                createdAt: { $gte: yesterdayStart, $lte: yesterdayEnd },
            }),

            // Today's appointments — full docs for sidebar list
            Appointment.find({
                clinicSlug,
                appointmentDate: { $gte: todayStart, $lte: todayEnd },
            })
                .sort({ appointmentDate: 1 })
                .select('patientName tokenNumber billing appointmentDate visitType fees status slotTime updatedAt createdAt')
                .lean(),

            // Yesterday's appointment count
            Appointment.countDocuments({
                clinicSlug,
                appointmentDate: { $gte: yesterdayStart, $lte: yesterdayEnd },
            }),

            // Today's revenue — FIX: use $ifNull to guard missing billing subdoc
            Appointment.aggregate([
                {
                    $match: {
                        clinicSlug,
                        'billing.paymentStatus': 'Paid',
                        appointmentDate: { $gte: todayStart, $lte: todayEnd },
                    },
                },
                {
                    $group: {
                        _id: null,
                        total: {
                            $sum: {
                                $cond: [
                                    { $gt: [{ $ifNull: ['$billing.totalFees', 0] }, 0] },
                                    { $ifNull: ['$billing.totalFees', 0] },
                                    { $ifNull: ['$fees', 0] }
                                ]
                            }
                        },
                    },
                },
            ]),

            // Yesterday's revenue
            Appointment.aggregate([
                {
                    $match: {
                        clinicSlug,
                        'billing.paymentStatus': 'Paid',
                        appointmentDate: { $gte: yesterdayStart, $lte: yesterdayEnd },
                    },
                },
                {
                    $group: {
                        _id: null,
                        total: {
                            $sum: {
                                $cond: [
                                    { $gt: [{ $ifNull: ['$billing.totalFees', 0] }, 0] },
                                    { $ifNull: ['$billing.totalFees', 0] },
                                    { $ifNull: ['$fees', 0] }
                                ]
                            }
                        },
                    },
                },
            ]),

            // Pending (unpaid/partial) payments — FIX: $ifNull guards + $max(0) prevents negatives
            Appointment.aggregate([
                {
                    $match: {
                        clinicSlug,
                        'billing.paymentStatus': { $in: ['Unpaid', 'Partial'] },
                    },
                },
                {
                    $group: {
                        _id: null,
                        total: {
                            $sum: {
                                $max: [
                                    0,
                                    {
                                        $subtract: [
                                            {
                                                $cond: [
                                                    { $gt: [{ $ifNull: ['$billing.totalFees', 0] }, 0] },
                                                    { $ifNull: ['$billing.totalFees', 0] },
                                                    { $ifNull: ['$fees', 0] }
                                                ]
                                            },
                                            { $ifNull: ['$billing.paidAmount', 0] }
                                        ]
                                    }
                                ]
                            }
                        },
                    },
                },
            ]),

            // 5 most recent patients
            Patient.find({ clinicSlug })
                .sort({ createdAt: -1 })
                .limit(5)
                .select('name age gender mobile createdAt')
                .lean(),
        ]);

        // ── 2. Chart: last 7 days ─────────────────────────────────────────────
        const last7Days = Array.from({ length: 7 }, (_, i) => {
            const base = moment.tz(TIMEZONE).subtract(6 - i, 'days');
            return {
                label: base.format('D MMM'),
                start: base.clone().startOf('day').toDate(),
                end:   base.clone().endOf('day').toDate(),
            };
        });

        const chartData = await Promise.all(
            last7Days.map(async ({ label, start, end }) => {
                const [newPts, followUp] = await Promise.all([
                    // New patients registered that day
                    Patient.countDocuments({
                        clinicSlug,
                        createdAt: { $gte: start, $lte: end },
                    }),
                    // Follow-up appointments that day
                    Appointment.countDocuments({
                        clinicSlug,
                        visitType: { $in: ['Revisit Patient', 'REVISIT'] },
                        appointmentDate: { $gte: start, $lte: end },
                    }),
                ]);
                return { date: label, newPatients: newPts, followUp };
            })
        );

        // ── 3. Recent activity ────────────────────────────────────────────────
        // FIX: include updatedAt and createdAt in select so moment() has real timestamps
        const [recentAppts, recentNewPatients] = await Promise.all([
            Appointment.find({ clinicSlug })
                .sort({ updatedAt: -1 })
                .limit(5)
                .select('patientName billing.paymentStatus visitType updatedAt createdAt')
                .lean(),
            Patient.find({ clinicSlug })
                .sort({ createdAt: -1 })
                .limit(5)
                .select('name createdAt')
                .lean(),
        ]);

        const activityEvents = [
            ...recentAppts.map(a => {
                const ts = a.updatedAt || a.createdAt;
                return {
                    id:   a._id.toString(),
                    type: a.billing?.paymentStatus === 'Paid' ? 'payment' : 'appointment',
                    text: a.billing?.paymentStatus === 'Paid'
                        ? `Payment received from ${a.patientName}`
                        : `Appointment scheduled with ${a.patientName}`,
                    time: ts ? moment.tz(ts, TIMEZONE).format('hh:mm A') : '—',
                    ts,
                };
            }),
            ...recentNewPatients.map(p => ({
                id:   p._id.toString() + '_reg',
                type: 'patient',
                text: `New patient registered: ${p.name}`,
                time: p.createdAt ? moment.tz(p.createdAt, TIMEZONE).format('hh:mm A') : '—',
                ts:   p.createdAt,
            })),
        ]
            .filter(e => e.ts)                                          // drop any without timestamps
            .sort((a, b) => new Date(b.ts) - new Date(a.ts))
            .slice(0, 6)
            .map(({ ts, ...rest }) => rest);

        // ── 4. Format today's appointments for sidebar ────────────────────────
        const formattedAppointments = todayAppointments.map(apt => ({
            _id:           apt._id,
            tokenNumber:   apt.tokenNumber,
            patientName:   apt.patientName,
            time:          apt.slotTime
                           || (apt.appointmentDate
                               ? moment.tz(apt.appointmentDate, TIMEZONE).format('hh:mm A')
                               : '—'),
            type:          ['Revisit Patient', 'REVISIT'].includes(apt.visitType)
                           ? 'Follow-up' : 'Consultation',
            paymentStatus: apt.billing?.paymentStatus || 'Unpaid',
            status:        apt.status || 'Waiting',
        }));

        // ── 5. Assemble stats ─────────────────────────────────────────────────
        const todayRevenue     = todayRevenueData[0]?.total     || 0;
        const yesterdayRevenue = yesterdayRevenueData[0]?.total || 0;

        // Yesterday total patients = totalPatients minus all created today
        // (approximation for delta — avoids an extra query)
        const totalPatientsYesterday = Math.max(0, totalPatients - newPatientsToday);

        res.status(200).json({
            success: true,
            stats: {
                totalPatients,
                newPatientsToday,
                appointmentsCount: todayAppointments.length,
                todayRevenue,
                pendingPayments: Math.max(pendingPaymentsData[0]?.total || 0, 0),

                totalPatientsDelta: pctChange(totalPatients,            totalPatientsYesterday),
                newPatientsDelta:   pctChange(newPatientsToday,          newPatientsYesterday),
                appointmentsDelta:  pctChange(todayAppointments.length,  yesterdayApptCount),
                revenueDelta:       pctChange(todayRevenue,              yesterdayRevenue),
                pendingDelta:       null,  // needs yesterday's pending snapshot to be meaningful
            },
            appointments:   formattedAppointments,
            recentPatients,
            chartData,
            recentActivity: activityEvents,
        });

    } catch (err) {
        console.error('Dashboard Controller Error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};