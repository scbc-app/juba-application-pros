/**
 * 1_Controller.gs - Main entry points and request routing.
 */

export const CODE_1_CONTROLLER = `/**
 * 1_Controller.gs - Main entry points and request routing.
 */

function doPost(e) {
  const lock = LockService.getScriptLock();
  // Professional 30s lock to prevent race conditions during multi-user submissions
  lock.tryLock(30000); 
  
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const body = e.postData ? JSON.parse(e.postData.contents) : {};
    return routeRequest(ss, body);
  } catch (err) {
    return ResponseBuilder.error("System Exception: " + err.toString());
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return DataHandlers.handleGetRequest(ss);
}

function routeRequest(ss, body) {
  const action = body.action;
  const routes = {
    'login': () => AuthHandlers.handleLogin(ss, body),
    'register_user': () => AuthHandlers.handleRegisterUser(ss, body),
    'get_users': () => AuthHandlers.handleGetUsers(ss),
    'delete_user': () => AuthHandlers.handleDeleteUser(ss, body),
    'update_user': () => AuthHandlers.handleUpdateUser(ss, body),
    'heartbeat': () => AuthHandlers.handleHeartbeat(ss, body),
    'mark_read': () => AuthHandlers.handleMarkRead(ss, body),
    'manage_fleet': () => SystemHandlers.handleManageFleet(ss, body),
    'bulk_manage_fleet': () => SystemHandlers.handleBulkManageFleet(ss, body),
    'acknowledge_issue': () => SystemHandlers.handleAcknowledgeIssue(ss, body),
    'request_inspection': () => SystemHandlers.handleRequestInspection(ss, body),
    'get_acknowledgements': () => SystemHandlers.handleGetAcknowledgements(ss),
    'mark_notification_read': () => SystemHandlers.handleMarkNotificationRead(ss, body),
    'update_settings': () => SystemHandlers.handleUpdateSettings(ss, body),
    'broadcast': () => SystemHandlers.handleBroadcast(ss, body),
    'acknowledge_notification': () => SystemHandlers.handleAcknowledgeNotification(ss, body),
    'check_subscription': () => SubscriptionHandlers.handleCheckSubscription(ss),
    'extend_subscription': () => SubscriptionHandlers.handleExtendSubscription(ss, body),
    'submit_support_ticket': () => SupportHandlers.handleSubmitSupport(ss, body),
    'get_tickets': () => SupportHandlers.handleGetTickets(ss, body),
    'update_ticket': () => SupportHandlers.handleUpdateTicket(ss, body),
    'initiate_mobile_payment': () => PaymentHandlers.handleMobileMoney(ss, body),
    'generate_report_pdf': () => SystemHandlers.handleGenerateReportPDF(ss, body),
    'search_history': () => DataHandlers.handleSearchHistory(ss, body)
  };
  
  if (!action || action === 'create' || !routes[action]) {
    return DataHandlers.handleDataSubmission(ss, body);
  }
  return routes[action]();
}`;