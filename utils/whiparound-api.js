const request = require("request-promise-native");
const cron = require("node-cron");

// in cron job:
// pull spicy game diffs
// create game blocks + spice meter
// post to slack
function retrieveDiffs(callback) {
    return request({ uri: `${process.env.WHIPAROUND_URL}/diff`, method: 'GET', json: true })
        .then(data => {
            var rawEvents = data.diffs;
            var games = [];
            rawEvents.forEach((item) => {
                var gm = createESPNGame(item);
                games.push(gm);
            });
            return games;
        });
}

module.exports = {
    startCronJob: function(cronSched, logger, callback) {
        logger.info("Scheduling data refresh based on ENV cron schedule: " + cronSched)
        cron.schedule(cronSched, function() {
            logger.info("---- Checking Whiparound Diffs ----");
        
            retrieveDiffs().then(games => {
                var blocks = utils.generateCFBScoreBlocks(games, true);
                callback(blocks);
            });
        });
    }
};