/*
 * Copyright (c) 2024. Permar AI Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import { Response } from '@/dto';
import { Toast } from '@/utils';

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

export function printResponse({ response, success, cmd }: { response: Response<any>; success: string; cmd?: string }) {
    switch (response.type) {
        case 'success':
            Toast.success(success);
            return;
        case 'warning':
            Toast.warning(response.warning + (cmd ? `\n${cmd}` : ''));
            return;
        case 'error':
            Toast.error(response.error + (cmd ? `\n${cmd}` : ''));
            return;
    }
}
