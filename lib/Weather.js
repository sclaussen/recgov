'use strict';
const d = require('debug')('reserve');

const _ = require('lodash');
const moment = require('moment');

const curl = require('./lib/curl');
const p = require('./lib/pr').p(d);
const p4 = require('./lib/pr').p4(d);


module.exports = class Weather {


    static cache = {};
    latitude = 0;
    longitude = 0;
    key = '';


    constructor(latitude, longitude) {
        this.latitude = latitude;
        this.longitude = longitude;
        this.key = this.latitude + ':' + this.longitude;
    }


    async init(date) {
        if (!Weather.cache[this.key]) {
            let rawForecast = (await curl.get('https://api.openweathermap.org/data/2.5/onecall?exclude=current,minutely,hourly,alerts&lat=' + this.latitude + '&lon=' + this.longitude + '&appid=' + process.env.OPENWEATHER + '&units=imperial&lang=en')).body;
            Weather.cache[this.key] = {};
            for (let day of rawForecast.daily) {
                let date = moment.utc(day.dt, 'X').format('dddd MM/DD');
                Weather.cache[this.key][date] = {
                    date: date,
                    min: Math.round(day.temp.min),
                    max: Math.round(day.temp.max),
                    wind: Math.round(day.wind_speed),
                    description: day.weather[0].description
                };
            }
        }

        return Weather.cache[this.key];
    }
}
