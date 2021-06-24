const d = require('debug')('recgov');

const moment = require('moment');
const _ = require('lodash');
const fs = require('fs');
const YAML = require('yaml');

const p = require('./pr').p(d);
const p4 = require('./pr').p4(d);


module.exports = class Config {


    dates = [];
    campgrounds = [];
    yaml = null;


    constructor() {
        this.yaml = YAML.parse(fs.readFileSync('config.yaml', 'utf-8'));
        this.dates = this.getDates();
        this.getCampgrounds();
    }


    getCampgrounds() {
        for (let locationName of this.yaml.active) {
            let location = _.find(this.yaml.locations, { name: locationName });
            for (let campground of location.campgrounds) {
                this.campgrounds = this.campgrounds.concat(campground.id);
            }
        }
    }


    getDates() {
        let today = moment.utc();

        // For the remainder of the year, add all the days that match the
        // days of the week criteria in the confile file
        for (let date = moment.utc(); date.year() === today.year(); date.add(1, "days")) {
            if (this.yaml.criteria.include.includes(date.format('dddd'))) {
                this.dates.push(date.format('MM/DD'));
            }
        }

        // Add the additional dates to include
        let includeDates = this.getDatesFromCriteria(this.yaml.criteria.include);
        this.dates = this.dates.concat(includeDates);

        // Remove the dates to exclude
        let excludeDates = this.getDatesFromCriteria(this.yaml.criteria.exclude);
        this.dates = _.difference(this.dates, excludeDates).sort();

        return this.dates;
    }


    getDatesFromCriteria(collection) {
        let dates = [];
        let dateOrRanges = _.flatten(_.map(collection, function (o) { return o.dates }));
        for (let dateOrRange of dateOrRanges) {
            if (!dateOrRange.includes('-')) {
                dates.push(dateOrRange);
                continue;
            }

            dates = _.union(dates, this.getDatesFromRange(dateOrRange));
        }
        return dates;
    }


    getDatesFromRange(dateRange) {
        let dateRangeSegments = dateRange.split('-');
        let startDate = moment(dateRangeSegments[0], 'MM/DD');
        let endDate = moment(dateRangeSegments[1], 'MM/DD').add(1, "days").format('MM/DD');

        let dates = [];
        for (let date = startDate; date.format('MM/DD') !== endDate; date.add(1, "days")) {
            dates.push(date.format('MM/DD'));
        }

        return dates;
    }
}
