import sass, { Options } from 'node-sass'
import path from 'path';
import fs from 'fs';
import packageJson from '../package.json'

const scss_filename = path.join(__dirname, '..', 'src', 'style.scss');

const css_output = path.join(__dirname, '..', 'build', 'style.css');

const options: Options = {
    file: scss_filename,
    outFile: css_output,
    outputStyle: 'expanded',
    indentType: 'space',
    indentWidth: 2
    // sourceComments: true
}


//check if css_output folder exist
fs.mkdirSync(path.dirname(css_output), { recursive: true });

sass.render(options, (err, result) => { 
    if(err) {
        throw err;
    }

    if(result.css){
        const css_content = 
`/************
 file generated for and by project ${packageJson.repository?.url}
************/
${result.css}`

        fs.writeFileSync(css_output, css_content);
    } else {
        throw new Error('no css generated');
    }
 });