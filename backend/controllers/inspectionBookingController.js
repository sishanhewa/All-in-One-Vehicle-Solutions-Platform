const asyncHandler = require('express-async-handler');
const InspectionBooking = require('../models/InspectionBooking');
const InspectionPackage = require('../models/InspectionPackage');
const User = require('../models/User');
const PDFDocument = require('pdfkit');
const { sendInspectionReportEmail } = require('../utils/emailService');

// @desc    Create a new inspection booking
// @route   POST /api/inspection/bookings
// @access  Private (User)
const createBooking = asyncHandler(async (req, res) => {
  const {
    companyId, packageId, appointmentDate, appointmentTime, notes,
    make, model, year, plateNumber, vehicleType
  } = req.body;

  if (!companyId || !packageId || !appointmentDate || !appointmentTime || !make || !model || !year || !plateNumber) {
    res.status(400);
    throw new Error('Please provide: companyId, packageId, appointmentDate, appointmentTime, make, model, year, and plateNumber');
  }

  // Verify the company exists
  const company = await User.findById(companyId);
  if (!company || company.role !== 'InspectionCompany') {
    res.status(404);
    throw new Error('Inspection company not found');
  }

  // Verify the package exists and belongs to the company
  const pkg = await InspectionPackage.findById(packageId);
  if (!pkg || pkg.companyId.toString() !== companyId) {
    res.status(404);
    throw new Error('Inspection package not found for this company');
  }

  if (!pkg.isActive) {
    res.status(400);
    throw new Error('This inspection package is currently unavailable');
  }

  const booking = await InspectionBooking.create({
    userId: req.user._id,
    companyId,
    packageId,
    vehicleInfo: {
      make,
      model,
      year: Number(year),
      plateNumber,
      vehicleType: vehicleType || 'Car',
    },
    appointmentDate: new Date(appointmentDate),
    appointmentTime,
    notes: notes || '',
    status: 'Pending',
  });

  // Populate references for the response
  const populated = await InspectionBooking.findById(booking._id)
    .populate('companyId', 'name phone companyProfile')
    .populate('packageId', 'name price duration')
    .populate('userId', 'name phone email');

  res.status(201).json(populated);
});

// @desc    Get logged-in user's bookings
// @route   GET /api/inspection/bookings/my-bookings
// @access  Private (User)
const getMyBookings = asyncHandler(async (req, res) => {
  const { status } = req.query;

  let query = { userId: req.user._id };
  if (status && status !== 'All') {
    query.status = status;
  }

  const bookings = await InspectionBooking.find(query)
    .populate('companyId', 'name phone companyProfile')
    .populate('packageId', 'name price duration')
    .sort({ appointmentDate: -1 });

  res.status(200).json(bookings);
});

// @desc    Get single booking by ID
// @route   GET /api/inspection/bookings/:id
// @access  Private (User who booked OR Company that owns the booking)
const getBookingById = asyncHandler(async (req, res) => {
  const booking = await InspectionBooking.findById(req.params.id)
    .populate('companyId', 'name phone email companyProfile')
    .populate('packageId', 'name price duration description checklistItems')
    .populate('userId', 'name phone email');

  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }

  // Authorization: Only the booking user or the company can view
  const isOwner = booking.userId._id.toString() === req.user._id.toString();
  const isCompany = booking.companyId._id.toString() === req.user._id.toString();

  if (!isOwner && !isCompany) {
    res.status(401);
    throw new Error('Not authorized to view this booking');
  }

  res.status(200).json(booking);
});

// @desc    Cancel a booking
// @route   PUT /api/inspection/bookings/:id/cancel
// @access  Private (User who booked OR Company)
const cancelBooking = asyncHandler(async (req, res) => {
  const booking = await InspectionBooking.findById(req.params.id);
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }

  const isOwner = booking.userId.toString() === req.user._id.toString();
  const isCompany = booking.companyId.toString() === req.user._id.toString();

  if (!isOwner && !isCompany) {
    res.status(401);
    throw new Error('Not authorized to cancel this booking');
  }

  // Can only cancel if not already completed or cancelled
  if (['Completed', 'Cancelled'].includes(booking.status)) {
    res.status(400);
    throw new Error(`Cannot cancel a booking that is already ${booking.status}`);
  }

  booking.status = 'Cancelled';
  booking.cancelReason = req.body.reason || 'No reason provided';
  const updated = await booking.save();

  res.status(200).json(updated);
});

// @desc    Get company's booking queue
// @route   GET /api/inspection/bookings/queue
// @access  Private (InspectionCompany)
const getCompanyQueue = asyncHandler(async (req, res) => {
  const { status, date } = req.query;

  let query = { companyId: req.user._id };

  if (status && status !== 'All') {
    query.status = status;
  }

  // Filter by date range
  if (date === 'today') {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    query.appointmentDate = { $gte: startOfDay, $lte: endOfDay };
  } else if (date === 'week') {
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date();
    endOfWeek.setDate(endOfWeek.getDate() + (6 - endOfWeek.getDay()));
    endOfWeek.setHours(23, 59, 59, 999);
    query.appointmentDate = { $gte: startOfWeek, $lte: endOfWeek };
  }

  const bookings = await InspectionBooking.find(query)
    .populate('userId', 'name phone email')
    .populate('packageId', 'name price duration')
    .sort({ appointmentDate: 1, appointmentTime: 1 });

  res.status(200).json(bookings);
});

// @desc    Company confirms a booking
// @route   PUT /api/inspection/bookings/:id/confirm
// @access  Private (InspectionCompany)
const confirmBooking = asyncHandler(async (req, res) => {
  const booking = await InspectionBooking.findById(req.params.id);
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }

  if (booking.companyId.toString() !== req.user._id.toString()) {
    res.status(401);
    throw new Error('Not authorized to manage this booking');
  }

  if (booking.status !== 'Pending') {
    res.status(400);
    throw new Error(`Cannot confirm a booking with status: ${booking.status}`);
  }

  booking.status = 'Confirmed';
  const updated = await booking.save();

  const populated = await InspectionBooking.findById(updated._id)
    .populate('userId', 'name phone email')
    .populate('packageId', 'name price duration');

  res.status(200).json(populated);
});

// @desc    Company starts inspection
// @route   PUT /api/inspection/bookings/:id/start
// @access  Private (InspectionCompany)
const startInspection = asyncHandler(async (req, res) => {
  const booking = await InspectionBooking.findById(req.params.id);
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }

  if (booking.companyId.toString() !== req.user._id.toString()) {
    res.status(401);
    throw new Error('Not authorized to manage this booking');
  }

  if (booking.status !== 'Confirmed') {
    res.status(400);
    throw new Error(`Cannot start inspection for a booking with status: ${booking.status}`);
  }

  booking.status = 'In Progress';
  const updated = await booking.save();

  const populated = await InspectionBooking.findById(updated._id)
    .populate('userId', 'name phone email')
    .populate('packageId', 'name price duration');

  res.status(200).json(populated);
});

// @desc    Company completes inspection and records results
// @route   PUT /api/inspection/bookings/:id/complete
// @access  Private (InspectionCompany)
const completeInspection = asyncHandler(async (req, res) => {
  const booking = await InspectionBooking.findById(req.params.id);
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }

  if (booking.companyId.toString() !== req.user._id.toString()) {
    res.status(401);
    throw new Error('Not authorized to manage this booking');
  }

  if (booking.status !== 'In Progress') {
    res.status(400);
    throw new Error(`Cannot complete a booking with status: ${booking.status}`);
  }

  const { inspectionResult, overallScore, checklist, resultRemarks, inspectionReport } = req.body;

  if (!inspectionResult) {
    res.status(400);
    throw new Error('Please provide the inspection result (Pass, Fail, or Conditional)');
  }

  // Parse checklist if sent as JSON string
  let parsedChecklist = checklist;
  if (typeof checklist === 'string') {
    try { parsedChecklist = JSON.parse(checklist); } catch (e) { parsedChecklist = []; }
  }

  let parsedReport = inspectionReport;
  if (typeof inspectionReport === 'string') {
    try { parsedReport = JSON.parse(inspectionReport); } catch (e) { parsedReport = null; }
  }

  booking.status = 'Completed';
  booking.inspectionResult = inspectionResult;
  booking.overallScore = overallScore ? Number(overallScore) : null;
  booking.checklist = parsedChecklist || [];
  booking.resultRemarks = resultRemarks || '';
  if (parsedReport) booking.inspectionReport = parsedReport;
  booking.completedDate = new Date();

  const updated = await booking.save();

  const populated = await InspectionBooking.findById(updated._id)
    .populate('userId', 'name phone email')
    .populate('companyId', 'name phone companyProfile')
    .populate('packageId', 'name price duration');

  // Generate PDF and send email asynchronously (don't block the response)
  const targetEmail = parsedReport?.customerEmail || populated.userId?.email;
  if (parsedReport && targetEmail) {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      let buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        sendInspectionReportEmail(targetEmail, populated.userId.name, pdfData, parsedReport.reportNumber || populated._id);
      });
      buildInspectionPDF(doc, populated, parsedReport);
      doc.end();
    } catch (err) {
      console.error('Error generating email PDF:', err);
    }
  }

  res.status(200).json(populated);
});

// @desc    Upload report images for a completed inspection
// @route   POST /api/inspection/bookings/:id/images
// @access  Private (InspectionCompany)
const uploadReportImages = asyncHandler(async (req, res) => {
  const booking = await InspectionBooking.findById(req.params.id);
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }

  if (booking.companyId.toString() !== req.user._id.toString()) {
    res.status(401);
    throw new Error('Not authorized to manage this booking');
  }

  if (!req.files || req.files.length === 0) {
    res.status(400);
    throw new Error('Please upload at least one image');
  }

  const newImages = req.files.map(file => file.path);
  booking.reportImages = [...booking.reportImages, ...newImages];
  const updated = await booking.save();

  res.status(200).json(updated);
});

// @desc    Generate PDF report for completed inspection
// @route   GET /api/inspection/bookings/:id/report-pdf
// @access  Private (User who booked OR Company)
const generateReportPDF = asyncHandler(async (req, res) => {
  const booking = await InspectionBooking.findById(req.params.id)
    .populate('companyId', 'name phone companyProfile')
    .populate('userId', 'name phone email');

  if (!booking || !booking.inspectionReport) {
    res.status(404);
    throw new Error('Inspection report not found');
  }

  const isOwner = booking.userId._id.toString() === req.user._id.toString();
  const isCompany = booking.companyId._id.toString() === req.user._id.toString();

  if (!isOwner && !isCompany && req.user.role !== 'Admin') {
    res.status(401);
    throw new Error('Not authorized to view this report');
  }

  const report = booking.inspectionReport;

  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=Inspection_${report.reportNumber || booking._id}.pdf`);
  doc.pipe(res);

  buildInspectionPDF(doc, booking, report);
  doc.end();
});

// Helper function to build the PDF content layout
const buildInspectionPDF = (doc, booking, report) => {
  // Helper for legend symbols
  const sym = (status) => {
    switch (status) {
      case 'checked': return 'OK';
      case 'problem': return 'X';
      case 'adjusted': return 'A';
      case 'clean': return 'C';
      case 'replace': return 'R';
      default: return 'N/A';
    }
  };

  // Header
  doc.fontSize(20).font('Helvetica-Bold').text('VEHICLE INSPECTION REPORT', { align: 'center' });
  doc.moveDown(1);

  doc.fontSize(10).font('Helvetica');
  doc.text(`Report No: ${report.reportNumber || 'N/A'}`, { align: 'right' });
  doc.moveUp();
  doc.text(`Name: ${booking.userId.name}`);
  
  doc.moveDown(0.5);
  doc.fontSize(8).text('This report is issued only for the use of above mentioned client and is not to be used for any other purpose. Inspection is necessarily superficial. No responsibility will be accepted regarding the repairs done after the inspection and defects that do not appear at present, which may develop subsequently.');
  
  doc.moveDown(1);
  doc.fontSize(10);
  doc.text(`Date and Time of Inspection: ${report.inspectionDateTime ? new Date(report.inspectionDateTime).toLocaleString() : 'N/A'}`);
  doc.moveDown(0.5);
  doc.text(`Vehicle Power System: ${report.vehiclePowerSystem || 'N/A'}`);
  
  doc.moveDown(1);
  doc.fontSize(14).font('Helvetica-Bold').text('Vehicle Identification Details', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(10).font('Helvetica');
  const yReg = doc.y;
  doc.text(`Registration No: ${report.registrationNo || 'N/A'}`, 40, yReg);
  doc.text(`Meter Reading: ${report.meterReading || 'N/A'}`, 300, yReg);

  doc.moveDown(2);
  doc.fontSize(10).font('Helvetica-Bold').text('Legend: A = Adjusted | OK = Checked | X = Problem | C = Clean | R = Replace', { align: 'center' });
  doc.moveDown(1);

  // Draw checklists using a simple two-column layout
  const col1 = 40;
  const col2 = 300;
  
  let currentY = doc.y;

  doc.fontSize(10).font('Helvetica-Bold');
  doc.text('ENGINE ON', col1, currentY);
  doc.text('ENGINE OFF', col2, currentY);
  
  doc.font('Helvetica');
  currentY += 15;
  const engineOnKeys = Object.keys(report.engineOn || {}).map(k => ({ key: k, label: k.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()) }));
  const engineOffKeys = Object.keys(report.engineOff || {}).map(k => ({ key: k, label: k.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()) }));

  const maxRows1 = Math.max(engineOnKeys.length, engineOffKeys.length);
  for (let i = 0; i < maxRows1; i++) {
    if (engineOnKeys[i]) {
      doc.text(engineOnKeys[i].label, col1, currentY, { lineBreak: false });
      doc.text(`[ ${sym(report.engineOn[engineOnKeys[i].key])} ]`, col1 + 200, currentY, { lineBreak: false });
    }
    if (engineOffKeys[i]) {
      doc.text(engineOffKeys[i].label, col2, currentY, { lineBreak: false });
      doc.text(`[ ${sym(report.engineOff[engineOffKeys[i].key])} ]`, col2 + 200, currentY, { lineBreak: false });
    }
    currentY += 12;
  }

  // Restore X to left margin so moveDown behaves
  doc.x = 40;
  doc.y = currentY;
  doc.moveDown(0.5);
  
  currentY = doc.y;

  doc.fontSize(10).font('Helvetica-Bold');
  doc.text('MECHANICAL / UNDERCARRIAGE', col1, currentY);
  doc.text('SUSPENSION / WHEELS / EXHAUST', col2, currentY);
  
  doc.font('Helvetica');
  currentY += 15;
  const mechKeys = Object.keys(report.mechanical || {}).map(k => ({ key: k, label: k.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()) }));
  const suspKeys = Object.keys(report.suspensionWheelsExhaust || {}).map(k => ({ key: k, label: k.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()) }));

  const maxRows2 = Math.max(mechKeys.length, suspKeys.length);
  for (let i = 0; i < maxRows2; i++) {
    if (mechKeys[i]) {
      doc.text(mechKeys[i].label, col1, currentY, { lineBreak: false });
      doc.text(`[ ${sym(report.mechanical[mechKeys[i].key])} ]`, col1 + 200, currentY, { lineBreak: false });
    }
    if (suspKeys[i]) {
      doc.text(suspKeys[i].label, col2, currentY, { lineBreak: false });
      doc.text(`[ ${sym(report.suspensionWheelsExhaust[suspKeys[i].key])} ]`, col2 + 200, currentY, { lineBreak: false });
    }
    currentY += 12;
  }

  doc.x = 40;
  doc.y = currentY;
  doc.moveDown(0.5);
  
  currentY = doc.y;
  
  doc.fontSize(10).font('Helvetica-Bold').text('Service Options:', col1, currentY, { lineBreak: false });
  doc.font('Helvetica');
  const so = report.serviceOptions || {};
  doc.text(`Full Service: [${so.fullService ? 'OK' : ' '}]    Oil Change: [${so.oilChange ? 'OK' : ' '}]    Interior: [${so.interior ? 'OK' : ' '}]`, col1, currentY + 12, { lineBreak: false });

  doc.x = 40;
  doc.y = currentY + 12;
  doc.moveDown(1);
  
  doc.font('Helvetica-Bold').text('Remarks:');
  doc.font('Helvetica').text(report.remarks || 'None');

  doc.moveDown(2);
  currentY = doc.y;
  
  doc.text('_________________________', 40, currentY, { lineBreak: false });
  doc.text('Technician Signature', 40, currentY + 12, { lineBreak: false });
  
  doc.text('_________________________', 300, currentY, { lineBreak: false });
  doc.text('Customer Signature', 300, currentY + 12, { lineBreak: false });
};

module.exports = {
  createBooking,
  getMyBookings,
  getBookingById,
  cancelBooking,
  getCompanyQueue,
  confirmBooking,
  startInspection,
  completeInspection,
  uploadReportImages,
  generateReportPDF,
};
