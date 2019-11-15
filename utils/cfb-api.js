const request = require("request-promise-native");
const Queue = require('promise-queue');
const moment = require('moment');
var maxConcurrent = 1;
var maxQueue = Infinity;
var queue = new Queue(maxConcurrent, maxQueue);

function _convertYearToSeason() {
    var year = parseInt(moment().year());
    // January is still part of the current season
    if (moment().month() == 0) {
        return year - 1;
    }
    return year;
}

function _generateOptions(id, team, week, seasonType) {
    var options = {};
    if (id != null) {
        options.id = id;
    }
    if (team != null) {
        options.team = team;
    }
    options.seasonType = (seasonType != 'bowl') ? 'regular' : 'postseason'
    if (seasonType != 'bowl') {
        options.week = week;
    }
    options.season = _convertYearToSeason();
    return options;
}

function retrieveCfbData(endpoint, params) {
    var url = new URL(`https://api.collegefootballdata.com/${endpoint}`);
    url.search = new URLSearchParams(params);
    return request({ uri: url.toString(), json: true });
}

function findTeamData(res, team) {
    return retrieveCfbData("teams", { team:team, season: _convertYearToSeason() });
}

function findGameData(res, team, week, seasonType) {
    return retrieveCfbData("games", _generateOptions(null, team, week, seasonType))
}

function findDriveData(res, team, week, seasonType) {
    return retrieveCfbData("drives", _generateOptions(null, team, week, seasonType))
}

function findPbPData(res, team, week, seasonType)  {
    return retrieveCfbData("plays", _generateOptions(null, team, week, seasonType))
}

function findTeamDataWithId(res, id) {
    return retrieveCfbData("teams", { id:id, season: _convertYearToSeason() });
}

function findGameDataWithId(res, id, week, seasonType) {
    return retrieveCfbData("games", _generateOptions(id, null, week, seasonType))
}

function findDriveDataWithId(res, id, week, seasonType) {
    return retrieveCfbData("drives", _generateOptions(id, null, week, seasonType))
}

function findPbPDataWithId(res, id, week, seasonType)  {
    return retrieveCfbData("plays", _generateOptions(id, null, week, seasonType))
}

module.exports = {
    findTeamDataWithId: findTeamDataWithId,
    findGameDataWithId: findGameDataWithId,
    findDriveDataWithId: findDriveDataWithId,
    findPbPDataWithId: findPbPDataWithId,
    findGameData: findGameData,
    findDriveData: findDriveData,
    findTeamData: findTeamData,
    findPbPData: findPbPData
}
