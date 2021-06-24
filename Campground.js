'use strict';
const d = require('debug')('reserve');

const _ = require('lodash');
const moment = require('moment');

const p = require('./pr').p(d);
const p4 = require('./pr').p4(d);
const curl = require('./curl');

const Weather = require('./Weather');


module.exports = class Campground {


    static cache = {};
    id = 0;


    constructor(id) {
        this.id = id;
    }


    async init() {
        if (!Campground.cache[this.id]) {
            let campgroundResponse = (await curl.get('https://www.recreation.gov/api/search?fq=entity_type:campground&fq=entity_id:' + this.id)).body.results[0];
            let releaseResponse = (await curl.get('https://www.recreation.gov/api/camps/campgrounds/' + this.id + '/releases')).body;
            let weather = await (new Weather(campgroundResponse.latitude, campgroundResponse.longitude)).init();
            // let destinationResponse = await curl.get('https://www.recreation.gov/api/search?fq=entity_type%3Arecarea&fq=entity_id%3A2893');

            let campground = {
                name: this.capitalize(campgroundResponse.name),
                id: this.id,
                url: 'https://www.recreation.gov/camping/campgrounds/' + this.id + '/availability',
                latitude: campgroundResponse.latitude,
                longitude: campgroundResponse.longitude,
                destination: {
                    name: this.capitalize(campgroundResponse.parent_name),
                    id: campgroundResponse.parent_id,
                    url: 'https://www.recreation.gov/camping/gateways/' + campgroundResponse.parent_id,
                },
                release: {
                    date: moment.utc(releaseResponse.next_release.release_time).format('MM/DD'),
                    period_begin: moment.utc(releaseResponse.next_release.end).subtract(1, 'months').format('MM/DD'),
                    period_end: moment.utc(releaseResponse.next_release.end).format('MM/DD')
                },
                weather: weather
            };

            Campground.cache[this.id] = campground;
        }

        return Campground.cache[this.id];
    }


    capitalize(s) {
        let s2;
        for (let seg of s.split(' ')) {
            if (!s2) {
                s2 = _.capitalize(seg);
                continue;
            }
            s2 += ' ' + _.capitalize(seg);
        }

        s2 = s2.replace(' National Parks', 'NatPark');
        s2 = s2.replace(' National Park', 'NatPark');
        s2 = s2.replace(' National Forest', 'NatFor');
        s2 = s2.replace(' Campground', '');
        s2 = s2.replace('-sequoia And Kings Canyon National Park', 'NatPark');
        s2 = s2.replace('-sequoia And Kings Canyon', 'NatPark');
        s2 = s2.replace(' National Recreation Area', 'NatRec');
        s2 = s2.replace(' (ut)', '');

        return s2;
    }
}
