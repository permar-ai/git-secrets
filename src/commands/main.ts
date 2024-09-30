/*
 * Copyright (c) 2024. Permar AI Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import * as yargs from 'yargs';
import { prompt } from 'enquirer';

import { getGitSecrets } from '@/index';
import { Toast } from '@/utils';

import { CMD } from './constants';

async function resolveEmailPassword(email: string | undefined) {
    // Init
    const gitsecrets = getGitSecrets();
    if (!gitsecrets) return null;

    // Local settings
    let password = null;
    if (!email) {
        const localSettings = gitsecrets.getLocalSettings();
        email = localSettings?.user?.email;
        password = localSettings?.user?.password;
        if (!email) {
            Toast.error(
                `Required to pass in an email or have local settings setup.\nSee '${CMD} settings set' for how to setup local settings.`,
            );
            return null;
        }
    }

    // Password prompting
    if (!password) {
        const answers = await prompt<{ password: string }>([
            {
                type: 'password',
                name: 'password',
                message: 'Enter your password:',
            },
        ]);
        password = answers.password;
    }
    return { email, password };
}

export class HideCommand implements yargs.CommandModule {
    command = 'hide';
    describe = 'Encrypt all files that the user has access to.';

    builder(args: yargs.Argv) {
        return args
            .option('modified', {
                alias: 'm',
                describe: 'Hide only modified files',
                type: 'boolean',
            })
            .option('file', {
                alias: 'f',
                describe: 'Path to a file to hide (flag can be used multiple times)',
                type: 'array',
            })
            .option('user', {
                alias: 'u',
                describe: "User's email address",
                demandOption: false,
                type: 'string',
            });
    }

    async handler(args: yargs.Arguments) {
        // Init
        const { modified, file, user } = args as unknown as { modified: boolean; file?: string[]; user?: string };
        const gitsecrets = getGitSecrets();
        if (!gitsecrets) return;

        // Email + password
        const emailPassword = await resolveEmailPassword(user);
        if (!emailPassword) return;
        const { email, password } = emailPassword;

        // Encrypt single files
        if (file && file.length) {
            await Promise.all(
                file.map(
                    async (f) =>
                        await gitsecrets.encryptFile({
                            path: f,
                            email: email,
                            password: password,
                            modified: modified,
                        }),
                ),
            );
            return;
        }

        // Encrypt all files
        await gitsecrets.encryptAll({ modified, email, password });
    }
}

export class ShowCommand implements yargs.CommandModule {
    command = 'show';
    describe = 'Decrypt all files that user has access to.';

    builder(args: yargs.Argv) {
        return args
            .option('file', {
                alias: 'f',
                describe: 'Path to a file to show (flag can be used multiple times)',
                type: 'array',
            })
            .option('user', {
                alias: 'u',
                describe: "User's email address",
                demandOption: false,
                type: 'string',
            });
    }

    async handler(args: yargs.Arguments) {
        // Init
        const { file, user } = args as unknown as { file?: string[]; user?: string };
        const gitsecrets = getGitSecrets();
        if (!gitsecrets) return;

        // Email + password
        const emailPassword = await resolveEmailPassword(user);
        if (!emailPassword) return;
        const { email, password } = emailPassword;

        // Encrypt single files
        if (file && file.length) {
            await Promise.all(
                file.map(
                    async (f) =>
                        await gitsecrets.decryptFile({
                            path: f,
                            email: email,
                            password: password,
                        }),
                ),
            );
            return;
        }

        // Encrypt all files
        await gitsecrets.decryptAll({ email, password });
    }
}
