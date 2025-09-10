const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const XLSX = require('xlsx');

const app = express();
const PORT = 3000;
const excelFilePath = path.join(__dirname, 'ModelSeet_adavanced ADAS.xlsx');

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Multer setup
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// Helper: Column headers for each day's session data (from Excel row 3)
const sessionColumnHeaders = [
  "Date of NM Session",
  "Students Present",
  "Students Absent",
  "Duration Taken (in Hours)",
  "Number of Trainers Present",
  "Trainer(s) Name",
  "Contact Number of Trainer(s)",
  "Remarks"
];

// Helper: Find the starting column index (0-indexed) for the next empty Day block in a specific row
function getNextDayBlockStartIndex(ws, excelRow) {
  // Static columns A-G (0-6)
  // Day 1 starts at H (column index 7)
  // Each day block is 8 columns wide
  for (let dayNum = 1; dayNum <= 12; dayNum++) {
    const dateColIndex = 8 + (dayNum - 1) * 8; // 0-indexed column for "Date of NM Session"
    const cellAddress = XLSX.utils.encode_cell({ r: excelRow - 1, c: dateColIndex }); // r is 0-indexed
    const cell = ws[cellAddress];
    if (!cell || !cell.v) { // If cell is empty or undefined
      return dayNum - 1; // Return 0-indexed day block number
    }
  }
  return -1; // All 12 days are filled
}

// Helper: Update a college row with session data
function updateCollegeRowInExcel(ws, collegeName, branch, sessionDetails, commonDetails) {
  console.log(`Searching for row for College: ${collegeName}, Branch: ${branch}`);
  let targetExcelRow = -1;
  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let R = range.s.r + 3; R <= range.e.r; ++R) {
    const collegeNameCellAddress = XLSX.utils.encode_cell({ r: R, c: 1 });
    const branchCellAddress = XLSX.utils.encode_cell({ r: R, c: 5 });

    const currentCollegeName = ws[collegeNameCellAddress] ? ws[collegeNameCellAddress].v : "";
    const currentBranch = ws[branchCellAddress] ? ws[branchCellAddress].v : "";

    if (currentCollegeName === collegeName && currentBranch === branch) {
      targetExcelRow = R + 1;
      console.log(`Found matching row at Excel row: ${targetExcelRow}`);
      break;
    }
  }

  if (targetExcelRow === -1) {
    console.warn(`No row found for College: ${collegeName}, Branch: ${branch}`);
    return { success: false, type: 'not_found', message: `No row found for ${collegeName} - ${branch}` };
  }

  const dayBlockIndex = getNextDayBlockStartIndex(ws, targetExcelRow);
  if (dayBlockIndex === -1) {
    console.warn(`${collegeName} - ${branch}: All 12 Days already filled.`);
    return { success: false, message: `${collegeName} - ${branch}: All 12 Days already filled.` };
  }
  console.log(`Next available Day block for ${collegeName} - ${branch} is Day ${dayBlockIndex + 1}`);

  const startColIndex = 8 + (dayBlockIndex * 8);

  const dataToUpdate = [
    commonDetails.date,
    sessionDetails.studentsPresent,
    sessionDetails.studentsAbsent,
    sessionDetails.duration,
    commonDetails.number_of_trainer,
    commonDetails.trainer_name,
    commonDetails.contact_number,
    commonDetails.remarks
  ];

  console.log(`Updating cells for Day ${dayBlockIndex + 1} starting at column ${startColIndex} with data:`, dataToUpdate);
  for (let i = 0; i < sessionColumnHeaders.length; i++) {
    const cellAddress = XLSX.utils.encode_cell({ r: targetExcelRow - 1, c: startColIndex + i });
    XLSX.utils.sheet_add_aoa(ws, [[dataToUpdate[i]]], { origin: cellAddress });
    console.log(`Wrote '${dataToUpdate[i]}' to cell ${cellAddress}`);
  }
  return { success: true, message: `${collegeName} - ${branch} updated for Day ${dayBlockIndex + 1}`, day: dayBlockIndex + 1, college: collegeName, branch: branch };
}


app.post('/submit-session', upload.fields([
  { name: 'expense_ss', maxCount: 5 },
  { name: 'geo_tag', maxCount: 5 },
  { name: 'staff_photo', maxCount: 5 },
  { name: 'session_video', maxCount: 1 }
]), (req, res) => {
  try {
    const {
      date, number_of_trainer, trainer_name,
      contact_number, remarks, expense,
      hubData: rawHubData, spokeData: rawSpokeData
    } = req.body;

    const commonDetails = {
      date, number_of_trainer, trainer_name,
      contact_number, remarks, expense
    };

    const hubData = rawHubData ? JSON.parse(rawHubData) : null;
    const spokeData = rawSpokeData ? rawSpokeData.map(JSON.parse) : [];

    console.log('Received /submit-session request:');
    console.log('Common Details:', commonDetails);
    console.log('Hub Data:', hubData);
    console.log('Spoke Data:', spokeData);
    console.log('Files:', req.files);

    // Handle file uploads (save paths to remarks or a separate column if needed)
    const uploadedFilePaths = {};
    if (req.files) {
      for (const key in req.files) {
        uploadedFilePaths[key] = req.files[key].map(file => file.path);
      }
    }
    // For now, let's append file paths to remarks if they exist
    if (Object.keys(uploadedFilePaths).length > 0) {
      commonDetails.remarks += ` (Uploaded files: ${JSON.stringify(uploadedFilePaths)})`;
    }
    console.log('Updated Remarks with File Paths:', commonDetails.remarks);

    console.log(`Attempting to read Excel file: ${excelFilePath}`);
    const workbook = XLSX.readFile(excelFilePath);
    console.log('Excel file read successfully.');
    const sheetName = workbook.SheetNames[0];
    const ws = workbook.Sheets[sheetName];
    console.log(`Working on sheet: ${sheetName}`);

    let updateMessages = [];

    if (hubData) {
      console.log(`Processing Hub Data for: ${hubData.collegeName} - ${hubData.branch}`);
      const result = updateCollegeRowInExcel(ws, hubData.collegeName, hubData.branch, hubData, commonDetails);
      updateMessages.push(result);
      console.log(`Hub Data update result:`, result);
    }

    for (const spoke of spokeData) {
      console.log(`Processing Spoke Data for: ${spoke.collegeName} - ${spoke.branch}`);
      const result = updateCollegeRowInExcel(ws, spoke.collegeName, spoke.branch, spoke, commonDetails);
      updateMessages.push(result);
      console.log(`Spoke Data update result:`, result);
    }

    console.log(`Attempting to write workbook to: ${excelFilePath}`);
    XLSX.writeFile(workbook, excelFilePath);
    console.log('Workbook written successfully.');

    const hasNotFound = updateMessages.some(update => update.type === 'not_found');
    if (hasNotFound) {
      res.status(404).json({ message: "Some colleges/branches not found", updates: updateMessages });
    } else {
      res.status(200).json({ message: "Session data saved successfully", updates: updateMessages });
    }

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ message: "Error saving to Excel", error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
