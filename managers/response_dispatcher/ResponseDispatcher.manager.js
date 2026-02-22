module.exports = class ResponseDispatcher {
    constructor(){
        this.key = "responseDispatcher";
    }
    dispatch(res, {ok, data, code, errors, message, msg, errorCode, requestId, correlationId}){
        let statusCode = code? code: (ok==true)?200:400;
        return res.status(statusCode).send({
            ok: ok || false,
            data: data || {},
            errors: errors || [],
            message: msg || message ||'',
            errorCode: errorCode || '',
            requestId: requestId || res.getHeader('x-request-id') || '',
            correlationId: correlationId || res.getHeader('x-correlation-id') || '',
        });
    }
}
