// ==================== Google Apps Script 後端程式碼 ====================
// 使用方式: 
// 1. 在 Google Sheets 中點擊「擴充功能」-> 「Apps Script」
// 2. 複製以下所有程式碼到編輯器中
// 3. 儲存並部署為 Web App

var SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();
var SHEET_NAME = "UserLogs";

function doPost(e) {
  return handleRequest(e);
}

function doGet(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000); // 防止同時寫入衝突

  try {
    var sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
    
    // 取得參數 (相容 GET 與 POST)
    var params = e.parameter;
    var action = params.action;
    var userId = params.userId;
    
    if (!userId) {
      return responseJSON({ status: "error", message: "缺少 userId" });
    }

    // --- 功能 1: 儲存使用者選擇 (action = set) ---
    if (action == "set") {
      var city = params.city;
      if (!city) return responseJSON({ status: "error", message: "缺少 city" });
      
      updateUserCity(sheet, userId, city);
      return responseJSON({ status: "success", message: "已更新紀錄" });
    }
    
    // --- 功能 2: 獲取使用者上次選擇 (action = get) ---
    else if (action == "get") {
      var lastCity = getUserCity(sheet, userId);
      return responseJSON({ status: "success", lastCity: lastCity });
    }
    
    else {
      return responseJSON({ status: "error", message: "未知的 action" });
    }

  } catch (err) {
    return responseJSON({ status: "error", message: err.toString() });
  } finally {
    lock.releaseLock();
  }
}

// 輔助函式：更新或新增使用者資料
function updateUserCity(sheet, userId, city) {
  var data = sheet.getDataRange().getValues();
  var rowIndex = -1;
  
  // 搜尋 UserID 是否存在 (跳過標題列)
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == userId) {
      rowIndex = i + 1; // 對應實際列號
      break;
    }
  }

  var timestamp = new Date();
  
  if (rowIndex > 0) {
    // 更新舊資料
    sheet.getRange(rowIndex, 2).setValue(city);
    sheet.getRange(rowIndex, 3).setValue(timestamp);
  } else {
    // 新增資料
    sheet.appendRow([userId, city, timestamp]);
  }
}

// 輔助函式：讀取使用者資料
function getUserCity(sheet, userId) {
  var data = sheet.getDataRange().getValues();
  // 從最後一筆開始往前找，效率較差但邏輯簡單，建議資料量大時改用 Cache
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == userId) {
      return data[i][1]; // 回傳 City 欄位
    }
  }
  return null; // 找不到
}

// 輔助函式：回傳 JSON
function responseJSON(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
