const express = require('express');
const indexController = require('../controller/index');

const router = express.Router()

router.get('/', indexController.getIndex);

router.get('/unauthorized', indexController.getError403);

// should be in last
router.use('/', indexController.getError404);

module.exports = router;