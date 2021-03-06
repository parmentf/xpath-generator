#!/usr/bin/env node

const program = require('commander'),
  version = require('./package.json').version,
  FromXml = require('./lib/FromXml'),
  fs = require('fs'),
  path = require('path'),
  FromFolder = require('./lib/FromFolder');

// Cli config
program
  .version(version)
  .usage('[options] <file ...>')
  .option('-a, --attributes', 'Will return all attributes & uniques values for all paths')
  .option('-i, --input <path>', 'An xml input file')
  .option('-f, --folder <path>', 'A folder containing xml files')
  .option('-e, --extension <ext1 ext2 ext3 ...>', 'A list of entensions for folder files to be read, .xml is default')
  .option('-o, --output <path>', 'Generate files to specific path, default is console', 'console')
  .option('-t, --type <tree/xpaths/both>', 'Type of format output, can be tree/xpaths or both for outputdir, tree/xpaths for console')
  .parse(process.argv);

// No option provided , show help
if (!process.argv.slice(2).length) {
  program.outputHelp();
}

//Make results available globally
var results;

// Start Cli on File
if (program.input) {
  let xml = new FromXml().generate(program.input).then(result=> {
    results = result;
    var action = actionsToDo();
    for (var key in result) {
      action(key);
    }
  }).catch(err=>{
    console.error('An error came : ', err);
  })
}
// Start Cli on Folder
if (program.folder) {
  let xmls = new FromFolder().generateAll(program.folder,program.extension).then(result=> {
    results = result;
    var action = actionsToDo();
    for (var key in result) {
      action(key);
    }
  });
}

function actionsToDo() {

  if (!program.output || program.output === 'console') {
    if (program.type === 'xpaths') {
      return function (path) {
        let nbOfAttr = program.attributes ? Object.keys(results[path].attributes).length : 0;
        console.log(`${path} ${results[path].count} ${nbOfAttr ? JSON.stringify(results[path].attributes) : ''}`)
      };
    }
    //tree
    return function (path) {
      let elements = path.split('/'),
          elementName = elements[elements.length-1];
      let nbOfAttr = program.attributes ? Object.keys(results[path].attributes).length : 0;
      console.log(`${'│  '.repeat(results[path].level)}├── ${elementName} ${results[path].count} ${nbOfAttr ? JSON.stringify(results[path].attributes) : ''}`)
    };
  }
  // Write file, no output
  else {
    var xpathsFile, treeFile;
    if (!program.output) {
      console.error('error no output specified');
      process.exit(0);
    }
    if (program.type === 'xpaths') {
      xpathsFile = writeStream('xpaths', program.output, 'csv');
      return function (path) {
        let nbOfAttr = program.attributes ? Object.keys(results[path].attributes).length : 0;
        xpathsFile.write(`${path} ${results[path].count} ${nbOfAttr ? JSON.stringify(results[path].attributes) : ''}\n`)
      }
    }
    if (program.type === 'tree') {
      treeFile = writeStream('tree', program.output,'txt');
      return function (path) {
        let nbOfAttr = program.attributes ? Object.keys(results[path].attributes).length : 0;
        treeFile.write(`${'│  '.repeat(results[path].level)}├── ${path} ${results[path].count} ${nbOfAttr ? JSON.stringify(results[path].attributes) : ''}\n`);
      }
    }
    //both
    xpathsFile = writeStream('xpaths', program.output,'csv');
    treeFile = writeStream('tree', program.output,'txt');
    return function (path) {
      let nbOfAttr = program.attributes ? Object.keys(results[path].attributes).length : 0;
      xpathsFile.write(`${path} ${results[path].count} ${nbOfAttr ? JSON.stringify(results[path].attributes) : ''}\n`)
      treeFile.write(`${'│  '.repeat(results[path].level)}├── ${path} ${results[path].count} ${nbOfAttr ? JSON.stringify(results[path].attributes) : ''}\n`);
    }
  }

}

function writeStream(type, output, extension) {
  let stream = fs.createWriteStream(path.resolve(output, `output-${type}.${extension}`), {'flags': 'w'});
  stream.on('error', (err)=> {
    throw new Error(err);
  });
  return stream;
}
