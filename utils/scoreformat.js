const moment = require("moment")

function _generateTeamString(team) {
    return `${(team.rank < 26) ? ("#"+team.rank.toString() + " ") : ""}${team.location}`;
}

function _generateScoreString(gm) {
    if (parseInt(gm.status.period) >= 1) {
        return `${_generateTeamString(gm.awayTeam)} ${gm.scores.away}, ${_generateTeamString(gm.homeTeam)} ${gm.scores.home}`
    } else {
        return `${_generateTeamString(gm.awayTeam)} @ ${_generateTeamString(gm.homeTeam)}`;
    }
}

function _generateTimeString(gm) {
    if (parseInt(gm.status.period) < 1) {
        return `${moment(gm.date).format('M/D h:mm a')}`;
    } else {
        return `${gm.status.type.shortDetail.replace(" - ", " ")}`;
    }
}

function _generateSituationString(gm) {
    if (parseInt(gm.status.period) < 1 || gm.situation == null || gm.status.type.completed == true || gm.situation.downDistanceText == null) {
        return "";
    } else {
        var ballString = (gm.possession != null) ? `${gm.possession} ball - ` : "";
        return `${ballString}${gm.situation.downDistanceText.replace(" at ", ", ")}`;
    }
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
    var block = {
			"type": "section",
			"text": {
				"type": "mrkdwn",
				"text": `<https://www.espn.com/college-football/game/_/gameId/${gm.id}|*${scoreString}*>\n${timeString}${situationString.length > 0 ? ("\n"+situationString) : ""}`
			}
		};
    // console.log(gm.airings);
    // console.log(gm.geoBroadcasts);
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
    } else if (gm.geoBroadcasts != null && gm.geoBroadcasts.count > 0) {
        var option = gm.geoBroadcasts[0];
        block.accessory = {
            "type": "button",
            "text": {
                "type": "plain_text",
                "text": option.media.shortName
            },
            "url": `Watch on ${_findUrlForNonESPNNetwork(option.media.shortName)}`
        };
    }
    return block;
}

function _generateDividerBlock() {
    return {
        type: "divider"
    }
}

module.exports = (games) => {
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
    if (games.length > 0) {
        games.sort((a, b) => {
            if (a.status.type.completed && !b.status.type.completed) {
                return 1;
            } else if (!a.status.type.completed && b.status.type.completed) {
                return -1;
            } else {
                return Math.min(a.awayTeam.rank, a.homeTeam.rank) > Math.min(b.awayTeam.rank, b.homeTeam.rank);
            }
        });
        games.filter(item => item.status.type.completed != true && parseInt(item.status.period) >= 1).forEach((item, idx) => {
            if (idx < 24) {
                results.push(_generateGameBlock(item));
                results.push(_generateDividerBlock());
            }
        });
    } else {
        results.push({
			"type": "section",
			"text": {
				"type": "mrkdwn",
				"text": "No games live at this time."
			}
		})
        results.push(_generateDividerBlock());
    }
    var blocks = [header].concat(results).concat([footer]);
    // console.log(JSON.stringify(blocks));
    return blocks;
}
