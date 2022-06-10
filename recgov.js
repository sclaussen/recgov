'use strict'
process.env.DEBUG = 'recgov'
const d = require('debug')('recgov')

const fs = require('fs')
const util = require('util')
const _ = require('lodash')

const moment = require('moment')
const YAML = require('yaml')

const curl = require('./lib/curl')
const p = require('./lib/pr').p(d)
const p4 = require('./lib/pr').p4(d)

const Config = require('./Config')


var config
var campgrounds = []
var availability = []
var other = []



// - Campgrounds
//   curl 'https://www.recreation.gov/api/search?fq=entity_type:campground&fq=entity_id:232447' | python -m json.tool
//
// - Campsites
//   curl 'https://www.recreation.gov/api/camps/availability/campground/232447/month?start_date=2022-04-01T00%3A00%3A00.000Z' | python -m json.tool
recgov(process.argv)


async function recgov(args) {

    config = new Config()

    for (let campgroundConfig of config.campgrounds) {
        // Get the basic overview information about each of the
        // config's "active" campgrounds and their locations.
        let campgroundResponse = (await curl.get('https://www.recreation.gov/api/search?fq=entity_type:campground&fq=entity_id:' + campgroundConfig.id)).body.results[0]
        let campground = {
            name: massageName(campgroundResponse.name),
            id: campgroundConfig.id,
            url: 'https://www.recreation.gov/camping/campgrounds/' + campgroundConfig.id + '/availability',
            location: {
                name: massageName(campgroundResponse.parent_name),
                id: campgroundResponse.parent_id,
                url: 'https://www.recreation.gov/camping/gateways/' + campgroundResponse.parent_id
            }
        }
        // p4(campground)

        console.log(campground.name)
        process.stdout.write('    ')
        for (let month of getMonthsToQuery()) {
            process.stdout.write(month.format('MMMM') + '  ')

            let monthFormatted = month.format().replace('Z', '').replaceAll(':', '%3A') + '.000Z'
            let campsitesResponse = (await curl.get('https://www.recreation.gov/api/camps/availability/campground/' + campground.id + '/month?start_date=' + monthFormatted))
            if (campsitesResponse.body.campsites === undefined) {
                p4(campsitesResponse)
                process.exit(1)
            }
            for (let campsite of Object.values(campsitesResponse.body.campsites)) {

                // Skip invalid campsite types
                switch (campsite.campsite_type) {
                case 'CABIN ELECTRIC':
                case 'CABIN NONELECTRIC':
                case 'EQUESTRIAN NONELECTRIC':
                case 'GROUP STANDARD NONELECTRIC':
                case 'GROUP TENT ONLY AREA NONELECTRIC':
                case 'RV ELECTRIC':
                case 'RV NONELECTRIC':
                case 'MANAGEMENT':
                    continue
                }

                for (let day of Object.keys(campsite.availabilities)) {
                    let status = campsite.availabilities[day]

                    // Skip unavailable campsites
                    switch (status) {
                    case 'Lottery':
                    case 'Reserved':
                    case 'Not Available':
                    case 'Not Reservable':
                    case 'Not Reservable Management':
                        continue
                    }

                    // p4(campsite)

                    let availableCampsite = {
                        name: campsite.site,
                        id: campsite.campsite_id,
                        url: 'https://www.recreation.gov/camping/campsites/' + campsite.campsite_id,
                        date: moment.utc(day).format('MM/DD'),
                        dow: moment.utc(day).format('dddd'),
                        status: campsite.availabilities[day],
                        campground: campground
                    }

                    // p4(availableCampsite)
                    if (campgroundConfig.dates.includes(availableCampsite.date)) {
                        availability.push(availableCampsite)
                    } else {
                        other.push(availableCampsite)
                    }
                }
            }
            // p4(availability)
            // p4(other)
        }
        console.log()
    }

    print()
}

function getMonthsToQuery() {
    let month1 = moment().utc()
    month1.date(1)
    month1.hour(0)
    month1.minute(0)
    month1.second(0)
    month1.millisecond(0)

    let month2 = moment(month1).add(1, 'months')
    let month3 = moment(month2).add(1, 'months')
    let month4 = moment(month3).add(1, 'months')
    let month5 = moment(month4).add(1, 'months')
    return [ month1, month2, month3, month4, month5 ]
}

function massageName(s) {
    return s
    // let s2
    // for (let seg of s.split(' ')) {
    //     if (!s2) {
    //         s2 = _.capitalize(seg)
    //         continue
    //     }
    //     s2 += ' ' + _.capitalize(seg)
    // }

    // s2 = s2.replace('YosemiteNatPark', 'Yosemite')
    // s2 = s2.replace('SierraNatFor', 'Sierra NatFor')
    // s2 = s2.replace(' National Parks', 'NatPark')
    // s2 = s2.replace(' National Park', 'NatPark')
    // s2 = s2.replace(' National Forest', 'NatFor')
    // s2 = s2.replace(' Campground', '')
    // s2 = s2.replace('-sequoia And Kings Canyon National Park', 'NatPark')
    // s2 = s2.replace('-sequoia And Kings Canyon', 'NatPark')
    // s2 = s2.replace(' National Recreation Area', 'NatRec')
    // s2 = s2.replace(' (ut)', '')

    // return s2
}

function print() {
    availability = _.sortBy(availability, [ 'date' ])
    // p4(availability)

    let date
    for (let campsite of availability) {

        if (!date || campsite.date !== date) {
            date = campsite.date
            console.log()
            console.log(campsite.dow + ' ' + date)
        }

        console.log(util.format('  %s %s %s',
                                campsite.campground.location.name.padEnd(30),
                                (campsite.campground.name + ' (' + campsite.name + ')').padEnd(24),
                                campsite.url.padEnd(10)))
    }
}
