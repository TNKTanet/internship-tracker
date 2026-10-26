/**
 * Google Apps Script (รหัส.gs)
 * Web App สำหรับซิงก์ข้อมูล 2 ทาง (Two-Way Sync) ระหว่าง Internship Tracker กับ Google Sheet
 * รองรับระบบเช็คลิสต์สถานะแยกตามคอลัมน์:
 * - Col J (10): เลือก/ไม่เลือก (❌ ปัดตก)
 * - Col N (14): สถานะ เปิดสมัคร (❌ ปิดรับสมัคร)
 * - Col O (15): สนใจส่งMail / ความคืบหน้า (ห้ามลบเด็ดขาด)
 * - Col P (16): สมัคร (❌ เล็งไว้แต่ยังไม่ยื่น / ✅ ส่งใบสมัครแล้ว)
 * - Col R (18): สัมภาษณ์ (✅)
 * - Col S (19): ได้ที่เเล้ว (✅)
 */

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({ 
    status: "ok", 
    message: "Internship Tracker API is ready!" 
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents);
    var action = data.action;

    // ฟังก์ชันค้นหาแถวจากหมายเลขลำดับ (Col A)
    function findRowIndex(targetNo) {
      var values = sheet.getDataRange().getValues();
      for (var i = 1; i < values.length; i++) {
        if (String(values[i][0]).trim() === String(targetNo).trim()) {
          return i + 1; // 1-based row index in Google Sheets
        }
      }
      return -1;
    }

    // =========================================================================
    // 1. กรณีติ๊กเช็คลิสต์สถานะบนการ์ด (อัปเดตเฉพาะ Col P, R, S, J, N ไม่แตะ Col O เด็ดขาด)
    // =========================================================================
    if (action === "update_status_checkboxes") {
      var rowIndex = findRowIndex(data.no);
      if (rowIndex !== -1) {
        // Col J (10): เลือก/ไม่เลือก (❌ ปัดตก หรือ คืนค่าเดิม)
        if (data.col_j !== undefined) {
          sheet.getRange(rowIndex, 10).setValue(data.col_j);
        }

        // Col N (14): สถานะ เปิดสมัคร (❌ ปิดรับสมัคร หรือ คืนค่าเดิม)
        if (data.col_n !== undefined) {
          sheet.getRange(rowIndex, 14).setValue(data.col_n);
        }

        // Col P (16): สมัคร (❌ เล็งไว้ / ✅ ส่งใบสมัครแล้ว / ว่าง)
        if (data.col_p !== undefined) {
          sheet.getRange(rowIndex, 16).setValue(data.col_p);
        }

        // Col Q (17): โทรตามผล (✅ หรือ ว่าง)
        if (data.col_q !== undefined) {
          sheet.getRange(rowIndex, 17).setValue(data.col_q);
        }

        // Col R (18): สัมภาษณ์ (✅ หรือ ว่าง)
        if (data.col_r !== undefined) {
          sheet.getRange(rowIndex, 18).setValue(data.col_r);
        }

        // Col S (19): ได้ที่เเล้ว (✅ หรือ ว่าง)
        if (data.col_s !== undefined) {
          sheet.getRange(rowIndex, 19).setValue(data.col_s);
        }

        return ContentService.createTextOutput(JSON.stringify({ 
          status: "success", 
          mode: "checkboxes", 
          no: data.no, 
          row: rowIndex 
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    // =========================================================================
    // 2. กรณีเปลี่ยนสถานะแบบเดิม (Fallback สำหรับ Kanban ลากวาง)
    // =========================================================================
    if (action === "update_status_only") {
      var rowIndex = findRowIndex(data.no);
      if (rowIndex !== -1) {
        var status = String(data.column_status || "").trim();
        if (status === "following_up") {
          sheet.getRange(rowIndex, 16).setValue("✅"); // Col P
          sheet.getRange(rowIndex, 17).setValue("✅"); // Col Q
          sheet.getRange(rowIndex, 18).setValue("");   // Col R
          sheet.getRange(rowIndex, 19).setValue("");   // Col S
        } else if (status === "applied") {
          sheet.getRange(rowIndex, 16).setValue("✅"); // Col P
          sheet.getRange(rowIndex, 17).setValue("");   // Col Q
          sheet.getRange(rowIndex, 18).setValue("");   // Col R
          sheet.getRange(rowIndex, 19).setValue("");   // Col S
        } else if (status === "target") {
          sheet.getRange(rowIndex, 16).setValue("❌"); // Col P
          sheet.getRange(rowIndex, 17).setValue("");   // Col Q
          sheet.getRange(rowIndex, 18).setValue("");   // Col R
          sheet.getRange(rowIndex, 19).setValue("");   // Col S
        } else if (status === "interview") {
          sheet.getRange(rowIndex, 16).setValue("✅"); // Col P
          sheet.getRange(rowIndex, 17).setValue("✅"); // Col Q
          sheet.getRange(rowIndex, 18).setValue("✅"); // Col R
          sheet.getRange(rowIndex, 19).setValue("");   // Col S
        } else if (status === "accepted") {
          sheet.getRange(rowIndex, 16).setValue("✅"); // Col P
          sheet.getRange(rowIndex, 17).setValue("✅"); // Col Q
          sheet.getRange(rowIndex, 18).setValue("✅"); // Col R
          sheet.getRange(rowIndex, 19).setValue("✅"); // Col S
        } else if (status === "dropped") {
          sheet.getRange(rowIndex, 10).setValue("❌"); // Col J
          sheet.getRange(rowIndex, 16).setValue("");   // Col P
          sheet.getRange(rowIndex, 17).setValue("");   // Col Q
          sheet.getRange(rowIndex, 18).setValue("");   // Col R
          sheet.getRange(rowIndex, 19).setValue("");   // Col S
        }
        return ContentService.createTextOutput(JSON.stringify({ 
          status: "success", 
          mode: "status_only", 
          row: rowIndex 
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    // =========================================================================
    // 3. กรณีอัปเดตข้อมูลบริษัทเต็มรูปแบบ (จากหน้าต่างแก้ไขข้อความ)
    // =========================================================================
    if (action === "update_company") {
      var rowIndex = findRowIndex(data.no);
      if (rowIndex !== -1) {
        if (data.name) sheet.getRange(rowIndex, 2).setValue(data.name);                         // Col B
        if (data.about !== undefined) sheet.getRange(rowIndex, 3).setValue(data.about);         // Col C
        if (data.biz_type !== undefined) sheet.getRange(rowIndex, 4).setValue(data.biz_type);   // Col D
        if (data.location !== undefined) sheet.getRange(rowIndex, 5).setValue(data.location);   // Col E
        if (data.loc_desc !== undefined) sheet.getRange(rowIndex, 6).setValue(data.loc_desc);   // Col F
        if (data.zone !== undefined) sheet.getRange(rowIndex, 7).setValue(data.zone);           // Col G
        if (data.role !== undefined) sheet.getRange(rowIndex, 8).setValue(data.role);           // Col H
        if (data.welfare !== undefined) sheet.getRange(rowIndex, 9).setValue(data.welfare);     // Col I
        if (data.tier !== undefined) sheet.getRange(rowIndex, 10).setValue(data.tier);         // Col J
        if (data.reason !== undefined) sheet.getRange(rowIndex, 11).setValue(data.reason);     // Col K
        if (data.contact !== undefined) sheet.getRange(rowIndex, 12).setValue(data.contact);   // Col L
        if (data.status_recruit !== undefined) sheet.getRange(rowIndex, 13).setValue(data.status_recruit); // Col M
        if (data.status_open !== undefined) sheet.getRange(rowIndex, 14).setValue(data.status_open);       // Col N

        // Col O (15): ข้อความบันทึกความคืบหน้า (เขียนลงช่องจริง ไม่ลบถ้าส่งค่าว่างมา)
        if (data.followup !== undefined && data.followup !== null && data.followup.trim() !== "") {
          sheet.getRange(rowIndex, 15).setValue(data.followup);
        }

        // อัปเดตคอลัมน์เช็คลิสต์ Col P, Q, R, S
        if (data.col_p !== undefined && data.col_p !== "") {
          sheet.getRange(rowIndex, 16).setValue(data.col_p);
        }
        if (data.col_q !== undefined) {
          sheet.getRange(rowIndex, 17).setValue(data.col_q);
        }
        if (data.col_r !== undefined) {
          sheet.getRange(rowIndex, 18).setValue(data.col_r);
        }
        if (data.col_s !== undefined) {
          sheet.getRange(rowIndex, 19).setValue(data.col_s);
        }

        return ContentService.createTextOutput(JSON.stringify({ 
          status: "success", 
          no: data.no, 
          row: rowIndex 
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    return ContentService.createTextOutput(JSON.stringify({ status: "ignored" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ 
      status: "error", 
      message: error.toString() 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
