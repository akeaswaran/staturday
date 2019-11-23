const request = require("request-promise-native");
const ESPN_URL = 'https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard?lang=en&region=us&calendartype=blacklist&limit=300&showAirings=true&groups=80';

function createESPNTeam(competitorDict) {
    var team = {};
    team.id = competitorDict.team.id;
    team.location = competitorDict.team.location;
    team.name = competitorDict.team.name;
    team.abbreviation = competitorDict.team.abbreviation;
    team.displayName = competitorDict.team.displayName;
    team.color = competitorDict.team.color;
    team.logoUrl = competitorDict.team.logo;
    team.links = {};
    if (competitorDict.team.links && competitorDict.team.links.length > 0) {
        for (var i = 0; i < competitorDict.team.links.length; i++) {
            var linkDict = competitorDict.team.links[i];
            team.links[linkDict.rel[0]] = linkDict.href;
        }
    }
    team.conferenceId = competitorDict.team.conferenceId;
    team.rank = parseInt(competitorDict.curatedRank.current);
    team.records = {};
    if (competitorDict.records && competitorDict.records.length > 0) {
        if (competitorDict.records.length == 3) {
            team.records.overall = competitorDict.records[0].summary;
            team.records.home = competitorDict.records[1].summary;
            team.records.away = competitorDict.records[2].summary;
        } else if (competitorDict.records.length == 4) {
            team.records.overall = competitorDict.records[0].summary;
            team.records.conference = competitorDict.records[1].summary;
            team.records.home = competitorDict.records[2].summary;
            team.records.away = competitorDict.records[3].summary;
        } else {
            team.records.overall = competitorDict.records[0].summary;
        }
    }

    return team;
}

function createESPNGame(gameEvent) {
    var game = {};

    //Basic game data
    game.id = gameEvent.id;
    game.season = gameEvent.season.year;
    game.date = gameEvent.date;
    game.attendance = gameEvent.competitions[0].attendance;
    game.venue = {};
    game.venue.name = gameEvent.competitions[0].venue.fullName;
    game.venue.city = gameEvent.competitions[0].venue.address.city;
    game.venue.state = gameEvent.competitions[0].venue.address.state;
    if (gameEvent.competitions[0].notes && gameEvent.competitions[0].notes.length > 0) {
        game.headline = gameEvent.competitions[0].notes[0].headline;
    } else {
        game.headline = '';
    }
    game.scores = {};
    game.scores.home = gameEvent.competitions[0].competitors[0].score;
    game.scores.away = gameEvent.competitions[0].competitors[1].score;

    //Game Status
    game.status = gameEvent.status;
    game.situation = gameEvent.competitions[0].situation;
    //Teams
    game.homeTeam = createESPNTeam(gameEvent.competitions[0].competitors[0]);
    game.awayTeam = createESPNTeam(gameEvent.competitions[0].competitors[1]);

    // Broadcasts
    game.airings = gameEvent.competitions[0].airings;
    game.geoBroadcasts = gameEvent.competitions[0].geoBroadcasts;
    game.possession = (game.situation != null) ? ((game.situation.possession != null) ? ((game.situation.possession == game.awayTeam.id) ? game.awayTeam.abbreviation : game.homeTeam.abbreviation) : null) : null;

    game.odds = gameEvent.competitions[0].odds;
    return game;
}

module.exports = {
    retrieveFreshCFBGames: function() {
        return request({ uri: ESPN_URL, method: 'GET', json: true })
        .then(data => {
            var rawEvents = data.events;
            var games = [];
            rawEvents.forEach((item) => {
                var gm = createESPNGame(item);
                games.push(gm);
            });
            return games;
        });
    }
};
