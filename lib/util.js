'use strict';


const d = require('debug');
const clicolor = require('cli-color');


function p(d) {
    let d2 = debug(d, false);

    return function(s, v) {
        if (!d.enabled) {
            return;
        }

        if (v) {
            d2(clicolor.yellowBright(s) + ': ' + clicolor.blueBright(JSON.stringify(v)));
        } else {
            d2(clicolor.yellowBright(s));
        }
    };
}


function p4(d) {
    let d2 = debug(d, false);

    return function(s, v) {
        if (!d.enabled) {
            return;
        }

        if (v) {
            d2(clicolor.yellowBright(s) + ': ' + clicolor.blueBright(JSON.stringify(v, null, 4)));
        } else {
            d2(clicolor.yellowBright(s));
        }
    };
}


function e(d) {
    let d2 = debug(d);

    return function(s, v) {
        if (!d.enabled) {
            return;
        }

        d2(yellow(' '));
        d2(yellow(' '));
        d2(clicolor.yellowBright('==============================================================================='));

        if (v) {
            d2(clicolor.yellowBright('Entering: ' + s + ': ' + JSON.stringify(v)));
        } else {
            d2(clicolor.yellowBright('Entering: ' + s));
        }
    };
}


function e4(d) {
    let d2 = debug(d);

    return function(s, v) {
        if (!d.enabled) {
            return;
        }

        d2(yellow(' '));
        d2(yellow(' '));
        d2(clicolor.yellowBright('==============================================================================='));

        if (v) {
            d2(clicolor.yellowBright('Entering: ' + s + ': ' + JSON.stringify(v, null, 4)));
        } else {
            d2(clicolor.yellowBright('Entering: ' + s));
        }
    };
}


function ex(d) {
    let d2 = debug(d);

    return function(s, v) {
        if (!d.enabled) {
            return;
        }

        if (v) {
            d2(clicolor.yellowBright('Exiting: ' + s + ': ' + JSON.stringify(v)));
        } else {
            d2(clicolor.yellowBright('Exiting: ' + s));
        }

        d2(clicolor.yellowBright('----------------------------------------'));
    };
}


function ex4(d) {
    let d2 = debug(d);

    return function(s, v) {
        if (!d.enabled) {
            return;
        }

        if (v) {
            d2(clicolor.yellowBright('Exiting: ' + s + ': ' + JSON.stringify(v, null, 4)));
        } else {
            d2(clicolor.yellowBright('Exiting: ' + s));
        }

        d2(clicolor.yellowBright('----------------------------------------'));
    };
}


module.exports.p = p;
module.exports.p4 = p4;
module.exports.e = e;
module.exports.e4 = e4;
module.exports.ex = ex;
module.exports.ex4 = ex4;
