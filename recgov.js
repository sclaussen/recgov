'use strict';
const d = require('debug')('recgov');

const fs = require('fs');
const util = require('util');
const _ = require('lodash');

const moment = require('moment');
const YAML = require('yaml');

const Config = require('./Config');
const Campground = require('./Campground');

const curl = require('./lib/curl');
const p = require('./lib/pr').p(d);
const p4 = require('./lib/pr').p4(d);


var campgrounds = [];
var availability = [];
var other = [];
var config = new Config();



// - Campground photos
//   https://www.recreation.gov/api/media/public/asset/232446
//
// - Weather API
//   https://weather-gov.github.io/api/general-faqs
//
// - Campground site metadata
//   curl 'https://www.recreation.gov/api/search/campsites?fq=asset_id%3A232446' | python -m json.tool
//
// - Campsite release information: what is released, when will new be released
//   curl 'https://www.recreation.gov/api/camps/campgrounds/232446/releases'
//
// - Campground Longitude & Latitude:
//   curl 'https://www.recreation.gov/api/search/amenities?fq=parent_asset_id%3A232446&size=500'
//
// - Location/Destination/Recarea Latitude & Longitude:
//   https://www.recreation.gov/api/search?fq=entity_type%3Arecarea&fq=entity_id%3A2893
recgov(process.argv);


async function recgov(args) {

    for (let campgroundId of config.campgrounds) {

        // Get the basic overview information about each of the
        // config's "active" campgrounds and their destinations.
        //
        // name: Upper Pines
        // id: 232447
        // url: https://www.recreation.gov/camping/campgrounds/232447/availability
        // latitude: "37.73611110000000"
        // longitude: "-119.56250000000000"
        // destination:
        //   name: YosemiteNatPark
        //   id: "2991"
        //   url: https://www.recreation.gov/camping/gateways/2991
        let campground = await (new Campground(campgroundId)).init();
        console.log(campground.name);
        process.stdout.write('    ');

        for (let month of getMonthsToQuery()) {
            // console.log(campground.name + ' ' + month.format('MMMM') + '...');
            process.stdout.write(month.format('MMMM') + '  ');

            let monthFormatted = month.format().replace('Z', '').replaceAll(':', '%3A') + '.000Z';
            let response = (await curl.get('https://www.recreation.gov/api/camps/availability/campground/' + campgroundId + '/month?start_date=' + monthFormatted)).body;
            for (let campsite of _.values(response.campsites)) {
                mineCampsite(campground, campsite);
            }
            // p4(availability);
            // p4(other);
        }
        console.log();
    }

    print();
}


// campsite_id: Internal ID
// site: site number
// campsite_reserve_type: Site-Specific
// campsite_type: [ CABIN ELECTRIC, CABIN NONELECTRIC, GROUP STANDARD NONELECTRIC, RV ELECTRIC, RV NONELECTRIC, STANDARD NONELECTRIC, TENT ONLY NONELECTRIC, MANAGEMENT ]
// capacity_rating: Single
// max_num_people: 6
// min_num_people: [ 0, 1 ]
// type_of_use: Overnight
// loop: Upper Pines
// quantities:
function mineCampsite(campground, campsite) {

    switch (campsite.campsite_type) {
    case 'CABIN ELECTRIC':
    case 'CABIN NONELECTRIC':
    case 'MANAGEMENT':
        return false;
    }

    for (let day of _.keys(campsite.availabilities)) {

        if (!available(campsite, day)) {
            continue;
        }

        let availableCampsite = {
            name: campsite.site,
            id: campsite.campsite_id,
            url: 'https://www.recreation.gov/camping/campsites/' + campsite.campsite_id,
            date: moment.utc(day).format('MM/DD'),
            dow: moment.utc(day).format('dddd'),
            status: campsite.availabilities[day],
            campground: campground
        };

        if (criteriaMet(availableCampsite)) {
            p4(availableCampsite);
            availability.push(availableCampsite);
        } else {
            p4(availableCampsite);
            other.push(availableCampsite);
        }
    }
}


function available(campsite, day) {

    // Is the campsite available on the given day?
    switch (campsite.availabilities[day]) {
    case 'Lottery':
    case 'Reserved':
    case 'Not Available':
    case 'Not Reservable':
    case 'Not Reservable Management':
        return false;
    }

    // Is the day actually in the past?
    let availabilityDate = moment.utc(day);
    let today = moment.utc().subtract(1, 'days');
    if (availabilityDate.isBefore(today)) {
        return false;
    }

    return true;
}


function criteriaMet(campsite) {
    if (config.getDates().includes(campsite.date)) {
        return true;
    }

    if (config.yaml.criteria.dow && config.yaml.criteria.dow.includes(campsite.dow)) {
        return true;
    }

    return false;
}


function getMonthsToQuery() {
    let month1 = moment().utc()
    month1.date(1);
    month1.hour(0);
    month1.minute(0);
    month1.second(0);
    month1.millisecond(0);

    let month2 = moment(month1).add(1, 'months');
    let month3 = moment(month2).add(1, 'months');
    let month4 = moment(month3).add(1, 'months');
    let month5 = moment(month3).add(1, 'months');
    return [ month1, month2, month3, month4, month5 ];
}


function print() {
    availability = _.sortBy(availability, [ 'date' ]);
    p4(availability);

    let date;
    for (let campsite of availability) {

        if (!date || campsite.date !== date) {
            date = campsite.date;
            console.log();
            console.log(campsite.dow + ' ' + date);
        }

        console.log(util.format('  %s %s %s %s %s %s',
                                campsite.campground.destination.name.padEnd(30),
                                (campsite.campground.name + ' (' + campsite.name + ')').padEnd(24),
                                campsite.url.padEnd(10),
                                minMax.padEnd(2),
                                wind.toString().padEnd(2),
                                description.padEnd(15)));
    }
}
