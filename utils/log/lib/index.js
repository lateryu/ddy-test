'use strict';

const log = require('npmlog');

log.level = process.env.LOG_LEVEL ? process.env.LOG_LEVEL : 'info';
log.heading = 'ddy-test';
log.addLevel('success', 2000, { fg: 'green', bold: true});
log.headingStyle= { fg: 'red', bg: 'white'};
module.exports= log;
