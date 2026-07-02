function doGet() {
  return ContentService
    .createTextOutput("Study Quest Tracker Web App is active")
    .setMimeType(ContentService.MimeType.TEXT);
}

function ensureSheet(spreadsheet, name) {
  let sheet = spreadsheet.getSheetByName(name);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(name);
  }
  if (sheet.getLastRow() === 0) {
    // Ensure header matches data columns (includes Frequency)
    sheet.appendRow(["Date", "Time", "Student", "Subject", "Task", "Completed", "Saved At", "Frequency"]);
  }
  return sheet;
}

function doPost(e) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const data = JSON.parse(e.postData.contents);
  const sheetName = data.sheetName || (data.subject === "Mock Tests" ? "Mock Tests" : new Date().toISOString().slice(0, 10));
  const sheet = ensureSheet(spreadsheet, sheetName);
  const completedText = data.completed ? "Yes" : "No";
  const now = new Date();
  // Append to the date-sheet only (we will derive Dashboard from date sheets)
  sheet.appendRow([
    now,
    data.time || now.toLocaleTimeString(),
    data.student || "Unknown",
    data.subject || "",
    data.task || "",
    completedText,
    now,
    data.frequency || "daily"
  ]);

  // Recompute dashboard on each write so it's always accurate and driven by date sheets
  ensureDashboard(spreadsheet);

  return ContentService
    .createTextOutput("Success")
    .setMimeType(ContentService.MimeType.TEXT);
}

function ensureDashboard(spreadsheet) {
  var dashboard = spreadsheet.getSheetByName("Dashboard");
  if (!dashboard) {
    dashboard = spreadsheet.insertSheet("Dashboard");
  }
  // Clear previous contents
  dashboard.clear();

  // Prepare counters
  var subjects = ["English", "Reasoning", "Math", "GK", "Mock Tests"];
  var subjectCompleted = {};
  var subjectTotal = {};
  subjects.forEach(function(s){ subjectCompleted[s]=0; subjectTotal[s]=0; });

  var now = new Date();
  // Compute week start (Monday)
  var weekStart = new Date(now);
  var diffToMonday = (weekStart.getDay() + 6) % 7; // 0->Monday
  weekStart.setDate(weekStart.getDate() - diffToMonday);
  weekStart.setHours(0,0,0,0);
  var monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  monthStart.setHours(0,0,0,0);

  var weeklyCompleted = 0;
  var monthlyCompleted = 0;

  var sheets = spreadsheet.getSheets();
  var dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  for (var i=0;i<sheets.length;i++){
    var sh = sheets[i];
    var name = sh.getName();
    if (name === 'Dashboard') continue;
    if (!(name === 'Mock Tests' || dateRegex.test(name))) continue;
    var last = sh.getLastRow();
    if (last < 2) continue;
    var values = sh.getRange(2,1,last-1,8).getValues();
    for (var r=0;r<values.length;r++){
      var row = values[r];
      var dateCell = row[0];
      var subj = (row[3] || '').toString();
      var completed = (row[5] || '').toString();
      var savedAt = row[6];
      var freq = row[7] || 'daily';
      // Normalize date
      if (!(dateCell instanceof Date)) {
        dateCell = new Date(dateCell);
      }
      // Tally totals and completions
      if (subjects.indexOf(subj) !== -1) {
        subjectTotal[subj] = (subjectTotal[subj] || 0) + 1;
        if (completed.toLowerCase() === 'yes') {
          subjectCompleted[subj] = (subjectCompleted[subj] || 0) + 1;
        }
      }
      if (completed.toLowerCase() === 'yes') {
        if (dateCell >= weekStart && dateCell <= now) weeklyCompleted++;
        if (dateCell >= monthStart && dateCell <= now) monthlyCompleted++;
      }
    }
  }

  // Write dashboard values
  dashboard.getRange(1,1).setValue('Study Progress Dashboard');
  dashboard.getRange(2,1).setValue('Last refresh');
  dashboard.getRange(2,2).setValue(new Date());

  dashboard.getRange(4,1).setValue('Weekly completed');
  dashboard.getRange(4,2).setValue(weeklyCompleted);
  dashboard.getRange(5,1).setValue('Monthly completed');
  dashboard.getRange(5,2).setValue(monthlyCompleted);

  dashboard.getRange(7,1).setValue('Subject');
  dashboard.getRange(7,2).setValue('Completed');
  dashboard.getRange(7,3).setValue('Total');

  var outRow = 8;
  for (var j=0;j<subjects.length;j++){
    var s = subjects[j];
    dashboard.getRange(outRow,1).setValue(s);
    dashboard.getRange(outRow,2).setValue(subjectCompleted[s] || 0);
    dashboard.getRange(outRow,3).setValue(subjectTotal[s] || 0);
    outRow++;
  }

  dashboard.autoResizeColumns(1,3);
  dashboard.getRange(1,1,1,3).setFontWeight('bold');
  dashboard.getRange(4,1,1,3).setFontWeight('bold');
  dashboard.getRange(7,1,1,3).setFontWeight('bold');
}
