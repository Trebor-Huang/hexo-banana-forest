import { rawWork, globalContext } from 'btex';
import { JSDOM } from 'jsdom';
import Hexo from 'hexo';
import path from 'path';
import * as fs from 'fs';

type Tree = {
    content : string,
    title ?: string
}

const promises : Record<string, Promise<Tree>> = {};

// The preamble
const preamble = fs.readFileSync(path.join(__dirname, 'preamble.btx'))
    .toString('utf8');

async function _renderBtx(hexo: Hexo, data: Hexo.extend.RendererData) : Promise<Tree> {
    const data_path = data.path ?? "";
    // Render btex
    // todo: prepare my own preamble
    const {html, errors, warnings, data: raw_metadata} = await rawWork({
        code: data.text,
        preamble,
        globalContext
    });
    const metadata = JSON.parse(raw_metadata);
    const tree = hexo.theme.getView('partials/tree')
        ?? hexo.theme.getView('index');
    if (tree === undefined) {
        throw new Error("Banana: No good layout found.");
    }
    const { window } = new JSDOM(html);
    // Setup links and transclusions
    const grafts = window.document.getElementsByTagName("btex-fun");
    for (const graft of [...grafts]) {
        // todo: {{image| ... }} are images
        const graft_name = graft.getAttribute("data-name");
        if (graft_name === null) {
            continue;  // todo
        }
        const graft_path = path.join(data_path, "..", graft_name + ".btx");
        if (! (graft_path in promises)) {
            // The graft does not exist
            graft.outerHTML = `<u class="graft missing">${graft_name}</u>`;
        } else {
            const result = await promises[graft_path];
            graft.outerHTML = await tree.render({
                spliced: false,
                expanded: true,  // TODO these should be configurable
                content: result.content,
                title: result.title ?? graft_name
                    // TODO the name should be set in btex using yaml syntax
            });
        }
    }

    const links = window.document.getElementsByTagName("btex-link");
    for (const link of [...links]) {
        const ref = link.getAttribute("data-page") ?? "";
        const ref_path = path.join(data_path, "..", ref + ".btx");
        if (ref_path in promises) {
            const real_link = document.createElement('a');
            real_link.href = "../" + ref;
            real_link.innerHTML = link.innerHTML;
            link.outerHTML = real_link.outerHTML;
        } else {
            link.outerHTML = `<u class="link missing">${ref}</u>`;
        }
    }
    // Output
    return {
        content: window.document.documentElement.outerHTML,
        title: metadata.displayTitle
    };
}

async function renderBtx(this: Hexo, data: Hexo.extend.RendererData){
    const promise = _renderBtx(this, data);
    if (data.path) {
        promises[data.path] = promise;
        // console.log("Banana has: ", data.path);
    }
    return (await promise).content;
}
renderBtx.disableNunjucks = true;

hexo.extend.renderer.register('btx', 'html', renderBtx);
