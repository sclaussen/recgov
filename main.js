'use strict';
const d = require('debug')('reserve');
const Config = require('./Config');
const p = require('./pr').p(d);
const p4 = require('./pr').p4(d);


main()


async function main() {
    let config = new Config();
    p4(config.getCampgrounds());
}
