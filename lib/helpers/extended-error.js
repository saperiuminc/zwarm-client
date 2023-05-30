// ExtendedError
class ExtendedError extends Error {
    constructor(message, cause) {
        super(message);
        this.name = "ExtendedError";
        if (cause)
            this.cause = cause;
    }
}

module.exports = ExtendedError;