var  jsonfile = require('jsonfile')
var file = '/turtle.json'
var obj = {turtle:'flat'}

jsonfile.writeFile(file,obj,function(err){console.error(err)})
