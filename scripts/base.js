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
// const attach = require("../formats/sample-attach");
// const CfbApi = require("../utils/cfb-api")
const EspnApi = require("../utils/espn-api")
const WhiparoundAPI = require("../utils/whiparound-api")
const ScoreFormatter = require("../utils/scoreformat")
const moment = require("moment")

const Queue = require('promise-queue');
var maxConcurrent = 1;
var maxQueue = Infinity;
var queue = new Queue(maxConcurrent, maxQueue);
Queue.prototype.clear = () => {
    this.queue = [];
};

var cronSched = process.env.CRON_SCHEDULE != null ? process.env.CRON_SCHEDULE : "*/6 * * * *";
var targetedChannels = [];

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

    function sendRoomMessage(room, text, options) {
        if (options == null) {
            options = {};
        }
        return web.chat.postMessage(room, text, options);
    };

    var whiparoundURL = process.env.WHIPAROUND_URL;
    if (whiparoundURL != null) {
        robot.logger.info(`Booting up cron job for spicy games, connecting to Whiparound URL: ${whiparoundURL}`);
        WhiparoundAPI.startCronJob(whiparoundURL, cronSched, robot.logger, (blocks) => {
            robot.logger.info("Clearing rest of notifications queue before sending new updates...");
            queue.clear();
            targetedChannels.forEach(chan => {
                queue.add(function () {
                    robot.logger.info(`Sending new blocks to targeted channel: ${chan}`);
                    sendRoomMessage(chan, "", {blocks:JSON.stringify(blocks)});
                }).then((result) => {
                    robot.logger.info(`Sent notifications to channel ${chan}`);
                }).catch((err) => {
                    robot.logger.error(`Error while sending notifications to channel ${chan}: ` + err);
                });
            })
        });
    
        robot.hear(/\!whiparound subscribe/i, res => {
            var channel = res.message.rawMessage.channel;
            if (channel != null) {
                var index = targetedChannels.indexOf(channel)
                if (index == -1) { 
                    robot.logger.info(`Subscribing channel (${channel}) to spicy updates`);
                    targetedChannels.push(channel);
                    robot.logger.info(`Subscribed channel (${channel}) to spicy updates`);
                    return sendSlackMessage(res, `Subscribed this channel (${channel}) to spicy updates`, null, false); 
                } else {
                    robot.logger.info(`Channel ${channel} was already subscribed to spicy updates`);
                    return sendSlackMessage(res, `This channel (${channel}) was already subscribed to spicy updates`, null, false); 
                }
            } else {
                robot.logger.info(`Could not subscribe this channel to spicy updates because it was null`);
                return sendSlackMessage(res, `Error: Could not subscribe this channel to spicy updates because it was null`, null, false); 
            }
        });
    
        robot.hear(/\!whiparound unsubscribe/i, res => {
            var channel = res.message.rawMessage.channel;
            if (channel != null) {
                var index = targetedChannels.indexOf(channel)
                if (index > -1) { 
                    robot.logger.info(`Unsubscribing channel (${channel}) from spicy updates`);
                    targetedChannels.splice(index, 1) 
                    robot.logger.info(`Unsubscribed channel (${channel}) from spicy updates`);
                    return sendSlackMessage(res, `Unsubscribed this channel (${channel}) from spicy updates`, null, false); 
                } else {
                    robot.logger.info(`Channel ${channel} was never subscribed to spicy updates`);
                    return sendSlackMessage(res, `This channel ${channel} was never subscribed to spicy updates`, null, false); 
                }
            } else {
                robot.logger.info(`Could not unsubscribe this channel to spicy updates because it was null`);
                return sendSlackMessage(res, `Error: Could not unsubscribe this channel to spicy updates because it was null`, null, false); 
            }
        });
    } else {
        robot.logger.info(`Not doing anything with Whiparound, no URL configured`);
    }

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
