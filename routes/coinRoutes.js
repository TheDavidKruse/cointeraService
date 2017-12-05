var express = require('express');
var router = express.Router();
var knex = require('../db/knex');
var coins = require('../coins');

/* GET coin data for the past day */
router.get('/1day/:coin', function(req, res, next) {
  res.send({
    'resp':'yes'
  })
});


module.exports = router;
