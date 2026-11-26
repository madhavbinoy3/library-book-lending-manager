const mongoose = require('mongoose');

const loanSchema = new mongoose.Schema(
  {
    book: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Book',
      required: true,
      index: true,
    },
    memberName: {
      type: String,
      required: [true, 'Member name is required'],
      trim: true,
    },
    memberId: {
      type: String,
      required: [true, 'Member ID is required'],
      trim: true,
    },
    issueDate: {
      type: Date,
      required: true,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    returnDate: {
      type: Date,
      default: null,
    },
    fine: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ['Issued', 'Returned'],
      default: 'Issued',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Loan', loanSchema);
