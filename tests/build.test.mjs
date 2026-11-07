import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readdir, access, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';
import { buildSite, bundleSource } from '../scripts/build.mjs';
const require = createRequire(import.meta.url);
const engine = require('staticrypt/lib/cryptoEngine.js');
const codec = require('staticrypt/lib/codec.js').init(engine);

test('发布仅包含密文；正确密码还原，错误密码及篡改不能解锁', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'rich-assets-test-'));
  const output = join(temp, 'dist');
  const password = randomBytes(24).toString('base64url');
  try {
    const html = await buildSite(password, output);
    assert.deepEqual((await readdir(output)).sort(), ['.nojekyll', 'index.html']);
    assert.ok(!html.includes(password));
    assert.ok(!html.includes('id="app"'));
    assert.ok(!html.includes('function renderOverview'));
    assert.ok(!html.includes('src="app.js"'));
    const cipher = html.match(/"staticryptEncryptedMsgUniqueVariableName":\s*"([^"]+)"/)[1];
    const salt = html.match(/"staticryptSaltUniqueVariableName":\s*"([^"]+)"/)[1];
    const key = await engine.hashPassword(password, salt);
    const decrypted = await codec.decode(cipher, key, salt);
    assert.equal(decrypted.success, true);
    assert.equal(decrypted.decoded, await bundleSource());
    assert.ok(decrypted.decoded.includes('Rich Assets Book'));
    assert.ok(decrypted.decoded.includes('data-protected-build="true"'));
    assert.ok(!decrypted.decoded.includes('src="finance.js"'));
    const wrongKey = await engine.hashPassword(randomBytes(24).toString('hex'), salt);
    assert.equal((await codec.decode(cipher, wrongKey, salt)).success, false);
    const tampered = (cipher[0] === '0' ? '1' : '0') + cipher.slice(1);
    assert.equal((await codec.decode(tampered, key, salt)).success, false);
    assert.ok(html.includes('"isRememberEnabled":false'));
    assert.ok(!html.includes('await staticrypt.handleDecryptOnLoad()'));
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});

test('密码未设置或过短时失败关闭，并清除上次构建结果', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'rich-assets-fail-'));
  try {
    for (const password of [undefined, '', 'short-password']) {
      const output = join(temp, 'dist');
      await mkdir(output, { recursive: true });
      await writeFile(join(output, 'index.html'), 'stale build');
      await assert.rejects(buildSite(password, output), /SITE_PASSWORD/);
      await assert.rejects(access(output));
    }
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});
