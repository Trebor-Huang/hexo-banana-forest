import { rawWork, globalContext } from 'btex';
import { JSDOM } from 'jsdom';
import Hexo from 'hexo';
import path from 'path';

const promises : Record<string, Promise<string>> = {};

async function _renderBtx(hexo: Hexo, data: Hexo.extend.RendererData){
    const data_path = data.path ?? "";
    // Render btex
    // todo: prepare my own prelude
    const {html, errors, warnings} = await rawWork({
        code: data.text,
        globalContext
    });
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
        // console.log("Banana wants: ", graft_path);
        if (! (graft_path in promises)) {
            // The graft does not exist
            graft.outerHTML = `<u>${graft_name}</u>`;
        } else {
            const tree = hexo.theme.getView('partials/tree')
                ?? hexo.theme.getView('index');  // TODO outside this?
            if (tree === undefined) {
                throw new Error("Banana: No good layout found.");
            }
            graft.outerHTML = await tree.render({
                spliced: false,
                expanded: true,  // TODO these should be configurable
                content: await promises[graft_path],
                title: graft_name
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
            real_link.href = ref;  // TODO correct linking
            real_link.innerHTML = link.innerHTML;
            link.outerHTML = real_link.outerHTML;
        } else {
            link.outerHTML = `<u>${ref}</u>`;
        }
    }
    // Output
    return window.document.documentElement.outerHTML;
}

function renderBtx(this: Hexo, data: Hexo.extend.RendererData){
    const promise = _renderBtx(this, data);
    if (data.path) {
        promises[data.path] = promise;
        // console.log("Banana has: ", data.path);
    }
    return promise;
}
renderBtx.disableNunjucks = true;

hexo.extend.renderer.register('btx', 'html', renderBtx);
