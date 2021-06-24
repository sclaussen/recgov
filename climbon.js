'use strict';

const util = require('util');

const d = require('debug')('climbon');
const moment = require('moment');

const curl = require('./curl');
const p = require('./pr').p(d);
const p4 = require('./pr').p4(d);


// {
//     name: 'Tuloumne Meadows',
//     lat: 37.874411191264414,
//     lon: -119.35695229981508
// },
// {
//     name: 'Half Dome',
//     lat: 37.874411191264414,
//     lon: -119.35695229981508
// },
var locations = [
    {
        name: 'Tollhouse Rock',
        lat: 37.02962908072303,
        lon: -119.3847128360106
    },
    {
        name: 'Split Rock',
        lat: 37.9117744399454,
        lon: -122.48518117530776
    }
];


main(process.argv);


async function main(args) {
    let forecasts = [];
    for (let location of locations) {
        let response = await curl.get('https://api.openweathermap.org/data/2.5/onecall?exclude=current,minutely,hourly,alerts&lat=' + location.lat + '&lon=' + location.lon + '&appid=24c9483eaad5ce0dd8350cf75a4f61dd&units=imperial&lang=en');
        add(forecasts, location, response.body);
    }
    printForecast(forecasts);
}


function add(forecasts, location, rawForecast) {

    console.log(JSON.stringify(rawForecast, null, 4));
    let forecast = {
        name: location.name,
        days: []
    }

    for (let rawDay of rawForecast.daily) {
        forecast.days.push({
            date: moment.utc(rawDay.dt, 'X').format('ddd MM/DD'),
            min: Math.round(rawDay.temp.min),
            max: Math.round(rawDay.temp.max),
            wind: Math.round(rawDay.wind_speed),
            description: rawDay.weather[0].description
        });
    }

    forecasts.push(forecast);
}


function printForecast(forecasts) {

    p4(forecasts);

    const SPACE = 4;
    const LOCATION = 16;
    const DESCRIPTION = 15;
    const DAY = DESCRIPTION + 6 + 3;

    // Header
    process.stdout.write(util.format('%s', 'Location'.padEnd(LOCATION)));
    for (let day of forecasts[0].days) {
        process.stdout.write(util.format('%s%s', ' '.padEnd(SPACE), day.date.padEnd(DAY)));
    }
    console.log();


    for (let forecast of forecasts) {
        process.stdout.write(util.format('%s', forecast.name.padEnd(LOCATION)));
        for (let day of forecast.days) {
            process.stdout.write(util.format('%s%s/%s/%s %s',
                                             ' '.padEnd(SPACE),
                                             day.max.toString().padEnd(2),
                                             day.min.toString().padStart(2),
                                             day.wind.toString().padEnd(2),
                                             day.description.padEnd(DESCRIPTION)));
        }
        console.log();
    }
}
