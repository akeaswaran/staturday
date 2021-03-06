const moment = require("moment-timezone")

function _generateTeamString(team) {
    return `${(team.rank < 26) ? ("#"+team.rank.toString() + " ") : ""}${team.location}`;
}

function _generateScoreString(gm) {
    if (parseInt(gm.status.period) >= 1) {
        return `${_generateTeamString(gm.awayTeam)} ${gm.scores.away}, ${_generateTeamString(gm.homeTeam)} ${gm.scores.home}`
    } else {
        return `${_generateTeamString(gm.awayTeam)} (${gm.awayTeam.records.overall}) @ ${_generateTeamString(gm.homeTeam)} (${gm.homeTeam.records.overall})`;
    }
}

function _generateMatchScoreString(gm) {
    if (parseInt(gm.status.period) >= 1) {
        return `${_generateTeamString(gm.homeTeam)} ${gm.scores.home}, ${_generateTeamString(gm.awayTeam)} ${gm.scores.away}`
    } else {
        return `${_generateTeamString(gm.homeTeam)} (${gm.homeTeam.records.overall}) vs ${_generateTeamString(gm.awayTeam)} (${gm.awayTeam.records.overall})`;
    }
}

function _generateTimeString(gm) {
    if (parseInt(gm.status.period) < 1) {
        return `${moment(gm.date).tz('America/New_York').format('ddd, MMM D - h:mm a zz')}`;
    } else {
        return `${gm.status.type.shortDetail.replace(" - ", " ")}`;
    }
}

function _generateSituationString(gm) {
    if (parseInt(gm.status.period) < 1 || gm.situation == null || gm.status.type.completed == true || gm.situation.downDistanceText == null) {
        if (gm.odds != null && gm.odds.length > 0) {
            var line = gm.odds[0];
            return `${line.details}${(line.overUnder != null) ? (", O/U " + line.overUnder) : ""}`
        } else {
            return "";
        }
    } else {
        var ballString = (gm.possession != null) ? `${gm.possession} ball - ` : "";
        return `${ballString}${gm.situation.downDistanceText.replace(" at ", ", ")}`;
    }
}

function _generateLastPlayString(gm) {
    if (parseInt(gm.status.period) < 1 || gm.situation == null || gm.status.type.completed == true || gm.situation.lastPlay == null) {
        return "";
    } else {
        var ballString = (gm.situation.lastPlay != null && (gm.situation.lastPlay.type.text.toLowerCase() != 'timeout' && gm.situation.lastPlay.type.text.toLowerCase() != 'kickoff') && !gm.situation.lastPlay.type.text.toLowerCase().includes('end of')) ? ((gm.situation.lastPlay.team.id == gm.awayTeam.id) ? `${gm.awayTeam.abbreviation} ball - ` : `${gm.homeTeam.abbreviation} ball - `) : "";
        if (ballString.includes(gm.possession + " ball")) {
            return `_Last Play_: ${gm.situation.lastPlay.text}`;
        } else {
            return `_Last Play_: ${ballString}${gm.situation.lastPlay.text}`;
        }
    }
}

function _generateVenueString(game) {
    var venueString = "";
    if (parseInt(game.status.period) < 1) {
        var attrs = [game.venue.name,game.venue.city,game.venue.state,game.venue.country]
        var used = 0;
        attrs.forEach((item) => {
            if (item != null && item.length > 0) {
                if (used > 0) {
                    venueString += ", ";
                }
                venueString += item;
                used++;
            }
        })
    }
    return venueString;
}

function _findUrlForNonESPNNetwork(network) {
    if (network == "CBSSN") {
        return "https://www.cbssports.com/cbs-sports-network/";
    } else if (network == "CBS") {
        return "https://www.cbssports.com/college-football/sec-live/";
    } else if (network == "FS1" || network == "FOX" || network.includes("FS")) {
        return "https://www.foxsportsgo.com";
    } else if (network == "NBC") {
        return "https://stream.nbcsports.com/notre-dame/";
    } else if (network.includes("NBCS")) {
        return "https://stream.nbcsports.com";
    } else if (network.includes("BTN")) {
        return "http://btn.com/gamefinder/";
    } else if (network.includes("PAC12")) {
        return "http://pac-12.com/getpac-12networks";
    } else if (network.includes("NFL")) {
        return "http://nflnonline.nfl.com/";
    } else if (network.includes("Stadium")) {
        return "https://watchstadium.com/live/";
    }
    return "https://espn.com";
}

function _generateGameBlock(gm) {
    var scoreString = _generateScoreString(gm);
    var timeString = _generateTimeString(gm);
    var situationString = _generateSituationString(gm);
    var lastPlayString = _generateLastPlayString(gm);
    var spiceLevelString = "";//gm.spiceLevel != null ? "" : `[Spice Level: ${gm.spiceLevel}]`;
    var block = {
			"type": "section",
			"text": {
				"type": "mrkdwn",
				"text": `<https://www.espn.com/college-football/game/_/gameId/${gm.id}|*${scoreString}*> ${spiceLevelString.length > 0 ? spiceLevelString : ""}\n${timeString}${situationString.length > 0 ? ("\n"+situationString) : ""}${lastPlayString.length > 0 ? ("\n"+lastPlayString) : ""}`
			}
		};
    // console.log(gm.airings);
    // console.log(gm.geoBroadcasts);
    if (gm.status.type.completed == false && parseInt(gm.status.period) >= 1) {
        if (gm.airings != null && gm.airings.length > 0) {
            var option = gm.airings[0];
            block.accessory = {
                "type": "button",
                "text": {
                    "type": "plain_text",
                    "text": `Watch on ${option.network_displayName}`
                },
                "url": option.webAiringLink
            };
        } else if (gm.geoBroadcasts != null && gm.geoBroadcasts.length > 0) {
            var option = gm.geoBroadcasts[0];
            block.accessory = {
                "type": "button",
                "text": {
                    "type": "plain_text",
                    "text": `Watch on ${option.media.shortName}`
                },
                "url": _findUrlForNonESPNNetwork(option.media.shortName)
            };
        }
    }
    return block;
}

function _generateMatchBlock(gm) {
    var scoreString = _generateMatchScoreString(gm);
    var timeString = _generateTimeString(gm);
    // var venueString = _generateVenueString(gm);
    // var situationString = _generateSituationString(gm);
    // var lastPlayString = _generateLastPlayString(gm);
    var block = {
			"type": "section",
			"text": {
				"type": "mrkdwn",
				"text": `<https://www.espn.com/soccer/match/_/gameId/${gm.id}|*${scoreString}*>\n${timeString}`
			}
		};
    // console.log(gm.airings);
    // console.log(gm.geoBroadcasts);
    if (gm.status.type.completed == false && parseInt(gm.status.period) >= 1) {
        if (gm.airings != null && gm.airings.length > 0) {
            var option = gm.airings[0];
            block.accessory = {
                "type": "button",
                "text": {
                    "type": "plain_text",
                    "text": `Watch on ${option.network_displayName}`
                },
                "url": option.webAiringLink
            };
        } else if (gm.geoBroadcasts != null && gm.geoBroadcasts.length > 0) {
            var option = gm.geoBroadcasts[0];
            block.accessory = {
                "type": "button",
                "text": {
                    "type": "plain_text",
                    "text": `Watch on ${option.media.shortName}`
                },
                "url": _findUrlForNonESPNNetwork(option.media.shortName)
            };
        }
    }
    return block;
}

function _generateDividerBlock() {
    return {
        type: "divider"
    }
}

module.exports = {
    generateCFBScoreBlocks: (games, liveOnly) => {
        if (liveOnly == null) {
            liveOnly = false;
        }
        var blocks = [];
        var results = [];
        var header = {
            "type" : "divider"
        };
        var footer = {
            "type": "context",
            "elements": [
                {
                    "type": "mrkdwn",
                    "text": `Generated by Staturday at ${moment().format('M/D/YYYY h:mm a')}. Data provided by <https://espn.com|ESPN>. | *<https://www.espn.com/college-football/scoreboard|View ESPN Scoreboard>*`
                }
            ]
        };

        if (Array.isArray(games) && games.length > 0) {
            games.sort((a, b) => {
                if (a.status.type.completed && !b.status.type.completed) {
                    return 1;
                } else if (!a.status.type.completed && b.status.type.completed) {
                    return -1;
                } else {
                    return Math.min(a.awayTeam.rank, a.homeTeam.rank) > Math.min(b.awayTeam.rank, b.homeTeam.rank);
                }
            });

            var filter = (liveOnly == true) ? games.filter(item => item.status.type.completed != true && parseInt(item.status.period) >= 1) : games;
            filter.forEach((item, idx) => {
                if (idx < 24) {
                    results.push(_generateGameBlock(item));
                    results.push(_generateDividerBlock());
                }
            });
        }

        if (results.length != 0) {
            blocks = [header].concat(results).concat([footer]);
        } else {
            results.push({
    			"type": "section",
    			"text": {
    				"type": "mrkdwn",
    				"text": "No games live at this time."
    			}
    		})

            blocks = results.concat([footer]);
        }

        return blocks;
    },
    generateSoccerMatchBlocks: (games, liveOnly) => {
        if (liveOnly == null) {
            liveOnly = false;
        }
        var blocks = [];
        var results = [];
        var header = {
            "type" : "divider"
        };
        var footer = {
            "type": "context",
            "elements": [
                {
                    "type": "mrkdwn",
                    "text": `Generated by Staturday at ${moment().format('M/D/YYYY h:mm a')}. Data provided by <https://espn.com|ESPN>. | *<https://matchcenter.mlssoccer.com/schedule|View MLS Scoreboard>*`
                }
            ]
        };

        if (Array.isArray(games) && games.length > 0) {
            games.sort((a, b) => {
                if (a.status.type.completed && !b.status.type.completed) {
                    return 1;
                } else if (!a.status.type.completed && b.status.type.completed) {
                    return -1;
                } else if (moment(a.date).isBefore(b.date)) {
                    return -1
                } else if (moment(b.date).isBefore(a.date)) {
                    return 1;
                } else {
                    return 0;
                }
            });

            var filter = (liveOnly == true) ? games.filter(item => item.status.type.completed != true && parseInt(item.status.period) >= 1) : games;
            filter.forEach((item, idx) => {
                results.push(_generateMatchBlock(item));
                results.push(_generateDividerBlock());
            });
        }

        if (results.length != 0) {
            blocks = [header].concat(results).concat([footer]);
        } else {
            results.push({
    			"type": "section",
    			"text": {
    				"type": "mrkdwn",
    				"text": "No matches live at this time."
    			}
    		})

            blocks = results.concat([footer]);
        }

        return blocks;
    }
}
