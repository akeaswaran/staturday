const WebClient = require("@slack/client").WebClient;
const attach = require("../formats/sample-attach");

module.exports = function(robot) {
    var web = new WebClient(robot.adapter.options.token)
    function sendSlackMessage(res, text, attachArr, shouldChannelify) {
        var options;
        if (robot.adapter.options.token != null) {
            options = {
                attachments: attachArr,
                thread_ts: (res.message.thread_ts != null || shouldChannelify) ? res.message.thread_ts : res.message.rawMessage.ts
            };
            return web.chat.postMessage(res.message.room, text, options);
        } else {
            return web.chat.postMessage(res.message.room, text, {"attachments" : attachArr})
        }
    };

    robot.hear("\!ping", (res) => {
        return res.send("PONG");
    });

    robot.hear(/\!box/i, (res) => {
        return sendSlackMessage(res, "georgia -100, Georgia Tech 6969", attach.attachments, false);
    });
};
