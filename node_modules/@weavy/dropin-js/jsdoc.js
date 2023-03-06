/* eslint-env node */

const jsdoc2md = require('jsdoc-to-markdown')
const fs = require('fs')
const path = require('path')
const filesExist = require('files-exist');
const dmd = require('dmd');

const basePath = "src/";

/* input and output paths */
const inputFiles = filesExist([
    //"package.json",
    basePath + "**/*.js"
]);

console.log("inputFiles", inputFiles);

const outputDir = path.resolve(__dirname) + '/dist/docs/';

console.log("outputDir", outputDir)

/* get template data */
const templateData = jsdoc2md.getTemplateDataSync({ files: inputFiles })

/* reduce templateData to an array of global nodes */
const topIdentifiers = [];
const topNodes = templateData.reduce((topNodes, identifier) => {
    if (identifier.scope === "global" && identifier.kind !== "external") {
        var relPath = path.relative(basePath, identifier.meta.path);
        var node = { id: identifier.id, name: identifier.name, kind: identifier.kind, filename: identifier.meta.filename, path: relPath ? relPath + "/" : "" }

        if (identifier.meta.filename === "weavy.js") {
            topIdentifiers.unshift(identifier);
        } else {
            topIdentifiers.push(identifier);
        }
        topNodes.push(node);
    }
    return topNodes
}, []);

var fileData = [];

console.info("Gathered files", topNodes.length)

{
    /* create a documentation index page */
    console.info("Rendering index");

    let output = "";
    let groupData = topIdentifiers;

    output += dmd(groupData, { 
        template: '{{>module-index~}}{{>global-index~}}',
        separators: true,
        noCache: true,
        fileLinkPrefix: true,
        fileLinkBasePath: basePath,
        "heading-depth": 1,
        "global-index-type": "table"
    })

    fileData.push({
        name: "index.md",
        data: output
    });
}

/* create a documentation file for each class */
for (const topNode of topNodes) {
    console.info("Rendering " + topNode.kind, topNode.name)
    let output;

    output = dmd(templateData, {
        template: `{{#identifier id="${topNode.id}"}}{{>docs}}{{/identifier}}`,
        "member-index-format": "nav-grouped",
        "member-index-details": false,
        separators: true,
        noCache: true,
        fileLinkPrefix: true,
        fileLinkBasePath: basePath,
        "heading-depth": 1
    })

    fileData.push({
        path: topNode.path && outputDir + topNode.path,
        name: topNode.path + topNode.name + ".md",
        data: output
    })

}

// Create dir
try {
    fileData.forEach(file => {
        if (!fs.existsSync(file.path || outputDir)) {
            console.info("Creating dir", file.path || outputDir);
            fs.mkdirSync(file.path || outputDir, { recursive: true });
        }
    });
} catch (e) { /* Dir not created, no worries. */ }


// Write files
fileData.forEach(file => {
    if (file.data) {
        console.info("Writing", file.name);
        fs.writeFileSync(path.resolve(outputDir + file.name), file.data);
    }
});
