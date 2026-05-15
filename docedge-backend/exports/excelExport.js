const ExcelJS = require('exceljs');
const mongoose = require('mongoose');


const Appointment = require('../models/Appointment');
const billingSchema = require('../models/billingSchema');


const getBillingModel = (slug) => {
    const collectionName = `${slug}_billings`;
    return mongoose.models[collectionName] || mongoose.model(collectionName, billingSchema, collectionName);
};

exports.exportToExcel = async (req, res) => {
    const { slug } = req.params;
    const Bill = getBillingModel(slug);
    const bills = await Bill.find({ clinicSlug: slug }).sort({ createdAt: -1 });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Clinic Revenue Report');

    sheet.columns = [
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Patient Name', key: 'name', width: 25 },
        { header: 'Total Bill', key: 'total', width: 15 },
        { header: 'Paid', key: 'paid', width: 15 },
        { header: 'Due', key: 'due', width: 15 }
    ];

    bills.forEach(b => {
        sheet.addRow({
            date: b.createdAt.toDateString(),
            name: b.patientName,
            total: b.grandTotal,
            paid: b.paidAmount,
            due: b.dueAmount
        });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Report_${slug}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
};