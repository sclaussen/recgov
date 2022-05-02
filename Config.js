process.env.DEBUG = 'recgov'
const d = require('debug')('recgov')

const moment = require('moment')
const _ = require('lodash')
const fs = require('fs')
const YAML = require('yaml')

const p = require('./lib/pr').p(d)
const p4 = require('./lib/pr').p4(d)

class Config {
    yaml = null
    campgrounds = []

    constructor() {
        this.yaml = YAML.parse(fs.readFileSync('config.yaml', 'utf-8'))
        this.expandQueries()
        this.generateCampgrounds()
    }

    expandQueries() {
        for (let query of this.yaml.queries) {
            if ('active' in query && !query.active) {
                continue
            }

            query.dates = this.expandDatesAndDateRanges(query['date-ranges'])
            let today = moment.utc().subtract(1, 'days')
            for (let date of query.dates) {
                if (moment.utc(date, 'MM/DD').isBefore(today)) {
                    query.dates = query.dates.filter(function(o) { return o !== date })
                }
            }
            if (query.dates.length === 0) {
                console.log('ERROR: Query does not contain any valid dates: ' + query.name)
                process.exit(1)
            }

            if ('locations' in query === false) {
                query.locations = []
                for (let location of this.yaml.locations) {
                    if ('active' in location && !location.active) {
                        continue
                    }
                    let newLocation = {
                        name: location.name,
                        campgrounds: []
                    }
                    for (let campground of location.campgrounds) {
                        if ('active' in campground && !campground.active) {
                            continue
                        }
                        newLocation.campgrounds.push(campground)
                    }
                    if (newLocation.campgrounds.length > 0) {
                        query.locations.push(newLocation)
                    }
                }
                continue
            }

            for (let location of query.locations) {
                if (!location.name) {
                    console.log('ERROR: Missing the query location name for the query: ' + queryName)
                    process.exit(1)
                }

                if ('campgrounds' in location === false) {

                    let normalizedLocation = _.find(this.yaml.locations, function(o) { return o.name === location.name })
                    if (!normalizedLocation) {
                        console.log('ERROR: Unable to find the query location name in the normalized locations: ' + location.name)
                        process.exit(1)
                    }
                    if ('active' in normalizedLocation && !normalizedLocation.active) {
                        console.log('ERROR: Query contains an inactive location: ' + location.name)
                        process.exit(1)
                    }

                    location.campgrounds = []
                    for (let campground of normalizedLocation.campgrounds) {
                        if ('active' in campground && !campground.active) {
                            continue
                        }
                        location.campgrounds.push(campground)
                    }
                    continue
                }


                for (let campground of location.campgrounds) {
                    let normalizedLocation = _.find(this.yaml.locations, function(o) { return o.name === location.name })
                    let normalizedCampground = _.find(normalizedLocation.campgrounds, function(o) { return o.name === campground.name })
                    if (!normalizedLocation) {
                        console.log('ERROR: Unable to find the query location name in the normalized locations: ' + location.name)
                        process.exit(1)
                    }
                    if ('active' in normalizedLocation && !normalizedLocation.active) {
                        console.log('ERROR: Query contains an inactive location: ' + location.name)
                        process.exit(1)
                    }
                    if (!normalizedCampground) {
                        console.log('ERROR: Unable to find the query campground name in the normalized campgrounds: ' + campground.name)
                        process.exit(1)
                    }
                    if ('active' in normalizedCampground && !normalizedCampground.active) {
                        console.log('ERROR: Query contains an inactive campground: ' + campground.name)
                        process.exit(1)
                    }

                    campground.id = normalizedCampground.id
                }
            }
        }
    }

    // Input:   [ '01/01, '03/20-03/24' ]
    // Returns: [ '01/01', '03/20', '03/21', '03/22', '03/23', '03/24' ]
    expandDatesAndDateRanges(dateRanges) {
        let dates = []
        for (let dateOrDateRange of dateRanges) {
            if (!dateOrDateRange.includes('-')) {
                dates.push(moment(dateOrDateRange, 'MM/DD').format('MM/DD'))
                continue
            }

            dates = _.union(dates, this.expandDateRanges(dateOrDateRange))
        }

        return dates
    }

    // Input:   '03/20-03/24'
    // Returns: [ '03/20', '03/21', '03/22', '03/23', '03/24' ]
    expandDateRanges(dateRange) {
        let dateRangeSegments = dateRange.split('-')
        let startDate = moment(dateRangeSegments[0], 'MM/DD')
        let endDate = moment(dateRangeSegments[1], 'MM/DD').add(1, "days").format('MM/DD')

        let dates = []
        for (let date = startDate; date.format('MM/DD') !== endDate; date.add(1, "days")) {
            dates.push(date.format('MM/DD'))
        }

        return dates
    }

    generateCampgrounds() {
        for (let query of this.yaml.queries) {
            if ('active' in query && !query.active) {
                continue
            }

            for (let location of query.locations) {
                for (let campground of location.campgrounds) {

                    let existingCampground = _.find(this.campgrounds, { id: campground.id })
                    if (existingCampground) {
                        existingCampground.dates = existingCampground.dates.concat(query.dates)
                        existingCampground.dates = Array.from(new Set(existingCampground.dates)).sort()
                    } else {
                        this.campgrounds.push({
                            name: campground.name,
                            id: campground.id,
                            dates: query.dates.sort()
                        })
                    }
                }
            }
        }
    }
}

function main() {
    var config = new Config()
    // p4(config.yaml.queries)
    // p4(config.campgrounds)
}

main()

module.exports = Config
