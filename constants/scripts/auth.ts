/**
 * 2_AuthAndAdmin.gs
 * Handles authentication and staff management.
 */

export const CODE_2_AUTH_AND_ADMIN = `/**
 * 2_AuthAndAdmin.gs - Authentication & User Management
 */

const AuthHandlers = {
  handleLogin: function(ss, body) {
    let userSheet = ss.getSheetByName('Users');
    if (!userSheet) return ResponseBuilder.error("Database Configuration Error: 'Users' sheet not found.");
    const data = userSheet.getDataRange().getValues();
    const username = body.username.toLowerCase().trim();
    
    for (let i = 1; i < data.length; i++) {
        const storedUser = String(data[i][1]).toLowerCase().trim();
        const storedPass = String(data[i][2]);
        const storedName = String(data[i][3]);
        const userRole = data[i][4];
        const userId = data[i][0];

        if (storedUser === username) {
            const passwordMatch = (storedPass === body.password);
            const isNewUserInvite = (storedName === "" && storedPass === "" && body.password === "");

            if (passwordMatch || isNewUserInvite) {
                const isEnabled = data[i][8] === undefined || data[i][8] === "" || String(data[i][8]).toUpperCase() === "TRUE";
                if (!isEnabled) return ResponseBuilder.error("Account Access Disabled.", "ACCOUNT_DISABLED");

                userSheet.getRange(i + 1, 10).setValue(new Date().toISOString());
                let prefs = {};
                try { if (data[i][7]) prefs = JSON.parse(data[i][7]); } catch(e) {}

                return ResponseBuilder.success({ 
                  user: { id: userId, username: storedUser, name: storedName, role: String(userRole).trim(), position: data[i][5] || '', preferences: prefs, isActive: isEnabled } 
                });
            }
        }
    }
    return ResponseBuilder.error("Invalid credentials.", "INVALID_CREDENTIALS");
  },

  handleHeartbeat: function(ss, body) {
    let msgSheet = ss.getSheetByName('Messages');
    if (!msgSheet) return ResponseBuilder.error("Messages sheet missing");
    const username = body.username.toLowerCase();
    const statusType = body.isTyping ? "Typing" : "Presence";
    const now = new Date().toISOString();
    
    const data = msgSheet.getDataRange().getValues();
    let foundIndex = -1;
    for (let i = data.length - 1; i >= Math.max(1, data.length - 200); i--) {
      if (String(data[i][1]).toLowerCase() === username && data[i][4] === "HB") {
        foundIndex = i; break;
      }
    }

    if (foundIndex !== -1) {
      msgSheet.getRange(foundIndex + 1, 6).setValue(now);
      msgSheet.getRange(foundIndex + 1, 7).setValue(statusType);
    } else {
      msgSheet.appendRow(["HB-" + Date.now(), body.username, body.name || "User", "ALL", "HB", now, statusType]);
    }
    return ResponseBuilder.success();
  },

  handleRegisterUser: function(ss, body) {
    let userSheet = ss.getSheetByName('Users');
    if (!userSheet) {
        userSheet = ss.insertSheet('Users');
        userSheet.appendRow(["ID", "Username", "Password", "Name", "Role", "Position", "Registered_At", "Preferences", "Enabled", "Last_Seen", "Is_Typing"]);
        userSheet.setFrozenRows(1);
    }
    const newUsername = String(body.username).trim().toLowerCase();
    const id = "USR-" + Date.now();
    const defaultPrefs = JSON.stringify({ emailNotifications: true, notifyGeneral: true, notifyPetroleum: true, notifyAcid: true });
    userSheet.appendRow([id, newUsername, body.password || "", body.name || "", String(body.role).trim(), body.position || "", new Date().toISOString(), defaultPrefs, "TRUE", "", "FALSE"]);
    
    if (typeof EmailHandlers !== 'undefined' && EmailHandlers.sendInvitation) {
      EmailHandlers.sendInvitation(newUsername, body.role, "Fleet Portal");
    }
    return ResponseBuilder.success({ message: "User registered." });
  },

  handleUpdateUser: function(ss, body) {
    let sheet = ss.getSheetByName('Users');
    if (!sheet) return ResponseBuilder.error("Users sheet missing");
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][1].toLowerCase() === (body.originalUsername || body.username).toLowerCase()) {
        if (body.username) sheet.getRange(i + 1, 2).setValue(body.username.toLowerCase());
        if (body.password) sheet.getRange(i + 1, 3).setValue(body.password);
        if (body.name) sheet.getRange(i + 1, 4).setValue(body.name);
        if (body.role) sheet.getRange(i + 1, 5).setValue(String(body.role).trim());
        if (body.position !== undefined) sheet.getRange(i + 1, 6).setValue(body.position);
        if (body.isActive !== undefined) sheet.getRange(i + 1, 9).setValue(body.isActive ? "TRUE" : "FALSE");
        if (body.preferences) sheet.getRange(i + 1, 8).setValue(JSON.stringify(body.preferences));
        return ResponseBuilder.success();
      }
    }
    return ResponseBuilder.error("User not found");
  },

  handleGetUsers: function(ss) {
    let userSheet = ss.getSheetByName('Users');
    if (!userSheet) return ResponseBuilder.success({ users: [] });
    const userData = userSheet.getDataRange().getValues();
    const users = userData.slice(1).map(r => ({ 
      id: r[0], username: r[1], name: r[3], role: r[4], position: r[5], lastLogin: r[6],
      isActive: r[8] === undefined || r[8] === "" || String(r[8]).toUpperCase() === "TRUE"
    }));
    return ResponseBuilder.success({ users });
  }
};`;