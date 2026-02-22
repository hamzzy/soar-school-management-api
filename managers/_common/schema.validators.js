module.exports = {
    'username': (data)=>{
        if(data.trim().length < 3){
            return false;
        }
        return true;
    },
    'objectId': (data)=>{
        if(typeof data !== 'string') return false;
        return /^[a-fA-F0-9]{24}$/.test(data);
    },
    'isoDate': (data)=>{
        if(typeof data !== 'string') return false;
        if(!/^\d{4}-\d{2}-\d{2}$/.test(data)) return false;
        const dt = new Date(`${data}T00:00:00.000Z`);
        if(Number.isNaN(dt.getTime())) return false;
        return dt.toISOString().startsWith(`${data}T`);
    },
}
