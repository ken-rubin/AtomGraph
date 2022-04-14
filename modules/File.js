const fs = require('fs');

module.exports = class File {

    constructor(fileName) {

        this.fileName = fileName;
    }

    read() {

        return fs.readFileSync(this.fileName, { 
            
            encoding: 'utf8'
        });
    }

    write(data) {

        return fs.writeFileSync(this.fileName, 
            data, { 
            
            encoding: 'utf8'
        });
    }
};