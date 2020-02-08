//  Description:
//    Generates interesting sports content for display in Slack.
//
//  Dependencies:
//    "moment": "^2.24.0"
//    "moment-timezone": "^0.5.27"
//
//  Configuration:
//    HUBOT_SLACK_TOKEN
//
//  Commands:
//    hubot football live - retrieves the latest scores from ESPN
//    hubot football score <team string> - retrieves the latest scores from ESPN for a given
//    hubot soccer <league> live - retrieves the latest scores for a given league from ESPN
//    hubot soccer <league> score <team string> - retrieves the latest scores from ESPN
//
//  Author:
//    Akshay Easwaran <akeaswaran@me.com>


const WebClient = require("@slack/client").WebClient;
const attach = require("../formats/sample-attach");
const CfbApi = require("../utils/cfb-api")
const EspnApi = require("../utils/espn-api")
const ScoreFormatter = require("../utils/scoreformat")
const moment = require("moment")

module.exports = function(robot) {
    robot.receiveMiddleware((context, next, done) => {
        if (context.response.message.text != null && context.response.message.user.name != null && (context.response.message.text.includes("!live") || context.response.message.text.includes("!score"))) {
            robot.logger.info(`"${context.response.message.text}" received from @${context.response.message.user.name}`)
        }
        next(done);
    });

    var web = new WebClient(robot.adapter.options.token)
    function sendSlackMessage(res, text, options, shouldChannelify) {
        if (options == null) {
            options = {};
        }
        if (robot.adapter.options.token != null) {
            options.thread_ts = (res.message.thread_ts != null || shouldChannelify) ? res.message.thread_ts : res.message.rawMessage.ts;
        }
        return web.chat.postMessage(res.message.room, text, options);
    };

    function _isFreshData(timeString) {
        if (timeString == null) {
            return false
        }
        var lastUpdated = moment(timeString).toNow();
        if (lastUpdated.includes("seconds") || lastUpdated.includes(" minute")) {
            return true
        } else if (lastUpdated.includes("minutes")) {
            var cleaner = lastUpdated.replace("in ","").replace(/ minutes?/i,"");
            return parseInt(cleaner) <= 2
        } else {
            return false
        }
    }

    robot.hear(/\!football live/i, (res) => {
        robot.logger.info(`Loading new data from ESPN...`)
        EspnApi.retrieveFreshCFBGames()
        .then(games => {
            var blocks = ScoreFormatter.generateCFBScoreBlocks(games, true);
            return sendSlackMessage(res, "", {blocks:JSON.stringify(blocks)}, true);
        })
        .catch(err => {
            robot.logger.error(`Error while retrieving games from ESPN: ${err}`);
            return sendSlackMessage(res, `Error while retrieving games from ESPN: ${err}`, null, false);
        });
    });

    robot.hear(/\!football score\s?(.*)?/i, (res) => {
        var cleanedTeamName = res.match.length > 1 ? (res.match[1] != null ? res.match[1] : "").trim() : "";
        if (cleanedTeamName.length == 0) {
            robot.logger.error(`Did not provide a team name to search for. Please try again with a valid team name.`);
            return sendSlackMessage(res, `Did not provide a team name to search for. Please try again with a valid team name.`, null, false);
        } else {
            EspnApi.retrieveFreshCFBGames()
            .then(games => {
                var entries = games.filter(item => ((item.homeTeam.location.toLowerCase().includes(cleanedTeamName.toLowerCase()) || item.awayTeam.location.toLowerCase().includes(cleanedTeamName.toLowerCase()))) || (item.homeTeam.abbreviation.toLowerCase().includes(cleanedTeamName.toLowerCase()) || item.awayTeam.abbreviation.toLowerCase().includes(cleanedTeamName.toLowerCase())));
                if (entries.length > 0) {
                    var blocks = ScoreFormatter.generateCFBScoreBlocks(entries);
                    return sendSlackMessage(res, "", {blocks:JSON.stringify(blocks)}, true);
                } else {
                    robot.logger.error(`Can not find "${cleanedTeamName}" in action at this time.`);
                    return sendSlackMessage(res, `Can not find "${cleanedTeamName}" in action at this time.`, null, false);
                }
            })
            .catch(err => {
                robot.logger.error(`Error while looking for "${cleanedTeamName}": ${err}`);
                return sendSlackMessage(res, `Error while looking for "${cleanedTeamName}": ${err}`, null, false);
            })
        }
    });

    robot.hear(/\!soccer (.*) live/i, (res) => {
        robot.logger.info(`Retrieving live scores...`)
        var cleanedLeagueName = res.match.length > 1 ? (res.match[1] != null ? res.match[1] : "").trim() : "";
        if (cleanedLeagueName.length == 0) {
            robot.logger.error(`Did not provide a league name to search for. Please try again with a valid league name.`);
            return sendSlackMessage(res, `Did not provide a league name to search for. Please try again with a league team name.`, null, false);
        } else {
            robot.logger.info(`Loading new ${cleanedLeagueName} data from ESPN...`)
            EspnApi.retrieveFreshSoccerMatches(cleanedLeagueName)
            .then(games => {
                var blocks = ScoreFormatter.generateSoccerMatchBlocks(games, true);
                return sendSlackMessage(res, "", {blocks:JSON.stringify(blocks)}, true);
            })
            .catch(err => {
                robot.logger.error(`Error while retrieving games from ESPN: ${err}`);
                return sendSlackMessage(res, `Error while retrieving games from ESPN: ${err}`, null, false);
            });
        }
    });

    robot.hear(/\!soccer (.*) score\s?(.*)?/i, (res) => {
        robot.logger.info(`Retrieving scores for a team...`)
        var cleanedLeagueName = res.match.length > 1 ? (res.match[1] != null ? res.match[1] : "").trim() : "";
        if (cleanedLeagueName.length == 0) {
            robot.logger.error(`Did not provide a league name to search for. Please try again with a valid league name.`);
            return sendSlackMessage(res, `Did not provide a league name to search for. Please try again with a league team name.`, null, false);
        } else {
            var cleanedTeamName = res.match.length > 2 ? (res.match[2] != null ? res.match[2] : "").trim() : "";
            if (cleanedTeamName.length == 0) {
                robot.logger.error(`Did not provide a team name to search for. Please try again with a valid team name.`);
                return sendSlackMessage(res, `Did not provide a team name to search for. Please try again with a valid team name.`, null, false);
            } else {
                EspnApi.retrieveFreshSoccerMatches(cleanedLeagueName)
                .then(games => {
                    var entries = games.filter(item => ((item.homeTeam.location.toLowerCase().includes(cleanedTeamName.toLowerCase()) || item.awayTeam.location.toLowerCase().includes(cleanedTeamName.toLowerCase()))) || (item.homeTeam.abbreviation.toLowerCase().includes(cleanedTeamName.toLowerCase()) || item.awayTeam.abbreviation.toLowerCase().includes(cleanedTeamName.toLowerCase())));
                    if (entries.length > 0) {
                        var blocks = ScoreFormatter.generateSoccerMatchBlocks(entries);
                        return sendSlackMessage(res, "", {blocks:JSON.stringify(blocks)}, true);
                    } else {
                        robot.logger.error(`Can not find "${cleanedTeamName}" in action at this time.`);
                        return sendSlackMessage(res, `Can not find "${cleanedTeamName}" in action at this time.`, null, false);
                    }
                })
                .catch(err => {
                    robot.logger.error(`Error while looking for "${cleanedTeamName}": ${err}`);
                    return sendSlackMessage(res, `Error while looking for "${cleanedTeamName}": ${err}`, null, false);
                })
            }
        }
    });
};
