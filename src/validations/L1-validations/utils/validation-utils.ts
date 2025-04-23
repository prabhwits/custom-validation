function areUnique(operand: string[]) {
    const valuesSet = new Set(operand);
    return valuesSet.size === operand.length;
}

function arePresent(operand: string[]) {
    return noneIn(operand, ["", "null", "undefined"]) && operand.length > 0;
}

function allIn(left: string[], right: string[]) {
    return left.every((v) => right.includes(v));
}

function anyIn(left: string[], right: string[]) {
    return left.some((v) => right.includes(v));
}

function noneIn(left: string[], right: string[]) {
    return left.every((v) => !right.includes(v));
}

function equalTo(left: string[], right: string[]) {
    if (left.length !== right.length) return false;
    return left.every((v, i) => v === right[i]);
}

function greaterThan(left: string[], right: string[]): boolean {
    // Check if all elements in an array are ISO 8601 dates
    const areAllISO = (arr: string[]) => arr.every((v) => isISO8601(v));
    // Check if all elements in an array are numbers
    const areAllNumbers = (arr: string[]) =>
        arr.every((v) => !isNaN(Number(v)));

    if (areAllISO(left) && areAllISO(right)) {
        // Compare ISO 8601 dates
        const leftDates = left.map((date) => new Date(date).getTime());
        const rightDates = right.map((date) => new Date(date).getTime());
        return leftDates.every(
            (ld, index) => ld > rightDates[index] || index >= rightDates.length,
        );
    } else if (areAllNumbers(left) && areAllNumbers(right)) {
        // Compare numbers
        const leftNumbers = left.map(Number);
        const rightNumbers = right.map(Number);
        return leftNumbers.every(
            (ln, index) =>
                ln > rightNumbers[index] || index >= rightNumbers.length,
        );
    }

    // If neither condition is met, return false
    return false;
}

function lessThan(left: string[], right: string[]): boolean {
    // Check if all elements in an array are ISO 8601 dates
    const areAllISO = (arr: string[]) => arr.every((v) => isISO8601(v));
    // Check if all elements in an array are numbers
    const areAllNumbers = (arr: string[]) =>
        arr.every((v) => !isNaN(Number(v)));

    if (areAllISO(left) && areAllISO(right)) {
        // Compare ISO 8601 dates
        const leftDates = left.map((date) => new Date(date).getTime());
        const rightDates = right.map((date) => new Date(date).getTime());
        return leftDates.every(
            (ld, index) => ld < rightDates[index] || index >= rightDates.length,
        );
    } else if (areAllNumbers(left) && areAllNumbers(right)) {
        // Compare numbers
        const leftNumbers = left.map(Number);
        const rightNumbers = right.map(Number);
        return leftNumbers.every(
            (ln, index) =>
                ln < rightNumbers[index] || index >= rightNumbers.length,
        );
    }

    // If neither condition is met, return false
    return false;
}

function followRegex(left: string[], regexArray: string[]) {
    for (const regex of regexArray) {
        const re = new RegExp(regex);
        if (left.some((v) => !re.test(v))) return false;
    }
    return true;
}

function isISO8601(str: string): boolean {
    // Regular expression to match ISO 8601 format
    const iso8601Regex =
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

    // Check if the string matches the ISO 8601 format
    if (!iso8601Regex.test(str)) {
        return false;
    }

    // Check if the string is a valid date
    const date = new Date(str);
    return !isNaN(date.getTime());
}

export default {
    areUnique,
    arePresent,
    allIn,
    anyIn,
    noneIn,
    equalTo,
    followRegex,
    greaterThan,
    lessThan,
};
