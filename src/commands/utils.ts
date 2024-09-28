/*
 * Copyright (c) 2024. Permar AI Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import chalk from 'chalk';

export class Toast {
    static success(message: string) {
        console.log(chalk.green(message));
    }

    static warning(message: string) {
        console.log(chalk.yellow(message));
    }

    static error(message: string) {
        console.log(chalk.red(message));
    }
}

function capitalize(text: string) {
    return text.charAt(0).toUpperCase() + text.slice(1);
}

export class Markdown {
    static table(data: any[], columns: string[]) {
        // Calculate widths
        const widths = columns.map((c, idx) => Math.max(1, c[idx].length, ...data.map((item) => item[c]?.length || 0)));

        // Headers
        let txt = '| ' + columns.map((c, idx) => capitalize(c).padEnd(widths[idx])).join(' | ') + ' |\n';
        txt += '|-' + widths.map((w) => '-'.repeat(w)).join('-|-') + '-|\n';

        // Data
        data.map((item) => {
            txt += '| ' + columns.map((c, idx) => item[c].padEnd(widths[idx], ' ')).join(' | ') + ' |\n';
        });
        return txt;
    }
}
