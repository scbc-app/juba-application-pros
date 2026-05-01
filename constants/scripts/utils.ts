
/**
 * 5_LibAndUtils.gs - Helpers, Robust Email Engine & PDF Templates
 */

// Fix: Wrapped GAS code in an exported string to make it a module and resolve TypeScript environment errors for GAS globals.
export const CODE_5_LIB_AND_UTILS = `
const ResponseBuilder = {
  success: function(data) { 
    if (data === void 0) { data = {}; }
    return this.build(Object.assign({ status: "success" }, data)); 
  },
  error: function(message, code) {
    if (code === void 0) { code = null; }
    // Fix: Used dynamic property assignment to allow 'code' on the response object
    var response = { status: "error", message: message };
    if (code)
      response["code"] = code;
    return this.build(response);
  },
  build: function(data) {
    // ContentService is a Google Apps Script global object
    return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
  }
};

const Validation = {
  updateFromRow: function(ss, body) {
     try {
       const row = body.row;
       const sheetName = body.sheet;
       
       // Only update registry for valid inspection modules
       const validModules = ['General', 'Petroleum', 'Petroleum_V2', 'Acid'];
       if (validModules.indexOf(sheetName) === -1) return;

       // BASE_HEADERS mapping (consistent across all modules)
       // 0: id, 1: timestamp, 2: truckNo, 3: trailerNo, 4: inspectedBy, 5: driverName, 6: location
       let truck = row[2];
       let trailer = row[3];
       let inspector = row[4];
       let driver = row[5];
       let location = row[6];

       this.updateSingle(ss, 'Truck_Reg_No', truck);
       this.updateSingle(ss, 'Trailer_Reg_No', trailer);
       this.updateSingle(ss, 'Driver_Name', driver);
       this.updateSingle(ss, 'Inspector_Name', inspector);
       this.updateSingle(ss, 'Location', location);
     } catch (e) {}
  },
  updateSingle: function(ss, headerName, value) {
     if (!value || String(value).trim() === "") return;
     let valStr = String(value).trim();
     
     // PRO-SEC: Extreme sanitization to prevent injection & data pollution
     // 1. Strip HTML/Script tags
     valStr = valStr.replace(/<\/?[^>]+(>|$)/g, "");
     // 2. Normalize whitespace
     valStr = valStr.replace(/\s+/g, ' ');
     
     // PRO-VAL: Data integrity check before adding to registry
     const isReg = (headerName === 'Truck_Reg_No' || headerName === 'Trailer_Reg_No');
     
     // 1. Filter out obvious system tokens, messages & suspicious entropy strings
     if (valStr.startsWith('[BROADCAST]') || valStr.indexOf('sent to') > -1 || valStr.length < 2) return;
     if (['SuperAdmin', 'Admin', 'undefined', 'null', 'N/A', '[HB]', 'System', 'Inspector'].indexOf(valStr) > -1) return;
     
     // 2. Specific field validation (Length & Type constraints)
     if (isReg) {
         if (valStr.length > 20 || valStr.indexOf('@') > -1 || valStr.split(' ').length > 4) return;
         if (/^\d$/.test(valStr)) return; // No single-digit ratings in reg fields
     } else if (headerName === 'Driver_Name' || headerName === 'Location') {
         if (/^[1-5]$/.test(valStr)) return; // No ratings in names
         if (valStr.startsWith('ID-') || valStr.startsWith('REQ-')) return;
         if (valStr.length > 50) return; // Name/Location length limit
     }

     let vSheet = ss.getSheetByName('Validation_Data');
     if (!vSheet) {
        vSheet = ss.insertSheet('Validation_Data');
        vSheet.appendRow(['Truck_Reg_No', 'Trailer_Reg_No', 'Driver_Name', 'Inspector_Name', 'Location', 'Position']);
        vSheet.setFrozenRows(1);
     }
     const headers = vSheet.getRange(1, 1, 1, vSheet.getLastColumn()).getValues()[0];
     let colIndex = headers.indexOf(headerName) + 1;
     if (colIndex < 1) {
         colIndex = headers.length + 1;
         vSheet.getRange(1, colIndex).setValue(headerName);
     }
     const fullCol = vSheet.getRange(1, colIndex, vSheet.getMaxRows(), 1).getValues().flat().map(String);
     if (!fullCol.includes(valStr)) {
         let targetRow = 1;
         for(let i=1; i<fullCol.length; i++) {
             if(fullCol[i] === "") { targetRow = i + 1; break; }
         }
         if (targetRow === 1) targetRow = vSheet.getLastRow() + 1;
         vSheet.getRange(targetRow, colIndex).setValue(valStr);
     }
  }
};

const Logger = {
  log: function(ss, action, details) {
    let logSheet = ss.getSheetByName('System_Logs');
    if (!logSheet) {
        logSheet = ss.insertSheet('System_Logs');
        logSheet.appendRow(["Timestamp", "Action", "Details"]);
        logSheet.setFrozenRows(1);
    }
    logSheet.appendRow([new Date(), action, details]);
  }
};

const EmailHandlers = {
  sendEmailNotifications: function(ss, data, moduleName) {
    Logger.log(ss, "EMAIL_START", "Triggering for: " + moduleName);
    
    try {
      var recipients = [];
      var userSheet = ss.getSheetByName("Users");
      
      if (userSheet) {
          var users = userSheet.getDataRange().getValues();
          for (var i = 1; i < users.length; i++) {
             var userEmail = String(users[i][1]).trim(); 
             var rawPrefs = users[i][7];
             
             if (userEmail && userEmail.indexOf("@") > -1) {
                 try {
                     var prefs = rawPrefs ? JSON.parse(rawPrefs) : {};
                     var emailsEnabled = (prefs.emailNotifications !== false); 
                     
                     if (emailsEnabled) {
                         var shouldSend = false;
                         if (moduleName === "General" && (prefs.notifyGeneral !== false)) shouldSend = true;
                         else if (moduleName === "Petroleum" && (prefs.notifyPetroleum !== false)) shouldSend = true;
                         else if (moduleName === "Petroleum_V2" && (prefs.notifyPetroleumV2 !== false)) shouldSend = true;
                         else if (moduleName === "Acid" && (prefs.notifyAcid !== false)) shouldSend = true;
                         else if (prefs.notifyGeneral !== false) shouldSend = true; // Safe default
                         
                         if (shouldSend) recipients.push(userEmail);
                     }
                 } catch(e) { recipients.push(userEmail); }
             }
          }
      }

      if (recipients.length === 0) {
          var settingsSheet = ss.getSheetByName("System_Settings");
          if (settingsSheet && settingsSheet.getLastRow() >= 2) {
              var mgrEmail = settingsSheet.getRange(2, 2).getValue();
              if (mgrEmail && String(mgrEmail).indexOf("@") > -1) {
                  recipients.push(String(mgrEmail).trim());
                  Logger.log(ss, "EMAIL_FALLBACK", "Using Manager Email: " + mgrEmail);
              }
          }
      }

      if (recipients.length === 0) {
          Logger.log(ss, "EMAIL_ABORT", "No valid recipients found in database.");
          return;
      }
      
      var row = data.row;
      var truckNo = "N/A", inspector = "N/A", rating = "N/A", safeToLoad = "N/A";
      
      if (moduleName === "General") {
          truckNo = row[2] || "UNIT"; 
          inspector = row[4] || "Inspector"; 
          rating = row[8] || "0";
          safeToLoad = row[10] || "Not Specified";
      } else {
          truckNo = row[2] || "UNIT"; 
          inspector = row[7] || "Inspector"; 
          rating = row[9] || "0";
          safeToLoad = row[10] || "Not Specified";
      }

      var statusColor = "#10b981";
      var statusText = "PASSED";
      // Fix: Applied explicit Number conversion to resolve comparison operator error between string and number
      if (Number(rating) <= 3) { statusColor = "#f59e0b"; statusText = "WARNING"; } 
      if (Number(rating) <= 2) { statusColor = "#ef4444"; statusText = "CRITICAL FAIL"; }

      var htmlBody = 
          "<div style='margin: 0; padding: 0; width: 100% !important; background-color: #f8fafc; font-family: Helvetica, Arial, sans-serif;'>" +
              "<div style='max-width: 600px; width: 95%; margin: 20px auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);'>" +
                  "<div style='background-color: #0f172a; padding: 30px 20px; text-align: center;'>" +
                      "<h2 style='color: #ffffff; margin: 0; font-size: 18px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase;'>Inspection Report</h2>" +
                  "</div>" +
                  "<div style='padding: 30px 20px; color: #1e293b;'>" +
                      "<p style='margin-top: 0; font-size: 14px; line-height: 1.5;'>A new <strong>" + moduleName + "</strong> inspection has been submitted. Summary details are provided below.</p>" +
                      "<div style='background-color: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #f1f5f9; margin: 25px 0;'>" +
                          "<table style='width: 100%; border-collapse: collapse; table-layout: fixed;'>" +
                              "<tr>" +
                                  "<td style='padding: 8px 0; color: #94a3b8; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; width: 40%;'>Truck No</td>" +
                                  "<td style='padding: 8px 0; color: #0f172a; font-size: 15px; font-weight: 800; text-align: right; overflow-wrap: break-word;'>" + truckNo + "</td>" +
                              "</tr>" +
                              "<tr>" +
                                  "<td style='padding: 8px 0; color: #94a3b8; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;'>Inspected By</td>" +
                                  "<td style='padding: 8px 0; color: #0f172a; font-size: 15px; font-weight: 600; text-align: right; overflow-wrap: break-word;'>" + inspector + "</td>" +
                              "</tr>" +
                              "<tr>" +
                                  "<td style='padding: 8px 0; color: #94a3b8; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;'>Rating</td>" +
                                  "<td style='padding: 8px 0; text-align: right;'>" +
                                      "<span style='color: " + statusColor + "; font-weight: 900; font-size: 16px;'>" + statusText + " (" + rating + "/5)</span>" +
                                  "</td>" +
                              "</tr>" +
                              "<tr>" +
                                  "<td style='padding: 12px 0 8px 0; color: #94a3b8; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; border-top: 1px solid #e2e8f0;'>Safe To Load</td>" +
                                  "<td style='padding: 12px 0 8px 0; text-align: right; border-top: 1px solid #e2e8f0;'>" +
                                      "<span style='color: " + (String(safeToLoad).toUpperCase() === 'YES' ? '#10b981' : '#ef4444') + "; font-weight: 900; font-size: 16px;'>" + String(safeToLoad).toUpperCase() + "</span>" +
                                  "</td>" +
                              "</tr>" +
                          "</table>" +
                      "</div>" +
                      "<p style='font-size: 13px; line-height: 1.6; color: #64748b;'>The full inspection report is attached as a PDF for your records.</p>" +
                      "<div style='margin-top: 30px; padding-top: 20px; border-top: 1px solid #f1f5f9; text-align: center;'>" +
                          "<p style='font-size: 10px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin: 0;'>Automated Message: No Reply Required</p>" +
                          "<p style='font-size: 9px; color: #cbd5e1; margin-top: 8px; font-weight: 500;'>Technical Note: This service utilizes Google Workspace API and Cloud infrastructure for secure data processing.</p>" +
                      "</div>" +
                  "</div>" +
              "</div>" +
          "</div>";

      var blobs = [];
      if (data.reportData) {
          try {
              var reportHtml = PDFGenerator.create(data.reportData);
              // Utilities is a Google Apps Script global object
              var pdfBlob = Utilities.newBlob(reportHtml, 'text/html')
                  .getAs('application/pdf')
                  .setName(String(truckNo).replace(/\\s/g, '_') + '_' + moduleName + '_Report.pdf');
              blobs.push(pdfBlob);
          } catch (e) { Logger.log(ss, "PDF_GEN_FAIL", e.toString()); }
      }

      var subject = "Inspection Report: " + truckNo + " [" + statusText + "]";
      var emailOptions = {
          htmlBody: htmlBody,
          name: "Fleet Inspection", 
          from: "notification@sallychanza.com",
          replyTo: "notification@sallychanza.com",
          attachments: blobs
      };

      if (recipients.length > 1) {
          // Fix: Used dynamic property assignment to avoid property existence error on literal object
          emailOptions["bcc"] = recipients.slice(1).join(",");
      }

      // GmailApp is a Google Apps Script global object
      GmailApp.sendEmail(recipients[0], subject, "HTML Required", emailOptions);
      Logger.log(ss, "EMAIL_DISPATCHED", "To: " + recipients[0] + " + " + (recipients.length-1) + " others.");

    } catch (err) {
        Logger.log(ss, "EMAIL_SYSTEM_FATAL", err.toString());
    }
  },

  sendInvitation: function(email, role, orgName) {
    const subject = "Access Invitation: " + orgName;
    const htmlBody = '<div style="font-family: Arial, sans-serif; padding: 32px; border: 1px solid #f1f5f9; border-radius: 20px; max-width: 600px; color: #0f172a; background: #ffffff;">' +
      '<h2 style="color: #4f46e5; margin-bottom: 20px; font-size: 22px; font-weight: 800; letter-spacing: -0.02em;">Welcome to the Portal</h2>' +
      '<p style="font-size: 15px; line-height: 1.6; color: #475569;">You have been enrolled as a fleet auditor for <strong>' + orgName + '</strong>.</p>' +
      '<div style="background: #f8fafc; padding: 24px; border-radius: 16px; margin: 24px 0; border: 1px solid #f1f5f9;">' +
        '<p style="margin: 0 0 10px 0; font-size: 12px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px;">Access Credentials</p>' +
        '<p style="margin: 0; font-size: 14px; font-weight: 600;">Role: ' + role + '</p>' +
        '<p style="margin: 4px 0 0 0; font-size: 14px; font-weight: 600;">ID: ' + email + '</p>' +
      '</div>' +
      '<p style="font-size: 14px; line-height: 1.6; color: #64748b;">Sign in with your email. Leave the password blank for your initial setup.</p>' +
    '</div>';

    try {
      // MailApp is a Google Apps Script global object
      MailApp.sendEmail(email, subject, "Invitation", { htmlBody: htmlBody });
    } catch (e) {}
  }
};

const PDFGenerator = {
  create: function(data) {
    const title = (data.title || "").toUpperCase();
    
    if (title.indexOf('GENERAL') > -1) {
       return GeneralReportTemplate.generate(data);
    }
    if (title.indexOf('PETROLEUM') > -1 && title.indexOf('V2') > -1) {
       return PetroleumV2ReportTemplate.generate(data);
    }
    if (title.indexOf('PETROLEUM') > -1) {
       return PetroleumV1ReportTemplate.generate(data);
    }
    if (title.indexOf('ACID') > -1) {
       return AcidReportTemplate.generate(data);
    }
    
    return this.createGenericReport(data);
  },
  
  createGenericReport: function(data) {
    return "<html><body><h1>" + (data.title || "Inspection Report") + "</h1><p>Date: " + (data.timestamp || new Date().toISOString()) + "</p><p>Data captured successfully, but no matching template was found for this report type.</p></body></html>";
  }
};
`;
