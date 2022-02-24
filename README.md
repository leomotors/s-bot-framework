# s-bot-framework

[![](https://img.shields.io/npm/v/s-bot-framework.svg?maxAge=3600)](https://www.npmjs.com/package/s-bot-framework)
[![](https://img.shields.io/npm/dt/s-bot-framework.svg?maxAge=3600)](https://www.npmjs.com/package/s-bot-framework)

_meaning: Salim Bot Framework_

Complete Discord Bot Framework built for [Salim Bot](https://github.com/leomotors/salim-bot)
aka Salim Bot but fully customable.

*Now in ~~abandoned~~ Full Release Phase!*

## ✨✨ Features

Concept for S-Bot Framework is, you give all information to the framework
and it will handle for you.

All Features exists in this framework is feature that exists in Salim Bot, you can
 modify into any way you would like

- Automatically Response to certain Keywords with prepared Quotes

- Ability to load Data from Files or Website and also *reload* while bot is running

- Text to Speech

- Simple DJ, is not as good as most music bot but enough for my Salim Bot's usage

- more! (see documents or Salim Bot for all features)

## Notice

This package is pure ESM, meaning you will need to import this package using `import`

```js
import { SBotClient } from "s-bot-framework" // OK!
const sBotFramework = require("s-bot-framework") // ERROR!
```

## 📚 Documents

[TypeDoc](https://leomotors.github.io/s-bot-framework/)

Guide Coming Soon! (*or may not come*)

## 📃 Example

[Salim Bot](https://github.com/leomotors/salim-bot) is a great example!

## 🌿 Dependencies

- `libtool` to build @discordjs/opus

- ffmpeg

- nodejs 16.6.0+ (discordjs 13 requirement)

- Finally, a Discord Bot to runs on!

**IMPORTANT**: You will need to install encryption and opus library detailed [here](https://github.com/discordjs/discord.js/tree/main/packages/voice#dependencies)
in order to use *Voice*

## ⚠️ Limitation

- This Framework is built for Salim Bot and should only applicable for bots that work similar way

- Salim Bot is designed to response to messages thus, Slash Command is not provided

- Badly written, Cannot handle more than one server at a time

- I'm lazy, gonna abandon this for a while

**Note**: These limitation is things that Salim Bot will never do, so never gonna be fixed.

## Not sponsored by

You may not want to use this library because its use is to specific. But

Check this out => [Cocoa Discord Utils](https://github.com/Leomotors/cocoa-discord-utils)

This one, unlike this framework is not a full framework but rather utility. Focuses on multipurpose Discord Bot rather than specific uses of this library. You can found that more useful than this one.
