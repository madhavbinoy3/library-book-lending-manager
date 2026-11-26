const express = require('express');
const { returnBook } = require('../controllers/loanController');

const router = express.Router();

router.post('/:loanId/return', returnBook);
router.patch('/:loanId/return', returnBook);

module.exports = router;
