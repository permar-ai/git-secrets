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

yargs
    .usage("Usage: $0 <command> [options]")
    .command(new InitCommand())
    .recommendCommands()
    .demandCommand(1)
    .strict()
    .alias("v", "version")
    .help("h")
    .alias("h", "help").argv
