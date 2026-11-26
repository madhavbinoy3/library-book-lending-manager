const mongoose = require('mongoose');

const BOOK_CATEGORIES = [
  'Fiction',
  'Science',
  'History',
  'Technology',
  'Biography',
  'Other',
];

const bookSchema = new mongoose.Schema(
  {
    bookCode: {
      type: String,
      required: true,
      unique: true,
      immutable: true,
      trim: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },
    author: {
      type: String,
      required: [true, 'Author is required'],
      trim: true,
    },
    isbn: {
      type: String,
      required: [true, 'ISBN is required'],
      unique: true,
      immutable: true,
      trim: true,
      match: [/^(\d{10}|\d{13})$/, 'ISBN must contain exactly 10 or 13 digits'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: {
        values: BOOK_CATEGORIES,
        message: 'Category must be one of Fiction, Science, History, Technology, Biography, Other',
      },
      immutable: true,
    },
    totalCopies: {
      type: Number,
      required: [true, 'Total copies is required'],
      min: [1, 'Total copies must be at least 1'],
      max: [20, 'Total copies cannot exceed 20'],
      validate: {
        validator: Number.isInteger,
        message: 'Total copies must be a whole number',
      },
    },
    availableCopies: {
      type: Number,
      required: true,
      min: [0, 'Available copies cannot be negative'],
      validate: {
        validator: function (value) {
          return Number.isInteger(value) && value <= this.totalCopies;
        },
        message: 'Available copies must be an integer between 0 and total copies',
      },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = {
  Book: mongoose.model('Book', bookSchema),
  BOOK_CATEGORIES,
};
