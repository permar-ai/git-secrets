/*
 * Copyright (c) 2024. Permar AI Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

export type MaybeNull<T> = T | null | undefined;
export type MaybeEmpty<T> = T | {};

type Success<T> = {
    success: boolean;
    type: 'success';
    data: T;
};

type Warning = {
    success: boolean;
    type: 'warning';
    warning: string;
};

type Error = {
    success: boolean;
    type: 'error';
    error: string;
};

export type Response<T> = Success<T> | Warning | Error;

export function toSuccess<T>(data: T): Success<T> {
    return {
        success: true,
        type: 'success',
        data: data,
    };
}

export function toWarning(warning: string): Warning {
    return {
        success: false,
        type: 'warning',
        warning: warning,
    };
}

export function toError(err: string | null | unknown): Error {
    const errParse = err as string;
    return {
        success: false,
        type: 'error',
        error: err ? errParse : 'Unknown error',
    };
}
