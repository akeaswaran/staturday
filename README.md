Staturday
---

A Slack app for sports scores and stats.

Built originally for use at _[From the Rumble Seat](https://fromtherumbleseat.com)_.

Data provided by [ESPN](https://espn.com) and [CollegeFootballData.com](https://collegefootballdata.com) where needed.

## Installation/Deployment

1. Clone this repo.
2. `cd` into it and run `npm install`.
3. Create a Slack app, install it to your workspace, and grab a [Slack OAuth token](https://api.slack.com/start/overview).
4. Start the bot using `HUBOT_SLACK_TOKEN=<slack token> HUBOT_ALIAS=<desired alias> bin/hubot --adapter slack`.

## Documentation

This bot doesn't do much yet, but `scripts/base.js` has comments explaining each command.

Another good resource (mainly for general hubot development on Slack) is the [Slack Developer Kit for Hubot](https://slack.dev/hubot-slack/).

## License

See `LICENSE.md`.
