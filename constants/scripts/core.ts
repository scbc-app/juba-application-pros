/**
 * 3_CoreOperations.gs - Core Data Flow & Systems
 */

export const CODE_3_CORE_OPERATIONS = `/**
 * 3_CoreOperations.gs - Core Data Flow & Systems
 */

// Use var/global assignment for GAS to ensure cross-file visibility without hoisting issues
var DataHandlers = {
  handleDataSubmission: function(ss, body) {
    var sheetName = body.sheet;
    var rowData = body.row;
    var sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) return ResponseBuilder.error("Target registry '" + sheetName + "' not found.");

    var safeRow = rowData.map(function(r) { return (r === null || r === undefined) ? "" : String(r); });
    sheet.appendRow(safeRow);

    // Track original request completion
    if (body.requestId) {
        var reqSheet = ss.getSheetByName('Inspection_Requests');
        if (reqSheet) {
            var reqData = reqSheet.getDataRange().getValues();
            for (var i = 1; i < reqData.length; i++) {
                if (String(reqData[i][0]) === String(body.requestId)) {
                    reqSheet.getRange(i + 1, 10).setValue('Completed');
                    break;
                }
            }
        }
    }

    // DISPATCH EMAIL NOTIFICATIONS
    if (typeof EmailHandlers !== 'undefined') {
       EmailHandlers.sendEmailNotifications(ss, body, sheetName);
    }
    
    // UPDATE AUTO-SUGGESTION REGISTRY
    if (typeof Validation !== 'undefined') {
       Validation.updateFromRow(ss, body);
    }

    return ResponseBuilder.success({ sheet: sheetName });
  },

  handleGetRequest: function(ss) {
    var sheets = ss.getSheets();
    var data = {};
    sheets.forEach(function(sheet) {
      var name = sheet.getName();
      if (name === 'Users' || name === 'System_Logs') return;
      
      var lastRow = sheet.getLastRow();
      if (lastRow === 0) {
          data[name] = [];
          return;
      }

      if (name === 'Validation_Data') {
         if (lastRow > 1) {
            var range = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn());
            var values = range.getValues();
            var columns = {};
            var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
            headers.forEach(function(h, colIndex) {
               columns[h] = [...new Set(values.map(function(row) { return row[colIndex]; }).filter(function(c) { return c !== ""; }))]; 
            });
            data[name] = columns;
         } else { data[name] = {}; }
      } else if (name === 'System_Settings') {
          data[name] = sheet.getDataRange().getValues();
      } else if (name === 'Subscription_Data') {
          var values = sheet.getDataRange().getValues();
          if (values.length > 1) {
            var lastRowData = values[values.length - 1];
            data[name] = { 
                current: { status: lastRowData[0], plan: lastRowData[1], expiryDate: lastRowData[2], processedBy: lastRowData[3] },
                history: values.slice(1).map(function(r) { return { status: r[0], plan: r[1], expiryDate: r[2], processedBy: r[3], timestamp: r[4] }; })
            };
          } else { data[name] = { current: { status: "Expired" }, history: [] }; }
      } else {
         var startRow = Math.max(1, lastRow - 300);
         var values = sheet.getRange(startRow, 1, lastRow - startRow + 1, sheet.getLastColumn()).getValues();
         if (startRow > 1) values.unshift(sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]);
         data[name] = values;
      }
    });
    return ResponseBuilder.build(data);
  },

  handleSearchHistory: function(ss, body) {
    var sheetName = body.sheet;
    var searchTerm = String(body.searchTerm || "").toLowerCase();
    var sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) return ResponseBuilder.error("Target sheet not found.");
    
    var data = sheet.getDataRange().getValues();
    if (data.length < 2) return ResponseBuilder.success([]);
    
    var headers = data[0];
    var results = [];
    
    // Search all rows (deep search)
    for (var i = 1; i < data.length; i++) {
        var row = data[i];
        var match = false;
        for (var j = 0; j < row.length; j++) {
            if (String(row[j]).toLowerCase().indexOf(searchTerm) > -1) {
                match = true;
                break;
            }
        }
        
        if (match) {
            var itemSize = {};
            headers.forEach(function(h, idx) {
                itemSize[h] = row[idx];
            });
            results.push(itemSize);
        }
    }
    
    // Last 100 search results
    return ResponseBuilder.success(results.reverse().slice(0, 100));
  }
};

var SystemHandlers = {
  handleBroadcast: function(ss, body) {
    var sheet = ss.getSheetByName('Messages');
    if (!sheet) return ResponseBuilder.error("Messages system offline.");
    sheet.appendRow([Date.now(), "SYSTEM", "Automated Console", "ALL", "[BROADCAST]: " + body.message, new Date().toISOString(), "Sent"]);
    return ResponseBuilder.success();
  },

  handleRequestInspection: function(ss, body) {
    var sheet = ss.getSheetByName('Inspection_Requests');
    if (!sheet) {
        sheet = ss.insertSheet('Inspection_Requests');
        sheet.appendRow(['ID', 'Requester', 'Role', 'Truck', 'Trailer', 'Type', 'Reason', 'Priority', 'AssignedTo', 'Status', 'Timestamp']);
    }
    var requestId = "REQ-" + Date.now();
    sheet.appendRow([requestId, body.requester, body.role, body.truckNo, body.trailerNo || "", body.type, body.reason, body.priority, body.assignedInspector || "Unassigned", "Pending", new Date().toISOString()]);
    return ResponseBuilder.success({ requestId: requestId });
  },

  handleUpdateSettings: function(ss, body) {
    var sheet = ss.getSheetByName('System_Settings');
    if (!sheet) {
        sheet = ss.insertSheet('System_Settings');
        sheet.appendRow(['Company_Name', 'Manager_Email', 'Last_Updated', 'Updated_By', 'Maintenance_Mode', 'Logo_Data', 'Mobile_Link', 'Web_Link', 'Maintenance_Msg', 'Payment_Key']);
    }
    var row = [body.companyName, body.managerEmail, new Date(), "Admin", body.maintenanceMode ? "TRUE" : "FALSE", body.companyLogo, body.mobileApkLink, body.webAppUrl, body.maintenanceMessage, body.flutterwaveSecretKey, body.templates ? JSON.stringify(body.templates) : ""];
    if (sheet.getLastRow() < 2) sheet.appendRow(row);
    else sheet.getRange(2, 1, 1, row.length).setValues([row]);
    return ResponseBuilder.success();
  },

  /**
   * Professional Server-Side PDF Generator
   * Eliminates blank pages by rendering HTML in the cloud
   */
  handleGenerateReportPDF: function(ss, body) {
    try {
      if (!body.reportData) return ResponseBuilder.error("Missing report data payload.");
      
      if (typeof PDFGenerator === 'undefined') {
        return ResponseBuilder.error("PDF Engine component missing. Please update your backend script.");
      }
      
      var reportHtml = PDFGenerator.create(body.reportData);
      var blob = Utilities.newBlob(reportHtml, 'text/html').getAs('application/pdf');
      var base64Pdf = Utilities.base64Encode(blob.getBytes());
      
      return ResponseBuilder.success({ 
        base64: base64Pdf,
        filename: (body.reportData.truckNo || "Report") + "_Inspection.pdf"
      });
    } catch (err) {
      return ResponseBuilder.error("PDF Engine Error: " + err.toString());
    }
  }
};

var SubscriptionHandlers = {
  handleCheckSubscription: function(ss) {
    var sheet = ss.getSheetByName('Subscription_Data');
    if (!sheet || sheet.getLastRow() < 2) return ResponseBuilder.success({ status: "Expired" });
    var lastRow = sheet.getRange(sheet.getLastRow(), 1, 1, 4).getValues()[0];
    return ResponseBuilder.success({ status: lastRow[0], plan: lastRow[1], expiryDate: lastRow[2] });
  },
  handleExtendSubscription: function(ss, body) {
    var sheet = ss.getSheetByName('Subscription_Data');
    if (!sheet) {
      sheet = ss.insertSheet('Subscription_Data');
      sheet.appendRow(['Status', 'Plan', 'ExpiryDate', 'ProcessedBy', 'Timestamp']);
    }
    sheet.appendRow([body.status || "Active", body.plan || "Standard", body.expiryDate, "Admin", new Date().toISOString()]);
    return ResponseBuilder.success();
  }
};

var PaymentHandlers = {
  handleMobileMoney: function(ss, body) {
    return ResponseBuilder.success({ message: "Mock Payment: Payment prompt sent to " + body.phoneNumber });
  }
};`;