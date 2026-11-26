/**
 * Send a consistent JSON API response: { success, message, data }.
 */
function sendResponse(res, statusCode, success, message, data = null) {
  return res.status(statusCode).json({
    success,
    message,
    data,
  });
}

module.exports = { sendResponse };
