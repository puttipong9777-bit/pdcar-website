import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { test } from 'node:test';
import sharp from 'sharp';
import { loadTs } from './helpers/load-ts.mjs';

const route = (bucket) => loadTs('app/media/site/[slot]/route.ts', {
  '@/lib/cloudflare-media': {
    vehicleImagesBucket: async () => bucket,
    imageResponse: object => new Response(object.body, {headers:{'Content-Type':'image/webp'}})
  }
});
test('site image fallbacks use smaller decodable derivatives and keep originals', async () => {
  for (const [slot, name, width] of [['logo','pd-logo',320],['storefront','storefront',1280]]) {
    const response = await route(null).GET(new Request(`https://www.pdcarcenter.com/media/site/${slot}`), {params:Promise.resolve({slot})});
    assert.equal(response.status,307);
    assert.equal(response.headers.get('location'),`https://www.pdcarcenter.com/images/${name}.webp`);
    const image = await sharp(`public/images/${name}.webp`).metadata();
    assert.equal(image.width,width); assert.equal(image.format,'webp');
    assert.ok(statSync(`public/images/${name}.webp`).size < statSync(`public/images/${name}.jpg`).size * .5);
  }
});
test('site images retain administrator R2 overrides and unknown-slot rejection', async () => {
  let requested;
  const handler=route({get:async key => {requested=key; return {body:'override'};}});
  const response=await handler.GET(new Request('https://www.pdcarcenter.com/media/site/logo'),{params:Promise.resolve({slot:'logo'})});
  assert.equal(requested,'site/logo.webp'); assert.equal(await response.text(),'override');
  assert.equal((await handler.GET(new Request('https://www.pdcarcenter.com/media/site/unknown'),{params:Promise.resolve({slot:'unknown'})})).status,404);
});
test('hero is eager high priority and touch devices have no spotlight background request', () => {
  const hero=readFileSync('components/showroom-hero.tsx','utf8');
  assert.match(hero,/loading="eager" fetchPriority="high"/);
  const css=readFileSync('app/showroom.css','utf8');
  const base=css.match(/\.discovery-spotlight \{([^}]+)\}/)[1];
  assert.doesNotMatch(base,/url\(/);
  assert.match(css,/@media \(hover: hover\) and \(pointer: fine\) \{ \.discovery-spotlight \{ background: url\('\/media\/site\/storefront'\)/);
  assert.doesNotMatch(css,/storefront\.jpg/);
});

test('catalog requests only the visible photo until a user changes the gallery', () => {
  const catalog=readFileSync('components/catalog-browser.tsx','utf8');
  assert.doesNotMatch(catalog,/IntersectionObserver|new window\.Image|shouldPreloadNeighbors|preload\.src/);
  assert.match(catalog,/const changePhoto = \(direction: number\) =>/);
  assert.match(catalog,/onPointerUp=\{handlePointerUp\}/);
  assert.match(catalog,/onClick=\{\(\) => changePhoto\(1\)\}/);
});
