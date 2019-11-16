Staturday
---

A Slack app for college football scores and stats.

Built originally for use at _[From the Rumble Seat](https://fromtherumbleseat.com)_.

Data provided by [ESPN](https://espn.com) and [CollegeFootballData.com](https://collegefootballdata.com).

## Installation

1. Clone this repo.
2. `cd` into it and run `npm install`.
3. Grab a [Slack OAuth token](https://api.slack.com/start/overview).

## Documentation

This bot doesn't do much yet, but `scripts/base.js` has comments explaining each command.

Another good resource (mainly for general hubot development on Slack) is the [Slack Developer Kit for Hubot](https://slack.dev/hubot-slack/).

## Running

```
HUBOT_SLACK_TOKEN=<slack token> HUBOT_ALIAS=<desired alias> bin/hubot --adapter slack
```

## License

See `LICENSE.md`.
