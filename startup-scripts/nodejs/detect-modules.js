// the palcode/node Docker image pre-installs these modules to reduce runtime volume-mounting load
// https://github.com/palkerecsenyi/palcode-images/blob/main/node/Dockerfile
const detective = require('/opt/runner-modules/node_modules/detective');
const isBuiltinModule = require('/opt/runner-modules/node_modules/is-builtin-module');

const fs = require("fs");
const path = require("path");

const files = fs.readdirSync('/usr/src/app')
    .filter(file => {
        try {
            return !fs.statSync(`/usr/src/app/${file}`).isDirectory();
        } catch (e) {
            return false;
        }
    })
    .filter(file => file.endsWith('.js'));

const modules = [];
let deleteModules = true;

for (const file of files) {
    const contents = fs.readFileSync(`/usr/src/app/${file}`, 'utf8');
    const requires = detective(contents);

    for (const moduleName of requires) {
        const pathToFile = path.resolve('/usr/src/app/', moduleName);

        if (!fs.existsSync(pathToFile) && !isBuiltinModule(moduleName)) {
            if (!fs.existsSync(path.resolve('/usr/src/app/node_modules/', moduleName))) {
                modules.push(moduleName);
            } else {
                deleteModules = false;
            }
        }
    }
}

if (modules.length !== 0) {
    console.log(
        'yarn add ' +
        modules.join(' ')
    );
} else if (deleteModules) {
    console.log('');
} else {
    console.log('NO');
}
