(async ()=>{

    try {

        const File = require('./modules/File');

        const hierarchyFile = new File("./input/hierarchy.json");
        const hierarchyData = hierarchyFile.read();
        const hierarchy = JSON.parse(hierarchyData);

        const express = require('express');
        const app = express();
        const port = process.env.PORT || 80;

        app.use(express.json());
        app.post("/hierarchy", (req, res) => {

            res.json(hierarchy);
        });
        app.use(express.static(require('path').join(__dirname,
            'public')));
        app.listen(port, () => {

            console.log(`Listening on: ${port}!`);
        });
    } catch (x) {

        console.log(`?Error: ${x.message}!`);
    }
})();
