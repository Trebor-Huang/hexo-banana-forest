import { rawWork, globalContext } from 'btex';
import { JSDOM } from 'jsdom';
import Hexo from 'hexo';
import path from 'path';
import * as fs from 'fs';

type Tree = {
    content : string,
    title ?: string
}

const promises : Record<string, {path : string, tree : Promise<Tree>}> = {};

// The preamble
const preamble = fs.readFileSync(path.join(__dirname, 'preamble.btx'))
    .toString('utf8');
// TODO user config preamble

const title_case = hexo.extend.helper.get("titlecase") ?? (n => n);

let tree : Hexo.View | undefined;
function initializeTreeView() {
    if (tree !== undefined) {
        return;
    }
    tree = hexo.theme.getView('partials/tree')
        ?? hexo.theme.getView('index');
    if (tree === undefined) {
        throw new Error("Banana: No good layout found.");
}
}

function getArgs(fun : Element) {
    let args : Record<string, string> = {};
    for (const arg of fun.children) {
        if (arg.tagName != "BTEX-ARG") continue;
        const [ix, val] = arg.textContent?.split("=") ?? ["", ""];
        args[ix] = val;
    }
    return args;
}

async function _renderBtx(hexo: Hexo, data: Hexo.extend.RendererData) : Promise<Tree> {
    const data_path = data.path ?? "";
    // Render btex
    const {html, errors, warnings, data: raw_metadata} = await rawWork({
        code: data.text,
        preamble,
        globalContext
    });  // todo proper errors and warnings
    for (const error of errors) {
        console.error("[Banana Forest]", error);
    }
    for (const warning of warnings) {
        console.warn("[Banana Forest]", warning);
    }

    const metadata = JSON.parse(raw_metadata);
    const { window } = new JSDOM(html);
    // Setup links and transclusions
    const grafts = window.document.getElementsByTagName("btex-fun");
    for (const graft of [...grafts]) {
        // todo: {{image| ... }} are images
        const graft_name = graft.getAttribute("data-name");
        if (graft_name === null) {
            continue;  // todo
        }
        const graft_args = getArgs(graft);
        if (graft_name == "image") {
            // todo
            continue;
        }
        if (! (graft_name in promises)) {
            // The graft does not exist
            graft.outerHTML = `<u class="graft missing">${graft_name}</u>`;
        } else {
            const result = await promises[graft_name].tree;
            const spliced = graft_args.spliced === "true"; // Defaults to false
            const expanded = graft_args.expanded !== "false"; // Defaults to true
            graft.outerHTML = await tree?.render({
                spliced,
                expanded,
                content: result.content,
                title: result.title ?? title_case(graft_name)
            }) ?? "[unreachable]";
        }
    }

    const links = window.document.getElementsByTagName("btex-link");
    for (const link of [...links]) {
        const ref = link.getAttribute("data-page") ?? "";
        if (ref in promises) {
            const real_link = document.createElement('a');
            let href = path.relative(data_path, promises[ref].path);
            if (href.endsWith(".btx")) {
                href = href.slice(0, -4);
            }
            real_link.href = href;
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
    initializeTreeView();
    const promise = _renderBtx(this, data);
    if (data.path) {
        promises[path.basename(data.path, ".btx")] =
            { path : data.path , tree : promise };
    }
    const result = await promise;
    return await tree?.render({
        spliced: false,
        expanded: true,
        content: result.content,
        title: result.title ?? "No title"
    }) ?? "[unreachable]"
}
renderBtx.disableNunjucks = true;

hexo.extend.renderer.register('btx', 'html', renderBtx);
