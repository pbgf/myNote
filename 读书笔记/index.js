let fs = require('fs')
let path = require('path')
let { Sitdown } = require('sitdown')
let sitdown = new Sitdown()
const last = function(arr){
    return arr[arr.length-1]
}
process.argv.forEach((val, index) => {
    console.log(`${index}: ${val}`);
});
let input_path = process.argv[2]
let file = last(input_path.split('/'))
let out_path = path.join(__dirname, './md', file+'.md')
let html = fs.readFileSync(input_path, 'utf8')

let markdown = sitdown.HTMLToMD(html)
//console.log(markdown)
fs.writeFile(out_path, markdown, (err) => {
    if (err) throw err;
    console.log('文件已被保存');
})