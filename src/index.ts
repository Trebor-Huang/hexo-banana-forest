import { rawWork, globalContext } from 'btex';
import Hexo from 'hexo';

async function renderBtx(this: Hexo, data: Hexo.extend.RendererData){
    const result = await rawWork({
        code: data.text,
        globalContext
    });
    return result.html;
}
renderBtx.disableNunjucks = true

hexo.extend.renderer.register('btx', 'html', renderBtx);
