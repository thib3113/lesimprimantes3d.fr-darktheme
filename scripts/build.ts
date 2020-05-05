import sass, { Options } from 'node-sass'
import path from 'path';
import fs from 'fs';
import packageJson from '../package.json'

const scssFilename = path.join(__dirname, '..', 'src', 'style.scss');

const cssOutputFolder = path.join(__dirname, '..', 'build');

const indentWidth = 2;

const options: Options = {
    file: scssFilename,
    outFile: path.join(cssOutputFolder, 'style.css'),
    outputStyle: 'expanded',
    indentType: 'space',
    indentWidth
    // sourceComments: true
}

const CSSHeader = 
`/************
 file generated for and by project ${packageJson.repository?.url}
************/`

const urlForum = "https://www.lesimprimantes3d.fr/forum";


//check if css_output folder exist
fs.mkdirSync(cssOutputFolder, { recursive: true });

sass.render(options, (err, result) => { 
    if(err) {
        throw err;
    }

    if(result.css){
        const CSSUsertyle = 
`${CSSHeader}
@-moz-document url-prefix("${urlForum}") {
${result.css.toString().split('\n').join(`\n${''.padStart(indentWidth)}`)}
}
`
        const CSSChrome = 
`${CSSHeader}
${result.css.toString()}
`

        //generate chrome, firefox and usertyle.css
        fs.writeFileSync(path.join(cssOutputFolder, 'chrome.css'), CSSChrome);
        fs.writeFileSync(path.join(cssOutputFolder, 'firefox.css'), CSSUsertyle);
        fs.writeFileSync(path.join(cssOutputFolder, 'userstyle.css'), CSSUsertyle);

        console.log(`css builded in folder ${cssOutputFolder}`);

    } else {
        throw new Error('no css generated');
    }
 });