// index.js
// 导入 Deno 的标准库和内置模块
import { copy } from 'https://deno.land/std@0.224.0/io/copy.ts';
import { resolve, join } from "https://deno.land/std@0.217.0/path/mod.ts";
import * as DenoAPI from "https://deno.land/std@0.217.0/version.ts";

// 使用 Deno.env.get() 获取环境变量
const FILE_PATH = Deno.env.get("FILE_PATH") || "./temp";
const projectPageURL = Deno.env.get("URL") || '';
const intervalInseconds = Deno.env.get("TIME") || 120;
const UUID = Deno.env.get("UUID") || '89c13786-25aa-4520-b2e7-12cd60fb5202';
const NEZHA_SERVER = Deno.env.get("NEZHA_SERVER") || 'nz.abc.cn';
const NEZHA_PORT = Deno.env.get("NEZHA_PORT") || '5555';
const NEZHA_KEY = Deno.env.get("NEZHA_KEY") || '';
const ARGO_DOMAIN = Deno.env.get("ARGO_DOMAIN") || '';
const ARGO_AUTH = Deno.env.get("ARGO_AUTH") || '';
const CFIP = Deno.env.get("CFIP") || 'na.ma';
const CFPORT = Deno.env.get("CFPORT") || 443;
const NAME = Deno.env.get("NAME") || 'Vls';
const ARGO_PORT = Deno.env.get("ARGO_PORT") || 8080;
const PORT = Deno.env.get("SERVER_PORT") || Deno.env.get("PORT") || 3000;

//创建运行文件夹
try {
    await Deno.mkdir(FILE_PATH, { recursive: true });
    console.log(`${FILE_PATH} is created`);
} catch (error) {
    if (error instanceof Deno.errors.AlreadyExists) {
        console.log(`${FILE_PATH} already exists`);
    } else {
        console.error(`Error creating directory: ${error}`);
    }
}

//清理历史文件
const pathsToDelete = ['web', 'bot', 'npm', 'sub.txt', 'boot.log'];
async function cleanupOldFiles() {
    for (const file of pathsToDelete) {
        const filePath = join(FILE_PATH, file);
        try {
            await Deno.remove(filePath);
            console.log(`${filePath} deleted`);
        }
        catch (error) {
            if (error instanceof Deno.errors.NotFound) {
                console.error(`Skip Delete ${filePath}`);
            }
            else {
                console.error(`Error deleting file: ${error}`);
            }
        }
    }
}
await cleanupOldFiles();

// 生成xr-ay配置文件 (使用 Deno.writeTextFile)
const config = {
    log: { access: '/dev/null', error: '/dev/null', loglevel: 'none' },
    inbounds: [
        { port: ARGO_PORT, protocol: 'vless', settings: { clients: [{ id: UUID, flow: 'xtls-rprx-vision' }], decryption: 'none', fallbacks: [{ dest: 3001 }, { path: "/vless-argo", dest: 3002 }, { path: "/vmess-argo", dest: 3003 }, { path: "/trojan-argo", dest: 3004 }] }, streamSettings: { network: 'tcp' } },
        { port: 3001, listen: "127.0.0.1", protocol: "vless", settings: { clients: [{ id: UUID }], decryption: "none" }, streamSettings: { network: "tcp", security: "none" } },
        { port: 3002, listen: "127.0.0.1", protocol: "vless", settings: { clients: [{ id: UUID, level: 0 }], decryption: "none" }, streamSettings: { network: "ws", security: "none", wsSettings: { path: "/vless-argo" } }, sniffing: { enabled: true, destOverride: ["http", "tls", "quic"], metadataOnly: false } },
        { port: 3003, listen: "127.0.0.1", protocol: "vmess", settings: { clients: [{ id: UUID, alterId: 0 }] }, streamSettings: { network: "ws", wsSettings: { path: "/vmess-argo" } }, sniffing: { enabled: true, destOverride: ["http", "tls", "quic"], metadataOnly: false } },
        { port: 3004, listen: "127.0.0.1", protocol: "trojan", settings: { clients: [{ password: UUID }] }, streamSettings: { network: "ws", security: "none", wsSettings: { path: "/trojan-argo" } }, sniffing: { enabled: true, destOverride: ["http", "tls", "quic"], metadataOnly: false } },
    ],
    dns: { servers: ["https+local://8.8.8.8/dns-query"] },
    outbounds: [{ protocol: "freedom", tag: "direct" }, { protocol: "blackhole", tag: "block" }]
};

try {
    await Deno.writeTextFile(join(FILE_PATH, 'config.json'), JSON.stringify(config, null, 2));
}
catch (error)
{
    console.error(`Error writing config file: ${error}`);
}


// 判断系统架构
function getSystemArchitecture() {
    const arch = Deno.build.arch;
    if (arch === 'arm' || arch === 'arm64' || arch === 'aarch64') {
        return 'arm';
    } else {
        return 'amd';
    }
}

// 下载对应系统架构的依赖文件
async function downloadFile(fileName, fileUrl) {
    const filePath = join(FILE_PATH, fileName);
    try {
        const response = await fetch(fileUrl);
        if (!response.ok) {
            throw new Error(`Download ${fileName} failed: ${response.status} ${response.statusText}`);
        }
        const file = await Deno.open(filePath, { create: true, write: true });
        if(response.body) {
            await copy(response.body, file);
        }
        file.close();
        console.log(`Download ${fileName} successfully`);
        return fileName;
    }
    catch (error) {
        console.error(`Download ${fileName} failed: ${error.message}`);
        try {
            await Deno.remove(filePath);
        }
        catch(e) {
            //
        }
        throw error; // Re-throw the error to be caught by the caller
    }
}

// 下载并运行依赖文件
async function downloadFilesAndRun() {
    const architecture = getSystemArchitecture();
    const filesToDownload = getFilesForArchitecture(architecture);

    if (filesToDownload.length === 0) {
        console.log(`Can't find a file for the current architecture`);
        return;
    }

    try {
        const downloadedFiles = await Promise.all(filesToDownload.map(fileInfo => downloadFile(fileInfo.fileName, fileInfo.fileUrl)));
        // 授权
        for (const file of downloadedFiles) {
            const filePath = join(FILE_PATH, file);
            await Deno.chmod(filePath, 0o775);
            console.log(`Empowerment success for ${filePath}: 775`);
        }
    } catch (err) {
        console.error('Error downloading or processing files:', err);
        return;
    }

    //运行ne-zha
    let NEZHA_TLS = '';
    if (NEZHA_SERVER && NEZHA_PORT && NEZHA_KEY) {
        const tlsPorts = ['443', '8443', '2096', '2087', '2083', '2053'];
        if (tlsPorts.includes(NEZHA_PORT)) {
            NEZHA_TLS = '--tls';
        } else {
            NEZHA_TLS = '';
        }
        const command = new Deno.Command( join(FILE_PATH, 'npm'), {
            args: [ "-s", `${NEZHA_SERVER}:${NEZHA_PORT}`, "-p", NEZHA_KEY, NEZHA_TLS ],
            stdout: "null",
            stderr: "piped",
        });

        try {
            const child = command.spawn();
            console.log('npm is running');
            // Deno.Command 没有内置的等待启动完成的方法，你可能需要根据实际情况处理
            await new Promise((resolve) => setTimeout(resolve, 1000));
            const errorOutput = await child.stderrOutput();
            const errorText = new TextDecoder().decode(errorOutput);
            if(errorText) {
                console.error(`npm running error: ${errorText}`);
            }


        } catch (error) {
            console.error(`npm running error: ${error}`);
        }
    } else {
        console.log('NEZHA variable is empty,skip running');
    }

    //运行xr-ay
    const command1 =  new Deno.Command(join(FILE_PATH, 'web'), {
        args: ["-c", join(FILE_PATH, 'config.json')],
        stdout: "null",
        stderr: "piped",
    });
    try {

        const child = command1.spawn();
        console.log('web is running');
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const errorOutput = await child.stderrOutput();
        const errorText = new TextDecoder().decode(errorOutput);
        if(errorText) {
            console.error(`web running error: ${errorText}`);
        }
    } catch (error) {
        console.error(`web running error: ${error}`);
    }

    // 运行cloud-fared
    if (await Deno.stat(join(FILE_PATH, 'bot')).catch(() => false)) {
        let args;

        if (ARGO_AUTH.match(/^[A-Z0-9a-z=]{120,250}$/)) {
            args = `tunnel --edge-ip-version auto --no-autoupdate --protocol http2 run --token ${ARGO_AUTH}`.split(" ");
        } else if (ARGO_AUTH.match(/TunnelSecret/)) {
            args = `tunnel --edge-ip-version auto --config ${join(FILE_PATH, 'tunnel.yml')} run`.split(" ");
        } else {
            args = `tunnel --edge-ip-version auto --no-autoupdate --protocol http2 --logfile ${join(FILE_PATH, 'boot.log')} --loglevel info --url http://localhost:${ARGO_PORT}`.split(" ");
        }

        try {
            const command = new Deno.Command(join(FILE_PATH, 'bot'), {
                args: args,
                stdout: "null",
                stderr: "piped"
            });
            const child = command.spawn();
            console.log('bot is running');
            await new Promise((resolve) => setTimeout(resolve, 2000));
            const errorOutput = await child.stderrOutput();
            const errorText = new TextDecoder().decode(errorOutput);
            if(errorText) {
                console.error(`bot running error: ${errorText}`);
            }
        } catch (error) {
            console.error(`Error executing command: ${error}`);
        }
    }
    await new Promise((resolve) => setTimeout(resolve, 5000));

}
//根据系统架构返回对应的url
function getFilesForArchitecture(architecture) {
    if (architecture === 'arm') {
        return [
            { fileName: "npm", fileUrl: "https://github.com/trancedj2022/test/releases/download/arm64/swith" },
            { fileName: "web", fileUrl: "https://github.com/trancedj2022/test/releases/download/arm64/web" },
            { fileName: "bot", fileUrl: "https://github.com/trancedj2022/test/releases/download/arm64/bot" },
        ];
    } else if (architecture === 'amd') {
        return [
            { fileName: "npm", fileUrl: "https://github.com/trancedj2022/test/releases/download/amd64/swith" },
            { fileName: "web", fileUrl: "https://github.com/trancedj2022/test/releases/download/amd64/web" },
            { fileName: "bot", fileUrl: "https://github.com/trancedj2022/test/releases/download/amd64/bot" },
        ];
    }
    return [];
}

// 获取固定隧道json
async function argoType() {
    if (!ARGO_AUTH || !ARGO_DOMAIN) {
        console.log("ARGO_DOMAIN or ARGO_AUTH variable is empty, use quick tunnels");
        return;
    }

    if (ARGO_AUTH.includes('TunnelSecret')) {
        await Deno.writeTextFile(join(FILE_PATH, 'tunnel.json'), ARGO_AUTH);
        const tunnelYaml = `
tunnel: ${ARGO_AUTH.split('"')[11]}
credentials-file: ${join(FILE_PATH, 'tunnel.json')}
protocol: http2

ingress:
  - hostname: ${ARGO_DOMAIN}
    service: http://localhost:${ARGO_PORT}
    originRequest:
      noTLSVerify: true
  - service: http_status:404
`;
        await Deno.writeTextFile(join(FILE_PATH, 'tunnel.yml'), tunnelYaml);
    } else {
        console.log("ARGO_AUTH mismatch TunnelSecret,use token connect to tunnel");
    }
}
await argoType();

// 获取临时隧道domain
async function extractDomains() {
    let argoDomain;

    if (ARGO_AUTH && ARGO_DOMAIN) {
        argoDomain = ARGO_DOMAIN;
        console.log('ARGO_DOMAIN:', argoDomain);
        await generateLinks(argoDomain);
    } else {
        try {
            const fileContent = await Deno.readTextFile(join(FILE_PATH, 'boot.log'));
            const lines = fileContent.split('\n');
            const argoDomains = [];
            lines.forEach((line) => {
                const domainMatch = line.match(/https?:\/\/([^ ]*trycloudflare\.com)\/?/);
                if (domainMatch) {
                    const domain = domainMatch[1];
                    argoDomains.push(domain);
                }
            });

            if (argoDomains.length > 0) {
                argoDomain = argoDomains[0];
                console.log('ArgoDomain:', argoDomain);
                await generateLinks(argoDomain);
            } else {
                console.log('ArgoDomain not found, re-running bot to obtain ArgoDomain');
                // 删除 boot.log 文件，等待 2s 重新运行 server 以获取 ArgoDomain
                await Deno.remove(join(FILE_PATH, 'boot.log'));
                await new Promise((resolve) => setTimeout(resolve, 2000));
                const args = `tunnel --edge-ip-version auto --no-autoupdate --protocol http2 --logfile ${join(FILE_PATH, 'boot.log')} --loglevel info --url http://localhost:${ARGO_PORT}`.split(" ");
                try {
                    const command = new Deno.Command(join(FILE_PATH, 'bot'), {
                        args: args,
                        stdout: "null",
                        stderr: "piped",
                    });
                    const child = command.spawn();
                    console.log('bot is running.');
                    await new Promise((resolve) => setTimeout(resolve, 3000));
                    const errorOutput = await child.stderrOutput();
                    const errorText = new TextDecoder().decode(errorOutput);
                    if(errorText) {
                        console.error(`bot running error: ${errorText}`);
                    }
                    await extractDomains(); // 重新提取域名
                } catch (error) {
                    console.error(`Error executing command: ${error}`);
                }
            }
        } catch (error) {
            console.error('Error reading boot.log:', error);
        }
    }

    // 生成 list 和 sub 信息
    async function generateLinks(argoDomain) {

        const response = await fetch("https://speed.cloudflare.com/meta");
        const metaInfo = await response.json();
        const ISP = metaInfo?.colo ? `${metaInfo.colo}-${metaInfo.loc?.split('-')[1] || ''}` : '';


        return new Promise((resolve) => {
            setTimeout(() => {
                const VMESS = { v: '2', ps: `${NAME}-${ISP}`, add: CFIP, port: CFPORT, id: UUID, aid: '0', scy: 'none', net: 'ws', type: 'none', host: argoDomain, path: '/vmess-argo?ed=2048', tls: 'tls', sni: argoDomain, alpn: '' };
                const subTxt = `
vless://${UUID}@${CFIP}:${CFPORT}?encryption=none&security=tls&sni=${argoDomain}&type=ws&host=${argoDomain}&path=%2Fvless-argo%3Fed%3D2048#${NAME}-${ISP}

vmess://${btoa(JSON.stringify(VMESS))}

trojan://${UUID}@${CFIP}:${CFPORT}?security=tls&sni=${argoDomain}&type=ws&host=${argoDomain}&path=%2Ftrojan-argo%3Fed%3D2048#${NAME}-${ISP}
    `;
                // 打印 sub.txt 内容到控制台
                console.log(btoa(subTxt));
                const filePath = join(FILE_PATH, 'sub.txt');
                Deno.writeTextFile(filePath, btoa(subTxt)).then(()=>{
                    console.log(`${FILE_PATH}/sub.txt saved successfully`);
                }).catch(err => {
                    console.error("Failed to write sub.txt", err);
                });


                // 将内容进行 base64 编码并写入 /sub 路由 (Deno server)
                resolve(subTxt);

            }, 2000);
        });
    }
}

// 1分钟后删除list,boot,config文件
const npmPath = join(FILE_PATH, 'npm');
const webPath = join(FILE_PATH, 'web');
const botPath = join(FILE_PATH, 'bot');
const bootLogPath = join(FILE_PATH, 'boot.log');
const configPath = join(FILE_PATH, 'config.json');

async function cleanFiles() {
    await new Promise((resolve) => setTimeout(resolve, 60000)); // 60 秒

    const filesToRemove = [bootLogPath, configPath, npmPath, webPath, botPath];
    for (const file of filesToRemove) {
        try
        {
            await Deno.remove(file, { recursive: true });
        }
        catch(error)
        {
            if(!(error instanceof Deno.errors.NotFound)) {
                console.error(`Error while deleting file ${file}: ${error}`);
            }
        }
    }

    console.clear()
    console.log('App is running');
    console.log('Thank you for using this script, enjoy!');
}
cleanFiles();

// 自动访问项目URL
let hasLoggedEmptyMessage = false;
async function visitProjectPage() {
    try {
        // 如果URL和TIME变量为空时跳过访问项目URL
        if (!projectPageURL || !intervalInseconds) {
            if (!hasLoggedEmptyMessage) {
                console.log("URL or TIME variable is empty,skip visit url");
                hasLoggedEmptyMessage = true;
            }
            return;
        } else {
            hasLoggedEmptyMessage = false;
        }

        await fetch(projectPageURL);
        console.log('Page visited successfully');
        console.clear()
    } catch (error) {
        console.error('Error visiting project page:', error.message);
    }
}

// 使用 Deno 的 setInterval
if(projectPageURL && intervalInseconds) {
    setInterval(visitProjectPage, intervalInseconds * 1000);
}

// 回调运行
async function startserver() {
    await downloadFilesAndRun();
    await extractDomains();
    //  visitProjectPage(); // Initial visit.  No need, handled by interval now.
}
await startserver();
// 使用 Deno 的 HTTP server
const handler = async (request) => {
    const url = new URL(request.url);
    if(url.pathname === "/") {
        return new Response("Hello world!");
    } else if (url.pathname === "/sub") {
        const subTxt = await generateLinks(ARGO_DOMAIN || ''); // Or some cached value
        const encodedContent = btoa(subTxt);
        return new Response(encodedContent, {
            headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
    }
    return new Response("Not Found", { status: 404 });
};

Deno.serve({ port: PORT }, handler);
