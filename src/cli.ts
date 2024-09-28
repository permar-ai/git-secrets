#!/usr/bin/env node
/*
 * Copyright (c) 2024. Permar AI Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import "reflect-metadata"
import * as yargs from "yargs"

import { InitCommand } from "./commands/init"
import { UserCommands } from "./commands/users";
import { TeamCommands } from './commands/teams';
import { FileCommands } from "./commands/files";
import { AccessCommands } from "./commands/access";
import { HideCommand, ShowCommand } from "./commands/main";
import { KeysCommands } from "./commands/keys";

yargs
    .usage("Usage: $0 <command> [options]")
    .command(new InitCommand())
    .command(new HideCommand())
    .command(new ShowCommand())
    .command(new UserCommands())
    .command(new TeamCommands())
    .command(new FileCommands())
    .command(new AccessCommands())
    .command(new KeysCommands())
    .recommendCommands()
    .demandCommand(1)
    .strict()
    .alias("v", "version")
    .help("h")
    .alias("h", "help").argv
