const express = require('express');
const router = express.Router();
const { getHomeData, getStats } = require('../../controllers/user/home.controller');

router.get('/home', getHomeData);
router.get('/stats', getStats);

module.exports = router;