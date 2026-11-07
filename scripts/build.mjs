import { readFile, writeFile, mkdir, mkdtemp, rm, readdir } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const staticryptCLI = require.resolve('staticrypt/cli/index.js');

// bundleSource 只打包明确列出的页面资源，不复制截图、备份或任意目录内容。
export async function bundleSource() {
  const [html, css, finance, app] = await Promise.all(
    ['index.html', 'style.css', 'finance.js', 'app.js'].map(name => readFile(join(root, 'src', name), 'utf8'))
  );
  if (!html.includes('<link rel="stylesheet" href="style.css">') ||
      !html.includes('<script src="finance.js"></script><script src="app.js"></script>')) {
    throw new Error('页面资源入口已改变，拒绝生成不完整的发布文件。');
  }
  return html.replace('<html lang="zh-CN">', '<html lang="zh-CN" data-protected-build="true">')
    .replace('<link rel="stylesheet" href="style.css">', () => `<style>\n${css}\n</style>`)
    .replace('<script src="finance.js"></script><script src="app.js"></script>',
      () => `<script>\n${finance}\n</script>\n<script>\n${app}\n</script>`);
}

// buildSite 密码只通过子进程环境传递；失败清除输出，禁止降级发布明文。
// outputDirectory 必须由构建调用方指定为可清理的生成目录，不能指向源代码目录。
export async function buildSite(password, outputDirectory = join(root, 'dist')) {
  const output = resolve(outputDirectory);
  if (output === root || output === join(root, 'src') || output === dirname(root)) {
    throw new Error('拒绝覆盖源代码目录。');
  }
  await rm(output, { recursive: true, force: true });
  if (typeof password !== 'string' || password.length < 16 || password.length > 256) {
    throw new Error('请设置 SITE_PASSWORD（16–256 个字符）；未生成任何可部署文件。');
  }
  await mkdir(join(root, '.build'), { recursive: true });
  const staging = await mkdtemp(join(root, '.build', 'encrypt-'));
  try {
    const source = await bundleSource();
    const input = join(staging, 'index.html');
    await writeFile(input, source, { mode: 0o600 });
    const result = spawnSync(process.execPath, [staticryptCLI, input,
      '--directory', output, '--config', 'false', '--remember', 'false',
      '--template', join(root, 'scripts', 'password-template.html')], {
      cwd: staging,
      env: { ...process.env, STATICRYPT_PASSWORD: password },
      encoding: 'utf8', timeout: 60000,
    });
    if (result.status !== 0 || result.error) {
      throw new Error('页面加密失败；已阻止发布。');
    }
    const files = await readdir(output);
    if (files.length !== 1 || files[0] !== 'index.html') {
      throw new Error('发布目录包含非预期文件；已阻止发布。');
    }
    const encrypted = await readFile(join(output, 'index.html'), 'utf8');
    if (!encrypted.includes('staticryptEncryptedMsgUniqueVariableName') ||
        encrypted.includes(password) || encrypted.includes('id="app"') ||
        encrypted.includes('function renderOverview') || encrypted.includes('liubai-design-v1')) {
      throw new Error('加密产物检查失败；已阻止发布。');
    }
    await writeFile(join(output, '.nojekyll'), '');
    return encrypted;
  } catch (error) {
    await rm(output, { recursive: true, force: true });
    throw error;
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  require('dotenv').config({ path: join(root, '.env') });
  try {
    await buildSite(process.env.SITE_PASSWORD);
    console.log('已生成 dist/index.html：仅含密码入口和加密页面。');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
