"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const btex_1 = require("btex");
const jsdom_1 = require("jsdom");
const path_1 = __importDefault(require("path"));
const fs = __importStar(require("fs"));
const promises = {};
// The preamble
const preamble = fs.readFileSync(path_1.default.join(__dirname, 'preamble.btx'))
    .toString('utf8');
function _renderBtx(hexo, data) {
    var _a, _b, _c, _d;
    return __awaiter(this, void 0, void 0, function* () {
        const data_path = (_a = data.path) !== null && _a !== void 0 ? _a : "";
        // Render btex
        // todo: prepare my own preamble
        const { html, errors, warnings, data: raw_metadata } = yield (0, btex_1.rawWork)({
            code: data.text,
            preamble,
            globalContext: btex_1.globalContext
        });
        const metadata = JSON.parse(raw_metadata);
        const tree = (_b = hexo.theme.getView('partials/tree')) !== null && _b !== void 0 ? _b : hexo.theme.getView('index');
        if (tree === undefined) {
            throw new Error("Banana: No good layout found.");
        }
        const { window } = new jsdom_1.JSDOM(html);
        // Setup links and transclusions
        const grafts = window.document.getElementsByTagName("btex-fun");
        for (const graft of [...grafts]) {
            // todo: {{image| ... }} are images
            const graft_name = graft.getAttribute("data-name");
            if (graft_name === null) {
                continue; // todo
            }
            const graft_path = path_1.default.join(data_path, "..", graft_name + ".btx");
            if (!(graft_path in promises)) {
                // The graft does not exist
                graft.outerHTML = `<u class="graft missing">${graft_name}</u>`;
            }
            else {
                const result = yield promises[graft_path];
                graft.outerHTML = yield tree.render({
                    spliced: false,
                    expanded: true,
                    content: result.content,
                    title: (_c = result.title) !== null && _c !== void 0 ? _c : graft_name
                    // TODO the name should be set in btex using yaml syntax
                });
            }
        }
        const links = window.document.getElementsByTagName("btex-link");
        for (const link of [...links]) {
            const ref = (_d = link.getAttribute("data-page")) !== null && _d !== void 0 ? _d : "";
            const ref_path = path_1.default.join(data_path, "..", ref + ".btx");
            if (ref_path in promises) {
                const real_link = document.createElement('a');
                real_link.href = "../" + ref;
                real_link.innerHTML = link.innerHTML;
                link.outerHTML = real_link.outerHTML;
            }
            else {
                link.outerHTML = `<u class="link missing">${ref}</u>`;
            }
        }
        // Output
        return {
            content: window.document.documentElement.outerHTML,
            title: metadata.displayTitle
        };
    });
}
function renderBtx(data) {
    return __awaiter(this, void 0, void 0, function* () {
        const promise = _renderBtx(this, data);
        if (data.path) {
            promises[data.path] = promise;
            // console.log("Banana has: ", data.path);
        }
        return (yield promise).content;
    });
}
renderBtx.disableNunjucks = true;
hexo.extend.renderer.register('btx', 'html', renderBtx);
//# sourceMappingURL=index.js.map