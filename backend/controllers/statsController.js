const { Book } = require('../models/Book');
const Loan = require('../models/Loan');
const { sendResponse } = require('../utils/apiResponse');
const { getTodayCalendarUTC } = require('../utils/dateUtils');

/**
 * GET /api/stats
 * Computes library-wide lending statistics.
 */
async function getStats(req, res, next) {
  try {
    const todayUTC = getTodayCalendarUTC();

    const [bookAgg, copiesIssued, overdueLoans, fineAgg] = await Promise.all([
      Book.aggregate([
        {
          $group: {
            _id: null,
            totalTitles: { $sum: 1 },
            totalCopies: { $sum: '$totalCopies' },
          },
        },
      ]),
      Loan.countDocuments({ status: 'Issued' }),
      Loan.countDocuments({ status: 'Issued', dueDate: { $lt: todayUTC } }),
      Loan.aggregate([
        { $match: { status: 'Returned' } },
        {
          $group: {
            _id: null,
            totalFineCollected: { $sum: '$fine' },
          },
        },
      ]),
    ]);

    const totalTitles = bookAgg[0]?.totalTitles || 0;
    const totalCopies = bookAgg[0]?.totalCopies || 0;
    const totalFineCollected = fineAgg[0]?.totalFineCollected || 0;

    return sendResponse(res, 200, true, 'Statistics fetched successfully', {
      totalTitles,
      totalCopies,
      copiesIssued,
      overdueLoans,
      totalFineCollected,
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { getStats };
