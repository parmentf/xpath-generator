'use strict';
const Promise = require('bluebird'),
      cheerio = Promise.promisifyAll(require('cheerio')),
      path = require('path'),
      kuler = require('kuler'),
      fs = Promise.promisifyAll(require('fs'));

class FromXml {
  constructor(output='console',type='xpaths'){
    this._output = output;
    this._type = type;
    this._cheerio_opts = {
      normalizeWhitespace: true,
      xmlMode: true
    };
    if(this._output === 'console'){
      this.action = (this._type === 'tree') ? this.showTree : this.showXpaths;
    }
    else{
      switch (this._type){
        case 'both':
          this.action = this.writeAll;
          this._xpaths = fs.createWriteStream(path.resolve(output,'output-xpaths.xml'));
          this._tree = fs.createWriteStream(path.resolve(output,'output-tree.xml'));
          break;
        case 'tree':
          this.action = this.writeTree;
          this._tree = fs.createWriteStream(path.resolve(output,'output-tree.xml'));
          break;
        case 'xpaths':
          this.action = this.writeXpaths;
          this._xpaths = fs.createWriteStream(path.resolve(output,'output-xpaths.xml'));
          break;
        default:
          this.action = this.writeAll;
          this._xpaths = fs.createWriteStream(path.resolve(output,'output-xpaths.xml'));
          this._tree = fs.createWriteStream(path.resolve(output,'output-tree.xml'));
          break;
      }
    }
  }

  loadFile(xmlPath = 'samples/small/nature-file-test.xml'){
    return fs.readFileAsync(xmlPath, 'utf-8')
    .catch(err => {
      console.error(`Error: ${err} cannot open file`);
    })
  }

  parse(element, level = 0, parents = ''){

    /*parents = `${parents}/${element[0].name}`;
     this.action(element,parents,level);
     if(element.children().length){
     element.children().each((i,elem) => {
     this.parse(this._$(elem), level+1, parents);
     });
     }*/
    var self = this;

    function parsePromise(element, level = 0, parents = '') {
      parents = `${parents}/${element[0].name}`;
      self.action(element,parents,level);
      if(element.children().length){
        element.children().each((i,elem) => {
          parsePromise(self._$(elem), level+1, parents);
        });
      }
    }
    parsePromise(element, level = 0, parents = '');
    console.log('test')
  }

  showTree(element,parents,level){
    console.log(`${'│  '.repeat(level)}├── ${element[0].name}`);
  }
  showXpaths(element,parents){
    console.log(`${parents}`);
  }
  writeTree(element,parents,level){
    this._tree.write(`${'│  '.repeat(level)}├── ${element[0].name}\n`);
  }
  writeXpaths(element,parents){
    this._xpaths.write(`${parents}\n`)
  }
  writeAll(element,parents,level){
    this.writeXpaths(element,parents,level);
    this.writeTree(element,parents,level);
  }
  // This method load file, parse & write result
  generate(){
    this.loadFile().then(data=>{
      return cheerio.load(data,this._cheerio_opts);
    })
    .then($=>{
      this._$ = $;
      return this.parse($.root().children());
    })
    .then(()=>{
      if(this._output === 'console'){
        console.log(kuler('traitement terminé','green'));
      }
    })
  }
}

module.exports = FromXml;