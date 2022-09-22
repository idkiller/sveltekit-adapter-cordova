import StaticAdapter from '@sveltejs/adapter-static';
import path from 'path';
import fs from 'fs-extra';

import { create } from 'xmlbuilder2';
import { execa } from 'execa';

const nsWidgets = 'http://www.w3.org/ns/widgets';
const nsCordova = 'http://cordova.apache.org/ns/1.0';

async function createSettings(buildPath) {
    const pjson = await fs.readJSON('./package.json');
    const id = `app.hybrid.${pjson.name}`;
    const doc = create({defaultNamespace: {ele: nsWidgets, att: null}, version: '1.0', encoding: 'utf-8'});
    const widget = doc.ele('widget', {id, version: pjson.version})
                    .att('http://www.w3.org/2000/xmlns', 'xmlns:cdv', nsCordova)
                    .ele('name').txt(pjson.name).up();
    if (pjson.description) {
        widget.ele('description').txt(pjson.description);
    }
    if (pjson.author || pjson.email || pjson.homepage) {
        widget.ele('author', {email: pjson.email, href: pjson.homepage})
            .txt(typeof pjson.author === 'object' ? pjson.author.name : pjson.author);
    }
    widget.ele('content', {src: 'index.html'}).up()
        .ele('allow-intent', {href: 'http://*/*'}).up()
        .ele('allow-intent', {href: 'https://*/*'}).doc();
    const xmlstring = doc.end({prettyPrint: true});
    await fs.outputFile(path.join(buildPath, 'config.xml'), xmlstring);

    const json = {
        name: id,
        displayName: pjson.name,
        version: pjson.version,
        description: pjson.description,
        main: 'index.js',
        author: typeof pjson.author === 'object' ? pjson.author.name : pjson.author,
        license: pjson.license
    };
    await fs.outputFile(path.join(buildPath, 'package.json'), JSON.stringify(json, null, 2));
}

/** @param {import('./index').AdapterOptions} */
export default function (options) {
    /** @type {import('@sveltejs/kit').Adapter} */
    const adapter = {
        name: '@piuslee/sveltekit-adapter-cordova',
        async adapt(builder) {
            const tmp_dir = path.join('.svelte-kit', '@piuslee', 'sveltekit-adapter-cordova');
            await fs.ensureDir(tmp_dir);
            const static_temp_dir = path.join(tmp_dir, 'build');
            var staticAdapter = StaticAdapter({
                pages: static_temp_dir,
                assets: static_temp_dir,
                fallback: null,
                precompress: false
            });
            await staticAdapter.adapt(builder);
            console.log(' - static build finished');
            await createSettings('build');
            const www = path.join('build', 'www');
            await fs.emptyDir(www);
            await fs.copy(static_temp_dir, www);
            console.log(' - cordova directory created: ./build');
            const platforms = options.platform ?? [];
            for (const p of platforms) {
                await execa('cordova', ['platform', 'add', p, '--verbose'], {cwd: 'build'});
            }
        }
    };

    return adapter;
}