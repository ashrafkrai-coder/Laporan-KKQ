const CONFIG = {
  geminiKey: 'SMART_KKQ_GEMINI_API_KEY',
  geminiModel: 'SMART_KKQ_GEMINI_MODEL',
  reportFolderId: 'SMART_KKQ_REPORT_FOLDER_ID'
};

function doPost(e) {
  try {
    const request = JSON.parse(e.postData.contents || '{}');
    const result = handleAction(request.action, request);
    return output({ok: true, ...result});
  } catch (error) {
    console.error(error);
    return output({ok: false, error: error.message || 'Ralat Apps Script.'});
  }
}

function doGet() {
  return output({ok: true, service: 'Smart KKQ Apps Script'});
}

function handleAction(action, request) {
  switch (action) {
    case 'bootstrap':
      return bootstrap();
    case 'sheetDefaults':
      return {defaults: readDefaults(getSheet(request.targetSheet))};
    case 'generate':
      return {report: generateReport(request.form)};
    case 'save':
      return saveReport(request.form, request.report);
    default:
      throw new Error('Tindakan tidak disokong: ' + action);
  }
}

function bootstrap() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = spreadsheet.getSheets().map(function(sheet) {
    return sheet.getName();
  });
  if (!sheets.length) throw new Error('Tiada tab dalam Google Sheet.');
  return {
    sheets: sheets,
    defaultSheet: sheets[0],
    defaults: readDefaults(spreadsheet.getSheetByName(sheets[0]))
  };
}

function getSheet(name) {
  if (!name || typeof name !== 'string') throw new Error('Nama tab tidak sah.');
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sheet) throw new Error('Tab tidak ditemui: ' + name);
  return sheet;
}

function readDefaults(sheet) {
  const values = sheet.getRange('D7:D27').getValues().map(function(row) {
    return row[0];
  });
  return {
    unit: values[0] || '',
    sesi: values[2] || '',
    meeting: values[4] || '',
    day: values[6] || 'RABU',
    date: formatDate(values[8]),
    place: values[10] || '',
    time: values[12] || '',
    studentAttendance: values[17] || '',
    teacherAttendance: values[18] || '',
    teacherOne: values[19] || '',
    teacherTwo: values[20] || ''
  };
}

function formatDate(value) {
  if (!value) return '';
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return String(value);
}

function generateReport(form) {
  const key = PropertiesService.getScriptProperties().getProperty(CONFIG.geminiKey);
  if (!key) throw new Error('Script Property SMART_KKQ_GEMINI_API_KEY belum ditetapkan.');
  const model = PropertiesService.getScriptProperties().getProperty(CONFIG.geminiModel) ||
    'gemini-2.0-flash';
  const prompt = [
    'Jana laporan perjumpaan Kelab KKQ dalam Bahasa Melayu.',
    'Pulangkan JSON sahaja dengan struktur tepat:',
    '{"nilai":"","subNilai":"","matlamat":"","objektif":["","",""],',
    '"kbat":{"masalah":"","alternatif":"","penyelesaian":"","laporan":""},',
    '"pikem":"","aktiviti":["","","","","",""],"refleksi":""}',
    'Maklumat perjumpaan: ' + JSON.stringify(form)
  ].join('\n');
  const response = UrlFetchApp.fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent?key=' + encodeURIComponent(key),
    {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({contents: [{parts: [{text: prompt}]}]}),
      muteHttpExceptions: true
    }
  );
  const body = JSON.parse(response.getContentText());
  if (response.getResponseCode() >= 300 || !body.candidates || !body.candidates[0]) {
    throw new Error('Gemini gagal menjana laporan.');
  }
  const text = body.candidates[0].content.parts[0].text
    .replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
  return JSON.parse(text);
}

function saveReport(form, report) {
  if (!form || !form.targetSheet) throw new Error('Tab laporan tidak dipilih.');
  if (!report || !report.kbat || !Array.isArray(report.objektif) || !Array.isArray(report.aktiviti)) {
    throw new Error('Struktur laporan tidak lengkap. Jana semula laporan sebelum menyimpan.');
  }
  const sheet = getSheet(form.targetSheet);
  const values = {
    D7: form.unit, D9: form.sesi, D11: form.meeting,
    D13: form.day || 'RABU', D15: form.date, D17: form.place, D19: form.time,
    D24: form.studentAttendance, D25: form.teacherAttendance,
    D26: form.teacherOne, D27: form.teacherTwo,
    D32: report.nilai, D33: report.subNilai, D34: report.matlamat,
    D35: form.title, D36: report.objektif[0], D37: report.objektif[1],
    D38: report.objektif[2], D39: report.kbat.masalah,
    D42: report.kbat.alternatif, D46: report.kbat.penyelesaian,
    D50: report.kbat.laporan, D53: report.pikem,
    D54: report.aktiviti[0], D55: report.aktiviti[1], D56: report.aktiviti[2],
    D57: report.aktiviti[3], D58: report.aktiviti[4], D59: report.aktiviti[5],
    D60: report.refleksi
  };
  Object.keys(values).forEach(function(cell) {
    sheet.getRange(cell).setDataValidation(null);
  });
  Object.keys(values).forEach(function(cell) {
    const value = values[cell];
    sheet.getRange(cell).setValue(value === null || value === undefined ? '' : value);
  });
  return {message: 'Laporan disimpan ke ' + form.targetSheet + '.'};
}

function getDay(dateText) {
  if (!dateText) return '';
  const date = new Date(dateText + 'T00:00:00');
  return ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu'][date.getDay()];
}

function output(body) {
  return ContentService.createTextOutput(JSON.stringify(body))
    .setMimeType(ContentService.MimeType.JSON);
}
